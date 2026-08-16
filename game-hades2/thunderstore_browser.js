'use strict';

// Shared Thunderstore browser page for Vortex game extensions.
//
// Registers a sidebar page that embeds the live thunderstore.io community site
// inside Vortex. The user browses the real site - search, categories, mod pages,
// screenshots - and a click on a download link becomes a managed Vortex install:
// the archive is claimed, the mod is enabled, its package and version are stamped
// as attributes, and its Thunderstore dependencies are offered for installation.
//
// Vortex already turns a download started inside embedded content into a normal
// Vortex download (will-download -> received-url -> start-download-url -> the
// https protocol handler), so this module intercepts nothing. It waits for the
// finished download, recognises the Thunderstore URL, and takes over from there.
//
// All game-specific knowledge arrives in one config object, so a second game
// adopts the module by copying this file and writing a config. Every adopter
// carries a byte-identical copy of the canonical file in resources/browsers/.
//
// Config:
//   tsCommunity          (required) community slug - sets the home URL
//   requirements         the adopter's requirement table, for dependency routing
//   installRequirement   (api, gameSpec, requirement) => Promise, adopter-injected
//   packageAttribute     mod attribute holding "Namespace-Name" (default thunderstorePackage)
//   versionAttribute     mod attribute holding the installed version (default thunderstoreVersion)
//   allowedHosts         hosts the embedded view may navigate to
//   confirmExternal      show the external-content confirmation before first load (default true)
//   pageId / pageTitle / hotkey / icon / mdi / priority / pageGroup   page identity
//
// Public API: registerThunderstoreBrowser, onceThunderstoreBrowser,
// makeThunderstoreBrowsePage, installThunderstorePackage,
// resolveThunderstorePackage, isThunderstorePackageInstalled,
// checkThunderstoreModUpdates.

const semver = require('semver');
const React = require('react');
const { actions, log, selectors, util, MainPage, FlexLayout, Spinner, Webview, tooltip } = require('vortex-api');

const API_BASE = 'https://thunderstore.io';

// Mod attributes. Dedicated attributes rather than the standard 'version' one because
// Vortex's md5 meta lookup can overwrite 'version' with data from an unrelated Nexus match.
const DEFAULT_PACKAGE_ATTRIBUTE = 'thunderstorePackage';
const DEFAULT_VERSION_ATTRIBUTE = 'thunderstoreVersion';

// Hosts the embedded view stays on. gcdn is where package downloads redirect to.
const DEFAULT_ALLOWED_HOSTS = ['thunderstore.io', 'gcdn.thunderstore.io'];

// Sidebar icon: Thunderstore's own bolt mark, taken from the brand SVG
// (thunderstore-io/Thunderstore, django/static/ts-logo-horizontal.svg) and scaled from its
// 504x76 viewBox to the 24x24 one Vortex icons use. Two subpaths, no fill-rule dependency.
const DEFAULT_MDI = 'M0.43 13.16L5.09 21.27 7.24 16.81 4.89 12.71C4.63 12.26 4.63 11.74 4.89 11.28L7.83 6.18C8.09 5.72 8.54 5.46 9.06 5.46H10.64L7.58 12.34H11.36L6.22 22.3 16.54 9.94H13.37L15.54 5.46H19.33 21.53L23.89 1.36H17.14 12.64 7.22C6.37 1.36 5.63 1.78 5.21 2.52L0.43 10.84C0 11.58 0 12.43 0.43 13.16ZM7.57 22.64H16.78C17.63 22.64 18.37 22.22 18.79 21.48L23.58 13.16C24 12.43 24 11.58 23.58 10.84L21.66 7.51H16.94L19.11 11.28C19.37 11.74 19.37 12.26 19.11 12.71L16.18 17.82C15.91 18.28 15.46 18.54 14.94 18.54H12.8L11.32 18.52 7.57 22.64Z';

// How deep the dependency walk follows a package's own dependencies.
const DEPENDENCY_DEPTH_CAP = 5;

// Claimed downloads that never produced an install (the user cancelled it) are pruned this old.
const CLAIM_MAX_AGE_MS = 60 * 60 * 1000;

// --- config helpers -------------------------------------------------------

function packageAttribute(config) {
  return config.packageAttribute || DEFAULT_PACKAGE_ATTRIBUTE;
}

