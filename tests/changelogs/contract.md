# contract suite Changelog

Covers every `template-*` folder. Suite files: `tests/contract.test.js`, `tests/contract-checks.js`, `tests/contract-allowlist.js`.

## [2026-11-23]

- Added: the `steam-launch-parameters` check. For every `registerGame` call with a non-empty `parameters` list, a Steam result from `requiresLauncher` must send every parameter token in `addInfo.parameters` and carry `addInfo.appId`, because Vortex never passes `game.parameters` through a store launch. A direct launch (`undefined`) passes. All templates pass it trivially (empty parameters).
- Added: a fifth mutation self-check on `template-basic` (launch parameters set while the Steam branch has no `addInfo`), which must turn the new check red.

## [2026-10-30]

- Removed: the `template-unity-umm` `modtype-priority` allowlist entry. The template now registers its Unity Mod Manager and Mods mod types at 26 and 27, inside the range, so the check passes for it.

## [2026-10-04] (2)

- Changed: the mod type priority ceiling is `75 + (number of mod types - 1)`, because every template registers its `low` types at 75 plus the array index. Eight allowlist entries for those priorities were removed.
- Changed: the "registration order" check no longer requires `registerReducer` to come first, since reducer order does not matter. The `register-phase` check now only forbids `register*` calls inside `context.once`, and the `ue4-5` allowlist entry was removed.
- Changed: the FOMOD-guard gaps on marker-file installers stay as reviewed, accepted entries (a FOMOD package never contains the marker file). The allowlist holds six entries.

## [2026-10-04]

- Added: 13 checks that run on every template folder and pick up new templates automatically: game registration, mod type priorities, installer priority range and uniqueness, fallback installer last at 49, installer result shape, game id check, FOMOD guard, `register*` calls outside `context.once`, `mod-icons` action guard, `queryPath`, `executable` per store, and `debug` off.
- Added: an allowlist of known exceptions, each with a reason. An entry is itself asserted, so fixing the template turns the suite red until the entry is removed.
- Added: four mutation self-checks on a scratch copy of `template-basic` (FOMOD guard removed, game id check removed, an installer priority set out of range, registration moved into `context.once`). Each must turn the matching check red.
