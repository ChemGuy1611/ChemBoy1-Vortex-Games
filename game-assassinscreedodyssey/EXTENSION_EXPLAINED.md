# Assassin's Creed Odyssey — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | AC Odyssey Vortex Extension |
| Engine / Structure | Ubisoft AnvilToolkit |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `assassinscreedodyssey` |
| Executable | `ACOdyssey.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/910](https://www.nexusmods.com/site/mods/910) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_Odyssey](https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_Odyssey) |

## Supported Stores

- **Steam** — `812140`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Game Folder | `assassinscreedodyssey-binaries` | high | `{gamePath}` |
| Forger Patch | `assassinscreedodyssey-forgerpatch` | high | `{gamePath}/ForgerPatches` |
| Resorep Textures (Documents) | `assassinscreedodyssey-textures` | high | `userDocsPathString/Resorep/modded` |
| Resorep Textures (Game Folder) | `assassinscreedodyssey-texturesgamefolder` | high | `{gamePath}/Resorep` |
| AnvilToolKit | `assassinscreedodyssey-ATK` | low | `{gamePath}` |
| Forger Patch Manager | `assassinscreedodyssey-forger` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `assassinscreedodyssey-forger` | 25 |
| `assassinscreedodyssey-atk` | 25 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **AnvilToolkit** (`anviltoolkit.exe`)
- **Forger Patch Manager** (`forger.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

