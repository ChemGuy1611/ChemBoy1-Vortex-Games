'use strict';

// Shared BepInEx bleeding-edge (BE) requirements auto-downloader for Vortex game extensions.
//
// Downloads and installs BepInEx 6 bleeding-edge builds from builds.bepinex.dev.
// The entry points take an array of requirement objects, processed sequentially.
// builds.bepinex.dev has no API of any kind - no JSON endpoint and no /latest
// alias - so each requirement's current build is resolved by parsing the
// project's own build index page, with an optional hardcoded fallback build/URL
// for when the page is unreachable. An "update available" notification is
// raised when a newer build appears. A requirement can instead be pinned to one
// build (pinVersion), which holds it there and makes update checks skip the
// index page entirely.
//
// Builds are sequential integers, not versions: every build reports itself as
// 6.0.0-be.<build>+<commit>, which semver would coerce to the same 6.0.0 for all
// of them. Update detection is therefore a numeric compare of the build number,
// and this module needs no semver dependency.
//
// The host serves artifacts directly over a Cloudflare 200 with no bot
// protection (verified headless), so - unlike the ModDB counterpart - there is
// no URL resolution step and no direct-fetch fallback route: the artifact URL
// goes straight to Vortex's download manager.
//
// There is deliberately no already-downloaded shortcut. The artifact filename
// embeds the build and commit, so a stale local archive is exactly what must
// not be reused.
//
// All HTTP goes through the renderer's global fetch and Vortex's download
// manager, so the only external is vortex-api.
//
// Public API: downloadBepinexBe, checkForBepinexBeUpdate (array-based entry
// points), downloadBepinexBeRequirement, checkForBepinexBeUpdateRequirement
// (single-requirement variants), isBepinexBeInstalled, getLatestBepinexBeBuild,
// getBepinexBeBuild, parseBepinexBeArtifacts.

const { actions, log, selectors, util } = require('vortex-api');

const BASE_URL = 'https://builds.bepinex.dev';

// --- requirement helpers --------------------------------------------------

// Project whose build index is parsed, relative to BASE_URL.
const DEFAULT_PROJECT_PATH = 'projects/bepinex_be';
// Mod attribute used to track the installed build number.
const DEFAULT_BUILD_ATTRIBUTE = 'bepinexBeBuild';

function buildAttribute(requirement) {
  return requirement.buildAttribute || DEFAULT_BUILD_ATTRIBUTE;
}

function projectPath(requirement) {
  return requirement.projectPath || DEFAULT_PROJECT_PATH;
}

function indexUrl(requirement) {
  return `${BASE_URL}/${projectPath(requirement)}`;
}

// Build index page, used for manual downloads and as the mod's "Source" link.
function pageUrl(requirement) {
  return requirement.pageUrl || indexUrl(requirement);
}

// Concurrency-guard / notification key. modType is always set in practice; the
// artifactPattern fallback keeps a requirement that omits it from colliding
// with every other one.
function guardKey(requirement) {
  return requirement.modType ?? requirement.artifactPattern?.source ?? 'bepinex-be';
}

// --- version pinning ------------------------------------------------------
// An opt-in pin holds a requirement at one specific build instead of tracking the newest one.
// pinVersion is both the build to install and the label shown to the user. Unlike the file-id
// based companions, no second field is required: the build index lists every build, so the
// pinned one can be found by number. pinArtifactUrl is only needed once a build has scrolled
// off the index page. With pinVersion unset - the default - none of this code runs and the
// module behaves exactly as it does without it.
function isPinned(requirement) {
  return !!requirement.pinVersion;
}

//Whether the installed copy is already the pinned build, compared on the tracked build number.
//True short-circuits the update check before any HTTP request is made.
function isAtPinnedVersion(api, gameId, requirement) {
  if (!isPinned(requirement)) {
    return false;
  }
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  const attr = buildAttribute(requirement);
  return Object.values(mods).some(mod => (mod?.type === requirement.modType)
    && (String(mod?.attributes?.[attr]) === String(requirement.pinVersion)));
}

