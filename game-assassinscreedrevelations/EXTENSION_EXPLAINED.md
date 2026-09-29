# Assassin's Creed Revelations — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Assassin's Creed Revelations Vortex Extension |
| Engine / Structure | Anvil Engine - AnvilToolkit/ForgerPatchManager |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `assassinscreedrevelations` |
| Executable | `ACRSP.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/990](https://www.nexusmods.com/site/mods/990) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed%3A_Revelations](https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed%3A_Revelations) |

## Supported Stores

- **Steam** — `201870`
- **Ubisoft Connect** — `40`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `exeHasGameVersion` | `false` | true if this game's devs DO stamp the real game version into the exe ProductVersion — false for every anvil game checked so far, Denuvo strips it |
| `hasAtk` | `true` | true if game supports AnvilToolkit — also gates the Extracted/.forge/.data/loose workflow and the rename dialog |
| `hasForger` | `false` | true if game supports Forger Patch Manager (.forger2 files) — typically older AC games |
| `hasReforger` | `false` | true if game uses ReForger (Xbox package, found through the registry) |
| `autoDownloadReforger` | `false` | true to fetch+run the ReForger installer automatically during setup. false: the tool is still registered and the "Download ReForger" button still works, just nothing happens without the user clicking it |
| `hasDlcFolders` | `false` | true if game has dlc_NN folders — adds the DLC mod type and installer. Enumerate DLC_FOLDERS to match; .forge routing follows DLC_FOLDERS directly |
| `hasResorep` | `false` | true if game uses ResoRep for runtime texture injection |
| `autoCopyResorepDll` | `false` | true to copy the system d3d11.dll into the game folder automatically instead of leaving the bundled .bat to the user. The copy is not a managed mod file, so purging does not remove it |
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
| Extracted Folder | `assassinscreedrevelations-extracted` | high | `{gamePath}` |
| .forge Folder | `assassinscreedrevelations-forgefolder` | high | `{gamePath}` |
| .data Folder | `assassinscreedrevelations-datafolder` | high | `{gamePath}` |
| Loose Data Files | `assassinscreedrevelations-loosedata` | high | `{gamePath}` |
| Forge Replacement | `assassinscreedrevelations-forgefile` | high | `{gamePath}` |
| Binaries / Root Folder | `assassinscreedrevelations-root` | high | `{gamePath}` |
| AnvilToolkit | `assassinscreedrevelations-atk` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `assassinscreedrevelations-atk` | 25 |
| `assassinscreedrevelations-extracted` | 35 |
| `assassinscreedrevelations-forgefolder` | 36 |
| `assassinscreedrevelations-datafolder` | 37 |
| `assassinscreedrevelations-loosedata` | 38 |
| `assassinscreedrevelations-forgefile` | 39 |
| `assassinscreedrevelations-root` | 41 |
| `assassinscreedrevelations-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`ACRSP.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

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
- **Symlinks Disabled** — hardlink or copy deployment is used instead of symlinks.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
