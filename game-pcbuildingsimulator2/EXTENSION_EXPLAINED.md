# PC Building Simulator 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | PC Building Simulator 2 Vortex Extension |
| Engine / Structure | Unity BepinEx (IL2CPP) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `pcbuildingsimulator2` |
| Executable | `PCBS2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Epic Games Store** — `0449f415f5404df093b8d67c31940024`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `downloadCfgMan` | `false` | should BepInExConfigManager be downloaded? |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `pcbuildingsimulator2-root` | high | `{gamePath}` |
| Assembly DLL Mod | `pcbuildingsimulator2-assemblydll` | high | `{gamePath}/.` |
| BepInEx Configuration Manager | `pcbuildingsimulator2-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepInEx Mod | `pcbuildingsimulator2-bepmods` | high | `{gamePath}/BepinEx/plugins` |
| Save | `pcbuildingsimulator2-save` | high | `{gamePath}/Saves` |
| PC Build | `pcbuildingsimulator2-pcbuild` | high | `{gamePath}/PCs` |
| Assets/Resources File | `pcbuildingsimulator2-assets` | high | `{gamePath}/PCBS2_Data` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download BepInExConfigManager
- Open BepInEx.cfg
- Open Data Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 6.0.0 | il2cpp, x64 |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Epic Games Publishing\\PCBS2` |
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
