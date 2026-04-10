# Sifu — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Sifu Vortex Extension |
| Engine / Structure | UE4 (XBOX Integrated) with .sig files |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `sifu` |
| Executable | `Sifu.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `2138710`
- **Epic Games Store** — `d36336f190094951873ed6138ac208d8`
- **Xbox / Microsoft Store** — `SLOCLAP.Sifu`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS LogicMods (Blueprint) | `sifu-logicmods` | high | `{gamePath}/Sifu/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `sifu-ue4sscombo` | high | `{gamePath}` |
| Root Game Folder | `sifu-root` | high | `{gamePath}` |
| Paks | `sifu-pak` | high | `{gamePath}/Sifu/Content/Paks/~mods` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 35 |
| `sifu-ue4ss-logicscriptcombo` | 25 |
| `sifu-ue4ss-logicmod` | 30 |
| `sifu-ue4ss` | 40 |
| `sifu-ue4ss-scripts` | 45 |
| `sifu-root` | 50 |
| `sifu-config` | 55 |
| `sifu-save` | 60 |
| `sifu-binaries` | 65 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
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
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
