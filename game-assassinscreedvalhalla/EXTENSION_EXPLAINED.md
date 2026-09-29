# Assassin's Creed Valhalla — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Assassin's Creed Valhalla Vortex Extension |
| Engine / Structure | Anvil Engine - AnvilToolkit/ForgerPatchManager |
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
- **Epic Games Store** — `965ccf8b2eba4f9381ef43183c08e205`
- **Ubisoft Connect** — `13504`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `exeHasGameVersion` | `false` | ACValhalla.exe ProductVersion is all-zero — Denuvo strips it, confirmed on the real install |
| `hasAtk` | `false` | true if game supports AnvilToolkit — also gates the Extracted/.forge/.data/loose workflow and the rename dialog |
| `hasForger` | `true` | true if game supports Forger Patch Manager (.forger2 files) — typically older AC games |
| `hasReforger` | `true` | true if game uses ReForger (Xbox package, found through the registry) |
| `autoDownloadReforger` | `false` | true to fetch+run the ReForger installer automatically during setup. false: the tool is still registered and the "Download ReForger" button still works, just nothing happens without the user clicking it |
| `hasDlcFolders` | `true` | true if game has dlc_NN folders — adds the DLC mod type and installer. Enumerate DLC_FOLDERS to match; .forge routing follows DLC_FOLDERS directly |
| `hasResorep` | `false` | true if game uses ResoRep for runtime texture injection |
| `autoCopyResorepDll` | `false` | true to copy the system d3d11.dll into the game folder automatically instead of leaving the bundled .bat to the user. The copy is not a managed mod file, so purging does not remove it |
| `hasPatchTextures` | `false` | true if game takes loose .dds textures as Forger patches — mutually exclusive with hasResorep |
| `hasSound` | `false` | true if game takes .pck sound bank replacements |
| `hasFixes` | `false` | true if game has a community "fixes" DLL package |
| `hasBinariesType` | `false` | true if game ships a separate "-binaries" mod type alongside "-root" |
| `hasCustomLaunchers` | `false` | true if game has extra launcher executables (Ubisoft Plus / Vulkan) |
| `hasSettingsIni` | `false` | true to add an "Open Settings INI" toolbar button |
| `setupNotification` | `true` | enable to show the user a notification with special instructions on first setup |
| `deployNotification` | `true` | enable the post-deployment notification reminding the user to run the tools — ALWAYS true when hasAtk or hasForger is true, regardless of pre-port history |
| `allowSymlinks` | `false` | symlinks can cause issues when repacking with ATK — set to false when hasAtk = true |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Extracted Folder | `assassinscreedvalhalla-extracted` | high | `{gamePath}` |
| .forge Folder | `assassinscreedvalhalla-forgefolder` | high | `{gamePath}` |
| .data Folder | `assassinscreedvalhalla-datafolder` | high | `{gamePath}` |
| Loose Data Files | `assassinscreedvalhalla-loosedata` | high | `{gamePath}` |
| Forge Replacement | `assassinscreedvalhalla-forgefile` | high | `{gamePath}` |
| Binaries / Root Folder | `assassinscreedvalhalla-root` | high | `{gamePath}` |
| ReForger Installer | `assassinscreedvalhalla-reforgerinstall` | low | `{gamePath}` |
| Forger Patch Manager | `assassinscreedvalhalla-forger` | low | `{gamePath}` |
| Forger Patch | `assassinscreedvalhalla-forgerpatch` | high | `{gamePath}/ForgerPatches` |
| DLC Folder | `assassinscreedvalhalla-dlcfolder` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `assassinscreedvalhalla-forger` | 26 |
| `assassinscreedvalhalla-forgerpatch` | 28 |
| `assassinscreedvalhalla-dlcfolder` | 34 |
| `assassinscreedvalhalla-forgefile` | 39 |
| `assassinscreedvalhalla-root` | 41 |
| `assassinscreedvalhalla-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`ACValhalla.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download ReForger
- Open PCGamingWiki Page
- Open SteamDB Page
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
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Symlinks Disabled** — hardlink or copy deployment is used instead of symlinks.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
