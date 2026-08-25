# warhammer40kdarktide — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `warhammer40kdarktide` |
| Executable | `binaries/Darktide.exe` |

## Supported Stores

- **Steam** — `1361210`
- **Xbox / Microsoft Store** — `FatsharkAB.Warhammer40000DarktideNew`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `mod_update_all_profile` | `false` | for mod update to keep them in the load order and not uncheck them |
| `updating_mod` | `false` | used to see if it's a mod update or not |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries | `darktide-binaries` | 25 | `?` |
| Config | `darktide-config` | 30 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `//covers DML and LOFM
    "warhammer40kdarktide-dmfdml"` | 25 |
| `//regular mods & DMF
    "warhammer40kdarktide-mod"` | 27 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Darktide Mod Patcher** (`tools/dtkit-patch.exe`)
- **SL_EN_mod_load_order_file_maker** (`SL_EN_mod_load_order_file_maker.bat`)
- **SL_RU_mod_load_order_file_maker** (`SL_RU_mod_load_order_file_maker.bat`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open mod_load_order.txt
- Open user_settings.config
- Open settings_common.ini
- Open win32_settings.ini
- Open Launcher.exe.config
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

