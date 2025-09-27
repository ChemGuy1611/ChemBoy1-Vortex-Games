# Changelog

## Planned Improvements (Not Yet Released)

- None Planned

## [0.3.0] - 2025-09-27

- Updated pak installer to no longer re-zip pak mods files (Merger Utility was updated to look for paks in subfolders). Mods are installed in individual folders inside the "ph_ft/mods" folder.
- Removed pak deletion from "source" folder on deploy (Merger Utility now always outputs "data7.pak" file to "source" folder).
- Moved UTM Mod Merger Utility installer to top priority so it will always install properly.

## [0.2.1] - 2025-09-26

- Fixed undefined variable in the "More" text of the deployment notification to run UTM Mod Merger Utility.

## [0.2.0] - 2025-09-25

- Redesigned the pak installer to use "Unleash The Mods - Mod Merger Utility" as it can deconflict individual files within paks (i.e. player_variables.scr) and correct folder structure inside paks - <https://www.nexusmods.com/dyinglightthebeast/mods/140>
- Automatic download and install of Mod Merger Utility.
- User will receive a notification to run Mod Merger Utility after deploying mods.
- Extension will delete old merger folder from the staging folder if the user has used v0.1.1 previously.

## [0.1.1] - 2025-09-23

- Improved pak installer to ensure only paks with files names from data2.pak to data7.pak are merged (anything outside this range will be merged into data2.pak). The game will ONLY load paks from data2.pak to data7.pak.

## [0.1.0] - 2025-09-20

- Inital Release
