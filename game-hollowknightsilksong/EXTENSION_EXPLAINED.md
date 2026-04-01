# Hollow Knight: Silksong — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Hollow Knight: Silksong Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `hollowknightsilksong` |
| Executable | `Hollow Knight Silksong.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `1030300`
- **GOG** — `1558393671`
- **Xbox / Microsoft Store** — `TeamCherry.HollowKnightSilksong`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `downloadCfgMan` | `true` | should BepInExConfigManager be downloaded? |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `hollowknightsilksong-root` | high | `{gamePath}` |
| Assembly DLL Mod | `hollowknightsilksong-assemblydll` | high | `{gamePath}/Hollow Knight Silksong_Data/Managed` |
| BepInEx Configuration Manager | `hollowknightsilksong-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepinEx Mod | `hollowknightsilksong-bepmods` | high | `{gamePath}/BepinEx/plugins` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 5.4.23.5 | unitymono, x64 |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Team Cherry\\Hollow Knight Silksong` |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `modtype-bepinex`.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex links/copies to game folder
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
