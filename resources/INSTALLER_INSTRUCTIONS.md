# Installer Instructions Reference

Source: `vortex-api/lib/api.d.ts` lines 4691-4702, 5496

## IInstruction Interface

```typescript
declare interface IInstruction {
    type: InstructionType;
    path?: string;
    source?: string;
    destination?: string;
    section?: string;
    key?: string;
    value?: any;
    submoduleType?: string;
    data?: string | Buffer;
    rule?: IRule;
}

declare type InstructionType =
    | "copy"
    | "mkdir"
    | "submodule"
    | "generatefile"
    | "iniedit"
    | "unsupported"
    | "attribute"
    | "setmodtype"
    | "error"
    | "rule";
```

## Type Reference

| Type | Purpose | Relevant Fields |
| --- | --- | --- |
| `copy` | Copy a file from archive to staging folder | `source`, `destination` |
| `mkdir` | Create a directory | `path` |
| `submodule` | Install a submodule or framework | `submoduleType` |
| `generatefile` | Write generated content as a new file | `path`, `data` (string or Buffer) |
| `iniedit` | Patch a key-value pair in an INI file | `path`, `section`, `key`, `value` |
| `unsupported` | Mark the mod as unsupported | - |
| `attribute` | Set a metadata attribute on the mod | `key`, `value` |
| `setmodtype` | Override the mod type after installation | `value` (mod type id string) |
| `error` | Abort installation with an error message | `value` (message string) |
| `rule` | Add a dependency or conflict rule | `rule` (IRule from modmeta-db) |

## Common Patterns

### copy (most common)
```js
{ type: 'copy', source: filePath, destination: filePath }
```

### setmodtype
```js
{ type: 'setmodtype', value: MOD_TYPE_ID }
```

### attribute
```js
{ type: 'attribute', key: 'isPatch', value: true }
```

### generatefile
```js
{ type: 'generatefile', path: 'config/settings.ini', data: '[Settings]\nKey=Value\n' }
```

### iniedit
```js
{ type: 'iniedit', path: 'settings.ini', section: 'Settings', key: 'MyKey', value: '1' }
```

### error
```js
{ type: 'error', value: 'This mod requires the base game DLC.' }
```

## Install Function Contract

```js
function testSupported(files, gameId) {
    // return { supported: bool, requiredFiles: [] }
}

function install(files) {
    const instructions = files
        .filter(f => !f.endsWith(path.sep))
        .map(f => ({ type: 'copy', source: f, destination: f }));
    return Promise.resolve({ instructions });
}
```

`IInstallResult` = `{ instructions: IInstruction[] }` (api.d.ts line 4680).
