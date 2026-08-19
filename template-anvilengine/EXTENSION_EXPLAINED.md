# XXX — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | XXX Vortex Extension |
| Engine / Structure | Anvil Engine - AnvilToolkit/ForgerPatchManager |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `XXX` |
| Executable | `XXX.exe` |

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasAtk` | `true` | true if game supports AnvilToolkit — also gates the Extracted/.forge/.data/loose workflow and the rename dialog |
| `hasForger` | `false` | true if game supports Forger Patch Manager (.forger2 files) — typically older AC games |
| `hasReforger` | `false` | true if game uses ReForger (Xbox package, found through the registry) |
| `hasDlcFolders` | `false` | true if game has dlc_NN folders — adds the DLC mod type, per-DLC .forge mod types and .forge routing |
| `hasResorep` | `false` | true if game uses ResoRep for runtime texture injection |
| `autoCopyResorepDll` | `false` | true to copy the system d3d11.dll automatically instead of leaving the bundled .bat to the user |
| `hasPatchTextures` | `false` | true if game takes loose .dds textures as Forger patches — mutually exclusive with hasResorep |
| `hasSound` | `false` | true if game takes .pck sound bank replacements |
| `hasFixes` | `false` | true if game has a community "fixes" DLL package |
| `hasBinariesType` | `false` | true if game ships a separate "-binaries" mod type alongside "-root" |
| `hasCustomLaunchers` | `false` | true if game has extra launcher executables (Ubisoft Plus / Vulkan) |
| `hasSettingsIni` | `false` | true to add an "Open Settings INI" toolbar button |
| `setupNotification` | `false` | enable to show the user a notification with special instructions on first setup |
| `deployNotification` | `true` | enable the post-deployment notification reminding the user to run the tools |
| `allowSymlinks` | `false` | symlinks can cause issues when repacking with ATK — set to false when hasAtk = true |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Extracted Folder | `XXX-extracted` | high | `{gamePath}` |
| .forge Folder | `XXX-forgefolder` | high | `{gamePath}` |
| .data Folder | `XXX-datafolder` | high | `{gamePath}` |
| Loose Data Files | `XXX-loosedata` | high | `{gamePath}` |
| Forge Replacement | `XXX-forgefile` | high | `{gamePath}` |
| Binaries / Root Folder | `XXX-root` | high | `{gamePath}` |
| AnvilToolkit | `XXX-atk` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `XXX-atk` | 25 |
| `XXX-extracted` | 35 |
| `XXX-forgefolder` | 36 |
| `XXX-datafolder` | 37 |
| `XXX-loosedata` | 38 |
| `XXX-forgefile` | 39 |
| `XXX-root` | 41 |
| `XXX-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`XXX.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Forger Patch Manager | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Symlinks Disabled** — hardlink or copy deployment is used instead of symlinks.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