// --- build index page ------------------------------------------------------

// One block per build, newest first.
const ARTIFACT_ITEM_SEPARATOR = '<div class="artifact-item">';
const BUILD_ID_RE = /<span class="artifact-id">#(\d+)<\/span>/;
const COMMIT_RE = /class="hash-button"[^>]*>([0-9a-f]+)<\/a>/i;
const BUILD_DATE_RE = /<span class="build-date">([^<]+)<\/span>/;
// The class attribute and the href sit on separate lines in the page source, so
// the pattern has to span the newline and indentation between them.
const ARTIFACT_LINK_RE = /<a class="artifact-link"[\s\S]*?href="([^"]+)"[^>]*>([^<]+)<\/a>/g;

function absoluteUrl(href) {
  try {
    // The href is already percent-encoded - the '+' separating build from commit arrives as
    // %2B - so URL() is used only to resolve the leading slash. Do not re-encode the result.
    return new URL(href.replace(/&amp;/g, '&'), BASE_URL).href;
  } catch {
    return null;
  }
}

//Parse the build index page into build records, newest first:
//{ build, commit, date, artifacts: [{ name, url }] }
function parseBepinexBeArtifacts(html) {
  const blocks = String(html || '').split(ARTIFACT_ITEM_SEPARATOR).slice(1);
  const builds = [];
  for (const block of blocks) {
    const idMatch = block.match(BUILD_ID_RE);
    if (!idMatch) {
      continue; //not a build block
    }
    const artifacts = [];
    ARTIFACT_LINK_RE.lastIndex = 0; //the regex is global and reused across blocks
    let match;
    while ((match = ARTIFACT_LINK_RE.exec(block)) !== null) {
      const url = absoluteUrl(match[1]);
      if (url !== null) {
        artifacts.push({ name: match[2].trim(), url });
      }
    }
    builds.push({
      build: idMatch[1],
      commit: (block.match(COMMIT_RE) || [])[1] || '',
      date: (block.match(BUILD_DATE_RE) || [])[1] || '',
      artifacts,
    });
  }
  return builds;
}

//Fetch and parse the build index page (returns null if unreachable)
async function getBepinexBeBuilds(requirement) {
  try {
    // ~560 KB raw, ~35 KB over the wire: the renderer's fetch negotiates gzip automatically.
    const response = await fetch(indexUrl(requirement));
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    return parseBepinexBeArtifacts(await response.text());
  } catch (err) {
    log('warn', `Could not get ${requirement.userFacingName} builds from builds.bepinex.dev: ${err}`);
    return null;
  }
}

//The artifact in this build matching the requirement's pattern (returns null if none does)
function matchArtifact(requirement, build) {
  return build.artifacts.find(artifact => requirement.artifactPattern.test(artifact.name)) || null;
}

function buildResult(entry, artifact) {
  return { build: entry.build, commit: entry.commit, date: entry.date, artifact };
}

//Newest build carrying an artifact for this requirement, as
//{ build, commit, date, artifact: { name, url } } (returns null if the index is unreachable
//or no build matches)
async function getLatestBepinexBeBuild(requirement) {
  const builds = await getBepinexBeBuilds(requirement);
  if (builds === null) {
    return null;
  }
  for (const entry of builds) {
    // Newest first, and a build whose artifact set does not cover this requirement is skipped
    // rather than failing the lookup - a partial build must not stall every game behind it.
    const artifact = matchArtifact(requirement, entry);
    if (artifact !== null) {
      return buildResult(entry, artifact);
    }
  }
  log('warn', `No builds.bepinex.dev artifact matches ${requirement.artifactPattern} for ${requirement.userFacingName}`);
  return null;
}

