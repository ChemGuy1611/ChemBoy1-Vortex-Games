'use strict';

// Shared Thunderstore requirements auto-downloader for Vortex game extensions.
//
// Downloads and installs modding requirements (mod loaders, tools, or
// frameworks) hosted on Thunderstore. The entry points take an array of
// requirement objects, processed sequentially. Each requirement's current
// version is resolved through the Thunderstore API, with an optional hardcoded
// fallback version for when the API is unreachable. An "update available"
// notification is raised when a newer version is published.
//
// Thunderstore versions are plain semver strings and every version has a
// predictable direct download URL
// (thunderstore.io/package/download/{namespace}/{name}/{version}/, which
// redirects to the CDN zip), so - unlike the GitHub, GameBanana, and ModDB
// counterparts - there is no archive-name pattern to write, no version-resolve
// strategy to pick, and no renderer-fetch route. A hardcoded fallback version
// is enough to build a working URL on its own. The API needs no key and blocks
// no clients, so requests work from either Electron process.
//
// All HTTP goes through util.jsonRequest and Vortex's download manager, so the
// only externals are semver and vortex-api.
//
// Public API: downloadThunderstore, checkForThunderstoreUpdate (array-based
// entry points), downloadThunderstoreRequirement,
// checkForThunderstoreUpdateRequirement (single-requirement variants),
// isThunderstoreRequirementInstalled, getLatestThunderstorePackage,
// getLatestThunderstoreVersion, getThunderstoreDependencies.

const semver = require('semver');
const { actions, log, selectors, util } = require('vortex-api');

const API_BASE = 'https://thunderstore.io';

// --- requirement helpers --------------------------------------------------

// Mod attribute used to track the installed Thunderstore version. A dedicated
// attribute is used rather than the standard 'version' one because Vortex's md5
// meta lookup can overwrite 'version' with data from an unrelated Nexus match.
const DEFAULT_VERSION_ATTRIBUTE = 'thunderstoreVersion';

function versionAttribute(requirement) {
  return requirement.versionAttribute || DEFAULT_VERSION_ATTRIBUTE;
}

// Thunderstore package page for manual downloads. The community-scoped page is
// preferred when the community is known; the bare package page works either way.
function pageUrl(requirement) {
  if (requirement.pageUrl) {
    return requirement.pageUrl;
  }
  return requirement.tsCommunity
    ? `${API_BASE}/c/${requirement.tsCommunity}/p/${requirement.tsNamespace}/${requirement.tsName}/`
    : `${API_BASE}/package/${requirement.tsNamespace}/${requirement.tsName}/`;
}

// Community listing endpoint - carries the version, a ready-made download URL,
// deprecation state, and resolved dependencies in one call.
function listingUrl(requirement) {
  return `${API_BASE}/api/cyberstorm/listing/${requirement.tsCommunity}/${requirement.tsNamespace}/${requirement.tsName}/`;
}

// Community-independent fallback - works for packages not listed in the
// configured community, and for requirements that set no community at all.
function packageUrl(requirement) {
  return `${API_BASE}/api/experimental/package/${requirement.tsNamespace}/${requirement.tsName}/`;
}

// Direct download for any version - no API call needed once the version is known.
function downloadUrl(requirement, version) {
  return `${API_BASE}/package/download/${requirement.tsNamespace}/${requirement.tsName}/${version}/`;
}

// The archive Thunderstore serves for a version, e.g. SGG_Modding-ENVY-1.2.0.zip.
function archiveName(requirement, version) {
  return `${requirement.tsNamespace}-${requirement.tsName}-${version}.zip`;
}

// Versions are semver by convention but authors still ship "v"-prefixed and
// short forms, so coerce before comparing.
function normalizeVersion(raw) {
  const coerced = semver.coerce(String(raw || '').replace(/^v/i, ''));
  return coerced ? coerced.version : null;
}

// The two endpoints describe dependencies differently - the listing endpoint
// returns objects, the experimental endpoint returns "Namespace-Name-Version"
// strings. Both are normalised to the string form.
function dependencyStrings(dependencies) {
  return (dependencies || []).map(entry => (typeof entry === 'string')
    ? entry
    : `${entry?.namespace}-${entry?.name}-${entry?.version_number}`);
}

