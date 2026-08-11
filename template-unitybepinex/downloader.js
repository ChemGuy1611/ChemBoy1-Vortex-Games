'use strict';

// Shared GitHub/Nexus requirements auto-downloader for Vortex game extensions.
//
// Hand-authored CommonJS module (formerly a webpack bundle). All HTTP goes through
// the native fetch global (Vortex 2 runs extensions in the Electron renderer, so
// requests use the same Chromium network stack the old vendored axios browser build
// did). Externals are vortex-api and node's path/fs/stream, plus semver.
//
// Three opt-in requirement modes sit on top of the default "install and track the latest
// release" behavior: pinVersion holds a requirement at one release and makes its update check
// skip the network entirely, directCopyPath fetches a naked (non-archive) release asset
// straight to a file path instead of installing it as a mod, and nightlyUrl tracks a GitHub
// Actions CI artifact (which is not a release at all) by its workflow run number.
//
// Public API: download, getLatestGithubReleaseAsset, getLatestNightlyArtifact, doDownload,
// findModByFile, findDownloadIdByFile, walkPath, resolveVersionByPattern,
// resolveVersionByAssetDate, resolveVersionByModVersion,
// resolveVersionByDirectCopyMarker, resolveVersionByNightlyRun, getMods,
// testRequirementVersion, default(init).

const path = require('path');
const semver = require('semver');
const { createWriteStream } = require('fs'); //node's fs directly - vortex-api's createWriteStream re-export is deprecated
const { finished } = require('stream/promises');
const { actions, fs, log, selectors, util } = require('vortex-api');

// --- common ---------------------------------------------------------------
const NOTIF_ID_REQUIREMENTS = 'vortex-downloader-requirements-download-notification';

// Normalize mis-tagged GitHub release versions so semver can parse them:
// replace "-"/"_" with "." between digits, i.e. v1-2-3-pre.4 -> v1.2.3-pre.4.
// Lookahead keeps the trailing digit unconsumed so every separator is replaced
// (a consuming match would skip alternate separators, e.g. 6_1_1 -> 6.1_1).
function normalizeVersion(version) {
  if (version === null || version === undefined) {
    return version;
  }
  return version.replace(/(\d)[-_](?=\d)/g, '$1.');
}

// Whether a requirement tracks a GitHub Actions CI artifact instead of a release. Setting
// nightlyUrl is what switches the mode on; see the nightly section further down.
function isNightly(requirement) {
  return (requirement?.nightlyUrl !== undefined)
    && (requirement.nightlyUrl !== null)
    && (requirement.nightlyUrl !== '');
}

// --- version pinning ------------------------------------------------------
// An opt-in pin holds a requirement at one specific release instead of tracking the newest
// one. pinVersion is both the compare key and the label shown to the user; pinTag names the
// GitHub tag when it differs from the version (the tag is retried with its leading 'v'
// toggled on a 404). With pinVersion unset - the default - none of this code runs and the
// module behaves exactly as it does without the feature.
function isPinned(requirement) {
  return (requirement?.pinVersion !== undefined)
    && (requirement.pinVersion !== null)
    && (requirement.pinVersion !== '');
}

// Installed identity of a pinned requirement, read from the `version` attribute stamped at
// install (or from the direct-copy marker file), deliberately bypassing resolveVersion: a pin
// has to work whichever resolver strategy the requirement is configured with, and
// resolveVersionByAssetDate returns a date that could never be compared against a version.
async function installedPinVersion(api, requirement) {
  if (requirement.directCopyPath !== undefined) {
    const marker = await readDirectCopyMarker(requirement);
    return marker?.version ?? '';
  }
  const mod = requirement.findMod ? await requirement.findMod(api) : undefined;
  return util.getSafe(mod, ['attributes', 'version'], '');
}

