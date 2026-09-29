# Assassin's Creed Origins — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Assassin's Creed Origins Vortex Extension |
| Engine / Structure | Anvil Engine - AnvilToolkit/ForgerPatchManager |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `assassinscreedorigins` |
| Executable | `ACOrigins.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/887](https://www.nexusmods.com/site/mods/887) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_Origins](https://www.pcgamingwiki.com/wiki/Assassin%27s_Creed_Origins) |

## Supported Stores

- **Steam** — `582160`
- **Epic Games Store** — `Camellia`
- **Ubisoft Connect** — `3539`

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
| Extracted Folder | `assassinscreedorigins-extracted` | high | `{gamePath}` |
| .forge Folder | `assassinscreedorigins-forgefolder` | high | `{gamePath}` |
| .data Folder | `assassinscreedorigins-datafolder` | high | `{gamePath}` |
| Loose Data Files | `assassinscreedorigins-loosedata` | high | `{gamePath}` |
| Forge Replacement | `assassinscreedorigins-forgefile` | high | `{gamePath}` |
| Binaries / Root Folder | `assassinscreedorigins-root` | high | `{gamePath}` |
| AnvilToolkit | `assassinscreedorigins-ATK` | low | `{gamePath}` |
| Forger Patch Manager | `assassinscreedorigins-forger` | low | `{gamePath}` |
| Forger Patch | `assassinscreedorigins-forgerpatch` | high | `{gamePath}/ForgerPatches` |
| DLC Folder | `assassinscreedorigins-dlcfolder` | high | `{gamePath}` |
| Binaries / Root Folder | `assassinscreedorigins-binaries` | high | `{gamePath}` |
| ResoRep Textures | `assassinscreedorigins-resoreptextures` | high | `{gamePath}/ResoRep/modded` |
| ResoRep DLL | `assassinscreedorigins-resorep` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `assassinscreedorigins-ATK` | 25 |
| `assassinscreedorigins-forger` | 26 |
| `assassinscreedorigins-resorep` | 27 |
| `assassinscreedorigins-forgerpatch` | 28 |
| `assassinscreedorigins-resoreptextures` | 30 |
| `assassinscreedorigins-dlcfolder` | 34 |
| `assassinscreedorigins-extracted` | 35 |
| `assassinscreedorigins-forgefolder` | 36 |
| `assassinscreedorigins-datafolder` | 37 |
| `assassinscreedorigins-loosedata` | 38 |
| `assassinscreedorigins-forgefile` | 39 |
| `assassinscreedorigins-root` | 41 |
| `assassinscreedorigins-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`ACOrigins.exe`)

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
