'use strict';

// Skeleton for a new browser module - copy this to <source>_browser.js and fill it in.
//
// A browser module is an adapter over base_browser.js. The base owns everything that is the
// same for every mod site: the page and its chrome, navigation history, the host allow-list,
// the external-content confirmation, ad hiding and ad-popup dropping, the claim of a finished
// download, the adoption and attribute stamping of the resulting mod, the install driver, the
// optional dependency walk, the update check, and the registration wiring.
//
// This file supplies only what one site does differently: its URL shapes, its API, and its
// key format. Two live examples: thunderstore_browser.js (dependency graph, semver versions,
// predictable download URLs) and gamebanana_browser.js (no dependency graph, free-text
// versions, and a download URL that does not identify the mod it came from).
//
// Rules that are not negotiable:
//   - The file name must end in "browser.js". deploy_to_vortex.py copies bundled modules by
//     that suffix, so a differently named file never reaches a deployed extension.
//   - An adopting extension carries BOTH this module and base_browser.js.
//   - Never setModType. The adopter's own installers decide where a browsed archive lands.
//   - Keep the public export names in the source module's own vocabulary
//     (registerXBrowser, onceXBrowser, ...), so an adopter's index.js reads naturally.

const { log, util } = require('vortex-api'); //util for API calls, log for diagnostics
const { createBrowserModule } = require('./base_browser');

const SITE_BASE = 'https://example.com';
const API_BASE = 'https://example.com/api';

// Dedicated mod attributes rather than the standard 'version' one, because Vortex's md5 meta
// lookup can overwrite 'version' with data from an unrelated Nexus match.
const DEFAULT_PACKAGE_ATTRIBUTE = 'examplePackage';
const DEFAULT_VERSION_ATTRIBUTE = 'exampleVersion';

// Hosts the embedded view stays on: the site and whatever CDN its downloads redirect to.
// Anything else is opened in the system browser instead.
const DEFAULT_ALLOWED_HOSTS = ['example.com'];

// Raw 24x24 SVG path for the sidebar icon. Trace it from the site's own mark, and render it
// (render_svg.py --js-const) before shipping - an icon nobody has looked at is a bug.
const DEFAULT_MDI = 'M12 2L2 22h20z';

// --- URLs and keys --------------------------------------------------------

//Where the page opens, and what the Home button returns to
function homeUrl(config) {
  return `${SITE_BASE}/games/${config.exampleGameId}`;
}

//The identity string stamped on a mod and used as the key for everything else
function itemKey(ref) {
  return `${ref.itemId}`;
}

//The inverse. Return null for a string that is not one of this source's keys - do not borrow
//another source's rule (Thunderstore's "split at the first hyphen" is valid only because its
//ids cannot contain one).
function parseItemKey(key) {
  const matched = /^(\d+)$/.exec(String(key || ''));
  return (matched !== null) ? { itemId: matched[1] } : null;
}

//What a download click hits
const DOWNLOAD_URL_RE = /example\.com\/dl\/(\d+)/i;

// --- the source's API -----------------------------------------------------

//Look up what the source currently publishes for a reference. Return null when it is
//unreachable; the base turns that into a "you must download it manually" notification.
//The record must carry version, downloadUrl and pageUrl; name and dependencies are optional,
//and any extra field survives into extraAttributes.
async function resolveExampleItem(config, ref) {
  try {
    const data = await util.jsonRequest(`${API_BASE}/mods/${ref.itemId}`);
    return {
      itemId: String(ref.itemId),
      name: data?.name || null,
      version: String(data?.version || ''),
      downloadUrl: data?.download_url,
      pageUrl: `${SITE_BASE}/mods/${ref.itemId}`,
    };
  } catch (err) {
    log('warn', `Could not resolve example mod ${itemKey(ref)}: ${err}`);
    return null;
  }
}

//Recognise a finished download as this source's. Return null for anything else - this runs on
//every download Vortex finishes for the game, including ones from Nexus.
function downloadRef(download) {
  for (const url of (download.urls || [])) {
    const matched = DOWNLOAD_URL_RE.exec(String(url || ''));
    if (matched !== null) {
      return { itemId: matched[1] };
    }
  }
  return null;
}