// Pin comparison. Exact string match first, so version shapes semver cannot represent compare
// as written (BepInEx's 4-segment 5.4.23.5, ConfigurationManager's 2-segment 19.0); semver
// equality as a fallback for versions stamped before the pin was set, which were coerced on
// the way in ('19.0' -> '19.0.0').
function isSamePinVersion(pinVersion, installed) {
  const pinned = String(pinVersion ?? '');
  const current = String(installed ?? '');
  if ((pinned === '') || (current === '')) {
    return false;
  }
  if (pinned === current) {
    return true;
  }
  const coercedPin = semver.coerce(normalizeVersion(pinned))?.version;
  const coercedCurrent = semver.coerce(normalizeVersion(current))?.version;
  return (coercedPin !== undefined) && (coercedPin === coercedCurrent);
}

// Whether the installed copy already sits on the pin. True short-circuits the update check
// before any HTTP request is made - a pinned requirement costs nothing against the GitHub
// rate limit.
async function isAtPinnedVersion(api, requirement) {
  if (!isPinned(requirement)) {
    return false;
  }
  return isSamePinVersion(requirement.pinVersion, await installedPinVersion(api, requirement));
}

// Comparable/display version for a fetched release asset. A pinned requirement always resolves
// its pinned release, so the pin itself is the version - reporting anything else would leave
// the stamped version disagreeing with the pin the next check compares against. For
// trackByAssetDate requirements (a rolling pre-release tag whose tag_name never changes, only
// the uploaded files — e.g. UE4SS 'experimental-latest'), this is the asset's GitHub upload
// time; otherwise it is the semver-coerced (and normalized) release tag.
function latestAssetVersion(requirement, latest) {
  // Nightly first: a CI artifact has no tag and no version in its (constant) filename, so the
  // workflow run number is the only identity it has. It is also what the update check compares,
  // and the two must agree or every check would report an update.
  if (isNightly(requirement)) {
    return String(latest.nightlyRunNumber ?? '');
  }
  if (isPinned(requirement)) {
    return String(requirement.pinVersion);
  }
  if (requirement.trackByAssetDate === true) {
    return latest.updated_at ?? latest.created_at ?? '';
  }
  // Rolling-tag repos (e.g. EntityAtlan 'ModLoader') carry the version in the asset
  // filename, not the tag - prefer the fileArchivePattern capture group when present.
  // Patterns without a capture group (or non-matching assets) fall through to the tag.
  const match = requirement.fileArchivePattern?.exec(latest.name);
  if (match?.[1]) {
    const fromAsset = semver.coerce(normalizeVersion(match[1]))?.version;
    if (fromAsset) {
      return fromAsset;
    }
  }
  return semver.coerce(normalizeVersion(latest.release.tag_name))?.version ?? '0.0.0';
}

