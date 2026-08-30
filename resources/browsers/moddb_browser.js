'use strict';

// Shared ModDB browser page for Vortex game extensions.
//
// Registers a sidebar page that embeds the live moddb.com section for one game inside
// Vortex. The user browses the real site - mod pages, screenshots, changelogs, file
// listings - and a click on a download link becomes a managed Vortex install: the archive
// is fetched, the mod is enabled, and its file id and version are stamped as attributes.
//
// The page, the install driver and the update check all live in base_browser.js. This file
// is the ModDB adapter: the URL shapes, the RSS lookups, and the key format. An adopting
// extension carries BOTH files, because this one requires the base from beside it.
//
// What ModDB does differently from every other source this repo browses:
//
//   1. Vortex's own download manager cannot fetch a ModDB file. The www host rejects any
//      client that is not a real browser - a request-fingerprint block, not a header one -
//      and so does the CDN a download finally lands on. So this adapter declares
//      fetchStrategy: 'click' and fetches the bytes itself, in the renderer, where fetch
//      uses Chromium's own network stack. Everything after that is the normal pipeline.
//   1b. The site's own download button never reaches this module. It opens a modal at the
//      same URL, so there is no navigation for routeUrl to consume - the click goes straight
//      to Chromium, which hands the URL to Vortex, whose download manager then fails on it.
//      The base watches for that failure and hands the download back here (recoverFailedDownload
//      in base_browser.js). routeUrl still covers the cases that DO arrive as navigations.
//   1c. The URL that failure carries is not a moddb.com URL at all. ModDB resolves a download
//      to DBolical's CDN - https://fmt5.dl.dbolical.com/dl/2026/04/04/wOS_RogueArena.1.rar
//      plus an st= signature and an e= expiry - so the claim has to match that host, and it
//      carries a file NAME and no file id whatsoever.
//   2. ModDB mints a NEW file id for every release. A key built on the file id could
//      therefore never see an update, because the id it resolves is by definition the one
//      already installed. The key is the mod's page instead - the thing that outlives its
//      files - exactly as the GameBanana adapter keys on a submission rather than a file.
//   3. A mod page hosts unrelated files alongside its releases: language packs, demos,
//      localisations. Keying on the page alone would offer "Czech Localization" as an
//      update to "RealRTCW 5.44" simply because it was uploaded later. So the key carries a
//      second half naming which file on the page it is.
//   4. That second half comes from the download's URL slug, never its title. ModDB slugs
//      keep a stable stem and push the version into digits (realrtcw-50, realrtcw-40,
//      endrv-0140, endrv-0131), so stripping everything but letters collapses the releases
//      of one file and separates it from its neighbours. Titles do not survive the same
//      treatment: "[wOS] Rogue - Combat Arena" is slugged rogue-combat-arena-wos, "2027"
//      has no letters at all, and "GMDXv9.0.3 FULL" is slugged gmdxv90-release.
//   5. Nothing in a download URL says which mod it came from - at best /downloads/start/295315
//      names a file, and the CDN URL that actually serves the bytes names nothing but an
//      archive. The page the click came from is what supplies the rest, so visited file pages
//      are remembered and the download is matched against the newest of them. The file id is
//      then read off that page, which is also where its human title comes from.
//   6. Versions are free text and often absent, so update comparison is on the file id,
//      which is a site-wide autoincrement and reliably orders newest-last.
//
// The RSS feed (rss.moddb.com) is the only ModDB surface that answers a plain HTTP client,
// and it is used for one thing: naming and dating the files on a page. It returns the ten
// newest, which is why it is never on the install path - an install resolves the file id the
// user actually clicked.
//
// All game-specific knowledge arrives in one config object, so a second game adopts the
// module by copying both files and writing a config. Every adopter carries byte-identical
// copies of the canonical files in resources/browsers/.
//
// Config:
//   moddbPath             (required) the game's path on moddb.com, e.g. 'games/deus-ex'
//                         (same field, same value, as moddb_downloader.js takes)
//   homePath              where the page opens, if not '{moddbPath}/mods'
//   requirements          the adopter's requirement table (moddb_downloader.js shape)
//   installRequirement    (api, gameSpec, requirement) => Promise, adopter-injected
//   packageAttribute      mod attribute holding the browse key (default moddbBrowseId)
//   versionAttribute      mod attribute holding the installed version (default moddbVersion)
//   fileIdAttribute       mod attribute holding the installed file id (default moddbFileId,
//                         shared with moddb_downloader.js so either route recognises the other)
//   allowedHosts          hosts the embedded view may navigate to
//   hideAds / adSelectors / blockAdPopups / blockedHosts   ad handling, per source defaults below
//   confirmExternal       show the external-content confirmation before first load (default true)
//   pageId / pageTitle / hotkey / icon / mdi / priority / pageGroup   page identity
//
// A requirement the browse page should hand to the requirements downloader instead of
// installing itself declares a browseKey - the key below, which is
// '{entity path}#{letters of the file slug}'. Without one it is left alone, because a
// requirement names a mod page and a key names a single file on that page.
//
// Public API: registerModDbBrowser, onceModDbBrowser, makeModDbBrowsePage,
// installModDbFile, resolveModDbFile, isModDbFileInstalled, checkModDbModUpdates.

