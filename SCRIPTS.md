# Scripts

Developer scripts for creating and documenting Vortex game extensions.

---

## fetch_exec_icon.py

Scans all `game-*` extension folders and downloads a 64x64 PNG icon for any extension missing its `exec.png` file. Reads `STEAMAPP_ID` and `GAME_NAME` directly from each `index.js`. Imports icon-download logic from `new_extension.py`.

### fetch_exec_icon.py — Requirements

```sh
pip install Pillow
```

### fetch_exec_icon.py — Usage

```sh
python fetch_exec_icon.py
python fetch_exec_icon.py --game GAME_ID
python fetch_exec_icon.py --dry-run
python fetch_exec_icon.py --force
```

- No arguments — scans all `game-*` folders and downloads missing icons.
- `--game GAME_ID` — only processes the extension with that game ID.
- `--dry-run` — lists missing files without downloading anything.
- `--force` — re-downloads `exec.png` even if it already exists.

### fetch_exec_icon.py — Output

- Saved files are written as `exec.png` (64x64 PNG) into each extension folder.
- Extensions without a `STEAMAPP_ID` in `index.js` are skipped with a note.
- A summary of saved / failed / skipped counts is printed at the end.

---

## fetch_cover_art.py

Scans all `game-*` extension folders and downloads a 640x360 JPG cover art image for any extension missing its `{GAME_ID}.jpg` file. Reads `STEAMAPP_ID` directly from each `index.js` to look up art. Imports image-download logic from `new_extension.py`.

### fetch_cover_art.py — Requirements

```sh
pip install Pillow
```

### fetch_cover_art.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `STEAMGRIDDB_API_KEY` | Optional | SteamGridDB API key. Used for higher-quality hero art. Falls back to Steam `library_hero.jpg` if not set. |

### fetch_cover_art.py — Usage

```sh
python fetch_cover_art.py
python fetch_cover_art.py --game GAME_ID
python fetch_cover_art.py --dry-run
python fetch_cover_art.py --force
```

- No arguments — scans all `game-*` folders and downloads missing art.
- `--game GAME_ID` — only processes the extension with that game ID.
- `--dry-run` — lists missing files without downloading anything.
- `--force` — re-downloads cover art even if `{GAME_ID}.jpg` already exists.

### fetch_cover_art.py — Output

- Saved files are written as `{GAME_ID}.jpg` (640x360 JPEG) into each extension folder.
- Extensions without a `STEAMAPP_ID` in `index.js` are skipped with a note.
- A summary of saved / failed / skipped counts is printed at the end.

---

## new_extension.py

Bootstraps a new Vortex game extension folder from a template. Looks up game information automatically from Steam, GOG, Epic Games Store, and PCGamingWiki, then fills in as many fields as possible in `index.js`, `info.json`, and `CHANGELOG.md`. Downloads `exec.png` and cover art. Runs `generate_explained.js` at the end.

### new_extension.py — Requirements

```sh
pip install Pillow
```

### new_extension.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXUS_API_KEY` | Optional | Nexus Mods API key. Used to look up the correct `GAME_ID` domain name. Falls back to a derived name if not set. |
| `STEAMGRIDDB_API_KEY` | Optional | SteamGridDB API key. Used for higher-quality cover art (heroes). Falls back to Steam `library_hero.jpg` if not set. |

### new_extension.py — Usage

```sh
python new_extension.py --template TEMPLATE_NAME "Game Name"
python new_extension.py --template TEMPLATE_NAME STEAM_APP_ID
python new_extension.py --template TEMPLATE_NAME "Game Name" --force
python new_extension.py --template TEMPLATE_NAME "Game Name" --dry-run
```

The game input can be a quoted game name (searched on Steam) or a numeric Steam App ID.
Use `--force` to overwrite an existing folder.
Use `--dry-run` to run all lookups and print what would be created without writing any files.

### new_extension.py — Examples

```sh
python new_extension.py --template template-basicgame "Death Stranding 2"
python new_extension.py --template template-ue4-5game 3552140
python new_extension.py --template template-unitymelonloaderbepinex-hybrid "The Long Dark" --force
```

### Available Templates

