# SnakeBite Command Line

SnakeBite is the mod loader for *Metal Gear Solid V: The Phantom Pain*. It does not deploy loose
files: it repacks a mod's contents **into the game's own `.dat` archives** and records what it did
in a database. A file sitting in a folder is therefore not an installed mod, and no amount of
deploying makes it one — SnakeBite has to be run over it.

SnakeBite accepts command-line arguments, which lets an extension drive it directly instead of
telling the user to open its window and click through the same steps. This document records the
argument set, the checks the command line applies that its own interface does not, the shapes of
the two state files involved, and the timings measured against a live install.

Everything below was verified against SnakeBite 0.9.2.5 and a game reporting version `1.0.15.0`.

---

## Arguments

| Argument | Effect |
| --- | --- |
| `-i` | Install. This is the default, so bare paths are installed |
| `-u` | Uninstall. The arguments are mod **names**, not file paths |
| `-c` | Skip the conflict check entirely |
| `-d` | Silently reset the stored archive hash |
| `-s` | Skip database cleanup |
| `-x` | Close when finished. Without it the window opens and stays open |
| `-completeuninstall` | Only honoured when it is the **only** argument |

Install and uninstall cannot be mixed in one run: the mode is a single flag, so the last one wins.
Removing and installing in the same operation means two separate invocations, uninstall first.

`-i` accepts either file paths or a folder. Folder mode is non-recursive, matches `*.mgsv` only,
and installs in alphabetical order; explicit file arguments are installed in the order given, which
is the only way to control install order.

### The path argument is case-sensitive

A path argument is accepted only when it passes `File.Exists(p) && p.Contains(".mgsv")`, and
`Contains` is an ordinal comparison. A mod shipping `Foo.MGSV` is **silently skipped** — no error,
no log line. Folder mode does not have this problem, because the directory enumeration is
case-insensitive. Any extension passing file paths should normalise the extension to lower case
when it writes the file out.

---

## `-c` is mandatory in practice

Without `-c`, SnakeBite runs `CheckConflicts` before installing, and that check calls
`SettingsManager.IsUpToDate(modVersion)`, which requires the installed game version to equal the
game version the mod declares — exactly, with special cases only for `0.0.0.0` and `1.0.15.2`. A
mod built against `1.0.15.3` will not install on a game reporting `1.0.15.0`.

Two things make this fatal for automation:

- **The interface does not apply the same rule.** Its own filter checks the SnakeBite version a mod
  was built with and never looks at the game version, so mods that install fine by hand are
  rejected on the command line.
- **The failure is a message box, and it logs nothing.** With no window to click, the run ends with
  exit code 0 having installed nothing, and the log stops after `Doing cmd line args`.

In a live round trip, `-i <file> -x` exited 0 in 8 seconds and installed nothing; the identical run
with `-c` added installed the mod in 6 seconds and logged
`[Install] Installation finished in 5210 ms`.

`CheckConflicts` also compares an incoming mod against **already-installed** mods, so re-running an
install over the current set makes every mod conflict with itself. Worse,
`ProcessInstallMod` returns on the first failed check, so one bad mod ends the whole batch.

### What `-c` costs, and what to do about it

`-c` discards the useful half of the check along with the unusable half. Since a mod's metadata is
readable without SnakeBite (see below), the worthwhile checks can be re-implemented by the caller:

- Refuse a mod whose metadata is missing or unparseable, and name it, rather than letting the batch
  fail.
- Refuse a mod built with a SnakeBite version older than `0.8.0.0`.
- Ask before installing a mod built for a **newer** SnakeBite than the one installed. This mirrors
  the interface's own filter.
- Compare the file paths a mod claims against those the installed mods already claim, and surface
  real overlaps for confirmation. Normalising separators and case is enough; the stored hashes
  agree with a plain path comparison.
- **Ignore the declared game version.** The interface ignores it, and enforcing it rejects nearly
  every published mod.

`InstallManager.InstallMods` has no duplicate check of its own, so installing a mod that is already
installed writes a second database entry. A caller must work out what is missing and install only
that, whether or not `-c` is used.

---

## State files

### `<GameDir>\snakebite.xml`

The database of what is currently installed, and the only reliable answer to "did that work". A
mod that was silently dropped is visible nowhere else.

```xml
<Settings>
  <Mods>
    <ModEntry Name="SWolfPlayable" Version="1.0" Author="...">
      <QarEntries><QarEntry FilePath="..." Hash="..." /></QarEntries>
      <FpkEntries><FpkEntry FpkFile="..." FilePath="..." Hash="..." /></FpkEntries>
      <FileEntries><FileEntry FilePath="..." Hash="..." /></FileEntries>
    </ModEntry>
  </Mods>
</Settings>
```

The file is absent until SnakeBite's setup wizard has been completed for the install. Treat that
as "not set up yet" rather than "nothing installed" — running the command line first will not
create it.

### `metadata.xml`, inside each `.mgsv`

A `.mgsv` file is a plain zip archive with `metadata.xml` at its root. The root element is
`ModEntry`, carrying `Name` and `Version` attributes, `<MGSVersion Version="…"/>` and
`<SBVersion Version="…"/>` children, and the same three entry lists as the database.

**The file name is not the mod name.** Uninstall takes names, so the mapping has to be read from
each archive:

