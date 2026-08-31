# Scripts

Developer scripts for creating and documenting Vortex game extensions.

Script index: [scripts.txt](scripts.txt) — one filename per line; keep in sync when adding or removing scripts.

---

## resources/BOOTSTRAP.md

Setup guide for the script environment on a new PC. Update this file whenever any of the following change:

- Python package dependencies (`PySide6`, `Pillow`, `requests`, etc.)
- Node.js / npm dev dependencies (`package.json`)
- Windows environment variables (names, default values, or which scripts consume them)
- The location of `extensions-manifest.json` or other external file paths
- Minimum Python or Node version requirements

File: [resources/BOOTSTRAP.md](resources/BOOTSTRAP.md)

---

## vortex_utils.py

Shared utility module imported by all other scripts. Centralizes common patterns to eliminate duplication across the script suite.

### vortex_utils.py -- Contents

| Export | Description |
| --- | --- |
| `REPO_ROOT` | Absolute path to the repository root directory |
| `PCGW_API` | PCGamingWiki API base URL |
| `PCGW_USER_AGENT` | Descriptive User-Agent sent on every PCGamingWiki request (the site returns HTTP 403 for generic library defaults) |
| `NEXUS_USER_AGENT` | Identifying User-Agent sent on every Nexus Mods v1/v3 request (repo name + URL + OS + Python version), which the Nexus API asks clients to supply. Applied via `_NEXUS_HEADERS` / `_NEXUS_V3_HEADERS`; also imported by `nexus_upload.py` and `check_nexus_api.py`. Non-Nexus hosts keep the generic browser-style agent — some of them bot-block anything else. |
| `EGDATA_API` | egdata.app API base URL |
| `GOGDB_BASE` | gogdb.org base URL (product search pages and `product.json` data files) |
| `TITLE_IMAGES_DIR` | Absolute path to `resources/title-images/` |
| `BANNER_IMAGES_DIR` | Absolute path to `resources/banner-images/` |
| `LISTS_DIR` | Absolute path to `resources/lists/` |
| `GAME_PREFIX` | `"game-"` string constant |
| `TEMPLATE_PREFIX` | `"template-"` string constant |
| `VORTEX_PLUGINS_DIR` | Resolved Vortex plugins directory path (`VORTEX_PLUGINS_DIR` env var, default `C:\ProgramData\vortex\plugins`) |
| `NEW_EXTENSION_VERSION` | Starting version for every newly created extension and template scaffold (`"1.0.0"`) |
| `read_index_js(folder)` | Read `index.js` from a game extension folder, returns source string or `None` |
| `write_index_js(folder, src)` | Write `src` to `index.js` in a game extension folder. Writes LF (`newline="\n"`) per `.editorconfig`; endings already in `src` pass through untouched |
| `extract_game_id(src)` | Extract `GAME_ID` value from `index.js` source |
| `extract_steamapp_id(src)` | Extract `STEAMAPP_ID` value from `index.js` source |
| `has_real_steamapp_id(src)` | Return `True` if `STEAMAPP_ID` is a real numeric value (not null or placeholder) |
| `extract_game_name(src)` | Extract `GAME_NAME` value from `index.js` source |
| `roman_to_arabic(name)` | Convert Roman numeral words to Arabic digits in a game title |
| `arabic_to_roman(name)` | Convert Arabic digit words to Roman numerals in a game title |
| `name_lookup_variants(name)` | Generate name variants for PCGamingWiki, Nexus Mods and store title lookups (title-case, numeral alternates, edition suffix stripping, franchise prefix stripping — `Tom Clancy's Ghost Recon Wildlands` also yields `Ghost Recon Wildlands` — and parenthetical-disambiguator stripping, so `God of War (2018)` also yields `God of War`; extensions add those to tell re-releases apart but no store listing carries them). Ordered original-first, loosest-last, so callers taking the first hit prefer an exact match. `_TITLE_PREFIXES` currently holds `Tom Clancy's` only; further prefixes (`Sid Meier's`, `Disney's`, `Marvel's`, …) sit commented out in the list, to be enabled once confirmed against the Nexus game list |
| `lookup_pcgamingwiki(name, debug)` | Search PCGamingWiki for a game, returns `(page_url, page_title)` with session caching |
| `pcgw_get_json(url)` | Fetch a PCGamingWiki `api.php` URL as parsed JSON, sending `PCGW_USER_AGENT`. Use for every PCGW request instead of `http_get_json`. |
| `get_api_key(key_name)` | Load an API key from env var with Windows registry fallback (HKCU, then HKLM) |
| `http_get(url, headers)` | Fetch a URL and return UTF-8 string. Retries up to 2 times on 429/5xx/network errors (2 s, 4 s delays). |
| `http_get_bytes(url, headers)` | Fetch a URL and return raw bytes. Same retry behaviour as `http_get`. |
| `http_get_json(url, headers)` | Fetch a URL and return the parsed JSON body. Same retry behaviour as `http_get`. |
| `http_post_json(url, data, headers)` | POST a JSON-serializable dict to a URL and return parsed JSON response. Same retry behaviour as `http_get`. |
| `egdata_search_queries(game_name)` | Ordered title strings to try against egdata's `/search`: every `name_lookup_variants()` alternate, each also offered with apostrophes replaced by a space. egdata returns zero results for any query containing an apostrophe (straight or curly), even when the indexed title has one. |
| `normalize_title_for_match(title)` | Fold a title to bare lowercase words — drops `®`/`™`, apostrophes and all other punctuation — so store and game spellings compare equal. |
| `strip_edition_suffix(normalized_title)` | Drop a trailing `... Edition` phrase from an already-normalized title, so `Far Cry 5 Standard Edition` compares equal to `Far Cry 5`. Only a suffix ending in the word `edition` is removed, keeping a distinct product like `Assassin's Creed III Remastered` distinguishable from the base game. |
| `store_title_matches(game_name, offer_title)` | True if a store listing title names the same game. Match is **exact after normalization** against every `name_lookup_variants()` alternate, edition suffix stripped, spaces ignored on the final compare. Substring and fuzzy-ratio matching are deliberately not used — neither can separate a game from its own sequel (`Europa Universalis V` vs `IV`) or from an unrelated title containing its name (`Borderlands` vs `Tales from the Borderlands`). Needed because every store search is fuzzy: egdata `Gate 3` -> `Realpolitiks 3`, gogdb `Hades` -> `Grimshade Soundtrack`. |
| `is_edition_variant_title(game_name, offer_title)` | True if a store title is the game name plus a pure edition qualifier (`Painkiller` -> `Painkiller Black Edition`). Trailing words must all come from a fixed edition vocabulary and include an anchor word (`edition`, `goty`, `remastered`, …) — a prefix test alone matches `RAGE` to `Rage of Mages II`, and a free-text `.*edition$` tail matches it to `Rage in Peace Collector's Edition`. Weaker than `store_title_matches()`; treat a hit as needing human confirmation, not a resolved ID. |
| `fetch_epic_app_id(game_name)` | Resolve `EPICAPP_ID` for a game via egdata.app (POST search -> GET offer items -> EXECUTABLE item's `releaseInfo.appId`). Tries each `egdata_search_queries()` title in turn and takes the first result that passes `store_title_matches()`. |
| `gogdb_search(query, max_pages=4)` | Search gogdb.org and return `[(product_id, title, type)]` across all result pages. HTML scrape, not an API: titles arrive HTML-escaped and are unescaped, results paginate (`1 of 2` — the real match can sit on page 2), and the listing's own type column (`Game`/`Package`/`DLC`) avoids a `product.json` request per candidate. Returns `[]` on any error. |
| `fetch_gog_app_id(game_name, accept_edition_variant=False)` | Resolve `GOGAPP_ID` from gogdb.org, returning `(product_id, title)`. Walks `name_lookup_variants()` as queries, keeps the first row passing `store_title_matches()`, prefers a `Game` row over the `Package` bundling it, and resolves a Package-only hit through `includes_games` — Vortex's `gamestore-gog` matches the registry `gameID` of the **installable game**, so a Package ID must never be written. Set `accept_edition_variant` to also take an `is_edition_variant_title()` hit. gogdb's search matches plain substrings, so `(None, None)` reliably means the game is absent from GOG. |
| `add_to_discovery_ids(src)` | Add `STEAMAPP_ID_DEMO`, `GOGAPP_ID`, `EPICAPP_ID`, `XBOXAPP_ID`, `UPLAYAPP_ID`, and `EAAPP_ID` to `DISCOVERY_IDS_ACTIVE` if each has a real resolved value in src (not null, `''`, or `'XXX'`) and is not already present. |
| `log_info(game_id, msg)` | Print `[game_id] msg` |
| `log_error(game_id, msg)` | Print `[game_id] ERROR - msg` |
| `log_warn(game_id, msg)` | Print `[game_id] WARNING - msg` |
| `log_dry(msg)` | Print a dry-run message (`[DRY RUN] msg`) without a game_id prefix. |
| `find_fn_end(src, fn_match_end)` | Return index past the closing `}` of the JS function whose `{` is at `fn_match_end - 1` |
| `find_fn_body(src, func_start)` | Public wrapper for brace-counting; returns `(body_start, body_end)` indices or `(None, None)` |
| `run_generate_explained(game_id)` | Run `generate_explained.js` for a game; returns `(ok: bool, stderr: str)` |
| `run_generate_explained_batch(game_ids)` | Run `generate_explained.js` for multiple game IDs in a single `node` invocation. Returns `(ok: bool, stderr: str)`. |
| `run_generate_notes(game_id)` | Run `generate_notes.js` for a game; returns `(ok: bool, stderr: str)` |
| `run_generate_notes_batch(game_ids)` | Run `generate_notes.js` for multiple game IDs in a single `node` invocation. Returns `(ok: bool, stderr: str)`. |
| `run_generate_description_batch(game_ids)` | Run `generate_notes.js --description` for multiple game IDs in a single `node` invocation, refreshing each `DESCRIPTION.bbcode.txt` install and store list. Returns `(ok: bool, stderr: str)`. |
| `node_check(path)` | Run `node --check` on a JS file path; returns `(ok: bool, stderr: str)` |
| `node_check_source(src)` | Run `node --check` on an in-memory JS string (writes a temp file internally); returns `(ok, error_msg)` — `ok` is `None` if node is not on PATH |
| `eslint_check(path)` | Run `npx eslint` on a JS file (config auto-discovered from `REPO_ROOT`); returns `(ok: bool, output: str)` |
| `build_arg_parser(desc, *, with_force, with_dry_run, ids_required)` | Return an `ArgumentParser` with standard `GAME_ID` positional arg and `--dry-run`/`--force` flags. |
| `assert_is_game_id(game_id)` | Raise `ValueError` if `game_id` starts with `template-`. Use to reject template names passed to game-only commands. |
| `report_node_check(game_id, ok, err)` | Print `node --check` result in standard format. No-op when `ok` and no error. |
| `get_discovery_ids(src)` | Parse variable names from the spec's `discovery.ids` array; returns list of names (e.g. `["STEAMAPP_ID", "EAAPP_ID"]`); falls back to `["STEAMAPP_ID"]` |
| `iter_game_folders(target_game_ids)` | Yield `(folder, game_id, src)` for every `game-*` folder; filtered by `target_game_ids` if given |
| `REGISTER_ACTIONS` | List of `(label, commented_out, code[, detect_key])` tuples for standard `context.registerAction` calls; `detect_key` overrides the presence check (used by Config/Save entries to match any `'Open Config ...'`/`'Open Save ...'` variant) |
| `inject_register_actions(src)` | Inject any missing `context.registerAction` entries into `applyGame()`; returns `(new_src, missing_labels)` |
| `update_index_header(src, *, name, version, date)` | Replace `Name`, `Version`, and/or `Date` fields in the `index.js` header comment; returns updated source string |
| `const_value(src, var_name)` | Extract the RHS of a `const`/`let` declaration from JS source; returns string or `None` |
| `is_unset(value_str)` | Return `True` if a const RHS string is `"XXX"` or `'XXX'` (placeholder not yet filled) |
| `is_missing(src, var_name)` | Return `True` if a `const`/`let` declaration for `var_name` is absent from src |
| `replace_const_rhs(src, name, new_rhs, *, count=1)` | Replace the literal RHS of a `const`/`let` declaration — a quoted string or a bare literal (`null`/`undefined`/`true`/`false`/number). Store ID consts sit at `= null` until resolved, so a quoted-only pattern no-ops on exactly the case a store sweep needs. A trailing lookahead keeps the bare-literal branch from eating the first operand of an expression like `= 2 + OFFSET`. Anchored to the start of a line with MULTILINE, so only top-level declarations match |
| `js_string_literal(value)` | Return `value` as a double-quoted JS string literal, escaping backslashes then double quotes |
| `set_or_insert(src, var_name, value, comment)` | Replace an `XXX` placeholder for `var_name`, or insert the const before the `spec` block |
| `XXX_PATTERN` | Compiled regex matching any quoted `XXX` placeholder value (e.g. `"XXX"`, `"XXX.exe"`, `"XXX_Demo"`). |
| `is_placeholder_value(rhs)` | Return `True` if `rhs` is a placeholder value: `"XXX"`, `"XXX.exe"`, `"XXX_Demo"`, etc. Uses `XXX_PATTERN`. |
| `find_placeholder_vars(src)` | Return the list of `const`/`let` variable names whose RHS is still a placeholder value |
| `is_real_value(v)` | Return `True` if `v` is a filled-in, non-empty, non-placeholder value. Returns `False` for `None`, empty string, `null`, `N/A`, `XXX*`, and `${...}` template refs. |
| `const_decl_match(src, name)` | Return the `re.Match` for the `const`/`let` declaration line of `name`. Useful for line-position edits. |
| `const_array_value(src, name)` | Return the raw array content (between `[` and `]`) for `const NAME = [...]` via bracket-depth scanning. Returns `None` if not found. |
| `find_js_function(src, name)` | Return `(fn_start, body_start, body_end)` for the named JS function. Returns `(None, None, None)` if not found. |
| `extract_extension_url(src)` | Extract the `EXTENSION_URL` value from JS source; returns `None` if unset or not an HTTP URL |
| `extract_file_group_id(src)` | Extract the optional `FILE_GROUP_ID` integer from JS source; returns `None` if unset. Escape hatch for mods whose v3 file-update-groups list 404s |
| `sanitize_game_name(name)` | Strip `®`, `™`, `©` symbols and collapse extra whitespace from a game name string |
| `normalize_game_name(s)` | Lowercase + strip right-quotes, colons, ` - ` separators, and extra whitespace. For fuzzy title comparison. |
| `list_game_ids()` | Return a sorted list of all `GAME_ID` values found across `game-*` extension folders |
| `iter_steam_image_targets(target_game_ids=None, force=False, target_path_fn=None)` | Yield `(folder, game_id, steamapp_id, game_name)` for extensions needing a Steam-sourced image |
| `iter_repo_scripts()` | Yield absolute paths of every script listed in `scripts.txt` (skips blank lines and `#` comments) |
| `read_info_json(folder)` | Read and parse `info.json` from an extension folder; returns the dict, or `None` if missing/invalid |
| `make_info_json()` | Return an `info.json` template string (name `Game: XXX`, version `NEW_EXTENSION_VERSION`) for a new extension |
| `make_changelog()` | Return a `CHANGELOG.md` template string with a `NEW_EXTENSION_VERSION - 2026-XX-XX` initial entry |
| `parse_changelog_latest(folder)` | Parse `CHANGELOG.md` in a folder; returns `(version, date)` of the most recent entry (either may be `None`) |
| `bump_semver(version, kind)` | Bump a version string by standard semver rules — `major` `1.2.3 -> 2.0.0`, `minor` `1.2.3 -> 1.3.0`, `patch` `1.2.3 -> 1.2.4`. Raises `ValueError` on a malformed version or unknown kind |
| `is_valid_semver(version)` | Return `True` if `version` is strict `X.Y.Z` (no pre-release suffix) |
| `SEMVER_PATTERN` | Compiled regex behind `is_valid_semver()`; use the function for a boolean check |
| `prepend_changelog_entry(folder, version, date)` | Prepend a `## [version] - date` section to `CHANGELOG.md`, before the first existing entry. No-op if the file is missing |
| `mutate_index_js(folder, game_id, mutator_fn, *, dry_run, changed_msg, unchanged_msg, dry_run_msg)` | Read `index.js`, apply `mutator_fn(src) -> new_src`, write back if changed. Handles all error printing. Returns `True` if changed. |
| `mutate_text_file(path, fn, *, dry_run, atomic)` | Like `mutate_index_js` but for non-`index.js` files. Reads, applies `fn(src)->new_src`, writes atomically if changed. Returns `True` if changed. |
| `read_json(path, default)` | Read and parse a JSON file; returns `default` (empty dict) on missing/corrupt file |
| `read_gui_stats()` | Read the shared GUI nexus-stats JSON (`{game_id: stats_dict}`); returns `{}` on error |
| `write_gui_stats(data)` | Write the stats dict to `GUI_STATS_PATH` atomically, with `sort_keys=True` |
| `write_json_atomic(path, data, *, indent, sort_keys)` | Write JSON atomically via tmp file + `os.replace`. Emits LF and a trailing newline, matching `.editorconfig` (`end_of_line = lf`, `insert_final_newline = true`) |
| `dry_prefix(dry_run)` | Return `"[DRY RUN] "` if `dry_run` is `True`, else `""` |
| `print_run_summary(saved, failed, skipped, *, skip_label)` | Print a standardized saved / failed / skipped run summary block (separator line + counts + per-item lists) |
| `print_count_summary(label_counts)` | Print a compact summary of named counters (used where saved/failed/skipped does not fit) |
| `run_concurrent_batch(items, worker_fn, max_workers=8)` | Run `worker_fn` over `items` in a thread pool; returns `{key: result_tuple}` keyed by the first element of each result. Worker must catch its own exceptions. KeyboardInterrupt returns the partial batch. |
| `report_download_results(targets, results, label_fn, saved, failed, skipped)` | Classify and print results from `run_concurrent_batch` for download workers. Worker results must be `(game_id, status, source_or_none, msg_or_none)`; status one of `"ok"`, `"fail"`, `"error"`, `"skip"`. Updates `saved`/`failed`/`skipped` in-place. |
| `retry_failed_downloads(targets, failed, worker_fn, concurrency, saved, skipped)` | Retry failed downloads once via `run_concurrent_batch`; clears and rebuilds `failed` in-place; updates `saved`/`skipped`. |
| `resize_images_to(paths_and_labels, target_wh, *, fmt, quality, dry_run)` | Resize images in a `(path, label)` list to `target_wh`. Returns `(resized, already_correct, missing)`. Raises `ImportError` if Pillow absent. |
| `find_vortex_exe()` | Return path to `Vortex.exe` (default install dir then PATH), or `None` |
| `safe_windows_dirname(name)` | Strip characters invalid in Windows directory names (`<>:"/\|?*`) and strip whitespace |
| `safe_rmtree(path, hint)` | Remove a directory tree, retrying once on `PermissionError` after 1 second. `hint` shown in the warning (e.g. `"close Vortex first"`). |
| `touch_empty(path, force)` | Create an empty file at `path` atomically. No-op if file exists and `force=False`. |
| `find_vortex_plugin_folder(game_id, game_name)` | Return the deployed plugin folder path for `game_id` in Vortex's plugins dir. Reads `VORTEX_PLUGINS_DIR` env (default `C:\ProgramData\vortex\plugins`). Matches on the game-id folder name first, then an exact cleaned-name match against the `Vortex Extension Update - <name> v*` form, then an exact cleaned-name match against any folder, and only then substring hits (update form first, then any folder). Every exact form outranks every substring form across the whole listing, so a game id contained in another's (`reddeadredemption` in `reddeadredemption2support`, `theouterworlds` in `theouterworlds2`) cannot resolve to the longer-named extension. Returns `None` if not found. |
| `normalize_target_ids(arg)` | Convert an argparse game-ID list to a set, or `None` meaning "all games" |
| `read_id_list(filepath)` | Read a text file; return list of stripped non-empty lines (game IDs or similar) |
| `write_id_list(filepath, game_ids)` | Write a sorted list of IDs to a file, one per line |
| `is_load_order_game(src)` | Return `True` if `src` calls `registerLoadOrder` and is not a UE4/5 extension |
| `is_merge_game(src)` | Return `True` if `src` calls `registerMerge` (comments stripped) and is not an Unreal extension |
| `has_mergemods_callback(src)` | Return `True` if `src` gives `mergeMods` a function value rather than a boolean, and is not an Unreal extension |
| `has_downloader_js(folder)` | Return `True` if the extension `folder` contains a bundled `downloader.js` module |
| `has_bepinexbe_downloader_js(folder)` | Return `True` if the extension `folder` contains a bundled `bepinexbe_downloader.js` module |
| `has_codeberg_downloader_js(folder)` | Return `True` if the extension `folder` contains a bundled `codeberg_downloader.js` module |
| `has_fcmodding_downloader_js(folder)` | Return `True` if the extension `folder` contains a bundled `fcmodding_downloader.js` module |
| `has_gamebanana_downloader_js(folder)` | Return `True` if the extension `folder` contains a bundled `gamebanana_downloader.js` module |
| `has_moddb_downloader_js(folder)` | Return `True` if the extension `folder` contains a bundled `moddb_downloader.js` module |
| `has_modworkshop_downloader_js(folder)` | Return `True` if the extension `folder` contains a bundled `modworkshop_downloader.js` module |
| `has_thunderstore_downloader_js(folder)` | Return `True` if the extension `folder` contains a bundled `thunderstore_downloader.js` module |
| `strip_js_comments(src)` | Return `src` with `//` and `/* */` comments blanked to spaces, preserving string/template/regex literals and character offsets |
| `audit_skip_rules(line)` | Parse an `//!audit-skip: <rule>[,<rule>] - <reason>` marker on one source line into `{rule: reason}`. Empty when there is no marker, or the marker states no reason |
| `audit_skip_lines(src, rule)` | Return `{line number: reason}` for every line in `src` that suppresses `rule` |
| `AUDIT_SKIP_STORE_ID` | Rule name (`store-id`) suppressing a store ID wiring finding |
| `AUDIT_SKIP_FOMOD` | Rule name (`fomod-check`) suppressing a missing-FOMOD-guard finding |
| `AUDIT_SKIP_PRIORITY` | Rule name (`installer-priority`) suppressing an out-of-range installer priority finding |
| `requires_extensions(src)` | Return the `context.requireExtension` dependencies declared in `src` as `(name, optional)` tuples. `optional` is `True` when the call passes a third argument of `true` |
| `has_extension_dependency(src)` | Return `True` if `src` declares any `context.requireExtension` dependency, hard or optional |
| `requires_unreal_mod_installer(src)` | Return `True` if `src` declares a `context.requireExtension` dependency on `Unreal Engine Mod Installer`, in either the hard or the optional form |
| `has_ue4ss_load_order_parity(src)` | Return `True` if `src` is a UE4-5 extension carrying the full `template-ue4-5` load order (detected via the `Ue4ssContextMenu` component) |
| `is_unreleased_extension(src)` | Return `True` if `EXTENSION_URL` holds no real Nexus page URL (missing, empty, `"XXX"`, or non-Nexus), i.e. the extension has never been published |
| `parse_nexus_mod_url(url)` | Parse a Nexus Mods URL into `(domain, mod_id)` or `None`. |
| `nexus_v3_get(path, api_key)` | GET a Nexus Mods v3 endpoint, with retry and `Retry-After` handling |
| `nexus_v3_post_json(path, body, api_key)` | POST JSON to a Nexus Mods v3 endpoint, with retry and `Retry-After` handling |
| `nexus_list_games(api_key)` | Fetch all approved Nexus Mods games; caches result for the process lifetime. Returns `[]` on error. |
| `nexus_get_mod(domain, mod_id, api_key)` | Fetch Nexus v1 mod details with retry. Returns `(data_dict, rate_remaining_or_None)`. Raises on 404 / non-retryable errors. |
| `write_text_atomic(path, entries, encoding)` | Write list-of-strings (or a single string) to `path` atomically via `.tmp` + `os.replace`. Writes LF per `.editorconfig`; endings already in `entries` pass through untouched. |
| `open_in_default_app(path)` | Open `path` in the system default application (`os.startfile` on Windows). |
| `run_script(script_name, *args, capture=True)` | Run a Python script from `REPO_ROOT` via `sys.executable`. Returns `CompletedProcess`. |
| `load_vortex_manifest(path=None)` | Read `extensions-manifest.json`; return `{game_id: mod_id}` dict. Defaults to `%APPDATA%\Vortex\temp\extensions-manifest.json`. |
| `resize_pngs_in_dirs(folders, dry_run=False)` | Resize all non-64x64 PNGs in the given folders to 64x64 using Pillow. |
| `build_js_symbol_table(src)` | Resolve `const`/`let` strings, template literals, `path.join()`, and variable refs in index.js source. Returns `{name: value}` dict. |
| `list_template_names()` | Return sorted list of template name suffixes (e.g. `['basic', 'ue4-5', ...]`). |
| `iter_extension_folders(*, include_templates=False)` | Like `iter_game_folders()` but optionally yields `template-*` folders too. |
| `detect_engine(src)` | Return a short engine/framework label (e.g. `'Unreal Engine 4/5'`, `'RE Engine'`) based on index.js source. Same detection logic as `categorize_games.py`. |
| `detect_stores(src)` | Return space-separated store badges from `DISCOVERY_IDS_ACTIVE` in index.js: `S` Steam, `G` GOG, `E` Epic, `X` Xbox, `U` Ubisoft, `EA` EA. |
| `validate_index_js(src)` | Return list of issue strings: leftover `XXX`, missing `applyGame()`, missing `context.registerGame()`, missing `main()`. |
| `GUI_FLAGS_PATH` | Absolute path to `vortex_gui_flags.json` at repo root |
| `GUI_STATS_PATH` | Absolute path to `vortex_gui_nexus_stats.json` at repo root |
| `download_exec_icon(appid, game_name, out_path)` | Download and save a 64x64 `exec.png`. Steam CDN first, SteamGridDB icon fallback. |
| `download_cover_art(appid, game_name, out_path, sgdb_key)` | Download and save a 640x360 cover art JPEG with no title text. SteamGridDB grid/hero or Steam `library_hero.jpg`. |
| `download_title_image(appid, game_name, out_path, sgdb_key, hero_id=None, logo_id=None)` | Download and save a 1920x1080 title image (with logo text). SteamGridDB hero+logo composite, grid, or Steam capsule. `hero_id`/`logo_id` force a specific SteamGridDB asset instead of auto-picking by appid. Composite logo is scaled to `TITLE_LOGO_WIDTH_FRAC` (0.50) of image width, capped at `TITLE_LOGO_HEIGHT_FRAC` (0.40) of height; small native logos are upscaled. |
| `download_banner_image(appid, game_id, out_path, sgdb_key)` | Download official SteamGridDB hero at full size. No crop or resize. |

### vortex_utils.py -- Requirements

No additional packages required (Python stdlib only).

---

## nexus_upload.py

Reusable Nexus Mods v3 upload module. Extracted from `release_extension.py`; provides the full multipart upload flow and changelog extraction with no game/extension-specific assumptions. Imported by `release_extension.py` and external scripts in other repos.

### nexus_upload.py -- Contents

| Export | Description |
| --- | --- |
| `NEXUS_V3` | Base URL for the Nexus Mods v3 API |
| `v3_get(path, api_key)` | GET a Nexus v3 endpoint; returns parsed `data` field |
| `v3_post_json(path, body, api_key)` | POST JSON to a Nexus v3 endpoint; returns parsed `data` field |
| `extract_changelog_entry(changelog_src, version)` | Extract the changelog entry body for `version` (date-only header + bullet list) |
| `pick_file_group(mod_id, domain, api_key, mod_key, name_hint=None, group_id_override=None)` | Resolve mod UID via v1 API, fetch file groups via `GET /v3/mods/{uid}/files` (`mod_files[]`; the old `/file-update-groups` path is defunct), auto-select by exact-normalized name match (then substring fallback) when `name_hint` provided; raises `RuntimeError` on no match or ambiguous match; falls back to interactive prompt only when `name_hint` is absent. Words in `_NAME_STRIP_WORDS` (default: `['addon']`) are stripped from group names before comparison. When `group_id_override` is set (from index.js `FILE_GROUP_ID`), the v1->v3 list is skipped and the group is targeted directly, with the publish name derived from the latest primary v1 file. The resolved group list is cached per `(domain, mod_id)` for the life of the process, so a mod released as several files does one uid + one group lookup rather than one pair per file. |
| `upload_parts(zip_path, presigned_urls, part_size, mod_key)` | Upload zip in parts to presigned S3 URLs; returns list of ETags |
| `complete_multipart(complete_url, etags)` | POST CompleteMultipartUpload XML to finalize S3 assembly |
| `poll_upload_state(upload_id, api_key, mod_key)` | Poll v3 upload until state is `available`; raises on timeout |
| `upload_zip(zip_path, mod_id, domain, version, description, api_key, mod_key, name_hint=None, file_category="main", group_id_override=None, update_mod_version=True)` | Full Nexus v3 multipart upload flow: session create → part upload → complete → finalise → poll → publish version. Pass `update_mod_version=False` for secondary/addon files so only the main file sets the version shown on the mod page. |

### nexus_upload.py -- Requirements

No additional packages required (Python stdlib only). Requires `vortex_utils.py` on `sys.path`.

---

## check_nexus_api.py

Verifies Nexus Mods v1 and v3 API response shapes against documentation. Tests read-only endpoints only — does not create or modify any data. Checks v1 mod field types, rate limit headers (presence *and* whether the limit values still match a documented tier), v3 mod-files shape (`GET /v3/mods/{uid}/files`, including undocumented `archived_count`/`removed_count` fields), and expected error codes for dead endpoints. Defaults to `site/1960` (Fatekeeper) as the test target; pass `--domain` and `--mod-id` to test another mod. Step 8 field-validation checks (`--test-upload`) target `POST /v3/mod-files/{id}/versions`, the current endpoint since the 2026-07-24 migration off the deprecated `/mod-file-update-groups/{id}/versions` path (removed on/after 2026-09-09).

`--check-spec` adds a drift check against the live OpenAPI document at `https://api.nexusmods.com/openapi.yaml`: it diffs the path list against the catalog baked into `SPEC_KNOWN_PATHS` (which mirrors the endpoint catalog in `resources/NEXUS_MODS_API.md`), confirms every endpoint the upload flow depends on is still present and not deprecated, and flags any deprecation that is not already documented. This is what catches endpoints being *added* or *removed* — the per-endpoint probes can only see the paths they already know about. When it reports drift, update both `SPEC_KNOWN_PATHS` and `resources/NEXUS_MODS_API.md` in the same pass.

### check_nexus_api.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXUS_API_KEY` | Required, except with `--check-spec --spec-only` | Nexus Mods API key. Read from env var, with HKCU/HKLM registry fallback. The OpenAPI document is served unauthenticated, so the spec diff alone needs no key. |

### check_nexus_api.py — Usage

```sh
python check_nexus_api.py
python check_nexus_api.py --domain site --mod-id 1960
python check_nexus_api.py --test-upload
python check_nexus_api.py --check-spec
python check_nexus_api.py --check-spec --spec-only
```

- No arguments — runs read-only checks only.
- `--domain` / `--mod-id` — override the default test target (site/1960 Fatekeeper).
- `--test-upload` — also POSTs a 1-byte upload session to verify step 3 + step 7 shapes. Creates a dangling session that expires automatically; does not upload data or publish files.
- `--check-spec` — also diff the live OpenAPI document against the documented endpoint catalog.
- `--spec-only` — with `--check-spec`, skip the live endpoint probes and run only the spec diff. Needs no API key.

### check_nexus_api.py — Requirements

`PyYAML` for `--check-spec` (`pip install pyyaml`); the check degrades to a `[WARN]` if it is missing. Everything else is Python stdlib.

### check_nexus_api.py — Output

Per-check `[PASS]` / `[FAIL]` / `[WARN]` lines for: v1 mod shape (13 required fields), rate limit headers (daily + hourly limit and remaining, plus a documented-tier match), v3 mod-files shape (5 required fields + known extras), 4 dead-endpoint status codes, and (with `--test-upload`) upload session shape (step 3) + upload state shape (step 7) + step 8 field-validation against `POST /v3/mod-files/{id}/versions`. With `--check-spec`, adds spec version, path-count diff (naming any added or removed path), per-endpoint presence and stability tier for the upload flow, new-deprecation detection, and an operations-by-tier tally. Summary: `Passed: N/total`. Exits `0` if all pass, `1` if any fail.

---

## fetch_exec_icon.py

Scans all `game-*` extension folders and downloads a 64x64 PNG icon for any extension missing its `exec.png` file. Reads `STEAMAPP_ID` and `GAME_NAME` directly from each `index.js`. Uses `download_exec_icon` from `vortex_utils`.

### fetch_exec_icon.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `STEAMGRIDDB_API_KEY` | Optional | SteamGridDB API key. Consumed by `vortex_utils.download_exec_icon`; used as fallback icon source when Steam CDN has no icon for the app. |

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
python fetch_exec_icon.py --concurrency 4
python fetch_exec_icon.py --retry-failed
```

- No arguments — scans all `game-*` folders and downloads missing icons.
- `GAME_ID [GAME_ID ...]` — only processes the listed game IDs.
- `--dry-run` — lists missing files without downloading anything.
- `--force` — re-downloads `exec.png` even if it already exists.
- `--concurrency N` — max parallel download workers (default: 8).
- `--retry-failed` — automatically retries failed downloads once after the main pass.

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
| `STEAMGRIDDB_API_KEY` | Optional | SteamGridDB API key. Consumed by `vortex_utils` download helpers. Used for higher-quality hero art in default mode. Required for `--banner` mode (no fallback available). Falls back to Steam `library_hero.jpg` in default mode if not set. In `--title` mode, used for hero+logo composite and grid art; falls back to Steam `capsule_616x353.jpg` if not set. |

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
python fetch_cover_art.py --concurrency 4
python fetch_cover_art.py --retry-failed
```

- No arguments — scans all `game-*` folders and downloads missing cover art.
- `GAME_ID [GAME_ID ...]` — only processes the listed game IDs.
- `--dry-run` — lists missing files without downloading anything.
- `--force` — re-downloads even if the target file already exists.
- `--title` — fetches title images (1920x1080) to `resources/title-images/` instead of cover art.
- `--banner` — fetches full-size official hero images to `resources/banner-images/`. Requires `STEAMGRIDDB_API_KEY`.
- `--concurrency N` — max parallel download workers (default: 8).
- `--retry-failed` — automatically retries failed downloads once after the main pass.

### fetch_cover_art.py — Output

- Cover art saved as `{GAME_ID}.jpg` (640x360 JPEG) in each extension folder.
- Title images saved as `{GAME_ID}_title.jpg` (1920x1080 JPEG) in `resources/title-images/`.
- Banner images saved as `{GAME_ID}_banner.jpg` (full-size JPEG) in `resources/banner-images/`.
- Extensions without a `STEAMAPP_ID` in `index.js` are skipped with a note.
- A summary of saved / failed / skipped counts is printed at the end.

---

## make_title_image.py

Builds a single `{GAME_ID}_title.jpg` from a specific SteamGridDB hero asset (the number in a `https://www.steamgriddb.com/hero/<id>` URL), composited with the game's logo (Steam library convention: logo centered in the lower portion). Unlike `fetch_cover_art.py --title`, which auto-picks the best hero for the game's Steam appid, this lets you pin the exact hero. Reads `STEAMAPP_ID` from the game's `index.js` for the logo lookup and calls `download_title_image` from `vortex_utils` with `hero_id`/`logo_id`.

### make_title_image.py — Requirements

```sh
pip install Pillow
```

### make_title_image.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `STEAMGRIDDB_API_KEY` | Required | SteamGridDB API key (env var or HKCU registry fallback via `get_api_key`). No fallback art source for this script. |

### make_title_image.py — Usage

```sh
python make_title_image.py GAME_ID --hero HERO_ID
python make_title_image.py GAME_ID --hero HERO_ID --logo LOGO_ID
python make_title_image.py GAME_ID --hero HERO_ID --dry-run
```

- `GAME_ID` — the game extension id (folder `game-<id>`; matched by the `GAME_ID` const in `index.js`).
- `--hero ID` — SteamGridDB hero asset id to use as the background (required).
- `--logo ID` — SteamGridDB logo asset id to composite (optional; default is the best official colored logo for the game's Steam appid).
- `--dry-run` — resolves appid/paths and reports without downloading or writing.

### make_title_image.py — Output

- Title image saved as `{GAME_ID}_title.jpg` (1920x1080 JPEG) in `resources/title-images/`.
- Exit code `0` on success, `1` on failure.

---

## render_svg.py

Rasterizes an SVG file, or a single SVG path string, to PNG. Written for extension icons: the `mdi:` option on `registerMainPage` takes raw path data in a 24x24 viewBox, and this is the only way to see what a hand-scaled or vendor-traced path actually looks like before it ships. `--js-const NAME` reads the path straight out of a `const NAME = '...'` declaration in an `index.js` or a bundled module, which is how these extensions store icon paths.

### render_svg.py — Requirements

```sh
pip install svglib reportlab pycairo rlPyCairo pillow
```

Two backends, split by mode. `--path` / `--js-const` are drawn with **pycairo** through the script's own SVG path parser (`M L H V C S Q T A Z`, absolute and relative, arcs converted to beziers); `FILE.svg` goes through **svglib + reportlab renderPM**, which handles whole documents — groups, gradients, text — that the parser deliberately does not.

The split exists because svglib's path parser drops paths it cannot handle and reports nothing, so the icon renders as an empty image; `UE4SS_ICON` in `game-subnautica2/index.js` is a live example. Drawing icon paths here means a malformed path raises instead of silently vanishing, and cairo gives a real alpha channel.

reportlab 5.x also dropped its bundled `_renderPM` C backend, so `rlPyCairo` + `pycairo` are what actually draw the file-mode pixels. The pycairo wheel is self-contained on Windows — no GTK or Cairo install needed.

### render_svg.py — Usage

```sh
python render_svg.py FILE.svg
python render_svg.py FILE.svg -o out.png --size 256
python render_svg.py FILE.svg --out out.png
python render_svg.py --path "M11 15H6L13 1V9H18L11 23V15Z" --bg none
python render_svg.py --js-const UE4SS_ICON game-subnautica2/index.js
python render_svg.py --js-const DEFAULT_MDI resources/browsers/thunderstore_browser.js --fill "#23FFB1"
```

- `FILE.svg` — SVG file to rasterize (omit when using `--path` or `--js-const`).
- `-o, --out PATH` — output PNG (default: alongside the input, or `./<name>.png`).
- `--size N` — output size in pixels (default 256). Square in the path modes; for a file it is the bounding box and the aspect ratio is preserved (a wide wordmark comes out short).
- `--path DATA` — raw SVG path data instead of a file.
- `--js-const NAME` — read the path out of `const NAME = '...'` in the given `.js` file (passed as the positional argument).
- `--viewbox "0 0 24 24"` — viewBox for `--path` / `--js-const` (default shown).
- `--fill`, `--bg` — path and background colours, **path modes only**; an SVG file keeps its own colours on a white canvas (a white-filled logo therefore looks blank — pass it through `--path` with a `--bg` instead). `--bg none` writes a transparent PNG, again path modes only, since that mode draws on a cairo ARGB surface while renderPM always paints an opaque canvas.
- Fill rule is nonzero, matching the SVG default: a hole needs its inner subpath wound the opposite way, exactly as it would in a browser.

### render_svg.py — Output

- PNG at the requested size, plus the intermediate `.svg` next to it when rendering from a path string.
- Exit code `0` on success, `1` on a missing file, unparseable SVG, or a const the regex cannot find.

---

## fetch_nexus_stats.py

Fetches endorsement count, unique download count, and active file-update-group IDs from the Nexus Mods v1/v3 APIs for every `game-*` extension with a valid `EXTENSION_URL` (i.e., a `nexusmods.com` URL). Results are cached to `vortex_gui_nexus_stats.json` at the repo root (gitignored). The GUI dashboard reads this file and displays the stats in the `End` and `DL` columns.

Extensions with placeholder `EXTENSION_URL = "XXX"` are silently skipped.

### fetch_nexus_stats.py — Requirements

No additional packages required (Python stdlib only). Requires `nexus_upload.py` on `sys.path` (included in this repo).

### fetch_nexus_stats.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXUS_API_KEY` | Required | Nexus Mods API key. Not needed for `--dry-run` or `--report-groups`. |

### fetch_nexus_stats.py — Usage

```sh
python fetch_nexus_stats.py
python fetch_nexus_stats.py GAME_ID [GAME_ID ...]
python fetch_nexus_stats.py --dry-run
python fetch_nexus_stats.py --force
python fetch_nexus_stats.py --max-age 7
python fetch_nexus_stats.py --prune [--dry-run]
python fetch_nexus_stats.py --report-groups
```

- No arguments — fetches stats for all extensions missing from the cache (including those missing `file_groups`).
- `GAME_ID [GAME_ID ...]` — only processes the listed game IDs.
- `--dry-run` — lists extensions that would be fetched (or entries to prune) without making changes. Works without `NEXUS_API_KEY`.
- `--force` — re-fetches stats even if already cached.
- `--max-age DAYS` — re-fetches entries older than `DAYS` days (ignored when `--force` is set).
- `--prune` — removes cache entries for game IDs no longer present in the repo, then exits. Combine with `--dry-run` to preview.
- `--report-groups` — prints all extensions with more than one active file-update group from the cache, then exits. No API calls; works without `NEXUS_API_KEY`.

### fetch_nexus_stats.py — Output

- Results written to `vortex_gui_nexus_stats.json` (single atomic write at the end of the run).
- Each entry includes `endorsements`, `unique_downloads`, `total_downloads`, `mod_name`, `mod_version`, `fetched_at` (epoch seconds), `uid` (Nexus internal UID), `file_groups` (list of `{id, name}` for active file-update groups), and `error` (null on success, "404" if not found).
- Prints `endorsements`, `unique_downloads`, and `groups=N` (when groups > 0) per game while running, with the daily API rate limit remaining.
- Rate limit is checked after each call; stops early if fewer than 6 requests remain.
- Summary line at the end: `Updated: N | Failed: N | Daily remaining: N`.
- Multi-group report printed after every fetch run: lists all extensions with more than one active file-update group.

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
python new_template.py TEMPLATE_NAME GAME_ID [GAME_ID ...] --diff
```

The first `GAME_ID` is the primary source — its `index.js` is copied and stripped. Additional `GAME_ID`s are listed in the output as reference sources but not processed.

### new_template.py — Options

| Flag | Effect |
| --- | --- |
| `--dry-run` | Print actions without writing files or updating `new_extension.py`. |
| `--force` | Overwrite existing template folder. |
| `--diff` | Show unified diff vs. existing template (or full output if new). No files written. |

`--diff` and `--force` are mutually exclusive; passing both is an error.

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
    1.0.0.txt         empty version marker file
    *.png             tool icon PNGs from primary game (exec.png excluded)
```

### new_template.py — XXX Substitutions Applied

| Constant | Rule |
| --- | --- |
| `GAME_ID`, `GAME_NAME`, `GAME_NAME_SHORT` | Always -> `"XXX"` |
| `EXEC`, `EXEC_NAME` | Always -> `"XXX"` |
| `STEAMAPP_ID`, `PCGAMINGWIKI_URL`, `EXTENSION_URL` | Always -> `"XXX"` |
| `EAAPP_ID`, `UPLAYAPP_ID`, `GOGAPP_ID`, `EPICAPP_ID`, `XBOXAPP_ID` | Non-empty string -> `"XXX"`; empty string `""` -> `null`; already `null` -> left as `null` |
| Header comment `Name`, `Version`, `Date` | Reset to `XXX`, `1.0.0`, `2026-XX-XX` |

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

New extensions always start at `1.0.0` (`vortex_utils.NEW_EXTENSION_VERSION`), stamped into `info.json`, the `CHANGELOG.md` entry, the `index.js` header, and the version `.txt` filename regardless of the version the template scaffold carries. The version `.txt` is created if the template has none.

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
python new_extension.py TEMPLATE "Game Name" --no-browser --no-startfile
python new_extension.py GAME_ID --refresh-images
python new_extension.py TEMPLATE "Game Name" --skip-explained
python new_extension.py TEMPLATE "Game Name" --skip-eslint
```

`TEMPLATE` is the short template name — omit the `template-` prefix (e.g. `basic`, `ue4-5`).
The game input can be a quoted game name (searched on Steam) or a numeric Steam App ID.
Use `--force` to overwrite an existing folder.
Use `--dry-run` to run all lookups and print what would be created without writing any files.
Use `--no-images` to skip downloading `exec.png`, cover art, and title image (useful when re-running on an existing extension).
Use `--no-browser` to suppress all `webbrowser.open` calls (PCGamingWiki, SteamDB, SteamDB demo page). Useful in headless / CI environments.
Use `--no-startfile` to suppress opening downloaded images and `index.js` in the default editor.
Use `--refresh-images GAME_ID` to re-download all 4 images for an existing extension without redoing any lookups or rewriting `index.js`. Reads `STEAMAPP_ID` and `GAME_NAME` directly from the existing `game-{GAME_ID}/index.js`. Always overwrites existing image files.
Use `--dry-run` to run all lookups and print what would be created without writing any files. After all lookups, prints the list of XXX placeholders that would still need manual entry.
Use `--skip-explained` to skip running `generate_explained.js` and `generate_notes.js` after writing `index.js`.
Use `--skip-eslint` to skip running ESLint after writing `index.js`.

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
| `GAME_ID` | Nexus Mods domain name (`NEXUS_API_KEY` required); falls back to a name derived from the game name. Never contains hyphens or spaces — lowercase letters and digits only (`FIFA 24` -> `fifa24`). If the Nexus domain itself contains a hyphen, it is stripped and the script warns to add a `nexusPageId` entry to `spec.game.details` |
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
| `NOTES_FOR_MOD_AUTHORS.md` + `.bbcode.txt` | Generated by `generate_notes.js` |

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
2. `node generate_notes.js {GAME_ID}` — generates `NOTES_FOR_MOD_AUTHORS.md` and `NOTES_FOR_MOD_AUTHORS.bbcode.txt`
3. `npx eslint game-{GAME_ID}/index.js` — lints the generated extension (warns on issues)
4. `python categorize_games.py {GAME_ID}` — adds the game to the correct engine category file in `resources/lists/`
5. `python setup_test_folder.py {GAME_ID}` — creates a minimal test game folder

It also opens the PCGamingWiki page, SteamDB info page, and SteamDB demo page (if a demo exists) in the default browser, and opens each saved image and `index.js` with `os.startfile`.

---

## extension_parser.js

Shared static-analysis helpers for reading an extension's `index.js` without executing it. Builds a symbol table from `const`/`let` declarations, resolves value expressions (string and template literals, variable references, `path.join`), and extracts registration blocks (mod types, installers, header fields, feature flags).

Not a runnable script — it is required by `generate_explained.js` and `generate_notes.js`. Any change here affects both generators; re-run `node generate_explained.js --check` afterwards and confirm the output is unchanged.

`isRealValue` is the placeholder test both generators use to decide whether a constant carries a real value. `null`, the string `"null"`, `"XXX"`, `"N/A"`, and an empty or whitespace-only string all count as placeholders — extensions write `const XBOXAPP_ID = "";` for a store the game is not sold on, so treating an empty string as real made the generated docs claim support that does not exist.

`extractInstallers` returns `{ id, priority, testFn, guardFlag }` per registration. `testFn` is the installer's test function name, which is the stable cross-extension identity of an installer and the key `generate_notes.js` uses to attach documentation. Installers behind a disabled boolean flag are omitted.

`getGuardFlag` walks outward through every enclosing block rather than stopping at the innermost one, so a registration nested inside a loop or callback still resolves to the `if (FLAG)` that guards it — for example a `spec.modTypes.push` inside a `.forEach` inside `if (hasDlcFolders) {`. A registration whose guard flag is `false` is omitted from the generated docs.

---

## generate_explained.js

Reads each extension's `index.js` and generates an `EXTENSION_EXPLAINED.md` file describing how the extension works — game info, store IDs, mod types, installers, tools, paths, and feature toggles.

Parsing is provided by `extension_parser.js`.

Toolbar actions are read from `context.registerAction` calls. An action wrapped in `if (FLAG) {` is listed only when that flag is on, and a backtick label that interpolates a constant is resolved against the symbol table rather than emitted as a raw `${...}`.

### generate_explained.js — Requirements

Node.js (no additional packages required).

### generate_explained.js — Usage

```sh
node generate_explained.js
node generate_explained.js GAME_ID [GAME_ID ...]
node generate_explained.js --json
node generate_explained.js GAME_ID [GAME_ID ...] --json
node generate_explained.js --templates
node generate_explained.js --templates --json
node generate_explained.js --check
```

Run without arguments to process all `game-*` folders.
Pass one or more bare `GAME_ID` values to target specific extensions (e.g. `megabonk`).
`--json` writes machine-readable JSON to stdout; progress and summary go to stderr instead.
`--templates` also processes `template-*` folders (only effective when no `GAME_ID` args are given).
`--check` runs in drift-detection mode: compares what would be generated against each existing `EXTENSION_EXPLAINED.md` without writing any files. Exits with code `1` if any file would change or is missing. Useful in CI to detect stale docs.

### generate_explained.js — Examples

```sh
node generate_explained.js
node generate_explained.js deathstranding2onthebeach
node generate_explained.js megabonk hogwartslegacy
```

### generate_explained.js — Output

Always writes `EXTENSION_EXPLAINED.md` into each processed extension folder (overwrites any existing file). Reports a count of created, skipped, errored, and unresolved variable references on completion. Exits with code `1` if any extension threw an error during generation or if `--check` detects drift; `0` otherwise.

`--check` mode prints `DRIFT` instead of `OK` for files that would change, reports a drifted count, and does not write any files.

With `--json`, stdout receives a JSON object:

```json
{
  "timestamp": "2026-05-09T12:00:00.000Z",
  "created": 5,
  "skipped": 1,
  "errors": 0,
  "drifted": 0,
  "unresolvedTotal": 2,
  "results": [{ "id": "game-megabonk", "ok": true, "unresolved": 0 }, ...]
}
```

---

## generate_notes.js

Reads each extension's `index.js` and generates mod-author packaging documentation: what a mod archive must contain for each installer to recognise it, where each mod type is deployed, and the common mistakes that send a mod to the wrong installer.

Parsing is provided by `extension_parser.js`.

Sections come from two tiers. Tier 1 is hand-written prose keyed by the installer's test function name, with that extension's own constants interpolated. Tier 2 derives the trigger conditions mechanically from the test function body, and is used for installers that have no tier-1 block yet. The run summary reports how many sections of each kind were produced.

Installers hidden behind a disabled feature flag are omitted, so an extension with `SIGBYPASS_REQUIRED = false` gets no signature-bypass section.

### generate_notes.js — Adding a tier-1 block

A tier-1 block is an entry in the `PROSE` array, keyed by `fn` (the installer's test function name) plus either `engine` (one engine key or an array of them) or `game` (one extension folder, for a test function unique to it). Its `build(v)` receives the extension's resolved constants and returns a section, or `null` to fall back to tier 2.

The constants in `v` come from a **fixed whitelist in `buildVars`** — scalars in the first list, array constants in the second. A block referencing a constant that is not on that list receives `undefined`, so it usually returns `null` and the installer silently renders as a tier-2 stub. Add the constant names alongside the block, in the same edit.

### generate_notes.js — Requirements

Node.js (no additional packages required).

### generate_notes.js — Usage

```sh
node generate_notes.js
node generate_notes.js GAME_ID [GAME_ID ...]
node generate_notes.js --json
node generate_notes.js --templates
node generate_notes.js --templates --json
node generate_notes.js GAME_ID --description
```

Run without arguments to process all `game-*` folders.
Pass one or more bare `GAME_ID` values to target specific extensions.
`--json` writes machine-readable JSON to stdout; progress and summary go to stderr instead.
`--templates` also processes `template-*` folders (only effective when no `GAME_ID` args are given).
`--description` writes `DESCRIPTION.bbcode.txt`, the Nexus mod page description, instead of the notes files. Two of its lists are generated: `Mod Installation Notes`, one line per installer with trigger plus destination, and `Supported Versions`, one line per store the extension carries an app ID for.

There is deliberately no `--check` flag. Drift between these files and their `index.js` is handled by the generated-docs audit, which regenerates and diffs.

### generate_notes.js — Examples

```sh
node generate_notes.js
node generate_notes.js subnautica2
node generate_notes.js subnautica2 farfarwest ue4-5 --templates
```

### generate_notes.js — Output

Always writes two files into each processed extension folder, overwriting any existing copies. `release_extension.py` runs this for every game that releases, so the notes cannot drift from `index.js` between releases:

| File | Purpose |
| --- | --- |
| `NOTES_FOR_MOD_AUTHORS.md` | Markdown, for the repo and GitHub |
| `NOTES_FOR_MOD_AUTHORS.bbcode.txt` | BBCode, paste-ready for a Nexus mod page |

`--description` writes neither of those. It writes `DESCRIPTION.bbcode.txt` into the extension folder — the whole Nexus mod page description — whose install list is built from the same sections as the notes:

```text
[*]Installs mods with an "info.json" file and a ".dll" to the "Mods\<ModName>" folder.[/*]
[*]Installs Unity Mod Manager itself to the game folder itself (no subfolder), recognised by a "UnityModManager.exe" file.[/*]
[*]Any other mod not described above is installed to the game folder itself (no subfolder).[/*]
```

Loader and manager installers are phrased as installing the tool itself rather than mods, the catch-all installer gets the "any other mod" wording, and a closing FOMOD line is added when every installer checks for `fomod/ModuleConfig.xml`. Each line names only the first trigger file or extension a section matched, so a mod type recognised by several extensions needs that list widened by hand before posting.

Two paths, depending on whether the page already exists:

- **File present** — only the lists between `[b]🛠️ Mod Installation Notes:[/b]` and `[b]✅ Supported Versions:[/b]` and their closing `[/list]` are replaced. Everything else the author wrote is untouched. List items carrying BBCode markup (`[b]`, `[color=`, `[url=`, …) are kept and moved to the top of the rebuilt list: those are the lines no generator can produce — the yellow "downloaded automatically" loader line, a red caveat — and the house style already puts them first. Generated lines are always plain text, so nothing is duplicated. If the install heading is missing the extension is skipped rather than overwritten; a missing `Supported Versions` heading is not fatal, that page just keeps its install list refreshed.
- **File absent** — a full page is scaffolded: opening line, the store list, the install list, a stub `📋 Usage Notes`, and the donation block. Loader warnings, per-game usage notes and credits are left for the author to add.

The store list is built from whichever of `STEAMAPP_ID`, `GOGAPP_ID`, `EPICAPP_ID`, `UPLAYAPP_ID`, `EAAPP_ID` and `XBOXAPP_ID` resolve to a real value. `null`, `"XXX"`, `"N/A"` and `""` all count as "not sold on this store" — several extensions use an empty string with a comment such as `// is on Xbox, but not Game Pass`, and that store is left out.

`DESCRIPTION.bbcode.txt` is repo-only — `release_extension.py` excludes it from the released zip, and regenerates it for every game that releases so neither list can drift from `index.js`. The **Generate Description** button in `vortex_gui.py` runs the same command against the selected games.

Exits with code `1` if any extension threw an error during generation; `0` otherwise.

With `--json`, stdout receives a JSON object:

```json
{
  "timestamp": "2026-07-28T12:00:00.000Z",
  "created": 3,
  "skipped": 0,
  "errors": 0,
  "tier1": 30,
  "tier2": 0,
  "results": [{ "id": "game-subnautica2", "ok": true, "tier1": 10, "tier2": 0, "unknownFns": [] }, ...]
}
```

`unknownFns` lists the test functions that fell back to tier 2, which is the list to work from when adding new prose blocks.

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
node lint_extensions.js --changed
```

- No arguments — lints all `game-*/index.js` files.
- `GAME_ID [GAME_ID ...]` — only lints the listed game IDs. Resolves `game-<ID>` first; falls back to `template-<ID>` if not found (so `basic` lints `template-basic`).
- `--fix` — runs ESLint with `--fix` to auto-repair fixable issues.
- `--templates` — also includes `template-*/index.js` files in a full scan (no GAME_ID args).
- `--quiet` — suppresses `[OK]` lines; only shows failures.
- `--json` — writes machine-readable JSON to stdout instead of human-readable text. `lint_results.txt` is still written. Useful for CI pipelines that parse the output.
- `--changed` — only lints extensions whose `index.js` appears as changed in `git status`. Useful for fast pre-commit checks.

### lint_extensions.js — Examples

```sh
node lint_extensions.js
node lint_extensions.js mewgenics
node lint_extensions.js cairn crimsondesert --fix
node lint_extensions.js --templates --quiet
```

### lint_extensions.js — Output

Per-file status: `[OK]` for passing files (with `(N warnings)` suffix when warnings are present), `[FAIL]` with per-message details for failures. Summary line: `N passed, N failed, N errors, N warnings`. Exit codes: `0` all pass, `1` any fail or no files found, `2` ESLint crashed. Always writes the full output to `lint_results.txt` in the repo root (overwrites on each run). Timestamp is ISO 8601 for stable cross-machine ordering.

With `--json`, stdout receives a JSON object instead:

```json
{
  "timestamp": "2026-04-29T12:00:00.000Z",
  "passed": 5,
  "failed": 1,
  "total": 6,
  "totalErrors": 2,
  "totalWarnings": 7,
  "results": [{ "id": "megabonk", "path": "game-megabonk/index.js", "ok": true, "errorCount": 0, "warningCount": 0, "messages": [] }, ...],
  "failedIds": ["megabonk"]
}
```

---

## categorize_games.py

Scans all `game-*` extension folders and categorizes them by engine or framework based on the `Structure:` header comment and key code markers in each `index.js`. Writes one `.txt` file per engine category into `resources/lists/`, plus several non-exclusive "flag" lists (load order, one per downloader module in the family, Unreal Engine Mod Installer dependency, any inter-extension dependency, UE4-5 load-order parity, unreleased extensions) evaluated for every game independently. Each line in the file is a `GAME_ID`.

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

The engine categories above are mutually exclusive (one per game). The lists below are non-exclusive "flag" lists, evaluated for every `game-*` extension independently of its engine category and of each other:

| File | Flag |
| --- | --- |
| `resources/lists/games-loadorder.txt` | Non-UE4/5 games that call `context.registerLoadOrder` |
| `resources/lists/games-merge.txt` | Non-Unreal games that call `context.registerMerge`, i.e. carry their own file-merge handler |
| `resources/lists/games-mergemods.txt` | Non-Unreal games that give `mergeMods` a callback instead of a boolean, i.e. name each mod's deployment folder themselves |
| `resources/lists/games-downloader.txt` | Games with a bundled `downloader.js` module |
| `resources/lists/games-downloader-bepinexbe.txt` | Games with a bundled `bepinexbe_downloader.js` module (BepInEx bleeding-edge builds) |
| `resources/lists/games-downloader-codeberg.txt` | Games with a bundled `codeberg_downloader.js` module (Codeberg / any Forgejo-Gitea instance) |
| `resources/lists/games-downloader-fcmodding.txt` | Games with a bundled `fcmodding_downloader.js` module (Far Cry Mod Installer) |
| `resources/lists/games-downloader-gamebanana.txt` | Games with a bundled `gamebanana_downloader.js` module |
| `resources/lists/games-downloader-moddb.txt` | Games with a bundled `moddb_downloader.js` module |
| `resources/lists/games-downloader-modworkshop.txt` | Games with a bundled `modworkshop_downloader.js` module |
| `resources/lists/games-downloader-thunderstore.txt` | Games with a bundled `thunderstore_downloader.js` module |
| `resources/lists/games-uemi.txt` | Games that require the `Unreal Engine Mod Installer` extension via `context.requireExtension` |
| `resources/lists/games-requires-extension.txt` | Games that declare any `context.requireExtension` dependency on another Vortex extension, hard or optional. A hard dependency (no third argument) stops the extension loading at all when the other one is missing |
| `resources/lists/games-ue4-5-parity.txt` | UE4-5 games at `template-ue4-5` load-order parity (custom UE4SS + LogicMods pages) |
| `resources/lists/games-unreleased.txt` | Extensions with no real Nexus page URL in `EXTENSION_URL` — never published, excluding the permanent test beds in `UNRELEASED_LIST_EXCLUDED_GAMES` |

### categorize_games.py — Detection

Each game is matched against the engine categories in order — the first match wins. Detection uses the `Structure:` comment on line 3 of `index.js` as the primary signal, with fallback checks for unique code markers such as `const UNREALDATA =`, `const ATK_ID =`, `context.requireExtension('modtype-bepinex')`, etc. The flag lists are computed separately via dedicated predicates (`is_load_order_game`, `is_merge_game`, `has_mergemods_callback`, `has_downloader_js`, `has_bepinexbe_downloader_js`, `has_fcmodding_downloader_js`, `has_gamebanana_downloader_js`, `has_moddb_downloader_js`, `has_modworkshop_downloader_js`, `has_thunderstore_downloader_js`, `requires_unreal_mod_installer`, `has_extension_dependency`, `has_ue4ss_load_order_parity`, `is_unreleased_extension`) in `vortex_utils.py`. The parity predicate keys off the `Ue4ssContextMenu` component, which only exists in games that took the whole load-order region (PAK + custom UE4SS + LogicMods pages) from `template-ue4-5`.

`games-merge.txt` and `games-mergemods.txt` track two unrelated features that share a word. `context.registerMerge` merges file *contents* during deployment. `mergeMods` picks the deployment *destination folder*: `true` merges every mod into one tree, `false` gives each its own folder, and a function returns the folder name per mod - which is how an extension writes a numbered load-order prefix at deploy time. Nearly every extension sets the boolean somewhere in its game spec, so only the callback form is listed. Both predicates strip comments first, and `has_mergemods_callback` matches only a literal function value: a bare identifier (`mergeMods: reZip`) is skipped, because in these extensions those names are boolean consts.

No host has an inline-download list. GitHub requirements are tracked by `games-downloader.txt` — the shared `downloader.js` module is GitHub-sourced — and GameBanana, ModDB, ModWorkshop, Thunderstore, Codeberg, and builds.bepinex.dev by their own `games-downloader-*.txt` module lists: every extension fetching a requirement from those hosts carries the matching downloader module, so the module list is the complete list. A bare host URL left in an extension is a browse link behind an `Open <host> Page` button, which was never counted as a download.

Browser modules (`resources/browsers/`) have no list of their own. A game gets a source's browser page as standard equipment alongside that source's downloader module, so its roster is the same `games-downloader-*.txt` list — a separate `games-browser-*.txt` would just be a copy that drifts. Find current adopters by grepping which of those games also carry a `*_browser.js` file.

### categorize_games.py — unreleased list

`games-unreleased.txt` flags extensions that have never been published to Nexus Mods. The signal is the `EXTENSION_URL` const, which is filled in by hand once the extension's Nexus page exists: a missing, empty, `"XXX"` or non-Nexus value means unpublished. All three JavaScript quote styles are matched, since single-quoted and backtick literals both occur in these extensions.

Because the const is hand-maintained rather than checked against Nexus, the list is a starting point rather than proof. An extension that shipped without its const being updated would be listed, and one that parked a real URL before shipping would not.

`release_extension.py --upload` also prunes this file directly: any game whose upload succeeds is removed from it at the end of the run, so a first release does not leave a stale entry behind until the next categorize run. The two writers agree — an uploaded extension has a real `EXTENSION_URL`, so a later categorize run reaches the same list.

Nothing in `index.js` marks a permanent test bed — an extension run live to verify changes, versioned and changelogged normally, but never uploaded — so those are excluded by ID through `UNRELEASED_LIST_EXCLUDED_GAMES` in `categorize_games.py`. It currently holds `warhammer40kdarktide`; the other test bed, `subnautica2`, drops out on its own because a real extension URL is already parked in its `EXTENSION_URL`. Add an ID there when a new test bed appears, so the list stays a list of extensions genuinely awaiting a first release.

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
python port_to_template.py GAME_ID TEMPLATE_NAME --diff
python port_to_template.py GAME_ID TEMPLATE_NAME --no-explained
```

`GAME_ID` is the folder name without the `game-` prefix. `TEMPLATE_NAME` is the folder name without the `template-` prefix.
Use `--diff` to print a unified diff of the game's current `index.js` vs. the ported output without writing any files (mutually exclusive with `--force`).
Use `--no-explained` to skip regenerating `EXTENSION_EXPLAINED.md` after writing `index.js` (saves time when running `node generate_explained.js` separately).

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

A trailing `//` comment on a declaration is preserved, and a `//` inside the value itself (a URL such as `"https://www.pcgamingwiki.com/wiki/Foo"`) is not mistaken for one — the comment split is quote-aware rather than regex-only.

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

Packages a game extension folder into a `.zip` archive using 7-Zip, optionally uploads it to the Nexus Mods mod page as a new file version, and opens the extension's Nexus Mods Files tab in the default browser.

The repo-facing documentation is excluded from the zip — `EXTENSION_EXPLAINED.md`, `NOTES_FOR_MOD_AUTHORS.md`, `NOTES_FOR_MOD_AUTHORS.bbcode.txt` and `DESCRIPTION.bbcode.txt`. They stay in the repo for GitHub, but are not shipped in the extension Vortex installs. The exclusion list is the `ZIP_EXCLUDES` constant; after zipping, the script warns if any of those files ended up in the archive anyway.

All four are regenerated at the end of every run, for the games that released successfully: `EXTENSION_EXPLAINED.md` via `generate_explained.js`, the two `NOTES_FOR_MOD_AUTHORS` files via `generate_notes.js`, and `DESCRIPTION.bbcode.txt` — the Nexus mod page description — via `generate_notes.js --description`. The first three are overwritten outright; for the description, only the install-notes list is rewritten and the rest of the page stays as the author wrote it.

### release_extension.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `SEVENZIP_PATH` | Optional | Path to `7z.exe`. Defaults to `C:\Program Files\7-Zip\7z.exe`. |
| `NEXUS_API_KEY` | Required for `--upload` | Nexus Mods API key used for the v3 upload endpoints. |

### release_extension.py — Usage

```sh
python release_extension.py GAME_ID [GAME_ID ...]
python release_extension.py GAME_ID --no-open
python release_extension.py GAME_ID --dry-run
python release_extension.py GAME_ID --skip-node-check --skip-eslint
python release_extension.py GAME_ID --upload
python release_extension.py GAME_ID --edit-changelog
```

Pass one or more `GAME_ID` values to release multiple extensions in one run.
Use `--no-open` to skip opening the browser (useful for testing or bulk releases).
Use `--dry-run` to print what would be done without running checks, 7-Zip, or upload.
Use `--skip-node-check` to skip the `node --check` syntax step. Use `--skip-eslint` to skip the ESLint step.
Use `--upload` to upload the zip to Nexus Mods as a new file version after zipping. Default is skip (no prompt). The changelog entry for the current version is attached as the file description on Nexus. Every game that uploads successfully is also dropped from `resources/lists/games-unreleased.txt`.
Use `--edit-changelog` to also open the Nexus Mods changelog editor (Documents tab) in the browser alongside the Files tab.
Passing a template name (e.g. `template-basic`) instead of a game ID errors immediately before any release steps run.

### release_extension.py — Examples

```sh
python release_extension.py hollowknight
python release_extension.py hollowknight --upload
python release_extension.py assassinscreedorigins assassinscreedvalhalla --no-open
```

### release_extension.py — Output

**Aborts** if `CHANGELOG.md` is missing, if `info.json` version has no matching `## [X.Y.Z]` section in `CHANGELOG.md`, if `info.json` `name` does not match `Game: <Name>` pattern, or if `const debug = true` is found in `index.js`. Warns (but does not abort) if `info.json` version does not match the _latest_ `## [X.X.X]` entry in `CHANGELOG.md`. Runs `validate_index_js` checks (leftover `XXX`, missing `applyGame`, etc.) and warns on each issue found. Renames the versioned `.txt` file (e.g. `0.2.7.txt` -> `0.2.8.txt`) to match the current version. Updates the `Version:` and `Date:` lines in the `index.js` header comment — version from `info.json`, date from the most recent `## [X.X.X] - YYYY-MM-DD` entry in `CHANGELOG.md`. Adds any resolved store IDs to `DISCOVERY_IDS_ACTIVE` if not already present. Runs `node --check` on `index.js` (skip with `--skip-node-check`) and warns on syntax errors. Runs ESLint (skip with `--skip-eslint`). Runs `generate_explained.js` to regenerate `EXTENSION_EXPLAINED.md`, then `generate_notes.js` to regenerate the `NOTES_FOR_MOD_AUTHORS` pair, then `generate_notes.js --description` to refresh each `DESCRIPTION.bbcode.txt` install list (each batched across all games in a single Node invocation when releasing multiple; all skipped by `--dry-run`, and a failure of any one warns without failing the release). Creates `game-{GAME_ID}.zip` inside the extension folder, overwriting any existing zip. If `--upload` is passed, looks up the active file update group from `GET /v3/mods/{id}/file-update-groups`, runs a multipart upload via the Nexus v3 API, and publishes a new file version with the `## [X.Y.Z]` changelog entry as the description. Upload failure logs an error but does not fail the overall release. After the release loop, every game that uploaded successfully is removed from `resources/lists/games-unreleased.txt` in a single rewrite — that list is generated by `categorize_games.py` from each `index.js` `EXTENSION_URL`, so it goes stale the moment an extension is first published and stays stale until the next categorize run, and a successful upload proves the Nexus page exists. Games that did not upload, or are not in the list, are left alone. With `--dry-run --upload` the entries that would be removed are printed instead. Always prints the extracted changelog entry for the current version to the console before zipping. Reads `EXTENSION_URL` from `index.js` — if set to a valid URL, opens `EXTENSION_URL?tab=files` in the default browser; otherwise opens `https://www.nexusmods.com/games/site`. If `--edit-changelog` is passed, also opens the Nexus Mods Documents editor (`EXTENSION_URL/edit/documents`) in the browser.

---

## bump_version.py

Bumps the version of one or more game extensions. Updates `info.json`, the `index.js` header comment (`Version:` and `Date:` fields), and prepends a new empty changelog section to `CHANGELOG.md`.

### bump_version.py — Requirements

No additional packages required (Python stdlib only).

### bump_version.py — Usage

```sh
python bump_version.py --major GAME_ID [GAME_ID ...]
python bump_version.py --minor GAME_ID [GAME_ID ...]
python bump_version.py --patch GAME_ID [GAME_ID ...]
python bump_version.py --version 1.2.3 GAME_ID [GAME_ID ...]
python bump_version.py --minor GAME_ID --dry-run
python bump_version.py --patch GAME_ID --open-changelog
```

- `--major` — bumps the major segment and resets minor and patch to 0 (e.g. `1.2.3 -> 2.0.0`).
- `--minor` — bumps the minor segment and resets patch to 0 (e.g. `1.2.3 -> 1.3.0`).
- `--patch` — bumps the patch segment (e.g. `1.2.3 -> 1.2.4`).
- `--version VER` — sets an explicit version; must be valid semver (`X.Y.Z`). Errors immediately if format is invalid.
- `--open-changelog` — opens each bumped extension's `CHANGELOG.md` in the default editor after the bump, so the new empty section can be filled in immediately. Skipped for games whose version is unchanged or that have no `CHANGELOG.md`.
- `--dry-run` — prints what would change without writing files.

One of `--major`, `--minor`, `--patch`, or `--version` is required. Pass multiple `GAME_ID` values to bump several extensions in one run.

### bump_version.py — Output

For each game: prints `[game_id] OLD -> NEW`. Writes `info.json`, updates `index.js` header, and inserts `## [NEW] - YYYY-MM-DD` before the first versioned entry in `CHANGELOG.md`. The new CHANGELOG section body is left as a single blank list item for manual editing. Summary line at the end: `Saved: N | Failed: N`.

---

## patch_extensions.py

Generic framework for making repo-wide changes to all `game-*/index.js` files. Each patch is a named, independently-enabled function registered in the `PATCHES` list. New patches can be added without touching the runner logic.

Also resizes all non-64x64 PNG files in `game-*` and `template-*` folders to 64x64, all non-1920x1080 title images in `resources/title-images/` to 1920x1080, and all non-640x360 cover art (`GAME_ID.jpg`) in `game-*` folders to 640x360, after the patch run.

### patch_extensions.py — Requirements

- `Pillow` — for PNG resizing (`pip install Pillow`). Patches still run without it; only PNG resize is skipped.

### patch_extensions.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `VORTEX_MANIFEST_PATH` | Optional | Path to the Vortex extensions manifest JSON. Defaults to `%APPDATA%\Vortex\temp\extensions-manifest.json`. Used by the `extension_url` patch. |
| `APPDATA` | Optional | Base for the default manifest path above. Only read when `VORTEX_MANIFEST_PATH` is not set. |

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
python patch_extensions.py --audit
python patch_extensions.py GAME_ID [GAME_ID ...] --audit
python patch_extensions.py --audit --resolve
python patch_extensions.py --audit --resolve gog
python patch_extensions.py --audit --show-suppressed
```

Run without arguments to apply all enabled patches to every `game-*` folder.
Pass `GAME_ID [GAME_ID ...]` to target specific games. Use `--dry-run` to preview without writing.
Use `--force` to re-run all URL patches even if values are already set (implies `--force-pcgw`).
Use `--force-pcgw` to re-evaluate `PCGAMINGWIKI_URL` values that are already set (e.g. to correct wrong URLs from a previous run).
Use `--debug` to print raw PCGamingWiki search results and match status for each game (useful for diagnosing lookup failures).
Use `--list-patches` to print all registered patches with their enabled status and description, then exit without running anything.
Use `--only PATCH_NAME` to run exactly one named patch, bypassing the `enabled` flag. Combine with `GAME_ID` to target a specific game.
Use `--audit` to run the read-only audits (installer priorities + FOMOD checks + store ID wiring) across all `game-*` and `template-*` folders, then exit without patching. Combine with `GAME_ID` args to scope the audit. Output goes to stdout — pipe to a file for triage (e.g. `python patch_extensions.py --audit > resources/audit_2026-05-24.txt`).
Use `--resolve` with `--audit` to add the store ID resolution pass: every extension whose `EPICAPP_ID`/`GOGAPP_ID` is still unresolved is re-queried against egdata.app and gogdb.org, and any candidate is reported. Network-bound (several requests per unresolved extension) and read-only — candidates are never written. Takes an optional store: `--resolve epic`, `--resolve gog`, or `--resolve` for both. Only valid alongside `--audit`.
Use `--show-suppressed` with `--audit` to list the findings parked by an audit-skip marker, each with the reason recorded in the file, instead of only counting them in the summary line. Only valid alongside `--audit`.

### patch_extensions.py — Built-in Patches

| Patch | Description |
| --- | --- |
| `game_name` | Inserts `const GAME_NAME = "...";` after the `GAME_ID` line for extensions that don't define it. Name extracted from spec or `context.registerGame`. |
| `folder_vars` | Inserts any missing declarations from `GAME_PATH`, `GAME_VERSION`, `STAGING_FOLDER`, `DOWNLOAD_FOLDER`. Inserted in template order after `GAME_PATH`, or all together before `const spec = {` if `GAME_PATH` is also missing. |
| `utility_functions` | Inserts standard utility functions (`isDir`, `statCheckSync`, `statCheckAsync`, `getAllFiles`, `getDiscoveryPath`, `purge`, `deploy`) before `function modTypePriority` for any extension missing them. |
| `setup_vars` | Ensures `setup()` sets `GAME_PATH`, `STAGING_FOLDER`, and `DOWNLOAD_FOLDER` at the top of the function body. Only missing assignments are inserted. |
| `register_actions` | Injects standard `context.registerAction` calls inside `applyGame()` for any that are missing: Open Config/Save Folder (commented out), Open PCGamingWiki Page, View Changelog, Submit Bug Report, Open Downloads Folder. Each action is checked individually by its label string. |
| `context_once_api` | Inserts `const api = context.api;` as the first line inside every `context.once(() => { ... })` block that doesn't already have it. |
| `filtered_empty_dirs` | Ensures every `const filtered = files.filter(...)` block in an installer includes `!file.endsWith(path.sep)` to skip directory entries emitted by Vortex. Canonical: `template-basic:495-497`. |
| `ignore_conflicts_deploy_constants` | Inserts `IGNORE_CONFLICTS` and `IGNORE_DEPLOY` constants (canonical values: `[path.join('**', 'changelog*'), path.join('**', 'readme*')]`) immediately before `const spec = {` for any extension missing them. Never overwrites existing constants with custom values. |
| `spec_ignore_fields` | Adds `"ignoreConflicts": IGNORE_CONFLICTS` and `"ignoreDeploy": IGNORE_DEPLOY` to the `spec.game.details` object for any extension that declares the constants but hasn't wired them into spec. Canonical: `template-basic:197-198`. Skips a field if its constant is not yet declared. |
| `findgame_launcher_async` | Ensures `makeFindGame` is sync and `requiresLauncher` is async. Removes `async` from the two-arg form of `makeFindGame`; adds `async` to any `requiresLauncher` that lacks it. Canonical: `template-basic:351,370`. |
| `extension_url` | Sets `EXTENSION_URL` from the Vortex extensions manifest (`modId` → Nexus URL). Inserts the constant if missing. |
| `pcgamingwiki_url` | Sets `PCGAMINGWIKI_URL` by looking up the game on PCGamingWiki. Inserts as `"XXX"` if not found or API unreachable. |
| `epic_app_id` | Fills in `EPICAPP_ID = ""` by searching egdata.app for the game title and reading the EXECUTABLE item's `releaseInfo.appId`. Skips `null`, `"XXX"`, and already-set IDs. |
| `gog_app_id` | Fills in `GOGAPP_ID` by searching gogdb.org for the game title. **Registered disabled** (several requests per unresolved game) — run with `--only gog_app_id`. Unlike `epic_app_id`, treats `null` and a missing const as unresolved: `null` here has only ever meant "never looked up", and a survey of 191 extensions found 127 nulls, 62 missing consts and zero empty strings, so an empty-string-only gate would no-op on every candidate. Skips `"XXX"` and already-set IDs unless `--force`. |
| `discovery_ids` | Adds all resolved store IDs (`STEAMAPP_ID_DEMO`, `GOGAPP_ID`, `EPICAPP_ID`, `XBOXAPP_ID`, `UPLAYAPP_ID`, `EAAPP_ID`) to `DISCOVERY_IDS_ACTIVE` if not already present. Uses `add_to_discovery_ids()` from `vortex_utils`. |

Each patch skips a game if the value is already set (unless `--force-pcgw` is used for `pcgamingwiki_url`). Games that fail a non-trivial step are always printed in the output so failures are visible. After writing any changed `index.js`, `generate_explained.js` is run automatically to keep `EXTENSION_EXPLAINED.md` in sync.

### patch_extensions.py — Built-in Audits (`--audit`)

Read-only flag-only reports. Scan `game-*/index.js` and `template-*/index.js`; print findings to stdout; do not modify any files.

| Audit | Description |
| --- | --- |
| installer priorities | Reports every `context.registerInstaller(ID, PRIORITY, ...)` call where `PRIORITY` is an integer literal outside 25–49. Comment-only occurrences are ignored. `registerModType` priorities are out of scope. Honours the `installer-priority` audit-skip marker (see below) on the `registerInstaller` line or the line above it. Output format: `<folder>/index.js: :<line>  priority=<N>  id=<INSTALLER_ID>` grouped by file. |
| FOMOD check | Reports every `function test<Name>(files, gameId)` (or `async` variant) whose body does not contain a `moduleconfig.xml` reference. Honours the `fomod-check` audit-skip marker (see below) on the `function test<Name>` line or the line above it. Output format: `<folder>/index.js: :<line>  function <name>  -- no FOMOD check` grouped by file. |
| store ID wiring | For every store ID constant holding a real value (`GOGAPP_ID`, `EPICAPP_ID`, `XBOXAPP_ID`, `UPLAYAPP_ID`, `EAAPP_ID`), reports the consuming sites it never reaches. Findings are tagged `[functional]` — absent from discovery, or an Epic/Xbox ID with no `requiresLauncher` branch, or a sparse `DISCOVERY_IDS_ACTIVE` array — or `[convention]` — a missing or miscased `details.<store>AppId` / `environment.<Store>APPId`. Comments are stripped first, so a commented-out line counts as absent. Honours the `store-id` audit-skip marker (see below). Output format: `<folder>/index.js: :<line>  <CONST>  [<severity>] <finding>` grouped by file. |
| store ID resolution (`--resolve`) | Opt-in, network-bound. Re-queries egdata.app and gogdb.org for every unresolved `EPICAPP_ID`/`GOGAPP_ID` and reports candidates. Read-only: a resolver hit is a candidate for hand-checking, never a value to write. Output format: `<folder>: <CONST> = <id>  ('<GAME_NAME>' -> offer\|title <value>)`. |

#### Suppressing a finding

An audit cannot see intent. Where an extension leaves something unwired on purpose, the decision is recorded in the file it concerns with a marker comment:

```js
//!audit-skip: <rule>[,<rule>] - <reason>
```

The reason text after the ` - ` separator is required; a marker without one is ignored and the finding stays live. Rule names are `store-id`, `fomod-check`, and `installer-priority`, matching the audits above, and the marker is parsed by `audit_skip_rules()` in `vortex_utils.py`. This is the JavaScript-side counterpart of `# noqa: <rule>` in the Python scripts.

For the store ID audit, the marker goes on the constant's declaration line, on the commented-out wiring line, or directly above it, and it parks that constant whole — every finding it carries is suppressed together, since a half-wired store is not a state worth reporting.

Suppressed findings are counted, never dropped. The summary line reports `N suppressed (intentional)`, and `--show-suppressed` prints each one with its reason so the list can be re-reviewed.

After all patches run, PNGs are resized to 64x64, title images in `resources/title-images/` are resized to 1920x1080, and cover art (`GAME_ID.jpg`) in each `game-*` folder is resized to 640x360 (all require Pillow). When targeting specific games, only those game folders are checked. When running on all, all `game-*` and `template-*` folders are checked for PNGs.

### patch_extensions.py — Adding New Patches

Add an entry to the `PATCHES` list at the bottom of the script:

```python
{"name": "my_patch", "enabled": True, "fn": my_patch_function}
```

Each patch function receives `(game_id, src, context)` and returns `(new_src, changed: bool, message: str)`.

---

## setup_test_folder.py

Creates a minimal fake game installation for testing a Vortex extension. Reads the game spec out of `index.js` — its `name`, `executable`, and `requiredFiles` — and creates an empty file at the full path of the executable, including every subfolder, plus every discovery path the spec requires, so Vortex can detect the game.

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
python setup_test_folder.py --list
```

Use `--dry-run` to print what would be created or deleted without making any changes.
Use `--force` to recreate the `.exe` stub even if it already exists.
Use `--clean` to delete the test folder(s) for the given game ID(s) instead of creating them.
Use `--list` to print all existing test folders with size and last-modified time, then exit (no `GAME_ID` needed).

### setup_test_folder.py — Examples

```sh
python setup_test_folder.py hollowknight
python setup_test_folder.py helldivers2 reddeadredemption2
```

### setup_test_folder.py — Output

Creates `D:\Game_Tools_D\!TestGameFolders_D\{GAME_NAME}\{EXEC}` as an empty file with all parent directories. If the file already exists it reports so and skips creation. Values are resolved with a symbol table built from `index.js`, which handles template literals, `path.join()` expressions, and variable references.

The executable is taken from the game spec's `executable` field, since that is the path Vortex launches, and it is used whole — every subfolder in it is recreated (for example `Base\Binaries\Win64\Civ7_Win64_DX12_FinalRelease.exe`). Commented-out spec fields are ignored, and specs that reach the game object through `context.registerGame({ ... })` rather than a `gameSpec` const are read the same way.

Extensions whose spec points at a `getExecutable` function choose their executable at runtime by probing the game folder, so the script falls back to the store and edition constants those extensions declare, in this order:

```text
EXEC, EXEC_DEFAULT, DEFAULT_EXEC, STEAM_EXEC, EXEC_STEAM,
EXEC_GOG, EXEC_EPIC, EXEC_CLASSIC, EXEC_NEW, EXEC_XBOX
```

Default and Steam builds come first. `EXEC_XBOX` is last because it is the `gamelaunchhelper.exe` shim — creating it would make the extension treat the test folder as a Game Pass install and use the Xbox mod paths. If none of those resolve either, the script falls back to `EXEC_NAME` joined with `BINARIES_PATH` (or `STEAM_EXEC_FOLDER`); `BINARIES_PATH` is otherwise ignored, since in most extensions it is a mod deployment target rather than the folder the executable lives in.

Every entry of the spec's `requiredFiles` is created too, because Vortex only reports a game as discovered when all of them are present — as a directory if the entry's basename has no extension, otherwise as an empty file. Extensions that keep the array in a top-level `requiredFiles` const and attach it when registering the game are covered, as is `REQ_FILE`. Entries that resolve to the executable's own path are skipped.

The game's folder name comes from `GAME_NAME`, falling back to the spec's `name` field for extensions that pass the name to `registerGame` as a literal.

Extensions that register several games from one folder (for example `game-ninjagaidenmastercollection`) get a test folder for the first game in the file only.

---

## deploy_to_vortex.py

Copies one or more CB1 game extension folders from the repo into the Vortex plugins directory (`C:\ProgramData\vortex\plugins`). If a matching plugin folder already exists (exact `game-{id}` or a versioned `Vortex Extension Update - {GAME_NAME} Vortex Extension v*` folder), only `index.js` plus any bundled shared modules (files ending in `downloader.js` or `browser.js`, e.g. `downloader.js`, `gamebanana_downloader.js`, `moddb_downloader.js`, `thunderstore_browser.js`) are copied. If no match is found, the full folder is deployed. Use `--force` to always do a full replace.

### deploy_to_vortex.py — Requirements

No additional packages required (Python stdlib only).

### deploy_to_vortex.py -- Environment Variables

No environment variables are read directly. The plugins directory path is resolved via `vortex_utils.VORTEX_PLUGINS_DIR` (`VORTEX_PLUGINS_DIR` env var, default `C:\ProgramData\vortex\plugins`).

### deploy_to_vortex.py -- Usage

```sh
python deploy_to_vortex.py GAME_ID [GAME_ID ...]
python deploy_to_vortex.py GAME_ID --dry-run
python deploy_to_vortex.py GAME_ID --force
python deploy_to_vortex.py GAME_ID --restart-vortex
python deploy_to_vortex.py GAME_ID --launch-game
python deploy_to_vortex.py --all
python deploy_to_vortex.py --all --dry-run
```

- `GAME_ID [GAME_ID ...]` — one or more game IDs to deploy (e.g. `thelastofuspart2`).
- `--all` — deploy every `game-*` extension in the repo.
- `--dry-run` — lists what would be copied without writing anything.
- `--force` — always do a full folder replace instead of updating only `index.js` and downloader modules.
- `--restart-vortex` — close Vortex before copying (graceful `taskkill`, force-kill after 30s) and launch it again (no CLI args) after all copies. One close + one launch per run, not per game. Launches Vortex even if it was not running. Ignored with `--dry-run`.
- `--launch-game` — same restart, but relaunch straight into the deployed game (`Vortex.exe --game <GAME_ID>`), the same command the GUI's "Launch in Vortex" button runs. Implies `--restart-vortex`, so it does not need to be combined with it. Requires exactly one `GAME_ID` (rejected with `--all` or multiple ids). The id handed to Vortex is the `GAME_ID` declared in the extension's `index.js`, falling back to the folder id. Ignored with `--dry-run`.

### deploy_to_vortex.py — Examples

```sh
python deploy_to_vortex.py thelastofuspart2
python deploy_to_vortex.py thelastofuspart2 residentevil4 --force
python deploy_to_vortex.py thelastofuspart2 --dry-run
```

### deploy_to_vortex.py — Output

Per-game status: `[game_id] updated <file list> in <folder>` (existing match; file list is `index.js` plus any `*downloader.js` / `*browser.js` modules) or `[game_id] deployed to <path> (N files)` (full deploy) on success, or `[game_id] ERROR - ...` on failure. Exits with code `1` if any game fails.

---

## analyze_vortex_log.py

Parses `C:\ProgramData\vortex\vortex.log` and consolidates entries into a single file (`vortex.analyzed.log`) with sections per severity level. Within each section, entries are grouped by hour with the newest entries first within each bucket. Multi-line entries (stack traces, JSON blobs) are kept together. Output file lands next to `vortex.log` by default. Opens the output file on success.

### analyze_vortex_log.py — Requirements

No additional packages required (Python stdlib only).

### analyze_vortex_log.py — Usage

```sh
python analyze_vortex_log.py
python analyze_vortex_log.py LOG_PATH
python analyze_vortex_log.py [LOG_PATH] --out-dir DIR
python analyze_vortex_log.py --levels WARN,ERROR
python analyze_vortex_log.py --summary-only
python analyze_vortex_log.py --dry-run
python analyze_vortex_log.py --force
python analyze_vortex_log.py --no-open
python analyze_vortex_log.py --grep PATTERN
python analyze_vortex_log.py --since WHEN
python analyze_vortex_log.py --until WHEN
python analyze_vortex_log.py --merge-lines
```

### analyze_vortex_log.py — Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `APPDATA` | Optional | Standard Windows variable used to locate the fallback log path (`%APPDATA%\Vortex\vortex.log`) when the primary log is absent. Not a user-configurable input. |

### analyze_vortex_log.py — Options

| Option | Description |
| --- | --- |
| `LOG_PATH` | Path to the log file. Default: `C:\ProgramData\vortex\vortex.log` (falls back to `%APPDATA%\Vortex\vortex.log`). |
| `--out-dir DIR` | Output directory. Default: same folder as `LOG_PATH`. |
| `--levels LEVELS` | Comma-separated levels: `DEBUG`, `INFO`, `WARN`, `ERROR`. Default: all four. |
| `--summary-only` | Print entry counts and exit without writing files. |
| `--dry-run` | Preview output path and per-hour counts without writing. |
| `--force` | Overwrite existing output file. |
| `--no-open` | Do not open the output file after writing. |
| `--grep PATTERN` | Only include entries matching `PATTERN` (regex, applied to the full multi-line entry text). |
| `--since WHEN` | Only include entries at or after `WHEN`: a number of hours ago (e.g. `24`) or an ISO timestamp (e.g. `2026-06-18T10:00`). Naive timestamps are treated as UTC. |
| `--until WHEN` | Only include entries at or before `WHEN`: a number of hours ago (e.g. `2`) or an ISO timestamp (e.g. `2026-06-18T18:00`). Pairs with `--since` to bound a window. |
| `--merge-lines` | Collapse each multi-line entry (stack traces, JSON blobs) into a single ` \| `-joined line for easier grepping. |

### analyze_vortex_log.py — Output

Single file written to `--out-dir` (default: log parent folder):

- `vortex.analyzed.log`

File structure:

1. **Header / TOC** — source path, total entry count, per-level counts, and hour bucket totals aggregated across all selected levels.
2. **Per-severity sections** (DEBUG, INFO, WARN, ERROR) — each headed by a `===` banner; skipped when empty. Within each section entries are sub-grouped by `YYYY-MM-DD HH:00` with newest entries first within each bucket, each sub-group preceded by a `--- hour (N entries) ---` marker.

Console summary prints total entry count and per-level breakdown.

---

## read_vortex_db.py

Reads Vortex's on-disk LevelDB stores directly and prints the live application state -- discovered games, installed mods, profiles, load orders, settings, the Nexus metadata cache. Pure Python stdlib: the script implements Snappy decompression, the SST (`.ldb`) table format and the write-ahead log format itself, so it needs no LevelDB binding, no DuckDB and no Node.

The active store is resolved the same way Vortex resolves it: read `user.multiUser` from `%APPDATA%\Vortex\state.v2`, and if it is true use `%PROGRAMDATA%\vortex` instead. Values in the `confidential` hive (the Nexus OAuth token) are redacted unless `--show-secrets` is passed.

While Vortex is running it holds an exclusive lock on `MANIFEST-*` and the current `.log`, so only the compacted `.ldb` tables can be read. That still yields the whole store minus writes made since the last compaction; the script prints a warning to stderr when it happens. Close Vortex for an exact read. Format details are in [resources/VORTEX_DATABASES.md](resources/VORTEX_DATABASES.md).

The module is importable: `read_db(dir)` returns a `{key: json_string}` dict, and `unflatten(store, path_parts)` rebuilds a nested object from it.

### read_vortex_db.py -- Requirements

No additional packages required (Python stdlib only).

### read_vortex_db.py -- Usage

```sh
python read_vortex_db.py --hives
python read_vortex_db.py --get persistent.nexus.userInfo
python read_vortex_db.py --keys persistent.mods
python read_vortex_db.py --tree settings.gameMode.discovered.skyrimse --depth 2
python read_vortex_db.py --json persistent.profiles.PROFILE_ID
python read_vortex_db.py --stats
python read_vortex_db.py --games
python read_vortex_db.py --mods GAME_ID
python read_vortex_db.py --profiles [GAME_ID]
python read_vortex_db.py --loadorder GAME_ID
python read_vortex_db.py --db metadb --get hash:MD5
python read_vortex_db.py --path DIR --stats
python read_vortex_db.py --get PATH --no-wal --show-secrets --out FILE
```

### read_vortex_db.py -- Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `APPDATA` | Optional | Standard Windows variable used to locate the per-user store (`%APPDATA%\Vortex`) and the source-build store (`%APPDATA%\@vortex\main`). Not a user-configurable input. |
| `PROGRAMDATA` | Optional | Standard Windows variable used to locate the Multi-User Mode store (`%PROGRAMDATA%\vortex`). Not a user-configurable input. |

### read_vortex_db.py -- Options

| Option | Description |
| --- | --- |
| `--db WHICH` | Which store to read: `state` (default, follows Multi-User Mode), `metadb`, `per-user`, `shared`, `dev`. |
| `--path DIR` | Read this LevelDB directory instead of a named store. |
| `--get PATH` | Print every key at or under PATH as `path = json`. Dotted path, `\.` escapes a literal dot -- the same syntax as Vortex's own `--get`. Falls back to a raw key prefix match for `metadb`. |
| `--keys PATH` | Print the immediate child segment names under PATH. |
| `--tree PATH` | Print keys under PATH, collapsed at `--depth` levels. |
| `--depth N` | Depth for `--tree`, counted from PATH. Default: 1. |
| `--json PATH` | Rebuild the nested object under PATH and print it as JSON. |
| `--hives` | Print every top-level hive with its key count. |
| `--stats` | Print store location, file inventory, size, key count and any locked files. |
| `--games` | Print discovered games with mod count, active profile and install path. |
| `--mods GAME_ID` | Print installed mods for a game with version, mod type and enable state. |
| `--profiles [GAME_ID]` | Print profiles, optionally filtered to one game id. |
| `--loadorder GAME_ID` | Print the stored load order for the game's last active profile. |
| `--no-wal` | Skip the write-ahead log even when it is readable. |
| `--show-secrets` | Print confidential values instead of redacting them. |
| `--out FILE` | Write output to FILE instead of stdout. |

### read_vortex_db.py -- Output

Plain text on stdout, one record per line, or the file named by `--out`. `--json` emits indented JSON. Lock warnings go to stderr so they never contaminate piped output.

---

## audit_scripts.py

Runs seven audits and reports drift found in any:

1. **Header docstring audit** — compares each script's flags and env-var reads against the flags and env vars documented in its own header (`Usage:` and `Environment variables:` sections). Covers Python scripts (argparse) and Node scripts, whose flags are read from `flags.has('--x')` lookups and `KNOWN_FLAGS` sets and documented under `Run with:` / `Flags:` in the banner comment.
2. **SCRIPTS.md audit** — compares the same code-extracted flags and env vars against the corresponding script section in SCRIPTS.md (`### name — Usage` and `### name — Environment Variables` subsections).
3. **scripts.txt cross-check** — warns when a `*.py` or `*.js` in the repo root is not listed in `scripts.txt`, or when `scripts.txt` references a missing file.
4. **vortex_utils.py exports audit** — detects public functions, and constants that another script imports, defined in `vortex_utils.py` but missing from its module docstring import list.
5. **SCRIPTS.md contents-table audit** — detects public `vortex_utils` names missing from the `### vortex_utils.py -- Contents` table. Separate from audit 4: a name can be correctly exported yet still undocumented for a reader.
6. **Raw log-print audit** — detects `print(f"  [{...}]")` calls in scripts outside `vortex_utils.py` that should use `log_info`/`log_warn`/`log_error` (informational; does not affect exit code).
7. **Non-atomic write audit** — detects plain `open(<managed file>, "w")` writes to `index.js` / `info.json` / `CHANGELOG` outside the atomic helpers (`write_index_js` / `write_*_atomic` / `os.replace`). Blocking. Suppress an intentional non-atomic write with `# noqa: nonatomic-write`.

Read-only; never modifies any file. Uses `iter_repo_scripts()` from `vortex_utils` to iterate the canonical script list in `scripts.txt`. Skips the libraries and config files in the `SKIP` set — `vortex_utils.py`, `gui_tray.py`, `extension_parser.js`, `eslint.config.js`, and `SCRIPTS.md` — since they expose no CLI flags to compare. They remain listed in `scripts.txt` and documented here.

In the `Usage` subsections above, a flag is only counted as documented when it appears inside a fenced example block or opens its own line. Flags mentioned mid-sentence in prose are ignored, so a line such as "There is deliberately no `--check` flag" does not register `--check` as supported.

### audit_scripts.py — Requirements

No additional packages required (Python stdlib only).

### audit_scripts.py — Usage

```sh
python audit_scripts.py
python audit_scripts.py SCRIPT [SCRIPT ...]
python audit_scripts.py --json
```

Run without arguments to audit all scripts. Pass one or more filenames to audit a subset.
Use `--json` to emit a structured JSON report (for CI pipelines). Exits with code 1 when drift is found in either mode.

The SCRIPTS.md audit also checks for orphan sections — `## script.py` headings in SCRIPTS.md whose file no longer exists on disk.

### audit_scripts.py — Output

Two sections, each with a per-script report listing:

- **Flags in code, missing from header/SCRIPTS.md** — `add_argument('--flag')` calls not documented
- **Flags in header/SCRIPTS.md, not in argparse** — `--flag` patterns in docs that have no matching `add_argument` call
- **Env vars in code, missing from header/SCRIPTS.md** — `os.environ.get('VAR')` / `os.getenv('VAR')` / `get_api_key('VAR')` calls not documented
- **Env vars in header/SCRIPTS.md, not in code** — vars listed in docs that are not read directly (vars consumed inside `vortex_utils` helpers are allowed here)

Exits 0 with `All clear.` or exits 1 with `Drift found. Update headers, SCRIPTS.md, or scripts.txt to match the code.` — non-zero exit allows CI to fail on drift.

---

## gui_tray.py

PySide6-only helper library (not run directly) that makes a single-window GUI tray-resident and single-instance. Imported by `vortex_gui.py` only — never by CLI scripts, so it can depend on PySide6 while `vortex_utils.py` cannot. A copy lives in the Personal repo for its GUIs; keep the two in sync.

- `another_instance_running(key)` — returns `True` if an instance is already listening on the named local server `key`, and signals it to restore its window (so a second launch focuses the existing window instead of starting a second process).
- `listen_for_activation(key, on_activate)` — become the named server; calls `on_activate()` on each ping. Returns the `QLocalServer` (caller must keep a reference).
- `TrayManager(window, *, app_name, settings_org, settings_app, icon=None)` — adds a `QSystemTrayIcon` (Show/Quit menu, click-to-restore) and close-to-tray behavior. Call `on_close(event)` from the window's `closeEvent`: returns `True` to proceed with a real quit, `False` if the window was hidden to the tray. Degrades gracefully (always returns `True`) when no system tray is available. Falls back to a drawn letter-badge icon when `icon` is omitted.

## vortex_gui.py

GUI dashboard for running developer scripts against game extensions. Lists all `game-*` extensions in a sortable, filterable table with a toolbar of script actions.

Tray-resident + single-instance via `gui_tray.py`: the close (X) button hides the window to the system tray (a one-time notice explains this), the app keeps running, and re-launching focuses the existing window instead of starting a second. Quit for real from the tray icon's right-click menu. Settings are saved on both hide and quit.

### vortex_gui.py — Requirements

```sh
pip install pyside6
```

### vortex_gui.py — Usage

```sh
python vortex_gui.py
```

No arguments. Launches the window, which loads all extensions automatically.

The per-folder `index.js`/`info.json`/`CHANGELOG.md` parse is cached in `vortex_gui_row_cache.json` at the repo root (gitignored, auto-managed). The cache is keyed by folder name plus those three files' modification times, so unchanged extensions skip the read+regex on later launches — the dominant startup cost. Image existence and Nexus stats are always read live. Delete the file to force a full rebuild; it regenerates on the next refresh.

### vortex_gui.py — Layout

```text
[ Filter: ____________ ]  [Refresh]  [New Game...]  [Group by Engine]  [Flagged Only]  [All Categories v]  [Clear Checks]
[ Bump Version ] [ Release ] [ Deploy to Vortex ] [ Launch in Vortex ] | [ Open Folder ] [ Open in Editor ] [ Open Changelog ]
[ Open Game Page ] [ Open Extension Page ] | [ Port to Template... ] [ Setup Test Folder ] [ Patch ] [ Categorize ] [ Generate Description ]
[ Analyze Log ] [ Audit Scripts ] | [ Fetch Icon ] [ Fetch Cover ] [ Fetch Title ] [ Fetch Banner ] [ Fetch Nexus Stats ] [ View Images ]
-----------------------------------------------------------------------------------------------------------------------
| [x] | Flag | Icon | Game ID | Name | Ver | Updated | Engine | Stores | End | DL | Pub | Cover | Title | Banner |
| sortable QTableView, multi-select with Ctrl/Shift                                                                |
-----------------------------------------------------------------------------------------------------------------------
| Log pane (live subprocess output)    [Clear Log] [Export Log] [Stop Running] |
```

- `End` — Nexus endorsement count (blank until `Fetch Nexus Stats` is run; sorts numerically).
- `DL` — Nexus unique download count (same). Tooltip shows the last fetch timestamp.
- `Pub` — Nexus published file count.

- **Sort**: click any column header.
- **Filter**: case-insensitive substring match on Game ID, Name, Engine, and Note. Several terms can be given at once, separated by commas (`stalker, nioh, misery`) — a game is shown if it matches **any** of them. Blank terms (a trailing comma, `a,,b`) are ignored.
- **Flagged Only**: checkable button that restricts the table to flagged rows (checked games stay pinned visible). The state persists across sessions.
- **Category dropdown**: multi-select checkbox list; the popup stays open while toggling, and the closed dropdown shows the checked labels (or `All Categories` when none). Items, top to bottom: every engine label detected among the loaded rows (rebuilt on each refresh), then a separator, then the special categories. Checking several engines shows games of **any** of them (OR); `Downloader` and `Load Order` each narrow the result further (AND). `Downloader` — the extension folder bundles any downloader module in the family (`downloader.js`, `bepinexbe_`, `codeberg_`, `fcmodding_`, `gamebanana_`, `moddb_`, `modworkshop_`, or `thunderstore_downloader.js`; checked live on every refresh). The filter asks whether the extension auto-downloads a requirement at all, not which host it comes from. `Load Order` — the extension calls `context.registerLoadOrder` and is not a UE4/5 game (UE4/5 excluded because load order is template-standard there; detected during the `index.js` parse and cached). Combines with the text filter and Flagged Only (AND); checked games stay pinned visible. The checked set persists across sessions.
- **Checkboxes**: click the leftmost `[x]` column to check/uncheck a game, or press **Space** to toggle the checkbox on every selected row (the fast path for bulk-checking). The checkbox in that column's **header** is a master toggle: it checks every game the current filters leave visible, or unchecks them all when they are already checked, so "filter to a set, then act on all of it" takes one click. It is tri-state — a tick when every visible game is checked, a dash when only some are, empty when none are — and it respects the text filter, Flagged Only, and the category dropdown together. Clicking it never sorts the table. Note that unchecking through it drops the pin that kept checked games visible, so rows the filter excludes disappear again. Checked games are always visible regardless of filter text and persist across sessions; checked IDs whose extension folder no longer exists are dropped automatically on refresh. When any games are checked, toolbar actions operate on the checked set instead of the row selection (the context menu is the exception — it always targets the highlighted rows). **Clear Checks** button (enabled only when something is checked) unchecks all. Status bar shows `N checked` when non-zero.
- **Multi-select**: Ctrl/Shift-click rows; used as the action target when no checkboxes are checked.
- **Right-click**: context menu with the same script actions, applied to the highlighted row(s) only — checkboxes are ignored, even when games are checked. Right-clicking a row outside the highlight targets just that row.
- **Double-click**: opens the double-clicked row's `index.js` in the default editor (always just that row, even while checkboxes are active).
- **Status bar**: shows `N games shown | M selected` (plus `K checked` when applicable). While a multi-command run is active (e.g. Port to Template over several games), shows `Running: <script> (current/total)`.
- **Jump to game**: `Ctrl+G` prompts for a game ID (or prefix), clears the filter if the row is hidden, then selects and scrolls to it.
- **Export Log**: button next to **Clear Log**; saves the log pane to a timestamped `.txt` file via a save dialog.
- **Keyboard shortcuts**: press `F1` for the full list. Shortcuts and the help dialog are generated from one registry in the source (`SHORTCUT_DEFS`), and the toolbar and context menu from another (`ACTION_DEFS`), so the surfaces cannot drift apart.

### vortex_gui.py — Toolbar Actions

| Button | Script invoked |
| --- | --- |
| Bump Version | Dialog (`--major`, `--minor` (default), `--patch`, Manual `--version X.Y.Z`, `--open-changelog` default-checked, `--dry-run`), then `python bump_version.py <id> [flags]` |
| Release | Dialog (`--no-open`, `--dry-run`, `--upload`, `--edit-changelog`), then `python release_extension.py <ids> [flags]` |
| Deploy to Vortex | Dialog (`--dry-run`, `--force`, `--restart-vortex` default-checked, `--launch-game`), then `python deploy_to_vortex.py [flags] <ids>` |
| Launch in Vortex | `subprocess.Popen(VortexExe, ...)` — opens Vortex with `--game` for the selected game |
| Open Folder | `os.startfile(folder)` — no subprocess |
| Open in Editor | `os.startfile(index.js)` — no subprocess |
| Open Changelog | `os.startfile(CHANGELOG.md)` — no subprocess |
| Open Game Page | Opens `nexusmods.com/{game_id}` (the game's Nexus domain page) — no subprocess |
| Open Extension Page | Opens `EXTENSION_URL` from `index.js` in the browser — no subprocess |
| Port to Template... | Dialog to pick template, then `python port_to_template.py <id> <template>` per game |
| Setup Test Folder | `python setup_test_folder.py <ids>` |
| Patch | `python patch_extensions.py <ids>` |
| Categorize | Dialog, then `python categorize_games.py [--dry-run] <ids>` |
| Generate Description | `node generate_notes.js --description <ids>` — rewrites the install-notes list in each `DESCRIPTION.bbcode.txt`, scaffolding the page when absent |
| Analyze Log | `python analyze_vortex_log.py --force` (no selection required; opens output file) |
| Audit Scripts | `python audit_scripts.py` (no selection required) |
| Fetch Icon | `python fetch_exec_icon.py <ids>` |
| Fetch Cover | `python fetch_cover_art.py <ids>` |
| Fetch Title | `python fetch_cover_art.py --title <ids>` |
| Fetch Banner | `python fetch_cover_art.py --banner <ids>` |
| Fetch Nexus Stats | `python fetch_nexus_stats.py <ids>` |
| View Images | Opens the cover, title, and banner images in the default viewer — no subprocess |

Most toolbar buttons are disabled when no rows are selected and while a script is running. **Analyze Log** and **Audit Scripts** are always enabled (require no selection). Only one script runs at a time; click **Stop Running** to kill the active process.

### vortex_gui.py — New Game Dialog

Triggered by the **New Game...** button. Fields:

| Field | Description |
| --- | --- |
| Template | Combo box populated from all `template-*` folders (prefix stripped) |
| Game | Free-text game name or numeric Steam App ID |
| --force | Overwrite an existing extension folder |
| --no-images | Skip art downloads |
| --refresh-images | Re-download all images for an existing extension |
| --no-browser | Skip opening browser tabs |
| --no-startfile | Skip opening images/index.js in the editor |
| --dry-run | Preview only — no files written |

Runs `python new_extension.py <template> "<game>" [flags]`. On success (without `--dry-run`), the table refreshes automatically to show the new game.

### vortex_gui.py — Output

Script output (stdout + stderr merged) streams live into the log pane at the bottom of the window. The log pane scrolls automatically and holds up to 5000 lines. Runner markers are colorized: `[ERROR ...]` and `[exited with code N]` lines render red, and `[HH:MM:SS] > command` echo lines (timestamped at the moment each queued command starts) render in the accent blue.