function versionAttribute(config) {
  return config.versionAttribute || DEFAULT_VERSION_ATTRIBUTE;
}

function browserPageId(gameSpec, config) {
  return config.pageId || `${gameSpec.game.id}-thunderstore-browse`;
}

//Community landing page - what the embedded view opens on, and what Home returns to
function homeUrl(config) {
  return `${API_BASE}/c/${config.tsCommunity}/`;
}

//Package page for a reference, used as the mod's "Source" link
function packagePageUrl(config, ref) {
  return config.tsCommunity
    ? `${API_BASE}/c/${config.tsCommunity}/p/${ref.namespace}/${ref.name}/`
    : `${API_BASE}/package/${ref.namespace}/${ref.name}/`;
}

//Direct download for a specific version - predictable, no API call needed
function packageDownloadUrl(ref) {
  return `${API_BASE}/package/download/${ref.namespace}/${ref.name}/${ref.version}/`;
}

//"Namespace-Name" - the key everything in this module is tracked by
function packageKey(ref) {
  return `${ref.namespace}-${ref.name}`;
}

//Thunderstore namespaces and package names are [a-zA-Z0-9_] only, so the first hyphen splits them
function parsePackageKey(key) {
  const idx = String(key || '').indexOf('-');
  if (idx <= 0) {
    return null;
  }
  return { namespace: key.slice(0, idx), name: key.slice(idx + 1) };
}

function allowedHosts(config) {
  return config.allowedHosts || DEFAULT_ALLOWED_HOSTS;
}

