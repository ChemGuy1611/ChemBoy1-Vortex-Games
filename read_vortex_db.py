#!/usr/bin/env python3
r"""
read_vortex_db.py
-----------------
Reads Vortex's on-disk LevelDB stores directly and prints the live application
state. Pure Python stdlib -- no LevelDB binding, no DuckDB, no Node. Includes
its own Snappy decompressor, SST (.ldb) table reader and write-ahead-log (.log)
reader, so it works on any machine that has Python.

Vortex keeps two LevelDB directories under its user-data folder:

    state.v2    the persisted Redux state (mods, profiles, load orders, settings)
    metadb      the Nexus mod-metadata cache keyed by file MD5

Both are flat key/value stores. State keys are the Redux state path joined with
"###" and values are JSON, one row per leaf value.

While Vortex is running it holds an exclusive Windows lock on MANIFEST-* and the
current .log, so only the compacted .ldb files can be read. That still yields
the whole store minus writes made since the last compaction; the script warns
when it happens. Close Vortex for an exact read.

Usage:
    python read_vortex_db.py --hives
    python read_vortex_db.py --get persistent.nexus.userInfo
    python read_vortex_db.py --keys persistent.mods
    python read_vortex_db.py --tree settings.gameMode.discovered.skyrimse --depth 2
    python read_vortex_db.py --json persistent.profiles.AbCdEfGhI
    python read_vortex_db.py --games
    python read_vortex_db.py --mods GAME_ID
    python read_vortex_db.py --profiles [GAME_ID]
    python read_vortex_db.py --loadorder GAME_ID
    python read_vortex_db.py --db metadb --get hash:MD5
    python read_vortex_db.py --db per-user --hives
    python read_vortex_db.py --path DIR --stats
    python read_vortex_db.py --get PATH --show-secrets --no-wal --out FILE

Environment variables:
    APPDATA        Standard Windows variable. Per-user Vortex data lives in
                   %APPDATA%\Vortex; the dev build uses %APPDATA%\@vortex\main.
    PROGRAMDATA    Standard Windows variable. Multi-User Mode data lives in
                   %PROGRAMDATA%\vortex.

Options:
    --db WHICH        Which store to read. One of:
                        state     active state.v2 (default; follows Multi-User Mode)
                        metadb    Nexus metadata cache next to the active state
                        per-user  %APPDATA%\Vortex\state.v2, ignoring Multi-User Mode
                        shared    %PROGRAMDATA%\vortex\state.v2
                        dev       %APPDATA%\@vortex\main\state.v2 (source build)
    --path DIR        Read this LevelDB directory instead of a named store.
    --get PATH        Print every key at or under PATH as "path = json".
    --keys PATH       Print the immediate child segment names under PATH.
    --tree PATH       Print keys under PATH, collapsed at --depth levels.
    --depth N         Depth for --tree, counted from PATH. Default: 1.
    --json PATH       Rebuild the nested object under PATH and print it as JSON.
    --hives           Print every top-level hive with its key count.
    --stats           Print store location, file inventory and key counts.
    --games           Print discovered games: id, install path, active profile.
    --mods GAME_ID    Print installed mods for a game with version and state.
    --profiles [ID]   Print profiles, optionally filtered to one game id.
    --loadorder GAME  Print the stored load order for a game's active profile.
    --no-wal          Skip the write-ahead log even when it is readable.
    --show-secrets    Print confidential values instead of redacting them.
    --out FILE        Write output to FILE instead of stdout.
"""

import argparse
import glob
import json
import os
import re
import struct
import sys

from vortex_utils import write_text_atomic

SEPARATOR = "###"
TABLE_MAGIC = 0xDB4775248B80FB57
FOOTER_LEN = 48
WAL_BLOCK = 32768
REDACT_KEY = re.compile(r"token|password|secret|apikey|api_key", re.IGNORECASE)
REDACTED = '"<redacted>"'


