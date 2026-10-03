# Changelog

## [1.0.0] - 2026-10-03

- Added the FF16 Mod Loader (Reloaded-II) as a supported mod type. Setup now downloads and installs it automatically.
- Fixed: Reloaded mods now deploy to the Reloaded "Mods" folder, where Reloaded-II looks for them.
- Added a fallback installer: when no other installer matches a mod, Vortex now shows a notice and installs the files to the game folder.
- Setup now makes sure the Reloaded mod folders in the game folder are writable.

## [0.3.0] - 2026-10-02

- Added support for the Xbox / Microsoft Store version of the game.
- Added support for the demo.
- Added text information and button to run Reloaded-II as Admin to the setup notification (needed to install dependencies if running from a protected folder).
- Added a deploy notification with a button to run Reloaded-II as Admin after deployment.
- Reloaded-II now runs in portable mode: setup creates a portable.txt file in the Reloaded folder, so its settings stay with the game install.
- Added a "Download Reloaded Mod Manager" button to the Mods toolbar.
- Fixed: Reloaded mods packaged inside a folder now keep that folder's name instead of being renamed after the downloaded file.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.2.0] - 2026-08-03

- Fixed: Readme and changelog files inside mods no longer show up as file conflicts.
- Fixed: Paths are now built safely on all systems.
- Added: Buttons to open the game's PCGamingWiki page, view the changelog, submit a bug report, and open the downloads folder.

## [0.1.1]

- Initial release
