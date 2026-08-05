# Changelog

## Planned Improvements (Not Yet Released)

- Loose Files loader support (once added)

## [0.3.1] - 2026-08-05

- Fixed: A required mod loader or tool that can no longer be found in its GitHub release is now reported, listing the files the release actually contains, instead of failing quietly
- Fixed: Requirement downloads are written to disk as they arrive rather than held in memory, and a failed download no longer leaves a temporary file behind
- Fixed: Pressing a requirement download button twice no longer starts the same download twice
- Fixed: Requirement update checks no longer stop working when a version number cannot be read
- Changed: Installed requirements are now identified by their own mod type. A requirement installed earlier without one is downloaded once more, after which it is identified correctly
- Added: Checking for updates now installs a missing requirement instead of reporting an update for something that is not installed
- Fixed: Updating a requirement now disables the version it replaces before the new one is installed, so the two cannot deploy on top of each other

## [0.3.0] - 2026-08-03

- Magic RDR now downloads the latest release automatically instead of a fixed version.
- Vortex now notifies you when a newer Magic RDR release is available.
- Fixed the Magic RDR installer not recognizing the tool's files.

## [0.2.5] - 2025-11-14

- Added buttons to open Config and Save folders (folder icon on Mods page toolbar).
- Added button to Magic-RDR notification to never show again (suppresses notification).
- Technical fixes and improvements.

## [0.2.4] - 2025-08-18

- Added Epic Games version support.
- Improved game discovery code.
- Updated Magic RDR download to v1.3.9.
