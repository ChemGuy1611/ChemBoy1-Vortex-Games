# Silent Hill 2 (2024) — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Silent Hill 2 Remake Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |
| Version | 0.3.1 |
| Date | 2026-02-07 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `silenthill2` |
| Executable | `SHProto.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `2124490`
- **Epic Games Store** — `c4dc308a1b69492aba4d47f7feaa1083`
- **GOG** — `2051029707`
- **Xbox / Microsoft Store** — `KonamiDigitalEntertainmen.SILENTHILL2`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SS Scripts | `SCRIPTS_ID` | high | `{gamePath}/SCRIPTS_PATH` |
| DLL_NAME | `DLL_ID` | high | `{gamePath}/DLL_PATH` |
| UE4SS LogicMods (Blueprint) | `silenthill2-logicmods` | high | `{gamePath}/SHProto/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `silenthill2-ue4sscombo` | high | `{gamePath}` |
| Config (LocalAppData) | `silenthill2-config` | high | `CONFIG_PATH` |
| Saves (LocalAppData) | `silenthill2-save` | high | `SAVE_PATH/USERID_FOLDER` |
| Root Game Folder | `silenthill2-root` | high | `{gamePath}` |
| UE5 Paks | `silenthill2-ue5` | high | `{gamePath}/SHProto/Content/Paks/~mods` |
| UE5 Paks (no "~mods") | `silenthill2-pakalt` | high | `{gamePath}/SHProto/Content/Paks` |
| Binaries (Engine Injector) | `silenthill2-binaries` | high | `{gamePath}/SHProto/Binaries/Win64` |
| UE4SS | `UE4SS_ID` | low | `{gamePath}/SHProto/Binaries/Win64` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| UE4SS | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
