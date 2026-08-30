# BepInEx

`https://github.com/BepInEx/BepInEx` — a plugin and preload-time patcher framework for .NET games.
Its own description is *"a plugin / modding framework for Unity Mono, IL2CPP and .NET framework
games (XNA, FNA, MonoGame, etc.)"*, and that sentence is the single most important fact about it:
one project name covers **three unrelated runtimes**, each with its own build, its own bootstrap
mechanism, its own folder layout, and its own plugin base class. Anything that treats "BepInEx" as
one thing will get at least one of those wrong.

The framework itself does nothing to a game. It injects a .NET runtime host into the game process,
loads assemblies from known folders, and gives them a logger, a config system, and HarmonyX for
runtime patching. Everything a user calls "a BepInEx mod" is one of those assemblies.

---

## Two Release Lines

BepInEx has never shipped a stable 6.x release. The consequence is that the stable GitHub releases
and the continuous-integration builds are not "old version / new version" — they are **different
products covering different runtimes**.

| Line | Where | Runtimes covered | Newest |
| --- | --- | --- | --- |
| 5.x (stable) | GitHub releases | Unity Mono only | `v5.4.23.5` (2026-02-08) |
| 6.x (bleeding edge) | `builds.bepinex.dev` | Unity Mono, Unity IL2CPP, .NET Framework, .NET Core | build `#785` (`6.0.0-be.785`) |

A game on Unity's IL2CPP scripting backend, or any non-Unity .NET game, therefore has **no stable
BepInEx at all** — the bleeding-edge build is the only option, and that is a settled upstream state
rather than a temporary one. See `BEPINEX_BE_BUILDS.md` for the build host, its artifact naming, and
why builds are ordered by build number instead of by version.

### 5.x release assets

```text
BepInEx_win_x64_5.4.23.5.zip        <- Unity Mono, 64-bit Windows
BepInEx_win_x86_5.4.23.5.zip        <- Unity Mono, 32-bit Windows
BepInEx_linux_x64_5.4.23.5.zip      BepInEx_linux_x86_5.4.23.5.zip
BepInEx_macos_universal_5.4.23.5.zip
BepInEx_Patcher_5.4.23.5.zip        <- the hardpatcher, see below
```

The version is four segments (`5.4.23.5`), which is **not** semver — `semver.coerce` reduces it to
`5.4.23`, and two consecutive releases become indistinguishable. Compare these versions as strings
or segment by segment.

`BepInEx_Patcher_5.4.23.5.zip` contains exactly one file, `BepInEx.Patcher.exe`. It is the
*hardpatcher*: instead of relying on a proxy DLL being loaded at startup, it permanently rewrites
the game's own assembly so the entrypoint call is baked in. It exists for environments where the
proxy route does not work (some Wine/Proton setups, some launchers). It is a different install shape
from everything else described here, and a store file-validation pass reverts it.

### 6.x bleeding-edge artifacts

Each build publishes a matrix. The prefix identifies the runtime, not the game:

```text
BepInEx-Unity.Mono-win-x64-6.0.0-be.785+6abdba4.zip
BepInEx-Unity.IL2CPP-win-x64-6.0.0-be.785+6abdba4.zip
BepInEx-NET.Framework-net452-win-x86-6.0.0-be.785+6abdba4.zip
BepInEx-NET.Framework-net40-win-x86-6.0.0-be.785+6abdba4.zip
BepInEx-NET.CoreCLR-net6.0-win-x64-6.0.0-be.785+6abdba4.zip
BepInEx-NET.CoreCLR-netcoreapp3.1-win-x64-6.0.0-be.785+6abdba4.zip
```

plus `linux-x64`, `linux-x86` and `macos-x64` variants of the two Unity rows.

---

## How BepInEx Gets Into the Process

Stock builds use one of two mechanisms, and which one applies is decided by the runtime, not by
the version. Game-specific forks add two more, covered further down.

### Unity: UnityDoorstop

