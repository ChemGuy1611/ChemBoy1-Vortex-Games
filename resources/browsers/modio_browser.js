"use strict";

// Shared mod.io browser page for Vortex game extensions.
//
// Registers a sidebar page that embeds the live mod.io game section inside Vortex. The user
// browses the real site - search, tags, mod pages, screenshots - and a click on a download link
// becomes a managed Vortex install: the archive is claimed, the mod is enabled, and its mod id,
// version and file id are stamped as attributes. mod.io mods that declare dependencies offer
// them for installation.
//
// The page, the claim, the install driver, the dependency prompt and the update check all live
// in base_browser.js. This file is the mod.io adapter: the URL shapes, the API calls, and the
// key format. An adopting extension carries BOTH files, because this one requires the base from
// beside it.
//
// What mod.io does differently from the other sources:
//
//   1. The documented REST API (api.mod.io/v1) refuses every request without a per-application
//      api_key, which a public extension cannot ship. The site's own frontend reads the same data
//      from https://mod.io/v1, which answers anonymous requests carrying the header
//      "X-Modio-Origin: web" (without it, mod lookups return 401). Every API call goes through
//      apiGet() below, so moving to a keyed endpoint later is a change in one place.
//   2. A download click opens the file's binary_url -
//      g-{gameId}.modapi.io/v1/games/{gameId}/mods/{modId}/files/{fileId}/download - in a new
//      window, which 302s to binary.modcdn.io/mods/{hash}/{modId}/{fileName}?verify=... Both carry
//      the mod id, so no page context is needed to identify a claim.
//   3. The binary_url's last path segment is "download" and the CDN sends no
//      Content-Disposition, so an install started from that URL would be saved under the name
//      "download" with no extension. A capture is unaffected (Vortex receives the post-redirect
//      CDN URL, which ends in the real file name); the install path resolves the redirect first.
//   4. A mod carries one live file per platform, so the file installed is the configured
//      platform's live file (default 'windows'), not simply the mod's default modfile.
//   5. Versions are free text, so update comparison uses the file id, which grows with every
//      upload.
//
// Games that restrict downloads to logged-in users or purchasers are not supported: on those the
// site fetches the file in the page itself and saves it from a blob: URL, which never reaches
// Vortex's download manager in a usable form.
//
// All game-specific knowledge arrives in one config object, so a second game adopts the module
// by copying both files and writing a config. Every adopter carries byte-identical copies of the
// canonical files in resources/browsers/.
//
// Config:
//   modioGame             (required) the game's mod.io name_id - sets the home URL, e.g.
//                         'quarantine-zone' for https://mod.io/g/quarantine-zone
//   platform              mod.io platform whose live file is installed (default 'windows')
//   requirements          the adopter's requirement table (entries carry modioModId)
//   installRequirement    (api, gameSpec, requirement) => Promise, adopter-injected
//   packageAttribute      mod attribute holding the mod id (default modioMod)
//   versionAttribute      mod attribute holding the installed version (default modioVersion)
//   fileIdAttribute       mod attribute holding the installed file id (default modioFileId)
//   allowedHosts          hosts the embedded view may navigate to
//   confirmExternal       show the external-content confirmation before first load (default true)
//   pageId / pageTitle / hotkey / icon / mdi / priority / pageGroup   page identity
//
// Public API: registerModioBrowser, onceModioBrowser, makeModioBrowsePage, installModioMod,
// resolveModioMod, isModioModInstalled, checkModioModUpdates.

const https = require("https");
const { log } = require("vortex-api");
const { createBrowserModule } = require("./base_browser");

const SITE_BASE = "https://mod.io";
const API_BASE = "https://mod.io/v1";
const API_HEADERS = { "X-Modio-Origin": "web" };

