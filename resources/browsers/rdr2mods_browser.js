"use strict";

// Shared RDR2Mods.com browser page for Vortex game extensions.
//
// Registers a sidebar page that embeds the live rdr2mods.com downloads section inside Vortex.
// The user browses the real site and a click on a download button becomes a managed Vortex
// install: the archive is fetched, the mod is enabled, and its page key and version are
// stamped as attributes.
//
// The page, the install driver and the update check all live in base_browser.js. This file
// is the RDR2Mods adapter: the URL shapes, the page scrape, and the key format. An adopting
// extension carries BOTH files, because this one requires the base from beside it.
//
// What rdr2mods.com does differently from the other sources this repo browses:
//
//   1. The whole site sits behind a proof-of-work browser check. Every HTML path - file
//      pages, ?do=download, the sitemap, RSS - answers a plain HTTP client with 403 and a
//      JavaScript challenge. Only a real browser session that has solved the challenge is let
//      through, which is exactly what the embedded view is.
//   1b. The file itself is not behind that check. A download click ends on a signed, expiring
//      URL on the site's own CDN (us-west.int-cdn.rdr2mods.com/monthly_2023_03/<name>.<hash>
//      plus st= and e=), which Vortex's download manager fetches like any other - so the
//      ordinary capture path does the work (verified live). fetchStrategy: 'click' is declared
//      for the cases that are NOT such a URL: a download the manager does fail on is taken
//      over by the base and fetched here in the renderer, with the session's cookies
//      attached, and so is an update install, which starts from the page's ?do=download link.
//   2. There is no usable API. The site runs Invision Community, whose REST API is reachable
//      but needs a key only the site staff can issue. Titles, versions and download links are
//      therefore read off the file page itself, and only ever from the renderer.
//   3. A download URL names its file page: .../downloads/<section>/<category>/<id>-<slug>/
//      with ?do=download added. When a download arrives carrying such a URL the identity is
//      read straight off it; anything else is joined to the file page the user was last on.
//   4. The key is the file page's path (rdr2/tools/76-lennys-mod-loader-rdr). The numeric id
//      in it is what identifies the file, but the update check has to rebuild the page URL
//      from the key alone, so the key carries the whole path.
//   5. Versions are dotted numbers with any segment count (0.6.8470.31280), so updates are
//      compared segment by segment rather than through semver.
//
// All game-specific knowledge arrives in one config object. Every adopter carries
// byte-identical copies of the canonical files in resources/browsers/.
//
// Config:
//   homePath              where the page opens, relative to the site (default 'downloads/rdr2/')
//   requirements          optional - mods the extension manages itself, each with a browseKey
//   installRequirement    (api, gameSpec, requirement) => Promise, adopter-injected
//   packageAttribute      mod attribute holding the browse key (default rdr2modsBrowseId)
//   versionAttribute      mod attribute holding the installed version (default rdr2modsVersion)
//   allowedHosts          hosts the embedded view may navigate to
//   hideAds / adSelectors / blockAdPopups / blockedHosts   ad handling, per source defaults below
//   confirmExternal       show the external-content confirmation before first load (default true)
//   pageId / pageTitle / hotkey / icon / mdi / priority / pageGroup   page identity
//
// Public API: registerRdr2ModsBrowser, onceRdr2ModsBrowser, makeRdr2ModsBrowsePage,
// installRdr2ModsFile, openRdr2ModsFilePage, resolveRdr2ModsFile, isRdr2ModsFileInstalled,
// checkRdr2ModsModUpdates.

const path = require("path");
const { finished } = require("stream/promises");
const fs = require("fs");
const fsp = fs.promises;
const { log, util } = require("vortex-api");
const { createBrowserModule } = require("./base_browser");

const SITE_BASE = "https://www.rdr2mods.com";
const DEFAULT_HOME_PATH = "downloads/rdr2/";

// Dedicated mod attributes rather than the standard 'version' one, because Vortex's md5 meta
// lookup can overwrite 'version' with data from an unrelated Nexus match.
const DEFAULT_PACKAGE_ATTRIBUTE = "rdr2modsBrowseId";
const DEFAULT_VERSION_ATTRIBUTE = "rdr2modsVersion";

