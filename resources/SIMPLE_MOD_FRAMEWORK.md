# Simple Mod Framework

Simple Mod Framework (SMF) is the mod loader for *HITMAN World of Assassination*. It is not a
file-copy loader: mods live inside the framework's own directory tree, are registered in the
framework's config, and are applied to the game by the framework's deploy step. A mod folder that
appears in the right place without going through the framework's own ingest path is not an installed
mod — it is a state the framework treats as an error and complains about at startup.

That makes SMF a handoff target rather than a deploy target. A mod manager's job is to put an
archive somewhere the user can find it and let the framework's **Add a Mod** button take it from
there. This document records the framework's layout, the two folders that must be left alone, the
exact contract the Add-a-Mod dialog enforces, and why the framework's Nexus Mods installer is not
the framework.

Verified against `atampy25/simple-mod-framework` at 2.33.42 (2026-08-28) and
`atampy25/simple-mod-framework-installer` at master.

---

## Layout

The framework installs into `<GameFolder>\Simple Mod Framework`:

| Path | Role |
| --- | --- |
| `Deploy.exe` | The deploy step that writes mods into the game |
| `Mod Manager\Mod Manager.exe` | The Electron GUI the user drives |
| `Mods\` | Where installed mods live. **Framework-owned** |
| `config.json` | `loadOrder` and `knownMods` — the framework's record of what is installed |
| `Third-Party\7z.exe` | Used to unpack archives handed to Add a Mod |

`config.json` ships seeded with `loadOrder: []` and `knownMods: []`, so a fresh install applies
nothing to the game until the user enables mods in the GUI.

---

## The `Mods` folder is framework-owned

Nothing outside the framework may write into `<GameFolder>\Simple Mod Framework\Mods`. Three
separate checks enforce this, and each one fails loudly:

- **Startup, Mod Manager main page.** It reads the folder, drops the marker file by exact name, and
  if *any remaining entry is a file* it raises a blocking "There's a file in the Mods folder" modal.
  The file test is a plain `statSync(...).isFile()`, which **follows symlinks** — so a deployed link
  counts as a file just as much as a real one. Deploying mod archives here disables the GUI outright.
- **Startup, mod list page.** Any mod present in the folder but absent from `config.json`'s
  `knownMods` raises an "Incorrectly installed mod" dialog. Anything placed there by another tool is
  by definition unknown, so it always trips this.
- **Enumeration.** Every entry in the folder is treated as a mod and parsed as one. Malformed
  entries throw rather than being skipped.

The folder must nevertheless **exist**: the Mod Manager reads it unconditionally at startup. A mod
manager integrating with SMF should create it empty and never touch it again.

### The example mod inside the release archive

The release build copies a `For Build/` directory into the distribution, so every `Release.zip`
carries two entries inside `Mods`:

- `Mods\Managed by SMF, do not touch` — a 0-byte marker **file**
- `Mods\Realistic AI\` — a complete example mod (`manifest.json` with id `Atampy26.RealisticAI`,
  plus `content-normal`, `content-manhunt` and `content-extreme` folders)

The marker is only ever filtered out; nothing reads it and nothing requires it. An empty `Mods`
folder is a correct state.

A mod manager that installs the framework from `Release.zip` must therefore **drop the whole `Mods`
directory from its install instructions**. Extracting it means the example mod arrives in the folder
without being in `knownMods`, which trips the "Incorrectly installed mod" dialog on the user's first
launch. Dropping it at install time is also what keeps the folder clean afterwards: if nothing
managed ever lands there, purging and redeploying cannot disturb it either.

---

## What Add a Mod accepts

Add a Mod takes exactly one path from a file dialog, and branches on it.

### RPKG files

A `.rpkg` file is accepted directly. The framework prompts for a name, copies the file to
`Mods\<name>\<chunk>\<file>.rpkg` and appends the name to `knownMods`. The chunk is taken from the
first `chunk[0-9]*` segment found in the source path, defaulting to `chunk0`.

This is the whole reason loose `.rpkg` files are worth deploying as-is rather than repacking: the
user picks the file and names it in the dialog.

### Archives

Anything else is unpacked with the bundled 7-Zip into a staging folder, and then **all** of the
following must hold, or the archive is rejected:

- every top-level entry of the staging folder is a **directory** containing a `manifest.json`;
- there are **zero files at depth 0** — a single loose `README.txt` or a stray `manifest.json`
  sitting at the archive root fails this check on its own;
- each folder's `manifest.json` parses as JSON5 and validates against the framework's manifest
  schema.

Only then is the staging folder copied into `Mods` and the mod ids appended to `knownMods`.

So the artifact to hand a user is **one archive whose root holds nothing but mod folders, each with
a valid manifest**. Anything else — a manifest at the archive root, a readme beside the mod folder —
has to be reshaped into that form first.

### Repacking to fit

A mod manager that receives mods in arbitrary shapes can normalise them by repacking:

- If the archive root already holds folders with manifests, pack those folders and leave loose files
  behind. This handles both the already-correct case and the common "mod folder plus readme" case.
- If the manifest sits at the archive root, wrap everything in a single folder named after the
  mod, then pack that folder.
- Name the archive after the mod rather than after the download. It is the name the user picks from
  a file dialog, so it should read as the mod.
- Leave archives-inside-archives alone. A mod already packed as a nested `.zip` is in the shape the
  dialog wants.

---

## The Nexus Mods installer is not the framework

The framework's Nexus Mods page carries a single file, an installer executable. It is not a copy of
the framework and it is not a version of it — as of 2026-08 the page reads 2.32.3 against a current
GitHub release of 2.33.42, roughly three years apart.

The installer is a small Rust program, and this is its entire behaviour:

1. `HEAD` the GitHub `releases/latest/download/Release.zip` to show a download size.
2. Find the game folder — Legendary's `installed.json`, then Epic's `ModSdkMetadataDir` manifests,
   then Steam's `libraryfolders.vdf` for app 1659040 / 1847520, then the Microsoft Store package.
3. Download that **same** `Release.zip` and extract it into `<GameFolder>\Simple Mod Framework`.
4. Write a Start Menu shortcut to `Mod Manager\Mod Manager.exe`.

There are no registry writes, no config edits and no game-file patching. It also **refuses to run**
when `<GameFolder>\Simple Mod Framework` already exists, so it cannot be used as a repair tool
either.

The practical consequences for an integration:

- Install the framework from the GitHub release. The installer offers nothing that route does not
  already do, and it is chronically behind.
- The installer is still worth **downloading**, because Nexus Mods counts the download against the
  mod page. Download it once, do not install it, and never run it. A courtesy download like this
  should fail silently — it must not block or shout over the real install.
- Do that download exactly once and record the fact in persistent state. Re-deriving it from the
  downloads list re-arms as soon as the user clears their downloads, which turns a one-off courtesy
  into a repeat download every time the framework is reinstalled.
- Gate the download on that stored flag alone. Tying it to "is the framework missing" means it can
  only ever fire on a fresh install, and never fires at all for the users who already have the
  framework — which is most of them.
- A download that nothing installs is not kept on disk, so an empty download folder afterwards is
  the expected result. The stored flag, not the file, is what says the download happened.

### Not a real problem

The Mod Manager checks for the NTFS alternate data stream `config.json:Zone.Identifier` and shows a
one-shot informational modal when it finds one, deleting the stream afterwards. Vortex's downloader
and extractor do not write Mark-of-the-Web, so this does not appear in practice.

---

## See also

`GITHUB_API.md` (the release endpoints the framework is installed from, and the asset-naming rules
that decide how its version is resolved).
`NEXUS_MODS_API.md` (the mod-files endpoint used to resolve the installer's current file id, and the
`nxm://` URL shape a download is started from).
`DOWNLOADER.md` (the GitHub requirements auto-downloader that installs the framework itself, and the
requirement fields involved).
`VORTEX_DOWNLOAD_MGMT.md` (`start-download` and the `allowInstall` flag that makes a
download-without-install possible).
`VORTEX_MOD_INSTALL.md` (the installer contract the repacking above is expressed in — instruction
types, `setmodtype`, and the staging folder the repack happens in).
`SNAKEBITE_CLI.md` (the other loader in this repo that repacks mods into the game rather than
deploying them, and the same deploy-then-hand-off notification pattern).
`NOTIFICATIONS_DIALOGS.md` (the deploy notification used to tell the user the handoff is pending).
