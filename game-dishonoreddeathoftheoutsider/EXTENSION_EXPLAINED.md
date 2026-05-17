# Dishonored: Death of the Outsider — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Dishonored: Death of the Outsider Vortex Extension |
| Engine / Structure | Void Installer |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `dishonoreddeathoftheoutsider` |
| Executable | `Dishonored_DO.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1532](https://www.nexusmods.com/site/mods/1532) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Dishonored%3A_Death_of_the_Outsider](https://www.pcgamingwiki.com/wiki/Dishonored%3A_Death_of_the_Outsider) |

## Supported Stores

- **Steam** — `614570`
- **Epic Games Store** — `2fb8273dcf6f41e4899c0c881e047053`
- **GOG** — `1707860700`
- **Xbox / Microsoft Store** — `BethesdaSoftworks.DishonoredDeathoftheOutsiderPC`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Void Mod | `dishonoreddeathoftheoutsider-voidmod` | high | `{gamePath}/Void Installer/Mods` |
| Void Installer | `dishonoreddeathoftheoutsider-voidinstaller` | low | `{gamePath}/.` |
| Root Game Folder | `dishonoreddeathoftheoutsider-root` | high | `{gamePath}` |
| Video Mod | `dishonoreddeathoftheoutsider-video` | high | `{gamePath}/base/video` |
| Void Explorer | `dishonoreddeathoftheoutsider-voidexplorer` | low | `{gamePath}/.` |
| Save Game | `dishonoreddeathoftheoutsider-save` | 62 | `?` |
| Config | `dishonoreddeathoftheoutsider-config` | 63 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `dishonoreddeathoftheoutsider-voidinstaller` | 25 |
| `dishonoreddeathoftheoutsider-voidexplorer` | 27 |
| `dishonoreddeathoftheoutsider-voidmod` | 29 |
| `dishonoreddeathoftheoutsider-root` | 31 |
| `dishonoreddeathoftheoutsider-video` | 33 |
| `dishonoreddeathoftheoutsider-save` | 35 |
| `dishonoreddeathoftheoutsider-config` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Dishonored_DO.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