# --------------------------------------------------------------- primitives


def _varint(buf, pos):
    """Decode a LevelDB varint, returning (value, position after it)."""
    result = 0
    shift = 0
    while True:
        byte = buf[pos]
        pos += 1
        result |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return result, pos
        shift += 7


def snappy_decompress(data):
    """Decompress a raw Snappy block (the format LevelDB writes)."""
    expected, pos = _varint(data, 0)
    out = bytearray()
    end = len(data)
    while pos < end:
        tag = data[pos]
        kind = tag & 0x03
        if kind == 0:  # literal
            length = tag >> 2
            if length < 60:
                pos += 1
            elif length == 60:
                length = data[pos + 1]
                pos += 2
            elif length == 61:
                length = data[pos + 1] | (data[pos + 2] << 8)
                pos += 3
            elif length == 62:
                length = data[pos + 1] | (data[pos + 2] << 8) | (data[pos + 3] << 16)
                pos += 4
            else:
                length = int.from_bytes(data[pos + 1 : pos + 5], "little")
                pos += 5
            length += 1
            out += data[pos : pos + length]
            pos += length
            continue
        if kind == 1:  # copy, 1-byte offset
            length = ((tag >> 2) & 0x07) + 4
            offset = ((tag >> 5) << 8) | data[pos + 1]
            pos += 2
        elif kind == 2:  # copy, 2-byte offset
            length = (tag >> 2) + 1
            offset = data[pos + 1] | (data[pos + 2] << 8)
            pos += 3
        else:  # copy, 4-byte offset
            length = (tag >> 2) + 1
            offset = int.from_bytes(data[pos + 1 : pos + 5], "little")
            pos += 5
        start = len(out) - offset
        if start < 0:
            raise ValueError("snappy back-reference before start of output")
        if offset >= length:
            out += out[start : start + length]
        else:  # overlapping run, must copy byte by byte
            for i in range(length):
                out.append(out[start + i])
    if len(out) != expected:
        raise ValueError(f"snappy size mismatch: got {len(out)}, header said {expected}")
    return bytes(out)


# --------------------------------------------------------------- sst tables


def _block_handle(buf, pos):
    offset, pos = _varint(buf, pos)
    size, pos = _varint(buf, pos)
    return offset, size, pos


def _read_block(handle, offset, size):
    handle.seek(offset)
    raw = handle.read(size + 5)  # block + 1 type byte + 4 crc bytes
    body = raw[:size]
    compression = raw[size]
    if compression == 0:
        return body
    if compression == 1:
        return snappy_decompress(body)
    raise ValueError(f"unsupported block compression type {compression}")


def _iter_block_entries(block):
    """Yield (key, value) from a LevelDB block, undoing prefix compression."""
    restart_count = struct.unpack_from("<I", block, len(block) - 4)[0]
    limit = len(block) - 4 - restart_count * 4
    pos = 0
    key = b""
    while pos < limit:
        shared, pos = _varint(block, pos)
        unshared, pos = _varint(block, pos)
        value_len, pos = _varint(block, pos)
        key = key[:shared] + block[pos : pos + unshared]
        pos += unshared
        value = block[pos : pos + value_len]
        pos += value_len
        yield key, value


def iter_sst(path):
    """Yield (user_key, sequence, value_type, value) for one .ldb table."""
    with open(path, "rb") as handle:
        handle.seek(0, os.SEEK_END)
        size = handle.tell()
        if size < FOOTER_LEN:
            raise ValueError("file too small to be an SST table")
        handle.seek(size - FOOTER_LEN)
        footer = handle.read(FOOTER_LEN)
        magic = struct.unpack_from("<Q", footer, FOOTER_LEN - 8)[0]
        if magic != TABLE_MAGIC:
            raise ValueError(f"bad table magic {magic:#x}")
        _, _, pos = _block_handle(footer, 0)  # metaindex handle, unused
        index_offset, index_size, _ = _block_handle(footer, pos)
        index = _read_block(handle, index_offset, index_size)
        for _, encoded in _iter_block_entries(index):
            data_offset, data_size, _ = _block_handle(encoded, 0)
            block = _read_block(handle, data_offset, data_size)
            for internal_key, value in _iter_block_entries(block):
                trailer = struct.unpack_from("<Q", internal_key, len(internal_key) - 8)[0]
                yield internal_key[:-8], trailer >> 8, trailer & 0xFF, value


