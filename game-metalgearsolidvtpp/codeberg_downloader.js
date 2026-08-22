'use strict';

// Shared Codeberg (Forgejo/Gitea) requirements auto-downloader for Vortex game extensions.
//
// Downloads and installs modding requirements (mod loaders, fixes, tools, or frameworks)
// published as releases on Codeberg. The entry points take an array of requirement objects,
// processed sequentially. Each requirement's current release asset is resolved through the
// Forgejo REST API, downloaded through Vortex's download manager, and imported as a managed
// mod. An "update available" notification is raised when a newer release appears. A
// requirement can instead be pinned to one release (pinVersion + optional pinTag), which
// holds it there and makes update checks skip the API entirely.
//
// Forgejo's API is shaped like GitHub's - /releases/latest, /releases, and
// /releases/tags/{tag} all return the same fields this module reads (tag_name, draft,
// prerelease, assets[]) - so the version-comparison ladder here is the same one
// downloader.js uses. Two differences matter:
//   - A Forgejo release asset carries created_at and NO updated_at. Asset-date tracking
//     therefore reads created_at, where the GitHub module prefers updated_at.
//   - Asset browser_download_url is a plain unauthenticated 200 with no redirect, so the URL
//     goes straight to Vortex's download manager - there is no URL-resolution step and no
//     direct-fetch fallback route, the same way the ModWorkshop module works.
//
// The host is not hardcoded: apiBase defaults to Codeberg but accepts any Forgejo or Gitea
// instance, so a requirement hosted elsewhere needs no second module.
//
// All HTTP goes through util.jsonRequest and Vortex's download manager, so the only
// externals are semver and vortex-api.
//
// Public API: downloadCodeberg, checkForCodebergUpdate (array-based entry points),
// downloadCodebergRequirement, checkForCodebergUpdateRequirement (single-requirement
// variants), isCodebergRequirementInstalled, getLatestCodebergAsset,
// getLatestCodebergVersion.

const semver = require('semver');
const { actions, log, selectors, util } = require('vortex-api');

const DEFAULT_API_BASE = 'https://codeberg.org/api/v1';
// Releases are listed newest-first; this only caps how far back a scan for a matching asset
// reaches when allowPrerelease is set.
const RELEASE_PAGE_LIMIT = 20;
// Mod attribute recording the asset's Forgejo upload time, for trackByAssetDate requirements.
const ASSET_DATE_ATTRIBUTE = 'codebergAssetDate';

// --- requirement helpers --------------------------------------------------

