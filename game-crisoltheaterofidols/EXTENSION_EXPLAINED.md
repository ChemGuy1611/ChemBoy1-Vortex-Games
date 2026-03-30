# Crisol: Theater of Idols — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Crisol: Theater of Idols Vortex Extension |
| Engine / Structure | Unreal Engine Game |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 2026-02-13 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `crisoltheaterofidols` |
| Executable | `CrisolTheaterOfIdols.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `CrisolTheaterOfIdols.exe` |
| Executable (Demo) | `CrisolTheaterOfIdolsDemo.exe` |

## Supported Stores

- **Steam** — `1790930`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `hasXbox` | `false` | toggle for Xbox version logic. |
| `multiExe` | `false` | DEMO NO LONGER AVAILABLE |
| `hasModKit` | `false` | toggle for UE ModKit mod support |
| `preferHardlinks` | `true` | set true to perform partition checks when IO-STORE=false for Config/Save modtypes so that hardlinks available to more users |
| `autoDownloadUe4ss` | `false` | toggle for auto downloading UE4SS |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `PAKMOD_LOADORDER` | `true` | set to false if you don't want loadOrder. If must be in "Paks" root, disable loadOrder. |
| `SYM_LINKS` | `true` |  |
| `CHECK_CONFIG` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_SAVE` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| UE4SSCOMBO_NAME | `UE4SSCOMBO_ID` | high | `{gamePath}` |
| LOGICMODS_NAME | `LOGICMODS_ID` | high | `{gamePath}/LOGICMODS_PATH` |
| PAK_ALT_NAME | `crisoltheaterofidols-pakalt` | high | `{gamePath}/CRToiPrototype/Content/Paks` |
| Root Game Folder | `crisoltheaterofidols-root` | high | `{gamePath}` |
| Root Sub-Folders | `crisoltheaterofidols-rootsubfolders` | high | `{gamePath}/CRToiPrototype` |

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| UE4SS | — | — |

## Special Features

- **Load Order** — mods are assigned numbered folder names or sorted based on their position in the load order.
- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
