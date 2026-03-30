# XXX — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Craftopia Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2025-XX-XX |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `XXX` |
| Executable | `XXX.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `downloadCfgMan` | `true` | should BepInExConfigManager be downloaded? |
| `bleedingEdge` | `false` | set to true to download bleeding edge builds of BepInEx (IL2CPP only) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Root Game Folder | `XXX-root` | high | `{gamePath}` |
| Assembly DLL Mod | `XXX-assemblydll` | high | `{gamePath}/XXX_Data/Managed` |
| BepInEx Configuration Manager | `XXX-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepInEx Mod | `XXX-bepmods` | high | `{gamePath}/BepinEx/plugins` |
| Assets/Resources File | `XXX-assets` | high | `{gamePath}/XXX_Data` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `XXX-root` | 8 |
| `XXX-bepcfgman` | 9 |
| `XXX-assemblydll` | 25 |
| `XXX-assets` | 27 |

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
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\XXX\\XXX` |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
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
