# NexusTools Mod Loader (Watch_Dogs)

NexusTools is the mod loader and ScriptHook for the original _Watch_Dogs_ (2014), by Troplo
(`thetroplo`). Nexus mod page 491. It is closed-source — no public repository exists (the author's
GitHub org points to a private Forgejo instance, "DM Troplo for an account") — so most of this
comes from reading the shipped binary rather than source or official CLI documentation, which does
not exist. Sections below are marked by how they were established: reading the binary alone, or
confirmed against a real, already-modded install.

Only `game-watchdogs` uses this tool. `game-watchdogs2` and `game-watchdogslegion` use an unrelated
loader (`DisruptManager.exe` / "Mod Loader"), not covered here.

---

## Architecture

Two files matter, both dropped in the game root (`bin/` alongside `Watch_Dogs.exe`):

| File | What it actually is |
| --- | --- |
| `ModManager.exe` | A ~380 KB MinGW stub. Its only real work is `LoadLibraryA` on `TroploNexusTools.ipe` and calling the exported `InitModManager`. No argv handling, no logic. |
| `dinput8.dll` | A proxy DLL (the classic dinput8-hijack pattern) that loads alongside `Watch_Dogs.exe` at launch and pulls in `TroploAsiInjectionHelper.asi`, which in turn loads the same `TroploNexusTools.ipe` into the game's own process via `InitTroploNexusTools`. |

`TroploNexusTools.ipe` (~15 MB, a PE32+ DLL with a disguised extension) is the entire application:
ImGui-based UI, `nlohmann::json`, OpenSSL, libcurl, Sentry crash reporting. It exports exactly five
names: `Entrypoint`, `InitModManager`, `InitTroploNexusTools`, `SetCmdline`, `Shutdown`. Both host
processes (the standalone manager and the injected copy inside the game) run the same code; only
the entry point differs.

**This means there are two ways to run NexusTools, not one**: the standalone `ModManager.exe` for
browsing/managing mods outside of play, and the in-game overlay that the `dinput8.dll` hook shows
while `Watch_Dogs.exe` is actually running. Vortex's `tools` entry only exposes the former.

### Mods are runtime-mounted, not repacked — confirmed live

Reading the binary alone suggested this ("priority-based custom archive loading... without
requiring file repacking" in the mod description; `fs_archive_mount` / `fs_archive_unmount` /
`fs_archive_ls` console commands with `type=mod_archive` vs `type=base_archive`). A real install
with four Vortex-deployed mods active confirms it directly — `%APPDATA%\Troplo\Nexus\cout.log`
shows, on ordinary game boot, no popup and no separate program run:

```text
Processing mod: mods/minimal_gps_markers
  Added at slot 50: mods/minimal_gps_markers/minimal_gps_markers.dat Priority: -5
FileHookManager scanning mod workspace: Minimal GPS Markers path: ...\data_win64\mods\minimal_gps_markers\
Mount succeeded for 50
```

...repeated per mod. This is the opposite of SnakeBite (`SNAKEBITE_CLI.md`), which repacks a
mod's contents permanently into the game's `.dat` files — there is no batch "build" step here that
produces new game archives, and no external process for Vortex to await.

### The prelaunch window only gates a _changed_ mod set

The hook computes an FNV32-style hash of the mods folder on boot and compares it against
`ModLoader_ModInstallState` (a plain integer) stored in its settings file. **Unchanged since last
launch → straight to the mount log above, no window at all** — confirmed by the log excerpt.
Changed → an in-game "prelaunch window" appears: "The following mods will be installed... Re-order
the mod load order if you wish, and please restart your game to complete the install." Confirming
there _is_ the entire "install" step for that one launch; there is no separate program required
afterward — contrary to what a `ModManager.exe`-run-after-every-deploy pattern (the SnakeBite/
SimpleModFramework shape, and the current `deployNotify()` in `game-watchdogs/index.js`) would
suggest. In the steady state — no new/removed/reordered mods since the last time the game booted —
NexusTools is already fully silent and automatic with zero Vortex involvement.

---

## Real, on-disk state (verified against a live, already-modded install)

