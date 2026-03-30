# A Plague Tale: Requiem — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | A Plague Tale Requiem Vortex Extension |
| Engine / Structure | Basic Game (XBOX Integrated) |
| Author | ChemBoy1 |
| Version | 1.3.1 |
| Date | 2025-11-18 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `aplaguetalerequiem` |
| Executable | `APlagueTaleRequiem_x64.exe` |
| Executable (Xbox) | `APT2_WinStore.x64.Submission.exe` |
| Executable (GOG) | `APlagueTaleRequiem_x64.exe` |

## Supported Stores

- **Steam** — `1182900`
- **GOG** — `1552771812`
- **Xbox / Microsoft Store** — `FocusHomeInteractiveSA.APlagueTaleRequiem-Windows`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Root Folder | `aplaguetalerequiem-root` | high | `{gamePath}` |
| CONFIG_NAME | `CONFIG_ID` | high | `CONFIG_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `aplaguetalerequiem-root` | 25 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`APlagueTaleRequiem_x64.exe`)
- **Custom Launch** (`APT2_WinStore.x64.Submission.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- View Changelog
- Open Downloads Folder

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
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
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
