# contract suite Changelog

Covers every `template-*` folder. Suite files: `tests/contract.test.js`, `tests/contract-checks.js`, `tests/contract-allowlist.js`.

## [2026-10-04] (2)

- Changed: the mod type priority ceiling is `75 + (number of mod types - 1)`, because every template registers its `low` types at 75 plus the array index. Eight allowlist entries for those priorities were removed.
- Changed: the "registration order" check no longer requires `registerReducer` to come first, since reducer order does not matter. The `register-phase` check now only forbids `register*` calls inside `context.once`, and the `ue4-5` allowlist entry was removed.
- Changed: the FOMOD-guard gaps on marker-file installers stay as reviewed, accepted entries (a FOMOD package never contains the marker file). The allowlist holds six entries.

## [2026-10-04]

- Added: 13 checks that run on every template folder and pick up new templates automatically: game registration, mod type priorities, installer priority range and uniqueness, fallback installer last at 49, installer result shape, game id check, FOMOD guard, `register*` calls outside `context.once`, `mod-icons` action guard, `queryPath`, `executable` per store, and `debug` off.
- Added: an allowlist of known exceptions, each with a reason. An entry is itself asserted, so fixing the template turns the suite red until the entry is removed.
- Added: four mutation self-checks on a scratch copy of `template-basic` (FOMOD guard removed, game id check removed, an installer priority set out of range, registration moved into `context.once`). Each must turn the matching check red.
