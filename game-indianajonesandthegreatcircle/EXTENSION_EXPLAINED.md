# Indiana Jones and the Great Circle Vortex Extension — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Indiana Jones and the Great Circle Vortex Extension |
| Engine / Structure | Basic Game (with Xbox) - Future Mod Injector |
| Author | ChemBoy1 |
| Version | 0.2.0 |
| Date | 2025-12-09 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `indianajonesandthegreatcircle` |
| Executable | `TheGreatCircle.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `2677660`
- **GOG** — `1953447949`
- **Xbox / Microsoft Store** — `BethesdaSoftworks.ProjectRelic`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Sounds | `indianajonesandthegreatcircle-sounds` | high | `{gamePath}/base/sound/soundbanks/pc` |
| Binaries (Engine Injector) | `indianajonesandthegreatcircle-binaries` | high | `{gamePath}` |
| Mod Injector | `indianajonesandthegreatcircle-modinjector` | low | `{gamePath}` |
| Config (Saved Games) | `indianajonesandthegreatcircle-config` | high | `CONFIG_PATH` |
| Save (Steam) | `indianajonesandthegreatcircle-saves` | high | `SAVE_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `indianajonesandthegreatcircle-config` | 30 |
| `indianajonesandthegreatcircle-saves` | 35 |
| `indianajonesandthegreatcircle-sounds` | 40 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**
- **Indiana Jones Mod Injector**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Saves Folder
- View Changelog
- Open Downloads Folder

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
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