// --- Thunderstore API -----------------------------------------------------

//Get the current version of the requirement's package (returns null if unreachable)
async function getLatestThunderstorePackage(requirement) {
  let pkg = null;
  if (requirement.tsCommunity) {
    try {
      const listing = await util.jsonRequest(listingUrl(requirement));
      if (listing?.latest_version_number) {
        pkg = {
          version: String(listing.latest_version_number),
          downloadUrl: listing.download_url || downloadUrl(requirement, listing.latest_version_number),
          dependencies: dependencyStrings(listing.dependencies),
          isDeprecated: !!listing.is_deprecated,
          size: listing.size,
          updated: listing.version_created,
        };
      }
    } catch (err) { //not listed in this community, or the endpoint moved - the package endpoint still works
      log('debug', `Could not get ${requirement.userFacingName} from the Thunderstore ${requirement.tsCommunity} listing: ${err}`);
    }
  }
  if (pkg === null) {
    try {
      const data = await util.jsonRequest(packageUrl(requirement));
      const latest = data?.latest;
      if (latest?.version_number) {
        pkg = {
          version: String(latest.version_number),
          downloadUrl: latest.download_url || downloadUrl(requirement, latest.version_number),
          dependencies: dependencyStrings(latest.dependencies),
          isDeprecated: !!data.is_deprecated,
          size: undefined, //not reported by this endpoint
          updated: latest.date_created,
        };
      }
    } catch (err) {
      log('warn', `Could not get latest ${requirement.userFacingName} version from Thunderstore API: ${err}`);
      return null;
    }
  }
  if (pkg?.isDeprecated) {
    log('warn', `${requirement.userFacingName}: the Thunderstore package ${requirement.tsNamespace}/${requirement.tsName} is marked deprecated by its author.`);
  }
  return pkg;
}

//Get the version string for the requirement (returns null if unavailable)
async function getLatestThunderstoreVersion(requirement, pkg) {
  const resolved = (pkg !== undefined) ? pkg : await getLatestThunderstorePackage(requirement);
  return resolved ? resolved.version : null;
}

//Get the latest version's dependencies as "Namespace-Name-Version" strings (empty array if unavailable)
async function getThunderstoreDependencies(requirement, pkg) {
  const resolved = (pkg !== undefined) ? pkg : await getLatestThunderstorePackage(requirement);
  return resolved ? resolved.dependencies : [];
}

// --- install / update -----------------------------------------------------

// Requirements with an install currently running, keyed by mod type - guards
// against overlapping runs (e.g. double-clicking the toolbar download action).
const activeInstalls = new Set();

//Check if the requirement is installed (any mod with the requirement's mod type)
function isThunderstoreRequirementInstalled(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  return Object.keys(mods).some(id => mods[id]?.type === requirement.modType);
}

