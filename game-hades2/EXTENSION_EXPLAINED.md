# Hades II — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Hades II Vortex Extension |
| Engine / Structure | 3rd-Party Mod Installer |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `hades2` |
| Executable | `Ship/Hades2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1138](https://www.nexusmods.com/site/mods/1138) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Hades_II](https://www.pcgamingwiki.com/wiki/Hades_II) |

## Supported Stores

- **Steam** — `1145350`
- **Epic Games Store** — `07c634c7291a49b5b2455e14b9a83950`
- **Xbox / Microsoft Store** — `SupergiantGamesLLC.HadesII`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `thunderstoreBrowser` | `true` | register the "Browse Thunderstore" page |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `hades2-mod` | high | `{gamePath}/Content/Mods` |
| Binaries | `hades2-binaries` | high | `{gamePath}/Ship` |
| Root Game Folder | `hades2-root` | high | `{gamePath}` |
| Mod Importer | `hades2-manager` | low | `{gamePath}/Content` |
| Mod Utility | `hades2-modutility` | low | `{gamePath}/Content/Mods/ModUtil` |
| Mod Loader (Hell2Modding) | `hades2-loader` | high | `{gamePath}/Ship` |
| ReturnOfModding Plugin | `hades2-plugin` | high | `{gamePath}/Ship/ReturnOfModding/plugins` |
| ENVY (LuaENVY) | `hades2-luaenvy` | high | `{gamePath}/Ship/ReturnOfModding/plugins` |
| ENVY (SGG Modding) | `hades2-envy` | high | `{gamePath}/Ship/ReturnOfModding/plugins` |
| Chalk | `hades2-chalk` | high | `{gamePath}/Ship/ReturnOfModding/plugins` |
| ReLoad | `hades2-reload` | high | `{gamePath}/Ship/ReturnOfModding/plugins` |
| SJSON | `hades2-sjson` | high | `{gamePath}/Ship/ReturnOfModding/plugins` |
| DemonDaemon | `hades2-demondaemon` | high | `{gamePath}/Ship/ReturnOfModding/plugins` |
| ModUtil (Hell2Modding) | `hades2-modutil-rom` | high | `{gamePath}/Ship/ReturnOfModding/plugins` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `hades2-manager` | 25 |
| `hades2-modutility` | 27 |
| `hades2-loader` | 29 |
| `hades2-plugin` | 31 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Mod Importer** (`modimporter.exe`)
- **Vulkan Launch** (`EXEC_VK`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest Hell2Modding Mod Loader
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Mod Loader (Hell2Modding) | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

