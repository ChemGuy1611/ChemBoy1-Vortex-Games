# Football Manager 26 — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Football Manager 26 Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2025-11-04 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `footballmanager26` |
| Executable | `fm.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `3551340`
- **Xbox / Microsoft Store** — `SportsInteractive.FootballManager26`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `allowBepCfgMan` | `false` | should BepInExConfigManager be downloaded? |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded? False until figure out UniverseLib dependency |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `allowMelonNexus` | `false` | set false until bugs are fixed |
| `bepinexInstalled` | `false` |  |
| `melonInstalled` | `false` |  |
| `isBepinex` | `false` |  |
| `isBepinexPatcher` | `false` |  |
| `isMelon` | `false` |  |
| `isMelonPlugin` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| BepInEx Mod | `footballmanager26-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `footballmanager26-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `footballmanager26-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `footballmanager26-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `footballmanager26-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `footballmanager26-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `footballmanager26-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `footballmanager26-melonloader-config` | high | `{gamePath}/UserData` |
| Assembly DLL Mod | `footballmanager26-assemblydll` | high | `{gamePath}/.` |
| BepInExConfigManager | `footballmanager26-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `footballmanager26-melonprefman` | high | `{gamePath}/Mods` |
| Assets/Resources File | `footballmanager26-assets` | high | `{gamePath}/fm_Data` |
| Root Game Folder | `footballmanager26-root` | high | `{gamePath}` |
| BepInEx Injector | `footballmanager26-bepinex` | low | `{gamePath}` |
| MelonLoader | `footballmanager26-melonloader` | low | `{gamePath}` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| BepInEx | 5.4.23.5 | il2cpp |

## Config & Save Paths

| Type | Path |
|---|---|
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Sports Interactive\\Football Manager 26` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
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