// Mod attributes. Dedicated attributes rather than the standard 'version' one because Vortex's
// md5 meta lookup can overwrite 'version' with data from an unrelated Nexus match.
const DEFAULT_PACKAGE_ATTRIBUTE = "modioMod";
const DEFAULT_VERSION_ATTRIBUTE = "modioVersion";
const DEFAULT_FILE_ID_ATTRIBUTE = "modioFileId";
const DEFAULT_PLATFORM = "windows";

// Hosts the embedded view stays on: the site (and its login host, auth.mod.io), the per-game
// download API hosts (g-{gameId}.modapi.io), and the binary CDN the downloads redirect to.
const DEFAULT_ALLOWED_HOSTS = ["mod.io", "modapi.io", "modcdn.io"];

// Sidebar icon: mod.io's own cog mark, traced from the site's vector asset at
// https://assets.modcdn.io/images/branding/modio-cog-white.svg. Converted from that file's
// 3478.4x3638.7 viewBox to the 24x24 one mdi paths use: scaled to fit 23 units, then centred.
const DEFAULT_MDI =
  "M18.77,11.11c-0.78,0,-1.53,-0.1,-2.25,-0.29 -0.07,0.43,-0.1,0.88,-0.1,1.33 0,0.76,0.09,1.48,0.28,2.18 -2.02,0.29,-3.81,1.27,-5.14,2.7A8.78,8.78,0,0,0,8.74,15.06c-0.54,1.59,-1.51,2.97,-2.78,4 1.86,0.43,3.25,2.09,3.25,4.08v0.01h0c0.9,0.23,1.83,0.34,2.8,0.34 0.68,0,1.35,-0.06,2,-0.18 0.01,0,0.02,0,0.03,0 0.09,-2.23,1.93,-4.01,4.18,-4.01 0.78,0,1.51,0.22,2.14,0.59 0.09,-0.09,0.17,-0.19,0.26,-0.29 0.99,-1.12,1.77,-2.43,2.27,-3.88 0,0,-0.01,-0.01,-0.01,-0.01 -1.16,-0.75,-1.92,-2.04,-1.92,-3.52 0,-0.51,0.09,-1,0.26,-1.45 -0.78,0.23,-1.59,0.35,-2.44,0.35zm2.08,-6.46c-0.18,0.09,-0.37,0.17,-0.56,0.23 -0.42,0.14,-0.87,0.22,-1.34,0.22 -2.31,0,-4.19,-1.88,-4.19,-4.19 0,-0.03,0,-0.06,0,-0.09 0,0,-0.01,0,-0.01,0 -0.88,-0.22,-1.8,-0.33,-2.75,-0.33 -0.68,0,-1.35,0.06,-2,0.18 -0.01,0,-0.01,0,-0.02,0 -0.09,2.23,-1.93,4.01,-4.19,4.01 -0.79,0,-1.52,-0.22,-2.15,-0.59l-0.01,0.01c-1.11,1.17,-1.97,2.58,-2.51,4.14 0,0.01,0,0.01,-0.01,0.01 1.16,0.75,1.92,2.04,1.92,3.52 0,1.53,-0.82,2.86,-2.04,3.6v0c0,0.01,0.01,0.02,0.01,0.03 0.46,1.47,1.2,2.81,2.16,3.96 1.92,-1.01,3.41,-2.71,4.16,-4.76 0,-0.01,0.01,-0.01,0.01,-0.02 0.34,-0.93,0.52,-1.93,0.52,-2.98 0,-0.71,-0.09,-1.39,-0.24,-2.05 1.86,-0.35,3.51,-1.29,4.76,-2.62 1.18,1.25,2.72,2.16,4.45,2.55l0.09,0.02c0.6,0.13,1.21,0.2,1.85,0.2 1.48,0,2.87,-0.37,4.1,-1.02 0.04,-0.03,0.08,-0.06,0.13,-0.08 -0.45,-1.46,-1.18,-2.81,-2.14,-3.96z";

// --- config helpers -------------------------------------------------------

