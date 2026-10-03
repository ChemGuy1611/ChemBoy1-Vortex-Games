# Changelog

## Planned Improvements (Not Yet Released)

- tool to launch bl4-crypt (by Cr4nkSt4r, naked exe file)

## [1.0.0] - 2026-10-01

- Added: UE4SS Load Order page. Reorder, enable, disable and lock UE4SS mods, with multi-select, a right-click menu and a filter for enabled, disabled and locked mods.
- Added: LogicMods Load Order page for blueprint mods, with the same controls.
- Added: UE4SS and LogicMods load orders are now included in Collections.
- Added: Updating a UE4SS or LogicMods mod now keeps its place in the load order.
- Added: The Download UE4SS button now fetches the latest UE4SS release, and Vortex tells you when a newer version is available.
- Changed: Game version now shows the real game build instead of the Unreal engine version.
- Fixed: Mod files with no file extension were skipped during installation
- Added an "Open SteamDB Page" button next to the PCGamingWiki one.
- The various "Open X Folder"/"Open X Page" buttons now show an error message if the folder or page can't be opened, instead of failing silently.

## [0.4.4] - 2026-09-08

- Fixed: A required mod loader or tool is no longer mistaken for an unrelated Nexus mod that shares the same file, which could show the wrong mod details or offer a bogus update for it
- Fixed: Downloads fetched for a required mod loader or tool now show "Website" as their source instead of being left blank

## [0.4.3] - 2026-09-02

- Fixed: A required mod loader or tool is no longer matched against downloads belonging to other games, which could report the wrong installed version or check for updates against the wrong file

## [0.4.2] - 2026-08-12

- Fixed: Epic version launch through EGS.

## [0.4.1] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Fixed: The requirement download button now reports when the requirement is already up to date instead of appearing to do nothing
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other
- Changed: The Python SDK stays optional - it is still only installed by the toolbar button, never automatically

## [0.4.0] - 2026-08-04

- Added: Notification when a new version of the Python SDK is released
- Changed: The Python SDK is now downloaded from the latest GitHub release instead of a fixed link

## [0.3.1] - 2026-04-23

- Added: Launch tool for Item and Save Editor.

## [0.3.0] - 2026-04-22

- Added: Support for PythonSDK and SDK mods.
- Added: Button to download latest PythonSDK.

## [0.2.1] - 2025-09-26

- Fixed Documents folder discovery to work correctly with OneDrive paths.
- Added tool to launch BL4-Gear-N-Gun-Editor (by Awsam, Python required).

## [0.2.0] - 2025-09-25

- Installs pak mods directly to the "OakGame/Content/Paks" folder. This is thanks to Gearbox Software and their patch. This also means Load order is no longer supported.
- Added Epic version ID and full support.
- Added tool to launch BL4 Save Editor (by J_SUEY).
- Added .yaml extension to the save file installer.
- Fixed Save path (added "Profiles/client" to end of path).

## [0.1.1] - 2025-09-12

- Corrected config and save paths (Documents).

## [0.1.0] - 2025-09-11

- Initial release
