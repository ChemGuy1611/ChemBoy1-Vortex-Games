# Red Faction Guerrilla Re-Mars-tered — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Red Faction Guerrilla Re-Mars-tered Vortex Extension |
| Engine / Structure | 3rd-Party Mod Installer |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `redfactionguerrillaremarstered` |
| Executable | `rfg.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1145](https://www.nexusmods.com/site/mods/1145) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Red_Faction_Guerrilla_Re-Mars-tered](https://www.pcgamingwiki.com/wiki/Red_Faction_Guerrilla_Re-Mars-tered) |

## Supported Stores

- **Steam** — `667720`
- **GOG** — `2029222893`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `redfactionguerrillaremarstered-mod` | high | `{gamePath}/mods` |
| Root Game Folder | `redfactionguerrillaremarstered-root` | high | `{gamePath}` |
| Mod Manager | `redfactionguerrillaremarstered-manager` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `redfactionguerrillaremarstered-manager` | 25 |
| `redfactionguerrillaremarstered-managerlegacy` | 30 |
| `redfactionguerrillaremarstered-mod` | 35 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