# --------------------------------------------------------- write-ahead log


def iter_wal(path):
    """Yield (user_key, sequence, value_type, value) for one .log file."""
    with open(path, "rb") as handle:
        data = handle.read()
    batches = []
    fragment = bytearray()
    pos = 0
    while pos + 7 <= len(data):
        remaining = WAL_BLOCK - (pos % WAL_BLOCK)
        if remaining < 7:  # zero padding at the tail of a block
            pos += remaining
            continue
        length = struct.unpack_from("<H", data, pos + 4)[0]
        record_type = data[pos + 6]
        payload = data[pos + 7 : pos + 7 + length]
        pos += 7 + length
        if record_type == 1:  # FULL
            batches.append(bytes(payload))
        elif record_type == 2:  # FIRST
            fragment = bytearray(payload)
        elif record_type == 3:  # MIDDLE
            fragment += payload
        elif record_type == 4:  # LAST
            fragment += payload
            batches.append(bytes(fragment))
            fragment = bytearray()
    for batch in batches:
        if len(batch) < 12:
            continue
        sequence = struct.unpack_from("<Q", batch, 0)[0]
        count = struct.unpack_from("<I", batch, 8)[0]
        pos = 12
        for index in range(count):
            if pos >= len(batch):
                break
            value_type = batch[pos]
            pos += 1
            key_len, pos = _varint(batch, pos)
            key = batch[pos : pos + key_len]
            pos += key_len
            if value_type == 1:
                value_len, pos = _varint(batch, pos)
                value = batch[pos : pos + value_len]
                pos += value_len
            else:
                value = b""
            yield key, sequence + index, value_type, value


# ------------------------------------------------------------------ reader


def read_db(db_dir, include_wal=True, warn=None):
    """Merge every table and log in db_dir into a {key: json_string} dict.

    Entries carry a monotonically increasing sequence number, so the newest
    write for a key always wins regardless of which file it came from. Rows
    whose newest entry is a deletion tombstone are dropped.
    """
    newest = {}
    locked = []
    sources = sorted(glob.glob(os.path.join(db_dir, "*.ldb")))
    if include_wal:
        sources += sorted(glob.glob(os.path.join(db_dir, "*.log")))
    for path in sources:
        reader = iter_wal if path.endswith(".log") else iter_sst
        try:
            for key, sequence, value_type, value in reader(path):
                current = newest.get(key)
                if current is None or sequence > current[0]:
                    newest[key] = (sequence, value_type, value)
        except PermissionError:
            locked.append(os.path.basename(path))
        except OSError as err:
            if getattr(err, "winerror", None) == 32:  # sharing violation
                locked.append(os.path.basename(path))
            else:
                raise
    if locked and warn is not None:
        warn(locked)
    return {
        key.decode("utf8", "replace"): value.decode("utf8", "replace")
        for key, (_, value_type, value) in newest.items()
        if value_type == 1
    }


# --------------------------------------------------------- store locations


def _appdata():
    return os.environ.get("APPDATA", "")


def _programdata():
    return os.environ.get("PROGRAMDATA", os.environ.get("ProgramData", ""))


def per_user_dir():
    return os.path.join(_appdata(), "Vortex")


def shared_dir():
    return os.path.join(_programdata(), "vortex")


def dev_dir():
    return os.path.join(_appdata(), "@vortex", "main")


