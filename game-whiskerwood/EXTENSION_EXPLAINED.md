# Whiskerwood — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Whiskerwood Vortex Extension |
| Engine / Structure | Unreal Engine Game (Unified) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `whiskerwood` |
| Executable | `Whiskerwood.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Whiskerwood.exe` |
| Executable (Demo) | `Whiskerwood.exe` |

## Supported Stores

- **Steam** — `2489330`
- **Epic Games Store** — `55ddada911724046adcf29eb5a706b2e`
- **GOG** — `1924240273`
- **Xbox / Microsoft Store** — `HoodedHorse.WhiskerwoodNew`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `true` | toggle for Xbox version logic (to unify templates) |
| `multiExe` | `false` | toggle for multiple executables (to unify templates) |
| `SIGBYPASS_REQUIRED` | `false` | set true if there are .sig files in the Paks folder |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SSCOMBO_NAME | `UE4SSCOMBO_ID` | high | `{gamePath}` |
| LOGICMODS_NAME | `LOGICMODS_ID` | high | `{gamePath}/LOGICMODS_PATH` |
| Paks (no "~mods") | `whiskerwood-pakalt` | high | `{gamePath}/Whiskerwood/Content/Paks` |
| Root Game Folder | `whiskerwood-root` | high | `{gamePath}` |
| Root Sub-Folders | `whiskerwood-rootsubfolders` | high | `{gamePath}/Whiskerwood` |

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
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
