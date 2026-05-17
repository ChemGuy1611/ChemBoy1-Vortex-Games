# Assassin's Creed Valhalla — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | AC Valhalla Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `assassinscreedvalhalla` |
| Executable | `ACValhalla.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/931](https://www.nexusmods.com/site/mods/931) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_Valhalla](https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_Valhalla) |

## Supported Stores

- **Steam** — `2208920`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Forger Patch | `assassinscreedvalhalla-forgerpatch` | high | `{gamePath}/ForgerPatches` |
| AnvilToolKit | `assassinscreedvalhalla-ATK` | low | `{gamePath}` |
| Forger Patch Manager | `assassinscreedvalhalla-forger` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `assassinscreedvalhalla-forger` | 25 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **AnvilToolkit** (`AnvilToolkit.exe`)
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