| File | `Name` in its metadata |
| --- | --- |
| `Bionic Arm (DD).mgsv` | `V Awakened Bionic Arm` |
| `PlaySWolf.mgsv` | `SWolfPlayable` |
| `VAW Camos.mgsv` | `V Awakened Camos` |

Archives run large — 86 MB is ordinary and 1.18 GB happens — so extract the single entry rather
than the archive. A minimal zip reader (locate the end-of-central-directory record, walk the
central directory, `zlib.inflateRawSync` the one entry) reads the name out of a 1.18 GB archive in
about 3 ms with no temporary files and no process spawn. Note that `util.SevenZip`'s `extractFull`
does **not** pass a file filter through the way the `7z.exe` command line does; it extracts nothing
and still resolves successfully, which looks exactly like an archive with no metadata.

The entry lists are worth reading on demand and not worth caching — one large mod's metadata alone
is 945 KB of XML.

### `<SnakeBiteDir>\Logs\log.txt`

Rotated on every launch, with the previous runs kept as `log_prev.1.txt` through `log_prev.3.txt`.
Useful markers:

- `Doing cmd line args` — arguments were seen. A run that stops here hit a message box.
- `[Mod] Checking conflicts` — the command-line install path.
- `[PreinstallCheck]` — the interface's install path, not the command line's.
- `[Install] Installation finished in <n> ms` / `[Uninstall] Uninstall took <n> ms`.

SnakeBite's install folder is recorded by its installer under `HKEY_CURRENT_USER\SOFTWARE\SnakeBite`
as the key's default (unnamed) value. Read it rather than assuming the default folder — see
`WINAPI_BINDINGS.md`.

---

## `-completeuninstall`

Restores the original `.dat` archives and deletes `snakebite.xml`. Three consequences worth
spelling out to a user before running it:

- Every installed mod is removed, including mods installed outside the caller's control.
- SnakeBite's own settings are gone, so its setup wizard runs on the next launch and repacks the
  archives again.
- It only works as the sole argument, which means `-x` cannot be passed alongside it, so the
  window may stay open until it is closed by hand.

This is a deliberate "put the game back" button, not a purge hook.

---

## Timings and other costs

Measured on the reference install:

| Operation | Time |
| --- | --- |
| Install, one mod, with `-c` | ~6 s |
| Uninstall, one mod | ~65 s |
| Install pointed at an empty folder | ~1 s, exits clean |
| Reading `metadata.xml` out of an 86 MB archive | ~200 ms with `7z.exe`, ~3 ms with a zip reader |

Every install and uninstall also writes an autosave preset (`RevertChanges.MGSVPreset`, ~32 MB)
unless the user turns that off in SnakeBite's settings. There is no argument for it, so it can only
be mentioned in documentation as a way to make syncs faster.

Because a sync repacks the game archives, it is a deliberate action rather than something to run on
every deployment by default.

---

## Modal windows that pre-empt the arguments

Arguments are processed after start-up, so anything that stops start-up stops the run. None of
these fired on a healthy install, but automation should not assume the process is always headless:

- The setup wizard, when settings are missing or invalid.
- "Game archive has been modified", when the stored archive hash does not match.
- A missing `chunk7`/`texture7` archive.
- A prompt when the game is newer than the version SnakeBite was built for.

---

## Driving it from a Vortex extension

The shape that works, given all of the above:

1. Read `snakebite.xml` for the installed set. Its absence means setup has not been run — say so
   rather than proceeding.
2. Enumerate the deployed `*.mgsv` files and read each one's name from its `metadata.xml`.
3. Work out the difference. Install what is deployed and not installed; uninstall what is
   **recorded as previously installed by the extension** and is no longer deployed.
4. Never uninstall a mod the extension did not install. Keep that record outside the mod list —
   a mod removed from Vortex takes its attributes with it, and its database entry would then be
   orphaned permanently. Anything both deployed and installed can be adopted into that record, so
   the two sides converge over time.
5. Run the uninstall leg, then the install leg, as two invocations. `api.runExecutable` resolves
   when the process closes, so each leg is awaitable and its exit code usable.
6. Re-read `snakebite.xml` afterwards. Anything still missing was silently dropped; report it and
   point at the log.

Report mods that are installed but neither deployed nor in the record, since an older hand-installed
copy of a mod fights the deployed one over the same game files — but offer their removal as its own
confirmed step rather than doing it as part of the sync.

---

## See also

`WINAPI_BINDINGS.md` (reading SnakeBite's install folder out of the registry, and why a registry
key path is not a filesystem path). `RUN_EXECUTABLE.md` (`api.runExecutable`, its resolution on
process close, and `suggestDeploy`). `NOTIFICATIONS_DIALOGS.md` (the activity notification around a
long-running run, and the confirmation dialogs the conflict and restore steps need).
`INSTALLER_SYSTEM.md` (`registerInstaller`, which places the `.mgsv` files this reads).
`FILE_PARSING.md` (`xml2js`, used for both state files). `EVENTS.md` (`did-deploy` and `will-purge`,
the two hooks a sync can be wired to). `TOOLBAR_ACTIONS.md` (`registerAction`, and the fact that
toolbar buttons are grouped by icon).
`SIMPLE_MOD_FRAMEWORK.md` (the other loader in this repo that owns its own mod store, and the same
deploy-then-hand-off notification shape - though it takes archives through a GUI rather than a CLI).
