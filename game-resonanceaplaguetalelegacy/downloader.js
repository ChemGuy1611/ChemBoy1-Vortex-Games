'use strict';

// Shared GitHub/Nexus requirements auto-downloader for Vortex game extensions.
//
// Hand-authored CommonJS module (formerly a webpack bundle). All HTTP goes through
// the native fetch global (Vortex 2 runs extensions in the Electron renderer, so
// requests use the same Chromium network stack the old vendored axios browser build
// did). Externals are vortex-api and node's path/fs/stream, plus semver.
//
// Five opt-in requirement modes sit on top of the default "install and track the latest
// release" behavior: pinVersion holds a requirement at one release and makes its update check
// skip the network entirely, directCopyPath fetches a naked (non-archive) release asset
// straight to a file path instead of installing it as a mod, directCopyAsMod puts that same
// naked asset into a managed mod's staging folder so Vortex deploys it like any other mod,
// nightlyUrl tracks a GitHub Actions CI artifact (which is not a release at all) by its
// workflow run number, and nexusModId points a requirement at a Nexus Mods page instead of a
// GitHub repository.
//
// Public API: download, getLatestGithubReleaseAsset, getLatestNightlyArtifact,
// getLatestNexusFile, doDownload, findModByFile, findDownloadIdByFile, walkPath,
// resolveVersionByPattern, resolveVersionByAssetDate, resolveVersionByModVersion,
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

// Parse a release/asset version into something semver can compare, most-trustworthy
// interpretation first. Returns undefined when nothing parses, so callers keep their own
// '0.0.0' floor.
//   1. Already valid semver -> take it as authored. This is what keeps a real prerelease
//      identifier alive: some UE4SS forks tag 3.1.0-6, where -6 is a prerelease, not a fourth
//      segment, and normalizing it first would flatten it to 3.1.0.6 and then coerce away to
//      3.1.0 - so 3.1.0-4/-5/-6 would all compare equal and no update would ever be detected.
//   2. Four numeric segments -> the fourth is a build counter, so map it onto a prerelease
//      identifier (BepInEx's 5.4.23.5 -> 5.4.23-5). coerce keeps only three segments, so every
//      5.4.23.x bump used to compare equal too. Applied to the NORMALIZED string, so a
//      mis-separated 1-2-3-4 reaches this rule as 1.2.3.4 and keeps its counter as well.
//   3. Anything else -> normalizeVersion + coerce, unchanged: the mis-tagged-release repair
//      (v1-2-3, 6_1_1) and the loose 19.0 -> 19.0.0 widening both still happen here.
// Note that semver orders X.Y.Z-N BELOW a bare X.Y.Z. That is correct within each of these
// upstreams (5.4.23-6 > 5.4.23-5, 3.1.0-6 > 3.1.0-5), which is the only ordering they produce -
// neither ships a bare version after a numbered one. An upstream that DOES needs
// trackByAssetDate instead.
function toComparableVersion(version) {
  if (version === null || version === undefined) {
    return undefined;
  }
  const raw = String(version).trim();
  const strict = semver.valid(raw);
  if (strict !== null) {
    return strict;
  }
  const normalized = normalizeVersion(raw);
  const fourSegment = /^v?(\d+\.\d+\.\d+)\.(\d+)$/.exec(normalized);
  if (fourSegment !== null) {
    // re-validated rather than trusted: a segment with a leading zero (2026.02.01.0) is not a
    // legal semver identifier, and those must keep falling through to the coerce branch.
    const mapped = semver.valid(`${fourSegment[1]}-${fourSegment[2]}`);
    if (mapped !== null) {
      return mapped;
    }
  }
  return semver.coerce(normalized)?.version;
}

// Whether a requirement tracks a GitHub Actions CI artifact instead of a release. Setting
// nightlyUrl is what switches the mode on; see the nightly section further down.
function isNightly(requirement) {
  return (requirement?.nightlyUrl !== undefined)
    && (requirement.nightlyUrl !== null)
    && (requirement.nightlyUrl !== '');
}

