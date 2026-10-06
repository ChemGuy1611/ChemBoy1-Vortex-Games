# Game Version Resolution

How `resolveGameVersion`/`getGameVersion` should determine a game's installed version, and why the naive "read the exe's `ProductVersion`" approach is wrong for both Unreal Engine and Unity games.

---

## The problem

`IGame.getGameVersion` (wired as `getGameVersion: resolveGameVersion` in every template) feeds `util.getInstalledVersion`. Consumers, all inside Vortex core or this repo:

- **Collections** (`collections/util/InstallDriver.ts`) does an exact string compare between a curator's saved game version and the installing user's — a mismatch shows a "Game version mismatch" dialog.
- **Collections** (`collections/util/modToCollection.ts`) stamps the resolved version into a published revision's `gameVersions`.
- **`test-gameversion`** (bundled Vortex extension) shows an "Installed Version" row on the game-info panel and an "updated from X to Y" health warning whenever the value changes, on both `gamemode-activated` and every `mod-installed`.

That value has to actually change when the game updates, and it has to be identical for the same build across different PCs. Human-readability is a bonus, not a requirement.

The naive implementation reads the shipping exe's `ProductVersion`:

- **Unreal Engine**: that field is the **engine** build (e.g. `4.27.2.0`, `5.7.3.0`), stamped by Epic and identical across every content patch a game ships. A curator's saved "4.27.2.0" matches every user forever, so the mismatch check is silently inert.
- **Unity**: the exe is a thin native launcher stub; its `ProductVersion` is the **Unity player** version and very often does not change across game updates at all.

Either way, `getInstalledVersion` never actually detects a game update.

---

## The tiered resolver

Every UE4-5/Unity template's `resolveGameVersion` runs this chain, stopping at the first tier that resolves:

1. **`hasVersionFile`** (existing per-game toggle) — a text file the game itself writes (usually `Version.info`), if one exists. Checked first because it is the only tier the game vouches for directly.
2. **Xbox appxmanifest** (`APPMANIFEST_FILE`, unchanged) — Microsoft Store builds already carry a real version in `Identity.Version`.
3. **`exeHasGameVersion`** toggle (new, default `false`) — set `true` for the rare game whose devs DO stamp the real game version into the exe's `ProductVersion` (some Unity games rebrand the player exe with the game's own numbering; some UE games do the same). When true, this tier short-circuits the rest of the chain.
4. **Store build metadata** — see below. Covers Steam, Epic, GOG.
5. **Hash fallback** — an MD5-of-MD5s over the game's own code files, for installs with no readable store metadata (moved/pirated copy, Steam `.acf` deleted, Legendary/Heroic instead of the Epic launcher).
6. **Last resort** — the old exe `ProductVersion` read, then a hardcoded `"0.0.0"`. Never throws; Vortex core already falls back to the exe version on a throw anyway.

Values are returned raw, with no prefix: a Steam buildid stays an integer string comparable by `compareQuadVer`, and Epic/GOG values stay human-readable in the mismatch dialog. The hash is the only opaque value.

**Note:** two different stores install two different exes, so a curator on Steam and a user on Epic/GOG will still see a one-time "Game version mismatch" — that is unavoidable and predates this resolver (the old engine-version approach only "matched" because it was meaningless everywhere).

---

## Store build fields

| Store | Location | Field | Matching |
| --- | --- | --- | --- |
| Steam | `<library>/steamapps/appmanifest_<id>.acf`, found by walking up from the game path until the parent directory is named `steamapps` and the current one `common` | `"buildid" "<int>"` (regex `/"buildid"\s+"(\d+)"/`) | Tries `STEAMAPP_ID` then `STEAMAPP_ID_DEMO` |
| Epic | Launcher `Manifests/*.item` files, in `AppDataPath` from `HKLM\SOFTWARE\WOW6432Node\Epic Games\EpicGamesLauncher` (falls back to `%ProgramData%\Epic\EpicGamesLauncher\Data` if the key is missing) | `AppVersionString` | `data.AppName === EPICAPP_ID` OR normalized `data.InstallLocation === gamePath` |
| GOG | Registry `HKLM\SOFTWARE\WOW6432Node\GOG.com\Games\<GOGAPP_ID>` | `ver` | Only accepted if the key's own `path` value normalizes to `gamePath` |

