# Metro Exodus — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Metro Exodus Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `metroexodus` |
| Executable | `MetroExodus.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/907](https://www.nexusmods.com/site/mods/907) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Metro_Exodus](https://www.pcgamingwiki.com/wiki/Metro_Exodus) |

## Supported Stores

- **Steam** — `1449560`
- **Epic Games Store** — `153e4dd8955e452aa60ba9ba2d906bf1`
- **GOG** — `1407287452`
- **Xbox / Microsoft Store** — `DeepSilver.ProjectWindfall`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `modioBrowser` | `true` | register the "Browse mod.io" page - browse and install the game's mod.io mods inside Vortex |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| SDK Mod | `metroexodus-sdkmod` | high | `{gamePath}/SDKMods` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `metroexodus-sdkmod` | 25 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Metro Exodus SDK** (`SDK/bin_x64/Exodus_SDK.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- Open Nexus Mods Page
- Open mod.io Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
