# Ghost Recon Breakpoint — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Ghost Recon Breakpoint Vortex Extension |
| Engine / Structure | Anvil Engine - AnvilToolkit/ForgerPatchManager |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `ghostreconbreakpoint` |
| Executable | `GRB.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/972](https://www.nexusmods.com/site/mods/972) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Tom_Clancy%27s_Ghost_Recon_Breakpoint](https://www.pcgamingwiki.com/wiki/Tom_Clancy%27s_Ghost_Recon_Breakpoint) |

## Supported Stores

- **Steam** — `2231380`
- **Epic Games Store** — `Saffron`
- **Ubisoft Connect** — `11903`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasAtk` | `true` | true if game supports AnvilToolkit — also gates the Extracted/.forge/.data/loose workflow and the rename dialog |
| `hasForger` | `false` | true if game supports Forger Patch Manager (.forger2 files) — typically older AC games |
| `hasReforger` | `false` | true if game uses ReForger (Xbox package, found through the registry) |
| `hasDlcFolders` | `true` | true if game has dlc_NN folders — adds the DLC mod type and installer. Enumerate DLC_FOLDERS to match; .forge routing follows DLC_FOLDERS directly |
| `hasResorep` | `false` | true if game uses ResoRep for runtime texture injection |
| `autoCopyResorepDll` | `false` | true to copy the system d3d11.dll into the game folder automatically instead of leaving the bundled .bat to the user. The copy is not a managed mod file, so purging does not remove it |
| `hasPatchTextures` | `false` | true if game takes loose .dds textures as Forger patches — mutually exclusive with hasResorep |
| `hasSound` | `true` | true if game takes .pck sound bank replacements |
| `hasFixes` | `false` | true if game has a community "fixes" DLL package |
| `hasBinariesType` | `true` | true if game ships a separate "-binaries" mod type alongside "-root" |
| `hasCustomLaunchers` | `true` | true if game has extra launcher executables (Ubisoft Plus / Vulkan) |
| `hasSettingsIni` | `true` | true to add an "Open Settings INI" toolbar button |
| `setupNotification` | `false` | enable to show the user a notification with special instructions on first setup |
| `deployNotification` | `true` | enable the post-deployment notification reminding the user to run the tools |
| `allowSymlinks` | `false` | symlinks can cause issues when repacking with ATK — set to false when hasAtk = true |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Extracted Folder | `ghostreconbreakpoint-extracted` | high | `{gamePath}` |
| .forge Folder | `ghostreconbreakpoint-forgefolder` | high | `{gamePath}` |
| .data Folder | `ghostreconbreakpoint-datafolder` | high | `{gamePath}` |
| Loose Data Files | `ghostreconbreakpoint-loosedata` | high | `{gamePath}` |
| Forge Replacement | `ghostreconbreakpoint-forgefile` | high | `{gamePath}` |
| Binaries / Root Folder | `ghostreconbreakpoint-root` | high | `{gamePath}` |
| AnvilToolkit | `ghostreconbreakpoint-atk` | low | `{gamePath}` |
| DLC Folder | `ghostreconbreakpoint-dlcfolder` | high | `{gamePath}` |
| Sound Data .pck | `ghostreconbreakpoint-sound` | high | `{gamePath}/sounddata/pc` |
| Binaries / Root Folder | `ghostreconbreakpoint-binaries` | high | `{gamePath}` |
| Individual Buildtables | `ghostreconbreakpoint-buildtable` | high | `{gamePath}/Extracted/DataPC_patch_01.forge/Extracted/23_-_TEAMMATE_Template.data` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ghostreconbreakpoint-atk` | 25 |
| `ghostreconbreakpoint-buildtable` | 31 |
| `ghostreconbreakpoint-sound` | 32 |
| `ghostreconbreakpoint-dlcfolder` | 34 |
| `ghostreconbreakpoint-extracted` | 35 |
| `ghostreconbreakpoint-forgefolder` | 36 |
| `ghostreconbreakpoint-datafolder` | 37 |
| `ghostreconbreakpoint-loosedata` | 38 |
| `ghostreconbreakpoint-forgefile` | 39 |
| `ghostreconbreakpoint-root` | 41 |
| `ghostreconbreakpoint-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`GRB.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Settings INI
- Open PCGamingWiki Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| AnvilToolkit | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Symlinks Disabled** — hardlink or copy deployment is used instead of symlinks.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
