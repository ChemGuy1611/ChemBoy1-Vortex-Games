# Scripts

Developer scripts for creating and documenting Vortex game extensions.

Script index: [scripts.txt](scripts.txt) — one filename per line; keep in sync when adding or removing scripts.

---

## vortex_utils.py

Shared utility module imported by all other scripts. Centralizes common patterns to eliminate duplication across the script suite.

### vortex_utils.py -- Contents

| Export | Description |
| --- | --- |
| `REPO_ROOT` | Absolute path to the repository root directory |
| `PCGW_API` | PCGamingWiki API base URL |
| `EGDATA_API` | egdata.app API base URL |
| `TITLE_IMAGES_DIR` | Absolute path to `resources/title-images/` |
| `BANNER_IMAGES_DIR` | Absolute path to `resources/banner-images/` |
| `LISTS_DIR` | Absolute path to `resources/lists/` |
| `GAME_PREFIX` | `"game-"` string constant |
| `TEMPLATE_PREFIX` | `"template-"` string constant |
| `read_index_js(folder)` | Read `index.js` from a game extension folder, returns source string or `None` |
| `write_index_js(folder, src)` | Write `src` to `index.js` in a game extension folder |
| `extract_game_id(src)` | Extract `GAME_ID` value from `index.js` source |
| `extract_steamapp_id(src)` | Extract `STEAMAPP_ID` value from `index.js` source |
| `extract_game_name(src)` | Extract `GAME_NAME` value from `index.js` source |
| `roman_to_arabic(name)` | Convert Roman numeral words to Arabic digits in a game title |
| `arabic_to_roman(name)` | Convert Arabic digit words to Roman numerals in a game title |
| `name_lookup_variants(name)` | Generate name variants for PCGamingWiki lookups (title-case, numeral alternates, edition suffix stripping) |
| `lookup_pcgamingwiki(name, debug)` | Search PCGamingWiki for a game, returns `(page_url, page_title)` with session caching |
| `get_api_key(key_name)` | Load an API key from env var with Windows registry fallback (HKCU, then HKLM) |
| `http_get(url, headers)` | Fetch a URL and return UTF-8 string. Retries up to 2 times on 429/5xx/network errors (2 s, 4 s delays). |
| `http_get_bytes(url, headers)` | Fetch a URL and return raw bytes. Same retry behaviour as `http_get`. |
| `http_post_json(url, data, headers)` | POST a JSON-serializable dict to a URL and return parsed JSON response. Same retry behaviour as `http_get`. |
| `fetch_epic_app_id(game_name)` | Resolve `EPICAPP_ID` for a game via egdata.app (POST search -> GET offer items -> EXECUTABLE item's `releaseInfo.appId`) |
| `add_to_discovery_ids(src)` | Add `STEAMAPP_ID_DEMO`, `GOGAPP_ID`, `EPICAPP_ID`, `XBOXAPP_ID`, `UPLAYAPP_ID`, and `EAAPP_ID` to `DISCOVERY_IDS_ACTIVE` if each has a real resolved value in src (not null, `''`, or `'XXX'`) and is not already present. |
| `log_info(game_id, msg)` | Print `[game_id] msg` |
| `log_error(game_id, msg)` | Print `[game_id] ERROR - msg` |
| `log_warn(game_id, msg)` | Print `[game_id] WARNING - msg` |
| `_find_fn_end(src, fn_match_end)` | Return index past the closing `}` of the JS function whose `{` is at `fn_match_end - 1` |
| `find_fn_body(src, func_start)` | Public wrapper for brace-counting; returns `(body_start, body_end)` indices or `(None, None)` |
| `run_generate_explained(game_id)` | Run `generate_explained.js` for a game; returns `(ok: bool, stderr: str)` |
| `node_check(path)` | Run `node --check` on a JS file path; returns `(ok: bool, stderr: str)` |
| `node_check_source(src)` | Run `node --check` on an in-memory JS string (writes a temp file internally); returns `(ok, error_msg)` — `ok` is `None` if node is not on PATH |
| `eslint_check(path)` | Run `npx eslint` on a JS file (config auto-discovered from `REPO_ROOT`); returns `(ok: bool, output: str)` |
| `get_discovery_ids(src)` | Parse variable names from the spec's `discovery.ids` array; returns list of names (e.g. `["STEAMAPP_ID", "EAAPP_ID"]`); falls back to `["STEAMAPP_ID"]` |
| `iter_game_folders(target_game_ids)` | Yield `(folder, game_id, src)` for every `game-*` folder; filtered by `target_game_ids` if given |
| `REGISTER_ACTIONS` | List of `(label, commented_out, code)` tuples for standard `context.registerAction` calls |
| `inject_register_actions(src)` | Inject any missing `context.registerAction` entries into `applyGame()`; returns `(new_src, missing_labels)` |
| `update_index_header(src, *, name, version, date)` | Replace `Name`, `Version`, and/or `Date` fields in the `index.js` header comment; returns updated source string |
| `const_value(src, var_name)` | Extract the RHS of a `const`/`let` declaration from JS source; returns string or `None` |
| `is_unset(value_str)` | Return `True` if a const RHS string is `"XXX"` or `'XXX'` (placeholder not yet filled) |
| `is_missing(src, var_name)` | Return `True` if a `const`/`let` declaration for `var_name` is absent from src |
| `set_or_insert(src, var_name, value, comment)` | Replace an `XXX` placeholder for `var_name`, or insert the const before the `spec` block |
| `extract_extension_url(src)` | Extract the `EXTENSION_URL` value from JS source; returns `None` if unset or not an HTTP URL |
| `sanitize_game_name(name)` | Strip `®`, `™`, `©` symbols and collapse extra whitespace from a game name string |
| `normalize_game_name(s)` | Lowercase + strip right-quotes, colons, ` - ` separators, and extra whitespace. For fuzzy title comparison. |
| `list_game_ids()` | Return a sorted list of all `GAME_ID` values found across `game-*` extension folders |
| `iter_repo_scripts()` | Yield absolute paths of every script listed in `scripts.txt` (skips blank lines and `#` comments) |
| `read_info_json(folder)` | Read and parse `info.json` from an extension folder; returns the dict, or `None` if missing/invalid |
| `make_info_json()` | Return an `info.json` template string (name `Game: XXX`, version `0.1.0`) for a new extension |
| `make_changelog()` | Return a `CHANGELOG.md` template string with `0.1.0 - 2026-XX-XX` initial entry |
| `parse_changelog_latest(folder)` | Parse `CHANGELOG.md` in a folder; returns `(version, date)` of the most recent entry (either may be `None`) |
| `dry_prefix(dry_run)` | Return `"[DRY RUN] "` if `dry_run` is `True`, else `""` |
| `download_exec_icon(appid, game_name, out_path)` | Download and save a 64x64 `exec.png`. Steam CDN first, SteamGridDB icon fallback. |
| `download_cover_art(appid, game_name, out_path, sgdb_key)` | Download and save a 640x360 cover art JPEG with no title text. SteamGridDB grid/hero or Steam `library_hero.jpg`. |
| `download_title_image(appid, game_name, out_path, sgdb_key)` | Download and save a 1920x1080 title image (with logo text). SteamGridDB hero+logo composite, grid, or Steam capsule. |
| `download_banner_image(appid, game_id, out_path, sgdb_key)` | Download official SteamGridDB hero at full size. No crop or resize. |

### vortex_utils.py -- Requirements

No additional packages required (Python stdlib only).

---

## fetch_exec_icon.py

Scans all `game-*` extension folders and downloads a 64x64 PNG icon for any extension missing its `exec.png` file. Reads `STEAMAPP_ID` and `GAME_NAME` directly from each `index.js`. Uses `download_exec_icon` from `vortex_utils`.

### fetch_exec_icon.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `STEAMGRIDDB_API_KEY` | Optional | SteamGridDB API key. Used as fallback icon source when Steam CDN has no icon for the app. |

### fetch_exec_icon.py — Requirements

```sh
pip install Pillow
```

### fetch_exec_icon.py — Usage

```sh
python fetch_exec_icon.py
python fetch_exec_icon.py GAME_ID [GAME_ID ...]
python fetch_exec_icon.py --dry-run
python fetch_exec_icon.py --force
```

- No arguments — scans all `game-*` folders and downloads missing icons.
- `GAME_ID [GAME_ID ...]` — only processes the listed game IDs.
- `--dry-run` — lists missing files without downloading anything.
- `--force` — re-downloads `exec.png` even if it already exists.

### fetch_exec_icon.py — Output

- Saved files are written as `exec.png` (64x64 PNG) into each extension folder.
- Extensions without a `STEAMAPP_ID` in `index.js` are skipped with a note.
- A summary of saved / failed / skipped counts is printed at the end.

---

## fetch_cover_art.py

Scans all `game-*` extension folders and downloads missing cover art, title images, or banner images. Reads `STEAMAPP_ID` directly from each `index.js` to look up art. Uses `download_cover_art`, `download_title_image`, and `download_banner_image` from `vortex_utils`.

- Default mode: downloads `{GAME_ID}.jpg` (640x360, no title text) into each extension folder.
- `--title` mode: downloads `{GAME_ID}_title.jpg` (1920x1080, with title text) to `resources/title-images/`.
- `--banner` mode: downloads `{GAME_ID}_banner.jpg` (full-size official SteamGridDB hero) to `resources/banner-images/`.

### fetch_cover_art.py — Requirements

```sh
pip install Pillow
```

### fetch_cover_art.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `STEAMGRIDDB_API_KEY` | Optional | SteamGridDB API key. Used for higher-quality hero art in default mode. Required for `--banner` mode (no fallback available). Falls back to Steam `library_hero.jpg` in default mode if not set. In `--title` mode, used for hero+logo composite and grid art; falls back to Steam `capsule_616x353.jpg` if not set. |

### fetch_cover_art.py — Usage

```sh
python fetch_cover_art.py
python fetch_cover_art.py GAME_ID [GAME_ID ...]
python fetch_cover_art.py --dry-run
python fetch_cover_art.py --force
python fetch_cover_art.py --title
python fetch_cover_art.py --title GAME_ID [GAME_ID ...]
python fetch_cover_art.py --banner
python fetch_cover_art.py --banner GAME_ID [GAME_ID ...]
```

- No arguments — scans all `game-*` folders and downloads missing cover art.
- `GAME_ID [GAME_ID ...]` — only processes the listed game IDs.
- `--dry-run` — lists missing files without downloading anything.
- `--force` — re-downloads even if the target file already exists.
- `--title` — fetches title images (1920x1080) to `resources/title-images/` instead of cover art.
- `--banner` — fetches full-size official hero images to `resources/banner-images/`. Requires `STEAMGRIDDB_API_KEY`.

### fetch_cover_art.py — Output

- Cover art saved as `{GAME_ID}.jpg` (640x360 JPEG) in each extension folder.
- Title images saved as `{GAME_ID}_title.jpg` (1920x1080 JPEG) in `resources/title-images/`.
- Banner images saved as `{GAME_ID}_banner.jpg` (full-size JPEG) in `resources/banner-images/`.
- Extensions without a `STEAMAPP_ID` in `index.js` are skipped with a note.
- A summary of saved / failed / skipped counts is printed at the end.

---

## fetch_nexus_stats.py

Fetches endorsement count and unique download count from the Nexus Mods v1 API for every `game-*` extension with a valid `EXTENSION_URL` (i.e., a `nexusmods.com` URL). Results are cached to `vortex_gui_nexus_stats.json` at the repo root (gitignored). The GUI dashboard reads this file and displays the stats in the `End` and `DL` columns.

Extensions with placeholder `EXTENSION_URL = "XXX"` are silently skipped.

### fetch_nexus_stats.py — Requirements

No additional packages required (Python stdlib only).

### fetch_nexus_stats.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXUS_API_KEY` | Required | Nexus Mods API key. Not needed for `--dry-run`. |

### fetch_nexus_stats.py — Usage

```sh
python fetch_nexus_stats.py
python fetch_nexus_stats.py GAME_ID [GAME_ID ...]
python fetch_nexus_stats.py --dry-run
python fetch_nexus_stats.py --force
```

- No arguments — fetches stats for all extensions missing from the cache.
- `GAME_ID [GAME_ID ...]` — only processes the listed game IDs.
- `--dry-run` — lists extensions that would be fetched without making any API calls. Works without `NEXUS_API_KEY`.
- `--force` — re-fetches stats even if already cached.

### fetch_nexus_stats.py — Output

- Results written to `vortex_gui_nexus_stats.json` (single atomic write at the end of the run).
- Each entry includes `endorsements`, `unique_downloads`, `total_downloads`, `mod_name`, `mod_version`, `fetched_at` (epoch seconds), and `error` (null on success, "404" if not found).
- Prints `endorsements` and `unique_downloads` per game while running, with the daily API rate limit remaining.
- Rate limit is checked after each call; stops early if fewer than 6 requests remain.
- Summary line at the end: `Updated: N | Failed: N | Daily remaining: N`.

---

## new_template.py

Creates a new Vortex extension template from one or more existing game extensions. The primary game's `index.js` is copied and all game-specific constants are replaced with `"XXX"` placeholders. Tool icon PNGs (excluding `exec.png`) are copied. Adds the new template to the `TEMPLATES` list in `new_extension.py` automatically.

### new_template.py — Requirements

No additional packages required (Python stdlib only).

### new_template.py — Usage

```sh
python new_template.py TEMPLATE_NAME GAME_ID [GAME_ID ...]
python new_template.py TEMPLATE_NAME GAME_ID [GAME_ID ...] --dry-run
python new_template.py TEMPLATE_NAME GAME_ID [GAME_ID ...] --force
```

The first `GAME_ID` is the primary source — its `index.js` is copied and stripped. Additional `GAME_ID`s are listed in the output as reference sources but not processed.

### new_template.py — Examples

```sh
python new_template.py anvilengine ghostreconbreakpoint
python new_template.py anvilengine ghostreconbreakpoint assassinscreedorigins
python new_template.py myengine mygame --dry-run
```

### new_template.py — What It Creates

```text
template-{TEMPLATE_NAME}/
    index.js          primary game's index.js with XXX substitutions
    info.json         fresh standard template format
    CHANGELOG.md      fresh standard format
    *.png             tool icon PNGs from primary game (exec.png excluded)
```

### new_template.py — XXX Substitutions Applied

| Constant | Rule |
| --- | --- |
| `GAME_ID`, `GAME_NAME`, `GAME_NAME_SHORT` | Always -> `"XXX"` |
| `EXEC`, `EXEC_NAME` | Always -> `"XXX"` |
| `STEAMAPP_ID`, `PCGAMINGWIKI_URL`, `EXTENSION_URL` | Always -> `"XXX"` |
| `EAAPP_ID`, `UPLAYAPP_ID`, `GOGAPP_ID`, `EPICAPP_ID`, `XBOXAPP_ID` | Non-empty string -> `"XXX"`; empty string `""` -> `null`; already `null` -> left as `null` |
| Header comment `Name`, `Version`, `Date` | Reset to `XXX`, `0.1.0`, `2026-XX-XX` |

After substitution the script prints two review sections:

- **Contains original GAME_ID** — string constants whose value embeds the original GAME_ID (e.g. `"gameid-binaries"`). These should be converted to a JS template literal using `${GAME_ID}` or replaced with `"XXX"`.
- **Manual review** — other string constants with values over 10 characters that aren't path fragments, globs, or executable names. Confirm each is intentional (framework-generic) or replace with `"XXX"`.

Inline strings inside `path.join()` calls and `winapi.RegGetValue()` arguments are not auto-detected — check those manually.

### new_template.py — Fixup Passes

After substitutions, the processed `index.js` is augmented with standard structure and utility code that may be missing from older game extensions. Each pass is idempotent — it checks whether the item already exists before injecting. Applied fixups are listed in the output; already-present items are silently skipped.

| Fixup | Injection point |
| --- | --- |
| Feature toggles block (`hasLoader`, `hasXbox`, `multiExe`, `multiModPath`, `allowSymlinks`, `needsModInstaller`, `rootInstaller`, `fallbackInstaller`, `setupNotification`, `hasUserIdFolder`, `debug`) | After `EXTENSION_URL` constant |
| Missing store ID constants: `GOGAPP_ID = null`, `XBOXAPP_ID = null`, `XBOXEXECNAME = "XXX"` | After `EPICAPP_ID` or `STEAMAPP_ID` |
| `DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID]` | After store ID constants |
| `PARAMETERS_STRING = ''` and `PARAMETERS = [PARAMETERS_STRING]` | After `REQ_FILE` or `MOD_PATH_DEFAULT` |
| `MODTYPE_FOLDERS = [MOD_PATH]` | After `PARAMETERS` |
| `IGNORE_CONFLICTS` and `IGNORE_DEPLOY` arrays | After `MODTYPE_FOLDERS` |
| Spec completeness: `"compatible"` in game object; `"gogAppId"`, `"epicAppId"`, `"xboxAppId"`, `"supportsSymlinks"`, `"ignoreConflicts"`, `"ignoreDeploy"` in `details`; `"GogAPPId"`, `"EpicAPPId"`, `"XboxAPPId"` in `environment`; `DISCOVERY_IDS_ACTIVE` in `discovery.ids` | Inside `spec` object |
| `modFoldersEnsureWritable` function | Before `setup()` |
| `return modFoldersEnsureWritable(GAME_PATH, MODTYPE_FOLDERS);` call in `setup()` | Before `setup()`'s closing `}` |
| `pathPattern` try/catch wrapper (replaces body if absent; injects full function if missing) | Before `modTypePriority` or `makeFindGame` |
| `requiresLauncher` with full `DISCOVERY_IDS_ACTIVE.includes` Xbox/Epic/Steam logic | Replaces existing body, or injected before `getExecutable` |
| `testFallback`, `installFallback`, `fallbackInstallerNotify` functions + gated `registerInstaller` at priority 49. Injects `ROOT_ID` if missing. | Functions before `applyGame`; registration before `//register actions` or first `context.registerAction` |
| Standard `context.registerAction` calls: Open PCGamingWiki Page, View Changelog, Submit Bug Report, Open Downloads Folder, plus commented-out Open Config/Save Folder. Each action checked individually by label. | Before closing `}` of `applyGame()` |

After writing `index.js`, the script automatically runs `node --check` on it and prints a WARNING if a syntax error is detected. The file is left on disk regardless so it can be inspected and fixed.

### new_template.py — After Running

After the script completes, do these steps manually:

1. Update `SCRIPTS.md` — add the new template to the Available Templates table in the `new_extension.py` section (the script auto-inserts into `new_extension.py`'s `TEMPLATES` list, but the Markdown table in SCRIPTS.md is separate)
2. Update `CLAUDE.md` — add `template-{name}` to the available templates list
3. Update memory — `reference_templates_overview.md` and `reference_templates_detail.md`

---

## new_extension.py

Bootstraps a new Vortex game extension folder from a template. Looks up game information automatically from Steam, GOG, Epic Games Store, and PCGamingWiki, then fills in as many fields as possible in `index.js`, `info.json`, and `CHANGELOG.md`. Downloads `exec.png`, cover art, and a title image. Runs `generate_explained.js` at the end.

### new_extension.py — Requirements

```sh
pip install Pillow
```

### new_extension.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXUS_API_KEY` | Optional | Nexus Mods API key. Used to look up the correct `GAME_ID` domain name. Falls back to a derived name if not set. |
| `STEAMGRIDDB_API_KEY` | Optional | SteamGridDB API key. Used for higher-quality cover art (heroes) and required for title images. Falls back to Steam `library_hero.jpg` for cover art if not set; title image step is skipped entirely without this key. |

### new_extension.py — Usage

```sh
python new_extension.py TEMPLATE "Game Name"
python new_extension.py TEMPLATE STEAM_APP_ID
python new_extension.py TEMPLATE "Game Name" --force
python new_extension.py TEMPLATE "Game Name" --dry-run
python new_extension.py TEMPLATE "Game Name" --no-images
python new_extension.py GAME_ID --refresh-images
```

`TEMPLATE` is the short template name — omit the `template-` prefix (e.g. `basic`, `ue4-5`).
The game input can be a quoted game name (searched on Steam) or a numeric Steam App ID.
Use `--force` to overwrite an existing folder.
Use `--dry-run` to run all lookups and print what would be created without writing any files.
Use `--no-images` to skip downloading `exec.png`, cover art, and title image (useful when re-running on an existing extension).
Use `--refresh-images GAME_ID` to re-download all 4 images for an existing extension without redoing any lookups or rewriting `index.js`. Reads `STEAMAPP_ID` and `GAME_NAME` directly from the existing `game-{GAME_ID}/index.js`. Always overwrites existing image files.

### new_extension.py — Examples

```sh
python new_extension.py basic "Death Stranding 2"
python new_extension.py ue4-5 3552140
python new_extension.py unitymelonloaderbepinex-hybrid "The Long Dark" --force
```

### Available Templates

| Template | Engine / Framework |
| --- | --- |
| `template-basic` | Proprietary engines and older games |
| `template-ue4-5` | Unreal Engine 4/5 |
| `template-unitybepinex` | Unity + BepInEx |
| `template-unitymelonloaderbepinex-hybrid` | Unity + MelonLoader / BepInEx hybrid |
| `template-unity-umm` | Unity + UMM |
| `template-reframework-fluffy` | RE Engine |
| `template-reloaded2` | Reloaded-II |
| `template-rpgmaker` | RPG Maker |
| `template-godot` | Godot |
| `template-snowdropengine` | Snowdrop Engine |
| `template-farcry` | Far Cry / Dunia Engine |
| `template-cobraengineACSE` | Cobra Engine / ACSE |
| `template-tfcinstaller-ue2-3` | Unreal Engine 2/3 |
| `template-anvilengine` | Ubisoft Anvil Engine (AC series, Ghost Recon, etc.) |
| `template-frostbite` | Frostbite Engine (EA games, Frosty Mod Manager) |
| `template-shinryu` | Shin Ryu Mod Manager (SRMM) |

### What It Automates

| Field | Source |
| --- | --- |
| `GAME_ID` | Nexus Mods domain name (`NEXUS_API_KEY` required); falls back to derived name (lowercase, alphanumeric) |
| `GAME_NAME` | Steam Store canonical name |
| `GAME_NAME_SHORT` | Steam name with subtitle stripped at `:` |
| `STEAMAPP_ID` | Steam search or direct App ID input |
| `STEAMAPP_ID_DEMO` | Steam `demos` array in appdetails |
| `GOGAPP_ID` | GOG catalog API (genuine title match only) |
| `EPICAPP_ID` | Resolved via egdata.app (POST search → EXECUTABLE item's `releaseInfo.appId`). Set to the resolved ID if found; `"XXX"` if found on Epic but ID unresolvable; `null` if no Epic listing. Store URL added as line comment. |
| `XBOXAPP_ID` | Set to `"XXX"` if found; `null` if not. Store URL added as line comment. |
| `EXEC` / `EXEC_NAME` | Steam launch options (executable filename) |
| `BINARIES_PATH` | Steam launch options (directory parts of exe path) |
| `EPIC_CODE_NAME` | Steam launch path (`/Binaries/` prefix folder) or SteamDB installdir |
| `GAME_STRING` and variants | Exe base name (without `.exe`) |
| `PCGAMINGWIKI_URL` | PCGamingWiki search API |
| `hasXbox` toggle | Set to `true` if Xbox version found via PCGamingWiki |
| `DISCOVERY_IDS_ACTIVE` | Populated with all resolved store ID variables |
| `exec.png` | Steam CDN icon, resized to 64×64 |
| `{game_id}.jpg` | SteamGridDB hero or Steam `library_hero.jpg`, cropped to 640×360 |
| `{game_id}_title.jpg` | SteamGridDB hero+logo composite (or 920x430 grid, or Steam capsule fallback), saved to `resources/title-images/` |
| `{game_id}_banner.jpg` | SteamGridDB official hero at full size, saved to `resources/banner-images/`. Requires `STEAMGRIDDB_API_KEY`. |
| `DEV_REGSTRING`, `GAME_REGSTRING`, `SAVE_FOLDERNAME`, `CONFIG_FOLDERNAME` | PCGamingWiki Unity save/config paths (Unity templates only) |
| `ENGINE_VERSION` | PCGamingWiki build version string (UE4/5 template only) |
| `EXTENSION_EXPLAINED.md` | Generated by `generate_explained.js` |

Line-end URL comments are added to `STEAMAPP_ID` (SteamDB), `STEAMAPP_ID_DEMO` (SteamDB), `GOGAPP_ID` (gogdb.org), `XBOXAPP_ID`, and `EPICAPP_ID` where values are found.

### Fields Always Left for Manual Entry

- `XBOXEXECNAME`, `XBOX_PUB_ID` — cannot be looked up automatically
- `EXTENSION_URL` — can only be set after creating the Nexus Mods page
- Game-specific paths (`DATA_FOLDER`, etc.) — `CONFIG_FOLDERNAME` and `SAVE_FOLDERNAME` are auto-populated from PCGamingWiki for Unity templates (see "What It Automates" table above)

### new_extension.py — Null vs XXX

Only store ID fields are set to `null` when not found (`EPICAPP_ID`, `GOGAPP_ID`, `XBOXAPP_ID`, `STEAMAPP_ID_DEMO`). All other fields that could not be resolved (`PCGAMINGWIKI_URL`, `EPIC_CODE_NAME`, `GAME_STRING` variants) are left as `"XXX"` so they remain obvious manual-entry placeholders.

### new_extension.py — Auto-Run Steps

After writing `index.js`, the script automatically runs:

1. `node generate_explained.js {GAME_ID}` — generates `EXTENSION_EXPLAINED.md`
2. `python categorize_games.py {GAME_ID}` — adds the game to the correct engine category file in `resources/lists/`
3. `python setup_test_folder.py {GAME_ID}` — creates a minimal test game folder
4. `npx eslint game-{GAME_ID}/index.js` — lints the generated extension (warns on issues)

It also opens the PCGamingWiki page, SteamDB info page, and Steam demo page (if a demo exists) in the default browser, and opens each saved image and `index.js` with `os.startfile`.

---

## generate_explained.js

Reads each extension's `index.js` and generates an `EXTENSION_EXPLAINED.md` file describing how the extension works — game info, store IDs, mod types, installers, tools, paths, and feature toggles.

### generate_explained.js — Requirements

Node.js (no additional packages required).

### generate_explained.js — Usage

```sh
node generate_explained.js
node generate_explained.js GAME_ID [GAME_ID ...]
```

Run without arguments to process all `game-*` and `template-*` folders.
Pass one or more bare `GAME_ID` values to target specific extensions (e.g. `thelongdark`).

### generate_explained.js — Examples

```sh
node generate_explained.js
node generate_explained.js deathstranding2onthebeach
node generate_explained.js thelongdark hogwartslegacy
```

### generate_explained.js — Output

Always writes `EXTENSION_EXPLAINED.md` into each processed extension folder (overwrites any existing file). Reports a count of created, skipped, and errored files on completion.

---

## lint_extensions.js

Runs ESLint on every `game-*/index.js` file in the repo and prints per-file pass/fail status with a summary. Uses the `eslint.config.js` at the repo root for configuration.

### lint_extensions.js — Requirements

Node.js (no additional packages required). ESLint must be installed (`npm install` at repo root).

### lint_extensions.js — Usage

```sh
node lint_extensions.js
node lint_extensions.js GAME_ID [GAME_ID ...]
node lint_extensions.js --fix
node lint_extensions.js GAME_ID [GAME_ID ...] --fix
node lint_extensions.js --templates
node lint_extensions.js --quiet
node lint_extensions.js --json
```

- No arguments — lints all `game-*/index.js` files.
- `GAME_ID [GAME_ID ...]` — only lints the listed game IDs.
- `--fix` — runs ESLint with `--fix` to auto-repair fixable issues.
- `--templates` — also includes `template-*/index.js` files.
- `--quiet` — suppresses `[OK]` lines; only shows failures.
- `--json` — writes machine-readable JSON to stdout instead of human-readable text. `lint_results.txt` is still written. Useful for CI pipelines that parse the output.

### lint_extensions.js — Examples

```sh
node lint_extensions.js
node lint_extensions.js mewgenics
node lint_extensions.js cairn crimsondesert --fix
node lint_extensions.js --templates --quiet
```

### lint_extensions.js — Output

Per-file status: `[OK]` for passing files, `[FAIL]` with ESLint output for failures. Summary line at the end with pass/fail counts and a list of failed game IDs. Exits with code `0` if all pass, `1` if any fail. Always writes the full output to `lint_results.txt` in the repo root (overwrites on each run).

With `--json`, stdout receives a JSON object instead:

```json
{
  "timestamp": "...",
  "passed": 5,
  "failed": 1,
  "total": 6,
  "results": [{ "id": "game-id", "path": "game-id/index.js", "ok": true, "output": "" }, ...],
  "failedIds": ["game-id"]
}
```

---

## categorize_games.py

Scans all `game-*` extension folders and categorizes them by engine or framework based on the `Structure:` header comment and key code markers in each `index.js`. Writes one `.txt` file per category into `resources/lists/`. Each line in the file is a `GAME_ID`.

Also called automatically by `new_extension.py` to add a newly created extension to the correct category file.

### categorize_games.py — Requirements

No additional packages required (Python stdlib only).

### categorize_games.py — Usage

```sh
python categorize_games.py
python categorize_games.py GAME_ID [GAME_ID ...]
python categorize_games.py --dry-run
```

Run without arguments to rebuild all category files from scratch by scanning every `game-*` folder.
Pass one or more positional `GAME_ID` args to add or update specific games (adds each to its correct file, removes from any others).
Use `--dry-run` to print what would be written without modifying any `.txt` files.

### categorize_games.py — Examples

```sh
python categorize_games.py
python categorize_games.py hogwartslegacy
```

### categorize_games.py — Output Files

| File | Category |
| --- | --- |
| `resources/lists/games-ue4-5.txt` | Unreal Engine 4/5 |
| `resources/lists/games-ue2-3.txt` | Unreal Engine 2/3 |
| `resources/lists/games-unity-bepinex.txt` | Unity + BepInEx (modtype-bepinex) |
| `resources/lists/games-unity-melonloader-bepinex.txt` | Unity + MelonLoader/BepInEx Hybrid |
| `resources/lists/games-unity-umm.txt` | Unity + UMM |
| `resources/lists/games-farcrygame.txt` | Far Cry / Dunia Engine |
| `resources/lists/games-rpgmaker.txt` | RPG Maker |
| `resources/lists/games-snowdrop.txt` | Snowdrop Engine |
| `resources/lists/games-godot.txt` | Godot Engine |
| `resources/lists/games-cobra-acse.txt` | Cobra Engine / ACSE |
| `resources/lists/games-reengine.txt` | RE Engine (REFramework / Fluffy) |
| `resources/lists/games-reloaded2.txt` | Reloaded-II |
| `resources/lists/games-anvil.txt` | Ubisoft Anvil Engine (AnvilToolkit) |
| `resources/lists/games-srmm.txt` | Shin Ryu Mod Manager (SRMM) |
| `resources/lists/games-frostbite.txt` | Frostbite Engine (Frosty Mod Manager) |
| `resources/lists/games-basic.txt` | Basic / Proprietary (catch-all) |

### categorize_games.py — Detection

Each game is matched against categories in order — the first match wins. Detection uses the `Structure:` comment on line 3 of `index.js` as the primary signal, with fallback checks for unique code markers such as `const UNREALDATA =`, `const ATK_ID =`, `context.requireExtension('modtype-bepinex')`, etc.

---

## port_to_template.py

Ports an existing game extension to a target template's structure. Reads the template's `index.js` as the base and transplants the game's constant values into all `"XXX"` placeholders, `null` fields, and numeric `0` sentinels. Writes the result back to the game's `index.js` (with a `.bak` backup).

The core rule: mod type IDs (e.g. `FLUFFY_ID`, `MOD_ID`, `ROOT_ID`) are **always preserved from the game**. Vortex stores mod assignments by these IDs — changing them would break existing user setups. If the game uses a different suffix than the template (e.g. `${GAME_ID}-fluffymodmanager` vs the template's `${GAME_ID}-fluffymanager`), the template literal is rewritten to keep the game's suffix.

### port_to_template.py — Requirements

No additional packages required (Python stdlib only). `node` must be on `PATH` for JS syntax validation.

### port_to_template.py — Usage

```sh
python port_to_template.py GAME_ID TEMPLATE_NAME
python port_to_template.py GAME_ID TEMPLATE_NAME --dry-run
python port_to_template.py GAME_ID TEMPLATE_NAME --force
```

`GAME_ID` is the folder name without the `game-` prefix. `TEMPLATE_NAME` is the folder name without the `template-` prefix.

### port_to_template.py — Examples

```sh
python port_to_template.py dragonsdogma2 reframework-fluffy --dry-run
python port_to_template.py dragonsdogma2 reframework-fluffy
```

### port_to_template.py — Substitution Rules

| Template value | Condition | Action |
| --- | --- | --- |
| `"XXX"` / `"XXX.exe"` / etc. | Game has a non-`"XXX"` value for the same name | Substitute game value |
| `` `${GAME_ID}-SUFFIX` `` | Game uses a different suffix | Rewrite to `` `${GAME_ID}-GAME_SUFFIX` `` |
| `` `${GAME_ID}-SUFFIX` `` | Suffix matches | Leave as-is |
| `null` | Game has a non-null, non-`"XXX"` value | Substitute game value |
| `0` (numeric) | Game has a non-zero value | Substitute game value |
| `DISCOVERY_IDS_ACTIVE` | Always | Rebuilt from game's `discovery.ids` references |
| `IGNORE_CONFLICTS` / `IGNORE_DEPLOY` | Game has different values | Substitute game's array literal |
| Boolean toggles | Always | Left at template defaults |
| Not found in game | — | Left at template default (listed as skipped) |

Game constants that have no mapping in the template are printed as **manual review** items.

### port_to_template.py — Output

Prints a substitution report before writing anything:

- **N substitution(s) applied** — name, old template value, new game value
- **N constant(s) left as template default** — names not found in the game source
- **Manual review** — game constants with no template counterpart (check if inline use in `path.join()` or spec fields needs updating)
- **Reminders** — remaining XXX check, inline string check, `node --check` command

A `.bak` file is written alongside `index.js` before overwriting. Use `--force` to overwrite an existing `.bak`. After writing, `generate_explained.js` is run automatically to regenerate `EXTENSION_EXPLAINED.md`.

---

## release_extension.py

Packages a game extension folder into a `.zip` archive using 7-Zip and opens the extension's Nexus Mods page in the default browser.

### release_extension.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `SEVENZIP_PATH` | Optional | Path to `7z.exe`. Defaults to `C:\Program Files\7-Zip\7z.exe`. |

### release_extension.py — Usage

```sh
python release_extension.py GAME_ID [GAME_ID ...]
python release_extension.py GAME_ID --no-open
python release_extension.py GAME_ID --dry-run
```

Pass one or more `GAME_ID` values to release multiple extensions in one run.
Use `--no-open` to skip opening the browser (useful for testing or bulk releases).
Use `--dry-run` to print what would be generated and zipped without running 7-Zip.

### release_extension.py — Examples

```sh
python release_extension.py hollowknight
python release_extension.py assassinscreedorigins assassinscreedvalhalla --no-open
```

### release_extension.py — Output

**Aborts** if `CHANGELOG.md` is missing, if `info.json` version has no matching `## [X.Y.Z]` section in `CHANGELOG.md`, or if `const debug = true` is found in `index.js`. Warns (but does not abort) if `info.json` version does not match the _latest_ `## [X.X.X]` entry in `CHANGELOG.md`. Renames the versioned `.txt` file (e.g. `0.2.7.txt` -> `0.2.8.txt`) to match the current version. Updates the `Version:` and `Date:` lines in the `index.js` header comment — version from `info.json`, date from the most recent `## [X.X.X] - YYYY-MM-DD` entry in `CHANGELOG.md`. Adds any resolved store IDs to `DISCOVERY_IDS_ACTIVE` if not already present. Runs `node --check` on `index.js` and warns on syntax errors. Then runs `generate_explained.js` to regenerate `EXTENSION_EXPLAINED.md` and creates `game-{GAME_ID}.zip` inside the extension folder, overwriting any existing zip. Reads `EXTENSION_URL` from `index.js` — if set to a valid URL, opens it in the default browser so the file can be uploaded. If `EXTENSION_URL` is `"XXX"` or not present, opens `https://www.nexusmods.com/games/site` instead.

---

## patch_extensions.py

Generic framework for making repo-wide changes to all `game-*/index.js` files. Each patch is a named, independently-enabled function registered in the `PATCHES` list. New patches can be added without touching the runner logic.

Also resizes all non-64x64 PNG files in `game-*` and `template-*` folders to 64x64, all non-1920x1080 title images in `resources/title-images/` to 1920x1080, and all non-640x360 cover art (`GAME_ID.jpg`) in `game-*` folders to 640x360, after the patch run.

### patch_extensions.py — Requirements

- `Pillow` — for PNG resizing (`pip install Pillow`). Patches still run without it; only PNG resize is skipped.

### patch_extensions.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VORTEX_MANIFEST_PATH` | Optional | Path to the Vortex extensions manifest JSON. Defaults to `C:\ProgramData\vortex\temp\extensions-manifest.json`. Used by the `extension_url` patch. |

### patch_extensions.py — Usage

```sh
python patch_extensions.py
python patch_extensions.py GAME_ID [GAME_ID ...]
python patch_extensions.py --dry-run
python patch_extensions.py GAME_ID [GAME_ID ...] --dry-run
python patch_extensions.py --force
python patch_extensions.py --force-pcgw
python patch_extensions.py GAME_ID [GAME_ID ...] --debug
python patch_extensions.py --list-patches
python patch_extensions.py --only PATCH_NAME
python patch_extensions.py GAME_ID [GAME_ID ...] --only PATCH_NAME
```

Run without arguments to apply all enabled patches to every `game-*` folder.
Pass `GAME_ID [GAME_ID ...]` to target specific games. Use `--dry-run` to preview without writing.
Use `--force` to re-run all URL patches even if values are already set (implies `--force-pcgw`).
Use `--force-pcgw` to re-evaluate `PCGAMINGWIKI_URL` values that are already set (e.g. to correct wrong URLs from a previous run).
Use `--debug` to print raw PCGamingWiki search results and match status for each game (useful for diagnosing lookup failures).
Use `--list-patches` to print all registered patches with their enabled status and description, then exit without running anything.
Use `--only PATCH_NAME` to run exactly one named patch, bypassing the `enabled` flag. Combine with `GAME_ID` to target a specific game.

### patch_extensions.py — Built-in Patches

| Patch | Description |
| --- | --- |
| `game_name` | Inserts `const GAME_NAME = "...";` after the `GAME_ID` line for extensions that don't define it. Name extracted from spec or `context.registerGame`. |
| `folder_vars` | Inserts any missing declarations from `GAME_PATH`, `GAME_VERSION`, `STAGING_FOLDER`, `DOWNLOAD_FOLDER`. Inserted in template order after `GAME_PATH`, or all together before `const spec = {` if `GAME_PATH` is also missing. |
| `utility_functions` | Inserts standard utility functions (`isDir`, `statCheckSync`, `statCheckAsync`, `getAllFiles`, `getDiscoveryPath`, `purge`, `deploy`) before `function modTypePriority` for any extension missing them. |
| `setup_vars` | Ensures `setup()` sets `GAME_PATH`, `STAGING_FOLDER`, and `DOWNLOAD_FOLDER` at the top of the function body. Only missing assignments are inserted. |
| `register_actions` | Injects standard `context.registerAction` calls inside `applyGame()` for any that are missing: Open Config/Save Folder (commented out), Open PCGamingWiki Page, View Changelog, Submit Bug Report, Open Downloads Folder. Each action is checked individually by its label string. |
| `context_once_api` | Inserts `const api = context.api;` as the first line inside every `context.once(() => { ... })` block that doesn't already have it. |
| `extension_url` | Sets `EXTENSION_URL` from the Vortex extensions manifest (`modId` → Nexus URL). Inserts the constant if missing. |
| `pcgamingwiki_url` | Sets `PCGAMINGWIKI_URL` by looking up the game on PCGamingWiki. Inserts as `"XXX"` if not found or API unreachable. |
| `epic_app_id` | Fills in `EPICAPP_ID = ""` by searching egdata.app for the game title and reading the EXECUTABLE item's `releaseInfo.appId`. Skips `null`, `"XXX"`, and already-set IDs. |
| `discovery_ids` | Adds all resolved store IDs (`STEAMAPP_ID_DEMO`, `GOGAPP_ID`, `EPICAPP_ID`, `XBOXAPP_ID`, `UPLAYAPP_ID`, `EAAPP_ID`) to `DISCOVERY_IDS_ACTIVE` if not already present. Uses `add_to_discovery_ids()` from `vortex_utils`. |

Each patch skips a game if the value is already set (unless `--force-pcgw` is used for `pcgamingwiki_url`). Games that fail a non-trivial step are always printed in the output so failures are visible. After writing any changed `index.js`, `generate_explained.js` is run automatically to keep `EXTENSION_EXPLAINED.md` in sync.

After all patches run, PNGs are resized to 64x64, title images in `resources/title-images/` are resized to 1920x1080, and cover art (`GAME_ID.jpg`) in each `game-*` folder is resized to 640x360 (all require Pillow). When targeting specific games, only those game folders are checked. When running on all, all `game-*` and `template-*` folders are checked for PNGs.

### patch_extensions.py — Adding New Patches

Add an entry to the `PATCHES` list at the bottom of the script:

```python
{"name": "my_patch", "enabled": True, "fn": my_patch_function}
```

Each patch function receives `(game_id, src, context)` and returns `(new_src, changed: bool, message: str)`.

---

## setup_test_folder.py

Creates a minimal fake game installation for testing a Vortex extension. Reads `GAME_NAME`, `EXEC`/`EXEC_NAME`, and `BINARIES_PATH` from `index.js` and creates an empty `.exe` file at the correct path so Vortex can detect the game.

### setup_test_folder.py — Requirements

No additional packages required (Python stdlib only).

### setup_test_folder.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VORTEX_TEST_ROOT` | Optional | Root directory for test game folders. Defaults to `D:\Game_Tools_D\!TestGameFolders_D`. |

### setup_test_folder.py — Usage

```sh
python setup_test_folder.py GAME_ID [GAME_ID ...]
python setup_test_folder.py GAME_ID --dry-run
python setup_test_folder.py GAME_ID --force
python setup_test_folder.py GAME_ID [GAME_ID ...] --clean
python setup_test_folder.py GAME_ID [GAME_ID ...] --clean --dry-run
```

Use `--dry-run` to print what would be created or deleted without making any changes.
Use `--force` to recreate the `.exe` stub even if it already exists.
Use `--clean` to delete the test folder(s) for the given game ID(s) instead of creating them.

### setup_test_folder.py — Examples

```sh
python setup_test_folder.py hollowknight
python setup_test_folder.py helldivers2 reddeadredemption2
```

### setup_test_folder.py — Output

Creates `D:\Game_Tools_D\!TestGameFolders_D\{GAME_NAME}\{BINARIES_PATH}\{EXEC_NAME}` as an empty file with all parent directories. If the file already exists it reports so and skips creation. Uses a symbol table built from `index.js` to resolve template literals, `path.join()` expressions, and variable references. Falls back to `STEAM_EXEC` / `EXEC_STEAM` for games that use store-specific exec constants instead of a single `EXEC`. If `REQ_FILE` is defined in `index.js` and resolves to a different path than the exe, also creates that path — as a directory if the basename has no extension, otherwise as an empty file.

---

## audit_scripts.py

Runs three audits and reports drift found in any:

1. **Header docstring audit** — compares each script's argparse flags and env-var reads against the flags and env vars documented in its own header docstring (`Usage:` and `Environment variables:` sections).
2. **SCRIPTS.md audit** — compares the same code-extracted flags and env vars against the corresponding script section in SCRIPTS.md (`### name — Usage` and `### name — Environment Variables` subsections).
3. **scripts.txt cross-check** — warns when a `*.py` in the repo root is not listed in `scripts.txt`, or when `scripts.txt` references a missing file.

Read-only; never modifies any file. Uses `iter_repo_scripts()` from `vortex_utils` to iterate the canonical script list in `scripts.txt`. Skips `vortex_utils.py` (library), `generate_explained.js` (Node), and `SCRIPTS.md`.

### audit_scripts.py — Requirements

No additional packages required (Python stdlib only).

### audit_scripts.py — Usage

```sh
python audit_scripts.py
python audit_scripts.py SCRIPT [SCRIPT ...]
```

Run without arguments to audit all scripts. Pass one or more filenames to audit a subset.

### audit_scripts.py — Output

Two sections, each with a per-script report listing:

- **Flags in code, missing from header/SCRIPTS.md** — `add_argument('--flag')` calls not documented
- **Flags in header/SCRIPTS.md, not in argparse** — `--flag` patterns in docs that have no matching `add_argument` call
- **Env vars in code, missing from header/SCRIPTS.md** — `os.environ.get('VAR')` / `os.getenv('VAR')` / `get_api_key('VAR')` calls not documented
- **Env vars in header/SCRIPTS.md, not in code** — vars listed in docs that are not read directly (vars consumed inside `vortex_utils` helpers are allowed here)

Exits with a summary line: `All clear.` or `Drift found. Update headers, SCRIPTS.md, or scripts.txt to match the code.`

---

## vortex_gui.py

GUI dashboard for running developer scripts against game extensions. Lists all `game-*` extensions in a sortable, filterable table with a toolbar of script actions.

### vortex_gui.py — Requirements

```sh
pip install pyside6
```

### vortex_gui.py — Usage

```sh
python vortex_gui.py
```

No arguments. Launches the window, which loads all extensions automatically.

### vortex_gui.py — Layout

```text
[ Filter: ____________ ]  [Refresh]  [New Game...]
[ Release ] [ Lint ] [ Generate Explained ] [ Port to Template... ]
[ Fetch Icon ] [ Fetch Cover ] [ Fetch Title ] [ Fetch Banner ] [ Fetch Nexus Stats ]
[ Setup Test Folder ] [ Patch ] | [ Open Folder ] [ Open in Editor ]
-------------------------------------------------------------------------------
| Game ID | Name | Ver | Date | Engine | End | DL | Cover | Title | Banner |...
| sortable QTableView, multi-select with Ctrl/Shift                           |
-------------------------------------------------------------------------------
| Log pane (live subprocess output)    [Clear Log] [Stop Running] |
```

- `End` — Nexus endorsement count (blank until `Fetch Nexus Stats` is run; sorts numerically).
- `DL` — Nexus unique download count (same). Tooltip shows the last fetch timestamp.

- **Sort**: click any column header.
- **Filter**: case-insensitive substring match on Game ID and Name.
- **Multi-select**: Ctrl/Shift-click rows; toolbar buttons pass all selected GAME_IDs in one call.
- **Right-click**: context menu with the same script actions.
- **Double-click**: opens `index.js` in the default editor.
- **Status bar**: shows `N games shown | M selected`.

### vortex_gui.py — Toolbar Actions

| Button | Script invoked |
| --- | --- |
| Release | `python release_extension.py <ids>` |
| Lint | `node lint_extensions.js <ids>` |
| Generate Explained | `node generate_explained.js <ids>` |
| Port to Template... | Dialog to pick template, then `python port_to_template.py <id> <template>` per game |
| Fetch Icon | `python fetch_exec_icon.py <ids>` |
| Fetch Cover | `python fetch_cover_art.py <ids>` |
| Fetch Title | `python fetch_cover_art.py --title <ids>` |
| Fetch Banner | `python fetch_cover_art.py --banner <ids>` |
| Fetch Nexus Stats | `python fetch_nexus_stats.py <ids>` |
| Setup Test Folder | `python setup_test_folder.py <ids>` |
| Patch | `python patch_extensions.py <ids>` |
| Open Folder | `os.startfile(folder)` — no subprocess |
| Open in Editor | `os.startfile(index.js)` — no subprocess |

Toolbar buttons are disabled when no rows are selected and while a script is running. Only one script runs at a time; click **Stop Running** to kill the active process.

### vortex_gui.py — New Game Dialog

Triggered by the **New Game...** button. Fields:

| Field | Description |
| --- | --- |
| Template | Combo box populated from all `template-*` folders (prefix stripped) |
| Game | Free-text game name or numeric Steam App ID |
| --force | Overwrite an existing extension folder |
| --no-images | Skip art downloads |
| --dry-run | Preview only — no files written |

Runs `python new_extension.py <template> "<game>" [flags]`. On success (without `--dry-run`), the table refreshes automatically to show the new game.

### vortex_gui.py — Output

Script output (stdout + stderr merged) streams live into the log pane at the bottom of the window. The log pane scrolls automatically and holds up to 5000 lines.
