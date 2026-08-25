# Vortex Databases

Vortex keeps its persistent state in two LevelDB key/value stores inside its user-data folder. Everything the app remembers between launches — discovered games, installed mods, profiles, load orders, download history, settings, the Nexus session — lives in one of them. Reading them directly is the only way to inspect Vortex's real state without the app's UI, and it is often faster than asking a user for screenshots when diagnosing an extension problem.

This document describes where the stores are, the format on disk, the key layout, and how to read them safely.

---

## Which folder is live

Vortex resolves its user-data folder in two steps, because Multi-User Mode moves everything:

1. Open the per-user store at `%APPDATA%\Vortex\state.v2` and read the key `user###multiUser`.
2. If that value is `true`, the real data folder is `%PROGRAMDATA%\vortex`. Otherwise it stays `%APPDATA%\Vortex`.

The per-user store is never deleted when Multi-User Mode is switched on, so on a machine that has been switched it survives as a stale snapshot from whatever version was running at the time — often thousands of keys that no longer reflect anything. Only `user###multiUser` is read from it. Do not mistake it for live state.

Two overrides exist:

| Situation | Folder |
| --- | --- |
| `--user-data <path>` on the command line | the given path |
| Source build (`Vortex` repo, `pnpm start`) | `%APPDATA%\@vortex\main` |

The active folder can also be confirmed from a log line at startup or from `startup.json`, which sits next to the stores and records `storeVersion` (the app version that last wrote them).

---

## The two stores

| Directory | Contents |
| --- | --- |
| `state.v2` | The persisted Redux state — the whole application. Typically 5–15 MiB, hundreds of thousands of keys on a heavily used install. |
| `metadb` | Nexus mod-metadata cache, keyed by file hash. Populated by MD5 lookups during install and by download metadata. |

Other files in the same folder are Chromium's, not Vortex's: `Cache`, `Code Cache`, `GPUCache`, `Local Storage`, `IndexedDB`, `Session Storage`, `Network`, `DIPS`, `SharedStorage`, `blob_storage`. They hold browser-level state for the Electron window and contain nothing about mods.

A handful of plain JSON sidecars sit alongside the stores and are read before the database opens, so they are not part of it: `startup.json` (app version, GPU flag), `flag-cache.json`, `crashinfo.json`, `extensions-manifest.json`.

---

## On-disk format

Both stores are ordinary LevelDB directories:

| File | Role |
| --- | --- |
| `NNNNNN.ldb` | Sorted string table (SST). Compacted, immutable, snappy-compressed blocks. |
| `NNNNNN.log` | Write-ahead log. Holds writes not yet compacted into a table. |
| `MANIFEST-NNNNNN` | Version edits — which tables belong to which level. |
| `CURRENT` | One line naming the live manifest. |
| `LOCK` | Held exclusively by the process that has the database open. |
| `LOG` / `LOG.old` | LevelDB's own human-readable activity log (compactions, recovery). |

Vortex 2.x reaches this data through DuckDB rather than a LevelDB binding, but **the disk format is unchanged**. `src/main/src/store/DuckDBSingleton.ts` loads a custom DuckDB extension called `level_pivot` and runs:

```sql
ATTACH '<path to state.v2>' AS db0 (TYPE level_pivot, CREATE_IF_MISSING true);
CALL level_pivot_create_table('db0', 'kv', NULL, ['key', 'value'], table_mode := 'raw');
```

which exposes the LevelDB directory as a two-column table `kv(key, value)`. `LevelPersist.ts` then issues plain SQL (`SELECT value FROM db0.kv WHERE key = $1`, `INSERT INTO db0.kv VALUES ($1, $2)`, `DELETE ... WHERE key = $1 OR starts_with(key, $2)`). The DuckDB instance itself is `:memory:` — nothing is stored in DuckDB's own format. A reader that understands LevelDB therefore works against every Vortex version, 1.x and 2.x alike.

---

## Key and value layout

Keys are the Redux state path with segments joined by `###`. Values are JSON.

```text
persistent###mods###skyrimse###SomeMod-123-1-0###attributes###version   =  "1.4.2"
settings###gameMode###discovered###skyrimse###path                      =  "<game install folder>"
```

Three rules govern the shape:

- **One row per leaf.** Objects are decomposed all the way down; there is no JSON blob for a whole mod or a whole profile. A mod with forty attributes is forty rows.
- **Arrays are stored whole.** An array is a leaf, written as one JSON array in a single row.
- **`###` never appears inside a segment**, so splitting on it is unambiguous. Segments may contain dots, spaces and backslashes — mod IDs routinely contain all three.

