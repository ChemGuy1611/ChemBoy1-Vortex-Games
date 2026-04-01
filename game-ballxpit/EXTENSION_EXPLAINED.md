# BALL x PIT — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | BALL x PIT Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `ballxpit` |
| Executable | `Balls.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `2062430`
- **Xbox / Microsoft Store** — `DevolverDigital.BallxPit`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowBepCfgMan` | `false` | should BepInExConfigManager be downloaded? |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded? False until figure out UniverseLib dependency |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `allowMelonNexus` | `false` | set false until bugs are fixed |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BepInEx Mod | `ballxpit-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `ballxpit-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `ballxpit-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `ballxpit-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `ballxpit-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `ballxpit-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `ballxpit-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `ballxpit-melonloader-config` | high | `{gamePath}/UserData` |
| Assembly DLL Mod | `ballxpit-assemblydll` | high | `{gamePath}/.` |
| BepInExConfigManager | `ballxpit-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `ballxpit-melonprefman` | high | `{gamePath}/Mods` |
| Assets/Resources File | `ballxpit-assets` | high | `{gamePath}/Balls_Data` |
| Root Game Folder | `ballxpit-root` | high | `{gamePath}` |
| BepInEx Injector | `ballxpit-bepinex` | low | `{gamePath}` |
| MelonLoader | `ballxpit-melonloader` | low | `{gamePath}` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 5.4.23.5 | il2cpp |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Kenny Sun\\BALL x PIT` |

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
