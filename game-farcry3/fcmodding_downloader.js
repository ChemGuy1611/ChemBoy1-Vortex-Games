'use strict';

// Shared fcmodding.com requirements auto-downloader for Vortex game extensions.
//
// Downloads and installs modding requirements (mods, tools, or launchers)
// hosted on downloads.fcmodding.com - in practice the Far Cry Mod Installer
// (FCMI), which serves all six Far Cry games from one archive. The entry points
// take an array of requirement objects, processed sequentially. The host has no
// API, but it does publish a stable alias per file: /files/<fileName> answers
// with a 302 to /version/<name>_<build>.zip, so the current build is read
// straight off the redirect target's filename. An "update available"
// notification is raised when a newer build appears.
//
// Builds are timestamps, not versions: YYYYMMDD-HHMM, e.g. 20250412-1300.
// semver.coerce() drops the time half, so two builds released on the same day
// would compare equal. Update detection is therefore a numeric compare of the
// stamp's digits, and this module needs no semver dependency.
//
// The version lookup is a HEAD request, so the redirect is resolved without
// pulling the ~48 MB body. Note that redirect: 'manual' cannot be used to read
// the Location header here: Chromium returns an opaque-redirect filtered
// response (status 0, headers unreadable) - that is fetch-spec behavior and is
// not affected by webSecurity. The final URL is read from response.url after a
// followed redirect instead.
//
// There is deliberately no version pinning. The host culls builds older than
// one release - a pinned build's /version/ URL starts 404ing as soon as two
// newer builds ship - so a pin field would break silently within weeks.
//
// The host serves plain unauthenticated HTTP with no bot protection (verified),
// so - unlike the ModDB counterpart - there is no direct-fetch fallback route:
// the resolved artifact URL goes straight to Vortex's download manager.
//
// All HTTP goes through the renderer's global fetch and Vortex's download
// manager, so the only external is vortex-api.
//
// Public API: downloadFcModding, checkForFcModdingUpdate (array-based entry
// points), downloadFcModdingRequirement, checkForFcModdingUpdateRequirement
// (single-requirement variants), isFcModdingRequirementInstalled,
// getLatestFcModdingVersion, resolveFcModdingDownloadUrl.

const { actions, log, selectors, util } = require('vortex-api');

const BASE_URL = 'https://downloads.fcmodding.com';

// --- requirement helpers --------------------------------------------------

// Landing page for the Mod Installer, used for manual downloads and as the mod's "Source" link.
const DEFAULT_PAGE_URL = `${BASE_URL}/all/mod-installer/`;
// Mod attribute used to track the installed build stamp.
const DEFAULT_VERSION_ATTRIBUTE = 'fcmoddingVersion';
// Build stamp in the redirect target's filename, e.g. FCModInstaller_20250412-1300.zip.
const DEFAULT_VERSION_PATTERN = /_(\d{8}-\d{4})\.zip$/i;
// Same stamp printed on the landing page, e.g. <i>v20250412-1300</i>. Fallback signal.
const DEFAULT_PAGE_VERSION_PATTERN = /<i>\s*v(\d{8}-\d{4})\s*<\/i>/i;

function versionAttribute(requirement) {
  return requirement.versionAttribute || DEFAULT_VERSION_ATTRIBUTE;
}

// Stable alias for the requirement's file - always the current build, whatever it is.
function filesUrl(requirement) {
  return `${BASE_URL}/files/${requirement.fileName}`;
}

function pageUrl(requirement) {
  return requirement.pageUrl || DEFAULT_PAGE_URL;
}

// Concurrency-guard / notification key. modType is always set in practice; the
// fileName fallback keeps a requirement that omits it from colliding with every
// other one.
function guardKey(requirement) {
  return requirement.modType ?? requirement.fileName ?? 'fcmodding';
}

// --- version handling ------------------------------------------------------

//Comparable numeric key for a build stamp: 20250412-1300 -> 202504121300. Twelve digits, well
//inside Number.MAX_SAFE_INTEGER. Returns null for anything carrying no digits at all.
function versionKey(version) {
  const digits = String(version ?? '').replace(/\D/g, '');
  return digits === '' ? null : Number(digits);
}

