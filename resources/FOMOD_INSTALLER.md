# FOMOD Installer System

The FOMOD installer is a built-in Vortex extension that handles mod archives containing a `fomod/ModuleConfig.xml` configuration file. It is implemented in `fomod-installer` (a native AOT compiled library) and registered in Vortex by the `installer_fomod_native` extension.

---

## Architecture

The `fomod-installer` package exposes two modes:

| Mode | Entry | Supports |
| --- | --- | --- |
| **Native (AOT)** | `NativeModInstaller` (.NET compiled to native) | XML scripts (FOMOD 1.0–5.0) only |
| **IPC** | Spawns a .NET process | XML scripts + C# scripts |

Vortex uses the **Native** mode exclusively. C# script support (rare; used by some older Bethesda mods) is not currently enabled in production.

**Source locations:**

- `fomod-installer/src/ModInstaller.Native.TypeScript/src/` — TypeScript wrapper for native binding
- `Vortex/src/renderer/src/extensions/installer_fomod_native/` — Vortex extension
- `Vortex/src/renderer/src/extensions/installer_fomod_shared/` — shared utilities (gameSupport, helpers)

---

## Registration in Vortex

The `installer_fomod_native` extension registers **two** installers:

| id | Priority | Type |
| --- | --- | --- |
| `fomod` | 10 | `XmlScript` — handles standard FOMOD XML |
| `fomod` (Basic) | 100 | `Basic` — fallback for unsupported script types |

Priority 10 means FOMOD runs **before** all custom game-extension installers (which typically range 25–49). A mod archive with `fomod/ModuleConfig.xml` will match at priority 10 and custom installers never see it — unless they explicitly return `supported: false` first (they cannot, since priority 10 is lower).

