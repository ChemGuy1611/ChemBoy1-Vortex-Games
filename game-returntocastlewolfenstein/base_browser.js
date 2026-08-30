'use strict';

// Shared base for the embedded mod-site browser pages.
//
// A browser module registers a Vortex sidebar page that embeds a mod site's own
// website. The user browses the real site - search, categories, mod pages,
// screenshots - and a click on a download link becomes a managed Vortex install:
// the archive is claimed, the mod is enabled, and its identity and version are
// stamped as mod attributes.
//
// Vortex already turns a download started inside embedded content into a normal
// Vortex download (will-download -> received-url -> start-download-url -> the
// https protocol handler), so a browser module intercepts nothing. It waits for
// the finished download, recognises it as one of its own, and takes over.
//
// Everything that is the same for every mod site lives here: the page and its
// chrome, navigation history, the host allow-list, the external-content
// confirmation, ad hiding, the claim of a finished download, the adoption and
// attribute stamping of the resulting mod, the install driver, the optional
// dependency walk, the update check, and the registration wiring.
//
// Everything a single site does differently arrives in an adapter object. See
// template_base_browser.js for a commented skeleton, and thunderstore_browser.js
// / gamebanana_browser.js for the two live ones.
//
// An adopting extension must carry BOTH this file and its source module, because
// the source module requires this one from beside it.
//
// The adapter:
//   id                        (required) short source id: namespaces page ids and state
//   label                     (required) human name of the site, used in messages and log lines
//   defaults                  per-source defaults a config may override:
//                               packageAttribute, versionAttribute, allowedHosts,
//                               icon, mdi, pageTitle, homeTooltip, adSelectors, blockedHosts
//   homeUrl(config)           (required) where the page opens and what Home returns to
//   refKey(ref)               (required) reference -> the package-attribute string
//   parseKey(key)             (required) the inverse; null when the string is not a key
//   requirementKey(req)       (required) an adopter requirement -> the same key string
//   resolve(config, ref)      (required) authoritative lookup -> a resolved record (below), or null
//   resolveForInstall(c, ref) resolve for a reference that may already name its own version;
//                             default is resolve. Override to avoid an API call when the
//                             reference is already complete.
//   parseClaim(download)      (required) a finished download record -> a partial reference, or null
//   identify(config, st, ref) partial reference -> Promise of a full reference (default: as given)
//   routeUrl(ctx, url, nav)   inspect a URL the page is about to open; true means "handled"
//   displayName(res, key)     what the mod list and notifications call the mod (default: the key)
//   extraAttributes(c, res)   [[attributeName, value], ...] stamped on top of the standard set
//   dependencies              true when the source publishes a dependency graph
//   fetchStrategy             'capture' (default) or 'click' - see requestDownload below.
//                             A 'click' source also gets its failed downloads taken over, because
//                             the site's own button reaches Vortex before this module does.
//   fetchToFile(config, url)  required by 'click': resolve a download URL to a local file path
//   unresolvedMessage         error text when a reference cannot be resolved
//   installedInfo(c, mod, a)  what is recorded about an installed mod, for the update check
//   compareInstalled(a, b)    true when installed record a is newer than b
//   isUpdate(resolved, inst)  true when the resolved record is newer than what is installed
//   updateRef(parsed, res)    the reference the update notification installs
//
// A resolved record: { version, downloadUrl, pageUrl, dependencies?, ...source fields }.
// Every field the adapter adds survives into extraAttributes and the stamped mod.
//
// Public API: createBrowserModule(adapter), isNewerVersion, normalizeVersion.

const semver = require('semver');
const React = require('react');
const { actions, log, selectors, util, MainPage, FlexLayout, Spinner, Webview, tooltip } = require('vortex-api');

// Claimed downloads that never produced an install (the user cancelled it) are pruned this old.
const CLAIM_MAX_AGE_MS = 60 * 60 * 1000;

// How deep the dependency walk follows a package's own dependencies.
const DEPENDENCY_DEPTH_CAP = 5;

// --- version helpers ------------------------------------------------------

// Versions are semver by convention on some sites and free text on others, and authors still
// ship "v"-prefixed and short forms. A source whose versions are not semver at all overrides
// the update-check hooks instead of relying on these.
function normalizeVersion(raw) {
  const coerced = semver.coerce(String(raw || '').replace(/^v/i, ''));
  return coerced ? coerced.version : null;
}

//Whether "latest" is genuinely newer than what is installed (an installed pre-release is not an update)
function isNewerVersion(latest, installed) {
  if (!latest) {
    return false;
  }
  if (!installed) {
    return true;
  }
  if (String(latest) === String(installed)) {
    return false;
  }
  const latestNormalized = normalizeVersion(latest);
  const installedNormalized = normalizeVersion(installed);
  if (!latestNormalized || !installedNormalized) {
    return String(latest) !== String(installed);
  }
  return semver.gt(latestNormalized, installedNormalized);
}

// --- per-page state -------------------------------------------------------

