# Mod Rules and Dependencies

Rules express relationships between mods (requires, conflicts, load order). They are stored on `IMod.rules[]` and can be added via actions or returned from an installer.

---

## IRule (modmeta-db base)

```ts
interface IRule {
  type: 'requires' | 'recommends' | 'conflicts' | 'provides' | 'before' | 'after';
  reference: IModReference;
}
```

---

## IModRule (extends IRule)

```ts
interface IModRule extends IRule {
  reference: IModReference;       // required — the referenced mod
  fileList?: IFileListItem[];     // specific files that satisfy the rule
  installerChoices?: any;         // installer step choices for the dependency
  downloadHint?: IDownloadHint;   // how to download if missing
  extra?: { [key: string]: any }; // freeform extra data
  ignored?: boolean;              // user chose to ignore this rule
}
```

### IDownloadHint

```ts
interface IDownloadHint {
  mode: 'direct' | 'browse' | 'manual';
  url?: string;          // direct download URL (mode='direct')
  instructions?: string; // text shown to user (mode='manual')
}
```

---

## IModReference (extends IReference from modmeta-db)

Identifies a mod by one or more of:

| Field | Description |
| --- | --- |
| `id` | Stable internal mod ID (UUIDs only; never a Nexus mod ID) |
| `idHint` | Hint for lookup (not authoritative) |
| `md5Hint` | Archive MD5 hash |
| `tag` | User tag |
| `archiveId` | Download archive ID |
| `repo` | `{ repository, campaign?, gameId?, modId?, fileId }` — Nexus/repo reference |
| `description` | Human-readable label |
| `instructions` | Install instructions for the user |

---

## Rule types

| Type | Meaning |
| --- | --- |
| `requires` | Mod must also be installed for this mod to work |
| `recommends` | Mod is suggested but not required |
| `conflicts` | Mod should NOT be installed together |
| `provides` | This mod can satisfy a `requires` rule pointing at the reference |
| `before` | Load/deploy this mod before the reference |
| `after` | Load/deploy this mod after the reference |

---

## Managing rules with actions

```js
// Add a rule to a mod
api.store.dispatch(actions.addModRule(gameId, modId, {
  type: 'requires',
  reference: { repo: { repository: 'nexus', gameId: 'skyrimse', modId: '12345', fileId: '67890' } },
  downloadHint: { mode: 'browse', url: 'https://www.nexusmods.com/skyrimse/mods/12345' },
}));

// Remove a rule
api.store.dispatch(actions.removeModRule(gameId, modId, rule));

// Clear all rules
api.store.dispatch(actions.clearModRules(gameId, modId));
```

---

## Returning rules from an installer

```js
async function install(files, destinationPath, gameId) {
  return {
    instructions: [
      { type: 'copy', source: 'mod.pak', destination: 'mod.pak' },
      {
        type: 'rule',
        rule: {
          type: 'requires',
          reference: {
            repo: { repository: 'nexus', gameId, modId: '999', fileId: '1234' },
            description: 'RequiredMod',
          },
          downloadHint: { mode: 'browse' },
        },
      },
    ],
  };
}
```

---

## Utility functions

```js
// Find a mod by reference (checks id, md5, tag, repo)
const mod = util.findModByRef(reference, state.persistent.mods[gameId]);

// Test if a reference matches a specific mod
const matches = util.testModReference(mod, reference, sourceModId);

// Test by loose identifiers (Nexus IDs etc.)
const matches = util.testRefByIdentifiers(
  { gameId: 'skyrimse', modId: 12345, fileId: 67890 },
  reference
);

// Build a reference from an existing mod
const ref = util.makeModReference(mod);

// Generate a stable ID for a rule (for dedup)
const ruleId = util.modRuleId(rule);
```

---

## Triggering dependency install

```js
api.events.emit('install-dependencies', profileId, gameId, [modId]);
```

---

## Notes

- `IRule` and `IReference` come from `modmeta-db` — they are not in `api.d.ts` directly.
- `repo.modId` is the **Nexus mod ID** (numeric); `IMod.id` is Vortex's internal ID — never confuse them.
- `ignored: true` means the user chose to skip this rule — respect it and do not re-prompt.
- `before`/`after` rules affect load order / deployment order, not just UI.
