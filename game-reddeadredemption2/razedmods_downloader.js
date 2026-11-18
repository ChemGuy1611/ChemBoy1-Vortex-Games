"use strict";

// Shared razedmods.com requirements auto-downloader for Vortex game extensions.
//
// Downloads and installs mods hosted on downloads.razedmods.com - in practice
// Visual Redemption for Red Dead Redemption 2. The entry points take an array of
// requirement objects, processed sequentially. The host has no API, but it does
// publish a stable alias per mod: https://downloads.razedmods.com/<alias>
// answers with a 302 to the versioned archive
// (/Visual%20Redemption%20-%202.40.zip), so the current version is read straight
// off the redirect target's filename. An "update available" notification is
// raised when a newer version appears.
//
// Versions are dotted numbers with a varying segment count (2.40, 2.5), so they
// are compared segment by segment as numbers. Stripping the dots and comparing
// the digits would order 1.68 above 1.7, and semver.coerce() mangles anything
// that is not three segments - this module needs no semver dependency.
//
// The version lookup is a HEAD request, so the redirect is resolved without
// pulling the archive. Note that redirect: 'manual' cannot be used to read the
// Location header here: Chromium returns an opaque-redirect filtered response
// (status 0, headers unreadable) - that is fetch-spec behavior and is not
// affected by webSecurity. The final URL is read from response.url after a
// followed redirect instead.
//
// There is deliberately no version pinning. The host serves one alias per mod
// and publishes no index of older versions, so there is nothing stable to pin.
//
// Installed copies are identified by a mod attribute carrying the alias URL,
// not by mod type. The mods on this host are ordinary mods that share their mod
// type with everything else the user has installed, so "any mod of this type"
// would treat every one of them as the requirement - and disable them all when
// an update replaces the previous copy.
//
// The host serves plain unauthenticated HTTP with no bot protection (verified),
// so the resolved artifact URL goes straight to Vortex's download manager.
//
// All HTTP goes through the renderer's global fetch and Vortex's download
// manager, so the only external is vortex-api.
//
// Public API: downloadRazedMods, checkForRazedModsUpdate (array-based entry
// points), downloadRazedModsRequirement, checkForRazedModsUpdateRequirement
// (single-requirement variants), isRazedModsRequirementInstalled,
// getLatestRazedModsVersion, resolveRazedModsDownloadUrl, compareVersions.

const { actions, log, selectors, util } = require("vortex-api");

// --- requirement helpers --------------------------------------------------

// Mod attribute used to track the installed version.
const DEFAULT_VERSION_ATTRIBUTE = "razedModsVersion";
// Mod attribute carrying the alias URL - this is what marks a mod as an installed copy.
const ALIAS_ATTRIBUTE = "razedModsAlias";
// Version in the redirect target's decoded filename, e.g. "Visual Redemption - 2.40.zip".
const DEFAULT_VERSION_PATTERN = /-\s*([\d.]+)\.zip$/i;

function versionAttribute(requirement) {
  return requirement.versionAttribute || DEFAULT_VERSION_ATTRIBUTE;
}

// Manual-download page; the alias itself (a direct download) when the requirement names none.
function pageUrl(requirement) {
  return requirement.pageUrl || requirement.aliasUrl;
}

// Concurrency-guard / notification key. Several requirements may share a mod type, so the
// alias (unique per mod on the host) comes first.
function guardKey(requirement) {
  return requirement.aliasUrl ?? requirement.modType ?? "razedmods";
}

// --- version handling ------------------------------------------------------

//Numeric segments of a dotted version: "2.40" -> [2, 40]. Returns null when it carries no digits.
function versionSegments(version) {
  const segments = String(version ?? "")
    .split(".")
    .map((segment) => segment.replace(/\D/g, ""))
    .filter((segment) => segment !== "")
    .map(Number);
  return segments.length > 0 ? segments : null;
}