The mixed case to watch for: a subtree and a scalar can share a path. `persistent###loadOrder###<profileId>` is a single JSON array for some profiles and a set of per-mod child keys for others, depending on which load-order API the game extension uses. Any code that rebuilds nested objects has to tolerate both.

Deleting a path removes the exact key **and every descendant** (`key = $1 OR starts_with(key, $2)`), precisely because of that mixed case — a parent-only delete would orphan the blob row.

---

## Hive map

Five top-level hives exist. Key counts below are from a real install with ~180 discovered games, to give a sense of proportion.

| Hive | Share | What is in it |
| --- | --- | --- |
| `persistent` | ~97% | Everything that survives restarts and belongs to the user's data, not their preferences. |
| `settings` | ~2% | User preferences and per-game configuration. |
| `app` | ~1% | Installed extension inventory, app version, instance id, completed migrations. |
| `confidential` | 3 keys | Nexus OAuth token and refresh token. **Treat as secret.** |
| `user` | 1 key | `multiUser` only — the bootstrap flag described above. |

Paths worth knowing, all verified against a live store:

| Path | Value |
| --- | --- |
| `app###appVersion` | Vortex version that wrote the store |
| `app###migrations` | Array of completed migration ids |
| `app###extensions###<folder name>###version` | Installed extension version, plus `modId`, `fileId`, `author`, `path`, `type`, `endorsed` |
| `settings###gameMode###discovered###<gameId>###path` | Game install folder; absent means the game was never discovered |
| `settings###gameMode###discovered###<gameId>###tools###<toolId>###*` | Registered and user-added tools |
| `settings###mods###installPath###<gameId>` | Staging folder, may contain `{game}` / `{USERDATA}` placeholders |
| `settings###downloads###path` | Download folder |
| `settings###profiles###activeProfileId` | Currently active profile |
| `settings###profiles###lastActiveProfile###<gameId>` | Per-game last active profile id |
| `persistent###mods###<gameId>###<modId>###attributes###*` | Everything the Mods page shows: version, fileId, modId, fileMD5, installTime, category, source |
| `persistent###mods###<gameId>###<modId>###type` | Mod type id |
| `persistent###profiles###<profileId>###gameId` / `name` / `lastActivated` | Profile header |
| `persistent###profiles###<profileId>###modState###<modId>###enabled` | Per-profile enable state — **enablement is a property of the profile, not the mod** |
| `persistent###loadOrder###<profileId>` | FBLO load order (array, or per-entry children) |
| `persistent###ue4ssLoadOrder` / `persistent###logicModsLoadOrder` | Secondary load-order pages registered by UE4-5 extensions |
| `persistent###downloads###files###<downloadId>###*` | Download archive records — usually the largest single subtree |
| `persistent###deployment###deploymentCounter###<gameId>` | Deployment counter |
| `persistent###categories###<gameId>###*` | Category tree |
| `persistent###nexus###userInfo###*` | Logged-in account: name, userId, premium/supporter flags |

`metadb` does not use `###` paths. Its keys are opaque strings:

```text
hash:<fileMD5>:<fileSizeBytes>:<gameId>:  =  [ { fileMD5, fileName, fileVersion, gameId, domainName,
                                                 sourceURI, source, details: { modId, fileId, ... },
                                                 expires } ]
```

The value is an array because one hash can match several Nexus files. This is the cache behind MD5-based metadata assignment, and the reason a mod downloaded outside Nexus can end up carrying another mod's `modId` — see `VORTEX_MOD_METADATA.md`.

---

## Reading while Vortex is running

LevelDB holds a Windows exclusive lock on `LOCK`, the live `MANIFEST-*` and the current `.log` for as long as the database is open. Those three cannot be opened, copied, or shadowed by another process — not with any share mode, not by `cp`, not by Vortex's own `--get`.

The `.ldb` tables are **not** locked and can be read freely at any time.

That produces two modes:

| Vortex state | What is readable | Accuracy |
| --- | --- | --- |
| Closed | Everything, including the write-ahead log | Exact |
| Running | `.ldb` tables only | Complete except for writes made since the last compaction |

The gap is real, not theoretical: a freshly installed mod or a load order changed a minute ago may still be sitting in the WAL. On an active session the WAL can hold a hundred-plus keys. Compaction folds it into a table within a few MB of writes, so the gap closes on its own, but for a definitive read close Vortex first.

Because no MANIFEST is available in running mode, a reader cannot ask LevelDB which tables are live. Reading every `*.ldb` in the directory and keeping the highest sequence number per key gives the correct answer anyway: compaction preserves the newest sequence for each key, so a stale leftover table can never outrank live data. The one residual risk is a deletion whose tombstone was already dropped at the bottom level, which could resurrect a key from an obsolete file — rare enough to note rather than guard against.

---

## Ways to read

### The repository script

