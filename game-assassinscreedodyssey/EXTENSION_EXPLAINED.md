# Assassin's Creed Odyssey — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Assassin's Creed Odyssey Vortex Extension |
| Engine / Structure | Anvil Engine - AnvilToolkit/ForgerPatchManager |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `assassinscreedodyssey` |
| Executable | `ACOdyssey.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/910](https://www.nexusmods.com/site/mods/910) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_Odyssey](https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_Odyssey) |

## Supported Stores

- **Steam** — `812140`
- **Epic Games Store** — `Clary`
- **Ubisoft Connect** — `5059`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `exeHasGameVersion` | `false` | exe ProductVersion is all-zero — Denuvo strips it, confirmed across every anvil game checked |
| `hasAtk` | `true` | true if game supports AnvilToolkit — also gates the Extracted/.forge/.data/loose workflow and the rename dialog |
| `hasForger` | `true` | true if game supports Forger Patch Manager (.forger2 files) — typically older AC games |
| `hasReforger` | `false` | true if game uses ReForger (Xbox package, found through the registry) |
| `autoDownloadReforger` | `false` | true to fetch+run the ReForger installer automatically during setup. false: the tool is still registered and the "Download ReForger" button still works, just nothing happens without the user clicking it |
| `hasDlcFolders` | `true` | true if game has dlc_NN folders — adds the DLC mod type and installer. Enumerate DLC_FOLDERS to match; .forge routing follows DLC_FOLDERS directly |
| `hasResorep` | `true` | true if game uses ResoRep for runtime texture injection |
| `autoCopyResorepDll` | `false` | true to copy the system d3d11.dll into the game folder automatically instead of leaving the bundled .bat to the user. The copy is not a managed mod file, so purging does not remove it |
| `hasPatchTextures` | `false` | true if game takes loose .dds textures as Forger patches — mutually exclusive with hasResorep |
| `hasSound` | `false` | true if game takes .pck sound bank replacements |
| `hasFixes` | `false` | true if game has a community "fixes" DLL package |
| `hasBinariesType` | `true` | true if game ships a separate "-binaries" mod type alongside "-root" |
| `hasCustomLaunchers` | `false` | true if game has extra launcher executables (Ubisoft Plus / Vulkan) |
| `hasSettingsIni` | `false` | true to add an "Open Settings INI" toolbar button |
| `setupNotification` | `false` | enable to show the user a notification with special instructions on first setup |
| `deployNotification` | `true` | enable the post-deployment notification reminding the user to run the tools — ALWAYS true when hasAtk or hasForger is true, regardless of pre-port history |
| `allowSymlinks` | `false` | symlinks can cause issues when repacking with ATK — set to false when hasAtk = true |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Extracted Folder | `assassinscreedodyssey-extracted` | high | `{gamePath}` |
| .forge Folder | `assassinscreedodyssey-forgefolder` | high | `{gamePath}` |
| .data Folder | `assassinscreedodyssey-datafolder` | high | `{gamePath}` |
| Loose Data Files | `assassinscreedodyssey-loosedata` | high | `{gamePath}` |
| Forge Replacement | `assassinscreedodyssey-forgefile` | high | `{gamePath}` |
| Binaries / Root Folder | `assassinscreedodyssey-root` | high | `{gamePath}` |
| AnvilToolkit | `assassinscreedodyssey-ATK` | low | `{gamePath}` |
| Forger Patch Manager | `assassinscreedodyssey-forger` | low | `{gamePath}` |
| Forger Patch | `assassinscreedodyssey-forgerpatch` | high | `{gamePath}/ForgerPatches` |
| DLC Folder | `assassinscreedodyssey-dlcfolder` | high | `{gamePath}` |
| Binaries / Root Folder | `assassinscreedodyssey-binaries` | high | `{gamePath}` |
| ResoRep Textures | `assassinscreedodyssey-resoreptextures` | high | `{gamePath}/ResoRep/modded` |
| ResoRep DLL | `assassinscreedodyssey-resorep` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `assassinscreedodyssey-ATK` | 25 |
| `assassinscreedodyssey-forger` | 26 |
| `assassinscreedodyssey-resorep` | 27 |
| `assassinscreedodyssey-forgerpatch` | 28 |
| `assassinscreedodyssey-resoreptextures` | 30 |
| `assassinscreedodyssey-dlcfolder` | 34 |
| `assassinscreedodyssey-extracted` | 35 |
| `assassinscreedodyssey-forgefolder` | 36 |
| `assassinscreedodyssey-datafolder` | 37 |
| `assassinscreedodyssey-loosedata` | 38 |
| `assassinscreedodyssey-forgefile` | 39 |
| `assassinscreedodyssey-root` | 41 |
| `assassinscreedodyssey-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`ACOdyssey.exe`)

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
| Forger Patch Manager | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Symlinks Disabled** — hardlink or copy deployment is used instead of symlinks.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