| Template | Engine / Framework |
| --- | --- |
| `template-basicgame` | Proprietary engines and older games |
| `template-ue4-5game` | Unreal Engine 4/5 |
| `template-unitybepinex` | Unity + BepInEx |
| `template-unitymelonloaderbepinex-hybrid` | Unity + MelonLoader / BepInEx hybrid |
| `template-unity-umm` | Unity + UMM |
| `template-reframework-fluffy-game` | RE Engine |
| `template-reloaded2game` | Reloaded-II |
| `template-rpgmakergame` | RPG Maker |
| `template-godot-game` | Godot |
| `template-snowdropenginegame` | Snowdrop Engine |
| `template-farcrygame` | Far Cry / Dunia Engine |
| `template-cobraengineACSEgame` | Cobra Engine / ACSE |
| `template-tfcinstaller-ue2-3game` | Unreal Engine 2/3 |

### What It Automates

| Field | Source |
| --- | --- |
| `GAME_ID` | Nexus Mods domain name (`NEXUS_API_KEY` required); falls back to derived name (lowercase, alphanumeric) |
| `GAME_NAME` | Steam Store canonical name |
| `GAME_NAME_SHORT` | Steam name with subtitle stripped at `:` |
| `STEAMAPP_ID` | Steam search or direct App ID input |
| `STEAMAPP_ID_DEMO` | Steam `demos` array in appdetails |
| `GOGAPP_ID` | GOG catalog API (genuine title match only) |
| `EPICAPP_ID` | Set to `"XXX"` if found; `null` if not. Store URL added as comment. |
| `XBOXAPP_ID` | Set to `"XXX"` if found; `null` if not. Store URL added as comment. |
| `EXEC` / `EXEC_NAME` | Steam launch options (executable filename) |
| `BINARIES_PATH` | Steam launch options (directory parts of exe path) |
| `EPIC_CODE_NAME` | Steam launch path (`/Binaries/` prefix folder) or SteamDB installdir |
| `GAME_STRING` and variants | Exe base name (without `.exe`) |
| `PCGAMINGWIKI_URL` | PCGamingWiki search API |
| `hasXbox` toggle | Set to `true` if Xbox version found via PCGamingWiki |
| `DISCOVERY_IDS_ACTIVE` | Populated with all resolved store ID variables |
| `exec.png` | Steam CDN icon, resized to 64×64 |
| `{game_id}.jpg` | SteamGridDB hero or Steam `library_hero.jpg`, cropped to 640×360 |
| `EXTENSION_EXPLAINED.md` | Generated by `generate_explained.js` |

### Fields Always Left for Manual Entry

- `XBOXEXECNAME`, `XBOX_PUB_ID` — cannot be looked up automatically
- `EXTENSION_URL` — can only be set after creating the Nexus Mods page
- Any game-specific paths (`DATA_FOLDER`, `CONFIG_FOLDERNAME`, `SAVE_FOLDERNAME`, etc.)

### new_extension.py — Null vs XXX

Only store ID fields are set to `null` when not found (`EPICAPP_ID`, `GOGAPP_ID`, `XBOXAPP_ID`, `STEAMAPP_ID_DEMO`). All other fields that could not be resolved (`PCGAMINGWIKI_URL`, `EPIC_CODE_NAME`, `GAME_STRING` variants) are left as `"XXX"` so they remain obvious manual-entry placeholders.

### new_extension.py — Auto-Run Steps

After writing `index.js`, the script automatically runs:

1. `generate_explained.js --game game-{GAME_ID}` — generates `EXTENSION_EXPLAINED.md`
2. `categorize_games.py --game {GAME_ID}` — adds the game to the correct engine category file in `resources/`

---

## generate_explained.js

Reads each extension's `index.js` and generates an `EXTENSION_EXPLAINED.md` file describing how the extension works — game info, store IDs, mod types, installers, tools, paths, and feature toggles.

### generate_explained.js — Requirements

Node.js (no additional packages required).

### generate_explained.js — Usage

```sh
node generate_explained.js
node generate_explained.js --game game-thelongdark
```

Run without arguments to process all `game-*` and `template-*` folders.
Use `--game` to process a single extension folder by name.

### generate_explained.js — Examples

```sh
node generate_explained.js
node generate_explained.js --game game-deathstranding2onthebeach
node generate_explained.js --game template-ue4-5game
```

### generate_explained.js — Output