// Whether a requirement is hosted on a Nexus Mods page instead of a GitHub repository. Setting
// nexusModId is what switches the mode on; see the Nexus section further down. githubUrl is not
// read at all in this mode.
function isNexusRequirement(requirement) {
  return (requirement?.nexusModId !== undefined) && (requirement.nexusModId !== null);
}

// Loose direct-copy mode: the asset is written straight to directCopyPath and never becomes a
// mod. The managed-mod mode re-uses the same field as its legacy pointer (the loose file left
// behind by an older build, cleaned up once), so it must be excluded here - every behavioral
// test for loose mode goes through this helper rather than reading the field directly.
function isDirectCopy(requirement) {
  return (requirement?.directCopyPath !== undefined) && (requirement.directCopyAsMod !== true);
}

// Managed-mod direct-copy mode: a naked asset placed into a mod's staging folder, where Vortex
// deploys it like any other mod. See the direct copy section further down.
function isDirectCopyAsMod(requirement) {
  return requirement?.directCopyAsMod === true;
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
  if (isDirectCopy(requirement)) {
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
  const coercedPin = toComparableVersion(pinned);
  const coercedCurrent = toComparableVersion(current);
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
    const fromAsset = toComparableVersion(match[1]);
    if (fromAsset) {
      return fromAsset;
    }
  }
  return toComparableVersion(latest.release.tag_name) ?? '0.0.0';
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
  // resolveVersion may legitimately return - fall to the 0.0.0 floor instead, which reads as
  // "update available" like any other missing marker. Parsed through the same helper as the
  // latest side: if one side kept a prerelease identifier and the other coerced it away, every
  // check would compare 3.1.0-6 against 3.1.0 and report "up to date" forever.
  const installedVersion = toComparableVersion(installed) ?? '0.0.0';
  return semver.gt(latestAssetVersion(requirement, latest), installedVersion);
}

