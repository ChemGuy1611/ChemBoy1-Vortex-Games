'use strict';

// Shared GitHub/Nexus requirements auto-downloader for Vortex game extensions.
//
// Hand-authored CommonJS module (formerly a webpack bundle). All HTTP goes through
// the native fetch global (Vortex 2 runs extensions in the Electron renderer, so
// requests use the same Chromium network stack the old vendored axios browser build
// did). Externals are vortex-api and node's path/fs/stream, plus semver.
//
// Public API: download, getLatestGithubReleaseAsset, doDownload,
// findModByFile, findDownloadIdByFile, walkPath, resolveVersionByPattern,
// resolveVersionByAssetDate, resolveVersionByModVersion, getMods,
// testRequirementVersion, default(init).

const path = require('path');
const semver = require('semver');
const { createWriteStream } = require('fs'); //node's fs directly - vortex-api's createWriteStream re-export is deprecated
const { finished } = require('stream/promises');
const { actions, fs, log, selectors, util } = require('vortex-api');

// --- common ---------------------------------------------------------------
const NOTIF_ID_REQUIREMENTS = 'vortex-downloader-requirements-download-notification';

// Dragon Age: The Veilguard (Frosty/DAV) mods tag releases as dates
// (YYYY.MM.DD.build), not semver. Convert e.g. '2026.02.01.0' -> '26.2.1' so
// semver can parse/compare them.
function normalizeFrostyVersion(version) {
  if (version === null || version === undefined) {
    return version;
  }
  const versionSplit = version.split('.'); // ['2026','02','01','0']
  versionSplit[0] = versionSplit[0].replace('20', ''); // ['26','02','01','0']
  if (versionSplit[1].startsWith('0')) {
    versionSplit[1] = versionSplit[1].replace('0', ''); // ['26','2','01','0']
  }
  if (versionSplit[2].startsWith('0')) {
    versionSplit[2] = versionSplit[2].replace('0', ''); // ['26','2','1','0']
  }
  versionSplit.pop(); // drop build -> ['26','2','1']
  return versionSplit.join('.'); // '26.2.1'
}

// Comparable/display version for a fetched release asset. For trackByAssetDate requirements
// (a rolling pre-release tag whose tag_name never changes, only the uploaded files — e.g.
// UE4SS 'experimental'), this is the asset's GitHub upload time; otherwise it is the
// semver-coerced (and normalized) release tag.
function latestAssetVersion(requirement, latest) {
  if (requirement.trackByAssetDate === true) {
    return latest.updated_at ?? latest.created_at ?? '';
  }
  // Rolling-tag repos (e.g. EntityAtlan 'ModLoader') carry the version in the asset
  // filename, not the tag - prefer the fileArchivePattern capture group when present.
  // Patterns without a capture group (or non-matching assets) fall through to the tag.
  const match = requirement.fileArchivePattern?.exec(latest.name);
  if (match?.[1]) {
    const fromAsset = semver.coerce(normalizeFrostyVersion(match[1]))?.version;
    if (fromAsset) {
      return fromAsset;
    }
  }
  return semver.coerce(normalizeFrostyVersion(latest.release.tag_name))?.version ?? '0.0.0';
}

// Whether the fetched `latest` asset is newer than the `installed` marker. Asset-date mode
// compares GitHub asset timestamps; otherwise compares semver versions. An absent/unparseable
// installed marker is treated as "update available".
function isUpdateAvailable(requirement, latest, installed) {
  if (requirement.trackByAssetDate === true) {
    const latestTime = Date.parse(latest.updated_at ?? latest.created_at ?? '');
    if (Number.isNaN(latestTime)) {
      return false;
    }
    const installedTime = Date.parse(installed ?? '');
    return Number.isNaN(installedTime) ? true : latestTime > installedTime;
  }
  // semver.gt throws on an unparseable version, and ?? does not catch the '' that a
  // resolveVersion may legitimately return - coerce down to the 0.0.0 floor instead, which
  // reads as "update available" like any other missing marker.
  const installedVersion = semver.coerce(installed)?.version ?? '0.0.0';
  return semver.gt(latestAssetVersion(requirement, latest), installedVersion);
}

