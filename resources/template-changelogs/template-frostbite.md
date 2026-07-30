# template-frostbite Changelog

## [2026-07-29]

- Changed: scaffold version raised from 0.1.0 to 1.0.0 in `info.json`, the `CHANGELOG.md` entry, the `index.js` header block, and the version marker `.txt` filename. Extensions created from this template now start at 1.0.0.

## [2026-07-19]

- Fixed: downloadPatch steam-skip error notification said "SDK Patch" (copied from the Veilguard extension); now uses `${PATCH_NAME}` (DatapathFix Plugin). Note: the check itself remains inert since GAME_VERSION is never set by the template.

## [2026-07-01]

- Changelog tracking started for this template.
