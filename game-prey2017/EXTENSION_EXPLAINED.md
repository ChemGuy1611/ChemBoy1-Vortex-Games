# Prey (2017) — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Prey Vortex Extension (Alt version) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `prey2017` |
| Executable | `N/A` |
| Executable (Xbox) | `Binaries/Danielle/Gaming.Desktop.x64/Release/Prey.exe` |
| Executable (GOG) | `Binaries/Danielle/x64-GOG/Release/Prey.exe` |

## Supported Stores

- **Steam** — `480490`
- **Epic Games Store** — `52d88e9a6df248da913c8e99f1e4c526`
- **GOG** — `1158493447`
- **Xbox / Microsoft Store** — `BethesdaSoftworks.LiluDallas-Multipass`

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `prey2017-pric` | 25 |
| `prey2017-chairloader` | 30 |
| `prey2017-chairmodzip` | 35 |
| `prey2017-root` | 40 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Prey Interface Customizer**
- **Chairloader**

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
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
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
