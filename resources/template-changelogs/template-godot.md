# template-godot Changelog

## [2026-08-10]

- Changed: `hasXbox` is now derived from the active discovery IDs. It is declared with `let` and initialised to `false`, followed by `if (DISCOVERY_IDS_ACTIVE.includes(XBOXAPP_ID)) hasXbox = true;`, so adding the Xbox app ID to `DISCOVERY_IDS_ACTIVE` is enough to switch on the Xbox version logic. Setting the initialiser to `true` still forces it on for games that need it without an Xbox ID in the list.

## [2026-08-05]

- Added: `downloader.js` installs a missing requirement when the update check runs, instead of reporting an update for something that is not installed. A new `autoInstall: false` requirement field opts out, for requirements that should only be installed by an explicit user action.
- Fixed: `downloader.js` disables the version a requirement update replaces before installing the new one, so the two cannot deploy on top of each other.
- Fixed: `downloader.js` updated to the audited canonical version. Requirement detection is now scoped to the requirement's own mod type instead of also matching untyped mods, and the module assigns that mod type itself on install. A missing or renamed release asset is now reported instead of failing silently, one failing requirement no longer cancels the rest of the array, downloads are streamed rather than buffered in memory, and repeat presses of a download action are ignored while one is already running.

## [2026-07-29]

- Changed: scaffold version raised from 0.1.0 to 1.0.0 in `info.json`, the `CHANGELOG.md` entry, the `index.js` header block, and the version marker `.txt` filename. Extensions created from this template now start at 1.0.0.

## [2026-07-01]

- Changelog tracking started for this template.