// Whether the fetched `latest` asset is newer than the `installed` marker. Asset-date mode
// compares GitHub asset timestamps; otherwise compares semver versions. An absent/unparseable
// installed marker is treated as "update available".
function isUpdateAvailable(requirement, latest, installed) {
  // Nightly run numbers are monotonic integers, so they compare numerically - semver cannot
  // hold them and there is no tag to coerce. An unstamped install reads as 0 and so as
  // "update available", the same way a missing marker does everywhere else.
  if (isNightly(requirement)) {
    const latestRun = Number(latest.nightlyRunNumber);
    if (!Number.isFinite(latestRun)) {
      return false;
    }
    const installedRun = Number(installed);
    return !Number.isFinite(installedRun) || (latestRun > installedRun);
  }
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
        // Direct-copy requirements (naked, non-archive release assets) bypass the mod pipeline
        // entirely - findMod/findDownloadId/modType/assemblyFileName are not read for them.
        if (req.directCopyPath !== undefined) {
          if (await downloadDirectCopy(api, req, force)) {
            installedAny = true;
          }
          continue;
        }
        let asset;
        let versionMismatch = false;
        const mod = await req.findMod(api);
        if (!!mod && (req.resolveVersion || isPinned(req))) {
          if (force !== true) {
            // Requirement already installed. Do NOT auto-download an update on setup;
            // instead surface the "update available" notification and let the user
            // decide. The notification's Download action calls download(..., true),
            // which takes the forced branch below to actually perform the update.
            await testRequirementVersion(api, req);
            continue;
          }
          const pinned = isPinned(req);
          const version = pinned ? await installedPinVersion(api, req) : await req.resolveVersion(api);
          asset = await resolveLatestAsset(api, req);
          if (!asset) {
            continue;
          }
          // A pin replaces the newest-release comparison outright: the fetched asset IS the
          // pinned release, so anything else installed - older or newer - is a mismatch, and
          // installing over a newer version is the deliberate downgrade the pin asks for.
          if (pinned ? !isSamePinVersion(req.pinVersion, version) : isUpdateAvailable(req, asset, version)) {
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
        // findDownloadId is not required of a nightly requirement - the shortcut below never
        // applies to one, so declaring the field there would be dead weight.
        const dlId = req.findDownloadId ? req.findDownloadId(api) : '';
        // A nightly artifact's filename is constant across every CI run, so a local archive
        // matching it is precisely what must NOT be reused - always re-resolve the newest run.
        if (!versionMismatch && !force && dlId && !isNightly(req)) {
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
          asset = await resolveLatestAsset(api, req);
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
            nightlyRunNumber: asset.nightlyRunNumber,
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

// info: { name, assetDate, pageUrl, version, nightlyRunNumber, modType } - all optional except name.
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
      // Vortex renders a mod as customFileName || logicalFileName || fileName || name, and the
      // install pipeline stamps fileName with the archive name - so without customFileName the
      // mod list shows the raw archive (BepInEx_win_x64_5.4.23.5.zip) instead of the
      // requirement's readable name. The already-installed branch of download() has always set
      // it; setting it here too makes a fresh install and a re-run agree.
      const attributes = { installTime: new Date(), name: info.name, customFileName: info.name };
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
      // Compare key for nightly requirements (see resolveVersionByNightlyRun). Kept separate
      // from `version` because that one is a display string every other mode also writes.
      if (info.nightlyRunNumber !== undefined) {
        attributes.nightlyRunNumber = info.nightlyRunNumber;
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
  //   pinVersion set    -> that exact tag, overriding every option below
  //   prereleaseTag set -> that exact release (rolling tag, e.g. UE4SS 'experimental-latest')
  //   allowPrerelease   -> newest release including pre-releases
  //   default           -> latest stable (GitHub excludes pre-releases/drafts)
  // Only a pin has a second candidate URL: repos are inconsistent about the leading 'v' on
  // tags, so the other form is tried once when the first returns 404.
  const candidateUrls = [];
  if (isPinned(requirement)) {
    if (requirement.prereleaseTag || (requirement.allowPrerelease === true) || (requirement.trackByAssetDate === true)) {
      log('warn', `${requirement.userFacingName} is pinned to ${requirement.pinVersion} - ignoring allowPrerelease/prereleaseTag/trackByAssetDate`);
    }
    const pinnedTag = String(requirement.pinTag ?? requirement.pinVersion);
    const altTag = pinnedTag.startsWith('v') ? pinnedTag.slice(1) : `v${pinnedTag}`;
    candidateUrls.push(`${requirement.githubUrl}/releases/tags/${pinnedTag}`);
    candidateUrls.push(`${requirement.githubUrl}/releases/tags/${altTag}`);
  } else if (requirement.prereleaseTag) {
    candidateUrls.push(`${requirement.githubUrl}/releases/tags/${requirement.prereleaseTag}`);
  } else if (requirement.allowPrerelease === true) {
    candidateUrls.push(`${requirement.githubUrl}/releases`);
  } else {
    candidateUrls.push(`${requirement.githubUrl}/releases/latest`);
  }
  let releasesUrl = candidateUrls[0];
  try {
    let response;
    for (const candidate of candidateUrls) {
      releasesUrl = candidate;
      response = await fetch(candidate);
      // Rate-limit check must run before the retry and the non-ok throw: a rate-limited 403
      // must yield ProcessCanceled (propagates to caller), not another request or the generic
      // error notification. Only treat as rate limit when the header is actually present - a
      // 403/404 from a host that does not send x-ratelimit-* must fall through to the error
      // path below.
      const remainingHeader = response.headers.get('x-ratelimit-remaining');
      if ([403, 404].includes(response.status) && (remainingHeader !== null) && (parseInt(remainingHeader, 10) === 0)) {
        const resetDate = parseInt(response.headers.get('x-ratelimit-reset') ?? '0', 10);
        log('info', 'GitHub rate limit exceeded', { reset_at: (new Date(resetDate * 1000)).toString() });
        return Promise.reject(new util.ProcessCanceled('GitHub rate limit exceeded'));
      }
      // Only a missing tag is worth retrying with the other 'v' spelling; any other status
      // means the next candidate would fail the same way.
      if (response.ok || (response.status !== 404)) {
        break;
      }
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

// --- nightly CI artifacts -------------------------------------------------
// Some upstreams publish their bleeding-edge builds as GitHub *Actions artifacts* rather than
// releases - MelonLoader's alpha-development branch is the reference case, served through
// nightly.link. None of the three release endpoints above can reach those, so a requirement
// that sets nightlyUrl takes its identity from the Actions run listing instead: the newest
// successful run of nightlyWorkflow on nightlyBranch, compared by run_number.
//
// The artifact itself is fetched from the requirement's nightlyUrl, which is stable and
// predictable (nightly.link rewrites it to a short-lived pre-signed storage URL on every
// request). doDownload follows that redirect exactly the way it follows GitHub's own asset
// redirect, so nothing else in the module needs to know about the mode.
//
// Pinning cannot apply here: nightlyUrl only ever serves the newest run's artifact, so there
// is no way to reach an older one through it.

// The newest successful run, shaped as a release asset so the rest of the module can treat it
// like one. Only name/browser_download_url/updated_at are read downstream; nightlyRunNumber is
// the compare key and rides along on the same object.
async function getLatestNightlyArtifact(api, requirement) {
  if (isPinned(requirement)) {
    log('warn', `${requirement.userFacingName} tracks a nightly CI artifact - ignoring pinVersion (only the newest run is reachable)`);
  }
  const runsUrl = `${requirement.githubUrl}/actions/workflows/${requirement.nightlyWorkflow}/runs`
    + `?branch=${requirement.nightlyBranch}&status=success&per_page=1`;
  try {
    const response = await fetch(runsUrl);
    // Same rate-limit contract as the release path: a rate-limited 403/404 must yield
    // ProcessCanceled for the caller to skip on, not the generic error notification.
    const remainingHeader = response.headers.get('x-ratelimit-remaining');
    if ([403, 404].includes(response.status) && (remainingHeader !== null) && (parseInt(remainingHeader, 10) === 0)) {
      const resetDate = parseInt(response.headers.get('x-ratelimit-reset') ?? '0', 10);
      log('info', 'GitHub rate limit exceeded', { reset_at: (new Date(resetDate * 1000)).toString() });
      return Promise.reject(new util.ProcessCanceled('GitHub rate limit exceeded'));
    }
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status} (${runsUrl})`);
    }
    const data = await response.json();
    const run = (data?.workflow_runs ?? [])[0];
    if (!run) {
      // A renamed workflow file or a retired branch looks exactly like this, and is otherwise
      // completely silent - name what was asked for.
      const reason = `no successful run of ${requirement.nightlyWorkflow} on branch ${requirement.nightlyBranch}`;
      log('warn', `No usable nightly build for ${requirement.userFacingName}`, { reason, runsUrl });
      api.showErrorNotification('Could not find a nightly build for {{repName}}',
        `${reason}. The workflow or branch was most likely renamed by its author, in which case this extension needs an update.`,
        { allowReport: false, replace: { repName: requirement.userFacingName } });
      return null;
    }
    return {
      name: requirement.archiveFileName,
      browser_download_url: requirement.nightlyUrl,
      updated_at: run.updated_at ?? run.created_at,
      nightlyRunNumber: run.run_number,
      release: { tag_name: String(run.run_number) },
    };
  } catch (error) {
    api.showErrorNotification('Error fetching the latest nightly build for {{repName}}', error, { allowReport: false, replace: { repName: requirement.userFacingName } });
  }
  return null;
}

// Single entry point for "what is upstream offering right now" - releases by default, the
// Actions run listing for a nightly requirement.
async function resolveLatestAsset(api, requirement) {
  return isNightly(requirement)
    ? getLatestNightlyArtifact(api, requirement)
    : getLatestGithubReleaseAsset(api, requirement);
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

// --- direct copy ----------------------------------------------------------
// Some upstreams publish a naked file instead of an archive (e.g. MelonPreferencesManager's
// bare .dll). The archive pipeline (import-downloads -> start-install-download) assumes 7-Zip
// can open whatever was downloaded, so those assets cannot travel through it at all. A
// requirement that sets directCopyPath is fetched straight to that path instead and is never
// registered as a Vortex mod.
//
// ADOPTERS: directCopyPath is the one requirement field that depends on the discovered game
// path, and extensions build their requirement arrays at module load - when GAME_PATH is still
// ''. Reassign the field inside setup(), after GAME_PATH is set, or the baked-in path stays
// relative and never resolves.

// Sidecar marker recording what the direct copy installed. A direct-copied file is not a
// managed mod, so there are no mod attributes to stamp; the marker sits beside the file and
// disappears with it (or with the game folder), correctly forcing re-detection.
function directCopyMarkerPath(requirement) {
  return `${requirement.directCopyPath}.version.json`;
}

async function readDirectCopyMarker(requirement) {
  try {
    const raw = await fs.readFileAsync(directCopyMarkerPath(requirement), { encoding: 'utf8' });
    return JSON.parse(raw);
  } catch {
    return undefined; //never installed, hand-deleted, or unreadable - all mean "re-resolve"
  }
}

// resolveVersion implementation for direct-copy requirements: reads back the marker file
// written at install. Returns the '0.0.0' floor (or '' in asset-date mode) when there is no
// marker, which isUpdateAvailable treats as "update available".
async function resolveVersionByDirectCopyMarker(api, requirement) {
  const marker = await readDirectCopyMarker(requirement);
  if (marker === undefined) {
    return (requirement.trackByAssetDate === true) ? '' : '0.0.0';
  }
  if (requirement.trackByAssetDate === true) {
    return marker.assetDate ?? '';
  }
  return semver.coerce(normalizeVersion(marker.version))?.version ?? '0.0.0';
}

async function isDirectCopyInstalled(api, requirement) {
  // An archived build installed as an ordinary mod (the user took it from Nexus instead)
  // counts as installed - Vortex deploys the file in that case and the direct copy must not
  // fight it.
  if (requirement.directCopyModType && (getMods(api, requirement.directCopyModType).length > 0)) {
    return true;
  }
  try {
    await fs.statAsync(requirement.directCopyPath);
    return true;
  } catch {
    return false;
  }
}

// Fetch the matched asset straight to directCopyPath. Deliberately creates no Downloads-tab
// entry: an entry whose "Install" button cannot work would only mislead, for a file that
// structurally cannot be installed. Returns true when a file was written.
async function downloadDirectCopy(api, requirement, force) {
  const installed = await isDirectCopyInstalled(api, requirement);
  if (installed && (force !== true)) {
    if (requirement.resolveVersion) {
      await testRequirementVersion(api, requirement);
    }
    return false;
  }
  const asset = await resolveLatestAsset(api, requirement);
  if (!asset) {
    return false;
  }
  try {
    await fs.ensureDirWritableAsync(path.dirname(requirement.directCopyPath));
    await doDownload(asset.browser_download_url, requirement.directCopyPath);
    const marker = {
      version: latestAssetVersion(requirement, asset),
      assetDate: asset.updated_at ?? asset.created_at,
    };
    await fs.writeFileAsync(directCopyMarkerPath(requirement), JSON.stringify(marker), { encoding: 'utf8' });
    return true;
  } catch (err) {
    api.showErrorNotification(`Failed to install ${requirement.userFacingName}`, err, { allowReport: false });
  }
  return false;
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
    const version = match?.[1] ? semver.coerce(normalizeVersion(match[1]))?.version : undefined;
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

// resolveVersion implementation for nightly requirements: reads back the workflow run number
// stamped on the installed mod at install (see installDownload). Returns '' when the
// requirement is not installed or predates the stamp, which isUpdateAvailable treats as
// "update available" - one notification, and the forced install stamps it.
async function resolveVersionByNightlyRun(api, requirement) {
  const mod = await requirement.findMod(api);
  return String(util.getSafe(mod, ['attributes', 'nightlyRunNumber'], ''));
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
  // Pinned and already sitting on the pin: nothing to check, and deliberately no HTTP request
  // at all - this is what makes a pinned requirement free against the GitHub rate limit.
  if (await isAtPinnedVersion(api, requirement)) {
    return;
  }
  if (!requirement?.resolveVersion) {
    return;
  }
  // Missing rather than outdated: resolveVersion would report the '0.0.0' floor and this would
  // raise an "update available" notification for something the user never had. Install it
  // instead. download() is non-forced here and an installed requirement never reaches this
  // branch, so it cannot recurse back into testRequirementVersion. Requirements the user
  // installs manually (optional loaders behind a toolbar button) opt out with autoInstall: false.
  const missing = (requirement.directCopyPath !== undefined)
    ? !(await isDirectCopyInstalled(api, requirement))
    : (!!requirement.findMod && ((await requirement.findMod(api)) === undefined));
  if (missing) {
    if (requirement.autoInstall === false) {
      return;
    }
    log('info', `${requirement.userFacingName} is not installed - installing it`);
    return download(api, [requirement]);
  }
  const pinned = isPinned(requirement);
  const currentVersion = pinned
    ? await installedPinVersion(api, requirement)
    : await requirement.resolveVersion(api);
  const latest = await resolveLatestAsset(api, requirement);
  if (!latest) {
    return;
  }
  // A pinned requirement only reaches this line when the installed copy is NOT the pin, so
  // there is always something to offer; the version comparison applies to unpinned ones only.
  if (!pinned && !isUpdateAvailable(requirement, latest, currentVersion)) {
    return;
  }
  const latestLabel = latestAssetVersion(requirement, latest);
  const more = (dismiss) => {
    api.showDialog('question', pinned ? 'Install Pinned Requirement' : 'Update Requirement', {
      // The pinned wording has to cover a user who is ahead of the pin as well as behind it -
      // installing it from that state is a deliberate downgrade, so it says so.
      bbcode: pinned
        ? t('This extension pins "{{reqName}}" to "v{{latestVersion}}" - your modding environment is currently set to "v{{currentVersion}}".[br][/br][br][/br]'
          + 'Would you like to install the pinned version? (if your installed version is the newer one, this will downgrade it.)', { replace: { reqName: requirement.userFacingName, currentVersion, latestVersion: latestLabel } })
        : t('A new "{{reqName}}" update has been released "v{{latestVersion}}" - your modding environment is currently set to "v{{currentVersion}}".[br][/br][br][/br]'
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
    message: `${requirement.userFacingName} ${pinned ? 'pinned version available' : 'update available'}`,
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
  getLatestNightlyArtifact,
  doDownload,
  findModByFile,
  findDownloadIdByFile,
  walkPath,
  resolveVersionByPattern,
  resolveVersionByAssetDate,
  resolveVersionByModVersion,
  resolveVersionByDirectCopyMarker,
  resolveVersionByNightlyRun,
  getMods,
  testRequirementVersion,
  default: init,
};
