# Changelog

## [1.0.2] - 2026-10-25

- Added the Nexus mod ID to the extension info.

## [1.0.1] - 2026-10-16

- Added the game's Nexus Mods ID to the extension's info file.

## [1.0.0] - 2026-10-12

- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.
- Fixed: Mods packaged inside an outer folder named like one of the mod's key files (for example "plugin.dll.old") now install into the right place.
- Added: Frosty plugin (.dll) mods now install into the Frosty Plugins folder.
- Added: .fbpack mods are now recognised, with a notification explaining the manual import step in Frosty. When a mod contains several mod files, you can now choose which ones to install.
- Added: Mods that match no other installer now go through a fallback installer, with a notification asking you to check the mod page for manual steps.
- Changed: Mods are no longer deployed as symlinks.

## [0.3.0] - 2026-07-19

- Added: DatapathFix Plugin support for Steam/Epic versions - buttons to download, remove, and enable/disable the plugin (folder icon in Mods toolbar), plus a setup notification with instructions
- Added: Button to delete the ModData folder (with confirmation) - Frosty rebuilds it on next launch
- Changed: Disabled config/save modtype as it could prevent hardlinks in some user environments
- Added: Button to open the Frosty manager_config.json config file
- Added: Button to open the Frosty Mods folder
- Added: Notification to run Frosty Mod Manager after deployment

## [0.2.4] - 2026-01-30

- Fixed: paths strings
- Added: Buttons to open Config/Save folder, Downloads folder, PCGamingWiki page, view changelog, and submit bug reports
