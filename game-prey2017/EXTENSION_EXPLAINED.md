# Prey (2017) — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Prey Vortex Extension (Alt version) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `prey2017` |
| Executable | `N/A` |
| Executable (Xbox) | `Binaries/Danielle/Gaming.Desktop.x64/Release/Prey.exe` |
| Executable (GOG) | `Binaries/Danielle/x64-GOG/Release/Prey.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/711](https://www.nexusmods.com/site/mods/711) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Prey_%282017%29](https://www.pcgamingwiki.com/wiki/Prey_%282017%29) |

## Supported Stores

- **Steam** — `480490`
- **Epic Games Store** — `52d88e9a6df248da913c8e99f1e4c526`
- **GOG** — `1158493447`
- **Xbox / Microsoft Store** — `BethesdaSoftworks.LiluDallas-Multipass`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `prey2017-root` | 25 | `?` |
| Binaries (Engine Injector) | `prey2017-binaries` | 30 | `?` |
| Chairloader Mod | `prey2017-chairloadermod` | 35 | `?` |
| Chairloader Legacy Mod | `prey2017-chairloadermodlegacy` | 35 | `?` |
| Prey Interface Customizer | `prey2017-pric` | 70 | `?` |
| Chairloader | `prey2017-chairloader` | 75 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `prey2017-pric` | 25 |
| `prey2017-chairloader` | 30 |
| `prey2017-chairmodzip` | 35 |
| `prey2017-root` | 40 |
| `prey2017-binaries` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Prey Interface Customizer** (`preyinterfacecustomizergui.exe`)
- **Chairloader** (`chairmanager.exe`)

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

