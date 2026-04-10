# Marvel Rivals — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Marvel Rivals Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `marvelrivals` |
| Executable | `MarvelGame/Marvel.exe` |

## Supported Stores

- **Steam** — `2767030`
- **Epic Games Store** — `575efd0b5dd54429b035ffc8fe2d36d0`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_CONFIG` | `false` |  |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Loose Data Files | `marvelrivals-root` | high | `{gamePath}/MarvelGame/Marvel/Content` |
| UE5 Paks | `marvelrivals-ue5` | high | `{gamePath}/MarvelGame/Marvel/Content/Paks/~mods` |
| UE5 Paks (no ~mods) | `marvelrivals-pakalt` | high | `{gamePath}/MarvelGame/Marvel/Content/Paks` |
| Signature Bypass | `marvelrivals-sigbypass` | low | `{gamePath}/MarvelGame/Marvel/Binaries/Win64` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 35 |
| `marvelrivals-root` | 30 |
| `marvelrivals-sigbypass` | 37 |
| `marvelrivals-config` | 40 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder (LocalAppData)
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

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
