# Indiana Jones and the Great Circle — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Indiana Jones and the Great Circle Vortex Extension |
| Engine / Structure | Basic Game (with Xbox) - Future Mod Injector |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `indianajonesandthegreatcircle` |
| Executable | `TheGreatCircle.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1123](https://www.nexusmods.com/site/mods/1123) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Indiana_Jones_and_the_Great_Circle](https://www.pcgamingwiki.com/wiki/Indiana_Jones_and_the_Great_Circle) |

## Supported Stores

- **Steam** — `2677660`
- **GOG** — `1953447949`
- **Xbox / Microsoft Store** — `BethesdaSoftworks.ProjectRelic`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Sounds | `indianajonesandthegreatcircle-sounds` | high | `{gamePath}/base/sound/soundbanks/pc` |
| Binaries (Engine Injector) | `indianajonesandthegreatcircle-binaries` | high | `{gamePath}` |
| Mod Injector | `indianajonesandthegreatcircle-modinjector` | low | `{gamePath}` |
| Config (Saved Games) | `indianajonesandthegreatcircle-config` | high | `USER_DOCS/Saved Games/MachineGames/TheGreatCircle/base` |
| Save (Steam) | `indianajonesandthegreatcircle-saves` | high | `ROAMINGAPPDATA/GSE Saves/2677660/remote/GAME-SLOT0` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `indianajonesandthegreatcircle-config` | 30 |
| `indianajonesandthegreatcircle-saves` | 35 |
| `indianajonesandthegreatcircle-sounds` | 40 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`TheGreatCircle.exe`)
- **Indiana Jones Mod Injector** (`indianajonesmodmanager.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Saves Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