const path = require('path');
const { createWriteStream } = require('fs'); //node's fs directly - vortex-api's createWriteStream re-export is deprecated
const { finished } = require('stream/promises');
const { fs, log, util } = require('vortex-api');
const { createBrowserModule } = require('./base_browser');

const SITE_BASE = 'https://www.moddb.com';
const RSS_BASE = 'https://rss.moddb.com';

// Mod attributes. Dedicated attributes rather than the standard 'version' one because
// Vortex's md5 meta lookup can overwrite 'version' with data from an unrelated Nexus match.
// The file id attribute is deliberately the same one moddb_downloader.js tracks, so a
// requirement installed by either route is recognised by both. The browse key gets its own
// name rather than sharing moddbFileId, whose value is a number and a different identity.
const DEFAULT_PACKAGE_ATTRIBUTE = 'moddbBrowseId';
const DEFAULT_VERSION_ATTRIBUTE = 'moddbVersion';
const DEFAULT_FILE_ID_ATTRIBUTE = 'moddbFileId';

// One entry covers www., media. and rss. - the base matches a host or any subdomain of it.
const DEFAULT_ALLOWED_HOSTS = ['moddb.com'];

// Ad slots hidden in the embedded view. ModDB's own server-rendered ad containers are NOT in
// this list: their markup could not be probed, because the www host returns 403 to every
// client that is not a browser, so there was nothing to read the class names off. These are
// the ad networks' own elements, which are safe to hide sight-unseen - none of them can be
// real page content. Cosmetic only: the requests still happen.
const DEFAULT_AD_SELECTORS = [
  'ins.adsbygoogle',
  'div[id^="google_ads_"]',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="playwire.com"]',
];

// Pop-under and interstitial destinations: dropped rather than opened in a system browser.
const DEFAULT_BLOCKED_HOSTS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adnxs.com',
];

// Sidebar icon: ModDB's own mark, traced from its safari-pinned-tab.svg. That file is a
// single-path potrace on a clean ten-by-ten pixel grid, so it converts to mdi's 24x24 box
// exactly - every coordinate below is a whole number.
const DEFAULT_MDI = 'M6 6L2 6L2 18L6 18L6 22L10 22L10 18L6 18L6 14L18 14L18 18L14 18L14 22'
  + 'L18 22L18 18L22 18L22 6L18 6L18 2L6 2ZM10 10L6 10L6 6L10 6ZM18 10L14 10L14 6L18 6Z';

// How many visited file pages are kept as candidates for a download click.
const VISITED_PAGES_CAP = 20;

// How long a page's file listing is reused before it is fetched again.
const FEED_CACHE_MS = 5 * 60 * 1000;

// --- config helpers -------------------------------------------------------

function fileIdAttribute(config) {
  return config.fileIdAttribute || DEFAULT_FILE_ID_ATTRIBUTE;
}

//Where the embedded view opens, and what Home returns to. The mods list rather than the file
//index: a game's /downloads page carries only the files uploaded to the game page itself, while
//the mods list is where the community actually is, and every mod page links to its own files.
function homeUrl(config) {
  return `${SITE_BASE}/${config.homePath || `${config.moddbPath}/mods`}`;
}

function entityUrl(entityPath) {
  return `${SITE_BASE}/${entityPath}`;
}

// --- keys -----------------------------------------------------------------

// The identity of one file across its releases: the page that hosts it, plus the letters of
// its download slug. See notes 2-4 in the header for why it is built this way.

//Letters only, lowercased - which is what collapses realrtcw-50 and realrtcw-40 onto one key
function slugKey(slug) {
  return String(slug || '').toLowerCase().replace(/[^a-z]+/g, '');
}

