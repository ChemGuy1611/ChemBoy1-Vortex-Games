# Metaphor: ReFantazio — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Metaphor: ReFantazio Vortex Extension |
| Engine / Structure | 3rd-Party Mod Installer (Reloaded-II) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `metaphorrefantazio` |
| Executable | `METAPHOR.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `2679460`
- **Xbox / Microsoft Store** — `SEGAofAmericaInc.Pae22b02y`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Reloaded Mod | `metaphorrefantazio-reloadedmod` | high | `{gamePath}/Reloaded/Mods` |
| MRFPC Mod Loader | `metaphorrefantazio-reloadedmodloader` | low | `{gamePath}/Reloaded/Mods/MRFPC_Mod_Loader` |
| Reloaded Mod Manager | `metaphorrefantazio-reloadedmanager` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `metaphorrefantazio-reloadedmanager` | 25 |
| `metaphorrefantazio-reloadedmodloader` | 30 |
| `metaphorrefantazio-reloadedmod` | 35 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Reloaded Mod Manager

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Reloaded-II | — | — |

## Special Features

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
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
