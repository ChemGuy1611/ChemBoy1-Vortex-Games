# Until Dawn — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Until Dawn Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `untildawn` |
| Executable | `Windows/Bates.exe` |

## Supported Stores

- **Steam** — `2172010`
- **Epic Games Store** — `05153d489e6843a1b5b53363280cb141`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Scripts | `SCRIPTS_ID` | high | `{gamePath}/SCRIPTS_PATH` |
| UE4SS LogicMods (Blueprint) | `untildawn-logicmods` | high | `{gamePath}/Windows/Bates/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `untildawn-ue4sscombo` | high | `{gamePath}/Windows` |
| Config (My Games) | `untildawn-config` | high | `CONFIG_PATH` |
| Saves (My Games) | `untildawn-save` | high | `SAVE_PATH/USERID_FOLDER` |
| Root Game Folder | `untildawn-root` | high | `{gamePath}/Windows` |
| UE5 Paks | `untildawn-ue5` | high | `{gamePath}/Windows/Bates/Content/Paks/~mods` |
| UE5 Paks (no "~mods") | `untildawn-pakalt` | high | `{gamePath}/Windows/Bates/Content/Paks` |
| Binaries (Engine Injector) | `untildawn-binaries` | high | `{gamePath}/Windows/Bates/Binaries/Win64` |
| UE4SS | `UE4SS_ID` | low | `{gamePath}/Windows/Bates/Binaries/Win64` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 35 |
| `untildawn-ue4ss-logicscriptcombo` | 25 |
| `untildawn-ue4ss-logicmod` | 30 |
| `untildawn-ue4ss` | 40 |
| `untildawn-ue4ss-scripts` | 45 |
| `untildawn-root` | 50 |

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
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

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