// requirement.githubUrl is the REST API base (https://api.github.com/repos/{owner}/{repo}),
// used to build the releases endpoints - convert to the human repo page for the mod's source link.
function repoPageUrl(requirement) {
  return requirement.githubUrl?.replace('https://api.github.com/repos/', 'https://github.com/');
}

// --- downloader -----------------------------------------------------------

// Requirements with an install currently running, keyed by mod type - guards against
// overlapping runs (e.g. double-clicking a toolbar download action). Same guard the
// GameBanana/ModDB/ModWorkshop/Thunderstore modules use.
const activeInstalls = new Set();

async function download(api, requirements, force) {
  const state = api.getState();
  const gameId = selectors.activeGameId(state);
  api.sendNotification({
    id: NOTIF_ID_REQUIREMENTS,
    message: 'Installing Requirements',
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  const batchActions = [];
  const profileId = selectors.lastActiveProfileForGame(api.getState(), gameId);
  // force === true means the user asked for this explicitly (the update notification's
  // Download action, or a toolbar button). Track what happened so a run that found
  // everything current can say so instead of just flashing the activity notification.
  let installedAny = false;
  const upToDate = [];
  try {
    for (const req of requirements) {
      const guardKey = req.modType ?? req.archiveFileName;
      if (activeInstalls.has(guardKey)) {
        log('debug', `${req.userFacingName} install already running - skipping duplicate request`);
        continue;
      }
      activeInstalls.add(guardKey);
      try {
        let asset;
        let versionMismatch = false;
        const mod = await req.findMod(api);
        if (!!mod && req.resolveVersion) {
          if (force !== true) {
            // Requirement already installed. Do NOT auto-download an update on setup;
            // instead surface the "update available" notification and let the user
            // decide. The notification's Download action calls download(..., true),
            // which takes the forced branch below to actually perform the update.
            await testRequirementVersion(api, req);
            continue;
          }
          const version = await req.resolveVersion(api);
          asset = await getLatestGithubReleaseAsset(api, req);
          if (!asset) {
            continue;
          }
          if (isUpdateAvailable(req, asset, version)) {
            versionMismatch = true;
            // Disable the outgoing version NOW, not via the batch dispatched at the end of the
            // run. installDownload enables the incoming mod as soon as it lands, so deferring
            // this left both copies enabled across the install (two versions deploying over
            // each other) - and worse, whenever Vortex reuses the same mod id for the
            // replacement (common here, where many requirements ship a versionless archive
            // name) the deferred disable landed on the mod that had just been installed.
            api.store.dispatch(actions.setModEnabled(profileId, mod.id, false));
          } else {
            upToDate.push(`${req.userFacingName} (v${version})`);
            continue;
          }
        } else if (force !== true && mod?.id !== undefined) {
          batchActions.push(actions.setModEnabled(profileId, mod.id, true));
          batchActions.push(actions.setModAttribute(gameId, mod.id, 'customFileName', req.userFacingName));
          batchActions.push(actions.setModAttribute(gameId, mod.id, 'description', 'This is a modding requirement for this game - leave it enabled.'));
          continue;
        }
        const dlId = req.findDownloadId(api);
        if (!versionMismatch && !force && dlId) {
          // Archive already downloaded - resolve the version locally (archive filename/version
          // file) rather than hitting the GitHub API, keeping this shortcut path network-free.
          // A failed resolve ('' or the '0.0.0' sentinel) is left unstamped rather than recorded,
          // so the next forced update stamps the real release version instead of a bogus floor
          // that would suppress nothing and misreport the installed version.
          let shortcutVersion = req.resolveVersion ? await req.resolveVersion(api) : undefined;
          if (!shortcutVersion || shortcutVersion === '0.0.0') {
            shortcutVersion = undefined;
          }
          await installDownload(api, dlId, {
            name: req.userFacingName,
            pageUrl: repoPageUrl(req),
            version: shortcutVersion,
            modType: req.modType,
          });
          installedAny = true;
          continue;
        }
        if (!asset) {
          asset = await getLatestGithubReleaseAsset(api, req);
        }
        if (!asset) {
          // No usable asset in the release - getLatestGithubReleaseAsset has already told
          // the user why. Move on to the next requirement rather than throwing on asset.name.
          continue;
        }
        const tempPath = path.join(util.getVortexPath('temp'), asset.name);
        try {
          await doDownload(asset.browser_download_url, tempPath);
          await importAndInstall(api, tempPath, {
            name: req.userFacingName,
            assetDate: asset.updated_at,
            pageUrl: repoPageUrl(req),
            version: latestAssetVersion(req, asset),
            modType: req.modType,
          });
          installedAny = true;
        } finally {
          // import-downloads moves the file into the download folder on success; this only
          // removes it when the run did not get that far, so a failure leaves no stray temp file.
          await fs.removeAsync(tempPath).catch(() => null);
        }
      } catch (err) {
        // Keep going: one unreachable repo or broken archive must not silently drop every
        // remaining requirement in the array.
        if (err instanceof util.ProcessCanceled) {
          log('warn', `Skipped requirement ${req.userFacingName}`, err.message);
        } else {
          api.showErrorNotification(`Failed to install ${req.userFacingName}`, err, { allowReport: false });
        }
      } finally {
        activeInstalls.delete(guardKey);
      }
    }
  } catch (err) {
    log('error', 'failed to download requirements', err);
  } finally {
    if (batchActions.length > 0) {
      util.batchDispatch(api.store, batchActions);
    }
    api.dismissNotification(NOTIF_ID_REQUIREMENTS);
  }
  if ((force === true) && !installedAny && (upToDate.length > 0)) {
    api.sendNotification({
      id: `${NOTIF_ID_REQUIREMENTS}-current`,
      type: 'success',
      message: `Already up to date: ${upToDate.join(', ')}`,
      displayMS: 5000,
    });
  }
}

// info: { name, assetDate, pageUrl, version, modType } - all optional except name.
async function installDownload(api, dlId, info) {
  const state = api.getState();
  const gameId = selectors.activeGameId(state);
  return new Promise((resolve, reject) => {
    api.events.emit('start-install-download', dlId, true, (err, modId) => {
      if (err !== null) {
        api.showErrorNotification('Failed to install requirement', err, { allowReport: false });
        return reject(err);
      }
      const state = api.getState();
      const profileId = selectors.lastActiveProfileForGame(state, gameId);
      const attributes = { installTime: new Date(), name: info.name };
      // Record the GitHub asset upload time so trackByAssetDate requirements can later
      // detect a rebuilt rolling pre-release (see resolveVersionByAssetDate).
      if (info.assetDate !== undefined) {
        attributes.githubAssetDate = info.assetDate;
      }
      // source: 'website' + url makes Vortex show a clickable "Source" link to the repo
      // page in the mod details panel (mod_management customRenderer gates on this pair).
      if (info.pageUrl !== undefined) {
        attributes.source = 'website';
        attributes.url = info.pageUrl;
      }
      if (info.version !== undefined) {
        attributes.version = info.version;
      }
      const batch = [
        actions.setModAttributes(gameId, modId, attributes),
        actions.setModEnabled(profileId, modId, true),
      ];
      // The extension's own installer normally assigns the mod type through a setmodtype
      // instruction, but findModByFile only considers mods carrying the requirement's type -
      // an installer that fails to fire would leave the mod invisible to it and get the
      // requirement re-downloaded on every activation. Assign it here as well; when the
      // installer already did, this is a no-op.
      if (info.modType !== undefined) {
        batch.push(actions.setModType(gameId, modId, info.modType));
      }
      util.batchDispatch(api.store, batch);
      return resolve();
    });
  });
}

async function importAndInstall(api, filePath, info) {
  return new Promise((resolve, reject) => {
    api.events.emit('import-downloads', [filePath], async (dlIds) => {
      const id = dlIds[0];
      if (id === undefined) {
        return reject(new util.NotFound(filePath));
      }
      const batched = [];
      batched.push(actions.setDownloadModInfo(id, 'source', 'other'));
      util.batchDispatch(api.store, batched);
      try {
        await installDownload(api, id, info);
        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  });
}

async function getLatestGithubReleaseAsset(api, requirement) {
  const chooseAsset = (release) => {
    const assets = release.assets ?? [];
    if (requirement.fileArchivePattern) {
      const asset = assets.find(asset => requirement.fileArchivePattern.exec(asset.name));
      return asset ? { ...asset, release } : undefined;
    }
    const asset = assets.find((asset) => asset.name.includes(requirement.archiveFileName)) ?? assets[0];
    return asset ? { ...asset, release } : undefined;
  };
  // Pick the GitHub releases endpoint based on the requirement:
  //   prereleaseTag set -> that exact release (rolling tag, e.g. UE4SS 'experimental')
  //   allowPrerelease   -> newest release including pre-releases
  //   default           -> latest stable (GitHub excludes pre-releases/drafts)
  let releasesUrl;
  if (requirement.prereleaseTag) {
    releasesUrl = `${requirement.githubUrl}/releases/tags/${requirement.prereleaseTag}`;
  } else if (requirement.allowPrerelease === true) {
    releasesUrl = `${requirement.githubUrl}/releases`;
  } else {
    releasesUrl = `${requirement.githubUrl}/releases/latest`;
  }
  try {
    const response = await fetch(releasesUrl);
    // Rate-limit check must run before the non-ok throw: a rate-limited 403 must
    // yield ProcessCanceled (propagates to caller), not the generic error notification.
    // Only treat as rate limit when the header is actually present - a 403/404 from a
    // host that does not send x-ratelimit-* must fall through to the error path below.
    const remainingHeader = response.headers.get('x-ratelimit-remaining');
    if ([403, 404].includes(response.status) && (remainingHeader !== null) && (parseInt(remainingHeader, 10) === 0)) {
      const resetDate = parseInt(response.headers.get('x-ratelimit-reset') ?? '0', 10);
      log('info', 'GitHub rate limit exceeded', { reset_at: (new Date(resetDate * 1000)).toString() });
      return Promise.reject(new util.ProcessCanceled('GitHub rate limit exceeded'));
    }
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status} (${releasesUrl})`);
    }
    // /releases returns an array (newest-first); /releases/latest and /releases/tags/* a single object
    const data = await response.json();
    // Scan on past releases that carry no matching asset rather than giving up on the newest
    // one - a source-only or partially uploaded release would otherwise hide an asset that
    // does exist further down. Single-release endpoints simply yield a one-entry list.
    const releases = (Array.isArray(data) ? data : [data]).filter(rel => !!rel && !rel.draft);
    for (const release of releases) {
      const asset = chooseAsset(release);
      if (asset) {
        return asset;
      }
    }
    // Nothing matched anywhere. This is what an upstream asset rename looks like, and it is
    // otherwise completely silent - name the pattern and what the release actually ships.
    const available = (releases[0]?.assets ?? []).map(asset => asset.name);
    const reason = requirement.fileArchivePattern
      ? `no asset matched ${requirement.fileArchivePattern}`
      : `no asset matched "${requirement.archiveFileName}"`;
    log('warn', `No usable GitHub asset for ${requirement.userFacingName}`, { reason, releasesChecked: releases.length, available });
    api.showErrorNotification('Could not find a download for {{repName}}',
      `${reason}. The latest release ${available.length > 0 ? `contains: ${available.join(', ')}` : 'contains no files'}. `
      + 'The file was most likely renamed by its author, in which case this extension needs an update.',
      { allowReport: false, replace: { repName: requirement.userFacingName } });
  } catch (error) {
    api.showErrorNotification('Error fetching the latest release url for {{repName}}', error, { allowReport: false, replace: { repName: requirement.archiveFileName } });
  }
  return null;
}

//Write a fetch response body to disk without buffering it - mod loaders and emulator
//builds run to hundreds of MB. The web stream is drained by hand rather than through
//Readable.fromWeb: the renderer's fetch returns Blink's ReadableStream, which is a
//different class from the node:stream/web ReadableStream that fromWeb brand-checks its
//argument against, so it always rejects it ("must be an instance of ReadableStream.
//Received an instance of ReadableStream").
async function streamToFile(body, targetPath) {
  const reader = body.getReader();
  const out = createWriteStream(targetPath);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!out.write(value)) { //respect backpressure instead of queueing the whole file in memory
        await new Promise((resolve, reject) => {
          const onDrain = () => { out.off('error', onError); resolve(); };
          const onError = (err) => { out.off('drain', onDrain); reject(err); };
          out.once('drain', onDrain);
          out.once('error', onError);
        });
      }
    }
  } catch (err) {
    await reader.cancel().catch(() => null);
    out.destroy();
    throw err;
  }
  out.end();
  return finished(out); //resolves once the file is flushed and closed
}

async function doDownload(downloadUrl, destination) {
  // No custom headers: Chromium forbids setting User-Agent/Accept-Encoding from fetch
  // (the old axios browser build silently dropped them too). Redirects (GitHub asset
  // 302 -> objects.githubusercontent.com) are followed automatically.
  const response = await fetch(downloadUrl);
  const remainingHeader = response.headers.get('x-ratelimit-remaining');
  if ([403, 404].includes(response.status) && (remainingHeader !== null) && (parseInt(remainingHeader, 10) === 0)) {
    const resetDate = parseInt(response.headers.get('x-ratelimit-reset') ?? '0', 10);
    log('info', 'GitHub rate limit exceeded', { reset_at: (new Date(resetDate * 1000)).toString() });
    return Promise.reject(new util.ProcessCanceled('GitHub rate limit exceeded'));
  }
  if (!response.ok) {
    throw new Error(`Request failed with status code ${response.status} (${downloadUrl})`);
  }
  if (!response.body) {
    throw new Error(`Response carried no body (${downloadUrl})`);
  }
  await streamToFile(response.body, destination);
}

// --- util -----------------------------------------------------------------
// Mods carrying the requirement's mod type. Untyped mods are deliberately excluded: marker
// files like winmm.dll or dinput8.dll ship with ordinary mods too, and matching those made a
// requirement look permanently installed (so it was never downloaded, and update checks read
// the wrong mod's version). installDownload assigns the mod type itself, so anything installed
// through this module always carries one.
function getMods(api, modType) {
  const state = api.getState();
  const gameId = selectors.activeGameId(state);
  const mods = util.getSafe(state, ['persistent', 'mods', gameId], {});
  return Object.values(mods).filter((mod) => mod.type === modType);
}

async function findModByFile(api, modType, fileName) {
  const state = api.getState();
  const gameId = selectors.activeGameId(state);
  const mods = getMods(api, modType);
  const installationPath = selectors.installPathForGame(api.getState(), gameId);
  for (const mod of mods) {
    const modPath = path.join(installationPath, mod.installationPath);
    const files = await walkPath(modPath);
    // case-insensitive match: maintainers may change assemblyFileName capitalization,
    // and a case-sensitive compare would miss the installed file -> re-download loop.
    const needle = fileName.toLowerCase();
    if (files.find(file => file.filePath.toLowerCase().endsWith(needle))) {
      return mod;
    }
  }
  return undefined;
}

function findDownloadIdByFile(api, fileName) {
  const state = api.getState();
  const downloads = util.getSafe(state, ['persistent', 'downloads', 'files'], {});
  return Object.entries(downloads).reduce((prev, [dlId, dl]) => {
    // localPath is optional on IDownload - entries still initialising, redirects and failed
    // downloads have none, and path.basename throws on undefined.
    if (!dl?.localPath) {
      return prev;
    }
    if (path.basename(dl.localPath).toLowerCase() === fileName.toLowerCase()) {
      prev = dlId;
    }
    return prev;
  }, '');
}

async function resolveVersionByPattern(api, requirement) {
  const state = api.getState();
  const files = util.getSafe(state, ['persistent', 'downloads', 'files'], []);
  const latestVersion = Object.values(files).reduce((prev, file) => {
    if (!file?.localPath) { //not every download entry has a local file yet
      return prev;
    }
    const match = requirement.fileArchivePattern.exec(file.localPath);
    // coerce so an unparseable capture can't make semver.gt throw
    const version = match?.[1] ? semver.coerce(normalizeFrostyVersion(match[1]))?.version : undefined;
    if (version && semver.gt(version, prev)) {
      prev = version;
    }
    return prev;
  }, '0.0.0');
  return latestVersion;
}

// resolveVersion implementation for trackByAssetDate requirements: reads the GitHub asset
// upload time recorded on the installed mod at install (see installDownload). Returns '' when
// the requirement is not installed or has no recorded date, which isUpdateAvailable treats as
// "update available".
async function resolveVersionByAssetDate(api, requirement) {
  const mod = await requirement.findMod(api);
  return util.getSafe(mod, ['attributes', 'githubAssetDate'], '');
}

// resolveVersion implementation reading the `version` attribute stamped on the installed
// mod at install time (see installDownload). For requirements whose asset filename carries
// no version (the version only exists in the release tag, e.g. lovely-injector's
// lovely-x86_64-pc-windows-msvc.zip under tags like v0.8.0): the install stamps the
// tag-derived version and update checks read it back, closing the loop that
// resolveVersionByPattern cannot close there (a versionless archive name always resolves
// to the '0.0.0' floor, reporting an update forever). Returns '0.0.0' when the requirement
// is not installed or has no parsable stamped version, which isUpdateAvailable treats as
// "update available".
async function resolveVersionByModVersion(api, requirement) {
  const mod = await requirement.findMod(api);
  const stamped = util.getSafe(mod, ['attributes', 'version'], '');
  return semver.coerce(stamped)?.version ?? '0.0.0';
}

async function walkPath(dirPath, walkOptions) {
  // util.walk (Vortex-provided) replaces the turbowalk dependency. It calls back
  // per entry with (iterPath, stats); we rebuild the turbowalk-style entry shape
  // (filePath/isDirectory/size/mtime) so callers keep using `.filePath`.
  // ignoreErrors: true swallows per-subtree EACCES/ENOENT (walk handles ENOENT too).
  const walkResults = [];
  await util.walk(dirPath, (iterPath, stats) => {
    walkResults.push({
      filePath: iterPath,
      isDirectory: stats.isDirectory(),
      size: stats.size,
      mtime: stats.mtime,
    });
    return Promise.resolve();
  }, { ignoreErrors: true, ...walkOptions });
  return walkResults;
}

// --- tests ----------------------------------------------------------------
async function testRequirementVersion(api, requirement) {
  const t = api.translate;
  if (!requirement?.resolveVersion) {
    return;
  }
  // Missing rather than outdated: resolveVersion would report the '0.0.0' floor and this would
  // raise an "update available" notification for something the user never had. Install it
  // instead. download() is non-forced here and an installed requirement never reaches this
  // branch, so it cannot recurse back into testRequirementVersion. Requirements the user
  // installs manually (optional loaders behind a toolbar button) opt out with autoInstall: false.
  if (requirement.findMod && ((await requirement.findMod(api)) === undefined)) {
    if (requirement.autoInstall === false) {
      return;
    }
    log('info', `${requirement.userFacingName} is not installed - installing it`);
    return download(api, [requirement]);
  }
  const currentVersion = await requirement.resolveVersion(api);
  const latest = await getLatestGithubReleaseAsset(api, requirement);
  if (!latest) {
    return;
  }
  if (!isUpdateAvailable(requirement, latest, currentVersion)) {
    return;
  }
  const latestLabel = latestAssetVersion(requirement, latest);
  const more = (dismiss) => {
    api.showDialog('question', 'Update Requirement', {
      bbcode: t('A new "{{reqName}}" update has been released "v{{latestVersion}}" - your modding environment is currently set to "v{{currentVersion}}".[br][/br][br][/br]'
        + 'Would you like to update? (if your modding environment is functioning correctly, there may be no reason to update.)', { replace: { reqName: requirement.userFacingName, currentVersion, latestVersion: latestLabel } }),
    }, [
      {
        label: 'Download', default: true, action: () => {
          download(api, [requirement], true);
          dismiss();
        }
      },
      { label: 'Close', action: () => dismiss() }
    ]);
  };
  const notificationId = `${requirement.archiveFileName}-update`;
  api.sendNotification({
    message: `${requirement.userFacingName} update available`,
    type: 'warning',
    allowSuppress: true,
    id: notificationId,
    actions: [
      { title: 'More', action: more },
      {
        title: 'Download', action: (dismiss) => {
          download(api, [requirement], true);
          dismiss();
        }
      }
    ]
  });
}

// --- index ----------------------------------------------------------------
function init() {
  return;
}

module.exports = {
  download,
  getLatestGithubReleaseAsset,
  doDownload,
  findModByFile,
  findDownloadIdByFile,
  walkPath,
  resolveVersionByPattern,
  resolveVersionByAssetDate,
  resolveVersionByModVersion,
  getMods,
  testRequirementVersion,
  default: init,
};
