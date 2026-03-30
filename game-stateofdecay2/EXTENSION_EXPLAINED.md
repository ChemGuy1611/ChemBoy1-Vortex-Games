# State of Decay 2 — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | State of Decay 2 Vortex Extension |
| Engine / Structure | UE4 (Local AppData) |
| Author | ChemBoy1 |
| Version | 2.2.0 |
| Date | 2026-01-31 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `stateofdecay2` |
| Executable | `StateOfDecay2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `495420`
- **Epic Games Store** — `Snoek`
- **Xbox / Microsoft Store** — `Microsoft.Dayton`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Config (LocalAppData) | `stateofdecay2-config` | high | `{localAppData}/StateOfDecay2/Saved/Config/WindowsNoEditor` |
| Paks | `stateofdecay2-pak` | high | `{localAppData}/StateOfDecay2/Saved/Paks` |
| Cooked Mods | `stateofdecay2-cooked` | high | `{localAppData}/StateOfDecay2/Saved` |
| Root Game Folder | `stateofdecay2-root` | high | `{gamePath}` |
| SoD2 Mod Manager | `stateofdecay2-modmanager` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `stateofdecay2-modmanager` | 30 |
| `stateofdecay2-config` | 35 |
| `stateofdecay2-cooked` | 40 |
| `stateofdecay2-root` | 45 |
| `stateofdecay2-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **SoD2 Mod Manager**
- **Custom Launch** (`StateOfDecay2.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download SoD2 Mod Manager
- Open Paks Folder
- Open Config Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Config & Save Paths

| Type | Path |
|---|---|
| Config | `StateOfDecay2/Saved/Config/WindowsNoEditor` |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `Unreal Engine Mod Installer`.

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
