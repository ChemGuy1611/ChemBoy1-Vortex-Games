# Notes for Mod Authors - Hellblade 2

Packaging rules for Hellblade 2 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Pak Mods | a `'.pak` file | `Hellblade2\Content\Paks\~mods` |
| Config | a file with the `.ini` extension | - |
| Save Game Files | a `.sav` file | `{localAppData}\Hellblade2\Saved\SaveGames` |
| Root / Game Folder Mods | a top-level folder such as `Hellblade2` | the game folder itself (no subfolder) |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Pak Mods

Standard content mods: one or more `'.pak` files. Vortex installs the mod files themselves, so the folder structure around them in the archive does not matter.

```text
MyPakMod.zip
└── MyPakMod'.pak
```

**Requirements:**

- Recognised by any file with the `'.pak` extension.
- Surrounding folders are discarded - only the mod files are installed.
- If the archive holds several mod files, Vortex asks the user which to install, which is useful for shipping optional variants in one download.

Installs to: `Hellblade2\Content\Paks\~mods`

**Common mistakes:**

- Shipping several unrelated paks in one archive when you meant them all to install - the user gets a choice dialog and may pick only one.

## Config

Recognised when the archive contains a file with the `.ini` extension.

## Save Game Files

Save files are deployed to the game's save folder in your user profile.

**Requirements:**

- Recognised by any file with extension `.sav`.

Installs to: `{localAppData}\Hellblade2\Saved\SaveGames`

**Common mistakes:**

- Including an example save alongside a normal mod - the archive is then treated as a save, not a mod.

## Root / Game Folder Mods

For mods that replace or add files inside the game installation, laid out the same way they appear in the game folder.

```text
MyRootMod.zip
└── Hellblade2\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a top-level folder matching any of: `Hellblade2`.
- The matched folder and everything below it is copied into the game folder, preserving structure.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders instead of the game folders themselves adds an extra level and misplaces every file.

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

