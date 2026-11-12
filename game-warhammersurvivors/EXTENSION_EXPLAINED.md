# Warhammer Survivors — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Warhammer Survivors Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `warhammersurvivors` |
| Executable | `WarhammerSurvivors.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `WarhammerSurvivors.exe` |
| Executable (Demo) | `WarhammerSurvivors.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/2584](https://www.nexusmods.com/site/mods/2584) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Warhammer_Survivors](https://www.pcgamingwiki.com/wiki/Warhammer_Survivors) |

## Supported Stores

- **Steam** — `3669620`
- **GOG** — `2068449424`
- **Xbox / Microsoft Store** — `AurochDigitalLtd.WarhammerSurvivors`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `isXna` | `false` | set to true if game is XNA engine |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `hasXbox` | `true` | toggle for Xbox version logic |
| `multiExe` | `false` | set to true if there are multiple executables (typically for Xbox/EGS) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `preventPluginInstall` | `true` | set to true if you want to prevent plugins not for the current mod loader from installing. Disable if using cross-compatibility plugins. |
| `loaderSwitchRestart` | `false` | set to true if you need to restart the extension after switching mod loaders |
| `enableSaveInstaller` | `false` | set to true if you want to enable the save installer (only recommended if saves are stored in the game's folder) |
| `hasCustomMods` | `false` | set to true if there are modTypes with folder paths dependent on which mod loader is installed |
| `hasCustomLoader` | `false` | set to true if there is a custom mod loader |
| `customLoaderInstaller` | `false` | set true if the custom loader uses an installer |
| `hasTextureReplacer` | `false` | set to true if the game has a Texture Replacer BepInEx plugin that loads .png textures from BepInEx/plugins/TextureReplacer (set TEXTURES_STRING below) |
| `debug` | `false` | toggle for debug mode |
| `exeHasGameVersion` | `false` | toggle: true if the game devs stamp the real game version (not just the Unity player version) into the exe ProductVersion |
| `hasVersionFile` | `false` | set to true if there is a Version.info file that contains the game version number |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `loaderChoice` | `true` | true if loader choice is enabled |
| `allowBepCfgMan` | `true` | should BepInExConfigManager be downloaded (via notification)? |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded (via notification)? disabled 2026-09-14 - plugin causes in-game errors when loaded |
| `allowBepinexNexus` | `true` | allow Nexus Mods download of BepInEx/MelonLoader |
| `allowMelonNexus` | `true` | allows MelonLoader to be downloaded from Nexus Mods |
| `useMelonNightly` | `false` | use Nightly build of MelonLoader? |
| `customInstalled` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BepInEx Mod | `warhammersurvivors-bepinexmod` | high | `{gamePath}/BepInEx` |
| BepInEx Plugins | `warhammersurvivors-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `warhammersurvivors-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `warhammersurvivors-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| BepInExConfigManager | `warhammersurvivors-bepcfgman` | high | `{gamePath}/BepInEx` |
| Root Folder | `warhammersurvivors-root` | high | `{gamePath}` |
| BepInEx Injector | `warhammersurvivors-bepinex` | low | `{gamePath}` |
| MelonLoader Mod | `warhammersurvivors-melonmod` | high | `{gamePath}/.` |
| MelonLoader Mods | `warhammersurvivors-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `warhammersurvivors-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `warhammersurvivors-melonloader-config` | high | `{gamePath}/UserData` |
| MelonLoader UserLibs | `warhammersurvivors-melonloader-userlibs` | high | `{gamePath}/UserLibs` |
| MelonPreferencesManager | `warhammersurvivors-melonprefman` | high | `{gamePath}/Mods` |
| MelonLoader | `warhammersurvivors-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `warhammersurvivors-assemblydll` | 60 | `{gamePath}` |
| Assets/Resources File | `warhammersurvivors-assets` | 62 | `{gamePath}/WarhammerSurvivors_Data` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `warhammersurvivors-bepinex` | 26 |
| `warhammersurvivors-melonloader` | 27 |
| `warhammersurvivors-root` | 28 |
| `warhammersurvivors-bepcfgman` | 29 |
| `warhammersurvivors-melonprefman` | 30 |
| `warhammersurvivors-assemblydll` | 31 |
| `warhammersurvivors-plugin` | 33 |
| `warhammersurvivors-assets` | 37 |
| `warhammersurvivors-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`WarhammerSurvivors.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest BepInEx BE
- Download BepInExConfigManager
- Download Latest MelonLoader
- Open Data Folder
- Open Save Folder
- Open BepInEx Config
- Open BepInEx Log
- Open MelonLoader Config
- Open MelonLoader Log
- Open PCGamingWiki Page
- Open Nexus Mods Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 5.4.23.5 | il2cpp |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\XXX\\XXX` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
