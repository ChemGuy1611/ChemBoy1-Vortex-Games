# My Winter Car — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | My Winter Car Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid + Custom Mod Loader (MSCLoader) |
| Author | ChemBoy1 |
| Version | 0.2.2 |
| Date | 2026-01-12 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `mywintercar` |
| Executable | `mywintercar.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `4164420`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `hasCustomMods` | `false` | set to true if there are modTypes with folder paths dependent on which mod loader is installed |
| `hasCustomLoader` | `true` | set to true if there is a custom mod loader |
| `customLoaderInstaller` | `true` | set true if the custom loader uses an installer |
| `allowBepCfgMan` | `false` | should BepInExConfigManager be downloaded? |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded? False until figure out UniverseLib dependency |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `allowMelonNexus` | `false` | set false until bugs are fixed |
| `bepinexInstalled` | `false` |  |
| `melonInstalled` | `false` |  |
| `mscInstalled` | `false` |  |
| `isBepinex` | `false` |  |
| `isBepinexPatcher` | `false` |  |
| `isMelon` | `false` |  |
| `isMelonPlugin` | `false` |  |
| `isMsc` | `false` |  |
| `unknown` | `false` |  |
| `fileTest` | `false` |  |
| `fileTest` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| MSCLoader Mod | `mywintercar-mscloadermod` | high | `{gamePath}/.` |
| MSCLoader Plugin | `mywintercar-mscloaderplugin` | high | `{gamePath}/Mods` |
| Texture Pack (MSCLoader) | `mywintercar-texturepack` | high | `{gamePath}/Mods/Assets/TexturePackLoader` |
| BepInEx Mod | `mywintercar-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `mywintercar-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `mywintercar-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `mywintercar-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `mywintercar-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `mywintercar-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `mywintercar-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `mywintercar-melonloader-config` | high | `{gamePath}/UserData` |
| Assembly DLL Mod | `mywintercar-assemblydll` | high | `{gamePath}/.` |
| BepInExConfigManager | `mywintercar-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `mywintercar-melonprefman` | high | `{gamePath}/Mods` |
| Assets/Resources File | `mywintercar-assets` | high | `{gamePath}/mywintercar_Data` |
| Root Game Folder | `mywintercar-root` | high | `{gamePath}` |
| BepInEx Injector | `mywintercar-bepinex` | low | `{gamePath}` |
| MelonLoader | `mywintercar-melonloader` | low | `{gamePath}` |
| MSCLoader | `mywintercar-mscloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `mywintercar-mscloader` | 25 |
| `mywintercar-bepinex` | 26 |
| `mywintercar-melonloader` | 27 |
| `mywintercar-root` | 28 |
| `mywintercar-bepcfgman` | 29 |
| `mywintercar-melonprefman` | 30 |
| `mywintercar-assemblydll` | 31 |
| `mywintercar-plugin` | 33 |
| `mywintercar-assets` | 37 |
| `mywintercar-custommod` | 39 |
| `mywintercar-texturepack` | 48 |
| `mywintercar-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**
- **${MSCLOADER_NAME} Installer**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Delete 
- Restore 
- Open Data Folder
- Open Save Folder
- Open BepInEx Config
- Open BepInEx Log
- Download BepInExConfigManager
- Open MelonLoader Config
- Open MelonLoader Log
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| BepInEx | 5.4.23.5 | mono |

## Config & Save Paths

| Type | Path |
|---|---|
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\amistech\\My Winter Car` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex links/copies to game folder
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
