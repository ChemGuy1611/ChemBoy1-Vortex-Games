# frostbite suite Changelog

Covers `template-frostbite`. Suite file: `tests/templates/frostbite.test.js`.

## [2026-11-08]

- Note: the template's `changelog` and `readme` ignore patterns became `change?([-_ ])log` and `read?([-_ ])me` (see the template's changelog entry of this date). No test asserts those lists, so the suite is unchanged.
- Note: the template replaced the `changelog*`, `readme*` and `license*` globs in `IGNORE_CONFLICTS` and `IGNORE_DEPLOY` with document-only pairs (see the template's changelog entry of this date). No test asserts those lists, so the suite is unchanged.

## [2026-10-11]

- Added: a test that the Frosty, plugin and key installers cut at the marker itself when its name also appears in a parent folder.
- Added: two tests for the Run Frosty button's failure report. Permission, access (`EACCES`) and missing-file errors are offered for reporting and an unknown code is not, on both the rejected-promise and the thrown-error route. Suite is now 68 tests.
- Added: red proof. The two new tests fail against the template as it was at the last commit and pass with the fix.

## [2026-10-06]

- Changed: the toolbar actions tests cover the new `Open Nexus Mods Page` button. It is in the registered action list, and it opens `https://www.nexusmods.com/XXX/mods`.

## [2026-10-05] (2)

- Fixed: three tests asserted a notification the moment a file change became visible, before the template had sent it, and one config read could land while the file was being rewritten. They now wait for the notification and tolerate a mid-write read. The failures were intermittent and showed up under a full `npm test` run; twelve consecutive full runs pass after the fix.

## [2026-10-05]

- Added: the suite, 65 tests. Covers registration, installer routing, install output, toggle gating, game definition and store ids, the DatapathFix and ModData actions, the Frosty download, and the post-deploy notice.
- Added: mutation check. 91 deliberate breaks of a scratch copy were applied and the suite turned red for all but one equivalent change (a case-only folder name, which Windows treats as the same folder).
- Note: `GAME_VERSION` is never assigned in the template, so the "DatapathFix not needed on Steam" branch is dead. Seen, not pinned.
