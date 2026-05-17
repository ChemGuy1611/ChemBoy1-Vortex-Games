# Assassin's Creed Mirage — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | AC Mirage Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `assassinscreedmirage` |
| Executable | `ACMirage.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/932](https://www.nexusmods.com/site/mods/932) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_Mirage](https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_Mirage) |

## Supported Stores

- **Steam** — `3035570`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Forger Patch | `assassinscreedmirage-forgerpatch` | high | `{gamePath}/ForgerPatches` |
| AnvilToolKit | `assassinscreedmirage-atk` | low | `{gamePath}` |
| Forger Patch Manager | `assassinscreedmirage-forger` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `assassinscreedmirage-atk` | 25 |
| `assassinscreedmirage-forger` | 35 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **AnvilToolkit** (`anviltoolkit.exe`)
- **Forger Patch Manager** (`Forger.exe`)

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