// One entry covers www. and any other subdomain - the base matches a host or any subdomain of it.
const DEFAULT_ALLOWED_HOSTS = ["rdr2mods.com"];

// Ad slots hidden in the embedded view. The site's own ad containers are not in this list:
// its markup cannot be read by anything but a browser, so there was nothing to take class
// names from. These are the ad networks' own elements, which are safe to hide sight-unseen.
// Cosmetic only: the requests still happen.
const DEFAULT_AD_SELECTORS = [
  "ins.adsbygoogle",
  'div[id^="google_ads_"]',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googlesyndication.com"]',
];

// Pop-under and interstitial destinations: dropped rather than opened in a system browser.
const DEFAULT_BLOCKED_HOSTS = [
  "doubleclick.net",
  "googlesyndication.com",
  "googleadservices.com",
  "adnxs.com",
];

// Sidebar icon: a revolver cylinder, drawn for this module. The site's own mark could not be
// traced - its logo sits behind the same browser check as everything else.
const DEFAULT_MDI =
  "M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2ZM12 4.1A2.1 2.1 0 1 1 12 8.3A2.1 2.1 0 1 1 12 4.1Z" +
  "M17.02 7A2.1 2.1 0 1 1 17.02 11.2A2.1 2.1 0 1 1 17.02 7ZM17.02 12.8A2.1 2.1 0 1 1 17.02 17A2.1 2.1 0 1 1 17.02 12.8Z" +
  "M12 15.7A2.1 2.1 0 1 1 12 19.9A2.1 2.1 0 1 1 12 15.7ZM6.98 12.8A2.1 2.1 0 1 1 6.98 17A2.1 2.1 0 1 1 6.98 12.8Z" +
  "M6.98 7A2.1 2.1 0 1 1 6.98 11.2A2.1 2.1 0 1 1 6.98 7ZM12 10.7A1.3 1.3 0 1 1 12 13.3A1.3 1.3 0 1 1 12 10.7Z";

// How many visited file pages are kept as candidates for a download click.
const VISITED_PAGES_CAP = 20;

// --- URLs and keys --------------------------------------------------------

//Where the embedded view opens, and what Home returns to
function homeUrl(config) {
  return `${SITE_BASE}/${config.homePath || DEFAULT_HOME_PATH}`;
}

