# Disrupt Manager (Watch Dogs 2 / Watch Dogs: Legion)

How Disrupt Manager reads mod packages and rebuilds the game's patch archives, and how `game-watchdogs2` and `game-watchdogslegion` work with it.

Disrupt Manager ([rootCBR/DisruptManager](https://github.com/rootCBR/DisruptManager), 1.1.9311.41691) is a closed-source .NET (WPF) app covering Watch Dogs, Watch Dogs 2 and Watch Dogs: Legion. The GitHub repository holds only a README and the releases. Everything below comes from the decompiled release (`DisruptManager.exe`, `CBR.Disrupt.dll`) and was live-tested on the Ubisoft Connect builds of WD2 and Legion. Its archive reader is a bundled copy of gibbed's open-source [Gibbed.Disrupt](https://github.com/gibbed/Gibbed.Disrupt) file-format library. Watch Dogs 1 uses a different loader (`NEXUSTOOLS_MODLOADER.md`).

---

## Packages

### Where Disrupt Manager looks

Each game has a package folder next to the exe: `<Disrupt Manager>\Watch Dogs 2\` and `<Disrupt Manager>\Watch Dogs Legion\`. `ModRepository.UpdatePackages` lists **only `*.zip`** in that folder, and a `FileSystemWatcher` filtered to `*.zip` picks up new, removed and renamed packages while the app is open.

Unzipped package folders are loaded only when `config.xml` has `<IsDevelopment>True</IsDevelopment>` under `<Application>`. In normal mode a loose folder is ignored, so a mod manager must deliver each package as a zip.

### Package layout

A package is a zip with `info.xml` at the zip root, plus the replacement files at their game-archive-relative paths:

```text
My Mod.zip
├── info.xml
├── partial.xml                                  (optional)
├── 01.jpg                                       (optional preview images)
└── generated\databases\generic\weapon.lib       (files to pack into the game archive)
```

Every zip entry except `info.xml`, `partial.xml` and six-character `*.jpg` names (`01.jpg` to `99.jpg`) is treated as a game file. A path starting `__unknown/` is treated as a raw name hash (the file name is the hex hash).

### `info.xml`

The root element is `ModPackageInfo`, or `Info` (older ManageLegion packages; it is renamed on load). Every field is optional for loading, but `Name` is what the list shows.

| Element | Type | Meaning |
| --- | --- | --- |
| `Name` | string | Display name |
| `Description` | string | Long description |
| `Version` | string | Free-form version |
| `Features` | list of `Feature` | Bullet list shown in the app |
| `Category` | string | Grouping, default `Misc` |
| `Author` | `Name`, `Discord`, `YouTube`, `Twitter` | Credits |
| `IsNSFW` | bool | Hidden unless NSFW is allowed in settings |
| `UseCombineMode` | bool | Merge supported binary files (`.lib` style) into the original instead of replacing them |

"ManageLegion Version" downloads on Nexus Mods use the same layout. ManageLegion was Disrupt Manager's predecessor.

### `partial.xml`

`partial.xml` makes XPath edits to an XML file from the game instead of replacing it whole. Each target file supports `Add` (with `Mode` `First` or `Last`), `Remove` and `Replace` operations. The original file is read from the game archives, so a partial edit fails with "Could not find base for partial file" if the target is not found in any candidate archive (see below).

### Enabled state

Ticked packages are saved per game in `<Disrupt Manager>\Profiles\<Game Name>.xml` as `EnabledModPackages`, a list of `UInt32` hashes. For a zip package the hash is computed from the **zip file's bytes** (`FileHelpers.HashFile`), not its name. Any change to the zip, including re-zipping identical content, therefore produces a new hash, and Disrupt Manager shows the package as unticked again. The same profile file holds `GameDirectoryPath`, which must point at the game's root folder. `config.xml` next to the exe holds the enabled games and the last active game.

---

## Install: how the patch archive is built

Install is GUI-only: tick packages, click Install. No command-line mode exists. `GenericJob` picks the archives by game:

| Game | Candidate archives (searched in order) | Primary (output) archive | Build mode |
| --- | --- | --- | --- |
| Watch Dogs | `patch1`, `patch`, `common` | `patch1` | Modify in place, with backup |
| Watch Dogs 2 | `patch3`, `patch2`, `patch`, `common` | `patch3` | Create from scratch |
| Watch Dogs: Legion | `patch`, `common` | `patch` | Modify in place, with backup |

All archives live in `<game>\data_win64\` as `<name>.fat` (index) + `<name>.dat` (data) pairs.

**Modify in place** (Watch Dogs, Legion): before packing, an existing `<primary>.bak` is restored. The current `<primary>.fat` is then backed up to `<primary>.bak` (original `.dat` size + hash + `.fat` bytes), and the package files are packed into the primary archive. Uninstall restores the `.bak` and deletes the `.bak` and `.nfo`. On Legion the primary is the game's own ~18 GB `patch.dat`.

**Create from scratch** (Watch Dogs 2): `patch3.dat` and `patch3.fat` are opened with `OpenOrCreate`, truncated and rewritten with only the package files. The header fields (version, platform, compression version, name-hash version) are copied from `common.fat`. No backup is made, because vanilla WD2 has no `patch3`.

For every package file, `BigFileHelper.TryFindEntry` looks for the original in each candidate archive in turn. It opens each `<name>.fat` with `FileMode.Open` and parses it, with **no existence check and no per-archive error handling**. Any missing or unreadable candidate stops the whole install.

---

## Watch Dogs 2 problems

### First install on a clean game crashes

The first WD2 candidate is `patch3`, the archive Disrupt Manager itself creates, and vanilla WD2 has no `patch3`. On an unmodded game the first lookup throws and nothing is installed. The game's `data_win64` only has `patch`, `patch2` and their `_english` variants. (The "patch, patch1, patch2" list in issue #23 on the Disrupt Manager tracker is the Watch Dogs 1 layout.)

Workaround: create a valid empty `patch3` first. The game ships one: `data_win64\worlds\san_francisco\san_francisco_cache_patch.fat` is 32 bytes and has no entries:

```text
35 54 41 46  0B 00 00 00  01 06 46 00  FF FF FF FF FF FF FF FF  00 00 00 00  00 00 00 00  00 00 00 00
magic 5TAF   version 11   Win64/CV 6/  archive hash             dependencies entries      localizations
                          NHV 70
```

Copy it to `data_win64\patch3.fat` and create an empty `data_win64\patch3.dat`. Disrupt Manager then finds nothing in `patch3`, moves on to the other candidates, and overwrites both files with its output.

### Raw `patch3` mods

Most WD2 mods on Nexus Mods are raw `patch3.dat`/`patch3.fat` pairs dropped into `data_win64`. They collide with Disrupt Manager in two ways:

- **Install overwrites them.** Disrupt Manager truncates and rebuilds `patch3`, so the raw mod is lost. When the raw mod was deployed by Vortex as a hard link, the write goes through the link into the mod's staging copy.
- **Old ones crash it.** `BigFileV5.Deserialize` accepts only known header combinations. For WD2 these are (version 11, platform Any, CV 0, NHV 70) and (version 11, Win64, CV 6, NHV 70). Some older raw mods (for example Natural San Francisco, mod 3) have NHV 0 (`35 54 41 46 0B 00 00 00 00 00 00 00`), which throws `FormatException: unknown version/platform/CV/NHV combination` during Install. The game loads these files without complaint.

Raw `patch3` mods and Disrupt Manager packages therefore cannot be used together on WD2.

### WD2 Redirector: loose files without repacking

WD2 Redirector (Nexus Mods `watchdogs2` mod 385) is a separate ASI plugin that skips the repack step entirely. Its archive holds `bin/wd2_redirector.asi` plus Ultimate ASI Loader as `bin/xinput9_1_0.dll` (version 1 used `dinput8.dll`, which collides with ScriptHook's). When the game opens its newest patch archive, the plugin hands it an index that also lists the files in `data_win64\RedirectorData` and serves their data from there. Files keep their path inside the patch archive (`RedirectorData\generated\databases\generic\weatherpreset.lib`), override the same file in a packed `patch3` mod, and no game file is written. Confirmed working on the Ubisoft Connect version (the mod page lists only Steam as tested). Log: `bin\wd2redirector.log`.

Loose-file mods on Nexus Mods come in three shapes: inside a folder standing for the patch archive (`patch\`, mostly; also `loose_patch_files\`), starting at one of the archive's top folders (`generated`, `graphics`, `ui`, `soundbinary`, `domino`, `languages`, `sequences`, `worlds`, `engine`), or as bare files whose place the mod page gives (`.lib`/`.obj` in `generated\databases\generic`, `.loc` in `languages`, `gfx_*.xbt` in `graphics\gfx\_common`).

### Launch argument

Disrupt Manager launches WD2 with `-eac_launcher` (`WatchDogs2.LaunchParams`), which starts the game without Easy Anti-Cheat. Legion has no anti-cheat and no launch argument.

---

## What the Vortex extensions do

| Behaviour | `game-watchdogs2` | `game-watchdogslegion` |
| --- | --- | --- |
| Package installer | Re-zips each outermost `info.xml` folder with `util.SevenZip` into `<name>.zip` in the package folder; ready-made inner zips are copied as-is | Same |
| Raw patch archives | Installed to `data_win64`; variant picker when an archive holds several `.fat` folders | Same (`patch.*`, `patch_english.*`) |
| Disrupt Manager | Tool entry; download offered when a package is deployed (no automatic download) | Tool entry; downloaded during game setup |
| After deploy, package enabled | "Run Disrupt Manager" notice | Same |
| Empty `patch3` | Created (plain files, `wx` flag so an existing archive is never overwritten) when a package is enabled and no patch archive mod is | Not needed |
| Conflict notice | Shown when packages and patch archive mods are both enabled | Not needed |
| Custom Launch tool | `-eac_launcher` | No parameters |
| Loose-file mods | Installed to `data_win64\RedirectorData` (all three shapes above); WD2 Redirector has its own installer (to `bin`, names unchanged) and its download from Nexus Mods is offered when a loose-file mod installs or deploys without it | Not available (no Redirector for Legion) |

If a raw `patch3` mod is deployed later, Vortex renames the existing `patch3` files to `.vortex_backup` and restores them on purge (`NTFS_LINKS.md`).

---

## See also

`NEXUSTOOLS_MODLOADER.md` (the Watch Dogs 1 loader: runtime-mounted, nothing repacked; contrast with this repack model). `SNAKEBITE_CLI.md` and `SIMPLE_MOD_FRAMEWORK.md` (other loaders that rebuild game archives with their own manager). `NTFS_LINKS.md` (`.vortex_backup` handling for files Vortex finds in the way). `ARCHIVE_HANDLER.md` (`util.SevenZip`, used to re-zip packages). `NOTIFICATIONS_DIALOGS.md` (the deploy-notice pattern).