// State is keyed by page id rather than held in module-level singletons, because one
// extension may require this file from two source modules at once: a single shared claim
// map would let one source claim - and install a second time - a download the other made.
// The page id already carries both the game and the source.
const pageStates = new Map();

function pageState(pageId) {
  let state = pageStates.get(pageId);
  if (state === undefined) {
    state = {
      // URLs this module started downloads for. The claim handler ignores them: those installs
      // are driven inline and would otherwise be started a second time.
      selfStartedUrls: new Set(),
      // Downloads claimed from the embedded browser, keyed by download id. Each carries the
      // promise that identifies it, because the attributes are stamped when the matching
      // install lands - which may be started by core rather than here.
      claimedDownloads: new Map(),
      // Whether the user has passed the external-content confirmation. Remembered for the
      // session so switching pages does not re-ask, forgotten on restart.
      confirmed: false,
      // Downloads already being taken over after the download manager failed on them, so a
      // second state change for the same id does not start a second install.
      recovering: new Set(),
      // Whatever the adapter needs to remember for this page, e.g. recently visited mods.
      adapterState: {},
    };
    pageStates.set(pageId, state);
  }
  return state;
}

// --- config helpers -------------------------------------------------------

function adapterDefault(adapter, name, fallback) {
  const value = (adapter.defaults || {})[name];
  return (value !== undefined) ? value : fallback;
}

function packageAttribute(adapter, config) {
  return config.packageAttribute || adapterDefault(adapter, 'packageAttribute', `${adapter.id}Package`);
}

function versionAttribute(adapter, config) {
  return config.versionAttribute || adapterDefault(adapter, 'versionAttribute', `${adapter.id}Version`);
}

function browserPageId(adapter, gameSpec, config) {
  return config.pageId || `${gameSpec.game.id}-${adapter.id}-browse`;
}

function allowedHosts(adapter, config) {
  return config.allowedHosts || adapterDefault(adapter, 'allowedHosts', []);
}

