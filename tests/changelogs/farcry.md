# farcry suite Changelog

Covers `template-farcry`. Suite file: `tests/templates/farcry.test.js`.

## [2026-10-11]

- Changed: the `known gap` test for the root installer now asserts the fixed result (`ModSupport/Support/a.txt` installs as `Support/a.txt`) and lost its `known gap:` prefix.
- Added: a test that every folder-flattening installer (data, binaries, mod file, xml, mod installer) cuts at the marker file itself when the same name also appears in a parent folder (`a.dat.bak/a.dat`).
- Added: two tests for the Run Installer button's failure report. Permission, access (`EACCES`) and missing-file errors are offered for reporting and an unknown code is not, on both the rejected-promise and the thrown-error route. Suite is now 101 tests.
- Added: red proof. The new tests fail against the template as it was at the last commit and pass with the fix.

## [2026-10-06]

- Changed: the toolbar actions tests cover the new `Open Nexus Mods Page` button. It is in the registered action list, and it opens `https://www.nexusmods.com/XXX/mods`, and its failure is reported instead of thrown when the shell is unavailable.

## [2026-10-05]

- Added: the suite, 98 tests. Covers registration and priorities, the bundled fcmodding browse page and its listeners, routing across the eight installers including the `.a3` repack case, install output for every installer (the repack runs against a temporary staging folder), toggle gating, game definition, Ubisoft Connect registry discovery with the store helper as fallback, setup and the FC Mod Installer download, the update check (same-day builds compared by time, landing-page fallback, unreachable host), the post-deploy notice, the download details, and the toolbar actions.
- Added: mutation check. 275 of 278 deliberate breaks of a scratch copy (template, bundled downloader and browse page) turned the suite red. The three survivors are equivalent.
- Added: a `known gap` test for the root installer, which cuts the destination at the first `<root folder>/` in the path, so a wrapper folder such as `ModSupport/Support/x` installs as `Support/Support/x`. It turns red when the template is fixed.
