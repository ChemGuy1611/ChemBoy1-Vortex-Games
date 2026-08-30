# MelonLoader

`https://github.com/LavaGang/MelonLoader` — a general-purpose mod loader for Unity games, covering
both of Unity's scripting backends (Mono and IL2CPP) from a single archive. It occupies the same
niche as BepInEx and is the usual alternative to it.

**MelonLoader is Unity-only.** Its own wiki opens with *"MelonLoader is a Universal Mod-Loader for
Games built in the Unity Engine"*, and the loader ships exactly two support modules — `Mono.dll` and
`Il2Cpp.dll`. There is no XNA, FNA or MonoGame support and no non-Unity engine module. The `net472`
folder in its archive is a *target framework*, not an engine: it is the reference build for mods
compiled against Unity's newer "Mono BleedingEdge" runtime. A game on XNA/FNA/MonoGame needs
BepInEx's `NET.Framework` build instead — see `BEPINEX.md`.

---

## Release Surface

Releases are ordinary GitHub releases, with an installer application published alongside the
loader archives.

| Asset | Purpose |
| --- | --- |
| `MelonLoader.x64.zip` | the loader, 64-bit Windows games |
| `MelonLoader.x86.zip` | the loader, 32-bit Windows games |
| `MelonLoader.Linux.x64.zip`, `MelonLoader.macOS.x64.zip` | the non-Windows builds |
| `MelonLoader.Installer.exe`, `MelonLoader.Installer.Linux`, `MelonLoader.Installer.MacOS.dmg` | a GUI installer that enumerates installed Unity games (Steam, Epic, GOG on Windows; Steam on Linux) and installs, updates or removes the loader |

Newest release at the time of writing: `v0.7.3` (2026-05-14). Tags are plain semver with a leading
`v`, and the version appears **only in the tag** — asset filenames are stable across releases
(`MelonLoader.x64.zip` is the same name every time). Anything resolving the newest build has to read
the tag, not parse the filename.

Nightly CI builds exist for three branches (`master`, `alpha-development`, `universality`), reachable
through `nightly.link`. Their artifact filenames are stable too (for example
`MelonLoader.Windows.x64.CI.Release.zip`), so nightly builds have to be ordered by workflow run
rather than by any version string. Upstream advises against using them.

---

## How MelonLoader Gets Into the Process

MelonLoader uses a **proxy DLL** dropped next to the game executable. The default name is
`version.dll`; Windows resolves it from the executable's directory before the system directory, so
the game loads MelonLoader's copy, which forwards the real exports onward and bootstraps the loader
before the game's own code runs.

The proxy can be renamed to any of the names MelonLoader exports stubs for, which is how it coexists
with — or works around — other software that has already claimed one of them:

```text
version.dll   winhttp.dll  winmm.dll   dinput.dll  dinput8.dll  dsound.dll
d3d8.dll      d3d9.dll     d3d10.dll   d3d11.dll   d3d12.dll    ddraw.dll   msacm32.dll
```

Older releases also shipped a separate `dobby.dll` next to the proxy, and the bundled README still
says to extract it. As of 0.7.x that file no longer exists: the Dobby and plthook hooking libraries
are statically linked into the bootstrap, so `version.dll` plus the `MelonLoader` folder is the
complete install.

Linux and macOS use the same archive but need `WINEDLLOVERRIDES` (Wine/Proton) or the native
equivalent set in the launch environment.

---

## Folder Layout

`MelonLoader.x64.zip` unpacks to exactly two things at the game root: `version.dll` and a
`MelonLoader/` folder. Every other folder below is created at first run.

