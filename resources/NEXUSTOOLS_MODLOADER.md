# NexusTools Mod Loader (Watch_Dogs)

NexusTools is the mod loader and ScriptHook for the original _Watch_Dogs_ (2014), by Troplo
(`thetroplo`). Nexus mod page 491. It is closed-source — no public repository exists (the author's
GitHub org points to a private Forgejo instance, "DM Troplo for an account") — so everything below
comes from reading the shipped binaries (v1.1.12, built 2026-08-17) rather than source or official
CLI documentation, which does not exist.

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

### Mods are runtime-mounted, not repacked

The mod description and the strings agree: NexusTools supports "priority-based custom archive
loading... without requiring file repacking." Concretely, the binary carries console commands
`fs_archive_mount` / `fs_archive_unmount` / `fs_archive_ls` operating on `type=mod_archive` vs
`type=base_archive`. Mods placed in `data_win64\mods\<ModFolder>` are mounted as a virtual
overlay over the game's own archives at runtime — this is the opposite of SnakeBite
([[reference_snakebite]]), which repacks a mod's contents permanently into the game's `.dat` files.
There is no batch "build" step that produces new game archives.

### The prelaunch window is the only gate

When `Watch_Dogs.exe` starts, the hook computes an FNV32 hash of the mods folder. If it differs
from the last recorded hash, an in-game "prelaunch window" appears: "The following mods will be
installed... Re-order the mod load order if you wish, and please restart your game to complete the
install." Confirming there is the entire "install" step — there is no separate program to run
afterward, contrary to what a `ModManager.exe`-run-after-deploy pattern (the SnakeBite/SimpleModFramework
shape) would suggest.

---

## No traditional CLI — but there is a file-based one

Neither binary parses real `argv` for anything user-facing (`ModManager.exe`'s only `GetProcAddress`
lookup is `InitModManager`, called with no parameters). But the strings include a `cmdline.ini`
file, immediately preceded in the binary by the literal string `Command line arguments:` — this is
the mechanism for passing flags to a DLL that has no command line of its own to parse (the actual
process is `Watch_Dogs.exe`, launched by Steam/Ubisoft Connect/Epic, not something a mod loader can
inject arguments into after the fact).

Two recognized flags were found as plain strings, immediately adjacent to the prelaunch-window
settings keys (`ModLoader_AlwaysShowPrelaunchWindow`, `ModLoader_DisablePrelaunchWindow`):

| Flag | Apparent effect |
| --- | --- |
| `-prelaunch_always` | Force the prelaunch window to show every launch, even with no mod changes |
| `-prelaunch_never` | Suppress the prelaunch window entirely |

The persisted form of the same toggle lives in `./settings.json` (opened as a relative path, so —
given the hook runs inside `Watch_Dogs.exe` — almost certainly relative to the game's own working
directory). A `ModLoader_ModInstallState` key is also read/written there, alongside the two
prelaunch keys.

### What this would mean for automation, if confirmed live

If `-prelaunch_never` (via a `cmdline.ini` dropped in the game folder) suppresses the window without
also blocking the underlying mount step, NexusTools would apply pending mod changes silently on the
next game launch — no `ModManager.exe` run, no click-through, no restart-to-confirm beyond the
ordinary "launch the game" a player does anyway. That would make NexusTools behave like the
loose-file loaders Vortex already handles well (deploy and go), rather than needing the
SnakeBite-style external-process sync this repo already has a pattern for.

**This has not been verified against a running install** — it comes from string evidence alone
(binary is stripped, closed-source, obfuscated with Sentry/Crashpad). Confidence is high on the
architecture (runtime archive mount, no repack, no batch CLI) and medium on the exact effect of
`-prelaunch_never` and the precise `cmdline.ini` file format (bare flag text vs. an INI section
were not distinguishable from strings alone). Verify live before wiring this into
`game-watchdogs/index.js`: drop a `cmdline.ini` containing `-prelaunch_never` next to
`Watch_Dogs.exe`, change the mods folder, launch, and confirm no window appears and the mod is
actually active in-game.

---

## Why this is not a SnakeBite-style integration

[[reference_snakebite]] is worth driving from an extension specifically because SnakeBite has a
real, documented external CLI (`-i`/`-u`/`-c`/`-x`) that repacks archives in a separate process
Vortex can await via `api.runExecutable`. NexusTools has no external process step to await at all —
the entire "install" happens inside the game's own process on launch. There is nothing for Vortex
to shell out to; the only lever available is the `cmdline.ini` flag file, which changes what the
*game* does when the player launches it, not something Vortex runs on deploy.

---

## See also

`SNAKEBITE_CLI.md` (the loader this was compared against — real external CLI, repack-based,
contrast in every respect). `LOBOTOMY_BASEMOD.md` and `SIMPLE_MOD_FRAMEWORK.md` (the other
loaders in this repo needing their own manager to ingest a mod, for further contrast).
`RUN_EXECUTABLE.md` (`api.runExecutable`, not usable here the way it is for SnakeBite, since
there is no separate process to await). `NOTIFICATIONS_DIALOGS.md` (the current
`deployNotify` pattern in `game-watchdogs/index.js`, which this finding calls into question).
