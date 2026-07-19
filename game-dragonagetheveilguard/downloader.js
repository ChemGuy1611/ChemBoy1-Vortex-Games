'use strict';

// Shared GitHub/Nexus requirements auto-downloader for Vortex game extensions.
//
// Hand-authored CommonJS module (formerly a webpack bundle). All HTTP goes through
// the native fetch global (Vortex 2 runs extensions in the Electron renderer, so
// requests use the same Chromium network stack the old vendored axios browser build
// did). The only externals are path/semver/vortex-api.
//
// Public API: download, getLatestGithubReleaseAsset, doDownload,
// findModByFile, findDownloadIdByFile, walkPath, resolveVersionByPattern,
// resolveVersionByAssetDate, resolveVersionByModVersion, getMods,
// testRequirementVersion, default(init).

const path = require('path');
const semver = require('semver');
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
  // Rolling-tag repos carry the version in the asset filename, not the tag - prefer
  // the fileArchivePattern capture group when present. Patterns without a capture
  // group (or non-matching assets) fall through to the tag.
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
  return semver.gt(latestAssetVersion(requirement, latest), installed ?? '0.0.0');
}

// requirement.githubUrl is the REST API base (https://api.github.com/repos/{owner}/{repo}),
// used to build the releases endpoints - convert to the human repo page for the mod's source link.
function repoPageUrl(requirement) {
  return requirement.githubUrl?.replace('https://api.github.com/repos/', 'https://github.com/');
}

// --- downloader -----------------------------------------------------------
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
  try {
    for (const req of requirements) {
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
          batchActions.push(actions.setModEnabled(profileId, mod.id, false));
        } else {
          continue;
        }
      } else if (!versionMismatch && force !== true && mod?.id !== undefined) {
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
        await installDownload(api, dlId, req.userFacingName, undefined, repoPageUrl(req), shortcutVersion);
        continue;
      }
      if (!asset) {
        asset = await getLatestGithubReleaseAsset(api, req);
      }
      const tempPath = path.join(util.getVortexPath('temp'), asset.name);
      try {
        await doDownload(asset.browser_download_url, tempPath);
        await importAndInstall(api, tempPath, req.userFacingName, asset.updated_at, repoPageUrl(req), latestAssetVersion(req, asset));
      } catch (err) {
        api.showErrorNotification('Failed to download requirements', err, { allowReport: false });
        return;
      }
    }
  } catch (err) {
    log('error', 'failed to download requirements', err);
    return;
  } finally {
    if (batchActions.length > 0) {
      util.batchDispatch(api.store, batchActions);
    }
    api.dismissNotification(NOTIF_ID_REQUIREMENTS);
  }
}

async function installDownload(api, dlId, name, assetDate, pageUrl, version) {
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
      const attributes = { installTime: new Date(), name };
      // Record the GitHub asset upload time so trackByAssetDate requirements can later
      // detect a rebuilt rolling pre-release (see resolveVersionByAssetDate).
      if (assetDate !== undefined) {
        attributes.githubAssetDate = assetDate;
      }
      // source: 'website' + url makes Vortex show a clickable "Source" link to the repo
      // page in the mod details panel (mod_management customRenderer gates on this pair).
      if (pageUrl !== undefined) {
        attributes.source = 'website';
        attributes.url = pageUrl;
      }
      if (version !== undefined) {
        attributes.version = version;
      }
      const batch = [
        actions.setModAttributes(gameId, modId, attributes),
        actions.setModEnabled(profileId, modId, true),
      ];
      util.batchDispatch(api.store, batch);
      return resolve();
    });
  });
}

async function importAndInstall(api, filePath, name, assetDate, pageUrl, version) {
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
        await installDownload(api, id, name, assetDate, pageUrl, version);
        return resolve();
      } catch (err) {
        return reject(err);
      }
    });
  });
}

async function getLatestGithubReleaseAsset(api, requirement) {
  const chooseAsset = (release) => {
    const assets = release.assets;
    if (requirement.fileArchivePattern) {
      const asset = assets.find(asset => requirement.fileArchivePattern.exec(asset.name));
      if (asset) {
        return { ...asset, release };
      }
    } else {
      const asset = assets.find((asset) => asset.name.includes(requirement.archiveFileName)) ?? assets[0];
      return { ...asset, release };
    }
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
    const release = Array.isArray(data) ? data.find(rel => !rel.draft) : data;
    if (release && release.assets.length > 0) {
      return chooseAsset(release);
    }
  } catch (error) {
    api.showErrorNotification('Error fetching the latest release url for {{repName}}', error, { allowReport: false, replace: { repName: requirement.archiveFileName } });
  }
  return null;
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
  const data = await response.arrayBuffer();
  await fs.writeFileAsync(destination, Buffer.from(data));
}

// --- util -----------------------------------------------------------------
function getMods(api, modType) {
  const state = api.getState();
  const gameId = selectors.activeGameId(state);
  const mods = util.getSafe(state, ['persistent', 'mods', gameId], {});
  return Object.values(mods).filter((mod) => mod.type === modType || mod.type === '');
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
