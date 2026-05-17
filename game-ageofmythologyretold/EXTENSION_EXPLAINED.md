# Age of Mythology: Retold — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Age of Mythology: Retold Vortex Extension |
| Engine / Structure | Generic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `ageofmythologyretold` |
| Executable | `N/A` |
| Executable (Xbox) | `AoMRT.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1028](https://www.nexusmods.com/site/mods/1028) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Age_of_Mythology%3A_Retold](https://www.pcgamingwiki.com/wiki/Age_of_Mythology%3A_Retold) |

## Supported Stores

- **Steam** — `1934680`
- **Xbox / Microsoft Store** — `Microsoft.AthensStandardEdition`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Game Data Folder | `ageofmythologyretold-data` | high | `{gamePath}/game` |
| Binaries / Root Game Folder | `ageofmythologyretold-binaries` | high | `{gamePath}` |
| Config (UserGames) | `ageofmythologyretold-config` | high | `util.getVortexPath('home'/USERID_FOLDER/users` |
| Save (UserGames) | `ageofmythologyretold-save` | high | `util.getVortexPath('home'/USERID_FOLDER/savegames` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ageofmythologyretold-save` | 30 |
| `ageofmythologyretold-config` | 35 |
| `ageofmythologyretold-reshade` | 40 |
| `ageofmythologyretold-binaries` | 45 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

