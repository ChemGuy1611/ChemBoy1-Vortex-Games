# System Shock 2: 25th Anniversary Remaster — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | System Shock 2 (Classic AND 25th Anniversary Remaster) Vortex Extension |
| Engine / Structure | Basic game w/ mods folder |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `systemshock225thanniversaryremaster` |
| Executable | `N/A` |
| Executable (GOG) | `hathor_Shipping_Playfab_Galaxy_x64.exe` |

## Supported Stores

- **Steam** — `866570`
- **Epic Games Store** — `2feb2f328922458e9f698f620fbddc13`
- **GOG** — `1448370350`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod .kpf | `systemshock225thanniversaryremaster-kpfmod` | high | `{gamePath}/mods` |
| Converted Legacy Mod | `systemshock225thanniversaryremaster-convertedlegacy` | high | `{gamePath}/mods` |
| Binaries / Root Folder | `systemshock225thanniversaryremaster-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `systemshock225thanniversaryremaster-kpfmod` | 25 |
| `systemshock225thanniversaryremaster-convertedlegacy` | 27 |
| `systemshock225thanniversaryremaster-rootfolder` | 29 |
| `systemshock225thanniversaryremaster-root` | 31 |
| `systemshock2-classicmod` | 33 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config/Save Folder
- View Changelog
- Open Downloads Folder
- Download and/or Run SS2Tool
- View Changelog
- Open Downloads Folder

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

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