Everything NexusTools persists lives under **`%APPDATA%\Troplo\Nexus\`** — *not* next to
`Watch_Dogs.exe`, despite `ModManager.exe`/`dinput8.dll`/`TroploNexusTools.ipe` themselves living in
the game's `bin\` folder:

| File | Contents |
| --- | --- |
| `settings.json` | One JSON object, `{ "commands": {...}, "hotkeys": {}, "lua_cmds": {} }`. `commands` is a flat map of every tunable (camera/trainer/UX toggles, `ModLoader_AlwaysShowPrelaunchWindow`, `ModLoader_DisablePrelaunchWindow`, `ModLoader_ModInstallState`) — confirmed real, current values read off a live file. |
| `localmodsconfig.json` | The mod list + load order + enable state: `{ "mods": [{ "friendlyId", "enabled", "priority", "enableWorkspaces" }, ...] }`, one entry per `data_win64\mods\<folder>`, `friendlyId` matching the folder name. This is NexusTools' load-order file — the direct analogue of Lobotomy BaseMod's `BaseModList_v2.xml` (`LOBOTOMY_BASEMOD.md`). |
| `cout.log` | The in-game hook's runtime log — huge (tens of thousands of lines on a normal session, mostly Dunia Engine spam), but the mod-mount block near the top is unambiguous. |
| `cout.ModManager.log` | The standalone `ModManager.exe`'s own log — much shorter, lists each mod with its friendly name and priority on open. |
| `imgui.ini` | Plain ImGui window-layout state. Not interesting. |
| `versions/*.bin` | Per-game-version pattern-scan cache, named by a hash. Not interesting. |

No `cmdline.ini` exists on this live install, and nothing in `settings.json` or the logs references
one being read from anywhere. **A `cmdline.ini` in the game's `bin\` folder — the original
string-evidence-only guess in this document — was never confirmed and is very likely the wrong
location**, given every other piece of state this tool keeps lives under `%APPDATA%\Troplo\Nexus\`
instead. If a `cmdline.ini` mechanism exists at all, that folder is the far better-evidenced guess
for where to place one.

### The confirmed, lower-risk lever: patch `settings.json` directly

`commands.ModLoader_DisablePrelaunchWindow` is a real key, observed `false` on a live install where
the popup has never been suppressed. Setting it `true` is what NexusTools' own in-app Settings UI
would do — flipping it from outside the app via a JSON merge-patch is the same lever the original
`cmdline.ini` idea was reaching for, minus the unverified path and unverified file format. This is
what `game-watchdogs/index.js` does, behind a settings toggle ("Skip NexusTools Confirm Window")
that defaults ON as of 2026-09-12.

**Confirmed live 2026-09-12: setting this key skips the popup without skipping the mount.** Flipped
the setting on, changed the deployed mod set so the hash would normally trigger the prelaunch
window, and confirmed both that no window appeared _and_ that the changed mod set was actually
active in-game. With this confirmed, the extension's `deployNotify()` "Run NexusTools to Install
Mods" notification is now skipped whenever the toggle is on — it is no longer needed once NexusTools
is applying changes silently on the game's own next launch.

---

## An experimental Load Order page over `localmodsconfig.json`

`game-watchdogs/index.js` also registers a standard `context.registerLoadOrder` (FBLO) page —
the same kind of integration Lobotomy BaseMod's `BaseModList_v2.xml` gets — whose
`serializeLoadOrder`/`deserializeLoadOrder` read and write `localmodsconfig.json` directly instead
of leaving reordering to NexusTools' own window.

It cross-references the actual folders under `data_win64\mods\` (ground truth of what is deployed)
against the JSON's recorded `priority`/`enabled` per `friendlyId`, and never drops an entry the
JSON already knows about that Vortex is not currently managing (a hand-installed mod, or one whose
folder was since removed) — that entry is kept, appended after the managed ones, rather than
silently disappearing from NexusTools' own bookkeeping.

**Confirmed live 2026-09-12: `localmodsconfig.json` is the real source of truth for mount order.**
Reordering/enabling/disabling mods through this page, then launching the actual game, produces the
in-game result the file describes — this is not just something NexusTools reads for its own GUI
listing.

The first build of this page showed every entry as "Not Managed by Vortex". Vortex's load order UI
only shows a mod as managed when its entry carries a `modId` matching a real installed mod — the
page never set one. Fixed by stamping the deployed folder name onto each installed mod as an
attribute at install time (`installMod()`), then looking that attribute up when building the page's
entries. Only affects mods installed after the fix — a mod installed earlier needs reinstalling
through Vortex to pick up the attribute.

The page has since been brought up to the fuller "tier G" standard described in
`LOAD_ORDER_ITEM_RENDERER.md` and `NON_UE_LOAD_ORDER_PAGES.md` (already used by several other games
in this collection): custom row rendering with a thumbnail, right-click context menu (enable/
disable, lock position, move to top/bottom, open mod/staging folder, open mod page), position
locking, and status filtering (enabled/locked/unmanaged). Ported from
`game-warhammer40kdarktide/index.js`. Confirmed live 2026-09-12 alongside the base page's test.

---

## Why this is not a SnakeBite-style integration

`SNAKEBITE_CLI.md` is worth driving from an extension specifically because SnakeBite has a
real, documented external CLI (`-i`/`-u`/`-c`/`-x`) that repacks archives in a separate process
Vortex can await via `api.runExecutable`. NexusTools has no external process step to await at all —
the entire "install" happens inside the game's own process on launch, confirmed by the live log
above. There is nothing for Vortex to shell out to; the only lever available is a settings file that
changes what the _game_ does when the player next launches it, not something Vortex runs on deploy.

---

## See also

`SNAKEBITE_CLI.md` (the loader this was compared against — real external CLI, repack-based,
contrast in every respect). `LOBOTOMY_BASEMOD.md` (its `BaseModList_v2.xml` is the closest analogue
to `localmodsconfig.json` here) and `SIMPLE_MOD_FRAMEWORK.md` (another loader needing its own
manager to ingest a mod), for further contrast. `RUN_EXECUTABLE.md` (`api.runExecutable`, not usable
here the way it is for SnakeBite, since there is no separate process to await).
`NOTIFICATIONS_DIALOGS.md` (the `deployNotify` pattern in `game-watchdogs/index.js`, now skipped
whenever the popup-suppress toggle is on, since the loader already applies changes for the user on
ordinary next launch in that case).
`LOAD_ORDER_ITEM_RENDERER.md` and `NON_UE_LOAD_ORDER_PAGES.md` (the fuller custom-renderer/context-
menu/status-filter pattern this page's planned follow-up would bring it up to).