function apiBase(requirement) {
  return String(requirement.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
}

// REST base for one repository, e.g. https://codeberg.org/api/v1/repos/Lyall/MGSVFix.
function repoApiUrl(requirement) {
  return `${apiBase(requirement)}/repos/${requirement.repo}`;
}

// Human releases page for manual downloads, e.g. https://codeberg.org/Lyall/MGSVFix/releases.
// Derived from apiBase so a self-hosted Forgejo instance gets its own host here too.
function pageUrl(requirement) {
  if (requirement.pageUrl) {
    return requirement.pageUrl;
  }
  const webBase = apiBase(requirement).replace(/\/api\/v\d+$/, '');
  return `${webBase}/${requirement.repo}/releases`;
}

// --- version parsing ------------------------------------------------------
// Same ladder downloader.js uses, kept in step with it deliberately: these upstreams tag
// releases the same way whichever forge they publish on.

// Normalize mis-tagged release versions so semver can parse them: replace "-"/"_" with "."
// between digits, i.e. v1-2-3-pre.4 -> v1.2.3-pre.4. The lookahead keeps the trailing digit
// unconsumed so every separator is replaced (a consuming match would skip alternate
// separators, e.g. 6_1_1 -> 6.1_1).
function normalizeVersion(version) {
  if (version === null || version === undefined) {
    return version;
  }
  return String(version).replace(/(\d)[-_](?=\d)/g, '$1.');
}

// Parse a release/asset version into something semver can compare, most-trustworthy
// interpretation first. Returns undefined when nothing parses, so callers keep their own
// '0.0.0' floor.
//   1. Already valid semver -> take it as authored, which keeps a real prerelease identifier
//      alive (3.1.0-6 is a prerelease, not a fourth segment; flattening it would make
//      3.1.0-4/-5/-6 all compare equal and no update would ever be detected).
//   2. Four numeric segments -> the fourth is a build counter, mapped onto a prerelease
//      identifier (5.4.23.5 -> 5.4.23-5), since coerce keeps only three segments. Applied to
//      the NORMALIZED string, so a mis-separated 1-2-3-4 keeps its counter too.
//   3. Anything else -> normalizeVersion + coerce: the mis-tagged-release repair (v1-2-3,
//      6_1_1) and the loose 19.0 -> 19.0.0 widening.
// Note that semver orders X.Y.Z-N BELOW a bare X.Y.Z. An upstream that ships a bare version
// after a numbered one needs trackByAssetDate instead.
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

// --- version pinning ------------------------------------------------------
// An opt-in pin holds a requirement at one specific release instead of tracking the newest
// one. pinVersion is both the compare key and the label shown to the user; pinTag names the
// tag when it differs from the version. Repos are inconsistent about the leading "v" on tags,
// so the other spelling is retried once - most repos therefore need no pinTag at all. With
// pinVersion unset - the default - none of this code runs.
function isPinned(requirement) {
  return (requirement?.pinVersion !== undefined)
    && (requirement.pinVersion !== null)
    && (requirement.pinVersion !== '');
}

// Pin comparison. Exact string match first, so version shapes semver cannot represent compare
// as written (a 4-segment 5.4.23.5, a 2-segment 19.0); semver equality as a fallback for
// versions stamped before the pin was set, which were coerced on the way in.
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

// Installed identity of a pinned requirement, read from the `version` attribute stamped at
// install. Deliberately bypasses the asset-date marker: a pin has to work whichever tracking
// mode the requirement is configured with, and a date could never be compared against a
// version.
function installedPinVersion(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  const mod = Object.values(mods).find(entry => entry?.type === requirement.modType);
  return util.getSafe(mod, ['attributes', 'version'], '');
}

// Whether the installed copy already sits on the pin. True short-circuits the update check
// before any HTTP request is made - a pinned requirement costs nothing against the API.
function isAtPinnedVersion(api, gameId, requirement) {
  if (!isPinned(requirement)) {
    return false;
  }
  return isSamePinVersion(requirement.pinVersion, installedPinVersion(api, gameId, requirement));
}

// --- version resolution ---------------------------------------------------

// Comparable/display version for a fetched release asset. A pinned requirement always resolves
// its pinned release, so the pin itself is the version - reporting anything else would leave
// the stamped version disagreeing with the pin the next check compares against. For
// trackByAssetDate requirements (a rolling tag whose name never changes, only the uploaded
// files), this is the asset's upload time; otherwise the version in the asset filename, and
// failing that the release tag.
function latestAssetVersion(requirement, asset) {
  if (isPinned(requirement)) {
    return String(requirement.pinVersion);
  }
  if (requirement.trackByAssetDate === true) {
    // Forgejo assets have no updated_at - created_at is the only timestamp available.
    return asset.created_at ?? '';
  }
  // Rolling-tag repos carry the version in the asset filename rather than the tag - prefer
  // the assetPattern capture group when there is one. Patterns without a capture group (or
  // non-matching assets) fall through to the tag.
  const match = requirement.assetPattern?.exec(asset.name);
  if (match?.[1]) {
    const fromAsset = toComparableVersion(match[1]);
    if (fromAsset) {
      return fromAsset;
    }
  }
  return toComparableVersion(asset.release?.tag_name) ?? '0.0.0';
}

// Whether the fetched asset is newer than the installed marker. Asset-date mode compares
// upload timestamps; otherwise semver versions. An absent/unparseable installed marker is
// treated as "update available".
function isUpdateAvailable(requirement, asset, installed) {
  if (requirement.trackByAssetDate === true) {
    const latestTime = Date.parse(asset.created_at ?? '');
    if (Number.isNaN(latestTime)) {
      return false;
    }
    const installedTime = Date.parse(installed ?? '');
    return Number.isNaN(installedTime) ? true : latestTime > installedTime;
  }
  // semver.gt throws on an unparseable version, so fall to the 0.0.0 floor, which reads as
  // "update available" like any other missing marker. Both sides go through the same helper:
  // if one kept a prerelease identifier and the other coerced it away, every check would
  // compare 3.1.0-6 against 3.1.0 and report "up to date" forever.
  const installedVersion = toComparableVersion(installed) ?? '0.0.0';
  return semver.gt(latestAssetVersion(requirement, asset), installedVersion);
}

// The marker an installed requirement is compared on, stamped at install time.
function installedMarker(mod, requirement) {
  return (requirement.trackByAssetDate === true)
    ? util.getSafe(mod, ['attributes', ASSET_DATE_ATTRIBUTE], '')
    : util.getSafe(mod, ['attributes', 'version'], '');
}

// --- Codeberg API ---------------------------------------------------------

// Get the current release asset for the requirement (returns null if unreachable or if
// nothing matched). The returned object is the asset with its parent release attached as
// `release`, so callers can read the tag without a second request.
async function getLatestCodebergAsset(api, requirement) {
  const chooseAsset = (release) => {
    const assets = release.assets ?? [];
    if (requirement.assetPattern) {
      const asset = assets.find(entry => requirement.assetPattern.test(entry.name));
      return asset ? { ...asset, release } : undefined;
    }
    const asset = assets[0];
    return asset ? { ...asset, release } : undefined;
  };
  // Pick the releases endpoint based on the requirement:
  //   pinVersion set  -> that exact tag, overriding every option below
  //   releaseTag set  -> that exact release (rolling tag; same role prereleaseTag plays in
  //                      downloader.js)
  //   allowPrerelease -> newest release including pre-releases
  //   default         -> latest stable (the API excludes pre-releases and drafts)
  // Only a pin has a second candidate URL, for the leading-"v" retry.
  const candidateUrls = [];
  const repoUrl = repoApiUrl(requirement);
  if (isPinned(requirement)) {
    if (requirement.releaseTag || (requirement.allowPrerelease === true) || (requirement.trackByAssetDate === true)) {
      log('warn', `${requirement.userFacingName} is pinned to ${requirement.pinVersion} - ignoring allowPrerelease/releaseTag/trackByAssetDate`);
    }
    const pinnedTag = String(requirement.pinTag ?? requirement.pinVersion);
    const altTag = pinnedTag.startsWith('v') ? pinnedTag.slice(1) : `v${pinnedTag}`;
    candidateUrls.push(`${repoUrl}/releases/tags/${pinnedTag}`);
    candidateUrls.push(`${repoUrl}/releases/tags/${altTag}`);
  } else if (requirement.releaseTag) {
    candidateUrls.push(`${repoUrl}/releases/tags/${requirement.releaseTag}`);
  } else if (requirement.allowPrerelease === true) {
    candidateUrls.push(`${repoUrl}/releases?limit=${RELEASE_PAGE_LIMIT}`);
  } else {
    candidateUrls.push(`${repoUrl}/releases/latest`);
  }
  let data;
  let lastError;
  for (const candidate of candidateUrls) {
    try {
      // util.jsonRequest throws on any non-200, so a missing tag and an unreachable host look
      // the same here. Retrying the other "v" spelling is harmless either way, and the last
      // error is reported if both candidates fail.
      data = await util.jsonRequest(candidate);
      lastError = undefined;
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError !== undefined) {
    log('warn', `Could not get latest ${requirement.userFacingName} release from ${pageUrl(requirement)}: ${lastError}`);
    return null;
  }
  // /releases returns an array (newest-first); /releases/latest and /releases/tags/* a single
  // object. Scan on past releases that carry no matching asset rather than giving up on the
  // newest one - a source-only or partially uploaded release would otherwise hide an asset
  // that does exist further down.
  const releases = (Array.isArray(data) ? data : [data]).filter(rel => !!rel && !rel.draft);
  for (const release of releases) {
    const asset = chooseAsset(release);
    if (asset?.browser_download_url) {
      return asset;
    }
  }
  // Nothing matched anywhere. This is what an upstream asset rename looks like, and it is
  // otherwise completely silent - name the pattern and what the release actually ships.
  const available = (releases[0]?.assets ?? []).map(asset => asset.name);
  const reason = requirement.assetPattern
    ? `no asset matched ${requirement.assetPattern}`
    : 'the latest release carries no files';
  log('warn', `No usable Codeberg asset for ${requirement.userFacingName}`, { reason, releasesChecked: releases.length, available });
  api.showErrorNotification('Could not find a download for {{repName}}',
    `${reason}. The latest release ${available.length > 0 ? `contains: ${available.join(', ')}` : 'contains no files'}. `
    + 'The file was most likely renamed by its author, in which case this extension needs an update.',
    { allowReport: false, replace: { repName: requirement.userFacingName } });
  return null;
}

// Get the display version for the given asset (returns null when there is no asset to read).
async function getLatestCodebergVersion(requirement, asset) {
  return asset ? latestAssetVersion(requirement, asset) : null;
}

// --- install / update -----------------------------------------------------

// Requirements with an install currently running, keyed by mod type - guards against
// overlapping runs (e.g. double-clicking the toolbar download action).
const activeInstalls = new Set();

// Mod ids currently carrying this requirement's mod type. Captured before an install so the
// previous version can be disabled once the new one lands - an update installs a second mod
// entry rather than replacing the first, and two enabled copies deploy on top of each other.
function requirementModIds(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  return Object.keys(mods).filter(id => mods[id]?.type === requirement.modType);
}

// Check if the requirement is installed (any mod with the requirement's mod type)
function isCodebergRequirementInstalled(api, gameId, requirement) {
  return requirementModIds(api, gameId, requirement).length > 0;
}

// Download and install a single requirement (with check = false, (re)install even if already installed)
async function downloadCodebergRequirement(api, gameSpec, requirement, check = true) {
  const installed = isCodebergRequirementInstalled(api, gameSpec.game.id, requirement);
  if (installed && check) {
    return;
  }
  if (activeInstalls.has(requirement.modType)) {
    log('debug', `${requirement.userFacingName} install already running - skipping duplicate request`);
    return;
  }
  activeInstalls.add(requirement.modType);
  const NOTIF_ID = `${requirement.modType}-installing`;
  api.sendNotification({ //notification indicating install process
    id: NOTIF_ID,
    message: `Installing ${requirement.userFacingName}`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  //captured before the install: these are the versions being replaced
  const previousModIds = requirementModIds(api, gameSpec.game.id, requirement);
  try { //Download the mod
    const asset = await getLatestCodebergAsset(api, requirement);
    if (!asset) {
      throw new util.ProcessCanceled('No downloadable release asset found');
    }
    const latestVersion = await getLatestCodebergVersion(requirement, asset);
    const dlInfo = {
      game: gameSpec.game.id,
      name: requirement.userFacingName,
    };
    //the asset URL is a plain unauthenticated 200 - it goes straight to the download manager
    const dlId = await util.toPromise(cb =>
      api.events.emit('start-download', [asset.browser_download_url], dlInfo, undefined, cb, undefined, { allowInstall: false }));
    const modId = await util.toPromise(cb =>
      api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
    const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
    const batched = [
      actions.setModsEnabled(api, profileId, [modId], true, {
        allowAutoDeploy: true,
        installed: true,
      }),
      actions.setModType(gameSpec.game.id, modId, requirement.modType), // Set the modType
      actions.setModAttribute(gameSpec.game.id, modId, 'version', latestVersion || requirement.fallbackVersion || ''),
      actions.setModAttribute(gameSpec.game.id, modId, ASSET_DATE_ATTRIBUTE, asset.created_at || ''), // Track the asset upload time for trackByAssetDate update checks
      actions.setModAttribute(gameSpec.game.id, modId, 'source', 'website'),
      actions.setModAttribute(gameSpec.game.id, modId, 'url', pageUrl(requirement)), // Shown as the mod's "Source" link in the mod details (only rendered when source === 'website')
      actions.setModAttribute(gameSpec.game.id, modId, 'customFileName', requirement.userFacingName), // Vortex renders a mod as customFileName || logicalFileName || fileName || name, and the install pipeline stamps fileName with the archive name - without this the mod list shows the raw archive
    ];
    for (const oldModId of previousModIds) { // Disable the version this install replaces, so only one copy deploys
      if (oldModId !== modId) {
        batched.push(actions.setModEnabled(profileId, oldModId, false));
      }
    }
    util.batchDispatch(api.store, batched); // Will dispatch all actions.
  } catch (err) { //Show the user the download page if the download/install process fails
    api.showErrorNotification(`Failed to download/install ${requirement.userFacingName}. You must download manually.`, err);
    util.opn(pageUrl(requirement)).catch(() => null);
  } finally {
    activeInstalls.delete(requirement.modType);
    api.dismissNotification(NOTIF_ID);
  }
}

// Download and install each requirement in the array (sequentially)
async function downloadCodeberg(api, gameSpec, requirements, check = true) {
  for (const requirement of requirements) {
    await downloadCodebergRequirement(api, gameSpec, requirement, check);
  }
}

// Check Codeberg for a newer release for a single requirement and notify the user
async function checkForCodebergUpdateRequirement(api, gameSpec, requirement) {
  // Pinned and already on the pinned release: nothing to check, and deliberately no HTTP
  // request at all - this is what makes a pinned requirement free against the API.
  if (isAtPinnedVersion(api, gameSpec.game.id, requirement)) {
    return;
  }
  if (!isCodebergRequirementInstalled(api, gameSpec.game.id, requirement)) {
    // Missing rather than outdated - install it instead of checking for updates to something
    // that is not there. Requirements the user installs on request (a notification button or
    // a toolbar action) opt out with autoInstall: false.
    if (requirement.autoInstall === false) {
      return;
    }
    log('info', `${requirement.userFacingName} is not installed - installing it`);
    return downloadCodebergRequirement(api, gameSpec, requirement);
  }
  if (isPinned(requirement)) {
    // Installed, but not the pinned release. The wording covers a user who is ahead of the pin
    // as well as behind it - installing it from that state is a deliberate downgrade.
    api.sendNotification({
      id: `${requirement.modType}-update`,
      type: 'warning',
      message: `${requirement.userFacingName} pinned version available (${requirement.pinVersion})`,
      allowSuppress: true,
      actions: [
        {
          title: 'Download',
          action: (dismiss) => {
            downloadCodebergRequirement(api, gameSpec, requirement, false);
            dismiss();
          },
        },
      ],
    });
    return;
  }
  const asset = await getLatestCodebergAsset(api, requirement);
  if (!asset) {
    return; //API unreachable or nothing matched - nothing to compare against
  }
  const state = api.getState();
  const mods = state.persistent.mods[gameSpec.game.id] || {};
  const requirementMods = Object.values(mods).filter(mod => mod?.type === requirement.modType);
  const isOutdated = requirementMods.every(mod => isUpdateAvailable(requirement, asset, installedMarker(mod, requirement)));
  if (!isOutdated) {
    return;
  }
  const latestVersion = await getLatestCodebergVersion(requirement, asset);
  api.sendNotification({
    id: `${requirement.modType}-update`,
    type: 'warning',
    message: `${requirement.userFacingName} update available${latestVersion ? ` (${latestVersion})` : ''}`,
    allowSuppress: true,
    actions: [
      {
        title: 'Download',
        action: (dismiss) => {
          downloadCodebergRequirement(api, gameSpec, requirement, false);
          dismiss();
        },
      },
    ],
  });
}

// Check Codeberg for newer releases for each requirement in the array
async function checkForCodebergUpdate(api, gameSpec, requirements) {
  for (const requirement of requirements) {
    await checkForCodebergUpdateRequirement(api, gameSpec, requirement);
  }
}

module.exports = {
  downloadCodeberg,
  checkForCodebergUpdate,
  downloadCodebergRequirement,
  checkForCodebergUpdateRequirement,
  isCodebergRequirementInstalled,
  getLatestCodebergAsset,
  getLatestCodebergVersion,
};
