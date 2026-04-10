# Nobody Wants to Die — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Nobody Wants to Die Vortex Extension |
| Engine / Structure | UE5 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `nobodywantstodie` |
| Executable | `detnoir.exe` |

## Supported Stores

- **Steam** — `1939970`
- **GOG** — `1484887196`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries (Engine Injector) | `nobodywantstodie-binaries` | high | `{gamePath}/detnoir/Binaries/Win64` |
| Config (LocalAppData) | `nobodywantstodie-config` | high | `{localAppData}/detnoir/Saved/Config/Windows` |
| Save Game | `nobodywantstodie-save` | high | `{localAppData}/detnoir/Saved/SaveGames` |
| UE5 Paks | `nobodywantstodie-ue5` | high | `{gamePath}/detnoir/Content/Paks/~mods` |
| Paks (Alt, no "~mods") | `nobodywantstodie-pakalt` | high | `{gamePath}/detnoir/Content/Paks` |
| Root Game Folder | `nobodywantstodie-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 25 |
| `nobodywantstodie-root` | 35 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `detnoir/Saved/Config/Windows` |
| Save | `detnoir/Saved/SaveGames` |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.

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