function fileIdAttribute(config) {
  return config.fileIdAttribute || DEFAULT_FILE_ID_ATTRIBUTE;
}

function platformOf(config) {
  return config.platform || DEFAULT_PLATFORM;
}

//API path segment for the game - mod.io accepts "@{name_id}" anywhere a numeric game id goes
function gameRef(config) {
  return `@${config.modioGame}`;
}

//Game section - what the embedded view opens on, and what Home returns to
function homeUrl(config) {
  return `${SITE_BASE}/g/${config.modioGame}/m`;
}

//The mod id, as a string - the whole key, since mod.io ids are numeric and unique site-wide
function modKey(ref) {
  return String(ref.modId);
}

const MOD_KEY_RE = /^(\d+)$/;

function parseModKey(key) {
  const matched = MOD_KEY_RE.exec(String(key || ""));
  return matched !== null ? { modId: matched[1] } : null;
}

// --- URL parsing ----------------------------------------------------------

// g-{gameId}.modapi.io/v1/games/{gameId}/mods/{modId}/files/{fileId}/download - a file's
// binary_url, which is what the site's Download link opens. api.mod.io serves the same path.
const API_DOWNLOAD_RE =
  /\/\/(?:g-\d+\.modapi\.io|api\.mod\.io)\/v1\/games\/\d+\/mods\/(\d+)\/files\/(\d+)\/download/i;
// binary.modcdn.io/mods/{hash}/{modId}/{fileName}?verify=... - where binary_url redirects, and
// so the URL a captured download carries
const CDN_URL_RE = /\/\/binary\.modcdn\.io\/mods\/[0-9a-z]+\/(\d+)\/([^/?#]+)/i;

//Parse what a download URL reveals: the mod id, plus the file id or the file name
function parseDownloadRef(url) {
  const input = String(url || "");
  const api = API_DOWNLOAD_RE.exec(input);
  if (api !== null) {
    return { modId: api[1], fileId: api[2] };
  }
  const cdn = CDN_URL_RE.exec(input);
  if (cdn !== null) {
    let fileName = cdn[2];
    try {
      fileName = decodeURIComponent(fileName);
    } catch {
      //keep the raw segment
    }
    return { modId: cdn[1], fileName };
  }
  return null;
}

//Recognise a finished download as a mod.io mod (returns null when it is anything else). The API
//URL is preferred because it names the exact file; the CDN URL names it only by file name.
function downloadRef(download) {
  const refs = (download.urls || []).map(parseDownloadRef).filter((ref) => ref !== null);
  return refs.find((ref) => ref.fileId !== undefined) || refs[0] || null;
}

// --- mod.io API -----------------------------------------------------------

//One HTTPS request through Node rather than the renderer's fetch. The header the API needs makes
//fetch send a CORS preflight, which mod.io only answers for its own origin, and Vortex's window
//enforces CORS. Redirects are not followed - the caller reads Location itself where it matters.
function httpsRequest(method, url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        }),
      );
      res.on("error", reject);
    });
    req.setTimeout(30000, () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    req.end();
  });
}

