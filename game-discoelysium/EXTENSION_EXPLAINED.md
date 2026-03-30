# Disco Elysium — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Disco Elysium Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |
| Version | 0.1.4 |
| Date | 2026-03-22 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `discoelysium` |
| Executable | `disco.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `disco.exe` |

## Supported Stores

- **Steam** — `632470`
- **Epic Games Store** — `7334aba246154b63857435cb9c7eecd5`
- **GOG** — `1771589310`
- **Xbox / Microsoft Store** — `ZAUMStudioDiscoElysiumUKL.DiscoElysium-TheFinalCut`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `multiExe` | `true` | set to true if there are multiple executables (e.g. for Xbox and PC) |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `downloadCfgMan` | `false` | should BepInExConfigManager be downloaded? |
| `bleedingEdge` | `true` | set to true to download bleeding edge builds of BepInEx (IL2CPP only) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Root Game Folder | `discoelysium-root` | high | `{gamePath}` |
| BepInEx Configuration Manager | `discoelysium-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepInEx Mod | `discoelysium-bepmods` | high | `{gamePath}/BepinEx/plugins` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `discoelysium-root` | 8 |
| `discoelysium-bepcfgman` | 9 |
| `discoelysium-assemblydll` | 25 |
| `discoelysium-assets` | 27 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`disco.exe`)
- **Custom Launch** (`Disco Elysium.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open BepInEx.cfg
- Download BepInExConfigManager
- Open Data Folder
- Open Config Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| BepInEx | 6.0.0 | unityil2cpp, x64 |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
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
