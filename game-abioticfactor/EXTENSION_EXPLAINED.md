# Abiotic Factor — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Abiotic Factor Vortex Extension |
| Engine / Structure | UE5 (Xbox-Integrated) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `abioticfactor` |
| Executable | `AbioticFactor.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `427410`
- **Xbox / Microsoft Store** — `PlayStack.AbioticFactor`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `abioticfactor-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `abioticfactor-logicmods` | high | `{gamePath}/AbioticFactor/Content/Paks/LogicMods` |
| Root Game Folder | `abioticfactor-root` | high | `{gamePath}` |
| Content Folder | `abioticfactor-contentfolder` | high | `{gamePath}/AbioticFactor` |
| UE5 Paks (no "~mods") | `abioticfactor-pakalt` | high | `{gamePath}/AbioticFactor/Content/Paks` |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open UE4SS Settings INI
- Open UE4SS mods.txt
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

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