function modDbKey(ref) {
  return `${ref.path}#${ref.slugKey}`;
}

const KEY_RE = /^((?:games|mods|engines|groups)\/[A-Za-z0-9._-]+)#([a-z]+)$/;

function parseModDbKey(key) {
  const matched = KEY_RE.exec(String(key || ''));
  return (matched !== null) ? { path: matched[1], slugKey: matched[2] } : null;
}

//A slug with no letters at all (ModDB allows a purely numeric one, e.g. "2027") still has to
//produce a usable key, so it falls back to a fixed word rather than an empty half
function refFromPage(entityPath, slug, pageUrl) {
  return {
    path: entityPath,
    slug,
    slugKey: slugKey(slug) || 'file',
    pageUrl,
  };
}

// --- URL parsing ----------------------------------------------------------

// A file's own page, which is where a download click comes from
const FILE_PAGE_RE = /moddb\.com\/((?:games|mods|engines|groups)\/[A-Za-z0-9._-]+)\/downloads\/([A-Za-z0-9._-]+)/i;
// The button on that page: an interstitial that resolves the current mirror
const START_URL_RE = /moddb\.com\/downloads\/start\/(\d+)/i;
// What the interstitial sends the browser to
const MIRROR_URL_RE = /moddb\.com\/downloads\/mirror\/(\d+)\//i;
// Where a mirror finally lands: DBolical's CDN, which is what Vortex ends up being handed and
// what it cannot fetch. Signed and short-lived (st=, e=), and it names an archive and nothing
// else - no mod, no file id.
const CDN_URL_RE = /\bdl\.dbolical\.com\/dl\/[^?#]*?\/([^/?#]+\.[A-Za-z0-9]+)(?:[?#]|$)/i;

function startUrl(fileId) {
  return `${SITE_BASE}/downloads/start/${fileId}`;
}

//The file id a download URL carries, or null when it carries none
function fileIdFromUrl(url) {
  const input = String(url || '');
  const matched = MIRROR_URL_RE.exec(input) || START_URL_RE.exec(input);
  return (matched !== null) ? matched[1] : null;
}

// --- visited file pages ---------------------------------------------------

// A ModDB download URL names a file id and nothing else, so the page the click came from is
// what says which mod it belongs to. Pages the user opened are kept here, newest first, in the
// base's per-page adapter state - two games never share a ring.

function noteVisitedPage(adapterState, ref) {
  const previous = (adapterState.visited || []).filter(entry => modDbKey(entry) !== modDbKey(ref));
  adapterState.visited = [{ ...ref, visitedAt: Date.now() }, ...previous].slice(0, VISITED_PAGES_CAP);
}

//The mod a download belongs to: the file page the user is on. A download always starts from the
//file's own page - there is no download button anywhere else on the site - so the most recently
//visited one is the answer rather than a guess between candidates. Whatever identity the URL did
//carry rides along on top of it; a CDN URL carries none, and the file id is recovered later from
//the page itself.
function refForDownload(adapterState, partial) {
  const visited = (adapterState.visited || [])[0];
  if (visited === undefined) {
    return null;
  }
  const ref = { ...visited };
  if (partial.fileId !== undefined) {
    ref.fileId = String(partial.fileId);
  }
  if (partial.fileName !== undefined) {
    ref.fileName = partial.fileName;
  }
  if (partial.downloadUrl !== undefined) {
    ref.downloadUrl = partial.downloadUrl;
  }
  return ref;
}

//A click that arrived as a navigation, which is the only case routeUrl still handles
function refForClick(adapterState, fileId) {
  return refForDownload(adapterState, { fileId });
}

// --- the RSS feed ---------------------------------------------------------

// The only ModDB surface that answers a plain HTTP client. It lists the ten newest files on a
// page, which is enough to name a file and to spot a newer one, and never enough to be relied
// on for an install.

function feedUrl(entityPath) {
  return `${RSS_BASE}/${entityPath}/downloads/feed/rss.xml`;
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

//One <item> per file: its id, its title, and the page URL the slug is read out of
function parseFeedItems(xml) {
  const items = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/g;
  let matched = itemPattern.exec(xml);
  while (matched !== null) {
    const block = matched[1];
    const guid = (block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/) || [])[1];
    const id = guid ? (guid.match(/downloads(\d+)/) || [])[1] : undefined;
    if (id !== undefined) {
      const link = decodeEntities((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1]);
      const page = FILE_PAGE_RE.exec(link);
      items.push({
        id,
        title: decodeEntities((block.match(/<title>([\s\S]*?)<\/title>/) || [])[1]),
        link,
        path: (page !== null) ? page[1] : null,
        slug: (page !== null) ? page[2] : null,
      });
    }
    matched = itemPattern.exec(xml);
  }
  return items;
}

// Cached per page for a few minutes: the update check walks every installed mod at once, and
// several of them commonly share one page. The value is the promise, so concurrent lookups of
// the same page share a single request.
const feedCache = new Map();

async function fetchFeedItems(entityPath) {
  const response = await fetch(feedUrl(entityPath));
  if (!response.ok) {
    throw new Error(`${feedUrl(entityPath)} returned ${response.status}`);
  }
  return parseFeedItems(await response.text());
}

function feedItems(entityPath) {
  const cached = feedCache.get(entityPath);
  if ((cached !== undefined) && ((Date.now() - cached.at) < FEED_CACHE_MS)) {
    return cached.items;
  }
  const items = fetchFeedItems(entityPath).catch((err) => {
    log('debug', `Could not read the ModDB feed for ${entityPath}: ${err}`);
    feedCache.delete(entityPath); //a failed fetch must not be cached as an empty page
    return [];
  });
  feedCache.set(entityPath, { at: Date.now(), items });
  return items;
}

// A mod page's own feed is the authoritative list, but it 404s for a handful of pages. The
// game's feed carries files from the mods under it as well as its own, so it is the fallback.
async function pageItems(config, entityPath) {
  const own = await feedItems(entityPath);
  if ((own.length > 0) || (entityPath === config.moddbPath)) {
    return own;
  }
  return (await feedItems(config.moddbPath)).filter(item => item.path === entityPath);
}

// --- versions -------------------------------------------------------------

// Free text, and frequently absent. Only ever shown to the user: an update is decided on the
// file id, which is the one thing on this site that orders reliably.
const VERSION_PATTERNS = [
  /\[([^[\]]+)\]\s*$/, //"[wOS] Dark Messiah Mod Launcher [R1-08.16]"
  /(\d+(?:\.\d+)+(?:[A-Za-z]\w*)?)\s*$/, //"RealRTCW 5.44", "ENDrv-0.1.4.0"
  /\bv\.?\s?(\d+(?:\.\d+)*)\b/i, //"Painkiller - Enhanced VR v.1.1"
];

function versionFromTitle(title) {
  for (const pattern of VERSION_PATTERNS) {
    const matched = pattern.exec(String(title || ''));
    if (matched !== null) {
      return matched[1].trim();
    }
  }
  return null;
}

//A readable name for a file the feed does not list, built from its slug
function nameFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// --- resolving ------------------------------------------------------------

//The current mirror URL for a file id. Single-use and short-lived, so it is resolved at the
//moment of the install and never cached. Must run in the renderer: the www host rejects the
//main process outright.
async function resolveMirrorUrl(fileId) {
  try {
    const response = await fetch(startUrl(fileId));
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    const html = await response.text();
    const matched = html.match(/href="([^"]*\/downloads\/mirror\/[^"]*)"/i);
    if (matched === null) {
      return null;
    }
    const href = decodeEntities(matched[1]); //hrefs in HTML may carry entity-encoded characters
    return href.startsWith('http') ? href : `${SITE_BASE}${href}`;
  } catch (err) {
    log('warn', `Could not resolve the ModDB mirror URL for file ${fileId}: ${err}`);
    return null;
  }
}

//A file page names its own download, which is where a file id comes from when the URL that
//started the download did not carry one. The title is taken from the same fetch rather than a
//second one. Renderer-only, like every www.moddb.com request.
async function readFilePage(pageUrl) {
  try {
    const response = await fetch(pageUrl);
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    const html = await response.text();
    const start = /\/downloads\/start\/(\d+)/.exec(html);
    const title = /<title>([^<]+)<\/title>/i.exec(html);
    return {
      fileId: (start !== null) ? start[1] : null,
      //ModDB titles its file pages "<file> file - <mod> mod for <game> - ModDB"
      title: (title !== null) ? decodeEntities(title[1]).split(/\s+file\s+-\s+/)[0].trim() : null,
    };
  } catch (err) {
    log('debug', `Could not read the ModDB file page ${pageUrl}: ${err}`);
    return { fileId: null, title: null };
  }
}

//What the page currently publishes for this key: its newest file, and that file's name,
//version and page. Null when the page lists nothing under the key - which is also what an
//unreachable feed returns, so a site outage never reports an update.
async function resolveModDbFile(config, ref) {
  const items = (await pageItems(config, ref.path))
    .filter(item => slugKey(item.slug) === ref.slugKey);
  if (items.length === 0) {
    return null;
  }
  const newest = items.reduce((best, item) => ((Number(item.id) > Number(best.id)) ? item : best));
  return {
    path: ref.path,
    slugKey: ref.slugKey,
    slug: newest.slug,
    fileId: newest.id,
    name: newest.title || nameFromSlug(newest.slug),
    version: versionFromTitle(newest.title) || '',
    pageUrl: newest.link || entityUrl(ref.path),
  };
}

//Resolve for an install, which is a different question: the user clicked one specific file and
//that is the one to fetch, not whatever the page lists as newest. The feed is consulted only
//to name it, and its absence is not fatal.
async function resolveModDbFileForInstall(config, ref) {
  //A download taken over from the download manager already has a resolved URL and, usually, no
  //file id - the id and the title come from the page it was started on instead. Re-resolving the
  //mirror here would only mint a second URL for the same bytes.
  const fromPage = ((ref.fileId === undefined) && (ref.pageUrl !== undefined))
    ? await readFilePage(ref.pageUrl)
    : { fileId: null, title: null };
  const knownId = ref.fileId ?? fromPage.fileId ?? undefined;
  if (knownId === undefined) { //an update install, which knows the key but not yet the file
    const resolved = await resolveModDbFile(config, ref);
    return (resolved === null) ? null : resolveModDbFileForInstall(config, { ...ref, ...resolved });
  }
  const fileId = String(knownId);
  const listed = (await pageItems(config, ref.path)).find(item => item.id === fileId);
  const downloadUrl = ref.downloadUrl || await resolveMirrorUrl(fileId);
  if (downloadUrl === null) {
    return null;
  }
  const slug = listed?.slug || ref.slug;
  return {
    path: ref.path,
    slugKey: ref.slugKey,
    slug,
    fileId,
    name: listed?.title || fromPage.title || ref.name || nameFromSlug(slug) || `ModDB file ${fileId}`,
    version: versionFromTitle(listed?.title || fromPage.title) || ref.version || '',
    downloadUrl,
    pageUrl: listed?.link || ref.pageUrl || entityUrl(ref.path),
  };
}

// --- fetching the file ----------------------------------------------------

// Vortex's download manager cannot fetch these URLs at all (header note 1), so the adapter
// fetches them itself and hands the base a local file. The base imports it, which MOVES it out
// of temp, and the install proceeds exactly as it would for any other source.

function filenameFromResponse(response, fallback) {
  const disposition = response.headers.get('content-disposition');
  if (disposition) {
    const matched = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (matched) {
      return path.basename(decodeURIComponent(matched[1])); //basename guards against separators in the header
    }
  }
  try {
    const urlName = path.basename(new URL(response.url).pathname);
    if (urlName) {
      return urlName;
    }
  } catch {
    // fall through to the caller's name
  }
  return fallback;
}

//Write a fetch response body to disk without buffering it - ModDB files run to several GB. The
//web stream is drained by hand rather than through Readable.fromWeb: the renderer's fetch
//returns Blink's ReadableStream, which is a different class from the node:stream/web
//ReadableStream that fromWeb brand-checks against, so it always rejects it ("must be an
//instance of ReadableStream. Received an instance of ReadableStream").
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

//Fetch a mirror URL in the renderer and return the path it was written to
async function fetchModDbToFile(config, url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status code ${response.status} (${url})`);
  }
  const fileId = fileIdFromUrl(url);
  const target = path.join(util.getVortexPath('temp'),
    filenameFromResponse(response, `moddb-${fileId || Date.now()}.zip`));
  try {
    await streamToFile(response.body, target);
  } catch (err) { //a half-written file must not be left for the importer to pick up
    await fs.removeAsync(target).catch(() => null);
    throw err;
  }
  return target;
}

// --- the adapter ----------------------------------------------------------

const adapter = {
  id: 'moddb',
  label: 'ModDB',
  defaults: {
    packageAttribute: DEFAULT_PACKAGE_ATTRIBUTE,
    versionAttribute: DEFAULT_VERSION_ATTRIBUTE,
    allowedHosts: DEFAULT_ALLOWED_HOSTS,
    icon: 'search',
    mdi: DEFAULT_MDI,
    pageTitle: 'Browse ModDB',
    homeTooltip: 'Back to the game mods',
    adSelectors: DEFAULT_AD_SELECTORS,
    blockedHosts: DEFAULT_BLOCKED_HOSTS,
  },
  dependencies: false, //the site publishes no dependency data of any kind
  fetchStrategy: 'click', //the download manager is refused by this host - see header note 1
  fetchToFile: fetchModDbToFile,
  unresolvedMessage: 'ModDB is unreachable, or this file has no mirror to download from',

  homeUrl,
  refKey: modDbKey,
  parseKey: parseModDbKey,
  //A requirement opts in by declaring the key of the one file it installs; without it the
  //browse page treats that mod like any other, because a requirement names a mod page and a
  //key names a single file on that page.
  requirementKey: (requirement) => String(requirement.browseKey
    || `moddb-requirement:${requirement.modType}`),
  //Three shapes reach here: the interstitial and the mirror, which name a file id, and the CDN
  //URL Vortex is actually handed, which names only an archive. The CDN form carries its URL
  //along, because it is the one already resolved and is what the retry fetches.
  parseClaim: (download) => {
    for (const url of (download.urls || [])) {
      const fileId = fileIdFromUrl(url);
      if (fileId !== null) {
        return { fileId, downloadUrl: url };
      }
      const cdn = CDN_URL_RE.exec(String(url || ''));
      if (cdn !== null) {
        return { fileName: decodeURIComponent(cdn[1]), downloadUrl: url };
      }
    }
    return null;
  },
  identify: (config, adapterState, partial) => Promise.resolve(refForDownload(adapterState, partial)),
  resolve: resolveModDbFile,
  resolveForInstall: resolveModDbFileForInstall,

  //Files carry a human title, so the mod list shows that rather than a slug
  displayName: (resolved, key) => resolved.name || key,

  //The installed file id rides along under the same name moddb_downloader.js uses, so a
  //requirement installed by either route is recognised by both
  extraAttributes: (config, resolved) => ((resolved.fileId !== undefined)
    ? [[fileIdAttribute(config), Number(resolved.fileId)]]
    : []), //no id means no update tracking for this mod, which beats stamping NaN

  //A download click is turned into a full install rather than a navigation: the file id it
  //carries is joined to the page the user is on, and the base takes it from there.
  routeUrl: (ctx, url, navigated) => {
    const fileId = fileIdFromUrl(url);
    if (fileId !== null) {
      const ref = refForClick(ctx.adapterState, fileId);
      if (ref !== null) {
        ctx.install(ref);
        return true;
      }
      if (MIRROR_URL_RE.test(url)) { //a real file URL with no page behind it: fetched unattributed
        log('info', `A ModDB mirror was reached with no file page behind it - installing ${fileId} unstamped`);
        ctx.requestDownload(url, navigated);
        return true;
      }
      return false; //an interstitial: let it load, and catch the mirror it sends the view to
    }
    const page = FILE_PAGE_RE.exec(url);
    if (page !== null) { //remember it: the next download click is matched against these
      noteVisitedPage(ctx.adapterState, refFromPage(page[1], page[2], url));
    }
    return false; //not consumed - the base decides whether the view may stay on this URL
  },

  //Updates are compared on file id: ModDB versions are free text, often absent, and a new
  //release is always a new id
  installedInfo: (config, mod, attrs) => ({
    fileId: mod?.attributes?.[fileIdAttribute(config)],
    version: mod?.attributes?.[attrs.version] || mod?.attributes?.version,
  }),
  compareInstalled: (candidate, known) => Number(candidate.fileId) > Number(known.fileId),
  isUpdate: (resolved, installed) => {
    const latest = Number(resolved.fileId);
    const current = Number(installed.fileId);
    return Number.isFinite(latest) && Number.isFinite(current) && (current > 0) && (latest > current);
  },
  updateRef: (parsed, resolved) => ({
    ...parsed,
    fileId: resolved.fileId,
    slug: resolved.slug,
    name: resolved.name,
    version: resolved.version,
    pageUrl: resolved.pageUrl,
  }),
};

const browser = createBrowserModule(adapter);

module.exports = {
  registerModDbBrowser: browser.registerBrowser,
  onceModDbBrowser: browser.onceBrowser,
  makeModDbBrowsePage: browser.makeBrowsePage,
  installModDbFile: browser.installItem,
  resolveModDbFile,
  isModDbFileInstalled: browser.isItemInstalled,
  checkModDbModUpdates: browser.checkModUpdates,
};