//Download and install a single requirement (with check = false, (re)install even if already installed)
async function downloadThunderstoreRequirement(api, gameSpec, requirement, check = true) {
  const installed = isThunderstoreRequirementInstalled(api, gameSpec.game.id, requirement);
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
  try { //Download the mod
    const latestPackage = await getLatestThunderstorePackage(requirement); //resolve current version from Thunderstore API
    //fall back to the hardcoded version if the API is unreachable - every version has a predictable download URL
    const fallbackUrl = requirement.fallbackVersion ? downloadUrl(requirement, requirement.fallbackVersion) : undefined;
    const URL = latestPackage ? latestPackage.downloadUrl : fallbackUrl;
    if (!URL) {
      throw new util.ProcessCanceled('Thunderstore API is unreachable and no fallback version is set');
    }
    const latestVersion = latestPackage ? latestPackage.version : requirement.fallbackVersion;
    const dlInfo = {
      game: gameSpec.game.id,
      name: requirement.userFacingName,
    };
    const dlId = await util.toPromise(cb =>
      api.events.emit('start-download', [URL], dlInfo, undefined, cb, undefined, { allowInstall: false }));
    const modId = await util.toPromise(cb =>
      api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
    const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
    const batched = [
      actions.setModsEnabled(api, profileId, [modId], true, {
        allowAutoDeploy: true,
        installed: true,
      }),
      actions.setModType(gameSpec.game.id, modId, requirement.modType), // Set the modType
      actions.setModAttribute(gameSpec.game.id, modId, 'version', latestVersion || ''),
      actions.setModAttribute(gameSpec.game.id, modId, versionAttribute(requirement), latestVersion || ''), // Track the installed version for update checks
      actions.setModAttribute(gameSpec.game.id, modId, 'source', 'website'),
      actions.setModAttribute(gameSpec.game.id, modId, 'url', pageUrl(requirement)), // Shown as the mod's "Source" link in the mod details (only rendered when source === 'website')
    ];
    util.batchDispatch(api.store, batched); // Will dispatch all actions.
    if (latestPackage && (latestPackage.dependencies.length > 0)) { //dependencies are not installed automatically - each one needs its own requirement entry
      log('info', `${requirement.userFacingName} declares Thunderstore dependencies: ${latestPackage.dependencies.join(', ')}`);
    }
  } catch (err) { //Show the user the download page if the download/install process fails
    api.showErrorNotification(`Failed to download/install ${requirement.userFacingName}. You must download manually.`, err);
    util.opn(pageUrl(requirement)).catch(() => null);
  } finally {
    activeInstalls.delete(requirement.modType);
    api.dismissNotification(NOTIF_ID);
  }
}

//Download and install each requirement in the array (sequentially)
async function downloadThunderstore(api, gameSpec, requirements, check = true) {
  for (const requirement of requirements) {
    await downloadThunderstoreRequirement(api, gameSpec, requirement, check);
  }
}

//Check the Thunderstore API for a newer version for a single requirement and notify the user
async function checkForThunderstoreUpdateRequirement(api, gameSpec, requirement) {
  if (!isThunderstoreRequirementInstalled(api, gameSpec.game.id, requirement)) {
    return;
  }
  const latestPackage = await getLatestThunderstorePackage(requirement);
  if (!latestPackage) {
    return; //API unreachable - nothing to compare against
  }
  const state = api.getState();
  const mods = state.persistent.mods[gameSpec.game.id] || {};
  const requirementMods = Object.values(mods).filter(mod => mod?.type === requirement.modType);
  const attr = versionAttribute(requirement);
  const latestVersion = latestPackage.version;
  const latestNormalized = normalizeVersion(latestVersion);
  const latestArchive = archiveName(requirement, latestVersion).toLowerCase();
  const isCurrent = requirementMods.some(mod => {
    const tracked = mod?.attributes?.[attr];
    if (tracked) {
      if (String(tracked) === String(latestVersion)) {
        return true;
      }
      const trackedNormalized = normalizeVersion(tracked);
      if (trackedNormalized && latestNormalized) { //an installed version newer than the listing (pre-release testing) is not an update
        return !semver.gt(latestNormalized, trackedNormalized);
      }
    }
    // archive name for mods installed before version tracking - Thunderstore always
    // serves Namespace-Name-Version.zip, so the name identifies the version exactly
    return String(mod?.attributes?.fileName || '').toLowerCase() === latestArchive;
  });
  if (isCurrent) {
    return;
  }
  api.sendNotification({
    id: `${requirement.modType}-update`,
    type: 'warning',
    message: `${requirement.userFacingName} update available (${latestVersion})`,
    allowSuppress: true,
    actions: [
      {
        title: 'Download',
        action: (dismiss) => {
          downloadThunderstoreRequirement(api, gameSpec, requirement, false);
          dismiss();
        },
      },
    ],
  });
}

//Check the Thunderstore API for newer versions for each requirement in the array
async function checkForThunderstoreUpdate(api, gameSpec, requirements) {
  for (const requirement of requirements) {
    await checkForThunderstoreUpdateRequirement(api, gameSpec, requirement);
  }
}

module.exports = {
  downloadThunderstore,
  checkForThunderstoreUpdate,
  downloadThunderstoreRequirement,
  checkForThunderstoreUpdateRequirement,
  isThunderstoreRequirementInstalled,
  getLatestThunderstorePackage,
  getLatestThunderstoreVersion,
  getThunderstoreDependencies,
};