//Whether the embedded view is allowed to stay on this URL
function isHostAllowed(config, url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return allowedHosts(config).some(allowed =>
      (host === allowed) || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

// Versions are semver by convention but authors still ship "v"-prefixed and short forms.
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

// --- package reference parsing --------------------------------------------

// thunderstore.io/package/download/{namespace}/{name}/{version}/ - what a "Manual Download" click hits
const DOWNLOAD_URL_RE = /thunderstore\.io\/package\/download\/([^/?#]+)\/([^/?#]+)\/([^/?#]+)/i;
// the CDN zip the download URL redirects to
const CDN_URL_RE = /gcdn\.thunderstore\.io\/[^?#]*\/([^/?#]+)-([^/?#]+)-(\d[^/?#]*)\.zip/i;
// the "Install with Mod Manager" button's protocol link
const ROR2MM_URL_RE = /^ror2mm:\/\/v1\/install\/[^/]+\/([^/]+)\/([^/]+)\/([^/]+)/i;
// Namespace-Name-Version.zip, the archive name Thunderstore always serves
const ARCHIVE_NAME_RE = /^([^-]+)-([^-]+)-(\d[^-]*)\.zip$/i;

//Parse a package reference out of a URL (returns null when it is not a Thunderstore package URL)
function parsePackageRef(url) {
  const input = String(url || '');
  const matched = DOWNLOAD_URL_RE.exec(input)
    || CDN_URL_RE.exec(input)
    || ROR2MM_URL_RE.exec(input);
  if (!matched) {
    return null;
  }
  return { namespace: matched[1], name: matched[2], version: matched[3].replace(/\/$/, '') };
}

//Parse a package reference out of an archive file name
function parseArchiveRef(fileName) {
  const matched = ARCHIVE_NAME_RE.exec(String(fileName || ''));
  if (!matched) {
    return null;
  }
  return { namespace: matched[1], name: matched[2], version: matched[3] };
}

//A dependency, however the API spelled it, as { namespace, name, version }
function parseDependency(entry) {
  if (entry && (typeof entry === 'object')) {
    if (entry.namespace && entry.name) {
      return { namespace: entry.namespace, name: entry.name, version: entry.version_number || entry.version };
    }
    return parseDependency(entry.full_name || entry.package_name);
  }
  const parts = String(entry || '').split('-');
  if (parts.length < 3) {
    return null;
  }
  const version = parts.pop();
  const name = parts.pop();
  return { namespace: parts.join('-'), name, version };
}

function dependencyRefs(dependencies) {
  return (dependencies || []).map(parseDependency).filter(ref => ref !== null);
}

// --- Thunderstore API -----------------------------------------------------

//Resolve a package's current version, download URL and dependencies (null when unreachable)
async function resolveThunderstorePackage(config, namespace, name) {
  if (config.tsCommunity) {
    try {
      const listing = await util.jsonRequest(`${API_BASE}/api/cyberstorm/listing/${config.tsCommunity}/${namespace}/${name}/`);
      if (listing?.latest_version_number) {
        const version = String(listing.latest_version_number);
        return {
          namespace,
          name,
          version,
          downloadUrl: listing.download_url || packageDownloadUrl({ namespace, name, version }),
          dependencies: dependencyRefs(listing.dependencies),
          isDeprecated: !!listing.is_deprecated,
        };
      }
    } catch (err) { //not listed in this community - the community-independent endpoint still works
      log('debug', `Thunderstore listing lookup failed for ${namespace}/${name}: ${err}`);
    }
  }
  try {
    const data = await util.jsonRequest(`${API_BASE}/api/experimental/package/${namespace}/${name}/`);
    const latest = data?.latest;
    if (latest?.version_number) {
      const version = String(latest.version_number);
      return {
        namespace,
        name,
        version,
        downloadUrl: latest.download_url || packageDownloadUrl({ namespace, name, version }),
        dependencies: dependencyRefs(latest.dependencies),
        isDeprecated: !!data.is_deprecated,
      };
    }
  } catch (err) {
    log('warn', `Could not resolve Thunderstore package ${namespace}/${name}: ${err}`);
  }
  return null;
}

// --- installed detection --------------------------------------------------

//The adopter's requirement entry for a package key, if it manages that package itself
function findRequirement(config, key) {
  return (config.requirements || []).find(req => `${req.tsNamespace}-${req.tsName}` === key);
}

//Mod ids carrying a package key - by attribute for browsed mods, by mod type for managed requirements
function packageModIds(api, gameId, config, key) {
  const state = api.getState();
  const mods = state.persistent.mods?.[gameId] || {};
  const attr = packageAttribute(config);
  const requirement = findRequirement(config, key);
  return Object.keys(mods).filter(id => (mods[id]?.attributes?.[attr] === key)
    || ((requirement !== undefined) && (mods[id]?.type === requirement.modType)));
}

//Check if a package is installed. Keyed on the package attribute (and the requirement's mod type),
//never on a name or staging-folder match, which false-positives on prefix collisions.
function isThunderstorePackageInstalled(api, gameId, config, key) {
  return packageModIds(api, gameId, config, key).length > 0;
}

// --- install --------------------------------------------------------------

// URLs this module started downloads for. The claim handler ignores them: those installs are
// driven inline and would otherwise be started a second time.
const selfStartedUrls = new Set();

// Downloads claimed from the embedded browser, keyed by download id. The attributes are stamped
// when the matching install lands, because the install may be started by core rather than here.
const claimedDownloads = new Map();

function pruneClaims() {
  const cutoff = Date.now() - CLAIM_MAX_AGE_MS;
  for (const [dlId, claim] of claimedDownloads) {
    if (claim.claimedAt < cutoff) {
      claimedDownloads.delete(dlId);
    }
  }
}

//Set the mod's attributes, enable it, and disable the copy it replaces
function stampThunderstoreMod(api, gameSpec, config, modId, ref, previousModIds = []) {
  const gameId = gameSpec.game.id;
  const profileId = selectors.lastActiveProfileForGame(api.getState(), gameId);
  const key = packageKey(ref);
  const batched = [
    actions.setModsEnabled(api, profileId, [modId], true, {
      allowAutoDeploy: true,
      installed: true,
    }),
    actions.setModAttribute(gameId, modId, 'version', ref.version || ''),
    actions.setModAttribute(gameId, modId, versionAttribute(config), ref.version || ''),
    actions.setModAttribute(gameId, modId, packageAttribute(config), key),
    actions.setModAttribute(gameId, modId, 'source', 'website'),
    actions.setModAttribute(gameId, modId, 'url', packagePageUrl(config, ref)), // shown as the mod's "Source" link (only rendered when source === 'website')
    actions.setModAttribute(gameId, modId, 'customFileName', key), // Vortex renders customFileName || logicalFileName || fileName || name - without this the mod list shows the raw archive name
  ];
  for (const oldModId of previousModIds) { // an update installs a second mod entry rather than replacing the first
    if (oldModId !== modId) {
      batched.push(actions.setModEnabled(profileId, oldModId, false));
    }
  }
  util.batchDispatch(api.store, batched);
}

//Download and install one Thunderstore package. Managed requirements are handed to the adopter's
//requirement installer instead, so they land in their own mod type.
async function installThunderstorePackage(api, gameSpec, config, ref, options = {}) {
  const gameId = gameSpec.game.id;
  const key = packageKey(ref);
  const requirement = findRequirement(config, key);
  if ((requirement !== undefined) && (config.installRequirement !== undefined)) {
    if (!options.force && isThunderstorePackageInstalled(api, gameId, config, key)) {
      return undefined;
    }
    await config.installRequirement(api, gameSpec, requirement);
    return undefined;
  }
  if (!options.force && isThunderstorePackageInstalled(api, gameId, config, key)) {
    return undefined;
  }
  let version = ref.version;
  if (!version) {
    const pkg = await resolveThunderstorePackage(config, ref.namespace, ref.name);
    version = pkg?.version;
  }
  if (!version) {
    api.showErrorNotification(`Failed to install ${key}`,
      new util.ProcessCanceled('The Thunderstore API is unreachable and no version was given'),
      { allowReport: false });
    return undefined;
  }
  const resolved = { namespace: ref.namespace, name: ref.name, version };
  const url = packageDownloadUrl(resolved);
  const previousModIds = packageModIds(api, gameId, config, key);
  const NOTIF_ID = `${browserPageId(gameSpec, config)}-installing-${key}`;
  selfStartedUrls.add(url);
  api.sendNotification({
    id: NOTIF_ID,
    message: `Installing ${key}`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  try {
    const dlId = await util.toPromise(cb =>
      api.events.emit('start-download', [url], { game: gameId, name: key }, undefined, cb, undefined, { allowInstall: false }));
    const modId = await util.toPromise(cb =>
      api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
    stampThunderstoreMod(api, gameSpec, config, modId, resolved, previousModIds);
    return modId;
  } catch (err) { //show the user the package page if the download/install fails
    api.showErrorNotification(`Failed to download/install ${key}. You must download it manually.`, err);
    util.opn(packagePageUrl(config, resolved)).catch(() => null);
    return undefined;
  } finally {
    selfStartedUrls.delete(url);
    api.dismissNotification(NOTIF_ID);
  }
}

// --- dependencies ---------------------------------------------------------

//Walk a package's dependency closure, skipping what is already installed (one API call per package)
async function collectMissingDependencies(api, gameSpec, config, ref, pkg) {
  const gameId = gameSpec.game.id;
  const root = pkg || await resolveThunderstorePackage(config, ref.namespace, ref.name);
  if (!root) {
    return [];
  }
  const visited = new Set([packageKey(ref)]);
  const missing = [];
  let frontier = root.dependencies;
  let depth = 0;
  while ((frontier.length > 0) && (depth < DEPENDENCY_DEPTH_CAP)) {
    const next = [];
    for (const dependency of frontier) {
      const key = packageKey(dependency);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      if (isThunderstorePackageInstalled(api, gameId, config, key)) {
        continue; //installed already - and so, by the same route, are its own dependencies
      }
      missing.push(dependency);
      const resolved = await resolveThunderstorePackage(config, dependency.namespace, dependency.name);
      if (resolved) {
        next.push(...resolved.dependencies);
      }
    }
    frontier = next;
    depth += 1;
  }
  return missing;
}

//Ask before installing what a package depends on, then install the picked ones sequentially
async function promptThunderstoreDependencies(api, gameSpec, config, ref, pkg) {
  const missing = await collectMissingDependencies(api, gameSpec, config, ref, pkg);
  if (missing.length === 0) {
    return;
  }
  const result = await api.showDialog('question', 'Install Dependencies', {
    text: `${packageKey(ref)} needs the following Thunderstore packages, which are not installed yet. `
        + 'Deselect any you would rather install yourself.',
    checkboxes: missing.map(dependency => ({
      id: packageKey(dependency),
      text: `${packageKey(dependency)} (${dependency.version || 'latest'})`,
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
    if (result.input?.[packageKey(dependency)] === false) {
      continue;
    }
    await installThunderstorePackage(api, gameSpec, config, dependency).catch(err =>
      log('warn', `Failed to install Thunderstore dependency ${packageKey(dependency)}: ${err}`));
  }
}

// --- claiming downloads from the embedded browser -------------------------

//Recognise a finished download as a Thunderstore package (returns null when it is anything else)
function downloadPackageRef(download) {
  for (const url of (download.urls || [])) {
    const ref = parsePackageRef(url);
    if (ref !== null) {
      return ref;
    }
  }
  const fromThunderstore = (download.urls || []).some(url => {
    try {
      return new URL(url).hostname.toLowerCase().endsWith('thunderstore.io');
    } catch {
      return false;
    }
  });
  return fromThunderstore ? parseArchiveRef(download.localPath) : null;
}

//did-finish-download handler: claim Thunderstore downloads and make sure they get installed once
function claimThunderstoreDownload(api, gameSpec, config, dlId, dlState) {
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
  if ((download.urls || []).some(url => selfStartedUrls.has(url))) {
    return; //started by installThunderstorePackage, which drives its own install
  }
  const ref = downloadPackageRef(download);
  if (ref === null) {
    return;
  }
  pruneClaims();
  claimedDownloads.set(dlId, { ...ref, claimedAt: Date.now() });
  // Core installs the download itself when "Install mods when downloaded" is on and the download
  // carries no allowInstall override - which is exactly the shape of a browser capture. Starting a
  // second install here would install the archive twice, so only start one when core will not.
  const autoInstall = util.getSafe(state, ['settings', 'automation', 'install'], false);
  if (!autoInstall) {
    api.events.emit('start-install-download', dlId, { allowAutoEnable: false });
  }
}

//did-install-mod handler: stamp the attributes on a claimed install and offer its dependencies
function adoptThunderstoreMod(api, gameSpec, config, gameId, archiveId, modId) {
  if (gameId !== gameSpec.game.id) {
    return;
  }
  const claim = claimedDownloads.get(archiveId);
  if (claim === undefined) {
    return;
  }
  claimedDownloads.delete(archiveId);
  const ref = { namespace: claim.namespace, name: claim.name, version: claim.version };
  // No setModType here: the adopter's own installers decide the type, and a blanket assignment
  // would drop a mod loader into the plugin folder.
  const previousModIds = packageModIds(api, gameId, config, packageKey(ref)).filter(id => id !== modId);
  stampThunderstoreMod(api, gameSpec, config, modId, ref, previousModIds);
  promptThunderstoreDependencies(api, gameSpec, config, ref).catch(err =>
    log('warn', `Failed to resolve Thunderstore dependencies for ${packageKey(ref)}: ${err}`));
}

// --- update checks --------------------------------------------------------

//Check the Thunderstore API for newer versions of the mods installed through this page.
//Managed requirements are skipped - the requirements downloader already checks those.
async function checkThunderstoreModUpdates(api, gameSpec, config) {
  const gameId = gameSpec.game.id;
  const state = api.getState();
  const mods = state.persistent.mods?.[gameId] || {};
  const attr = packageAttribute(config);
  const vattr = versionAttribute(config);
  const tracked = new Map();
  for (const mod of Object.values(mods)) {
    const key = mod?.attributes?.[attr];
    if (!key || (findRequirement(config, key) !== undefined)) {
      continue;
    }
    const version = mod?.attributes?.[vattr] || mod?.attributes?.version;
    const known = tracked.get(key);
    if ((known === undefined) || isNewerVersion(version, known)) { //compare against the newest copy installed
      tracked.set(key, version);
    }
  }
  for (const [key, version] of tracked) {
    const parsed = parsePackageKey(key);
    if (parsed === null) {
      continue;
    }
    const pkg = await resolveThunderstorePackage(config, parsed.namespace, parsed.name);
    if (!pkg || !isNewerVersion(pkg.version, version)) {
      continue;
    }
    const ref = { namespace: parsed.namespace, name: parsed.name, version: pkg.version };
    api.sendNotification({
      id: `${browserPageId(gameSpec, config)}-update-${key}`,
      type: 'warning',
      message: `${key} update available (${pkg.version})`,
      allowSuppress: true,
      actions: [
        {
          title: 'Download',
          action: (dismiss) => {
            installThunderstorePackage(api, gameSpec, config, ref, { force: true }).catch(() => null);
            dismiss();
          },
        },
      ],
    });
  }
}

// --- the page -------------------------------------------------------------

//Build the page component for one adopter
function makeThunderstoreBrowsePage(gameSpec, config) {
  const HOME_URL = homeUrl(config);
  const VIEW_ID = `${browserPageId(gameSpec, config)}-webview`;

  return function ThunderstoreBrowsePage(props) {
    const { Button } = require('react-bootstrap');
    const api = props.api;
    const [confirmed, setConfirmed] = React.useState(config.confirmExternal === false);
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
        log('warn', `Failed to navigate the Thunderstore browser to ${url}: ${err}`);
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
      installThunderstorePackage(api, gameSpec, config, ref)
        .then(() => promptThunderstoreDependencies(api, gameSpec, config, ref))
        .catch(err => log('warn', `Thunderstore install from the browser page failed: ${err}`));
    }, [api]);

    //Where every URL the page is asked to open is decided: install link, allowed host, or system browser
    const handleUrl = React.useCallback((url, navigated) => {
      const modManagerRef = ROR2MM_URL_RE.test(url) ? parsePackageRef(url) : null;
      if (modManagerRef !== null) {
        install(modManagerRef);
        return;
      }
      if (isHostAllowed(config, url)) {
        if (navigated) {
          pushUrl(url);
        } else {
          loadUrl(url);
          pushUrl(url);
        }
        return;
      }
      util.opn(url).catch(() => null); //off-site links open in the system browser, never in the page
      if (navigated) { //the view already left the allow-list - bring it back
        loadUrl(navRef.current.entries[navRef.current.idx]);
      }
    }, [install, loadUrl, pushUrl]);

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
      node.addEventListener('did-navigate', onNavigate);
      node.addEventListener('did-navigate-in-page', onNavigate);
      return () => { //a listener left on a destroyed guest is a leak
        node.removeEventListener('did-navigate', onNavigate);
        node.removeEventListener('did-navigate-in-page', onNavigate);
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
            React.createElement(Button, { onClick: () => setConfirmed(true) }, 'Continue'),
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
            tooltip: 'Back to the community page',
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
function registerThunderstoreBrowser(context, gameSpec, config) {
  const gameId = gameSpec.game.id;
  context.registerMainPage(config.icon || 'flash', config.pageTitle || 'Browse Mods',
    makeThunderstoreBrowsePage(gameSpec, config), {
      id: browserPageId(gameSpec, config),
      priority: (config.priority !== undefined) ? config.priority : 40,
      group: config.pageGroup || 'per-game',
      hotkey: config.hotkey,
      mdi: config.mdi || DEFAULT_MDI,
      visible: () => selectors.activeGameId(context.api.getState()) === gameId,
      props: () => ({ api: context.api }),
    });
}

//Install the event handlers the page relies on. Called from context.once().
function onceThunderstoreBrowser(api, gameSpec, config) {
  api.events.on('did-finish-download', (dlId, dlState) => {
    try {
      claimThunderstoreDownload(api, gameSpec, config, dlId, dlState);
    } catch (err) {
      log('warn', `Failed to claim a Thunderstore download: ${err}`);
    }
  });
  api.events.on('did-install-mod', (gameId, archiveId, modId) => {
    try {
      adoptThunderstoreMod(api, gameSpec, config, gameId, archiveId, modId);
    } catch (err) {
      log('warn', `Failed to adopt a Thunderstore mod: ${err}`);
    }
  });
  api.onAsync('check-mods-version', (gameId) => {
    if (gameId !== gameSpec.game.id) {
      return Promise.resolve();
    }
    return checkThunderstoreModUpdates(api, gameSpec, config)
      .catch(err => log('warn', `Failed to check for Thunderstore mod updates: ${err}`));
  });
}

module.exports = {
  registerThunderstoreBrowser,
  onceThunderstoreBrowser,
  makeThunderstoreBrowsePage,
  installThunderstorePackage,
  resolveThunderstorePackage,
  isThunderstorePackageInstalled,
  checkThunderstoreModUpdates,
};
