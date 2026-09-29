# Assassin's Creed II — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Assassin's Creed II Vortex Extension |
| Engine / Structure | Anvil Engine - AnvilToolkit/ForgerPatchManager |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `assassinscreedii` |
| Executable | `AssassinsCreedIIGame.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/977](https://www.nexusmods.com/site/mods/977) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_II](https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_II) |

## Supported Stores

- **Steam** — `33230`
- **Epic Games Store** — `d0ae8ca1b5c8421ca6ab892353d3204d`
- **Ubisoft Connect** — `4`

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
| Extracted Folder | `assassinscreedii-extracted` | high | `{gamePath}` |
| .forge Folder | `assassinscreedii-forgefolder` | high | `{gamePath}` |
| .data Folder | `assassinscreedii-datafolder` | high | `{gamePath}` |
| Loose Data Files | `assassinscreedii-loosedata` | high | `{gamePath}` |
| Forge Replacement | `assassinscreedii-forgefile` | high | `{gamePath}` |
| Binaries / Root Folder | `assassinscreedii-root` | high | `{gamePath}` |
| AnvilToolkit | `assassinscreedii-atk` | low | `{gamePath}` |
| ASI Plugins | `assassinscreedii-asi` | high | `{gamePath}/scripts` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `assassinscreedii-atk` | 25 |
| `assassinscreedii-extracted` | 35 |
| `assassinscreedii-forgefolder` | 36 |
| `assassinscreedii-datafolder` | 37 |
| `assassinscreedii-loosedata` | 38 |
| `assassinscreedii-forgefile` | 39 |
| `assassinscreedii-root` | 41 |
| `assassinscreedii-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`AssassinsCreedIIGame.exe`)

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
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Symlinks Disabled** — hardlink or copy deployment is used instead of symlinks.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
