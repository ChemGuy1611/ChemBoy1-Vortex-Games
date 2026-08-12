# Changelog

## Planned Improvements (Not Yet Released)

- tool to launch bl4-crypt (by Cr4nkSt4r, naked exe file)

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
