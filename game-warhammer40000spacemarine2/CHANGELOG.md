# Changelog

## Planned Improvements

- None Planned

## [0.3.6] - 2025-12-04

- Improved IS installer to remove unnecessary files and folders from the staging folder.
- Updated IS download button to download directly from Nexus Mods.

## [0.3.5] - 2025-09-16

- IS mod installer now extracts both the "client" and "server" default_other.pak files to "mods_source" and copies the "tools" folder to "root" during installation.
- Updated IS notification to reflect that it is now available on Nexus Mods.

## [0.3.4] - 2025-07-08

- Added notification if user has installed Integration Studio mod toolkit with important usage information.
- Added button to open IS download page (folder icon in Mods toolbar).

## [0.3.3] - 2025-05-14

- Added tool and installer for Integration Studio. Thanks to Pickysaurus.

## [0.3.2] - 2025-04-17

- Disabled symlinks as they don't work with the game after Patch 7.0

## [0.3.1] - 2025-04-16

- Corrected crash reports folder path

## [0.3.0] - 2025-04-15

- Updated for Patch 7.0 - paks go to "client_pc/root/mods" folder and loose files go to "client_pc/root/local"
- Set pak mods folder as default mod install directory. Binaries folder added as a fallback installer. This will ensure FOMOD installers install to mods folder.
- Added button to open folders - paks folder, local mods folder, local appdata folder, and crash reports folder. - folder icon in Mods toolbar.
