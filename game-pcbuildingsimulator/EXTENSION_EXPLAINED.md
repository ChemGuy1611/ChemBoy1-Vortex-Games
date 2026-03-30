# PC Building Simulator — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | PC Building Simulator Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2025-10-15 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `pcbuildingsimulator` |
| Executable | `PCBS.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `621060`
- **Epic Games Store** — `ab277c0995e945d2b2c50c46883627f1`
- **GOG** — `2147483071`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `downloadCfgMan` | `false` | should BepInExConfigManager be downloaded? |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Root Game Folder | `pcbuildingsimulator-root` | high | `{gamePath}` |
| Assembly DLL Mod | `pcbuildingsimulator-assemblydll` | high | `{gamePath}/PCBS_Data/Managed` |
| BepInEx Configuration Manager | `pcbuildingsimulator-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepInEx Mod | `pcbuildingsimulator-bepmods` | high | `{gamePath}/BepinEx/plugins` |
| Save | `pcbuildingsimulator-save` | high | `{gamePath}/Saves` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open BepInEx.cfg
- Open Data Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| BepInEx | 5.4.23.5 | unitymono, x64 |

## Config & Save Paths

| Type | Path |
|---|---|
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\The Irregular Corp\\PC Building Simulator` |
| Save | `Saves` |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Required Extensions** — depends on: `modtype-bepinex`.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex links/copies to game folder
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
