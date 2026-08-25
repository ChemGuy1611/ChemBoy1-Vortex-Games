# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [1.0.0] - 2026-08-23

- Fixed: TOC Reset now actually verifies the game files through Steam. It previously reported success without checking anything
- Changed: TOC Reset no longer deletes the game's `toc` file. Steam checks it and repairs it only if it has been altered, so a failed verification can no longer leave the game unplayable
- Fixed: TOC Reset no longer stops with an error when Overstrike's `toc.BAK` backup is missing
- Fixed: Mods are deployed again after verification, instead of being left purged
- Fixed: The extension no longer stops loading entirely when the Vortex Steam File Downloader extension is not installed
- Fixed: The Steam version is now detected from the store the game was found in rather than from a file in the game folder

## [0.2.0] - 2026-03-06

- Improved: TOC reset is now run from a button rather than a notification - improved logic as well
- Added: Buttons to open several useful files/folders/URLs

## [0.1.7] - 2025-10-31

- Fixes for Steam verification of "toc" file. Note that this function is still experimental.

## [0.1.6] - 2025-04-05

- Added .suit_style and .script extensions to Overstrike mod installer.
