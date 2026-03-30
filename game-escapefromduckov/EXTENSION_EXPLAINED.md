# Escape from Duckov — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Escape from Duckov Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2025-10-30 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `escapefromduckov` |
| Executable | `Duckov.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `3167020`

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
| BepInEx Mod | `escapefromduckov-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `escapefromduckov-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `escapefromduckov-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `escapefromduckov-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `escapefromduckov-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `escapefromduckov-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `escapefromduckov-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `escapefromduckov-melonloader-config` | high | `{gamePath}/UserData` |
| Assembly DLL Mod | `escapefromduckov-assemblydll` | high | `{gamePath}/.` |
| BepInEx Config Manager | `escapefromduckov-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferences Manager | `escapefromduckov-melonprefman` | high | `{gamePath}/Mods` |
| Assets/Resources File | `escapefromduckov-assets` | high | `{gamePath}/Duckov_Data` |
| Root Game Folder | `escapefromduckov-root` | high | `{gamePath}` |
| BepInEx Injector | `escapefromduckov-bepinex` | low | `{gamePath}` |
| MelonLoader | `escapefromduckov-melonloader` | low | `{gamePath}` |

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
| BepInEx | 5.4.23.5 | mono |

## Config & Save Paths

| Type | Path |
|---|---|
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\TeamSoda\\Duckov` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
