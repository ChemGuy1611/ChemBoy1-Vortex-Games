# Ghost of Tsushima — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Ghost of Tsushima Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `ghostoftsushima` |
| Executable | `GhostOfTsushima.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/879](https://www.nexusmods.com/site/mods/879) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Ghost_of_Tsushima_Director%27s_Cut](https://www.pcgamingwiki.com/wiki/Ghost_of_Tsushima_Director%27s_Cut) |

## Supported Stores

- **Steam** — `2215430`
- **Epic Games Store** — `cd231060e6744ffb97684767b07d2b77`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| PSARC (Archive) | `ghostoftsushima-psarc` | high | `{gamePath}/cache_pc/psarc` |
| Save Game (Documents) | `ghostoftsushima-save` | high | `userDocsPathString/Ghost of Tsushima DIRECTOR'S CUT/USERID_FOLDER` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ghostoftsushima-psarc` | 25 |
| `ghostoftsushima-save` | 25 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`GhostOfTsushima.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

