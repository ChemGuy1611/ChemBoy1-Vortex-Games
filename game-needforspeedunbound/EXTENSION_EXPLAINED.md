# Need for Speed Unbound — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Need for Speed Unbound Vortex Extension |
| Engine / Structure | Frostbite Engine - Frosty Mod Manager |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `needforspeedunbound` |
| Executable | `NeedForSpeedUnbound.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1993](https://www.nexusmods.com/site/mods/1993) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Need_for_Speed_Unbound](https://www.pcgamingwiki.com/wiki/Need_for_Speed_Unbound) |

## Supported Stores

- **Steam** — `1846380`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasArchives` | `false` | toggle for .archive file support |
| `needsKey` | `true` | toggle for encryption key logic |
| `allowSymlinks` | `false` | Frosty handles its own deployment; symlinks not typical |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `true` | enable to show the user a notification with special instructions (specify below) |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `needforspeedunbound-root` | high | `{gamePath}` |
| Frosty Mod | `needforspeedunbound-frostymod` | high | `{gamePath}/FrostyModManager/Mods/NeedForSpeedUnbound` |
| Plugin (FMM) | `needforspeedunbound-plugin` | high | `{gamePath}/FrostyModManager/Plugins` |
| Frosty Mod Manager | `needforspeedunbound-frostymodmanager` | low | `{gamePath}` |
| Key (FMM) | `needforspeedunbound-key` | low | `{gamePath}/FrostyModManager` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `needforspeedunbound-frostymodmanager` | 25 |
| `needforspeedunbound-frostymod` | 30 |
| `needforspeedunbound-plugin` | 35 |
| `needforspeedunbound-key` | 40 |
| `needforspeedunbound-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game** (`frostymodmanager.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download ${PATCH_NAME}
- Remove ${PATCH_NAME}
- Delete ModData Folder
- Open Frosty ${FROSTY_CONFIG_FILE}
- Set ${PATCH_NAME} Enabled
- Set ${PATCH_NAME} Disabled
- Open Config Folder
- Open Frosty Mods Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `Need For Speed(TM) Unbound/settings` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Symlinks Disabled** — hardlink or copy deployment is used instead of symlinks.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