Both Unity variants ship [UnityDoorstop](https://github.com/NeighTools/UnityDoorstop) as a **proxy
DLL**. On Windows the file is `winhttp.dll`, dropped next to the game executable. Windows resolves
`winhttp.dll` from the executable's own directory before the system directory, so the game loads
BepInEx's copy, which forwards every real export onward and — before the game's own code runs —
starts a .NET runtime and calls into the assembly named in its config.

Three files land in the game root for this:

| File | Role |
| --- | --- |
| `winhttp.dll` | the proxy that Windows loads instead of the system DLL |
| `doorstop_config.ini` | tells Doorstop what to run and how |
| `.doorstop_version` | Doorstop version marker (`4.5.0` in BepInEx 5.4.23.5) |

The config's operative line is short:

```ini
[General]
enabled = true
target_assembly=BepInEx\core\BepInEx.Preloader.dll
redirect_output_log = false
boot_config_override =
ignore_disable_switch = false

[UnityMono]
dll_search_path_override =
debug_enabled = false
debug_address = 127.0.0.1:10000
debug_suspend = false
```

Notable properties of this arrangement:

- **`enabled = false` disables BepInEx without uninstalling it.** So does the `DOORSTOP_DISABLE`
  environment variable, unless `ignore_disable_switch = true`.
- **`target_assembly` is a path, not a name.** Anything implementing
  `static void Doorstop.Entrypoint.Start()` can be pointed at instead — which is exactly how other
  loaders (Unity Mod Manager among them, see `UNITY_MOD_MANAGER.md`) reuse Doorstop, and why finding
  `winhttp.dll` plus `doorstop_config.ini` in a game folder does **not** prove BepInEx is installed.
  Read `target_assembly` to know whose loader it is.
- **`dll_search_path_override`** exists for games shipping a stripped `mscorlib`; it prepends a
  folder to Mono's assembly search path.
- On Linux and macOS there is no proxy DLL. The archive ships `run_bepinex.sh`, the user edits
  `executable_name="";` to name the game binary (on macOS, the `.app` bundle name), makes it
  executable, and launches through the script. Under Steam that means editing the game's launch
  options rather than clicking Play.

### .NET Framework: a launcher executable

The `NET.Framework` and `NET.CoreCLR` builds have **no proxy DLL and no `doorstop_config.ini` at
all**. The whole archive is 21 entries:

```text
BepInEx.NET.Framework.Launcher.exe
changelog.txt
BepInEx/core/          (16 assemblies)
BepInEx/patchers/      (empty)
BepInEx/plugins/       (empty)
```

The user runs `BepInEx.NET.Framework.Launcher.exe` **instead of** the game executable. The launcher
starts the process itself, applies the preloader, and hands control to the game's entry point. That
is the whole XNA/FNA/MonoGame story: the game is an ordinary .NET Framework executable with no Unity
player to intercept, so the loader owns process startup rather than hooking it.

Consequences worth stating explicitly, because upstream never does — the documentation page
`articles/user_guide/installation/net_fw.md` in the BepInEx docs repository contains its title and
nothing else:

- Any launch shortcut, launcher entry, or store "Play" button must be repointed at the launcher, or
  the game starts unmodded with no error and no log.
- Choose the build by the game's target framework: `net35` and `net40` cover older XNA 3.x/4.0
  titles, `net452` covers most FNA/MonoGame builds, and the `NET.CoreCLR` rows cover games already
  on .NET Core / .NET 5+.
- There is no per-game config in the archive; the launcher locates the game by convention from its
  own folder.

The launcher is the *stock* answer, not the only one. A .NET Core game can also be entered through
`DOTNET_STARTUP_HOOKS`, or through a proxy DLL named after something the game itself loads. Both
show up in game-specific forks — see [Game-Specific Forks](#game-specific-forks-the-custom-net-case)
below.

---

## Folder Layout

The Unity archives unpack to the game root and create the same four-folder skeleton. Only `core`
arrives populated; `plugins` and `patchers` are empty directories waiting for mods.

```text
<game root>/
  winhttp.dll                         (Unity only)
  doorstop_config.ini                 (Unity only)
  .doorstop_version                   (Unity only)
  BepInEx.NET.Framework.Launcher.exe  (.NET Framework only)
  BepInEx/
    core/                             the framework itself
    plugins/                          <- user mods go here
    patchers/                         <- preload-time patchers go here
    config/                           generated on first run
    cache/                            generated
    LogOutput.log                     generated
```

What lands in `core/` is the clearest signal of which build is installed:

| Build | Marker assemblies in `BepInEx/core` |
| --- | --- |
| 5.x Unity Mono | `BepInEx.dll`, `BepInEx.Preloader.dll`, `BepInEx.Harmony.dll`, `0Harmony.dll`, `Mono.Cecil.*` |
| 6.x Unity Mono | `BepInEx.Core.dll`, `BepInEx.Preloader.Core.dll`, `BepInEx.Unity.Mono.dll` |
| 6.x Unity IL2CPP | `BepInEx.Core.dll`, `BepInEx.Unity.IL2CPP.dll`, `Il2CppInterop.*`, `Cpp2IL.Core.dll`, `dobby.dll` |
| 6.x .NET Framework | `BepInEx.Core.dll`, `BepInEx.NET.Common.dll`, `BepInEx.NET.Framework.Launcher.xml` |

The IL2CPP archive additionally ships a **complete private .NET 6 runtime** in a top-level `dotnet/`
folder — roughly 170 files including `coreclr.dll`, `hostpolicy.dll` and
`System.Private.CoreLib.dll`. That is why the IL2CPP artifact is ~34 MB against ~640 KB for the Mono
release, and it means BepInEx on IL2CPP has **no external runtime prerequisite**: it never asks the
user to install anything. The contrast with MelonLoader, which needs a system-wide .NET 6 desktop
runtime, is covered in `MELONLOADER.md`.

---

## The Load Chain

Order matters, because each stage can only see what the previous one has not yet loaded.

1. **Doorstop (or the launcher)** starts a runtime and calls `Doorstop.Entrypoint.Start()` in
   `BepInEx.Preloader.dll`.
2. **The preloader** initialises logging and the config system, then runs the assembly patcher.
3. **Preload-time patchers** in `BepInEx/patchers` are loaded and given raw `AssemblyDefinition`
   objects via Mono.Cecil, *before* the runtime has loaded those assemblies.
4. **The chainloader** starts once the game's runtime is up, scans `BepInEx/plugins` recursively for
   assemblies carrying `[BepInPlugin]`, sorts them by dependency, and instantiates each one.
5. **Plugins** run. Harmony patches applied here operate on already-loaded assemblies.

Three assemblies can never be patched at stage 3, because the patcher engine itself needs them:
`mscorlib.dll`, `System.dll`, `System.Core.dll`.

---

## Mod Formats

### Plugins, the ordinary case

A plugin is one .NET assembly in `BepInEx/plugins` (subfolders are scanned, so `plugins/AuthorName/`
works). It must carry `[BepInPlugin]`; without it BepInEx ignores the file entirely.

The base class differs per runtime, which is why a plugin built for one BepInEx variant does not
load on another:

| Runtime | `using` | Base class | Entry point |
| --- | --- | --- | --- |
| Unity Mono | `BepInEx.Unity.Mono` | `BaseUnityPlugin` | Unity messages (`Awake`, `Update`, …) — it inherits `MonoBehaviour` |
| Unity IL2CPP | `BepInEx.Unity.IL2CPP` | `BasePlugin` | `public override void Load()` |
| .NET Framework / CoreCLR | `BepInEx.NET.Common` | `BasePlugin` | `public override void Load()` |

```csharp
using BepInEx;
using BepInEx.Unity.Mono;

[BepInPlugin("org.bepinex.plugins.exampleplugin", "Example Plug-In", "1.0.0.0")]
public class ExamplePlugin : BaseUnityPlugin
{
    private void Awake() => Logger.LogInfo("loaded");
}
```

`[BepInPlugin]` takes three strings:

| Parameter | Meaning |
| --- | --- |
| `GUID` | Unique identifier. BepInEx uses it for duplicate detection, dependency sorting and the config filename. Reverse-domain notation by convention. Changing it after release breaks every dependent. |
| `Name` | Human-readable name. |
| `Version` | Must parse as semver. |

Supporting attributes, all optional and all repeatable:

- `[BepInDependency("guid")]` — hard by default (the plugin is skipped and an error shown if the
  dependency is missing); `BepInDependency.DependencyFlags.SoftDependency` makes it load-order-only.
  An optional version range uses npm/node range syntax: `[BepInDependency("guid", "~1.2")]`.
- `[BepInProcess("Game.exe")]` — only load when the host process matches. Useful when several games
  share a folder.
- `[BepInIncompatibility("guid")]` — skip this plugin if that one is present.

### Preloader patchers, the rarer case

A patcher is a separate assembly in `BepInEx/patchers`, written against Mono.Cecil, that rewrites
assemblies as they are loaded from disk. It can do things Harmony cannot: add types, add fields,
change member visibility, replace an assembly wholesale. It must not reference the assemblies it
patches — doing so loads them early and makes patching impossible — so patcher and plugin can never
be the same DLL.

The patcher contract **changed between BepInEx 5 and 6**, and the two are not interchangeable — a
5.x patcher is invisible to a 6.x install and vice versa.

BepInEx 5 — a static class discovered by duck typing:

```csharp
public static class Patcher
{
    public static IEnumerable<string> TargetDLLs { get; } = new[] { "Assembly-CSharp.dll" };
    public static void Patch(AssemblyDefinition assembly) { }
    // optional: Initialize() before the run, Finish() after
}
```

BepInEx 6 — an attributed class deriving from `BasePatcher`:

```csharp
[PatcherPluginInfo("io.bepis.mytestplugin", "My Test Plugin", "1.0")]
class EntrypointPatcher : BasePatcher
{
    public override void Initialize() { }
    public override void Finalizer() { }

    [TargetAssembly("Assembly-CSharp.dll")]
    public void PatchAssembly(AssemblyDefinition assembly) { }

    // or, per type:
    [TargetType("Assembly-CSharp.dll", "GameNamespace.GameClass")]
    public void PatchType(TypeDefinition type) { }
}
```

`TargetAssemblyAttribute.AllAssemblies` targets everything. A patch method may return `bool` to
report whether it actually modified anything, and may take `ref AssemblyDefinition` to swap in a
different assembly. A patcher GUID must be unique against plugin GUIDs too, because patchers now get
their own config files.

### Config files

Everything BepInEx writes as configuration lives in `BepInEx/config`, in a TOML-like `.cfg` format.

- `BepInEx/config/BepInEx.cfg` — the framework's own settings, generated on first run and
  self-documenting.
- `BepInEx/config/<plugin GUID>.cfg` — one file per plugin that declares config entries. **The name
  comes from the GUID, not from the DLL name**, which is why a config file often does not visibly
  correspond to the mod that owns it.

`BepInEx.ConfigurationManager` (`https://github.com/BepInEx/BepInEx.ConfigurationManager`) is the
standard in-game editor for these. It ships as separate `BepInEx5` and `IL2CPP` builds and installs
like any other plugin.

### How plugins are distributed

There is no packaging standard, so an installer sees several shapes:

- A bare `.dll` intended for `BepInEx/plugins`.
- An archive already rooted at `BepInEx/`, to be extracted over the game folder.
- An archive rooted at `plugins/`, `patchers/` and/or `config/`.
- A Thunderstore package: `manifest.json`, `icon.png` and `README.md` at the root with the payload
  under `plugins/` or `BepInEx/plugins/`. See `THUNDERSTORE_API.md`.

Only the folder the files end up in matters to BepInEx; the archive shape is purely a distribution
convention.

---

## Runtime-Specific Behaviour

### Unity Mono

The game's own code is managed IL in `<Game>_Data/Managed/Assembly-CSharp.dll` (plus
`Assembly-CSharp-firstpass.dll`). Plugins reference those assemblies directly and Harmony patches
them in memory. Nothing is generated; installation is finished the moment the archive is extracted.

A plugin's target framework follows the game's Unity version — `netstandard2.0` or `netstandard2.1`
if the game has `netstandard.dll` in `Managed`, `net46` if `mscorlib.dll` is file version 4.0.0.0 or
newer, otherwise `net35`.

### Unity IL2CPP

The game's C# has been transpiled to C++ and compiled into `GameAssembly.dll`; there is no managed
`Assembly-CSharp.dll` to reference or patch. BepInEx bridges this with
[Il2CppInterop](https://github.com/BepInEx/Il2CppInterop): on **first run** it generates managed
proxy assemblies that forward into the native code, and plugins reference those.

That first run is expensive and has a network dependency:

| Path | Contents |
| --- | --- |
| `BepInEx/unity-libs/` | managed Unity base libraries, **downloaded as a zip** from a URL set in `BepInEx.cfg` |
| `BepInEx/interop/` | the generated proxy assemblies — this is what plugins reference |
| `BepInEx/DeobfuscationMap.csv.gz` | optional rename map for obfuscated games |

The base-libraries download can be avoided by placing the correctly named `.zip` in `unity-libs`
manually and setting the config value to just the filename; BepInEx then never contacts the network.
Interop assemblies are regenerated when the game or BepInEx changes, so a game patch means another
slow first launch.

The IL2CPP signal in a game folder is a `<Game>_Data/il2cpp_data` directory; Mono games have
`<Game>_Data/Managed` instead.

### .NET Framework (XNA, FNA, MonoGame)

No Unity player, no scripting backend, no `_Data` folder. The game is a .NET Framework executable
and its code usually lives in that executable itself, so plugins reference the game `.exe` directly
rather than a separate assembly. `BepInEx/plugins`, `BepInEx/patchers` and `BepInEx/config` behave
exactly as they do under Unity — only the bootstrap and the plugin base class differ.

Because the launcher owns process startup, anything that starts the game some other way bypasses
BepInEx completely. This is the most common failure mode on this runtime.

---

## Game-Specific Forks: the Custom .NET Case

The three variants above cover games BepInEx supports as shipped. A fourth situation is common
enough to plan for: **a game whose .NET target no stock build matches, served by a fork the game's
own developer publishes.** These forks keep BepInEx's folder layout, config system, HarmonyX
patching and plugin API, and change only how the loader is entered — so a plugin author's workflow
is unchanged while the install shape is not one this document has described yet.

Two things force a fork:

- **Runtime target.** Stock 6.x publishes CoreCLR builds for `net6.0` and `netcoreapp3.1` only. A
  game on .NET 8 needs a rebuild, not a config change.
- **Entry mechanism.** The stock launcher executable is unusable when the game must be started
  through a storefront, and unavailable for a headless server. Forks reach for one of the two
  alternatives below instead.

### Injection route 1 — a proxy DLL the game already loads

The Unity trick generalises: name a forwarding DLL after something the process loads early, and it
gets loaded for free. Outside Unity there is no `winhttp.dll` convention, so the fork picks a name
from the game's own dependency list — a graphics DLL is the usual choice for a client with a window.

The shim forwards every real export to the system copy, then starts CoreCLR itself: it calls
`hostfxr_initialize_for_runtime_config`, asks for the
`load_assembly_and_get_function_pointer` delegate, and invokes BepInEx's managed entry point.
That is the same job UnityDoorstop does, written against `hostfxr` instead of Mono.

The advantage over the stock launcher is decisive: the game is still started by its own executable,
so **Steam, Epic and desktop shortcuts all keep working untouched**, and so does anything that
counts playtime or handles authentication.

### Injection route 2 — `DOTNET_STARTUP_HOOKS`

.NET Core has a first-class pre-main hook. Any assembly named in the `DOTNET_STARTUP_HOOKS`
environment variable — or in a `STARTUP_HOOKS` entry inside the app's `.runtimeconfig.json` — is
loaded before the application's entry point, and its `StartupHook.Initialize()` is called:

```csharp
internal class StartupHook
{
    public static void Initialize()
    {
        // locate BepInEx/core, start the preloader, hand over to the chainloader
    }
}
```

This is the only route that works for a **headless dedicated server** (`dotnet Server.dll` — no
window, so no graphics DLL to impersonate). Its cost is that it edits a file the game ships:
a store validation pass or a game update silently removes the hook, and BepInEx stops loading with
no error. Forks that use it ship an install script that writes the entry and keeps a backup, and
tell users to re-run it after updates.

### Worked example: Romestead

Romestead (Ice Box Studio) is a .NET 8 MonoGame game. Its loader,
[BepinEx 6 For Romestead](https://www.nexusmods.com/romestead/mods/1), is published by the game's
developer on the game's own Nexus page — not on GitHub releases, and not on `builds.bepinex.dev`.
It is a fork of BepInEx 6 BE783 retargeted to .NET 8, with sources at
`https://github.com/ibox233/BepinEx-6-CoreCLR-For-Romestead` (branch `romestead-net8`), as LGPL-2.1
requires.

Every version publishes **five packages**, and picking the wrong one is the first failure mode:

| Package | For | Entry mechanism |
| --- | --- | --- |
| `… Mod Loader (Windows)` | client, win-x64 | `d3d11.dll` shim |
| `… Mod Loader (Linux)` | client under Proton — there is no native Linux build | the same Windows `d3d11.dll` shim |
| `… Mod Loader (Windows Installer)` | client, win-x64 | same, wrapped in a one-click installer (~12 MB against ~1 MB) |
| `… Server Mod Loader (Windows)` | dedicated server | `STARTUP_HOOKS` in `Server.runtimeconfig.json` |
| `… Server Mod Loader (Linux)` | dedicated server | same |

The client archive is 28 entries and unpacks straight into the game folder:

```text
d3d11.dll                        <- Rust-built forwarding shim, boots CoreCLR via hostfxr
BepInEx.NET.CoreCLR.dll          <- managed entry point, at the game root
BepInEx.NET.CoreCLR.deps.json    <- runtimeTarget ".NETCoreApp,Version=v8.0"
README.txt
licenses/
BepInEx/core/                    <- 20 files: BepInEx.Core, BepInEx.NET.Common,
                                    BepInEx.Preloader.Core, 0Harmony, Mono.Cecil.*, MonoMod.*
```

No `winhttp.dll`, no `doorstop_config.ini`, no launcher executable, and no `plugins`/`config`
folders — those are created on first run, in the standard places (`BepInEx/plugins`,
`BepInEx/LogOutput.log`).

The server archive is the same core set plus `BepInEx.NET.CoreCLR.dll` at the root and
`install.bat` / `install.ps1` / `uninstall.bat` / `uninstall.ps1`. The installer writes the
`STARTUP_HOOKS` entry into `Server.runtimeconfig.json`, saving `Server.runtimeconfig.json.bepinex-backup`
first; the uninstaller restores the backup and removes the root loader files while deliberately
**keeping** `BepInEx/` so plugins and configs survive.

Two details from this case generalise to any developer-published fork:

- **The client and server packages target different files.** Romestead's client explicitly does
  *not* need `Romestead.runtimeconfig.json` edited; the server edits `Server.runtimeconfig.json`.
  Older client installs may still carry a leftover `STARTUP_HOOKS` entry from an earlier package
  that did use that route — a stale entry pointing at a since-moved DLL is its own failure mode.
- **Launch through the storefront, not the executable.** The whole point of the proxy route is that
  the normal launch path keeps working; bypassing it to run the `.exe` directly is unnecessary and,
  for this game, explicitly unsupported.

### Recognising a custom build

An install that has `BepInEx/core` but **no** `winhttp.dll`, **no** `doorstop_config.ini` and **no**
`BepInEx.NET.Framework.Launcher.exe` is a fork using one of the two routes above. Look for a
managed `BepInEx.NET.CoreCLR.dll` (or similar) sitting at the game root next to a `.deps.json`,
an unexpected graphics-DLL name beside the game executable, or a `STARTUP_HOOKS` key in a
`*.runtimeconfig.json`. The `.deps.json`'s `runtimeTarget` names the actual .NET version the fork
was built for, which is usually the reason the fork exists.

Because these builds live on the game's own mod page rather than a versioned release feed, they
have no machine-readable version endpoint — the file list on the mod page is the whole surface.

---

## Files BepInEx Creates That Nobody Installed

Anything managing BepInEx as an installed mod should expect these to appear afterwards, outside its
own bookkeeping:

| Path | When |
| --- | --- |
| `BepInEx/config/BepInEx.cfg` | first run |
| `BepInEx/config/<GUID>.cfg` | first run of each plugin that declares config entries |
| `BepInEx/cache/` | preloader assembly cache |
| `BepInEx/LogOutput.log` | every run (the 6.x docs also refer to it as `LogOutput.txt`) |
| `BepInEx/interop/`, `BepInEx/unity-libs/` | IL2CPP first run |
| `<Game>_Data/output_log.txt` | only when `redirect_output_log = true` |

None of them belong to any mod. Deleting `interop/` costs a slow regeneration, not data.

---

## Practical Notes

- **Decide the variant from the game folder, not from the game's name.** `<Game>_Data/il2cpp_data`
  means IL2CPP; `<Game>_Data/Managed` means Mono; neither means it is not a Unity game at all, and
  the `NET.Framework` build applies.
- **Check for a game-specific fork before reaching for a stock build.** A .NET game whose developer
  ships its own loader on the game's mod page will not work with a stock archive, and the fork's
  entry mechanism is usually neither a launcher nor `winhttp.dll`. `BepInEx/core` present with none
  of the three stock bootstrap markers is the tell.
- **`winhttp.dll` is not proof of BepInEx.** Read `doorstop_config.ini`'s `target_assembly`.
- **BepInEx and MelonLoader must never both be installed.** Both hook process startup through a proxy
  DLL and both try to own the runtime. See `MELONLOADER.md`.
- **Version comparison needs care.** 5.x uses four-segment versions that semver mangles; every 6.x
  bleeding-edge build reports `6.0.0` and must be ordered by build number.
- The deployable folders are `BepInEx/plugins`, `BepInEx/patchers` and `BepInEx/config`. Everything
  else under `BepInEx/` belongs to the framework or is generated.

---

## See also

`BEPINEX_BE_BUILDS.md` (the `builds.bepinex.dev` host: index-page parsing, build-number ordering and
the artifact naming cutover at build 647 — the only source for every 6.x variant described above).
`MELONLOADER.md` (the other general-purpose Unity loader; mutually exclusive with this one, and
Unity-only where BepInEx also covers XNA).
`UNITY_MOD_MANAGER.md` (a third Unity loader, and the other consumer of UnityDoorstop — the reason
`winhttp.dll` and `doorstop_config.ini` alone do not identify a loader).
`THUNDERSTORE_API.md` (the packaging convention most BepInEx plugin distributions follow).
`NEXUS_MODS_API.md` and `NEXUS_FILE_PROPERTIES.md` (how a developer-published fork on a game's own
mod page is enumerated and downloaded, since such forks have no release feed).
`DOWNLOADER.md` (the GitHub requirements auto-downloader that resolves the 5.x release assets).
`templates/TEMPLATE_UNITYBEPINEX.md` and `templates/TEMPLATE_UNITYMELONLOADERBEPINEX_HYBRID.md` (the
two templates that install and manage this loader).
`INSTALLER_SYSTEM.md` (`registerInstaller` test/install contracts behind routing a plugin archive to
the right folder).
`REGISTER_GAME.md` (the `spec` / `applyGame()` contract, including `parameters` for the launcher and
script routes).
`VORTEX_DEPLOYMENT.md` (what deploying these files into the game folder does, and why generated
folders sit outside the manifest).