//Compare two dotted versions segment by segment (missing segments count as 0).
//Returns a negative number, 0, or a positive number, like a sort comparator; null sorts lowest.
function compareVersions(lhs, rhs) {
  const left = versionSegments(lhs);
  const right = versionSegments(rhs);
  if (left === null || right === null) {
    return (left === null ? 0 : 1) - (right === null ? 0 : 1);
  }
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

//Resolve the versioned download URL by following the alias's redirect (returns null if the
//host is unreachable). HEAD, so the body is never pulled just to learn the version.
async function resolveRazedModsDownloadUrl(requirement) {
  try {
    // redirect: 'manual' would make Location unreadable (opaque-redirect, status 0) - the final
    // URL has to come from a followed redirect, see the header comment.
    const response = await fetch(requirement.aliasUrl, { method: "HEAD" });
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    return response.url; //final URL after the 302 - its filename carries the version
  } catch (err) {
    log(
      "warn",
      `Could not resolve the ${requirement.userFacingName} download URL on razedmods.com: ${err}`,
    );
    return null;
  }
}

//Version embedded in a resolved URL's filename (returns null if it carries none)
function versionFromUrl(requirement, url) {
  if (!url) {
    return null;
  }
  let fileName;
  try {
    // The filename is percent-encoded and contains spaces - decode before matching.
    fileName = decodeURIComponent(new URL(url).pathname);
  } catch {
    fileName = String(url); //not a parseable URL - match against it as-is
  }
  const match = fileName.match(requirement.versionPattern || DEFAULT_VERSION_PATTERN);
  return match ? match[1] : null;
}

//Current release as { url, version }. The URL is the versioned one the redirect points at, or
//null when the host is unreachable. The version is resolved from the redirect filename first,
//then from the requirement's fallbackVersion.
async function getLatestRazedModsRelease(requirement) {
  const url = await resolveRazedModsDownloadUrl(requirement);
  let version = versionFromUrl(requirement, url);
  if (version === null) {
    version = requirement.fallbackVersion || null;
  }
  return { url, version };
}

//Get the current version for the requirement (returns null if it can't be resolved)
async function getLatestRazedModsVersion(requirement) {
  return (await getLatestRazedModsRelease(requirement)).version;
}

// --- install / update -----------------------------------------------------

// Requirements with an install currently running - guards against overlapping runs (e.g.
// double-clicking the toolbar download action).
const activeInstalls = new Set();

//Mod ids of the installed copies of this requirement. Captured before an install so the
//previous version can be disabled once the new one lands - an update installs a second mod
//entry rather than replacing the first, and two enabled copies deploy on top of each other.
function requirementModIds(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  return Object.keys(mods).filter(
    (id) => mods[id]?.attributes?.[ALIAS_ATTRIBUTE] === requirement.aliasUrl,
  );
}

//Check if the requirement is installed (any mod stamped with the requirement's alias)
function isRazedModsRequirementInstalled(api, gameId, requirement) {
  return requirementModIds(api, gameId, requirement).length > 0;
}

//Highest version recorded across the installed copies (null when none carries one)
function installedVersion(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  const attr = versionAttribute(requirement);
  return requirementModIds(api, gameId, requirement)
    .map((id) => mods[id]?.attributes?.[attr])
    .filter((version) => versionSegments(version) !== null)
    .reduce((best, version) => (compareVersions(version, best) > 0 ? version : best), null);
}

//Download and install a single requirement (with check = false, (re)install even if already installed)
async function downloadRazedModsRequirement(api, gameSpec, requirement, check = true) {
  const gameId = gameSpec.game.id;
  const installed = isRazedModsRequirementInstalled(api, gameId, requirement);
  if (installed && check) {
    return;
  }
  const key = guardKey(requirement);
  if (activeInstalls.has(key)) {
    log(
      "debug",
      `${requirement.userFacingName} install already running - skipping duplicate request`,
    );
    return;
  }
  activeInstalls.add(key);
  const NOTIF_ID = `${key}-installing`;
  api.sendNotification({
    //notification indicating install process
    id: NOTIF_ID,
    message: `Installing ${requirement.userFacingName}`,
    type: "activity",
    noDismiss: true,
    allowSuppress: false,
  });
  //captured before the install: these are the versions being replaced
  const previousModIds = requirementModIds(api, gameId, requirement);
  try {
    const latest = await getLatestRazedModsRelease(requirement);
    // The versioned URL is what gets downloaded, so the archive lands under its versioned name
    // and successive versions don't collide in the downloads folder. If the redirect couldn't
    // be resolved the alias is handed over instead - the download manager follows the redirect
    // itself.
    const url = latest.url || requirement.aliasUrl;
    const dlInfo = {
      game: gameId,
      name: requirement.userFacingName,
    };
    const dlId = await new Promise((resolve, reject) =>
      api.events.emit(
        "start-download",
        [url],
        dlInfo,
        undefined,
        (err, result) => (err ? reject(err) : resolve(result)),
        undefined,
        {
          allowInstall: false,
        },
      ),
    );
    // Declare the origin before the install pipeline reads it. InstallManager re-reads the
    // download from live state right before running the attribute extractors, and
    // processAttributes gates its whole Nexus fetch on modInfo.source === 'nexus' - so a
    // value written here is the one it sees, and writing it after the install is too late.
    // Any md5 match against Nexus for a file from this host is by definition a false one.
    // 'website' is the registered mod source id; 'other' is NOT one (the id behind the
    // "Other" label is 'unsupported'), and an unregistered id leaves the Source column
    // blank. See https://github.com/Nexus-Mods/Vortex/issues/21979.
    api.store.dispatch(actions.setDownloadModInfo(dlId, "source", "website"));
    const modId = await new Promise((resolve, reject) =>
      api.events.emit("start-install-download", dlId, { allowAutoEnable: false }, (err, result) =>
        err ? reject(err) : resolve(result),
      ),
    );
    const profileId = selectors.lastActiveProfileForGame(api.getState(), gameId);
    const batched = [
      actions.setModsEnabled(api, profileId, [modId], true, {
        allowAutoDeploy: true,
        installed: true,
      }),
      actions.setModAttribute(gameId, modId, "version", latest.version || ""),
      actions.setModAttribute(gameId, modId, versionAttribute(requirement), latest.version || ""), // Track the installed version for update checks
      actions.setModAttribute(gameId, modId, ALIAS_ATTRIBUTE, requirement.aliasUrl), // Marks this mod as the installed copy of the requirement
      actions.setModAttribute(gameId, modId, "source", "website"),
      actions.setModAttribute(gameId, modId, "url", pageUrl(requirement)), // Shown as the mod's "Source" link in the mod details (only rendered when source === 'website')
      actions.setModAttribute(gameId, modId, "customFileName", requirement.userFacingName), // Vortex renders a mod as customFileName || logicalFileName || fileName || name, and the install pipeline stamps fileName with the archive name - without this the mod list shows the raw archive
      // Vortex md5-matches every finished download against Nexus, game-agnostically, so a
      // shared third-party asset can be matched to an unrelated Nexus upload and have that
      // upload's modId/fileId stamped onto this mod. The update check then queries
      // <managed game>/mods/<foreign modId> and offers a completely unrelated mod as an update.
      // Deleting modId is the deterministic kill: checkModVersion bails on a non-numeric one.
      // Singular setModAttribute is required - the plural setModAttributes merges, and a merge
      // can never delete a key. The module's own attributes are namespaced and untouched.
      // Do not "tidy" these away. See https://github.com/Nexus-Mods/Vortex/issues/21979.
      actions.setModAttribute(gameId, modId, "modId", undefined),
      actions.setModAttribute(gameId, modId, "fileId", undefined),
    ];
    if (requirement.modType !== undefined) {
      // Optional: without it the extension's own installers decide the mod type
      batched.push(actions.setModType(gameId, modId, requirement.modType));
    }
    for (const oldModId of previousModIds) {
      // Disable the version this install replaces, so only one copy deploys
      if (oldModId !== modId) {
        batched.push(actions.setModEnabled(profileId, oldModId, false));
      }
    }
    util.batchDispatch(api.store, batched); // Will dispatch all actions.
  } catch (err) {
    //Show the user the download page if the download/install process fails
    // A cancel is the user's own decision (a dismissed installer dialog), not a failure: no
    // error is raised for it and no browser window is opened over them.
    if (err?.data?.kind === "user-canceled") {
      log("info", `${requirement.userFacingName} install canceled by the user`);
    } else {
      api.showErrorNotification(
        `Failed to download/install ${requirement.userFacingName}. You must download manually.`,
        err,
        { allowReport: false },
      );
      try {
        window.api.shell.openUrl(pageUrl(requirement));
      } catch (openErr) {
        api.showErrorNotification("Failed to open the URL", openErr, { allowReport: false });
      }
    }
  } finally {
    activeInstalls.delete(key);
    api.dismissNotification(NOTIF_ID);
  }
}

//Download and install each requirement in the array (sequentially)
async function downloadRazedMods(api, gameSpec, requirements, check = true) {
  for (const requirement of requirements) {
    await downloadRazedModsRequirement(api, gameSpec, requirement, check);
  }
}

//Check razedmods.com for a newer version of a single requirement and notify the user
async function checkForRazedModsUpdateRequirement(api, gameSpec, requirement) {
  const gameId = gameSpec.game.id;
  if (!isRazedModsRequirementInstalled(api, gameId, requirement)) {
    // Missing rather than outdated - install it instead of checking for updates to something
    // that is not there. Requirements the user installs manually opt out with autoInstall: false.
    if (requirement.autoInstall === false) {
      return;
    }
    log("info", `${requirement.userFacingName} is not installed - installing it`);
    return downloadRazedModsRequirement(api, gameSpec, requirement);
  }
  const latestVersion = await getLatestRazedModsVersion(requirement);
  if (versionSegments(latestVersion) === null) {
    return; //host unreachable and no fallback - nothing to compare against
  }
  // A copy whose version stamp was cleared reads as null, which sorts lowest: it draws one
  // notification and the resulting install stamps it - self-healing.
  if (compareVersions(installedVersion(api, gameId, requirement), latestVersion) >= 0) {
    return;
  }
  api.sendNotification({
    id: `${guardKey(requirement)}-update`,
    type: "warning",
    message: `${requirement.userFacingName} update available (${latestVersion})`,
    allowSuppress: true,
    actions: [
      {
        title: "Download",
        action: (dismiss) => {
          downloadRazedModsRequirement(api, gameSpec, requirement, false);
          dismiss();
        },
      },
    ],
  });
}

//Check razedmods.com for newer versions of each requirement in the array
async function checkForRazedModsUpdate(api, gameSpec, requirements) {
  for (const requirement of requirements) {
    await checkForRazedModsUpdateRequirement(api, gameSpec, requirement);
  }
}

module.exports = {
  downloadRazedMods,
  checkForRazedModsUpdate,
  downloadRazedModsRequirement,
  checkForRazedModsUpdateRequirement,
  isRazedModsRequirementInstalled,
  getLatestRazedModsVersion,
  resolveRazedModsDownloadUrl,
  compareVersions,
};
