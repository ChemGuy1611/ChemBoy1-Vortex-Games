# Windrose — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Windrose Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |

### Notes

- User selects where to install pak mods (SP or MP)
- Dedicated Server registered as a separate game
- Had to move pak modType paths up to EPIC_CODE_NAME as the game will try to load ANY JSON (deployment.json) files within the Content folder (never seen this before)

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `windrose` |
| Executable | `Windrose.exe` |
| Executable (GOG) | `Windrose.exe` |
| Executable (Demo) | `Windrose.exe` |

## Supported Stores

- **Steam** — `3041230`
- **Epic Games Store** — `d08157fbe22d45fcba452680857ac58d`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `multiExe` | `false` | toggle for multiple executables (Epic/GOG/Demo don't match Steam) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Server Pak Mod | `windrose-serverpaks` | high | `{gamePath}/R5/Builds/WindowsServer/R5` |
| UE4SS Script-LogicMod Combo | `windrose-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `windrose-logicmods` | high | `{gamePath}/R5` |
| PAK_ALT_NAME | `PAK_ALT_ID` | high | `{gamePath}/PAK_ALT_PATH` |
| ROOT_NAME | `ROOT_ID` | high | `{gamePath}` |
| ROOTSUB_NAME | `ROOTSUB_ID` | high | `{gamePath}/ROOTSUB_PATH` |
| BINARIES_NAME | `BINARIES_ID` | high | `{gamePath}/BINARIES_PATH` |
| UE4SS | `windrose-ue4ss` | low | `{gamePath}/BINARIES_PATH` |
| windrose-scripts | `windrose-scripts` | low | `{gamePath}/SCRIPTS_PATH` |
| UE4SS DLL Mod | `windrose-ue4ssdll` | low | `{gamePath}/DLL_PATH` |

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