//Resolve the versioned download URL by following the /files/ alias's redirect (returns null if
//the host is unreachable). HEAD, so the body is never pulled just to learn the build.
async function resolveFcModdingDownloadUrl(requirement) {
  try {
    // redirect: 'manual' would make Location unreadable (opaque-redirect, status 0) - the final
    // URL has to come from a followed redirect, see the header comment.
    const response = await fetch(filesUrl(requirement), { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    return response.url; //final URL after the 302 - its filename carries the build stamp
  } catch (err) {
    log('warn', `Could not resolve the ${requirement.userFacingName} download URL on fcmodding.com: ${err}`);
    return null;
  }
}

//Build stamp embedded in a resolved URL's filename (returns null if it carries none)
function versionFromUrl(requirement, url) {
  if (!url) {
    return null;
  }
  let fileName;
  try {
    fileName = decodeURIComponent(new URL(url).pathname);
  } catch {
    fileName = String(url); //not a parseable URL - match against it as-is
  }
  const match = fileName.match(requirement.versionPattern || DEFAULT_VERSION_PATTERN);
  return match ? match[1] : null;
}

//Build stamp printed on the landing page (returns null if the page is unreachable or changed)
async function getFcModdingPageVersion(requirement) {
  try {
    const response = await fetch(pageUrl(requirement));
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    const html = await response.text();
    const match = html.match(requirement.pageVersionPattern || DEFAULT_PAGE_VERSION_PATTERN);
    return match ? match[1] : null;
  } catch (err) {
    log('warn', `Could not read the ${requirement.userFacingName} version from ${pageUrl(requirement)}: ${err}`);
    return null;
  }
}

//Current build as { url, version }. The URL is the versioned one the redirect points at, or null
//when the host is unreachable. The version is resolved from the redirect filename first, then from
//the landing page as an independent second signal, then from the requirement's fallbackVersion.
async function getLatestFcModdingRelease(requirement) {
  const url = await resolveFcModdingDownloadUrl(requirement);
  let version = versionFromUrl(requirement, url);
  if (version === null) {
    version = await getFcModdingPageVersion(requirement);
  }
  if (version === null) {
    version = requirement.fallbackVersion || null;
  }
  return { url, version };
}

//Get the current build stamp for the requirement (returns null if it can't be resolved)
async function getLatestFcModdingVersion(requirement) {
  return (await getLatestFcModdingRelease(requirement)).version;
}

// --- install / update -----------------------------------------------------

// Requirements with an install currently running, keyed by mod type - guards
// against overlapping runs (e.g. double-clicking the toolbar download action).
const activeInstalls = new Set();

//Mod ids currently carrying this requirement's mod type. Captured before an install so the
//previous build can be disabled once the new one lands - an update installs a second mod
//entry rather than replacing the first, and two enabled copies deploy on top of each other.
function requirementModIds(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  return Object.keys(mods).filter(id => mods[id]?.type === requirement.modType);
}

//Check if the requirement is installed (any mod with the requirement's mod type)
function isFcModdingRequirementInstalled(api, gameId, requirement) {
  return requirementModIds(api, gameId, requirement).length > 0;
}

//Highest build stamp recorded across the installed copies, as a comparable number (null when
//none carries the attribute, which is the case for a copy installed before version tracking)
function installedVersionKey(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  const attr = versionAttribute(requirement);
  const keys = Object.values(mods)
    .filter(mod => mod?.type === requirement.modType)
    .map(mod => versionKey(mod?.attributes?.[attr]))
    .filter(value => value !== null);
  return keys.length > 0 ? Math.max(...keys) : null;
}

//Download and install a single requirement (with check = false, (re)install even if already installed)
async function downloadFcModdingRequirement(api, gameSpec, requirement, check = true) {
  const gameId = gameSpec.game.id;
  const installed = isFcModdingRequirementInstalled(api, gameId, requirement);
  if (installed && check) {
    return;
  }
  const key = guardKey(requirement);
  if (activeInstalls.has(key)) {
    log('debug', `${requirement.userFacingName} install already running - skipping duplicate request`);
    return;
  }
  activeInstalls.add(key);
  const NOTIF_ID = `${key}-installing`;
  api.sendNotification({ //notification indicating install process
    id: NOTIF_ID,
    message: `Installing ${requirement.userFacingName}`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  //captured before the install: these are the builds being replaced
  const previousModIds = requirementModIds(api, gameId, requirement);
  try {
    const latest = await getLatestFcModdingRelease(requirement);
    // The versioned URL is what gets downloaded, so the archive lands as
    // FCModInstaller_<build>.zip and successive builds don't collide in the downloads folder.
    // If the redirect couldn't be resolved the alias is handed over instead - the download
    // manager follows the redirect itself, it just can't name the archive by build.
    const url = latest.url || filesUrl(requirement);
    const dlInfo = {
      game: gameId,
      name: requirement.userFacingName,
    };
    const dlId = await util.toPromise(cb =>
      api.events.emit('start-download', [url], dlInfo, undefined, cb, undefined, { allowInstall: false }));
    const modId = await util.toPromise(cb =>
      api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
    const profileId = selectors.lastActiveProfileForGame(api.getState(), gameId);
    const batched = [
      actions.setModsEnabled(api, profileId, [modId], true, {
        allowAutoDeploy: true,
        installed: true,
      }),
      actions.setModType(gameId, modId, requirement.modType), // Set the modType
      actions.setModAttribute(gameId, modId, 'version', latest.version || ''),
      actions.setModAttribute(gameId, modId, versionAttribute(requirement), latest.version || ''), // Track the installed build for update checks
      actions.setModAttribute(gameId, modId, 'source', 'website'),
      actions.setModAttribute(gameId, modId, 'url', pageUrl(requirement)), // Shown as the mod's "Source" link in the mod details (only rendered when source === 'website')
      actions.setModAttribute(gameId, modId, 'customFileName', requirement.userFacingName), // Vortex renders a mod as customFileName || logicalFileName || fileName || name, and the install pipeline stamps fileName with the archive name - without this the mod list shows the raw archive
    ];
    for (const oldModId of previousModIds) { // Disable the build this install replaces, so only one copy deploys
      if (oldModId !== modId) {
        batched.push(actions.setModEnabled(profileId, oldModId, false));
      }
    }
    util.batchDispatch(api.store, batched); // Will dispatch all actions.
  } catch (err) { //Show the user the download page if the download/install process fails
    api.showErrorNotification(`Failed to download/install ${requirement.userFacingName}. You must download manually.`, err);
    util.opn(pageUrl(requirement)).catch(() => null);
  } finally {
    activeInstalls.delete(key);
    api.dismissNotification(NOTIF_ID);
  }
}

//Download and install each requirement in the array (sequentially)
async function downloadFcModding(api, gameSpec, requirements, check = true) {
  for (const requirement of requirements) {
    await downloadFcModdingRequirement(api, gameSpec, requirement, check);
  }
}

//Check fcmodding.com for a newer build for a single requirement and notify the user
async function checkForFcModdingUpdateRequirement(api, gameSpec, requirement) {
  const gameId = gameSpec.game.id;
  if (!isFcModdingRequirementInstalled(api, gameId, requirement)) {
    // Missing rather than outdated - install it instead of checking for updates to something
    // that is not there. Requirements the user installs manually opt out with autoInstall: false.
    if (requirement.autoInstall === false) {
      return;
    }
    log('info', `${requirement.userFacingName} is not installed - installing it`);
    return downloadFcModdingRequirement(api, gameSpec, requirement);
  }
  const latestVersion = await getLatestFcModdingVersion(requirement);
  const latestKey = versionKey(latestVersion);
  if (latestKey === null) {
    return; //host unreachable and no fallback - nothing to compare against
  }
  // Numeric compare, not semver: the stamp's time half is what distinguishes two builds released
  // on the same day, and semver.coerce() throws it away. A copy installed before version tracking
  // has no attribute and reads as null, so it draws one notification and the resulting install
  // stamps it - self-healing.
  const installedKey = installedVersionKey(api, gameId, requirement);
  if ((installedKey !== null) && (installedKey >= latestKey)) {
    return;
  }
  api.sendNotification({
    id: `${guardKey(requirement)}-update`,
    type: 'warning',
    message: `${requirement.userFacingName} update available (${latestVersion})`,
    allowSuppress: true,
    actions: [
      {
        title: 'Download',
        action: (dismiss) => {
          downloadFcModdingRequirement(api, gameSpec, requirement, false);
          dismiss();
        },
      },
    ],
  });
}

//Check fcmodding.com for newer builds for each requirement in the array
async function checkForFcModdingUpdate(api, gameSpec, requirements) {
  for (const requirement of requirements) {
    await checkForFcModdingUpdateRequirement(api, gameSpec, requirement);
  }
}

module.exports = {
  downloadFcModding,
  checkForFcModdingUpdate,
  downloadFcModdingRequirement,
  checkForFcModdingUpdateRequirement,
  isFcModdingRequirementInstalled,
  getLatestFcModdingVersion,
  resolveFcModdingDownloadUrl,
};
