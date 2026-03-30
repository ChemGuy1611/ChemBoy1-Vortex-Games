# Blue Prince — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Blue Prince Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid |
| Author | ChemBoy1 |
| Version | 0.1.1 |
| Date | 2026-03-15 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `blueprince` |
| Executable | `BLUE PRINCE.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `1569580`
- **Xbox / Microsoft Store** — `RawFury.BluePrince`

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
| BepInEx Mod | `blueprince-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `blueprince-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `blueprince-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `blueprince-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `blueprince-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `blueprince-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `blueprince-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `blueprince-melonloader-config` | high | `{gamePath}/UserData` |
| Assembly DLL Mod | `blueprince-assemblydll` | high | `{gamePath}/.` |
| BepInExConfigManager | `blueprince-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `blueprince-melonprefman` | high | `{gamePath}/Mods` |
| Assets/Resources File | `blueprince-assets` | high | `{gamePath}/BLUE PRINCE_Data` |
| Root Game Folder | `blueprince-root` | high | `{gamePath}` |
| BepInEx Injector | `blueprince-bepinex` | low | `{gamePath}` |
| MelonLoader | `blueprince-melonloader` | low | `{gamePath}` |

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
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Dogubomb\\BLUE PRINCE` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
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