Writes `EXTENSION_EXPLAINED.md` into each processed extension folder. Skips folders where the file already exists (unless the source `index.js` has been modified more recently). Reports a count of created, skipped, and errored files on completion.

---

## categorize_games.py

Scans all `game-*` extension folders and categorizes them by engine or framework based on the `Structure:` header comment and key code markers in each `index.js`. Writes one `.txt` file per category into `resources/`. Each line in the file is a `GAME_ID`.

Also called automatically by `new_extension.py` (step 15) to add a newly created extension to the correct category file.

### categorize_games.py — Requirements

No additional packages required (Python stdlib only).

### categorize_games.py — Usage

```sh
python categorize_games.py
python categorize_games.py --game GAME_ID
python categorize_games.py --dry-run
```

Run without arguments to rebuild all category files from scratch by scanning every `game-*` folder.
Use `--game` to add or update a single game (adds to its correct file, removes from any others).
Use `--dry-run` to print what would be written without modifying any `.txt` files.

### categorize_games.py — Examples

```sh
python categorize_games.py
python categorize_games.py --game hogwartslegacy
```

### categorize_games.py — Output Files

| File | Category |
| --- | --- |
| `resources/games-ue4-5.txt` | Unreal Engine 4/5 |
| `resources/games-ue2-3.txt` | Unreal Engine 2/3 |
| `resources/games-unity-bepinex.txt` | Unity + BepInEx (modtype-bepinex) |
| `resources/games-unity-melonloader-bepinex.txt` | Unity + MelonLoader/BepInEx Hybrid |
| `resources/games-unity-umm.txt` | Unity + UMM |
| `resources/games-farcrygame.txt` | Far Cry / Dunia Engine |
| `resources/games-rpgmaker.txt` | RPG Maker |
| `resources/games-snowdrop.txt` | Snowdrop Engine |
| `resources/games-godot.txt` | Godot Engine |
| `resources/games-cobra-acse.txt` | Cobra Engine / ACSE |
| `resources/games-reengine.txt` | RE Engine (REFramework / Fluffy) |
| `resources/games-reloaded2.txt` | Reloaded-II |
| `resources/games-anvil.txt` | Ubisoft Anvil Engine (AnvilToolkit) |
| `resources/games-basic.txt` | Basic / Proprietary (catch-all) |

### categorize_games.py — Detection

Each game is matched against categories in order — the first match wins. Detection uses the `Structure:` comment on line 3 of `index.js` as the primary signal, with fallback checks for unique code markers such as `const UNREALDATA =`, `const ATK_ID =`, `context.requireExtension('modtype-bepinex')`, etc.

---

## nexus_games_report.py

Fetches the full Nexus Mods games list and filters to games approved within a given time window. Sorts by downloads descending and writes a Markdown table to `nexus_games_report.md`. Checks the local Vortex extensions manifest to flag games that already have a Vortex extension.

### nexus_games_report.py — Requirements

| Variable | Required | Description |
| --- | --- | --- |
| `NEXUS_API_KEY` | Required | Nexus Mods API key. Read from environment or Windows registry fallback. |

### nexus_games_report.py — Usage

```sh
python nexus_games_report.py DAYS
python nexus_games_report.py DAYS --new-only
python nexus_games_report.py DAYS --dry-run
```

`DAYS` is the size of the time window in days (counting back from today). Defaults to `90` if omitted.
Use `--new-only` to exclude games that already have a Vortex extension in the manifest.
Use `--dry-run` to print the report to the console instead of writing `nexus_games_report.md`.

### nexus_games_report.py — Examples

```sh
python nexus_games_report.py 120
python nexus_games_report.py 60 --new-only
```

### nexus_games_report.py — Output

Writes `nexus_games_report.md` in the repo root. The table includes: row number, supported status, game name (as a Nexus Mods link), mod count, downloads in thousands (one decimal place), and approval date. Games with fewer than 500 downloads are excluded.

### nexus_games_report.py — Manifest Path

The extensions manifest is read from `C:\ProgramData\vortex\temp\extensions-manifest.json`. This file is written by Vortex when it fetches the extensions list. If not found, the Supported column will be blank and a warning is printed.

---

## release_extension.py

Packages a game extension folder into a `.zip` archive using 7-Zip and opens the extension's Nexus Mods page in the default browser.

### release_extension.py — Requirements

7-Zip must be installed at `C:\Program Files\7-Zip\7z.exe`.

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