// --- the adapter ----------------------------------------------------------

const adapter = {
  // --- required ---
  id: 'example', //namespaces the page id (<gameId>-example-browse) and the per-page state
  label: 'Example', //appears in messages, notifications and log lines
  homeUrl,
  refKey: itemKey,
  parseKey: parseItemKey,
  requirementKey: (requirement) => String(requirement.exampleItemId), //an adopter requirement -> the same key
  parseClaim: downloadRef,
  resolve: resolveExampleItem,

  // --- defaults a config may override ---
  defaults: {
    packageAttribute: DEFAULT_PACKAGE_ATTRIBUTE,
    versionAttribute: DEFAULT_VERSION_ATTRIBUTE,
    allowedHosts: DEFAULT_ALLOWED_HOSTS,
    icon: 'search', //fallback icon name, used when mdi is absent
    mdi: DEFAULT_MDI,
    pageTitle: 'Browse Mods', //sidebar label
    homeTooltip: 'Back to the game page',
    adSelectors: [], //CSS hidden in the view - per source, they describe one site's markup
    blockedHosts: [], //ad hosts whose links are dropped instead of opening the system browser
  },

  // --- optional ---

  //true only when the source publishes a machine-readable dependency graph, in which case
  //resolve() must return a `dependencies` array of references
  dependencies: false,

  //shown when a reference cannot be resolved
  unresolvedMessage: 'The Example API is unreachable or this mod has no downloadable file',

  //Skip the API when a reference already names the file it wants. Omit when every install
  //needs a lookup anyway; the base then uses resolve().
  //resolveForInstall: (config, ref) => resolveExampleItem(config, ref),

  //Turn what a download URL revealed into a full reference. Omit when the URL already
  //identifies the mod. GameBanana implements this because its URLs do not: the page keeps a
  //ring of recently visited mods in adapterState and the claim is matched against it.
  //identify: (config, adapterState, partial) => Promise.resolve(partial),

  //What the mod list and notifications call the mod. Omit it and the key is used, which is
  //always correct - implement it only when the source publishes a human title.
  displayName: (resolved, key) => resolved.name || key,

  //Extra mod attributes stamped alongside the standard set, as [name, value] pairs
  //extraAttributes: (config, resolved) => [['exampleFileId', Number(resolved.fileId)]],

  //First refusal on every URL the page is asked to open. Return true to consume it; return
  //false to let the base decide (allowed host -> stay in the view, otherwise system browser).
  //ctx: { config, adapterState, install, loadUrl, requestDownload, navigated }
  routeUrl: (ctx, url, navigated) => {
    if (DOWNLOAD_URL_RE.test(url)) {
      ctx.requestDownload(url, navigated); //hand it to the capture chain, not to the history
      return true;
    }
    return false;
  },

  //'capture' (the default) means Vortex's own download manager fetches the bytes once the
  //view requests the URL. Use 'click' only for a source whose downloads Vortex cannot fetch
  //itself - it fetches in the renderer instead and imports the finished file.
  fetchStrategy: 'capture',
  //fetchToFile: (config, url) => downloadInRenderer(url), //required by 'click'

  //Update-check hooks. The defaults compare semver-coerced version strings; override all four
  //when the source's versions are free text and something else (a file id, a timestamp) is the
  //real ordering.
  //installedInfo: (config, mod, attrs) => ({ version: mod?.attributes?.[attrs.version] }),
  //compareInstalled: (candidate, known) => candidate.version > known.version,
  //isUpdate: (resolved, installed) => resolved.version !== installed.version,
  //updateRef: (parsed, resolved) => ({ ...parsed, version: resolved.version }),
};

const browser = createBrowserModule(adapter);

module.exports = {
  registerExampleBrowser: browser.registerBrowser,
  onceExampleBrowser: browser.onceBrowser,
  makeExampleBrowsePage: browser.makeBrowsePage,
  installExampleItem: browser.installItem,
  resolveExampleItem,
  isExampleItemInstalled: browser.isItemInstalled,
  checkExampleModUpdates: browser.checkModUpdates,
};
