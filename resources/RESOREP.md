# ResoRep

ResoRep replaces a game's textures **at runtime** instead of packing them back into the game's own
archives. It is a `d3d11.dll` proxy: it sits between the game and the real Direct3D 11 runtime,
watches every texture the game asks for, and swaps in a `.dds` file from a folder on disk when one
with a matching name is there.

That makes it the answer for Anvil titles whose `.forge` archives AnvilToolkit cannot repack
textures for — Assassin's Creed Unity, IV Black Flag, Odyssey and Origins all use it. Nothing about
it is Anvil-specific, though; the mechanism works for any D3D11 game.

Distributed as a Nexus site mod, page `site/1215`. For the extension side of this, see
`templates/TEMPLATE_ANVILENGINE.md`.

---

## The four file variants

The page carries four packages plus a standalone `dllsettings_ini` download:

| Variant        | Contains                                                           | For                       |
| -------------- | ------------------------------------------------------------------ | ------------------------- |
| `32BIT Manual` | `d3d11.dll`, `dllsettings.ini`, `copy_d3d11dll_manual.bat`, readme | Installing by hand        |
| `32BIT Vortex` | `d3d11.dll`, `copy_d3d11dll_vortex.bat`, readme — **no ini**       | Installing through Vortex |
| `64BIT Manual` | `d3d11.dll`, `dllsettings.ini`, `copy_d3d11dll_manual.bat`, readme | Installing by hand        |
| `64BIT Vortex` | `d3d11.dll`, `copy_d3d11dll_vortex.bat`, readme — **no ini**       | Installing through Vortex |

**The Vortex variants deliberately ship no `dllsettings.ini`.** The extension writes it instead,
with the game's real paths already substituted in, so the user never edits a config file. The Manual
variants do bundle one, pre-filled with placeholders for the user to replace by hand.

This is why an extension must pin the **file ID** of the Vortex variant rather than resolving the
newest main file on the page: both Manual variants are also main files, and pulling one would drop a
conflicting `dllsettings.ini` into the game folder alongside the one the extension writes.

## Bitness drives three things at once

A game is either 32-bit or 64-bit, and that single fact selects:

1. **Which file variant to download** — `32BIT Vortex` or `64BIT Vortex`.
2. **Which system folder the original DLL is copied from** — `%SystemRoot%\SysWOW64` for 32-bit,
   `%SystemRoot%\System32` for 64-bit.
3. **The suffix on the `application_to_hook` ini line** — `|BIT32` or `|BIT64`.

Getting any one of the three wrong gives a silent no-op: the proxy loads and hooks nothing, or fails
to load at all.

## The DLL proxy chain

ResoRep's `d3d11.dll` goes into the game folder next to the executable, where Windows finds it
before the system copy. It is not a full Direct3D implementation — it forwards everything it does
not care about to the real runtime, which it loads from **`ori_d3d11.dll`** in the same folder.

So the game folder needs two DLLs:

| File            | Where it comes from                           |
| --------------- | --------------------------------------------- |
| `d3d11.dll`     | The ResoRep package                           |
| `ori_d3d11.dll` | A copy of the **system** `d3d11.dll`, renamed |

The package ships a `.bat` to make that copy, and the two variants differ in where they put it:

- `copy_d3d11dll_vortex.bat` copies the system DLL to `ori_d3d11.dll` **relative to its own working
  directory**. Run where it ships — the mod's staging folder — that makes `ori_d3d11.dll` a managed
  mod file, deployed with the rest of the mod on the next deploy and removed again on purge. Its
  closing message says exactly that: "Deploy mods in Vortex to copy the new file to the game's
  folder."
- `copy_d3d11dll_manual.bat` prompts for the game folder and copies the system DLL, ResoRep's
  `d3d11.dll` and `dllsettings.ini` straight into it.

An extension can do the staging-folder copy for the user instead, or copy directly into the game
folder. The direct copy is live immediately but is **not a managed mod file**: purging will not
remove it, and uninstalling ResoRep leaves it behind.

## `dllsettings.ini`

Written into the game folder, next to the executable. The template on the page uses three
placeholders — `%GAME_FOLDER%`, `%EXECUTABLE%` and `%BIT32_or_BIT64%` — which an extension
substitutes before writing:

```ini
version=1.7.0
modded_textures_folder=%GAME_FOLDER%\ResoRep\modded
mod_creator_mode_enabled=false
dll_log_enabled=false
dll_log_file=%GAME_FOLDER%\resorepDll.log
save_textures=false
original_textures_folder=%GAME_FOLDER%\ResoRep\original
application_to_hook=%GAME_FOLDER%\%EXECUTABLE%|%BIT32_or_BIT64%
```