```text
<game root>/
  version.dll                 the proxy
  MelonLoader/
    net35/                    loader build for Unity's legacy Mono runtime
    net472/                   loader build for Unity's Mono BleedingEdge runtime
    net6/                     loader build for IL2CPP (CoreCLR), plus MelonLoader.NativeHost.dll
    Dependencies/
      SupportModules/         Mono.dll and Il2Cpp.dll — the engine bridges
      CompatibilityLayers/    per-ecosystem shims: IPA, Demeo, Muse_Dash_Mono, Stress_Level_Zero_Il2Cpp
      NetStandardPatches/     assembly overrides for legacy Mono
      MonoBleedingEdgePatches/  assembly overrides for newer Mono
      Il2CppAssemblyGenerator/  the Cpp2IL-driven generator
    Documentation/            README.md, CHANGELOG.md, LICENSE.md, NOTICE.txt
    Il2CppAssemblies/         generated at first run on IL2CPP games
    Logs/                     generated
  Mods/                       <- MelonMod assemblies
  Plugins/                    <- MelonPlugin assemblies
  UserLibs/                   <- shared libraries mods depend on
  UserData/                   <- configuration and mod-written data
```

Only `Mods`, `Plugins`, `UserLibs` and `UserData` hold user content. All four sit at the **game
root**, not inside `MelonLoader/` — a layout difference from BepInEx worth keeping in mind, since it
means MelonLoader mods and BepInEx mods never share a folder even when both loaders are present
(which they must not be).

The root that all of these resolve against is configurable with `--melonloader.basedir`, which
relocates everything except the proxy DLL.

---

## Runtime Selection

MelonLoader detects the scripting backend at startup and takes one of two paths.

### Mono games

The bootstrap detours `mono_jit_init_version`, reads the Mono runtime version string, and classifies
the game:

- Runtime version `v2.x`/`v3.x` → legacy Mono. `MelonLoader/Dependencies/NetStandardPatches` is
  prepended to Mono's assembly search path.
- Anything newer → Mono BleedingEdge. `MelonLoader/Dependencies/MonoBleedingEdgePatches` is prepended
  instead.

In **both** cases the managed loader that gets loaded is `MelonLoader/net35/MelonLoader.dll`. The
`net472` build is not loaded by the bootstrap at all; it exists so mods targeting `net472` have a
matching reference assembly. The runtime difference is absorbed by those assembly-override folders,
not by loading a different loader build.

`--melonloader.monosearchpathoverride` prepends further paths ahead of both, for games with a
stripped or unusual core library set.

### IL2CPP games

The bootstrap starts a CoreCLR host and loads `MelonLoader/net6/MelonLoader.NativeHost.dll` (using
`MelonLoader.runtimeconfig.json` next to it), which in turn brings up
`MelonLoader/net6/MelonLoader.dll`.

That needs a **.NET 6 desktop runtime**, and unlike BepInEx — which bundles a private copy inside its
IL2CPP archive — MelonLoader looks for one on the machine. It searches, in order:

1. a `dotnet` folder next to the game executable,
2. a `dotnet` folder under the configured base directory,
3. `MelonLoader/Dependencies/dotnet`,
4. the system installation, via `hostfxr`.

If none is found it downloads and runs the official installer from
`https://aka.ms/dotnet/6.0/dotnet-runtime-win-x64.exe` (or the `x86` URL for 32-bit games). That is
what the README means by *"On Windows, the .NET 6.0 Desktop Runtime will be installed automatically"*
— a silent elevated install on first launch, which is worth surfacing to a user rather than letting
it surprise them.

Then, on first run, the **Il2Cpp Assembly Generator** dumps the game's types with Cpp2IL and produces
managed proxy assemblies into `MelonLoader/Il2CppAssemblies`. Mods reference those. The step is slow,
contacts a remote API for version information unless `--melonloader.agfoffline` is set, and reruns
whenever the game updates.