Runs `generate_explained.js` first to regenerate `EXTENSION_EXPLAINED.md`, then creates `game-{GAME_ID}.zip` inside the extension folder, overwriting any existing zip. Reads `EXTENSION_URL` from `index.js` — if set to a valid URL, opens it in the default browser so the file can be uploaded. Skips the browser open if `EXTENSION_URL` is `"XXX"` or not present.

---

## patch_extensions.py

Generic framework for making repo-wide changes to all `game-*/index.js` files. Each patch is a named, independently-enabled function registered in the `PATCHES` list. New patches can be added without touching the runner logic.

### patch_extensions.py — Requirements

No additional packages required (Python stdlib only).

### patch_extensions.py — Usage

```sh
python patch_extensions.py
python patch_extensions.py --game GAME_ID
python patch_extensions.py --dry-run
python patch_extensions.py --game GAME_ID --dry-run
python patch_extensions.py --force
python patch_extensions.py --force-pcgw
python patch_extensions.py --game GAME_ID --debug
```

Run without arguments to apply all enabled patches to every `game-*` folder.
Use `--game` to target a single game. Use `--dry-run` to preview without writing.
Use `--force` to re-run all URL patches even if values are already set (implies `--force-pcgw`).
Use `--force-pcgw` to re-evaluate `PCGAMINGWIKI_URL` values that are already set (e.g. to correct wrong URLs from a previous run).
Use `--debug` to print raw PCGamingWiki search results and match status for each game (useful for diagnosing lookup failures).

### patch_extensions.py — Built-in Patches

| Patch | Description |
| --- | --- |
| `game_name` | Inserts `const GAME_NAME = "...";` after the `GAME_ID` line for extensions that don't define it. Name extracted from spec or `context.registerGame`. |
| `folder_vars` | Inserts any missing declarations from `GAME_PATH`, `GAME_VERSION`, `STAGING_FOLDER`, `DOWNLOAD_FOLDER`. Inserted in template order after `GAME_PATH`, or all together before `const spec = {` if `GAME_PATH` is also missing. |
| `utility_functions` | Inserts standard utility functions (`isDir`, `statCheckSync`, `statCheckAsync`, `getAllFiles`, `getDiscoveryPath`, `purge`, `deploy`) before `function modTypePriority` for any extension missing them. |
| `setup_vars` | Ensures `setup()` sets `GAME_PATH`, `STAGING_FOLDER`, and `DOWNLOAD_FOLDER` at the top of the function body. Only missing assignments are inserted. |
| `context_once_api` | Inserts `const api = context.api;` as the first line inside every `context.once(() => { ... })` block that doesn't already have it. |
| `extension_url` | Sets `EXTENSION_URL` from the Vortex extensions manifest (`modId` → Nexus URL). Inserts the constant if missing. |
| `pcgamingwiki_url` | Sets `PCGAMINGWIKI_URL` by looking up the game on PCGamingWiki. Inserts as `"XXX"` if not found or API unreachable. |

Each patch skips a game if the value is already set (unless `--force-pcgw` is used for `pcgamingwiki_url`). Games that fail a non-trivial step are always printed in the output so failures are visible. After writing any changed `index.js`, `generate_explained.js` is run automatically to keep `EXTENSION_EXPLAINED.md` in sync.

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

### setup_test_folder.py — Usage

```sh
python setup_test_folder.py GAME_ID [GAME_ID ...]
python setup_test_folder.py GAME_ID --dry-run
python setup_test_folder.py GAME_ID --force
```

Use `--dry-run` to print what would be created without making any directories or files.
Use `--force` to recreate the `.exe` stub even if it already exists.

### setup_test_folder.py — Examples

```sh
python setup_test_folder.py hollowknight
python setup_test_folder.py helldivers2 reddeadredemption2
```

### setup_test_folder.py — Output

Creates `D:\Game_Tools_D\!TestGameFolders_D\{GAME_NAME}\{BINARIES_PATH}\{EXEC_NAME}` as an empty file with all parent directories. If the file already exists it reports so and skips creation. Uses a symbol table built from `index.js` to resolve template literals, `path.join()` expressions, and variable references. Falls back to `STEAM_EXEC` / `EXEC_STEAM` for games that use store-specific exec constants instead of a single `EXEC`.
