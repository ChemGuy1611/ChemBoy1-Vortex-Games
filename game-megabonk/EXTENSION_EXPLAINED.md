# Megabonk — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Megabonk Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid (IL2CPP & x64) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `megabonk` |
| Executable | `Megabonk.exe` |

## Supported Stores

- **Steam** — `3405340`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BEPINEX_MOD_NAME | `BEPINEX_MOD_ID` | high | `{gamePath}/BEPINEX_MOD_PATH` |
| MELON_MOD_NAME | `MELON_MOD_ID` | high | `{gamePath}/MELON_MOD_PATH` |
| BEPINEX_PLUGINS_NAME | `BEPINEX_PLUGINS_ID` | high | `{gamePath}/BEPINEX_PLUGINS_PATH` |
| BEPINEX_PATCHERS_NAME | `BEPINEX_PATCHERS_ID` | high | `{gamePath}/BEPINEX_PATCHERS_PATH` |
| BEPINEX_CONFIG_NAME | `BEPINEX_CONFIG_ID` | high | `{gamePath}/BEPINEX_CONFIG_PATH` |
| MELON_PLUGINS_NAME | `MELON_PLUGINS_ID` | high | `{gamePath}/MELON_PLUGINS_PATH` |
| MELON_MODS_NAME | `MELON_MODS_ID` | high | `{gamePath}/MELON_MODS_PATH` |
| MELON_CONFIG_NAME | `MELON_CONFIG_ID` | high | `{gamePath}/MELON_CONFIG_PATH` |
| Assembly DLL Mod | `megabonk-assemblydll` | high | `{gamePath}/.` |
| BepInEx Configuration Manager | `megabonk-bepcfgman` | high | `{gamePath}/Bepinex` |
| ASSETS_NAME | `ASSETS_ID` | high | `{gamePath}/ASSETS_PATH` |
| Root Game Folder | `megabonk-root` | high | `{gamePath}` |
| BepInEx Injector | `megabonk-bepinex` | low | `{gamePath}` |
| MelonLoader | `megabonk-melonloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `megabonk-bepinex` | 25 |
| `megabonk-melonloader` | 26 |
| `megabonk-root` | 27 |
| `megabonk-bepcfgman` | 29 |
| `megabonk-assemblydll` | 31 |
| `megabonk-plugin` | 33 |
| `ASSETS_ID` | 37 |
| `CUSTOMCHAR_ID` | 39 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Data Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Ved\\Megabonk` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

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