def active_user_data():
    """Resolve the user-data folder Vortex is actually using.

    Vortex always opens the per-user store first and reads `user.multiUser`
    from it. When that flag is true the real state lives in the shared folder
    under %PROGRAMDATA%; the per-user store is left behind as a stub.
    """
    base = per_user_dir()
    state = os.path.join(base, "state.v2")
    if os.path.isdir(state):
        try:
            flag = read_db(state, include_wal=False).get("user" + SEPARATOR + "multiUser")
        except (OSError, ValueError):
            flag = None
        if flag and json.loads(flag) is True:
            shared = shared_dir()
            if os.path.isdir(os.path.join(shared, "state.v2")):
                return shared
    return base


def resolve_db(which, explicit_path):
    if explicit_path:
        return os.path.abspath(explicit_path)
    if which == "per-user":
        return os.path.join(per_user_dir(), "state.v2")
    if which == "shared":
        return os.path.join(shared_dir(), "state.v2")
    if which == "dev":
        return os.path.join(dev_dir(), "state.v2")
    if which == "metadb":
        return os.path.join(active_user_data(), "metadb")
    return os.path.join(active_user_data(), "state.v2")


# ------------------------------------------------------------ path helpers


def split_path(text):
    """Split a dotted state path, honouring backslash-escaped dots.

    Matches the syntax Vortex's own `--get` accepts, so a path copied from one
    works in the other.
    """
    if not text:
        return []
    return [part.replace("\\.", ".") for part in re.findall(r"(?:\\.|[^.])+", text)]


def join_key(parts):
    return SEPARATOR.join(parts)


def display_path(key):
    return ".".join(segment.replace(".", "\\.") for segment in key.split(SEPARATOR))


def redact(key, value, show_secrets):
    if show_secrets:
        return value
    segments = key.split(SEPARATOR)
    if segments[0] == "confidential" or REDACT_KEY.search(segments[-1]):
        return REDACTED
    return value


def matching(store, prefix_parts):
    """Every key at or under a state path, as a sorted list."""
    if not prefix_parts:
        return sorted(store)
    exact = join_key(prefix_parts)
    under = exact + SEPARATOR
    return sorted(key for key in store if key == exact or key.startswith(under))


def unflatten(store, prefix_parts):
    """Rebuild the nested object stored under a state path.

    A scalar and a subtree can share a path -- some state is written as one JSON
    blob at an intermediate key while its siblings are decomposed per leaf. The
    subtree wins and the scalar is kept alongside it under "__value__".
    """
    root = {}
    depth = len(prefix_parts)
    for key in matching(store, prefix_parts):
        segments = key.split(SEPARATOR)[depth:]
        try:
            value = json.loads(store[key])
        except json.JSONDecodeError:
            value = store[key]
        if not segments:
            return value
        node = root
        for segment in segments[:-1]:
            existing = node.get(segment)
            if not isinstance(existing, dict):
                node[segment] = {} if existing is None else {"__value__": existing}
            node = node[segment]
        leaf = segments[-1]
        if isinstance(node.get(leaf), dict):
            node[leaf]["__value__"] = value
        else:
            node[leaf] = value
    return root


# -------------------------------------------------------------- formatting


def fmt_stats(db_dir, store, locked):
    tables = sorted(glob.glob(os.path.join(db_dir, "*.ldb")))
    logs = sorted(glob.glob(os.path.join(db_dir, "*.log")))
    total = sum(os.path.getsize(path) for path in tables + logs)
    lines = [
        f"store      {db_dir}",
        f"tables     {len(tables)} .ldb files",
        f"logs       {len(logs)} .log files",
        f"on disk    {total / 1048576:.1f} MiB",
        f"live keys  {len(store)}",
    ]
    if locked:
        lines.append("locked     " + ", ".join(locked) + "  (Vortex is running)")
    return lines


def fmt_hives(store):
    counts = {}
    for key in store:
        counts[key.split(SEPARATOR)[0]] = counts.get(key.split(SEPARATOR)[0], 0) + 1
    return [
        f"{count:9}  {hive}" for hive, count in sorted(counts.items(), key=lambda kv: -kv[1])
    ]


