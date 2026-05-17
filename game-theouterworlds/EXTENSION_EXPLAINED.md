# The Outer Worlds — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | The Outer Worlds Vortex Extension |
| Engine / Structure | UE4 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `theouterworlds` |
| Executable | `N/A` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/964](https://www.nexusmods.com/site/mods/964) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/The_Outer_Worlds](https://www.pcgamingwiki.com/wiki/The_Outer_Worlds) |

## Supported Stores

- **Steam** — `578650`
- **Epic Games Store** — `Rosemallow`
- **GOG** — `1242541569`
- **Xbox / Microsoft Store** — `PrivateDivision.TheOuterWorldsWindows10`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Paks | `theouterworlds-pak` | low | `{gamePath}/Indiana/Content/Paks/~mods` |
| Root Game Folder | `theouterworlds-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `theouterworlds-binaries` | 40 | `?` |
| Config (LocalAppData) | `theouterworlds-config` | 45 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `theouterworlds-config` | 30 |
| `theouterworlds-root` | 35 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`TheOuterWorlds.exe`)
- **Custom Launch** (`TheOuterWorldsSpacersChoiceEdition.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open Config Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `Unreal Engine Mod Installer`.