// Human-facing home page of the requirement, used for the installed mod's "Source" link. For a
// Nexus requirement that is the mod page; otherwise requirement.githubUrl, which is the REST API
// base (https://api.github.com/repos/{owner}/{repo}) the release endpoints are built from,
// rewritten to the repo page. api is only read to resolve the default Nexus domain.
function repoPageUrl(requirement, api) {
  if (isNexusRequirement(requirement)) {
    return nexusPageUrl(nexusDomain(api, requirement), requirement.nexusModId);
  }
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
        // Loose direct-copy requirements (naked, non-archive release assets) bypass the mod
        // pipeline entirely - findMod/findDownloadId/modType/assemblyFileName are not read for
        // them. Managed-mod direct copies deliberately do NOT branch here: they run the ordinary
        // flow below and swap only the install mechanism, which is what keeps pinning, the update
        // comparison and the up-to-date report working for them.
        if (isDirectCopy(req)) {
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
            // Every installed copy is disabled, not only the one findMod returned: a
            // version-bearing archive name installs each update under its own mod id, so past
            // versions pile up and any one of them left enabled keeps deploying over the new
            // one. installDownload re-enables the incoming mod immediately afterwards, so a
            // same-mod-id replacement still ends up enabled.
            const outgoing = (req.modType && req.assemblyFileName)
              ? await findModsByFile(api, req.modType, req.assemblyFileName)
              : [mod];
            for (const stale of outgoing) {
              api.store.dispatch(actions.setModEnabled(profileId, stale.id, false));
            }
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
        // A naked asset has no archive to reuse at all (the module never creates a Downloads-tab
        // entry for one), so the managed-mod mode is excluded here too. Nexus requirements are
        // excluded for the nightly reason: reusing a stale archive is exactly what the page's
        // file listing exists to prevent, and re-requesting a file already downloaded costs
        // nothing (Vortex reuses the local copy itself).
        if (!versionMismatch && !force && dlId && !isNightly(req) && !isDirectCopyAsMod(req)
            && !isNexusRequirement(req)) {
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
            pageUrl: repoPageUrl(req, api),
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
          // No usable asset in the release - getLatestGithubReleaseAsset / getLatestNexusFile
          // has already told the user why. Move on to the next requirement rather than throwing
          // on asset.name.
          continue;
        }
        // Naked asset, managed as a mod: no archive exists, so the file goes into the mod's
        // staging folder directly rather than through import-downloads -> start-install-download.
        if (isDirectCopyAsMod(req)) {
          if (await installAssetAsMod(api, req, asset, assetFetcher(api, req, asset))) {
            installedAny = true;
          }
          continue;
        }
        // A Nexus archive is already in the download folder once Vortex's pipeline has fetched
        // it, so it skips the temp-file + import-downloads round trip and installs from there.
        if (isNexusRequirement(req)) {
          await installDownload(api, await downloadNexusFile(api, req, asset), {
            name: req.userFacingName,
            assetDate: asset.updated_at,
            pageUrl: repoPageUrl(req, api),
            version: latestAssetVersion(req, asset),
            modType: req.modType,
          });
          installedAny = true;
          continue;
        }
        const tempPath = path.join(util.getVortexPath('temp'), asset.name);
        try {
          await doDownload(asset.browser_download_url, tempPath);
          await importAndInstall(api, tempPath, {
            name: req.userFacingName,
            assetDate: asset.updated_at,
            pageUrl: repoPageUrl(req, api),
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

// --- Nexus-hosted requirements --------------------------------------------
// A requirement that sets nexusModId lives on a Nexus Mods page instead of in a GitHub
// repository. githubUrl is not read at all in this mode - the page id (nexusModId) and the game
// domain the page sits under (nexusDomain) replace it.
//
// Two things make this more than a URL swap:
//
//   THE DOMAIN IS ITS OWN FIELD. The tool a game needs is routinely published on a different
//   game's page - HFW_MM.exe lives under horizonforbiddenwest while also being a requirement of
//   horizonzerodawnremastered and deathstranding2onthebeach - so the domain cannot be taken from
//   the game being managed. It falls back to the active game only when nexusDomain is absent.
//
//   THE DOWNLOAD IS VORTEX'S, NOT OURS. A Nexus download link is short-lived, account-bound and
//   ad-gated for free accounts, so doDownload cannot fetch one: the file is requested through an
//   nxm:// URL handed to Vortex's own 'start-download', whose nxm protocol resolver is what
//   routes a free account through the direct-download check and the download dialog.
//   api.ext.nexusDownload is deliberately NOT used - it rejects every non-premium account
//   outright ("Only available to premium users") and reports failure by resolving undefined.
//
// The listing is shaped into a release asset so resolveLatestAsset, latestAssetVersion,
// isUpdateAvailable and installAssetAsMod can treat it like one. browser_download_url is
// deliberately absent: there is no fetchable URL to put in it.
//
// The installed mod is stamped source: 'website', NOT source: 'nexus'. A Nexus-sourced mod is
// picked up by Vortex's own update check, which would then own the notification, the version
// column and the update button for a mod this module installs and replaces itself - two update
// mechanisms on one mod - and it is also the shape that gets a wrong modId stamped onto a file
// whose md5 happens to match something else on the site.

// Nexus game domain the requirement's page sits under. The fallback is only right for a
// requirement hosted on the page of the game being managed; every cross-game one sets the field.
function nexusDomain(api, requirement) {
  return requirement.nexusDomain ?? selectors.activeGameId(api.getState());
}

function nexusPageUrl(domain, modId) {
  return `https://www.nexusmods.com/${domain}/mods/${modId}`;
}

// Failure on this route sends the user to the page as well as notifying: an account that cannot
// auto-download, or a page whose files were reorganised, still leaves the file one click away.
function reportNexusFailure(api, requirement, domain, error) {
  api.showErrorNotification(`Failed to download ${requirement.userFacingName}`, error, { allowReport: false });
  util.opn(`${nexusPageUrl(domain, requirement.nexusModId)}/files/?tab=files`).catch(() => null);
}

// Name filters for a page publishing several current main files. Both plain-string fields are
// substring tests, matched case-insensitively against file_name AND name: the marker separating
// a release build from a dev build sits in whichever of the two the author bothered to set, and
// an adopter should not have to know which. nexusFilePattern stays available for a page whose
// naming needs a real expression. All three are AND-ed, and exclude wins over match on a file
// carrying both strings - installing the wrong build is worse than installing nothing.
function matchesNexusFileName(requirement, file) {
  const names = [file.file_name, file.name]
    .filter(name => typeof name === 'string')
    .map(name => name.toLowerCase());
  if ((requirement.nexusFileExclude !== undefined)
      && names.some(name => name.includes(String(requirement.nexusFileExclude).toLowerCase()))) {
    return false;
  }
  if ((requirement.nexusFileMatch !== undefined)
      && !names.some(name => name.includes(String(requirement.nexusFileMatch).toLowerCase()))) {
    return false;
  }
  if (requirement.nexusFilePattern === undefined) {
    return true;
  }
  // test() and exec() are both stateful on a /g-flagged RegExp, so a pattern authored with /g
  // would carry lastIndex from one file to the next inside .filter() and drop matches at random.
  requirement.nexusFilePattern.lastIndex = 0;
  return names.some(name => requirement.nexusFilePattern.test(name));
}

// The newest allowed main file of a Nexus page, shaped like a release asset. The filters run
// before the newest-first sort and before the pin lookup, so "newest" always means "newest of
// what is allowed" and a pin can never resolve to a file the filters exclude.
async function getLatestNexusFile(api, requirement) {
  const domain = nexusDomain(api, requirement);
  // Reach-the-file fallback for an unreadable listing: a requirement naming a file id can still
  // be installed. It carries no version, so it also reports no update - which is correct, since
  // nothing is known about what else the page offers.
  const configuredFileAsset = () => {
    if (requirement.nexusFileId === undefined) {
      return undefined;
    }
    log('warn', `Could not read the Nexus file listing for ${requirement.userFacingName} - falling back to the configured file id`,
      { domain, modId: requirement.nexusModId, fileId: requirement.nexusFileId });
    return {
      name: requirement.archiveFileName,
      nexusFileId: requirement.nexusFileId,
      nexusModId: requirement.nexusModId,
      nexusDomain: domain,
      release: { tag_name: '' },
    };
  };
  if (api.ext?.nexusGetModFiles === undefined) {
    const fallback = configuredFileAsset();
    if (fallback !== undefined) {
      return fallback;
    }
    const err = new Error('Nexus integration is unavailable in this Vortex build');
    reportNexusFailure(api, requirement, domain, err);
    return Promise.reject(new util.ProcessCanceled(err.message));
  }
  let files;
  try {
    files = await api.ext.nexusGetModFiles(domain, requirement.nexusModId);
  } catch (error) {
    const fallback = configuredFileAsset();
    if (fallback !== undefined) {
      return fallback;
    }
    reportNexusFailure(api, requirement, domain, error);
    return null;
  }
  const categoryId = requirement.nexusCategoryId ?? 1;
  const candidates = (files ?? [])
    .filter(file => file.category_id === categoryId)
    .filter(file => matchesNexusFileName(requirement, file))
    // uploaded_timestamp is the numeric upload time. uploaded_time is an ISO string, and
    // parseInt-ing that yields the year - which is what made the hand-rolled copies of this
    // sort almost a no-op.
    .sort((lhs, rhs) => Number(rhs.uploaded_timestamp ?? 0) - Number(lhs.uploaded_timestamp ?? 0));
  const file = isPinned(requirement)
    ? (candidates.find(entry => isSamePinVersion(requirement.pinVersion, entry.version))
      ?? candidates.find(entry => entry.file_id === requirement.nexusFileId))
    : candidates[0];
  if (file === undefined) {
    // Filters that match nothing and a page that stopped publishing look identical from here,
    // and both are otherwise completely silent - name what was asked for and what is on offer.
    const applied = [`main files (category ${categoryId})`];
    if (requirement.nexusFileExclude !== undefined) {
      applied.push(`name not containing "${requirement.nexusFileExclude}"`);
    }
    if (requirement.nexusFileMatch !== undefined) {
      applied.push(`name containing "${requirement.nexusFileMatch}"`);
    }
    if (requirement.nexusFilePattern !== undefined) {
      applied.push(`name matching ${requirement.nexusFilePattern}`);
    }
    if (isPinned(requirement)) {
      applied.push(`version "${requirement.pinVersion}"`);
    }
    const available = (files ?? []).map(entry => entry.file_name);
    log('warn', `No usable Nexus file for ${requirement.userFacingName}`,
      { domain, modId: requirement.nexusModId, applied, available });
    api.showErrorNotification('Could not find a download for {{repName}}',
      `No file on the mod page matched: ${applied.join('; ')}. `
      + `${available.length > 0 ? `The page currently offers: ${available.join(', ')}` : 'The page offers no files'}. `
      + 'The files were most likely renamed or recategorised by their author, in which case this extension needs an update.',
      { allowReport: false, replace: { repName: requirement.userFacingName } });
    return null;
  }
  return {
    name: file.file_name,
    nexusFileId: file.file_id,
    nexusModId: requirement.nexusModId,
    nexusDomain: domain,
    uploadedTimestamp: file.uploaded_timestamp,
    updated_at: file.uploaded_time,
    release: { tag_name: file.version ?? file.mod_version ?? '' },
  };
}

// Start the download through Vortex's own pipeline and resolve to its download id. The
// 'start-download' tuple shape is load-bearing - Vortex zod-validates it and a mismatch is a
// silent no-op rather than an error - and its callback fires once the file is on disk and its
// final name has been recorded in state. allowInstall: false keeps the archive out of the
// auto-install path; this module decides what happens to it.
async function downloadNexusFile(api, requirement, asset) {
  if (api.ext?.ensureLoggedIn !== undefined) {
    await api.ext.ensureLoggedIn();
  }
  const nxmUrl = `nxm://${asset.nexusDomain}/mods/${asset.nexusModId}/files/${asset.nexusFileId}`;
  const dlInfo = { game: asset.nexusDomain, name: requirement.userFacingName };
  const dlId = await util.toPromise(cb =>
    api.events.emit('start-download', [nxmUrl], dlInfo, undefined, cb, undefined, { allowInstall: false }));
  if (!dlId) {
    // A dismissed free-user download dialog and a link refused for this account both land here.
    // Neither is an error worth a stack trace; download() reports the skip.
    throw new util.ProcessCanceled(`${requirement.userFacingName} was not downloaded`);
  }
  return dlId;
}

// Local path of a finished download, read from state rather than by scanning the download
// folder: the file belongs to whichever game its nxm URL named, which for a cross-game
// requirement is NOT the game being managed. Vortex resolves the same folder the same way, from
// the download's own first game id.
function downloadLocalPath(api, dlId) {
  const state = api.getState();
  const dl = util.getSafe(state, ['persistent', 'downloads', 'files', dlId], undefined);
  if (dl?.localPath === undefined) {
    return undefined;
  }
  const owner = downloadGames(dl)[0] ?? selectors.activeGameId(state);
  return path.join(selectors.downloadPathForGame(state, owner), dl.localPath);
}

// fetchAsset implementation for the naked-asset route: Vortex downloads the file, we copy it
// into the mod's staging folder and then drop the download entry. The copy cannot be deferred -
// a non-archive file in the download folder is deleted the next time the download path is
// initialised (removeInvalidFileExts culls everything 7-Zip cannot open, and .exe is not in
// Vortex's known-archive set), which would leave a Downloads tab row pointing at nothing.
async function fetchNexusAsset(api, requirement, asset, destination) {
  const dlId = await downloadNexusFile(api, requirement, asset);
  const source = downloadLocalPath(api, dlId);
  if (source === undefined) {
    throw new util.ProcessCanceled(`${requirement.userFacingName} download produced no file`);
  }
  await fs.copyAsync(source, destination, { overwrite: true });
  // Guarded: the event exists in every current Vortex version, but failing to tidy up the row
  // must not fail an install that already succeeded.
  await util.toPromise(cb => api.events.emit('remove-download', dlId, cb)).catch(() => null);
}

// How the bytes of a resolved asset are obtained. GitHub and nightly assets carry a fetchable
// URL; a Nexus file goes through Vortex's download pipeline instead.
function assetFetcher(api, requirement, asset) {
  return isNexusRequirement(requirement)
    ? (destination) => fetchNexusAsset(api, requirement, asset, destination)
    : (destination) => doDownload(asset.browser_download_url, destination);
}

// Single entry point for "what is upstream offering right now" - releases by default, the
// Actions run listing for a nightly requirement, the mod page's file listing for a Nexus one.
async function resolveLatestAsset(api, requirement) {
  if (isNightly(requirement)) {
    return getLatestNightlyArtifact(api, requirement);
  }
  if (isNexusRequirement(requirement)) {
    return getLatestNexusFile(api, requirement);
  }
  return getLatestGithubReleaseAsset(api, requirement);
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
// can open whatever was downloaded, so those assets cannot travel through it at all. There are
// two ways to handle one:
//
//   LOOSE COPY (directCopyPath) - the asset is fetched straight to that path in the game folder
//   and is never registered as a Vortex mod, so it has no mod list row, cannot be enabled,
//   disabled or removed through Vortex, and records its installed version in a sidecar marker
//   file beside itself.
//
//   MANAGED MOD (directCopyAsMod: true, with modType) - the asset lands in the staging folder of
//   a mod this module creates, and Vortex deploys it to wherever that mod type points. The mod
//   list row, the version column, enable/disable, remove, conflict handling and the update stamp
//   are then all the ordinary managed-mod paths. See installAssetAsMod below.
//
// ADOPTERS: directCopyPath is the one requirement field that depends on the discovered game
// path, and extensions build their requirement arrays at module load - when GAME_PATH is still
// ''. Reassign the field inside setup(), after GAME_PATH is set, or the baked-in path stays
// relative and never resolves. In managed-mod mode the field is only the legacy pointer (the
// loose file an older build wrote, deleted once on migration); the deploy destination comes from
// modType, which is not subject to that timing trap.

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
  return toComparableVersion(marker.version) ?? '0.0.0';
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

// Mod id / staging folder name for a managed direct-copy requirement. Windows-invalid characters
// are replaced because the id is also a folder name (the same idiom the Witcher 3 and Stardew
// Valley synthetic mods use).
function directCopyModName(requirement) {
  return requirement.userFacingName.replace(/[\\/:*?"<>|]/g, '_');
}

// Promisified create-mod. Vortex's handler dispatches addMod and creates the staging folder;
// both are needed before anything can be written into it.
async function createRequirementMod(api, gameId, mod) {
  return new Promise((resolve, reject) => {
    api.events.emit('create-mod', gameId, mod, (err) => (err ? reject(err) : resolve()));
  });
}

// The loose copy left behind by directCopyPath mode, removed once so deployment does not find a
// foreign file at the target and back it up as <file>.vortex_backup. Only ever called when no mod
// of the requirement's type exists: when one does, the file at that path is a link Vortex itself
// deployed.
async function removeLegacyDirectCopy(requirement) {
  if (requirement.directCopyPath === undefined) {
    return;
  }
  for (const target of [requirement.directCopyPath, directCopyMarkerPath(requirement)]) {
    try {
      await fs.removeAsync(target);
      log('info', `Removed legacy direct copy ${target} - now managed as a mod`);
    } catch {
      //never installed in the old mode, or already gone - both fine
    }
  }
}

// Name the asset is written under in the staging folder, and therefore the name it deploys as.
// The asset's own name by default; installFileName overrides it for a source whose file name is
// not the name the game expects - a Nexus upload carries the mod and file ids in its name
// ("HFW Mod Manager-137-1-2-0-1234567890.exe"), and the tool only works as HFW_MM.exe.
function stagedAssetName(requirement, asset) {
  return requirement.installFileName ?? asset.name;
}

// Install a naked asset as a managed mod: the file lands in the mod's staging folder and Vortex
// deploys it to wherever the requirement's mod type points. Returns false when an unmanaged mod
// of the same type is already installed (the user's own copy - never overwritten).
// fetchAsset(destination) writes the bytes; it is the one thing that differs between sources
// (see assetFetcher), and everything around it - the mod creation, the ownership marker, the
// staging clear, the attribute stamp, the mods-enabled emit - is shared.
async function installAssetAsMod(api, requirement, asset, fetchAsset) {
  const state = api.getState();
  const gameId = selectors.activeGameId(state);
  const profileId = selectors.lastActiveProfileForGame(state, gameId);
  const stagingRoot = selectors.installPathForGame(state, gameId);
  const existing = (await findModByFile(api, requirement.modType, requirement.assemblyFileName))
    ?? getMods(api, requirement.modType)[0];
  // A user can install an archived build of the same loader by hand and the extension's own
  // installer types it the same way, so ownership is decided by the marker this module stamps,
  // not by the mod type. Someone else's mod may hold a readme, a config or several files -
  // leave it completely alone and treat the requirement as installed.
  if ((existing !== undefined) && (existing.attributes?.directCopyAsMod !== true)) {
    log('info', `${requirement.userFacingName} is installed as an ordinary mod - leaving it alone`);
    return false;
  }
  const modId = existing?.id ?? directCopyModName(requirement);
  const modPath = path.join(stagingRoot, existing?.installationPath ?? modId);
  if (existing === undefined) {
    await removeLegacyDirectCopy(requirement);
    await createRequirementMod(api, gameId, {
      id: modId,
      state: 'installed',
      installationPath: modId,
      type: requirement.modType,
      attributes: {
        name: requirement.userFacingName,
        customFileName: requirement.userFacingName,
        description: 'This is a modding requirement for this game - leave it enabled.',
        installTime: new Date(),
        directCopyAsMod: true,
      },
    });
  } else {
    // Our own folder, and it only ever holds the asset - clear it so an asset whose name carries
    // the version does not leave the previous release behind, still deploying.
    for (const entry of await fs.readdirAsync(modPath).catch(() => [])) {
      await fs.removeAsync(path.join(modPath, entry)).catch(() => null);
    }
  }
  await fs.ensureDirWritableAsync(modPath);
  await fetchAsset(path.join(modPath, stagedAssetName(requirement, asset)));
  const attributes = {
    installTime: new Date(),
    name: requirement.userFacingName,
    customFileName: requirement.userFacingName,
    version: latestAssetVersion(requirement, asset),
    directCopyAsMod: true,
    source: 'website',
    url: repoPageUrl(requirement, api),
  };
  if (asset.updated_at !== undefined) {
    attributes.githubAssetDate = asset.updated_at;
  }
  // Which page and file this came from, recorded for diagnostics only. Deliberately NOT the
  // modId/fileId pair Vortex reads, which only means anything alongside source: 'nexus' - see
  // the Nexus section for why that source is not used here.
  if (isNexusRequirement(requirement)) {
    attributes.nexusModId = asset.nexusModId;
    attributes.nexusFileId = asset.nexusFileId;
  }
  util.batchDispatch(api.store, [
    actions.setModAttributes(gameId, modId, attributes),
    actions.setModType(gameId, modId, requirement.modType),
    actions.setModEnabled(profileId, modId, true),
  ]);
  // Enabling through a dispatch alone leaves Vortex unaware: onModsEnabled is what schedules the
  // deployment (or raises the "deployment necessary" banner when auto-deploy is off).
  api.events.emit('mods-enabled', [modId], true, gameId);
  return true;
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

// Every installed copy of the requirement, not just the first. A requirement whose release
// asset carries the version in its file name (shadps4-win64-sdl-0.18.0.zip) installs under a
// new mod id on every update, so the staging folder accumulates one mod per version - all of
// them carrying the requirement's mod type and its assembly file.
async function findModsByFile(api, modType, fileName) {
  const state = api.getState();
  const gameId = selectors.activeGameId(state);
  const mods = getMods(api, modType);
  const installationPath = selectors.installPathForGame(api.getState(), gameId);
  // case-insensitive match: maintainers may change assemblyFileName capitalization,
  // and a case-sensitive compare would miss the installed file -> re-download loop.
  const needle = fileName.toLowerCase();
  const matches = [];
  for (const mod of mods) {
    const modPath = path.join(installationPath, mod.installationPath);
    const files = await walkPath(modPath);
    if (files.find(file => file.filePath.toLowerCase().endsWith(needle))) {
      matches.push(mod);
    }
  }
  return matches;
}

async function findModByFile(api, modType, fileName) {
  const state = api.getState();
  const gameId = selectors.activeGameId(state);
  const matches = await findModsByFile(api, modType, fileName);
  // Which copy is "the installed one" matters: resolveVersionByModVersion and friends read
  // their version marker straight off this mod, and download() disables it as the outgoing
  // version. Mods are iterated in the order the state object holds them, which is neither the
  // install order nor version order - so with several copies present, returning the first hit
  // picks an arbitrary (in practice the lexicographically lowest, i.e. oldest) one. The copy
  // enabled in the active profile is the one actually in use; fall back to the first match
  // when none is enabled, which is what a single-copy install always yields anyway.
  const profileId = selectors.lastActiveProfileForGame(state, gameId);
  const modState = util.getSafe(state, ['persistent', 'profiles', profileId, 'modState'], {});
  return matches.find(mod => util.getSafe(modState, [mod.id, 'enabled'], false)) ?? matches[0];
}

// Compatible game ids recorded on a download. IDownload.game is an array in current Vortex,
// but entries written by much older versions can still hold a bare string, and a download
// that never got a game assigned has none at all.
function downloadGames(dl) {
  if (Array.isArray(dl.game)) {
    return dl.game;
  }
  return dl.game !== undefined ? [dl.game] : [];
}

// Whether a download belongs to the game currently being managed. Vortex stores downloads in a
// per-game folder and the Downloads tab only lists the ones compatible with the active game, so
// anything this returns false for is not "our" archive even when the file name matches.
function isDownloadForGame(dl, gameId) {
  return downloadGames(dl).includes(gameId);
}

// Downloads are scanned only within the active game. Requirement archives routinely carry
// generic names - Release.zip alone is used by a dozen extensions here - so a game-blind
// basename match would return another game's archive and install it through the download
// shortcut in download(), leaving the requirement holding a completely unrelated mod.
function findDownloadIdByFile(api, fileName) {
  const state = api.getState();
  const gameId = selectors.activeGameId(state);
  const downloads = util.getSafe(state, ['persistent', 'downloads', 'files'], {});
  return Object.entries(downloads).reduce((prev, [dlId, dl]) => {
    // localPath is optional on IDownload - entries still initialising, redirects and failed
    // downloads have none, and path.basename throws on undefined.
    if (!dl?.localPath || !isDownloadForGame(dl, gameId)) {
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
  const gameId = selectors.activeGameId(state);
  const files = util.getSafe(state, ['persistent', 'downloads', 'files'], []);
  const latestVersion = Object.values(files).reduce((prev, file) => {
    //not every download entry has a local file yet, and archives belonging to another game say
    //nothing about the version installed for this one
    if (!file?.localPath || !isDownloadForGame(file, gameId)) {
      return prev;
    }
    const match = requirement.fileArchivePattern.exec(file.localPath);
    // parsed so an unparseable capture can't make semver.gt throw
    const version = match?.[1] ? toComparableVersion(match[1]) : undefined;
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
  return toComparableVersion(stamped) ?? '0.0.0';
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
  const missing = isDirectCopy(requirement)
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
  getLatestNexusFile,
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