Custom installers must use the **FOMOD avoidance check** to correctly yield FOMOD mods to this built-in handler (see [FOMOD Avoidance](#fomod-avoidance)).

---

## FOMOD Avoidance

Every custom `testSupported` function must include this check. If `fomod/ModuleConfig.xml` is present, return `supported: false` so the built-in FOMOD handler takes over.

```js
if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
  supported = false;
}
```

This applies to **all** installer test functions including the fallback (`testFallback` / `testRoot` / `testMod` etc.). Without it a fallback at priority 49 would steal FOMOD mods after the FOMOD installer at priority 10 returns `supported: false` for unsupported XML variants.

---

## Install Flow

```text
archive selected
  → Vortex runs testSupported() for each registered installer (priority order)
  → FOMOD installer wins at priority 10 (XmlScript) or 100 (Basic)
  → installer.ts: invokeInstall()
      → reads stopPatterns + pluginPath from gameSupport
      → creates NativeModInstaller (with 7 callbacks)
      → creates NativeFileSystem (with 3 file-read callbacks)
      → calls modInstaller.installAsync()
          → shows FOMOD dialog (uiStartDialog → uiUpdateState → uiEndDialog)
          → returns InstallInstruction[]
      → transforms InstallInstruction[] → IInstruction[]
      → appends installerChoices attribute instruction
  → IInstallResult returned to Vortex install manager
```

Source: `Vortex/src/renderer/src/extensions/installer_fomod_native/installer.ts:35-97`

---

## InstallInstruction Types

Returned by the native FOMOD library; transformed to `IInstruction` by Vortex.

```typescript
// fomod-installer/src/.../types/InstallResult.ts
interface InstallInstruction {
  type: string;         // 'copy', 'mkdir', 'generatefile', 'iniedit', etc.
  source?: string;      // archive-relative source path
  destination?: string; // staging-relative destination path
  section?: string;     // for iniedit
  key?: string;         // for iniedit / attribute
  value?: string;       // for iniedit / attribute / setmodtype
  data?: Uint8Array;    // for generatefile (converted to Buffer by Vortex)
  priority?: number;    // install priority hint
}

interface InstallResult {
  message?: string;
  instructions: InstallInstruction[];
}
```

Vortex transforms `data: Uint8Array` → `data: Buffer` during the conversion step at `installer.ts:74-84`.

---

## Choice Persistence

After install, an `attribute` instruction is added with:

```js
{ type: 'attribute', key: 'installerChoices', value: { type: 'fomod', options: <IChoices> } }
```

This is stored in mod metadata and used for **reinstall replay** (Vortex re-runs the FOMOD with the same selections pre-populated).

IChoices is built from Redux state at `state.session.fomod.installer.dialog.instances[instanceId].state`.

Source: `Vortex/src/renderer/src/extensions/installer_fomod_native/installer.ts:87-94`

---

## Callbacks

`NativeModInstaller` takes 7 callbacks at construction:

| Callback | Purpose |
| --- | --- |
| `pluginsGetAll(activeOnly)` | Returns list of active plugins from `state.session.plugins.pluginList`; used for condition checks |
| `contextGetAppVersion()` | Returns Vortex app version string |
| `contextGetCurrentGameVersion()` | Returns game version from discovery state |
| `contextGetExtenderVersion()` | Returns script extender version (e.g. SKSE); falls back to game version |
| `uiStartDialog(installSteps, ...)` | Opens the FOMOD wizard dialog; no-op if `unattended=true` |
| `uiUpdateState(installSteps, ...)` | Updates wizard step state via Redux; no-op if `unattended=true` |
| `uiEndDialog()` | Closes the wizard dialog; no-op if `unattended=true` |

Source: `Vortex/src/renderer/src/extensions/installer_fomod_native/utils/VortexModInstaller.ts:43-195`

`NativeFileSystem` takes 3 callbacks:

| Callback | Purpose |
| --- | --- |
| `readFileContent(path, offset, length)` | Reads bytes from archive; `offset=-1` means full file; returns `Uint8Array` or `null` |
| `readDirectoryFileList(path)` | Lists files (non-recursive) in directory; returns full paths or `null` |
| `readDirectoryList(path)` | Lists subdirectories in directory; returns full paths or `null` |

Source: `Vortex/src/renderer/src/extensions/installer_fomod_native/utils/VortexModInstallerFileSystem.ts:17-81`

---

## Game Support

`gameSupport.ts` provides per-game configuration used during install:

```typescript
// Vortex/src/renderer/src/extensions/installer_fomod_shared/utils/gameSupport.ts
interface GameSupport {
  iniPath?: string;
  stopPatterns: string[];   // regex; stops path traversal / determines mod root
  pluginPath?: string;      // e.g. "Data" for Bethesda games; null for non-plugin games
  nativePlugins?: string[]; // game-owned plugins that should not be managed
}
```

Extensions can override `stopPatterns` by setting `game.details.stopPatterns`.

`getStopPatterns(gameId, game)` — returns `game.details.stopPatterns` if set, else looks up `gameSupport` dict.
`getPluginPath(gameId)` — returns `pluginPath` from `gameSupport` dict (e.g. `"Data"` for Skyrim, `null` for games without plugin systems).

The `stopPatterns` for Bethesda games include: `\.esp$`, `\.esm$`, `\.esl$`, `\.bsa$`, `\.ba2$`. These tell the FOMOD installer where the mod "root" is relative to archive content.

---

## Error Handling

If ModuleConfig.xml fails XML validation the installer:

1. Shows an error notification
2. Offers an **"Ignore"** action that retries installation with validation disabled

Source: `Vortex/src/renderer/src/extensions/installer_fomod_native/installer.ts:99-151`

---

## ModuleConfig.xml Structure (types)

Parsed by the native library. Key types from the fomod-installer TypeScript types:

```typescript
// fomod-installer/src/.../types/index.ts
interface IPlugin {
  id: string;
  selected: boolean;
  preset: boolean;
  name: string;
  description: string;
  image: string;
  type: PluginType;       // 'Required' | 'Optional' | 'Recommended' | 'CouldBeUsable' | 'NotUsable'
  conditionMsg: string;
}

interface IGroup {
  id: string;
  name: string;
  type: GroupType;         // 'SelectAll' | 'SelectAny' | 'SelectExactlyOne' | 'SelectAtMostOne' | 'SelectAtLeastOne'
  options: IPlugin[];      // available plugins in this group
}

interface IInstallStep {
  id: string;
  name: string;
  visible: boolean;
  optionalFileGroups: IGroup[];
}
```

Callbacks passed to dialog management:

- `SelectCallback` — called when user selects/deselects a plugin
- `ContinueCallback` — called when user clicks Next/Finish
- `CancelCallback` — called when user cancels; throws `UserCanceled`

---

## `ITestSupportedDetails` (vortex-api)

The extended `testSupported` signature includes an optional `details` parameter:

```typescript
// vortex-api/lib/api.d.ts
interface ITestSupportedDetails {
  hasXmlConfigXML?: boolean;   // true if archive contains fomod/ModuleConfig.xml
  hasCSScripts?: boolean;      // true if archive contains C# script files
}

type TestSupported = (
  files: string[],
  gameId: string,
  archivePath?: string,
  details?: ITestSupportedDetails
) => PromiseLike<ISupportedResult>;
```

Custom installers do not typically use `details`; the FOMOD tester uses it internally to decide between XmlScript and Basic installer types.

---

## `will-install-mod` Hook

The `installer_fomod_native` extension hooks into `will-install-mod` to reinitialize the logger and file system before each install. This ensures per-install state is clean.

Source: `Vortex/src/renderer/src/extensions/installer_fomod_native/index.ts:89-102`
