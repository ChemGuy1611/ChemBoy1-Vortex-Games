# Witchfire — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Witchfire Vortex Extension |
| Engine / Structure | UE4 |
| Author | ChemBoy1 |
| Version | 0.4.0 |
| Date | 2026-01-31 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `witchfire` |
| Executable | `Witchfire.exe` |

## Supported Stores

- **Steam** — `3156770`
- **Epic Games Store** — `8764f82381f5436f99e97172df06af35`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries (Engine Injector) | `witchfire-binaries` | high | `{gamePath}/Witchfire/Binaries/Win64` |
| Config (LocalAppData) | `witchfire-config` | high | `{localAppData}/Witchfire/Saved/Config/WindowsNoEditor` |
| Save Game | `witchfire-save` | high | `{localAppData}/Witchfire/Saved/SaveGames` |
| Paks | `witchfire-pak` | low | `{gamePath}/Witchfire/Content/Paks/~mods` |
| Root Game Folder | `witchfire-root` | high | `{gamePath}` |
| UE4SS Script Mod | `witchfire-scripts` | high | `{gamePath}/Witchfire/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `witchfire-ue4ssdll` | high | `{gamePath}/Witchfire/Binaries/Win64/ue4ss/Mods` |
| UE4SS Script-LogicMod Combo | `witchfire-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `witchfire-logicmods` | high | `{gamePath}/Witchfire/Content/Paks` |
| UE4SS | `witchfire-ue4ss` | low | `{gamePath}/Witchfire/Binaries/Win64` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `witchfire-ue4sscombo` | 21 |
| `witchfire-logicmods` | 23 |
| `witchfire-ue4ss` | 27 |
| `witchfire-scripts` | 29 |
| `witchfire-ue4ssdll` | 31 |
| `witchfire-config` | 33 |
| `witchfire-root` | 35 |
| `witchfire-save` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS
- Open UE4SS Settings INI
- Open UE4SS mods.json
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| UE4SS | — | — |

## Config & Save Paths

| Type | Path |
|---|---|
| Config | `Witchfire/Saved/Config/WindowsNoEditor` |
| Save | `Witchfire/Saved/SaveGames` |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `Unreal Engine Mod Installer`.

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
