# Sid Meier's Civilization VI — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Civilization VI Vortex Extension |
| Engine / Structure | User Folder Mod Location |
| Author | ChemBoy1 |
| Version | 0.1.3 |
| Date | 2025-07-31 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `civilisationvi` |
| Executable | `Base/Binaries/Win64Steam/CivilizationVI.exe` |

## Supported Stores

- **Steam** — `289070`
- **Epic Games Store** — `Kinglet`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Root Game Folder | `civilisationvi-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `civilisationvi-mod` | 25 |
| `civilisationvi-root` | 30 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
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
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
