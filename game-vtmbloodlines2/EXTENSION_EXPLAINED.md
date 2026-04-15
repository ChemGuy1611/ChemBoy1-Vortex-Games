# Vampire: The Masquerade - Bloodlines 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Vampire: The Masquerade - Bloodlines 2 Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `vtmbloodlines2` |
| Executable | `Bloodlines2.exe` |

## Supported Stores

- **Steam** — `532790`
- **Epic Games Store** — `Nemesia`
- **GOG** — `1519199034`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `vtmbloodlines2-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `vtmbloodlines2-logicmods` | high | `{gamePath}/Bloodlines2/Content/Paks/LogicMods` |
| UE4SS | `vtmbloodlines2-ue4ss` | high | `{gamePath}/Bloodlines2/Binaries/Win64` |
| UE4SS Script Mod | `vtmbloodlines2-scripts` | high | `{gamePath}/Bloodlines2/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `vtmbloodlines2-ue4ssdll` | high | `{gamePath}/Bloodlines2/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `vtmbloodlines2-pakalt` | low | `{gamePath}/Bloodlines2/Content/Paks` |
| Root Game Folder | `vtmbloodlines2-root` | high | `{gamePath}` |
| Content Folder | `vtmbloodlines2-contentfolder` | high | `{gamePath}/Bloodlines2` |
| Binaries (Engine Injector) | `vtmbloodlines2-binaries` | high | `{gamePath}/Bloodlines2/Binaries/Win64` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `vtmbloodlines2-ue4sscombo` | 25 |
| `vtmbloodlines2-logicmods` | 27 |
| `vtmbloodlines2-ue4ss` | 31 |
| `vtmbloodlines2-sigbypass` | 32 |
| `vtmbloodlines2-scripts` | 33 |
| `vtmbloodlines2-ue4ssdll` | 35 |
| `vtmbloodlines2-root` | 37 |
| `vtmbloodlines2-contentfolder` | 38 |
| `vtmbloodlines2-config` | 39 |
| `vtmbloodlines2-save` | 41 |
| `vtmbloodlines2-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**
- **Demo Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
