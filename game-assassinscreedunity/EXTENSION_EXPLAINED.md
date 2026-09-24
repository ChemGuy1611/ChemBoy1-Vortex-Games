# Assassin's Creed Unity — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Assassin's Creed Unity Vortex Extension |
| Engine / Structure | Anvil Engine - AnvilToolkit/ForgerPatchManager |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `assassinscreedunity` |
| Executable | `ACU.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/878](https://www.nexusmods.com/site/mods/878) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_Unity](https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_Unity) |

## Supported Stores

- **Steam** — `289650`
- **Epic Games Store** — `Amberjack`
- **Ubisoft Connect** — `720`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasAtk` | `true` | true if game supports AnvilToolkit — also gates the Extracted/.forge/.data/loose workflow and the rename dialog |
| `hasForger` | `false` | true if game supports Forger Patch Manager (.forger2 files) — typically older AC games |
| `hasReforger` | `false` | true if game uses ReForger (Xbox package, found through the registry) |
| `hasDlcFolders` | `true` | true if game has dlc_NN folders — adds the DLC mod type and installer. Enumerate DLC_FOLDERS to match; .forge routing follows DLC_FOLDERS directly |
| `hasResorep` | `true` | true if game uses ResoRep for runtime texture injection |
| `autoCopyResorepDll` | `false` | true to copy the system d3d11.dll into the game folder automatically instead of leaving the bundled .bat to the user. The copy is not a managed mod file, so purging does not remove it |
| `hasPatchTextures` | `false` | true if game takes loose .dds textures as Forger patches — mutually exclusive with hasResorep |
| `hasSound` | `false` | true if game takes .pck sound bank replacements |
| `hasFixes` | `true` | true if game has a community "fixes" DLL package |
| `hasBinariesType` | `true` | true if game ships a separate "-binaries" mod type alongside "-root" |
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
| Extracted Folder | `assassinscreedunity-extractedfolder` | high | `{gamePath}` |
| .forge Folder | `assassinscreedunity-forgefolder` | high | `{gamePath}` |
| .data Folder | `assassinscreedunity-datafolder` | high | `{gamePath}` |
| Loose Data Files | `assassinscreedunity-loosedata` | high | `{gamePath}` |
| Forge Replacement | `assassinscreedunity-forgefile` | high | `{gamePath}` |
| Binaries / Root Folder | `assassinscreedunity-root` | high | `{gamePath}` |
| AnvilToolkit | `assassinscreedunity-atk` | low | `{gamePath}` |
| DLC Folder | `assassinscreedunity-dlcfolder` | high | `{gamePath}` |
| Fixes | `assassinscreedunity-fixes` | low | `{gamePath}` |
| Binaries / Root Folder | `assassinscreedunity-binaries` | high | `{gamePath}` |
| ResoRep Textures | `assassinscreedunity-resoreptextures` | high | `{gamePath}/ResoRep/modded` |
| ResoRep DLL | `assassinscreedunity-resorep` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `assassinscreedunity-atk` | 25 |
| `assassinscreedunity-resorep` | 27 |
| `assassinscreedunity-resoreptextures` | 30 |
| `assassinscreedunity-fixes` | 33 |
| `assassinscreedunity-dlcfolder` | 34 |
| `assassinscreedunity-extractedfolder` | 35 |
| `assassinscreedunity-forgefolder` | 36 |
| `assassinscreedunity-datafolder` | 37 |
| `assassinscreedunity-loosedata` | 38 |
| `assassinscreedunity-forgefile` | 39 |
| `assassinscreedunity-root` | 41 |
| `assassinscreedunity-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`ACU.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Force Copy System d3d11.dll (ResoRep)
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
