# ASKA — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | ASKA Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `aska` |
| Executable | `Aska.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `1898300`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasCustomMods` | `false` | set to true if there are modTypes with folder paths dependent on which mod loader is installed |
| `allowBepCfgMan` | `true` | should BepInExConfigManager be downloaded? |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded? False until figure out UniverseLib dependency |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `allowMelonNexus` | `false` | set false until bugs are fixed |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BepInEx Mod | `aska-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `aska-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `aska-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `aska-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `aska-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `aska-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `aska-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `aska-melonloader-config` | high | `{gamePath}/UserData` |
| Assembly DLL Mod | `aska-assemblydll` | high | `{gamePath}/.` |
| BepInExConfigManager | `aska-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `aska-melonprefman` | high | `{gamePath}/Mods` |
| Assets/Resources File | `aska-assets` | high | `{gamePath}/Aska_Data` |
| Root Game Folder | `aska-root` | high | `{gamePath}` |
| BepInEx Injector | `aska-bepinex-new` | low | `{gamePath}` |
| MelonLoader | `aska-melonloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `aska-bepinex-new` | 25 |
| `aska-melonloader` | 26 |
| `aska-root` | 27 |
| `aska-bepcfgman` | 29 |
| `aska-melonprefman` | 30 |
| `aska-assemblydll` | 31 |
| `aska-plugin` | 33 |
| `aska-assets` | 37 |
| `aska-custommod` | 39 |
| `aska-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest BepInEx BE (Browse)
- Download BepInExConfigManager
- Open Data Folder
- Open Save Folder
- Open BepInEx Config
- Open BepInEx Log
- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 5.4.23.5 | il2cpp |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Sand Sailor Studio\\Aska` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
