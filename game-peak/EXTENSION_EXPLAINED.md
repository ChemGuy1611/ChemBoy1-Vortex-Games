# PEAK — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | PEAK Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `peak` |
| Executable | `PEAK.exe` |

## Supported Stores

- **Steam** — `3527290`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `peak-root` | high | `{gamePath}` |
| BepInEx Configuration Manager | `peak-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepinEx Mod | `peak-bepmods` | high | `{gamePath}/BepinEx/plugins` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `peak-bepcfgman` | 9 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download ${BEPCFGMAN_NAME}
- View Changelog
- Open Downloads Folder

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
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
