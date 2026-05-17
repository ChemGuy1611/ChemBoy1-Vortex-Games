# theHunter: Call of the Wild — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | theHunter: Call of the Wild Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `thehuntercallofthewild` |
| Executable | `theHunterCotW_F.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1432](https://www.nexusmods.com/site/mods/1432) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/The_Hunter%3A_Call_of_the_Wild](https://www.pcgamingwiki.com/wiki/The_Hunter%3A_Call_of_the_Wild) |

## Supported Stores

- **Steam** — `518790`
- **Epic Games Store** — `4f0c34d469bb47b2bcf5b377f47ccfe3`
- **Xbox / Microsoft Store** — `AvalancheStudios.theHunterCalloftheWild-Windows10`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Dropzone Folder | `thehuntercallofthewild-dropzonefolder` | high | `{gamePath}/.` |
| Save Data File | `thehuntercallofthewild-save` | 60 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `thehuntercallofthewild-dropzonefolder` | 25 |
| `thehuntercallofthewild-save` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`theHunterCotW_F.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Save Data Folder
- Open Config Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