| Key                       | Meaning                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `version`                 | ResoRep version the ini was written for                                                   |
| `modded_textures_folder`  | Where ResoRep looks for replacement `.dds` files. **This is the texture mod type's target** |
| `mod_creator_mode_enabled`| Mod-authoring mode; off for players                                                       |
| `dll_log_enabled`         | Proxy logging, off by default                                                             |
| `dll_log_file`            | Where that log goes                                                                       |
| `save_textures`           | Dump every texture the game loads — how a mod author collects names to replace            |
| `original_textures_folder`| Where dumped originals land when `save_textures` is on                                    |
| `application_to_hook`     | Full path to the game executable, then `\|`, then the bitness token                        |

Two things to check after writing it: no `%...%` placeholder is left anywhere in the file, and
`modded_textures_folder` matches the texture mod type's deploy target **exactly** — if the two
disagree, mods deploy to a folder ResoRep never reads and nothing appears in game.

## Texture layout

Everything lives inside the game folder:

```text
<game folder>\
├── d3d11.dll              ResoRep proxy
├── ori_d3d11.dll          renamed copy of the system DLL
├── dllsettings.ini
└── ResoRep\
    ├── modded\            replacement .dds files go here
    └── original\          dumped originals, when save_textures is on
```

Replacement files keep the names ResoRep dumped them under — that name is the only thing tying a
`.dds` to the texture it replaces.

### Why the game folder, and not Documents

Vanilla ResoRep defaults its texture folder to the user's Documents folder, and some older
extensions followed that default. The custom packages above do not: their ini template always points
at `%GAME_FOLDER%\ResoRep\modded`, so the Documents path is a default, not a convention worth
preserving.

It is also worse in practice. A mod type pointing into Documents can land on a different drive from
the mod staging folder, and Vortex cannot hardlink across volumes — those mods fall back to being
copied, and one game's deployment ends up split across two drives. Deploying inside the game folder
keeps textures on the same volume as staging, so hardlinks work.

Moving an extension from the Documents layout to the game-folder layout is a **clean break**: mods a
user already installed under the old mod type stay exactly where they are and keep deploying, while
new texture mods go to the game folder. Nothing is purged, remapped or moved on the user's behalf.
The one thing that must not happen is de-registering the old mod type — see the note in
`INSTALLER_SYSTEM.md` about retired mod types: Vortex resolves a mod's deploy target through its mod
type, so a mod carrying a type nothing registers any more has no resolvable path, and its files can
neither be deployed nor purged. A retired type leaves the installer routing but stays registered.

## Games using it

| Game                           | Bitness |
| ------------------------------ | ------- |
| Assassin's Creed Unity         | 64-bit  |
| Assassin's Creed IV Black Flag | 32-bit  |
| Assassin's Creed Odyssey       | 64-bit  |
| Assassin's Creed Origins       | 64-bit  |

Confirm the bitness against the game's own executable before wiring a new title up — it selects the
download, the system DLL folder and the hook suffix together, and all three fail quietly when it is
wrong.

### Which games can use it at all

Any Direct3D 11 game, in principle — the proxy has to have a `d3d11.dll` to stand in front of. A
game that renders through an older Direct3D has nothing for ResoRep to hook, and no amount of
configuration changes that. Among the Assassin's Creed titles that matters from Black Flag
backwards:

| Game                            | Direct3D       | ResoRep |
| ------------------------------- | -------------- | ------- |
| Assassin's Creed                | 9.0c, 10, 10.1 | no      |
| Assassin's Creed II             | 9.0c           | no      |
| Assassin's Creed: Brotherhood   | 9.0c           | no      |
| Assassin's Creed: Revelations   | 9.0c           | no      |
| Assassin's Creed III            | 11             | yes     |
| Assassin's Creed III Remastered | 11             | yes     |
| Assassin's Creed IV Black Flag  | 11             | yes     |
| Assassin's Creed Rogue          | 11             | yes     |
| Assassin's Creed Unity          | 11             | yes     |
| Assassin's Creed Syndicate      | 11             | yes     |

Check the renderer before assuming a texture mod can work, especially on the older titles, where
the era is a poor guide: III and Black Flag are D3D11 while Revelations, released a year before
III, is D3D9 only.

---

## See also

`templates/TEMPLATE_ANVILENGINE.md` (the extension side: mod types, installers, the ini write).
`INSTALLER_SYSTEM.md` (`registerInstaller` and mod type registration, including retired types).
`VORTEX_DEPLOYMENT.md` (why hardlinks need one volume, and what happens when they cannot be used).
`NEXUS_MODS_API.md` (resolving a pinned file ID on a `site` domain page).