Any store whose id constant is `"XXX"` (unfilled template placeholder), `null`, or missing is skipped without touching the filesystem/registry. `winapi.RegGetValue` **throws** rather than returning null/undefined on a missing key or value — every registry read is wrapped in try/catch for that reason (see `WINAPI_BINDINGS.md`).

Buildid/`AppVersionString`/`ver` do **not** agree with each other across stores — a Steam build and an Epic build of the same patch have unrelated-looking version strings. That is expected; there is no cross-store canonical version, only per-store ground truth.

---

## Hash fallback

Ported from Vortex's own **removed** `gameversion-hash` bundled extension (removed in 2.7.0; the `registerGameVersionProvider` API it used was dropped from the published typings at 2.7.1 and from Vortex itself in 2.8.0-beta.1 — see `UNDERUSED_API_FUNCTIONS.md`). Same algorithm, so a hash computed here matches what that extension would have produced:

```js
async function resolveHashVersion(gamePath) {
  const hashFiles = ASSEMBLY_FILES.map((file) => path.join(ASSEMBLY_PATH, file));
  const mtimes = [];
  for (const relFile of hashFiles) {
    mtimes.push((await fsp.stat(path.join(gamePath, relFile))).mtimeMs);
  }
  mtimes.sort((a, b) => a - b);
  const cacheKey = crypto.createHash("md5").update(mtimes.map(String).join("")).digest("hex");
  if (VERSION_HASH_CACHE[cacheKey] !== undefined) return VERSION_HASH_CACHE[cacheKey];
  const fileHashes = [];
  for (const relFile of hashFiles) {
    fileHashes.push(await util.fileMD5(path.join(gamePath, relFile)));
  }
  const hash = crypto.createHash("md5").update(fileHashes.join("")).digest("hex");
  VERSION_HASH_CACHE[cacheKey] = hash;
  return hash;
}
```

- **File selection matters.** UE templates hash `SHIPPING_EXE` (the game's own compiled code, not the generic launcher `EXEC`). Unity templates hash `ASSEMBLY_FILES` at `ASSEMBLY_PATH` — IL2CPP `GameAssembly.dll`, or Mono `Assembly-CSharp.dll` + `Assembly-CSharp-firstpass.dll` — **never** the Unity player exe stub, which is exactly the file this whole resolver exists to stop reading.
- **Cached per build**, keyed on the MD5 of the hashed files' sorted mtimes, so the (potentially large) file hash itself is only computed once per build rather than on every `mod-installed` health-check re-run.
- A file in `ASSEMBLY_FILES`/`SHIPPING_EXE` that does not exist skips this tier entirely (caught by the surrounding try/catch) rather than throwing.
- `details.hashFiles` on the `IGame` object is **inert** — it was only ever read by the now-removed bundled extension. Do not set it expecting this resolver (or anything else) to consume it; the hash logic lives entirely inside `getGameVersion` now.
- An optional per-game hash-to-readable-version map is not implemented by default; every adopter currently returns the raw hex hash for this tier. Add one only if a specific game's curator wants a human-readable string here.

---

## Adoption

| Template family | Status |
| --- | --- |
| `template-ue4-5` | Ported |
| `template-unitymelonloaderbepinex-hybrid` | Ported |
| `template-unity-umm` | Ported |

Pilots (live-tested before the template port): `game-subnautica2` (Steam UE4-5, test bed), `game-witchfire` (Epic UE4-5), `game-fatekeeper` (Steam UE4-5), `game-prodeus` (Steam Unity hybrid).

Propagation to the remaining games on each template's parity list is scripted per the standard splice process — see `TEMPLATES_OVERVIEW.md`.

---

## See also

`REGISTER_GAME.md` (`details.hashFiles` inert-since-2.7.0 note; `details.steamAppId`/`gogAppId`/`epicAppId`/`xboxAppId` — the constants this resolver reuses for store matching). `WINAPI_BINDINGS.md` (`RegGetValue` throw-not-null behavior used by the Epic/GOG tiers). `UNDERUSED_API_FUNCTIONS.md` (the removed `gameversion-hash` extension and `registerGameVersionProvider`). `TEMPLATES_OVERVIEW.md` (per-template `spec`/toggle conventions this resolver's toggles follow).
