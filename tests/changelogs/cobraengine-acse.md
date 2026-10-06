# cobraengine-acse suite Changelog

Covers `template-cobraengineACSE`. Suite file: `tests/templates/cobraengine-acse.test.js`.

## [2026-10-05]

- Added: the suite, 49 tests. Covers `.ovl` files under `Win64/ovldata`, the installers that share priority 49, routing, install output, toggle gating, game definition, setup and the save folder, and the toolbar actions.
- Added: mutation check. 76 deliberate breaks of a scratch copy were applied and the suite turned red for all but one change to a `low` priority that no mod type uses.
- Added: a `known gap` test for `setup`, which creates `<Saved Games>\<game>\Saves`; the next load takes that as the user-id folder and resolves `Saves\Saves`. It turns red when the template is fixed.