def fmt_tree(store, prefix_parts, depth, show_secrets):
    base = len(prefix_parts)
    groups = {}
    for key in matching(store, prefix_parts):
        segments = key.split(SEPARATOR)
        node = SEPARATOR.join(segments[: base + depth])
        groups.setdefault(node, []).append(key)
    lines = []
    for node in sorted(groups):
        keys = groups[node]
        if len(keys) == 1 and keys[0] == node:
            lines.append(f"{display_path(node)} = {redact(node, store[node], show_secrets)}")
        else:
            lines.append(f"{display_path(node)}  ({len(keys)} keys)")
    return lines


def fmt_games(store):
    games = sorted(
        {
            key.split(SEPARATOR)[3]
            for key in store
            if key.startswith("settings###gameMode###discovered###")
        }
    )
    active = {}
    for key, value in store.items():
        if key.startswith("settings###profiles###lastActiveProfile###"):
            active[key.split(SEPARATOR)[3]] = json.loads(value)
    lines = []
    for game in games:
        path_key = f"settings###gameMode###discovered###{game}###path"
        if path_key not in store:
            continue  # known but never discovered on this machine
        install = json.loads(store[path_key])
        mods = len(
            {
                key.split(SEPARATOR)[3]
                for key in store
                if key.startswith(f"persistent###mods###{game}###")
            }
        )
        lines.append(f"{game:<44} mods={mods:<5} profile={active.get(game, '-'):<12} {install}")
    return lines


def fmt_mods(store, game):
    prefix = f"persistent###mods###{game}###"
    ids = sorted({key.split(SEPARATOR)[3] for key in store if key.startswith(prefix)})
    enabled = {}
    # Enabled/disabled is per profile, not per mod, so it comes from whichever
    # profile the game last had active.
    profile_key = f"settings###profiles###lastActiveProfile###{game}"
    profile = json.loads(store[profile_key]) if profile_key in store else None
    if profile:
        state_prefix = f"persistent###profiles###{profile}###modState###"
        for key, value in store.items():
            if key.startswith(state_prefix) and key.endswith("###enabled"):
                enabled[key[len(state_prefix) : -len("###enabled")]] = json.loads(value)
    lines = []
    for mod_id in ids:
        version = store.get(f"{prefix}{mod_id}###attributes###version", '"?"')
        mod_type = store.get(f"{prefix}{mod_id}###type", '""')
        flag = enabled.get(mod_id)
        mark = "on " if flag is True else ("off" if flag is False else "-  ")
        lines.append(f"{mark} {json.loads(version):<16} {json.loads(mod_type) or '-':<22} {mod_id}")
    lines.append(f"({len(ids)} mods, profile {profile or '-'})")
    return lines


def fmt_profiles(store, game):
    ids = sorted({key.split(SEPARATOR)[2] for key in store if key.startswith("persistent###profiles###")})
    lines = []
    for profile in ids:
        prefix = f"persistent###profiles###{profile}###"
        game_id = store.get(prefix + "gameId")
        if game_id is None:
            continue
        game_id = json.loads(game_id)
        if game and game_id != game:
            continue
        name = json.loads(store.get(prefix + "name", '"?"'))
        mods = len(
            {
                key.split(SEPARATOR)[4]
                for key in store
                if key.startswith(prefix + "modState###")
            }
        )
        lines.append(f"{profile:<12} {game_id:<44} {name:<20} modState={mods}")
    return lines


def fmt_loadorder(store, game):
    profile_key = f"settings###profiles###lastActiveProfile###{game}"
    if profile_key not in store:
        return [f"no active profile recorded for {game}"]
    profile = json.loads(store[profile_key])
    parts = ["persistent", "loadOrder", profile]
    data = unflatten(store, parts)
    if not data:
        return [f"no load order stored for profile {profile}"]
    return [f"profile {profile}", json.dumps(data, indent=2)]