`read_vortex_db.py` in this repository is a dependency-free reader: it implements Snappy, the SST table format and the write-ahead log format in pure Python, resolves the active store through the Multi-User Mode flag, and merges tables by sequence number. It redacts the `confidential` hive unless asked not to.

```sh
python read_vortex_db.py --stats
python read_vortex_db.py --games
python read_vortex_db.py --mods skyrimse
python read_vortex_db.py --loadorder skyrimse
python read_vortex_db.py --get settings.gameMode.discovered.skyrimse
python read_vortex_db.py --json persistent.profiles.<profileId>
python read_vortex_db.py --db metadb --get hash:<md5>
```

Path syntax is dotted with `\.` escaping, matching Vortex's own CLI.

See `SCRIPTS.md` for the full option list.

### Vortex's own CLI

```sh
Vortex.exe --get persistent.nexus.userInfo
Vortex.exe --set settings.interface.language=en
Vortex.exe --del persistent.loadOrder.<profileId>
```

`--get` prefix-matches the same way. All three open the database directly, so **they only work while Vortex is closed**, and `--set` / `--del` will corrupt state if pointed at the wrong path. `--restore <file>` imports a JSON state backup, flattening it into leaf rows on the way in.

### DuckDB with the level_pivot extension

If the `level_pivot` extension binary is available (Vortex downloads it into `duckdb-extensions/` under the app's unpacked base folder), any DuckDB client can attach the store with the `ATTACH ... (TYPE level_pivot)` statement above and query `kv` with SQL. This is the same path the app uses, and it is subject to the same lock.

---

## Format notes for implementers

Enough detail to write a reader from scratch. All integers are little-endian.

**SST table** — the footer is the last 48 bytes: two block handles (metaindex, index), zero padding, then the 8-byte magic `0xDB4775248B80FB57`. A block handle is two varints, offset and size. Follow the index handle to the index block; each of its entries has a block handle as its value, pointing at a data block.

**Block** — entries followed by a restart array. The last 4 bytes give the restart count; the restart offsets occupy the 4 bytes each before that. Each entry is `varint shared`, `varint unshared`, `varint value_len`, then `unshared` key bytes and `value_len` value bytes. Keys are prefix-compressed against the previous key, so the full key is `previous[:shared] + delta`. On disk each block is followed by a 1-byte compression type (`0` none, `1` snappy) and a 4-byte CRC that a reader can skip.

**Internal keys** — every key in a table carries an 8-byte trailer: `sequence << 8 | type`, where type `1` is a value and `0` a deletion tombstone. Strip it to get the user key. Merging across tables means keeping the entry with the highest sequence and discarding the key entirely when that entry is a tombstone.

**Write-ahead log** — a sequence of 32 KiB blocks. Each record is a 7-byte header (4-byte CRC, 2-byte length, 1-byte type) followed by its payload; types are `1` FULL, `2` FIRST, `3` MIDDLE, `4` LAST, so a payload can span blocks. Fewer than 7 bytes left in a block means zero padding — skip to the next block boundary. Each assembled payload is a write batch: 8-byte sequence, 4-byte count, then `count` records of `type byte`, length-prefixed key, and for values a length-prefixed value. The n-th record in a batch has sequence `batch_sequence + n`.

**Snappy** — LevelDB writes raw Snappy blocks (varint uncompressed length, then literal and copy tags). Copies can overlap the output cursor and must be emitted byte by byte when the offset is shorter than the length.

---

## Cautions

- **Never write to a live store.** These are the user's mods, profiles and load orders. Read-only access is the only safe mode; the reader in this repository never opens a file for writing.
- **`confidential` holds a live Nexus OAuth token.** Do not print it, log it, paste it into a report, or send it anywhere. Redact by default and require an explicit opt-in to display.
- **`persistent###nexus###userInfo` holds the account email.** Redact it in anything shared.
- A store read while Vortex is running is a snapshot with a known gap; say so when reporting from one rather than presenting it as current.

---

## See also

`VORTEX_APP.md` (the persistence layer in context — `LevelPersist`, `DuckDBSingleton`, the query system and the IPC persistor that write these stores) · `VORTEX_MOD_METADATA.md` (what `metadb` is for and how an MD5 hit becomes a mod's `modId`) · `VORTEX_PROFILES.md` (why enablement lives under `persistent###profiles`, not under the mod) · `VORTEX_LOAD_ORDER.md` (the FBLO state written to `persistent###loadOrder`) · `VORTEX_DEPLOYMENT.md` (`persistent###deployment` and the manifest that pairs with it) · `DEPLOYMENT_MANIFEST.md` · `STATE_HELPERS.md` (reading the same state from inside an extension, where none of this parsing is needed) · `SCRIPTS.md` (`read_vortex_db.py` options).
