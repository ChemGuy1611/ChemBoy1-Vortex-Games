# CloverPit — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | CloverPit Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid (Mono & x64) |
| Author | ChemBoy1 |
| Version | 0.1.2 |
| Date | 2026-03-30 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `cloverpit` |
| Executable | `CloverPit.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `3314790`
- **Xbox / Microsoft Store** — `FutureFriendsGames.CloverPit`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
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
| BepInEx Mod | `cloverpit-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `cloverpit-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `cloverpit-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `cloverpit-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `cloverpit-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Plugins | `cloverpit-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Mods | `cloverpit-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Config | `cloverpit-melonloader-config` | high | `{gamePath}/UserData` |
| Assembly DLL Mod | `cloverpit-assemblydll` | high | `{gamePath}/CloverPit_Data/Managed` |
| BepInEx Configuration Manager | `cloverpit-bepcfgman` | high | `{gamePath}/Bepinex` |
| Assets/Resources File | `cloverpit-assets` | high | `{gamePath}/CloverPit_Data` |
| Root Game Folder | `cloverpit-root` | high | `{gamePath}` |
| BepInEx Injector | `cloverpit-bepinex` | low | `{gamePath}` |
| MelonLoader | `cloverpit-melonloader` | low | `{gamePath}` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| BepInEx | 5.4.23.5 | mono |

## Config & Save Paths

| Type | Path |
|---|---|
| Save | `SaveData/GameData` |

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