# -------------------------------------------------------------------- main


def build_output(args, db_dir, store, locked):
    show = args.show_secrets
    if args.stats:
        return fmt_stats(db_dir, store, locked)
    if args.hives:
        return fmt_hives(store)
    if args.games:
        return fmt_games(store)
    if args.mods:
        return fmt_mods(store, args.mods)
    if args.profiles is not None:
        return fmt_profiles(store, args.profiles or None)
    if args.loadorder:
        return fmt_loadorder(store, args.loadorder)
    if args.keys is not None:
        parts = split_path(args.keys)
        depth = len(parts)
        children = sorted(
            {
                key.split(SEPARATOR)[depth]
                for key in matching(store, parts)
                if len(key.split(SEPARATOR)) > depth
            }
        )
        return children
    if args.tree is not None:
        return fmt_tree(store, split_path(args.tree), max(1, args.depth), show)
    if args.json is not None:
        return [json.dumps(unflatten(store, split_path(args.json)), indent=2)]
    if args.get is not None:
        parts = split_path(args.get)
        keys = matching(store, parts)
        if not keys and parts:
            # metadb keys are opaque strings, not "###" paths -- fall back to
            # a plain prefix match on the raw key.
            keys = sorted(key for key in store if key.startswith(args.get))
        return [f"{display_path(key)} = {redact(key, store[key], show)}" for key in keys]
    return fmt_stats(db_dir, store, locked)


def main():
    parser = argparse.ArgumentParser(
        description="Read Vortex's LevelDB stores and print the live state.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--db",
        choices=["state", "metadb", "per-user", "shared", "dev"],
        default="state",
        help="which store to read (default: state)",
    )
    parser.add_argument("--path", help="read this LevelDB directory instead")
    parser.add_argument("--get", help="print every key at or under this state path")
    parser.add_argument("--keys", help="print immediate child segments under this path")
    parser.add_argument("--tree", help="print keys under this path, collapsed by --depth")
    parser.add_argument("--depth", type=int, default=1, help="depth for --tree (default: 1)")
    parser.add_argument("--json", help="rebuild the nested object under this path")
    parser.add_argument("--hives", action="store_true", help="list top-level hives")
    parser.add_argument("--stats", action="store_true", help="describe the store")
    parser.add_argument("--games", action="store_true", help="list discovered games")
    parser.add_argument("--mods", metavar="GAME_ID", help="list installed mods for a game")
    parser.add_argument(
        "--profiles", nargs="?", const="", metavar="GAME_ID", help="list profiles"
    )
    parser.add_argument("--loadorder", metavar="GAME_ID", help="print a game's load order")
    parser.add_argument("--no-wal", action="store_true", help="skip the write-ahead log")
    parser.add_argument("--show-secrets", action="store_true", help="do not redact secrets")
    parser.add_argument("--out", help="write output to this file instead of stdout")
    args = parser.parse_args()

    # Mod descriptions and file names carry arbitrary Unicode -- BOMs, box
    # drawing, emoji. The Windows console defaults to cp1252 and raises on all
    # of it, so force UTF-8 and degrade unencodable characters instead.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass

    db_dir = resolve_db(args.db, args.path)
    if not os.path.isdir(db_dir):
        print(f"ERROR: no such database directory: {db_dir}", file=sys.stderr)
        return 1

    locked = []
    store = read_db(db_dir, include_wal=not args.no_wal, warn=locked.extend)
    if locked and not args.stats:
        print(
            f"WARNING: {', '.join(locked)} locked by a running Vortex - "
            "results omit writes made since the last compaction",
            file=sys.stderr,
        )

    lines = build_output(args, db_dir, store, locked)
    text = "\n".join(lines)
    if args.out:
        write_text_atomic(args.out, text + "\n")
        print(f"wrote {len(lines)} lines to {args.out}")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