The Visual C++ 2015–2019 redistributable (matching the game's bitness) is a prerequisite on all
MelonLoader installs.

---

## Mod Formats

MelonLoader calls every loadable assembly a *Melon*, and splits them into two kinds by base class.

| Kind | Folder | Base class | Loaded |
| --- | --- | --- | --- |
| Mod | `Mods/` | `MelonMod` | after the engine and the support module are up |
| Plugin | `Plugins/` | `MelonPlugin` | far earlier, as soon as the managed part of MelonLoader starts |

Plugins exist to manage MelonLoader and other Melons; ordinary game modifications are Mods.

### Required attributes

Both kinds need two **assembly-level** attributes. This is the sharpest structural difference from
BepInEx, where the metadata is a class attribute:

```csharp
using MelonLoader;

[assembly: MelonInfo(typeof(MyMod), "My Mod Name", "1.0.0", "Author Name")]
[assembly: MelonGame("Game Developer", "Game Name")]
```

`MelonInfo` takes the Melon's main type, name, semver version and author, plus an optional download
link. `MelonGame` takes a developer and a game name, both optional:

- both filled — the mod loads only on that game,
- name omitted — loads on every game by that developer,
- both omitted — loads everywhere (this is what "universal mod" means in MelonLoader's ecosystem).

The values are matched against Unity's own project settings, not against marketing names. The
authoritative pair is in `<Game>/<Game>_Data/app.info`.

Other assembly attributes worth knowing: `[MelonPriority(int)]` (lower loads earlier; default 0),
`[MelonOptionalDependencies(...)]`, `[MelonAdditionalDependencies(...)]`,
`[MelonIncompatibleAssemblies(...)]`, `[MelonColor]` and `[MelonAuthorColor]` for console output.

### Entry points

`MelonMod` is a plain class with virtual callbacks — it is not a `MonoBehaviour`, so there are no
Unity messages:

```csharp
public class MyMod : MelonMod
{
    public override void OnInitializeMelon() { }   // safe to touch game/Unity types from here on
    public override void OnUpdate() { }
}
```

The main sequence is `OnEarlyInitializeMelon` (before the support module may be loaded — do not touch
game types) → `OnInitializeMelon` → `OnLateInitializeMelon` (after Unity's first `Start` messages) →
per-frame `OnUpdate` / `OnFixedUpdate` / `OnLateUpdate` / `OnGUI` → scene callbacks
(`OnSceneWasLoaded`, `OnSceneWasInitialized`, `OnSceneWasUnloaded`) → `OnApplicationQuit` →
`OnDeinitializeMelon`.

`MelonPlugin` adds earlier hooks that have no `MelonMod` equivalent: `OnPreInitialization`,
`OnApplicationEarlyStart` (before IL2CPP assembly generation), `OnPreModsLoaded`, `OnPreSupportModule`,
`OnApplicationStarted`, `OnApplicationLateStart`.

Harmony (HarmonyX) is bundled and, for Mods, `PatchAll` runs automatically on registration. Plugins
must opt in manually — add `[assembly: HarmonyDontPatchAll]` and call
`HarmonyInstance.PatchAll(MelonAssembly.Assembly)` yourself.

### Target framework

Chosen from the game, exactly as with any Unity modding:

| Game | Template | Framework |
| --- | --- | --- |
| any IL2CPP | Class Library | .NET 6.0 |
| Mono, Unity 2021.2+ | Class Library | .NET Standard 2.1 |
| Mono, Unity 2018.1+ | Class Library (.NET Framework) | .NET Framework 4.7.2 |
| Mono, Unity 2017.1+ | Class Library (.NET Framework) | .NET Framework 3.5 or 4.7.2 |
| older | Class Library (.NET Framework) | .NET Framework 3.5 |

### Distribution

Mods ship as bare `.dll` files far more often than BepInEx plugins do, because a MelonLoader mod is
usually a single assembly dropped into `Mods/`. Archives, when used, are normally rooted at `Mods/`,
`Plugins/`, `UserLibs/` and/or `UserData/`. `UserLibs/` is the correct home for shared libraries a
mod depends on but that are not themselves Melons; a library placed in `Mods/` without the
`MelonInfo` attribute is reported as a failed load.

---

## Configuration

Two separate config systems live in `UserData/`, both TOML (via Tomlet):

- **`UserData/Loader.cfg`** — MelonLoader's own settings, generated on first run. Every entry mirrors
  a launch option: `[loader] disable`, `debug_mode`, `capture_player_logs`, `harmony_log_level`,
  `force_quit`, `disable_start_screen`, `theme`; `[console]` visibility and title options; `[logs]
  max_logs`; `[mono_debug_server]`; `[unityengine] version_override`, `disable_console_log_cleaner`
  and the assembly-generator forcing options.
- **`UserData/MelonPreferences.cfg`** — mod preferences, written through the `MelonPreferences` API.
  A mod creates a category, creates typed entries in it, and reads or writes `entry.Value`. Values
  are flushed on `MelonPreferences.Save()`, which MelonLoader calls automatically on application
  quit. A category can be redirected to its own file with `SetFilePath("Foo/Bar.cfg")`, so not every
  mod's settings are guaranteed to be in the shared file.

`MelonPreferencesManager` (`https://github.com/Bluscream/MelonPreferencesManager`) is the standard
in-game editor for preferences, published as a naked `.dll` in Mono and IL2CPP variants.

### Launch options

Every option has a `Loader.cfg` equivalent, so these are for one-off use. The ones that matter most
in practice:

| Argument | Effect |
| --- | --- |
| `--no-mods` | start the game with the loader present but nothing loaded — the cleanest "is a mod at fault?" test |
| `--quitfix` | fixes games that hang on exit with MelonLoader installed |
| `--melonloader.debug` | debug mode, much more verbose logging |
| `--melonloader.hideconsole` | hide the console window |
| `--melonloader.disablestartscreen` | skip the loading splash |
| `--melonloader.basedir` | relocate `Mods`, `Plugins`, `UserData`, `UserLibs` and `MelonLoader` |
| `--melonloader.agfoffline`, `--melonloader.agfregenerate` | IL2CPP assembly generation: never contact the remote API; force a rebuild |
| `--melonloader.unityversion` | override the detected Unity version when detection fails |

Logs are written to `MelonLoader/Logs/`, capped at ten files by default (`--melonloader.maxlogs`,
`0` for no cap).

---

## Files MelonLoader Creates That Nobody Installed

| Path | When |
| --- | --- |
| `UserData/Loader.cfg` | first run |
| `UserData/MelonPreferences.cfg` | first run of any mod with preferences |
| `MelonLoader/Logs/` | every run |
| `MelonLoader/Il2CppAssemblies/` | IL2CPP first run, and again after a game update |
| `Mods/`, `Plugins/`, `UserLibs/`, `UserData/` | created empty on first run if absent |

---

## Practical Notes

- **MelonLoader and BepInEx are mutually exclusive.** Both install a proxy DLL and both take over
  runtime startup; installing them together breaks the game rather than yielding two loaders. Any
  tooling that offers both has to install exactly one and remove the other.
- **The installed-loader marker is `MelonLoader/net6/MelonLoader.dll` for IL2CPP** and
  `MelonLoader/net35/MelonLoader.dll` for Mono — the folder alone is not enough, since a partial or
  failed extraction leaves the folder in place.
- **`version.dll` is not proof of MelonLoader**; it is a generic proxy name and MelonLoader itself
  can be renamed to twelve others. Check for the `MelonLoader` folder as well.
- **Do not treat the asset filename as a version.** `MelonLoader.x64.zip` never changes; the release
  tag carries the version.
- The deployable folders are `Mods`, `Plugins`, `UserLibs` and `UserData`. Everything under
  `MelonLoader/` belongs to the loader or is generated.

---

## See also

`BEPINEX.md` (the other general-purpose Unity loader, mutually exclusive with this one, and the
answer for XNA/FNA/MonoGame games that MelonLoader cannot load at all).
`BEPINEX_BE_BUILDS.md` (where the IL2CPP-capable BepInEx builds come from, when a game offers both
loaders).
`UNITY_MOD_MANAGER.md` (a third Unity loader, Doorstop-based and distributed only on Nexus).
`THUNDERSTORE_API.md` (the mod host whose package format wraps loaders and mods for both ecosystems).
`DOWNLOADER.md` (the GitHub requirements auto-downloader: resolving a release whose version lives in
the tag rather than the asset name, and the nightly-artifact route used for CI builds).
`GITHUB_API.md` (the releases and Actions endpoints behind both of those routes).
`templates/TEMPLATE_UNITYMELONLOADERBEPINEX_HYBRID.md` (the template that installs either loader and
enforces the mutual exclusion).
`INSTALLER_SYSTEM.md` (`registerInstaller` test/install contracts behind routing a bare `.dll` to
`Mods` rather than `Plugins`).
`WINAPI_BINDINGS.md` (the registry probe for an installed .NET 6 desktop runtime).
`REGISTER_GAME.md` (the `spec` / `applyGame()` contract, including `parameters` for the launch
options above).
