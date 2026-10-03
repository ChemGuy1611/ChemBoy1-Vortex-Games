# Changelog

## [1.0.0] - 2026-10-03

- Added a fallback installer: when no other installer matches a mod, Vortex now shows a notice and installs the files to the game folder.
- Setup now makes sure the Reloaded mod folders in the game folder are writable.

## [0.3.0] - 2026-10-02

- Added text information and button to run Reloaded-II as Admin to the setup notification (needed to install dependencies if running from a protected folder).
- Added a deploy notification with a button to run Reloaded-II as Admin after deployment.
- Fixed: Reloaded mods packaged inside a folder now keep that folder's name instead of being renamed after the downloaded file.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.2.1] - 2025-10-05

- Fixed an undefined variable in the game version detection function.

## [0.2.0] - 2025-05-28

- Added Xbox version support, with custom game version detection
- Added option to suppress setup notification
- Added button to force download latest Reloaded Mod Manager (folder icon in Mods toolbar)
- Several technical improvements