//GET one API path. See the header comment for why this is the site's endpoint, not api.mod.io.
async function apiGet(apiPath) {
  const response = await httpsRequest("GET", `${API_BASE}${apiPath}`, API_HEADERS);
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Request failed with status code ${response.status}`);
  }
  return JSON.parse(response.body);
}

//The mod record (null when unreachable or missing)
async function fetchMod(config, modId) {
  try {
    return await apiGet(`/games/${gameRef(config)}/mods/${modId}`);
  } catch (err) {
    log("debug", `mod.io mod lookup failed for ${modId}: ${err}`);
    return null;
  }
}

//One file record by id (null when unreachable, missing, or belonging to another mod)
async function fetchFile(config, modId, fileId) {
  try {
    const file = await apiGet(`/games/${gameRef(config)}/mods/${modId}/files/${fileId}`);
    return String(file?.mod_id) === String(modId) ? file : null;
  } catch (err) {
    log("debug", `mod.io file lookup failed for ${modId}/${fileId}: ${err}`);
    return null;
  }
}

//One file record by its archive name - what a captured CDN URL carries instead of a file id
async function fetchFileByName(config, modId, fileName) {
  try {
    const query = `filename=${encodeURIComponent(fileName)}`;
    const data = await apiGet(`/games/${gameRef(config)}/mods/${modId}/files?${query}`);
    return data?.data?.[0] || null;
  } catch (err) {
    log("debug", `mod.io file lookup failed for ${modId}/${fileName}: ${err}`);
    return null;
  }
}

//The file the site currently serves for the configured platform. mod.io keeps one live file per
//platform; the record's own modfile is usually that same file and saves a second request.
async function liveFile(config, mod) {
  const live = (mod.platforms || []).find((entry) => entry.platform === platformOf(config));
  const liveId = live?.modfile_live;
  if (liveId === undefined || String(liveId) === String(mod.modfile?.id)) {
    return mod.modfile || null;
  }
  return fetchFile(config, mod.id, liveId);
}

//A dependency listing -> mod references. Only called when the mod record says it has any.
async function fetchDependencies(config, modId) {
  try {
    const data = await apiGet(`/games/${gameRef(config)}/mods/${modId}/dependencies`);
    return (data?.data || [])
      .map((entry) => entry?.mod_id ?? entry?.id)
      .filter((id) => id !== undefined && id !== null && String(id) !== String(modId))
      .map((id) => ({ modId: String(id) }));
  } catch (err) {
    log("debug", `mod.io dependency lookup failed for ${modId}: ${err}`);
    return [];
  }
}

//Accepted and public - the only mods the site lets an anonymous visitor download
function isAvailable(mod) {
  return mod !== null && mod.status === 1 && mod.visible === 1;
}

//The resolved record the base works with (null when the file has nothing downloadable)
function toResolved(mod, file, dependencies) {
  const downloadUrl = file?.download?.binary_url;
  if (!downloadUrl) {
    return null;
  }
  return {
    modId: String(mod.id),
    name: mod.name || null,
    version: file.version || "",
    fileId: String(file.id),
    fileName: file.filename || null,
    downloadUrl,
    pageUrl: mod.profile_url || `${SITE_BASE}/g/${mod.game_id}/m/${mod.name_id}`,
    dependencies,
  };
}

//Resolve a mod's current file, version, page URL and dependencies (null when unreachable,
//not public, or carrying nothing downloadable for the configured platform)
async function resolveModioMod(config, ref) {
  const mod = await fetchMod(config, ref.modId);
  if (!isAvailable(mod)) {
    return null;
  }
  const file = await liveFile(config, mod);
  const dependencies = mod.dependencies === true ? await fetchDependencies(config, mod.id) : [];
  return toResolved(mod, file, dependencies);
}

//The URL binary_url redirects to, which ends in the real archive name. HEAD, so the archive is
//never pulled just to learn it; the redirect's Location is the answer, so it is not followed.
async function resolveCdnUrl(url) {
  try {
    const response = await httpsRequest("HEAD", url);
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      return new URL(response.headers.location, url).href;
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    return url; //served directly - already the final URL
  } catch (err) {
    log("debug", `Could not resolve the mod.io CDN URL for ${url}: ${err}`);
    return null;
  }
}

//Resolve the exact file a reference names - the one the user clicked, which on the Files tab may
//be an older release - falling back to the live file. Dependencies are left out: the base's
//dependency walk uses resolve(), never this.
async function resolveModioModForInstall(config, ref) {
  const mod = await fetchMod(config, ref.modId);
  if (!isAvailable(mod)) {
    return null;
  }
  let file = null;
  if (ref.fileId !== undefined) {
    file = await fetchFile(config, ref.modId, ref.fileId);
  } else if (ref.fileName !== undefined) {
    file = await fetchFileByName(config, ref.modId, ref.fileName);
  }
  if (file === null) {
    file = await liveFile(config, mod);
  }
  const resolved = toResolved(mod, file, []);
  if (resolved === null) {
    return null;
  }
  const cdnUrl = await resolveCdnUrl(resolved.downloadUrl);
  return cdnUrl !== null ? { ...resolved, downloadUrl: cdnUrl } : resolved;
}

// --- update comparison ----------------------------------------------------

//Whether the mod's current file is newer than the installed one. File ids grow with every upload
//(verified across a mod's whole file history); versions are free text and cannot be trusted alone.
function isNewerFile(latestFileId, installedFileId, latestVersion, installedVersion) {
  const latest = Number(latestFileId);
  const installed = Number(installedFileId);
  if (Number.isFinite(latest) && Number.isFinite(installed) && installed > 0) {
    return latest > installed;
  }
  if (!latestVersion || !installedVersion) {
    //installed before file ids were tracked
    return false;
  }
  return String(latestVersion) !== String(installedVersion);
}

// --- the adapter ----------------------------------------------------------

const adapter = {
  id: "modio",
  label: "mod.io",
  defaults: {
    packageAttribute: DEFAULT_PACKAGE_ATTRIBUTE,
    versionAttribute: DEFAULT_VERSION_ATTRIBUTE,
    allowedHosts: DEFAULT_ALLOWED_HOSTS,
    icon: "plugin",
    mdi: DEFAULT_MDI,
    pageTitle: "Browse Mods",
    homeTooltip: "Back to the game page",
    //no adSelectors or blockedHosts: mod.io carries no ads
  },
  dependencies: true, //a mod record flags whether it has any, so mods without them cost no lookup
  unresolvedMessage:
    "The mod.io API is unreachable, the mod is not public, or it has no file for this platform",

  homeUrl,
  refKey: modKey,
  parseKey: parseModKey,
  requirementKey: (requirement) => String(requirement.modioModId),
  parseClaim: downloadRef,
  resolve: resolveModioMod,
  resolveForInstall: resolveModioModForInstall,

  //Mods carry a human title, so the mod list shows that rather than a bare id
  displayName: (resolved, key) => resolved.name || key,

  //Backstop only: resolveForInstall already swaps binary_url for the CDN URL that names the
  //archive, and a name derived from the URL outranks this one
  archiveName: (resolved) => resolved.fileName || undefined,

  //The installed file id rides along with the standard attributes, for the update check
  extraAttributes: (config, resolved) => [[fileIdAttribute(config), Number(resolved.fileId)]],

  //A download URL is handed to the capture chain, so a click on a mod that is already installed
  //still downloads - the install driver would skip it as installed
  routeUrl: (ctx, url, navigated) => {
    if (parseDownloadRef(url) !== null) {
      ctx.requestDownload(url, navigated);
      return true;
    }
    return false;
  },

  //Updates are compared on file id, which is the only reliable ordering mod.io offers
  installedInfo: (config, mod, attrs) => ({
    fileId: mod?.attributes?.[fileIdAttribute(config)],
    version: mod?.attributes?.[attrs.version] || mod?.attributes?.version,
  }),
  compareInstalled: (candidate, known) => Number(candidate.fileId) > Number(known.fileId),
  isUpdate: (resolved, installed) =>
    isNewerFile(resolved.fileId, installed.fileId, resolved.version, installed.version),
  updateRef: (parsed, resolved) => ({ ...parsed, fileId: resolved.fileId }),
};

const browser = createBrowserModule(adapter);

module.exports = {
  registerModioBrowser: browser.registerBrowser,
  onceModioBrowser: browser.onceBrowser,
  makeModioBrowsePage: browser.makeBrowsePage,
  installModioMod: browser.installItem,
  resolveModioMod,
  isModioModInstalled: browser.isItemInstalled,
  checkModioModUpdates: browser.checkModUpdates,
};