//Whether the embedded view is allowed to stay on this URL
function isHostAllowed(adapter, config, url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return allowedHosts(adapter, config).some(allowed =>
      (host === allowed) || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

//The stylesheet injected into every page the view loads (empty string disables the injection)
function adHidingCss(adapter, config) {
  if (config.hideAds === false) {
    return '';
  }
  const list = config.adSelectors || adapterDefault(adapter, 'adSelectors', []);
  return (list.length > 0)
    ? `${list.join(',\n')} { display: none !important; }`
    : '';
}

//Whether a URL leads somewhere that only exists to serve an ad
function isBlockedHost(adapter, config, url) {
  if (config.blockAdPopups === false) {
    return false;
  }
  const list = config.blockedHosts || adapterDefault(adapter, 'blockedHosts', []);
  if (list.length === 0) {
    return false;
  }
  try {
    const host = new URL(url).hostname.toLowerCase();
    return list.some(blocked => (host === blocked) || host.endsWith(`.${blocked}`));
  } catch {
    return false;
  }
}

// --- resolution -----------------------------------------------------------

//The authoritative lookup: what the source currently publishes for this reference
function resolveRef(adapter, config, ref) {
  return adapter.resolve(config, ref);
}

//The lookup used before an install, which may skip the API when the reference already
//names the file it wants
function resolveRefForInstall(adapter, config, ref) {
  return (adapter.resolveForInstall !== undefined)
    ? adapter.resolveForInstall(config, ref)
    : adapter.resolve(config, ref);
}

//What the mod list, notifications and messages call this thing. The key is the default because
//it is always correct: a source whose records carry a human title opts in, and no field on the
//resolved record is treated as one by convention (Thunderstore's `name` is the package name).
function displayName(adapter, resolved, key) {
  if (adapter.displayName === undefined) {
    return key;
  }
  return adapter.displayName(resolved, key) || key;
}

// --- installed detection --------------------------------------------------

//The adopter's requirement entry for a key, if it manages that mod itself
function findRequirement(adapter, config, key) {
  return (config.requirements || []).find(req => adapter.requirementKey(req) === key);
}

//Mod ids carrying a key - by attribute for browsed mods, by mod type for managed requirements
function keyModIds(adapter, api, gameId, config, key) {
  const state = api.getState();
  const mods = state.persistent.mods?.[gameId] || {};
  const attr = packageAttribute(adapter, config);
  const requirement = findRequirement(adapter, config, key);
  return Object.keys(mods).filter(id => (mods[id]?.attributes?.[attr] === key)
    || ((requirement !== undefined) && (mods[id]?.type === requirement.modType)));
}

//Check if a mod is installed. Keyed on the package attribute (and the requirement's mod type),
//never on a name or staging-folder match, which false-positives on prefix collisions.
function isKeyInstalled(adapter, api, gameId, config, key) {
  return keyModIds(adapter, api, gameId, config, key).length > 0;
}

// --- stamping -------------------------------------------------------------

//Set the mod's attributes, enable it, and disable the copy it replaces
function stampMod(adapter, api, gameSpec, config, modId, resolved, previousModIds = []) {
  const gameId = gameSpec.game.id;
  const profileId = selectors.lastActiveProfileForGame(api.getState(), gameId);
  const key = adapter.refKey(resolved);
  const batched = [
    actions.setModsEnabled(api, profileId, [modId], true, {
      allowAutoDeploy: true,
      installed: true,
    }),
    actions.setModAttribute(gameId, modId, 'version', resolved.version || ''),
    actions.setModAttribute(gameId, modId, versionAttribute(adapter, config), resolved.version || ''),
    actions.setModAttribute(gameId, modId, packageAttribute(adapter, config), key),
    actions.setModAttribute(gameId, modId, 'source', 'website'),
    actions.setModAttribute(gameId, modId, 'url', resolved.pageUrl || ''), // shown as the mod's "Source" link (only rendered when source === 'website')
    actions.setModAttribute(gameId, modId, 'customFileName', displayName(adapter, resolved, key)), // Vortex renders customFileName || logicalFileName || fileName || name - without this the mod list shows the raw archive name
  ];
  const extra = (adapter.extraAttributes !== undefined) ? adapter.extraAttributes(config, resolved) : [];
  for (const [name, value] of extra) {
    batched.push(actions.setModAttribute(gameId, modId, name, value));
  }
  for (const oldModId of previousModIds) { // an update installs a second mod entry rather than replacing the first
    if (oldModId !== modId) {
      batched.push(actions.setModEnabled(profileId, oldModId, false));
    }
  }
  util.batchDispatch(api.store, batched);
}

// --- fetching a source Vortex cannot download itself -----------------------

// Most sources hand their download URL to Vortex's download manager, which fetches it in the
// main process. A few cannot be fetched that way at all - the site's bot protection rejects the
// main process outright, or the URL is single-use and dies on the hand-off. Those declare
// fetchStrategy: 'click' and a fetchToFile, which fetches the bytes in the renderer, where fetch
// uses the real Chromium network stack, and returns a local path.

function usesClickFetch(adapter) {
  return (adapter.fetchStrategy === 'click') && (adapter.fetchToFile !== undefined);
}

// The fetched file is handed to Vortex as an imported download, so everything downstream - the
// install, the mod entry, the attributes - is the normal pipeline. 'import-downloads' MOVES the
// file into the download folder, so there is nothing left in temp to clean up afterwards.
// It also calls back with (dlIds) and no error argument, unlike every other event here, so it
// cannot go through util.toPromise - that would read the id array as the error and reject.
async function importFetchedFile(adapter, api, config, url) {
  const filePath = await adapter.fetchToFile(config, url);
  if ((filePath === null) || (filePath === undefined)) {
    throw new util.ProcessCanceled(`Could not fetch ${url}`);
  }
  return new Promise((resolve, reject) => {
    api.events.emit('import-downloads', [filePath], (dlIds) => {
      const dlId = dlIds?.[0];
      return (dlId === undefined) ? reject(new util.NotFound(filePath)) : resolve(dlId);
    });
  });
}

// --- install --------------------------------------------------------------

//Download and install one mod. Managed requirements are handed to the adopter's requirement
//installer instead, so they land in their own mod type.
async function installRef(adapter, api, gameSpec, config, ref, options = {}) {
  const gameId = gameSpec.game.id;
  const pageId = browserPageId(adapter, gameSpec, config);
  const key = adapter.refKey(ref);
  const requirement = findRequirement(adapter, config, key);
  if ((requirement !== undefined) && (config.installRequirement !== undefined)) {
    if (!options.force && isKeyInstalled(adapter, api, gameId, config, key)) {
      return undefined;
    }
    await config.installRequirement(api, gameSpec, requirement);
    return undefined;
  }
  if (!options.force && isKeyInstalled(adapter, api, gameId, config, key)) {
    return undefined;
  }
  const resolved = await resolveRefForInstall(adapter, config, ref);
  if ((resolved === null) || (resolved === undefined) || !resolved.downloadUrl) {
    api.showErrorNotification(`Failed to install ${key}`,
      new util.ProcessCanceled(adapter.unresolvedMessage
        || `The ${adapter.label} API is unreachable or this mod has no downloadable file`),
      { allowReport: false });
    return undefined;
  }
  const name = displayName(adapter, resolved, key);
  const previousModIds = keyModIds(adapter, api, gameId, config, key);
  const NOTIF_ID = `${pageId}-installing-${key}`;
  const { selfStartedUrls } = pageState(pageId);
  selfStartedUrls.add(resolved.downloadUrl);
  api.sendNotification({
    id: NOTIF_ID,
    message: `Installing ${name}`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  try {
    const dlId = usesClickFetch(adapter) //a source the download manager cannot fetch for us
      ? await importFetchedFile(adapter, api, config, resolved.downloadUrl)
      : await util.toPromise(cb =>
        api.events.emit('start-download', [resolved.downloadUrl], { game: gameId, name },
          undefined, cb, undefined, { allowInstall: false }));
    const modId = await util.toPromise(cb =>
      api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
    stampMod(adapter, api, gameSpec, config, modId, resolved, previousModIds);
    return modId;
  } catch (err) { //show the user the mod page if the download/install fails
    api.showErrorNotification(`Failed to download/install ${name}. You must download it manually.`, err);
    if (resolved.pageUrl) {
      util.opn(resolved.pageUrl).catch(() => null);
    }
    return undefined;
  } finally {
    selfStartedUrls.delete(resolved.downloadUrl);
    api.dismissNotification(NOTIF_ID);
  }
}

// --- dependencies ---------------------------------------------------------

//Walk a mod's dependency closure, skipping what is already installed (one API call per mod)
async function collectMissingDependencies(adapter, api, gameSpec, config, ref, resolved) {
  if (adapter.dependencies !== true) {
    return [];
  }
  const gameId = gameSpec.game.id;
  const root = resolved || await resolveRef(adapter, config, ref);
  if (!root) {
    return [];
  }
  const visited = new Set([adapter.refKey(ref)]);
  const missing = [];
  let frontier = root.dependencies || [];
  let depth = 0;
  while ((frontier.length > 0) && (depth < DEPENDENCY_DEPTH_CAP)) {
    const next = [];
    for (const dependency of frontier) {
      const key = adapter.refKey(dependency);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      if (isKeyInstalled(adapter, api, gameId, config, key)) {
        continue; //installed already - and so, by the same route, are its own dependencies
      }
      missing.push(dependency);
      const depResolved = await resolveRef(adapter, config, dependency);
      if (depResolved) {
        next.push(...(depResolved.dependencies || []));
      }
    }
    frontier = next;
    depth += 1;
  }
  return missing;
}

//Ask before installing what a mod depends on, then install the picked ones sequentially
async function promptDependencies(adapter, api, gameSpec, config, ref, resolved) {
  const missing = await collectMissingDependencies(adapter, api, gameSpec, config, ref, resolved);
  if (missing.length === 0) {
    return;
  }
  const result = await api.showDialog('question', 'Install Dependencies', {
    text: `${adapter.refKey(ref)} needs the following ${adapter.label} packages, which are not installed yet. `
        + 'Deselect any you would rather install yourself.',
    checkboxes: missing.map(dependency => ({
      id: adapter.refKey(dependency),
      text: `${adapter.refKey(dependency)} (${dependency.version || 'latest'})`,
      value: true,
    })),
  }, [
    { label: 'Cancel' },
    { label: 'Install' },
  ]);
  if (result.action !== 'Install') {
    return;
  }
  for (const dependency of missing) { //sequentially - parallel requirement installs are unsafe against the downloader module's guard
    if (result.input?.[adapter.refKey(dependency)] === false) {
      continue;
    }
    await installRef(adapter, api, gameSpec, config, dependency).catch(err =>
      log('warn', `Failed to install ${adapter.label} dependency ${adapter.refKey(dependency)}: ${err}`));
  }
}

// --- claiming downloads from the embedded browser -------------------------

function pruneClaims(claimedDownloads) {
  const cutoff = Date.now() - CLAIM_MAX_AGE_MS;
  for (const [dlId, claim] of claimedDownloads) {
    if (claim.claimedAt < cutoff) {
      claimedDownloads.delete(dlId);
    }
  }
}

//Work out which mod a claimed download came from. Some sources say so in the URL; others have
//to be asked, which is why this is a promise the adoption handler awaits.
function identifyClaim(adapter, config, state, partial) {
  if (adapter.identify === undefined) {
    return Promise.resolve(partial);
  }
  return Promise.resolve(adapter.identify(config, state.adapterState, partial));
}

//did-finish-download handler: claim this source's downloads and make sure they get installed once
function claimDownload(adapter, api, gameSpec, config, dlId, dlState) {
  if (dlState !== 'finished') {
    return;
  }
  const state = api.getState();
  const download = state.persistent.downloads?.files?.[dlId];
  if (download === undefined) {
    return;
  }
  const games = Array.isArray(download.game) ? download.game : [download.game];
  if (!games.includes(gameSpec.game.id)) {
    return;
  }
  const pageId = browserPageId(adapter, gameSpec, config);
  const pstate = pageState(pageId);
  if ((download.urls || []).some(url => pstate.selfStartedUrls.has(url))) {
    return; //started by installRef, which drives its own install
  }
  const partial = adapter.parseClaim(download);
  if ((partial === null) || (partial === undefined)) {
    return;
  }
  pruneClaims(pstate.claimedDownloads);
  // The claim is recorded synchronously and identified in the background: core may start the
  // install immediately, and the download id has to be claimed before that install lands.
  const claimedAt = Date.now();
  pstate.claimedDownloads.set(dlId, {
    claimedAt,
    identified: identifyClaim(adapter, config, pstate, partial)
      .then((ref) => { //timings: the claim path may run against a rate-limited API, so name the slow half
        log('info', `identified a browsed ${adapter.label} download`, {
          dlId,
          claim: partial,
          item: ((ref !== null) && (ref !== undefined)) ? adapter.refKey(ref) : 'unknown',
          elapsedMS: Date.now() - claimedAt,
        });
        return ref;
      })
      .catch(err => {
        log('warn', `Failed to identify a claimed ${adapter.label} download: ${err}`);
        return null;
      }),
  });
  // Core installs the download itself when "Install mods when downloaded" is on and the download
  // carries no allowInstall override - which is exactly the shape of a browser capture. Starting a
  // second install here would install the archive twice, so only start one when core will not.
  const autoInstall = util.getSafe(state, ['settings', 'automation', 'install'], false);
  log('info', `claimed a ${adapter.label} download from the browse page`, {
    dlId, claim: partial, autoInstall, installStartedBy: autoInstall ? 'core' : 'browser module',
  });
  if (!autoInstall) {
    api.events.emit('start-install-download', dlId, { allowAutoEnable: false });
  }
}

// A click source's downloads are started by Vortex before this module ever sees them: the site's
// own button hands the URL to Chromium, Chromium hands it to Vortex's download manager, and the
// download manager is the one client the host refuses. The download therefore fails - and a failed
// download emits no did-finish-download at all, because that event only ever fires with 'finished'
// (Vortex emits it from finalizeDownload, which runs on success). So the failure is watched for in
// the download state instead, and the transfer is redone the only way that works for this source:
// fetched here, in the renderer, exactly as installRef would have done for a click-through.
async function recoverFailedDownload(adapter, api, gameSpec, config, dlId, download) {
  const gameId = gameSpec.game.id;
  const games = Array.isArray(download.game) ? download.game : [download.game];
  if (!games.includes(gameId)) {
    return;
  }
  const partial = adapter.parseClaim(download);
  if ((partial === null) || (partial === undefined)) {
    return; //a failed download from somewhere else entirely
  }
  const pstate = pageState(browserPageId(adapter, gameSpec, config));
  if (pstate.recovering.has(dlId)) {
    return;
  }
  pstate.recovering.add(dlId);
  try {
    const ref = await identifyClaim(adapter, config, pstate, partial);
    if ((ref === null) || (ref === undefined)) {
      log('warn', `A failed ${adapter.label} download could not be identified - leaving it alone`,
        { dlId, claim: partial });
      return;
    }
    log('info', `taking over a ${adapter.label} download the download manager could not fetch`,
      { dlId, item: adapter.refKey(ref) });
    // The failed entry is removed first: the install that follows produces its own download, and
    // leaving the failure behind would show the user two rows for one click.
    await util.toPromise(cb => api.events.emit('remove-download', dlId, cb))
      .catch(err => log('warn', `Could not remove the failed ${adapter.label} download: ${err}`));
    // force, because the user clicked download on a mod they may already have
    await installRef(adapter, api, gameSpec, config, ref, { force: true });
  } finally {
    pstate.recovering.delete(dlId);
  }
}

//did-install-mod handler: stamp the attributes on a claimed install and offer its dependencies
async function adoptMod(adapter, api, gameSpec, config, gameId, archiveId, modId) {
  if (gameId !== gameSpec.game.id) {
    return;
  }
  const pstate = pageState(browserPageId(adapter, gameSpec, config));
  const claim = pstate.claimedDownloads.get(archiveId);
  if (claim === undefined) {
    return;
  }
  pstate.claimedDownloads.delete(archiveId);
  const ref = await claim.identified;
  if ((ref === null) || (ref === undefined)) {
    return; //nothing to stamp it with - the archive stays a plain mod
  }
  const resolveStart = Date.now();
  const resolved = await resolveRefForInstall(adapter, config, ref);
  if ((resolved === null) || (resolved === undefined)) {
    log('warn', `Installed a browsed ${adapter.label} mod but could not resolve ${adapter.refKey(ref)} - it stays unstamped`);
    return;
  }
  log('info', `stamping a browsed ${adapter.label} mod`, {
    modId, item: adapter.refKey(resolved), version: resolved.version,
    resolveMS: Date.now() - resolveStart, sinceClaimMS: Date.now() - claim.claimedAt,
  });
  // No setModType here: the adopter's own installers decide the type, and a blanket assignment
  // would drop a mod loader into the plugin folder.
  const key = adapter.refKey(resolved);
  const previousModIds = keyModIds(adapter, api, gameId, config, key).filter(id => id !== modId);
  stampMod(adapter, api, gameSpec, config, modId, resolved, previousModIds);
  if (adapter.dependencies === true) { //no resolved record passed: the dependency walk needs the
    //authoritative lookup, which resolveForInstall is allowed to skip
    promptDependencies(adapter, api, gameSpec, config, resolved).catch(err =>
      log('warn', `Failed to resolve ${adapter.label} dependencies for ${key}: ${err}`));
  }
}

// --- update checks --------------------------------------------------------

function installedInfo(adapter, config, mod) {
  if (adapter.installedInfo !== undefined) {
    return adapter.installedInfo(config, mod, {
      package: packageAttribute(adapter, config),
      version: versionAttribute(adapter, config),
    });
  }
  return { version: mod?.attributes?.[versionAttribute(adapter, config)] || mod?.attributes?.version };
}

function compareInstalled(adapter, candidate, known) {
  return (adapter.compareInstalled !== undefined)
    ? adapter.compareInstalled(candidate, known)
    : isNewerVersion(candidate.version, known.version);
}

function isUpdate(adapter, resolved, installed) {
  return (adapter.isUpdate !== undefined)
    ? adapter.isUpdate(resolved, installed)
    : isNewerVersion(resolved.version, installed.version);
}

function updateRef(adapter, parsed, resolved) {
  return (adapter.updateRef !== undefined)
    ? adapter.updateRef(parsed, resolved)
    : { ...parsed, version: resolved.version };
}

//Check the source for newer versions of the mods installed through this page.
//Managed requirements are skipped - the requirements downloader already checks those.
async function checkModUpdates(adapter, api, gameSpec, config) {
  const gameId = gameSpec.game.id;
  const state = api.getState();
  const mods = state.persistent.mods?.[gameId] || {};
  const attr = packageAttribute(adapter, config);
  const pageId = browserPageId(adapter, gameSpec, config);
  const tracked = new Map();
  for (const mod of Object.values(mods)) {
    const key = mod?.attributes?.[attr];
    if (!key || (findRequirement(adapter, config, key) !== undefined)) {
      continue;
    }
    const installed = installedInfo(adapter, config, mod);
    const known = tracked.get(key);
    if ((known === undefined) || compareInstalled(adapter, installed, known)) { //compare against the newest copy installed
      tracked.set(key, installed);
    }
  }
  for (const [key, installed] of tracked) {
    const parsed = adapter.parseKey(key);
    if ((parsed === null) || (parsed === undefined)) {
      continue;
    }
    const resolved = await resolveRef(adapter, config, parsed);
    if (!resolved || !isUpdate(adapter, resolved, installed)) {
      continue;
    }
    const ref = updateRef(adapter, parsed, resolved);
    api.sendNotification({
      id: `${pageId}-update-${key}`,
      type: 'warning',
      message: `${displayName(adapter, resolved, key)} update available (${resolved.version})`,
      allowSuppress: true,
      actions: [
        {
          title: 'Download',
          action: (dismiss) => {
            installRef(adapter, api, gameSpec, config, ref, { force: true }).catch(() => null);
            dismiss();
          },
        },
      ],
    });
  }
}

// --- the page -------------------------------------------------------------

//Build the page component for one adopter
function makeBrowsePage(adapter, gameSpec, config) {
  const HOME_URL = adapter.homeUrl(config);
  const PAGE_ID = browserPageId(adapter, gameSpec, config);
  const VIEW_ID = `${PAGE_ID}-webview`;
  const AD_CSS = adHidingCss(adapter, config);
  const HOME_TOOLTIP = config.homeTooltip || adapterDefault(adapter, 'homeTooltip', `Back to the ${adapter.label} home page`);

  return function BrowsePage(props) {
    const { Button } = require('react-bootstrap');
    const api = props.api;
    const pstate = pageState(PAGE_ID);
    const [confirmed, setConfirmed] = React.useState(pstate.confirmed || (config.confirmExternal === false));
    const [loading, setLoading] = React.useState(false);
    const [nav, setNav] = React.useState({ entries: [HOME_URL], idx: 0 });
    const viewRef = React.useRef(null);
    const navRef = React.useRef(nav);

    React.useEffect(() => { navRef.current = nav; }, [nav]);

    //The control exposes loadURL but no history API, so history is kept here
    const loadUrl = React.useCallback((url) => {
      try {
        viewRef.current?.loadURL?.(url);
      } catch (err) {
        log('warn', `Failed to navigate the ${adapter.label} browser to ${url}: ${err}`);
      }
    }, []);

    const pushUrl = React.useCallback((url) => setNav(prev => {
      const clean = String(url).replace(/\/+$/, '');
      if (clean === String(prev.entries[prev.idx]).replace(/\/+$/, '')) {
        return prev;
      }
      const entries = prev.entries.slice(0, prev.idx + 1).concat(url);
      return { entries, idx: entries.length - 1 };
    }), []);

    const install = React.useCallback((ref) => {
      installRef(adapter, api, gameSpec, config, ref)
        .then(() => ((adapter.dependencies === true)
          ? promptDependencies(adapter, api, gameSpec, config, ref)
          : undefined))
        .catch(err => log('warn', `${adapter.label} install from the browser page failed: ${err}`));
    }, [api]);

    // A download URL is not a page: with the default 'capture' strategy the view is simply
    // asked for it, so Vortex's own chain turns it into a download the claim handler then sees.
    // A 'click' source - one whose bytes Vortex's download manager cannot fetch itself - hands
    // the URL to the adapter, which fetches it in the renderer and imports the result.
    const requestDownload = React.useCallback((url, navigated) => {
      if (usesClickFetch(adapter)) {
        //An imported download carries no source URL, so the claim handler will never see it -
        //this drives the install itself. An adapter that wants the mod stamped routes the click
        //through ctx.install(ref) instead, which is installRef and does the whole job.
        importFetchedFile(adapter, api, config, url)
          .then(dlId => api.events.emit('start-install-download', dlId, { allowAutoEnable: false }))
          .catch(err => log('warn', `Failed to fetch a ${adapter.label} download: ${err}`));
        return;
      }
      if (!navigated) { //keep it out of the history the Back button walks
        loadUrl(url);
      }
    }, [api, loadUrl]);

    //Where every URL the page is asked to open is decided: the adapter gets first refusal,
    //then an allowed host stays in the view and anything else leaves it
    const handleUrl = React.useCallback((url, navigated) => {
      if (adapter.routeUrl !== undefined) {
        const ctx = { config, adapterState: pstate.adapterState, install, loadUrl, requestDownload, navigated };
        if (adapter.routeUrl(ctx, url, navigated) === true) {
          return;
        }
      }
      if (isHostAllowed(adapter, config, url)) {
        if (navigated) {
          pushUrl(url);
        } else {
          loadUrl(url);
          pushUrl(url);
        }
        return;
      }
      if (isBlockedHost(adapter, config, url)) { //an ad click or pop-under: drop it rather than open a browser
        log('debug', `Blocked an ad destination from the ${adapter.label} browser: ${url}`);
      } else {
        util.opn(url).catch(() => null); //off-site links open in the system browser, never in the page
      }
      if (navigated) { //the view already left the allow-list - bring it back
        loadUrl(navRef.current.entries[navRef.current.idx]);
      }
    }, [install, loadUrl, pushUrl, requestDownload]);

    //The control wires only a fixed event set, so navigation events are attached to the DOM node
    React.useEffect(() => {
      if (!confirmed) {
        return undefined;
      }
      const node = globalThis.document.getElementById(VIEW_ID);
      if (node === null) {
        return undefined;
      }
      const onNavigate = (evt) => handleUrl((typeof evt === 'string') ? evt : evt.url, true);
      //Injected CSS lasts for one document, so it goes on every dom-ready rather than once on mount
      const onDomReady = () => {
        if ((AD_CSS === '') || (typeof node.insertCSS !== 'function')) {
          return;
        }
        Promise.resolve(node.insertCSS(AD_CSS))
          .catch(err => log('debug', `Could not hide ads in the ${adapter.label} browser: ${err}`));
      };
      node.addEventListener('did-navigate', onNavigate);
      node.addEventListener('did-navigate-in-page', onNavigate);
      node.addEventListener('dom-ready', onDomReady);
      return () => { //a listener left on a destroyed guest is a leak
        node.removeEventListener('did-navigate', onNavigate);
        node.removeEventListener('did-navigate-in-page', onNavigate);
        node.removeEventListener('dom-ready', onDomReady);
      };
    }, [confirmed, handleUrl]);

    const goTo = React.useCallback((idx) => {
      const entries = navRef.current.entries;
      const clamped = Math.min(Math.max(idx, 0), entries.length - 1);
      loadUrl(entries[clamped]);
      setNav(prev => ({ ...prev, idx: clamped }));
    }, [loadUrl]);

    const currentUrl = nav.entries[nav.idx];

    if (!confirmed) {
      return React.createElement(MainPage, null,
        React.createElement(MainPage.Body, null,
          React.createElement('div', { style: { padding: '16px', maxWidth: '720px' } },
            React.createElement('h4', null, 'Attention'),
            React.createElement('p', null, 'Vortex is about to open an external web page:'),
            React.createElement('p', null, React.createElement('b', null, HOME_URL)),
            React.createElement('p', null,
              'Vortex is based on Electron, which is based on Chrome but will not always be the newest '
              + 'version, and we cannot rule out security issues in the embedded browser itself.'),
            React.createElement('p', null,
              'If you have security concerns or do not fully trust this page, please do not continue.'),
            React.createElement(Button, {
              onClick: () => { //remembered for the session, so leaving and returning does not re-ask
                pstate.confirmed = true;
                setConfirmed(true);
              },
            }, 'Continue'),
          )
        )
      );
    }

    return React.createElement(MainPage, null,
      React.createElement(MainPage.Header, null,
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', width: '100%' } },
          React.createElement(tooltip.IconButton, {
            icon: 'nav-back',
            tooltip: 'Back',
            disabled: nav.idx === 0,
            onClick: () => goTo(navRef.current.idx - 1),
          }),
          React.createElement(tooltip.IconButton, {
            icon: 'nav-forward',
            tooltip: 'Forward',
            disabled: nav.idx === nav.entries.length - 1,
            onClick: () => goTo(navRef.current.idx + 1),
          }),
          React.createElement(tooltip.IconButton, {
            icon: 'refresh',
            tooltip: 'Reload',
            onClick: () => loadUrl(currentUrl),
          }),
          React.createElement(tooltip.Button, {
            id: `${VIEW_ID}-home`,
            tooltip: HOME_TOOLTIP,
            onClick: () => handleUrl(HOME_URL, false),
          }, 'Home'),
          React.createElement('div', {
            style: {
              flex: 1,
              padding: '0 8px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              opacity: 0.8,
            },
          }, currentUrl),
          loading ? React.createElement(Spinner, null) : null,
          React.createElement(tooltip.IconButton, {
            icon: 'open-ext',
            tooltip: 'Open in your browser',
            onClick: () => util.opn(currentUrl).catch(() => null),
          }),
        )
      ),
      React.createElement(MainPage.Body, null,
        React.createElement(FlexLayout, { type: 'column', style: { height: '100%' } },
          React.createElement(FlexLayout.Flex, { style: { height: '100%' } },
            React.createElement(Webview, {
              id: VIEW_ID,
              src: HOME_URL,
              style: { width: '100%', height: '100%' },
              onLoading: setLoading,
              onNewWindow: (url) => handleUrl(url, false),
              ref: (ref) => { viewRef.current = ref; },
            })
          )
        )
      )
    );
  };
}

// --- registration ---------------------------------------------------------

//Register the browse page. Called from applyGame().
function registerBrowser(adapter, context, gameSpec, config) {
  const gameId = gameSpec.game.id;
  context.registerMainPage(config.icon || adapterDefault(adapter, 'icon', 'search'),
    config.pageTitle || adapterDefault(adapter, 'pageTitle', 'Browse Mods'),
    makeBrowsePage(adapter, gameSpec, config), {
      id: browserPageId(adapter, gameSpec, config),
      priority: (config.priority !== undefined) ? config.priority : 40,
      group: config.pageGroup || 'per-game',
      hotkey: config.hotkey,
      mdi: config.mdi || adapterDefault(adapter, 'mdi', undefined),
      visible: () => selectors.activeGameId(context.api.getState()) === gameId,
      props: () => ({ api: context.api }),
    });
}

//Install the event handlers the page relies on. Called from context.once().
function onceBrowser(adapter, api, gameSpec, config) {
  api.events.on('did-finish-download', (dlId, dlState) => {
    try {
      claimDownload(adapter, api, gameSpec, config, dlId, dlState);
    } catch (err) {
      log('warn', `Failed to claim a ${adapter.label} download: ${err}`);
    }
  });
  //the promise is returned rather than dropped: an event emitter ignores it, but it is what
  //makes the claim -> stamp path awaitable from a test
  api.events.on('did-install-mod', (gameId, archiveId, modId) =>
    adoptMod(adapter, api, gameSpec, config, gameId, archiveId, modId)
      .catch(err => log('warn', `Failed to adopt a ${adapter.label} mod: ${err}`)));
  api.onAsync('check-mods-version', (gameId) => {
    if (gameId !== gameSpec.game.id) {
      return Promise.resolve();
    }
    return checkModUpdates(adapter, api, gameSpec, config)
      .catch(err => log('warn', `Failed to check for ${adapter.label} mod updates: ${err}`));
  });
  // A click source's downloads reach this module as failures rather than as finished downloads,
  // and there is no event for a failed one - see recoverFailedDownload. onStateChange is optional
  // on IExtensionApi, so an older host simply does not get the recovery.
  if (usesClickFetch(adapter) && (typeof api.onStateChange === 'function')) {
    api.onStateChange(['persistent', 'downloads', 'files'], (previous, current) => {
      for (const dlId of Object.keys(current || {})) {
        if ((current[dlId]?.state !== 'failed') || (previous?.[dlId]?.state === 'failed')) {
          continue; //only the transition into failure, and only once
        }
        recoverFailedDownload(adapter, api, gameSpec, config, dlId, current[dlId])
          .catch(err => log('warn', `Failed to take over a ${adapter.label} download: ${err}`));
      }
    });
  }
}

// --- module factory -------------------------------------------------------

//Bind an adapter to the shared implementation. The returned functions take the same arguments
//every source module has always taken, so a source module is a thin re-export of these.
function createBrowserModule(adapter) {
  return {
    registerBrowser: (context, gameSpec, config) =>
      registerBrowser(adapter, context, gameSpec, config),
    onceBrowser: (api, gameSpec, config) =>
      onceBrowser(adapter, api, gameSpec, config),
    makeBrowsePage: (gameSpec, config) =>
      makeBrowsePage(adapter, gameSpec, config),
    installItem: (api, gameSpec, config, ref, options) =>
      installRef(adapter, api, gameSpec, config, ref, options),
    isItemInstalled: (api, gameId, config, key) =>
      isKeyInstalled(adapter, api, gameId, config, key),
    checkModUpdates: (api, gameSpec, config) =>
      checkModUpdates(adapter, api, gameSpec, config),
    promptDependencies: (api, gameSpec, config, ref, resolved) =>
      promptDependencies(adapter, api, gameSpec, config, ref, resolved),
    // exposed for adapters and their tests
    pageId: (gameSpec, config) => browserPageId(adapter, gameSpec, config),
    pageState: (gameSpec, config) => pageState(browserPageId(adapter, gameSpec, config)),
    isHostAllowed: (config, url) => isHostAllowed(adapter, config, url),
    adHidingCss: (config) => adHidingCss(adapter, config),
    isBlockedHost: (config, url) => isBlockedHost(adapter, config, url),
  };
}

module.exports = {
  createBrowserModule,
  isNewerVersion,
  normalizeVersion,
};
