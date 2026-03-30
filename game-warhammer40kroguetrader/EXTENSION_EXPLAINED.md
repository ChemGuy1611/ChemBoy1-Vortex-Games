# Warhammer 40,000: Rogue Trader — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Warhammer 40,000: Rogue Trader Vortex Extension |
| Engine / Structure | Game with Integrated Mod Loader (UnityModManager) |
| Author | ChemBoy1 |
| Version | 0.2.1 |
| Date | 2026-02-13 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `warhammer40kroguetrader` |
| Executable | `WH40KRT.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `WH40KRT.exe` |

## Supported Stores

- **Steam** — `2186680`
- **GOG** — `1347700224`
- **Xbox / Microsoft Store** — `OwlcatGames.3387926822CE4`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `LOAD_ORDER_ENABLED` | `true` |  |
| `debug` | `false` |  |
| `mod_update_all_profile` | `false` |  |
| `updating_mod` | `false` | used to see if it's a mod update or not |
| `dllInRoot` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Plugin (UnityModManager) | `warhammer40kroguetrader-plugin` | high | `PLUGIN_PATH` |
| Owlcat Mod | `warhammer40kroguetrader-mod` | high | `MOD_PATH` |
| Portraits | `warhammer40kroguetrader-portrait` | high | `PORTRAIT_PATH` |
| Save | `warhammer40kroguetrader-save` | high | `SAVE_PATH` |
| MicroPatches | `warhammer40kroguetrader-micropatches` | low | `MICROPATCHES_PATH` |
| Root Folder | `warhammer40kroguetrader-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `warhammer40kroguetrader-binaries` | high | `{gamePath}/BINARIES_PATH` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`WH40KRT.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Owlcat Mod Folder
- Open Portraits Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
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
