# Mass Effect: Andromeda — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Mass Effect: Andromeda Vortex Extension |
| Engine / Structure | 3rd Party Mod Manager (Frosty) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `masseffectandromeda` |
| Executable | `MassEffectAndromeda.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/877](https://www.nexusmods.com/site/mods/877) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Mass_Effect:_Andromeda](https://www.pcgamingwiki.com/wiki/Mass_Effect:_Andromeda) |

## Supported Stores

- **Steam** — `1238000`
- **Epic Games Store** — `dvorak`
- **EA** — `Registry`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasArchives` | `true` | toggle for .archive file support |
| `needsKey` | `false` | toggle for encryption key logic |
| `allowSymlinks` | `false` | Frosty handles its own deployment; symlinks not typical |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `true` | enable to show the user a notification with special instructions (specify below) |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `masseffectandromeda-binaries` | high | `{gamePath}` |
| Frosty .fbmod/.archive | `masseffectandromeda-frostymod` | high | `{gamePath}/FrostyModManager/Mods/MassEffectAndromeda` |
| Plugin (FMM) | `masseffectandromeda-plugin` | high | `{gamePath}/FrostyModManager/Plugins` |
| Frosty Mod Manager | `masseffectandromeda-frostymodmanager` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `masseffectandromeda-frostymodmanager` | 25 |
| `masseffectandromeda-frostymod` | 30 |
| `masseffectandromeda-plugin` | 35 |
| `masseffectandromeda-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game** (`frostymodmanager.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download DatapathFix Plugin
- Remove DatapathFix Plugin
- Delete ModData Folder
- Open Frosty manager_config.json
- Set DatapathFix Plugin Enabled
- Set DatapathFix Plugin Disabled
- Open Config Folder
- Open Frosty Mods Folder
- Open PCGamingWiki Page
- Open Nexus Mods Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Symlinks Disabled** — hardlink or copy deployment is used instead of symlinks.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
