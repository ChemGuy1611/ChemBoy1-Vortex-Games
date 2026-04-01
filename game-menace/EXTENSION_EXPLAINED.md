# MENACE — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | MENACE Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `menace` |
| Executable | `Menace.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Menace.exe` |

## Supported Stores

- **Steam** — `2432860`
- **GOG** — `1812373738`
- **Xbox / Microsoft Store** — `HoodedHorse.MENACE`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `enableLoadOrder` | `true` | true if you want to use load order sorting |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `multiExe` | `false` | set to true if there are multiple executables (typically for Xbox/EGS) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `preventPluginInstall` | `true` | set to true if you want to prevent plugins not for the current mod loader from installing. Disable if using cross-compatibility plugins. |
| `loaderSwitchRestart` | `false` | set to true if you need to restart the extension after switching mod loaders |
| `enableSaveInstaller` | `false` | set to true if you want to enable the save installer (only recommended if saves are stored in the game's folder) |
| `hasCustomMods` | `false` | set to true if there are modTypes with folder paths dependent on which mod loader is installed |
| `hasCustomLoader` | `false` | set to true if there is a custom mod loader |
| `customLoaderInstaller` | `false` | set true if the custom loader uses an installer |
| `allowBepCfgMan` | `false` | should BepInExConfigManager be downloaded? |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded? False until figure out UniverseLib dependency |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `allowMelonNexus` | `false` | set false until bugs are fixed |
| `customInstalled` | `false` |  |
| `mod_update_all_profile` | `false` |  |
| `updating_mod` | `false` | used to see if it's a mod update or not |
| `isCustom` | `false` |  |
| `unknown` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| ModpackLoader | `menace-modpackloader` | low | `{gamePath}/.` |
| Modpack Mod | `menace-modpackmod` | high | `{gamePath}/Mods` |
| Custom Leaders Mod | `menace-customleaders` | high | `{gamePath}/Mods/customleaders` |
| Menace ModKit | `menace-modkit` | low | `{gamePath}/.` |
| BepInEx Mod | `menace-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `menace-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `menace-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `menace-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `menace-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `menace-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `menace-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `menace-melonloader-config` | high | `{gamePath}/UserData` |
| BepInExConfigManager | `menace-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `menace-melonprefman` | high | `{gamePath}/Mods` |
| Root Game Folder | `menace-root` | high | `{gamePath}` |
| BepInEx Injector | `menace-bepinex` | low | `{gamePath}` |
| MelonLoader | `menace-melonloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `menace-customloader` | 25 |
| `menace-melonloader` | 26 |
| `menace-bepinex` | 27 |
| `menace-modkit` | 28 |
| `menace-modpackloader` | 29 |
| `menace-modpackmod` | 30 |
| `menace-root` | 31 |
| `menace-bepcfgman` | 32 |
| `menace-melonprefman` | 33 |
| `menace-assemblydll` | 34 |
| `menace-plugin` | 35 |
| `menace-customleaders` | 36 |
| `menace-assets` | 37 |
| `menace-custommod` | 45 |
| `SAVE_ID` | 47 |
| `menace-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Menace.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)
- **${CUSTOMLOADER_NAME} Installer**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download ${MODKIT_NAME}
- Open MelonLoader Config
- Open MelonLoader Log
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 5.4.23.5 | il2cpp |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex links/copies to game folder
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
