# winapi-bindings

Native Node bindings exposing Win32 API functions not otherwise available to Node/Electron. Windows-only. Used across extensions mainly for registry lookups (install-path fallback, dependency detection) and INI file access (the latter wrapped by `vortex-parse-ini` — see `resources/FILE_PARSING.md`).

```js
const winapi = require('winapi-bindings');
```

---

## Registry: single-value lookup

```js
try {
  const result = winapi.RegGetValue(
    'HKEY_LOCAL_MACHINE',
    'SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{...}',
    'InstallLocation'
  );
  return result.value; // string | number | number[] (MULTI_SZ) | Buffer, depending on registry type
} catch (err) {
  // key or value not found, or path doesn't exist — RegGetValue THROWS, it never returns undefined
}
```

`result.type` is one of `REG_SZ`, `REG_EXPAND_SZ`, `REG_LINK`, `REG_MULTI_SZ`, `REG_DWORD`, `REG_DWORD_BIG_ENDIAN`, `REG_QWORD`, `REG_BINARY`, `REG_NONE`. `result.value` shape follows the type: string for the SZ variants, number for DWORD/QWORD, `string[]` for MULTI_SZ, `Buffer` for BINARY, absent for NONE.

Real usage (install path fallback pattern used across most game extensions):

```js
function makeFindGame(api, gameSpec) {
  try {
    const instPath = winapi.RegGetValue(INSTALL_HIVE, INSTALL_KEY, INSTALL_VALUE);
    if (!instPath) throw new Error('empty registry key');
    return () => Promise.resolve(instPath.value);
  } catch {
    return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
      .then((game) => game.gamePath);
  }
}
```

---

## Registry: enumerating keys/values

Enumeration (`RegEnumKeys`, `RegEnumValues`) needs an open key handle, obtained via `WithRegOpen`. The handle is only valid inside the callback — `WithRegOpen` closes it as soon as the callback returns, so do the enumeration synchronously inside the callback and process the results afterward:

```js
let values;
try {
  winapi.WithRegOpen('HKEY_LOCAL_MACHINE', 'SOFTWARE\\Microsoft\\NET Framework Setup\\NDP', (hkey) => {
    values = winapi.RegEnumValues(hkey); // [{ type, key }, ...] — value NAMES only, not the data
  });
  const found = values.map(v => v.key).some(key => key.startsWith('v4'));
} catch (err) {
  // hive/path doesn't exist, or access denied — thrown before the callback ever runs
}
```

```js
winapi.WithRegOpen('HKEY_LOCAL_MACHINE', 'SOFTWARE\\Python\\PythonCore', (hkey) => {
  const keys = winapi.RegEnumKeys(hkey); // [{ class, key, lastWritten }, ...] — subkey NAMES
});
```

`RegEnumKeys`/`RegEnumValues` only accept the `Buffer` handle produced by `WithRegOpen` — passing a hive name string directly throws.

**Important:** if the hive/path passed to `WithRegOpen` doesn't exist, it throws immediately — the callback is never invoked. A common but incorrect pattern is checking `if (!values)` right after the `WithRegOpen` call to detect a missing key; that check never fires, since a missing key throws past it straight to the `catch` block. Put "not found" handling in the `catch`, not in a post-call truthiness check.

`RegGetValue` and `RegSetKeyValue` accept either a hive name string or a `Buffer` handle from `WithRegOpen` interchangeably; `RegEnumKeys`/`RegEnumValues` require the `Buffer` handle only.

---

## INI files

`GetPrivateProfileSection`, `GetPrivateProfileSectionNames`, `GetPrivateProfileString`, `WritePrivateProfileString` back the `vortex-parse-ini` package's `WinapiFormat`. Extensions should go through `vortex-parse-ini` rather than calling these directly — see `resources/FILE_PARSING.md` for the read/mutate/write cycle and native-binding gotchas (buffer size limits, null-deletes-key semantics, etc).

---

## Other available functions

Not currently used anywhere in this codebase, but available if a need comes up:

| Group | Functions |
| --- | --- |
| Filesystem | `SetFileAttributes`, `GetDiskFreeSpaceEx`, `GetVolumePathName`, `GetFileVersionInfo` |
| Shell | `SHGetKnownFolderPath`, `ShellExecuteEx` |
| Language | `GetSystemPreferredUILanguages`, `GetUserPreferredUILanguages`, `GetProcessPreferredUILanguages`, `SetProcessPreferredUILanguages` |
| Task Scheduler | `CreateTask`, `GetTasks`, `DeleteTask`, `RunTask`, `StopTask` |
| Processes | `GetProcessList`, `GetModuleList`, `GetProcessToken`, `GetProcessWindowList`, `SetForegroundWindow`, `CreateProcessWithIntegrity` |
| Permissions | `AddFileACE`, `GetUserSID`, `LookupAccountName`, `CheckYourPrivilege`, `GetUserPrivilege`, `AddUserPrivilege`, `RemoveUserPrivilege` |
| App Container | `SupportsAppContainer`, `CreateAppContainer`, `DeleteAppContainer`, `GrantAppContainer`, `RunInContainer` |
| Auxiliary | `IsThisWine`, `WhoLocks`, `WalkDir`, `GetNativeArch`, `InitiateSystemShutdown`, `AbortSystemShutdown` |

Full signatures: `node_modules/winapi-bindings/index.d.ts`.

---

## Notes

- Windows-only native module — fine for Vortex extensions since Vortex itself only ships for Windows.
- `RegGetValue` throws on any failure (missing hive, missing path, missing value) — never returns `undefined`/`null`. Always wrap in `try`/`catch`.
- `WithRegOpen`'s callback is synchronous and the key handle dies the instant the callback returns — don't `await` inside it.
- Prefer `util.GameStoreHelper.findByAppId()` for game discovery; use `RegGetValue`/`WithRegOpen` only as a fallback when a store isn't the source of truth (e.g. standalone installers, dependency detection like .NET/Python versions).