// A file's own page: /downloads/<section>/<category...>/<id>-<slug>/. The key is everything
// after /downloads/, without the trailing slash.
const FILE_PAGE_RE = /rdr2mods\.com\/downloads\/((?:[\w.-]+\/)+(\d+)-([\w.%-]+))(?:[/?#]|$)/i;
const KEY_RE = /^(?:[\w.-]+\/)+(\d+)-([\w.%-]+)$/;
// What marks a file page URL as the download itself rather than the page
const DOWNLOAD_QUERY_RE = /[?&]do=download(?:[&#]|$)/i;

function pageUrlForKey(key) {
  return `${SITE_BASE}/downloads/${key}/`;
}

function fileKey(ref) {
  return String(ref.key);
}

function parseFileKey(key) {
  const matched = KEY_RE.exec(String(key || ""));
  return matched !== null
    ? { key: String(key), fileId: matched[1], slug: matched[2], pageUrl: pageUrlForKey(key) }
    : null;
}

//The file page a URL belongs to, or null when it is not one
function refFromUrl(url) {
  const matched = FILE_PAGE_RE.exec(String(url || ""));
  return matched !== null ? parseFileKey(matched[1]) : null;
}

function isDownloadUrl(url) {
  return DOWNLOAD_QUERY_RE.test(String(url || ""));
}

// --- visited file pages ---------------------------------------------------

// A download that lands on a URL naming no file page (a CDN, say) is joined to the page the
// user was on. Pages the user opened are kept here, newest first, in the base's per-source
// adapter state.

function noteVisitedPage(adapterState, ref) {
  const previous = (adapterState.visited || []).filter((entry) => entry.key !== ref.key);
  adapterState.visited = [{ ...ref, visitedAt: Date.now() }, ...previous].slice(
    0,
    VISITED_PAGES_CAP,
  );
}

//The file a download belongs to: named by the URL when it names one, else the newest visited page
function refForDownload(adapterState, partial) {
  const named = partial.key !== undefined ? parseFileKey(partial.key) : null;
  const base = named || (adapterState.visited || [])[0];
  if (base === undefined || base === null) {
    return null;
  }
  const ref = { ...base };
  if (partial.downloadUrl !== undefined) {
    ref.downloadUrl = partial.downloadUrl;
  }
  return ref;
}

// --- versions -------------------------------------------------------------

//Numeric segments of a dotted version: "0.6.8470.31280" -> [0, 6, 8470, 31280]
function versionSegments(version) {
  const segments = String(version ?? "")
    .split(".")
    .map((segment) => segment.replace(/\D/g, ""))
    .filter((segment) => segment !== "")
    .map(Number);
  return segments.length > 0 ? segments : null;
}

//Whether "latest" is newer than "installed", compared segment by segment as numbers. A version
//with no digits cannot be ordered, so it falls back to "different means newer" only when both
//sides are present.
function isNewerVersion(latest, installed) {
  if (!latest || !installed || String(latest) === String(installed)) {
    return false;
  }
  const left = versionSegments(latest);
  const right = versionSegments(installed);
  if (left === null || right === null) {
    return true;
  }
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) {
      return diff > 0;
    }
  }
  return false;
}

// --- reading a file page --------------------------------------------------

function decodeEntities(text) {
  return String(text || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

//A readable name for a file whose page could not be read, built from its slug
function nameFromSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

//Title, version and download link of a file page. Renderer-only, and only once the embedded
//view has passed the site's browser check in this session - the request rides on its cookies.
//Every field is null when the page cannot be read, which is also what an unsolved check returns.
async function readFilePage(pageUrl) {
  const empty = { title: null, version: null, downloadUrl: null };
  try {
    const response = await fetch(pageUrl, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    const html = await response.text();
    const ogTitle = /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i.exec(html);
    const docTitle = /<title>([^<]+)<\/title>/i.exec(html);
    //the structured data block names the version; the page heading prints it in a light span
    const version =
      /"softwareVersion"\s*:\s*"([^"]+)"/i.exec(html) ||
      /<h1[^>]*ipsType_pageTitle[^>]*>[\s\S]*?<span[^>]*ipsType_light[^>]*>\s*([^<\s][^<]*?)\s*<\/span>/i.exec(
        html,
      );
    const download = /href=["']([^"']*[?&](?:amp;)?do=download[^"']*)["']/i.exec(html);
    let downloadUrl = null;
    if (download !== null) {
      const href = decodeEntities(download[1]);
      downloadUrl = href.startsWith("http") ? href : `${SITE_BASE}${href}`;
    }
    return {
      title:
        ogTitle !== null
          ? decodeEntities(ogTitle[1]).trim()
          : docTitle !== null
            ? decodeEntities(docTitle[1])
                .split(/\s+-\s+/)[0]
                .trim()
            : null,
      version: version !== null ? decodeEntities(version[1]).trim() : null,
      downloadUrl,
    };
  } catch (err) {
    log("debug", `Could not read the RDR2Mods file page ${pageUrl}: ${err}`);
    return empty;
  }
}

//What the page currently publishes for this key. Null when the page cannot be read or names no
//version, so an unreachable site (or an unsolved browser check) never reports an update.
async function resolveRdr2ModsFile(config, ref) {
  const pageUrl = ref.pageUrl || pageUrlForKey(ref.key);
  const page = await readFilePage(pageUrl);
  if (page.version === null && page.downloadUrl === null) {
    return null;
  }
  return {
    key: ref.key,
    fileId: ref.fileId,
    slug: ref.slug,
    name: page.title || nameFromSlug(ref.slug),
    version: page.version || "",
    downloadUrl: page.downloadUrl,
    pageUrl,
  };
}

//Resolve for an install. A download taken over from the download manager already carries the URL
//the user clicked - on a page offering several files that is the one they picked - so it is kept,
//and the page is read only to name and version the mod. A page that cannot be read is not fatal.
async function resolveRdr2ModsFileForInstall(config, ref) {
  const pageUrl = ref.pageUrl || pageUrlForKey(ref.key);
  const page = await readFilePage(pageUrl);
  const downloadUrl = ref.downloadUrl || page.downloadUrl;
  if (!downloadUrl) {
    return null;
  }
  return {
    key: ref.key,
    fileId: ref.fileId,
    slug: ref.slug,
    name: page.title || ref.name || nameFromSlug(ref.slug),
    version: page.version || ref.version || "",
    downloadUrl,
    pageUrl,
  };
}

// --- fetching the file ----------------------------------------------------

// Vortex's download manager has not passed the site's browser check, so the adapter fetches the
// file itself and hands the base a local file. The base imports it, which MOVES it out of temp,
// and the install proceeds exactly as it would for any other source.

function filenameFromResponse(response, fallback) {
  const disposition = response.headers.get("content-disposition");
  if (disposition) {
    const matched = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (matched) {
      return path.basename(decodeURIComponent(matched[1])); //basename guards against separators in the header
    }
  }
  return fallback;
}

//Write a fetch response body to disk without buffering it. The web stream is drained by hand
//rather than through Readable.fromWeb: the renderer's fetch returns Blink's ReadableStream, which
//is a different class from the node:stream/web one that fromWeb brand-checks against.
async function streamToFile(body, targetPath) {
  const reader = body.getReader();
  const out = fs.createWriteStream(targetPath);
  //The 'error' listener has to exist for the whole transfer: a target that cannot be opened fails
  //while the loop is waiting on the network, and a failed stream never drains either.
  const failed = new Promise((resolve, reject) => out.once("error", reject));
  failed.catch(() => null); //observed here so a failure nobody is awaiting yet is not unhandled
  try {
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), failed]);
      if (done) {
        break;
      }
      if (!out.write(value)) {
        //respect backpressure instead of queueing the whole file in memory
        await Promise.race([new Promise((resolve) => out.once("drain", resolve)), failed]);
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

//Fetch a download URL in the renderer and return the path it was written to
async function fetchRdr2ModsToFile(config, url) {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Request failed with status code ${response.status} (${url})`);
  }
  // A page instead of a file: the browser check was not passed, or the site wants a choice made
  // first (several files, a download agreement). Saving that as an archive would install HTML.
  if (/^text\/html/i.test(response.headers.get("content-type") || "")) {
    throw new Error(`RDR2Mods answered with a page instead of a file (${url})`);
  }
  const ref = refFromUrl(url);
  const target = path.join(
    util.getVortexPath("temp"),
    filenameFromResponse(
      response,
      `${ref !== null ? `${ref.fileId}-${ref.slug}` : `rdr2mods-${Date.now()}`}.zip`,
    ),
  );
  try {
    await streamToFile(response.body, target);
  } catch (err) {
    //a half-written file must not be left for the importer to pick up
    await fsp.rm(target, { recursive: true, force: true }).catch(() => null);
    throw err;
  }
  return target;
}

// --- the adapter ----------------------------------------------------------

const adapter = {
  id: "rdr2mods",
  label: "RDR2Mods",
  defaults: {
    packageAttribute: DEFAULT_PACKAGE_ATTRIBUTE,
    versionAttribute: DEFAULT_VERSION_ATTRIBUTE,
    allowedHosts: DEFAULT_ALLOWED_HOSTS,
    icon: "search",
    mdi: DEFAULT_MDI,
    pageTitle: "Browse Mods",
    homeTooltip: "Back to the downloads section",
    adSelectors: DEFAULT_AD_SELECTORS,
    blockedHosts: DEFAULT_BLOCKED_HOSTS,
  },
  dependencies: false, //the site publishes no dependency data
  fetchStrategy: "click", //the download manager has no clearance for this host - see header note 1
  fetchToFile: fetchRdr2ModsToFile,
  unresolvedMessage:
    "RDR2Mods.com is unreachable, or its browser check has not been passed yet - open the browse page first",

  homeUrl,
  refKey: fileKey,
  parseKey: parseFileKey,
  //A requirement opts in by declaring the key of the file page it installs
  requirementKey: (requirement) =>
    String(requirement.browseKey || `rdr2mods-requirement:${requirement.modType}`),
  //A URL on the site that names a file page carries the whole identity. Any other URL on the site
  //is still claimed - the file page the user was on supplies the rest.
  parseClaim: (download) => {
    for (const url of download.urls || []) {
      const ref = refFromUrl(url);
      if (ref !== null) {
        return { key: ref.key, downloadUrl: url };
      }
      if (/^https?:\/\/(?:[\w-]+\.)*rdr2mods\.com\//i.test(String(url || ""))) {
        return { downloadUrl: url };
      }
    }
    return null;
  },
  identify: (config, adapterState, partial) =>
    Promise.resolve(refForDownload(adapterState, partial)),
  resolve: resolveRdr2ModsFile,
  resolveForInstall: resolveRdr2ModsFileForInstall,

  //Files carry a human title, so the mod list shows that rather than a path
  displayName: (resolved, key) => resolved.name || key,

  //Only consulted if the download manager ever fetches the file itself: ?do=download carries no
  //file name of its own
  archiveName: (resolved) =>
    resolved.slug
      ? `${resolved.slug}${resolved.version ? `-${resolved.version}` : ""}.zip`
      : undefined,

  routeUrl: (ctx, url, navigated) => {
    const ref = refFromUrl(url);
    if (ref === null) {
      return false;
    }
    if (!isDownloadUrl(url)) {
      //remember it: a download that names no file page is matched against these
      noteVisitedPage(ctx.adapterState, ref);
      return false; //not consumed - the base decides whether the view may stay on this URL
    }
    if (navigated) {
      //the view really loaded it, so it is a page (a file chooser, an agreement), not a file
      return false;
    }
    //a download asked for as a new window: install it directly rather than open anything
    ctx.install({ ...ref, downloadUrl: url });
    return true;
  },

  //Updates compare by numeric segments, which semver coercion cannot do for four-segment versions
  isUpdate: (resolved, installed) => isNewerVersion(resolved.version, installed.version),
  compareInstalled: (candidate, known) => isNewerVersion(candidate.version, known.version),
};

const browser = createBrowserModule(adapter);

// How long to keep trying to point the view at a file page: the view only exists once the page
// is shown and the external-content confirmation has been answered.
const OPEN_PAGE_RETRY_MS = 500;
const OPEN_PAGE_RETRIES = 120;

//Show the browse page on one file's own page instead of the section home. `key` is the file
//page path after /downloads/, the same string a browsed mod is stamped with.
function openRdr2ModsFilePage(api, gameSpec, config, key) {
  const pageId = browser.pageId(gameSpec, config);
  const url = pageUrlForKey(key);
  api.events.emit("show-main-page", pageId);
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    const node = globalThis.document?.getElementById(`${pageId}-webview`);
    if (node !== null && node !== undefined && typeof node.loadURL === "function") {
      try {
        //throws until the guest is ready; a navigation that replaces the first load rejects
        Promise.resolve(node.loadURL(url)).catch(() => null);
        clearInterval(timer);
        return;
      } catch {
        // not ready yet - try again
      }
    }
    if (tries >= OPEN_PAGE_RETRIES) {
      clearInterval(timer);
      log("warn", `Could not open ${url} in the RDR2Mods browser - the page never became ready`);
    }
  }, OPEN_PAGE_RETRY_MS);
}

module.exports = {
  registerRdr2ModsBrowser: browser.registerBrowser,
  onceRdr2ModsBrowser: browser.onceBrowser,
  makeRdr2ModsBrowsePage: browser.makeBrowsePage,
  installRdr2ModsFile: browser.installItem,
  openRdr2ModsFilePage,
  resolveRdr2ModsFile,
  isRdr2ModsFileInstalled: browser.isItemInstalled,
  checkRdr2ModsModUpdates: browser.checkModUpdates,
};