//One specific build with its matching artifact (returns null if the index is unreachable, the
//build has scrolled off the page, or it carries no matching artifact)
async function getBepinexBeBuild(requirement, buildNumber) {
  const builds = await getBepinexBeBuilds(requirement);
  if (builds === null) {
    return null;
  }
  const entry = builds.find(candidate => String(candidate.build) === String(buildNumber));
  if (entry === undefined) {
    return null;
  }
  const artifact = matchArtifact(requirement, entry);
  return artifact === null ? null : buildResult(entry, artifact);
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
function isBepinexBeInstalled(api, gameId, requirement) {
  return requirementModIds(api, gameId, requirement).length > 0;
}

//Highest build number recorded across the installed copies (null when none carries the
//attribute, which is the case for a copy installed before build tracking existed)
function installedBuild(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  const attr = buildAttribute(requirement);
  const builds = Object.values(mods)
    .filter(mod => mod?.type === requirement.modType)
    .map(mod => Number(mod?.attributes?.[attr]))
    .filter(value => Number.isFinite(value));
  return builds.length > 0 ? Math.max(...builds) : null;
}

//Download and install a single requirement (with check = false, (re)install even if already installed)
async function downloadBepinexBeRequirement(api, gameSpec, requirement, check = true) {
  const gameId = gameSpec.game.id;
  const installed = isBepinexBeInstalled(api, gameId, requirement);
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
  const profileId = selectors.lastActiveProfileForGame(api.getState(), gameId);
  //captured before the install: these are the builds being replaced
  const previousModIds = requirementModIds(api, gameId, requirement);
  const pinned = isPinned(requirement);
  try {
    let buildNumber;
    let url;
    if (pinned && requirement.pinArtifactUrl) {
      //the pinned artifact URL is complete on its own, so this route makes no index request
      buildNumber = String(requirement.pinVersion);
      url = requirement.pinArtifactUrl;
    } else {
      //A pin overrides newest-build selection: the pinned build is looked up by number on the
      //same index page, which lists every build that has not yet scrolled off it.
      const resolved = pinned
        ? await getBepinexBeBuild(requirement, requirement.pinVersion)
        : await getLatestBepinexBeBuild(requirement);
      if (resolved !== null) {
        buildNumber = resolved.build;
        url = resolved.artifact.url;
      } else if (pinned) {
        //never silently install the newest build in place of the pinned one
        throw new util.ProcessCanceled(`Build ${requirement.pinVersion} could not be resolved from the `
          + 'builds.bepinex.dev index - set pinArtifactUrl to reach a build that has scrolled off it');
      } else { //fall back to the hardcoded build if the index page is unreachable
        buildNumber = requirement.fallbackBuild;
        url = requirement.fallbackArtifactUrl;
      }
    }
    if (!url) {
      throw new util.ProcessCanceled('builds.bepinex.dev is unreachable and no fallbackArtifactUrl is set');
    }
    const dlInfo = {
      game: gameId,
      name: requirement.userFacingName,
    };
    const dlId = await util.toPromise(cb =>
      api.events.emit('start-download', [url], dlInfo, undefined, cb, undefined, { allowInstall: false }));
    // Disable the outgoing build NOW, not in the batch below: the install enables the incoming
    // mod as soon as it lands, so a deferred disable leaves both enabled across the install -
    // and if Vortex reuses the mod id, it lands on the copy that was just installed. Done after
    // the download rather than before it so a failed download leaves the working build enabled.
    for (const oldModId of previousModIds) {
      api.store.dispatch(actions.setModEnabled(profileId, oldModId, false));
    }
    const modId = await util.toPromise(cb =>
      api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
    const batched = [
      actions.setModsEnabled(api, profileId, [modId], true, {
        allowAutoDeploy: true,
        installed: true,
      }),
      actions.setModType(gameId, modId, requirement.modType), // Set the modType
      actions.setModAttribute(gameId, modId, 'version', String(buildNumber || '')),
      actions.setModAttribute(gameId, modId, buildAttribute(requirement), Number(buildNumber)), // Track the installed build for update checks
      actions.setModAttribute(gameId, modId, 'source', 'website'),
      actions.setModAttribute(gameId, modId, 'url', pageUrl(requirement)), // Shown as the mod's "Source" link in the mod details (only rendered when source === 'website')
      actions.setModAttribute(gameId, modId, 'customFileName', requirement.userFacingName), // Vortex renders a mod as customFileName || logicalFileName || fileName || name, and the install pipeline stamps fileName with the archive name - without this the mod list shows the raw artifact
    ];
    util.batchDispatch(api.store, batched); // Will dispatch all actions.
  } catch (err) { //Show the user the build index if the download/install process fails
    api.showErrorNotification(`Failed to download/install ${requirement.userFacingName}. You must download manually.`, err);
    util.opn(pageUrl(requirement)).catch(() => null);
  } finally {
    activeInstalls.delete(key);
    api.dismissNotification(NOTIF_ID);
  }
}

//Download and install each requirement in the array (sequentially)
async function downloadBepinexBe(api, gameSpec, requirements, check = true) {
  for (const requirement of requirements) {
    await downloadBepinexBeRequirement(api, gameSpec, requirement, check);
  }
}

//Check builds.bepinex.dev for a newer build for a single requirement and notify the user
async function checkForBepinexBeUpdateRequirement(api, gameSpec, requirement) {
  const gameId = gameSpec.game.id;
  // Pinned and already on the pinned build: nothing to check, and deliberately no HTTP request
  // at all - this is what makes a pinned requirement free against the build index.
  if (isAtPinnedVersion(api, gameId, requirement)) {
    return;
  }
  if (!isBepinexBeInstalled(api, gameId, requirement)) {
    // Missing rather than outdated - install it instead of checking for updates to something
    // that is not there. Requirements the user installs manually opt out with autoInstall: false.
    if (requirement.autoInstall === false) {
      return;
    }
    log('info', `${requirement.userFacingName} is not installed - installing it`);
    return downloadBepinexBeRequirement(api, gameSpec, requirement);
  }
  if (isPinned(requirement)) {
    // Installed, but not the pinned build. The wording covers a user who is ahead of the pin as
    // well as behind it - installing it from that state is a deliberate downgrade.
    api.sendNotification({
      id: `${guardKey(requirement)}-update`,
      type: 'warning',
      message: `${requirement.userFacingName} pinned version available (build ${requirement.pinVersion})`,
      allowSuppress: true,
      actions: [
        {
          title: 'Download',
          action: (dismiss) => {
            downloadBepinexBeRequirement(api, gameSpec, requirement, false);
            dismiss();
          },
        },
      ],
    });
    return;
  }
  const latest = await getLatestBepinexBeBuild(requirement);
  if (latest === null) {
    return; //index unreachable - nothing to compare against
  }
  // Numeric compare, not semver: every build calls itself 6.0.0-be.<build>, which coerces to
  // the same 6.0.0. A copy installed before build tracking has no attribute and reads as null,
  // so it draws one notification and the resulting install stamps it - self-healing.
  const installed = installedBuild(api, gameId, requirement);
  if ((installed !== null) && (installed >= Number(latest.build))) {
    return;
  }
  api.sendNotification({
    id: `${guardKey(requirement)}-update`,
    type: 'warning',
    message: `${requirement.userFacingName} update available (build ${latest.build})`,
    allowSuppress: true,
    actions: [
      {
        title: 'Download',
        action: (dismiss) => {
          downloadBepinexBeRequirement(api, gameSpec, requirement, false);
          dismiss();
        },
      },
    ],
  });
}

//Check builds.bepinex.dev for newer builds for each requirement in the array
async function checkForBepinexBeUpdate(api, gameSpec, requirements) {
  for (const requirement of requirements) {
    await checkForBepinexBeUpdateRequirement(api, gameSpec, requirement);
  }
}

module.exports = {
  downloadBepinexBe,
  checkForBepinexBeUpdate,
  downloadBepinexBeRequirement,
  checkForBepinexBeUpdateRequirement,
  isBepinexBeInstalled,
  getLatestBepinexBeBuild,
  getBepinexBeBuild,
  parseBepinexBeArtifacts,
};
