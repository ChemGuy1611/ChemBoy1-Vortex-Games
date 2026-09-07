"""
migrate_fs.py

Migrate Vortex game extensions, templates and shared modules off the vortex-api
`fs` wrapper onto native node `fs` / `fs.promises`.

Import convention A (decided at plan sign-off): after migration `fs` in every file
means native node fs. The vortex-api wrapper is rebound to `vfs` and kept only for
the two methods that have no native counterpart:

    const fs = require('fs');            // sync + constants  (inserted when needed)
    const fsp = fs.promises;             // async             (inserted when needed)
    const { fs: vfs, util, log } = require('vortex-api');

    await vfs.ensureDirWritableAsync(dir);   // no native equivalent
    await vfs.unlinkAsync(filePath);         // swallows ENOENT

Because `fs` changes meaning, the per-file rewrite is ATOMIC: a file is migrated
whole or skipped whole. Any call site the script misses throws
`TypeError: fs.X is not a function` on first run rather than misbehaving silently,
so `--report` must show zero residual migratable members for every migrated file.

Method mapping (vortex-api -> native):

    statSync readdirSync readFileSync writeFileSync   unchanged (fs is now native)
    statAsync        -> fsp.stat
    readdirAsync     -> fsp.readdir
    readFileAsync    -> fsp.readFile
    writeFileAsync   -> fsp.writeFile
    renameAsync      -> fsp.rename
    symlinkAsync     -> fsp.symlink
    ensureDirSync    -> fs.mkdirSync(p, { recursive: true })
    ensureDirAsync   -> fsp.mkdir(p, { recursive: true })
    removeAsync      -> fsp.rm(p, { recursive: true, force: true })
    copyAsync        -> fsp.cp(s, d, { recursive: true })   ({ overwrite: true } dropped)
    ensureFileAsync  -> local ensureFileAsync() helper, injected once per file
    ensureDirWritableAsync, unlinkAsync           -> vfs.  (kept on the wrapper)
    openAsync readAsync writeAsync closeAsync fsyncAsync   -> vfs.  (fd form only)
    moveAsync        -> NOT scripted; reported for hand migration

Also folds partial native imports into the rebind:
  - const { createWriteStream } = require('fs')   -> call sites become fs.createWriteStream
  - const fsNative = require('fs')                -> folded into const fs = require('fs')
  - const fsPromises = require('fs/promises')     -> renamed to fsp (fs.promises)
`fs-extra` is left untouched here; its retirement is a separate later step.
Inserted code follows the quote style the file already uses for require(), so the
output survives the repo's oxfmt formatting unchanged.

Usage:
    python migrate_fs.py GAME_ID [GAME_ID ...]      # migrate game-<id>/ (index.js + downloader/browser siblings)
    python migrate_fs.py --templates                # also migrate template-*/
    python migrate_fs.py --shared                   # also migrate resources/downloader + resources/browsers
    python migrate_fs.py --custom                   # also migrate zCustomGames/** + helper-*/
    python migrate_fs.py --all                      # every in-scope file
    python migrate_fs.py --all --dry-run            # preview every change, write nothing
    python migrate_fs.py --all --report             # print the method census + residual counts, write nothing
    python migrate_fs.py GAME_ID --dry-run
    python migrate_fs.py GAME_ID --no-node-check    # skip the per-file node syntax check before writing

With no GAME_ID and no scope flag, --report implies --all; a bare run errors.
"""

import argparse
import os
import re
import sys

from vortex_utils import (
    REPO_ROOT,
    strip_js_comments,
    detect_eol,
    node_check_source,
    log_info, log_warn, log_error,
)

# ---------------------------------------------------------------------------
# Method tables
# ---------------------------------------------------------------------------

# fs.<name> -> fsp.<target>, a pure prefix+name swap (args untouched).
SIMPLE_RENAME = {
    "statAsync": "fsp.stat",
    "readdirAsync": "fsp.readdir",
    "readFileAsync": "fsp.readFile",
    "writeFileAsync": "fsp.writeFile",
    "renameAsync": "fsp.rename",
    "symlinkAsync": "fsp.symlink",
}

# fs.<name> -> callee, plus an options object injected before the closing paren.
OPT_INJECT = {
    "ensureDirSync": ("fs.mkdirSync", "{ recursive: true }"),
    "ensureDirAsync": ("fsp.mkdir", "{ recursive: true }"),
    "removeAsync": ("fsp.rm", "{ recursive: true, force: true }"),
    # copyAsync is special-cased (drops a trailing { overwrite: true })
}

# Members that are already native once `fs` is rebound - left as fs.<name>.
# Includes the wrapper's sync passthroughs plus names this script itself emits
# (mkdirSync from ensureDirSync, createWriteStream from the createWriteStream fold).
NOOP_NATIVE = {
    "statSync", "readdirSync", "readFileSync", "writeFileSync", "existsSync",
    "mkdirSync", "rmSync", "rmdirSync", "renameSync", "unlinkSync", "copyFileSync",
    "cpSync", "accessSync", "appendFileSync", "lstatSync", "realpathSync",
    "readlinkSync", "symlinkSync", "linkSync", "chmodSync", "utimesSync",
    "openSync", "readSync", "writeSync", "closeSync", "fsyncSync", "opendirSync",
    "createReadStream", "createWriteStream", "watch", "watchFile", "unwatchFile",
    "constants", "promises", "Stats", "Dirent",
}

# Kept on the vortex-api wrapper (rewritten fs. -> vfs.).
KEEP_ON_VFS = {
    # no native equivalent at all
    "ensureDirWritableAsync", "unlinkAsync",
    "moveRenameAsync", "makeFileWritableAsync", "forcePerm",
    "statSilentAsync", "isDirectoryAsync", "removeSync", "mkdirsAsync",
    "changeFileOwnership", "changeFileAttributes", "readFileBOM", "encodingFromBOM",
    "withTmpDir", "withTmpFile",
    # fd-based: fs.promises has no top-level read/write/close/fsync/open pair
    "openAsync", "readAsync", "writeAsync", "closeAsync", "fsyncAsync",
}

# Not scripted - hand migration (fsp.rename + EXDEV fallback).
HAND_MIGRATE = {"moveAsync"}

# Methods that force a native `const fs = require('fs')` binding.
NEEDS_NATIVE_FS = NOOP_NATIVE | {"ensureDirSync"}
# Methods that force a `const fsp = fs.promises` binding.
NEEDS_FSP = set(SIMPLE_RENAME) | {"ensureDirAsync", "removeAsync", "copyAsync", "ensureFileAsync"}

CENSUS_ORDER = [
    "statSync", "statAsync", "ensureDirWritableAsync", "readdirAsync", "readFileAsync",
    "writeFileAsync", "readdirSync", "ensureDirSync", "writeFileSync", "renameAsync",
    "ensureFileAsync", "removeAsync", "unlinkAsync", "copyAsync", "readFileSync",
    "ensureDirAsync", "symlinkAsync", "moveAsync", "openAsync", "readAsync", "closeAsync",
]


def quote_style(stripped):
    """Return the quote char this file uses for require(), so inserted code
    matches the surrounding style. The repo is oxfmt-formatted to double
    quotes, but oxfmt-ignored files (resources/snippets.js) keep their own."""
    dq = len(re.findall(r'require\(\s*"', stripped))
    sq = len(re.findall(r"require\(\s*'", stripped))
    return '"' if dq >= sq else "'"


def ensure_file_helper(q):
    return (
        "// vortex-api's fs.ensureFileAsync is deprecated; this is the node equivalent.\n"
        "async function ensureFileAsync(filePath) {\n"
        "  await fsp.mkdir(path.dirname(filePath), { recursive: true });\n"
        f"  const handle = await fsp.open(filePath, {q}a{q});\n"
        "  await handle.close();\n"
        "}\n"
    )


FS_CALL_RE = re.compile(r"(?<![\w.$])fs\.([A-Za-z][A-Za-z0-9]*)\s*\(")
VORTEX_DESTRUCTURE_RE = re.compile(
    r"(?:const|let)\s*\{[^{}]*?\}\s*=\s*require\(\s*['\"]vortex-api['\"]\s*\)\s*;?",
    re.DOTALL,
)
NAMESPACE_VORTEX_RE = re.compile(
    r"(?:const|let)\s+(\w+)\s*=\s*require\(\s*['\"]vortex-api['\"]\s*\)\s*;?"
)
OVERWRITE_TRUE_RE = re.compile(r"^\{\s*overwrite\s*:\s*true\s*\}$")
RESIDUAL_RE = re.compile(
    r"(?<![\w.$])fs\.(?:\w+Async|ensure[A-Z]\w*|remove[A-Z]\w*|copy(?:Async|Sync)|move\w*|mkdirs\w*)\b"
)

NAMED_SKIP = {
    os.path.join("resources", "snippets.js"),  # reference snippets, hand-fixed (plan W2)
}


# ---------------------------------------------------------------------------
# JS scanning helpers
# ---------------------------------------------------------------------------

def _match_paren(s, open_idx):
    """Return the index of the ')' matching the '(' at open_idx, tracking strings
    and nested brackets. Returns -1 if unbalanced."""
    depth = 0
    i = open_idx
    n = len(s)
    quote = None
    while i < n:
        c = s[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "\"'`":
            quote = c
        elif c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def _split_top_level(s):
    """Split s on top-level commas (ignoring commas inside (), [], {} or strings)."""
    parts = []
    depth = 0
    quote = None
    start = 0
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if quote:
            if c == "\\":
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in "\"'`":
            quote = c
        elif c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
        elif c == "," and depth == 0:
            parts.append(s[start:i])
            start = i + 1
        i += 1
    parts.append(s[start:])
    return parts


def census(src):
    """Return {method: live_call_count} for fs.<method>( in src (comments blanked)."""
    stripped = strip_js_comments(src)
    counts = {}
    for m in FS_CALL_RE.finditer(stripped):
        counts[m.group(1)] = counts.get(m.group(1), 0) + 1
    return counts


# ---------------------------------------------------------------------------
# Per-file migration
# ---------------------------------------------------------------------------

class SkipFile(Exception):
    """Raised to abort a single file with a human message (nothing written)."""


def migrate_source(src, rel):
    """Return (new_src, notes). Raises SkipFile when the file needs hand work.

    notes is a list of strings worth surfacing (hand-migrate sites, oddities).
    new_src == src means nothing to do.
    """
    eol = detect_eol(src)
    work = src.replace("\r\n", "\n")
    stripped = strip_js_comments(work)
    notes = []

    live = {}
    for m in FS_CALL_RE.finditer(stripped):
        live.setdefault(m.group(1), []).append(m)

    unknown = set(live) - NOOP_NATIVE - set(SIMPLE_RENAME) - set(OPT_INJECT) \
        - {"copyAsync", "ensureFileAsync"} - KEEP_ON_VFS - HAND_MIGRATE
    if unknown:
        raise SkipFile(f"unrecognised fs method(s): {', '.join(sorted(unknown))}")

    # --- locate the vortex-api binding -----------------------------------
    vortex_spans = [m for m in VORTEX_DESTRUCTURE_RE.finditer(stripped)
                    if re.search(r"(?<![\w:])\bfs\b(?!\s*:)", m.group(0))]
    ns_match = None
    if not vortex_spans:
        for m in NAMESPACE_VORTEX_RE.finditer(stripped):
            if re.search(rf"(?<![\w.$])\b{m.group(1)}\.fs\b", stripped):
                ns_match = m
                break

    for lm in re.finditer(r"(?:const|let|var)\s+fs\s*=\s*", stripped):
        rhs = stripped[lm.end():lm.end() + 60].lstrip()
        if not re.match(r"require\(\s*['\"](?:node:)?fs['\"]\s*\)", rhs) and not rhs.startswith("fs.promises"):
            raise SkipFile("file binds `fs` to something other than require('fs') - hand migrate")

    has_create_write_stream = bool(
        re.search(r"(?:const|let)\s*\{\s*createWriteStream\s*\}\s*=\s*require\(\s*['\"](?:node:)?fs['\"]\s*\)\s*;?", stripped)
    )
    has_fs_native = bool(
        re.search(r"(?:const|let)\s+fsNative\s*=\s*require\(\s*['\"](?:node:)?fs['\"]\s*\)\s*;?", stripped)
    )
    fs_promises_live = re.search(
        r"[ \t]*(?:const|let)\s+fsPromises\s*=\s*require\(\s*['\"]fs/promises['\"]\s*\)\s*;?[^\n]*\n",
        stripped,
    )
    fs_promises_commented = re.search(
        r"[ \t]*//\s*const\s+fsPromises\s*=\s*require\(\s*['\"]fs/promises['\"]\s*\)\s*;?[^\n]*\n",
        work,
    )
    uses_fs_promises = bool(re.search(r"(?<![\w.$])fsPromises\.", stripped))

    fold_work = bool(has_create_write_stream or has_fs_native or fs_promises_live or uses_fs_promises)
    method_work = any(
        name in SIMPLE_RENAME or name in OPT_INJECT or name in KEEP_ON_VFS
        or name in HAND_MIGRATE or name in ("copyAsync", "ensureFileAsync")
        for name in live
    )

    # Already migrated / nothing to do: no wrapper method calls, no fold work,
    # and the vortex-api destructure no longer binds a bare `fs`.
    if not method_work and not fold_work and not vortex_spans and ns_match is None:
        return src, notes

    if not vortex_spans and ns_match is None:
        raise SkipFile("uses migratable fs.* but no vortex-api `fs` binding found")
    if len(vortex_spans) > 1:
        raise SkipFile(f"{len(vortex_spans)} vortex-api destructures bind fs - hand migrate")

    # --- decide what bindings the migrated file needs -------------------
    needs_vfs = any(name in KEEP_ON_VFS for name in live)
    needs_fsp = any(name in NEEDS_FSP for name in live) or uses_fs_promises
    # `const fsp = fs.promises;` dereferences `fs`, so anything needing fsp needs the
    # native binding too - including a file that calls no sync method at all and drops
    # the vortex-api import entirely.
    needs_native = any(name in NEEDS_NATIVE_FS for name in live) \
        or has_create_write_stream or has_fs_native or fs_promises_live or uses_fs_promises \
        or needs_fsp

    # ordered list of (start, end, replacement) against `work` offsets
    edits = []

    # --- rewrite the vortex-api binding --------------------------------
    if vortex_spans:
        m = vortex_spans[0]
        s, e = m.start(), m.end()
        orig = work[s:e]
        if needs_vfs:
            new = re.sub(r"(?<![\w:])\bfs\b(?!\s*:)", "fs: vfs", orig, count=1)
        else:
            new = re.sub(r"\bfs\s*,\s*|\s*,\s*fs\b", "", orig, count=1)
        edits.append((s, e, new))
        insert_at = s
    else:  # namespace form: const api = require('vortex-api'); ... api.fs.X()
        nsname = ns_match.group(1)
        for mm in re.finditer(rf"(?<![\w.$])\b{re.escape(nsname)}\.fs\b", stripped):
            edits.append((mm.start(), mm.end(), "vfs" if needs_vfs else f"{nsname}.fs"))
        insert_at = ns_match.end()
        if needs_vfs:
            edits.append((insert_at, insert_at, f"\nconst vfs = {nsname}.fs;"))

    # --- fold partial native imports ----------------------------------
    if has_create_write_stream:
        cm = re.search(
            r"[ \t]*(?:const|let)\s*\{\s*createWriteStream\s*\}\s*=\s*require\(\s*['\"](?:node:)?fs['\"]\s*\)\s*;?[^\n]*\n",
            work,
        )
        if cm:
            edits.append((cm.start(), cm.end(), ""))
        for mm in re.finditer(r"(?<![\w.$])createWriteStream\s*\(", stripped):
            edits.append((mm.start(), mm.start(), "fs."))
    if has_fs_native:
        fm = re.search(
            r"[ \t]*(?:const|let)\s+fsNative\s*=\s*require\(\s*['\"](?:node:)?fs['\"]\s*\)\s*;?[^\n]*\n",
            work,
        )
        if fm:
            edits.append((fm.start(), fm.end(), ""))
        for mm in re.finditer(r"(?<![\w.$])fsNative\b", stripped):
            if fm and fm.start() <= mm.start() < fm.end():
                continue  # the declaration itself, being removed
            edits.append((mm.start(), mm.end(), "fs"))
    if fs_promises_live:
        edits.append((fs_promises_live.start(), fs_promises_live.end(), ""))
    if fs_promises_commented and (needs_fsp or uses_fs_promises):
        edits.append((fs_promises_commented.start(), fs_promises_commented.end(), ""))
    if uses_fs_promises:
        for mm in re.finditer(r"(?<![\w.$])fsPromises\.", stripped):
            edits.append((mm.start(), mm.start() + len("fsPromises"), "fsp"))

    # --- insert native bindings --------------------------------------
    have_native_decl = bool(re.search(r"(?:const|let)\s+fs\s*=\s*require\(\s*['\"](?:node:)?fs['\"]\s*\)", stripped))
    have_fsp_decl = bool(re.search(r"(?:const|let)\s+fsp\s*=\s*fs\.promises", stripped))
    quote = quote_style(stripped)
    binding_lines = []
    if needs_native and not have_native_decl:
        binding_lines.append(f"const fs = require({quote}fs{quote});")
    if needs_fsp and not have_fsp_decl:
        binding_lines.append("const fsp = fs.promises;")
    if binding_lines:
        # insert as its own line(s) directly before the vortex-api require line
        line_start = work.rfind("\n", 0, insert_at) + 1
        edits.append((line_start, line_start, "\n".join(binding_lines) + "\n"))

    # --- ensureFileAsync helper -------------------------------------
    if "ensureFileAsync" in live and not re.search(r"function\s+ensureFileAsync\b", stripped):
        # place just before the first top-level function declaration, so every
        # module-level const it leans on (path, fsp) is already bound above it.
        fn = re.search(r"^(?:async\s+function|function)\s+\w+\s*\(", work, re.M)
        if fn:
            anchor = fn.start()
        else:
            reqs = list(re.finditer(r"^(?:const|let|var)\s.*=\s*require\([^\n]*\n", work, re.M))
            anchor = reqs[-1].end() if reqs else 0
        edits.append((anchor, anchor, "\n" + ensure_file_helper(quote) + "\n"))

    # --- rewrite fs.<method>( call sites --------------------------
    for name, matches in live.items():
        for m in matches:
            call_open = m.end() - 1  # index of '('
            if name in NOOP_NATIVE:
                continue
            if name in HAND_MIGRATE:
                ln = work[:m.start()].count("\n") + 1
                notes.append(f"{rel}:{ln}  fs.{name} - NOT scripted, hand-migrate")
                continue
            if name in KEEP_ON_VFS:
                edits.append((m.start(), m.start() + 2, "vfs"))
                continue
            if name in SIMPLE_RENAME:
                edits.append((m.start(), m.end() - 1, SIMPLE_RENAME[name]))
                continue
            if name == "ensureFileAsync":
                edits.append((m.start(), m.end() - 1, "ensureFileAsync"))
                continue
            if name in OPT_INJECT:
                callee, opts = OPT_INJECT[name]
                close = _match_paren(work, call_open)
                if close == -1:
                    raise SkipFile(f"unbalanced parens on fs.{name}")
                edits.append((m.start(), m.end() - 1, callee))  # keep the original '('
                sep = "" if work[call_open + 1:close].strip() == "" else ", "
                edits.append((close, close, f"{sep}{opts}"))
                continue
            if name == "copyAsync":
                close = _match_paren(work, call_open)
                if close == -1:
                    raise SkipFile("unbalanced parens on fs.copyAsync")
                args = _split_top_level(work[call_open + 1:close])
                if len(args) == 3 and OVERWRITE_TRUE_RE.match(args[2].strip()):
                    edits.append((m.start(), m.end() - 1, "fsp.cp"))  # keep the original '('
                    edits.append((call_open + 1, close,
                                  f"{args[0].strip()}, {args[1].strip()}, {{ recursive: true }}"))
                elif len(args) == 2:
                    edits.append((m.start(), m.end() - 1, "fsp.cp"))  # keep the original '('
                    edits.append((close, close, ", { recursive: true }"))
                else:
                    raise SkipFile(f"fs.copyAsync with {len(args)} args / unexpected options")
                continue

    # --- apply edits right-to-left --------------------------------
    edits = [ed for ed in edits if not (ed[0] == ed[1] and ed[2] == "")]
    edits.sort(key=lambda t: (t[0], t[1]), reverse=True)
    out = work
    last_start = len(out) + 1
    for s, e, repl in edits:
        if e > last_start:
            raise SkipFile("overlapping edits (internal) - hand migrate")
        out = out[:s] + repl + out[e:]
        last_start = s

    # --- residual check ------------------------------------------
    resid = [mm.group(0) for mm in RESIDUAL_RE.finditer(strip_js_comments(out))
             if not mm.group(0).endswith("moveAsync")]
    if resid:
        raise SkipFile(f"residual migratable members after rewrite: {sorted(set(resid))}")

    if eol == "\r\n":
        out = out.replace("\n", "\r\n")
    return out, notes


# ---------------------------------------------------------------------------
# File discovery
# ---------------------------------------------------------------------------

def _iter_js(folder):
    for dp, dn, fn in os.walk(folder):
        if "node_modules" in dp or os.sep + ".git" in dp:
            continue
        for f in sorted(fn):
            if f.endswith(".js"):
                yield os.path.join(dp, f)


def collect_files(game_ids, want_templates, want_shared, want_custom):
    files = []
    seen = set()

    def add(p):
        rp = os.path.relpath(p, REPO_ROOT)
        if rp in NAMED_SKIP or p in seen:
            return
        seen.add(p)
        files.append(p)

    entries = sorted(os.listdir(REPO_ROOT))
    for entry in entries:
        folder = os.path.join(REPO_ROOT, entry)
        if not os.path.isdir(folder):
            continue
        if entry.startswith("game-"):
            gid = entry[len("game-"):]
            if game_ids and gid not in game_ids:
                continue
            for p in _iter_js(folder):
                add(p)
        elif want_templates and entry.startswith("template-"):
            for p in _iter_js(folder):
                add(p)
        elif want_custom and entry == "zCustomGames":
            for p in _iter_js(folder):
                add(p)
        elif want_custom and entry.startswith("helper-"):
            for p in _iter_js(folder):
                add(p)

    if want_shared:
        for sub in ("downloader", "browsers"):
            d = os.path.join(REPO_ROOT, "resources", sub)
            if os.path.isdir(d):
                for p in _iter_js(d):
                    add(p)
        snip = os.path.join(REPO_ROOT, "resources", "snippets.js")
        if os.path.isfile(snip):
            add(snip)

    return files


# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------

def run_report(files):
    totals = {}
    per_file_resid = []
    orphan = {"vfs": 0, "fsp": 0}
    users = 0
    kept_only = KEEP_ON_VFS | NOOP_NATIVE
    for p in files:
        rel = os.path.relpath(p, REPO_ROOT)
        with open(p, encoding="utf-8", errors="replace") as f:
            src = f.read()
        c = census(src)
        if c:
            users += 1
        for k, v in c.items():
            totals[k] = totals.get(k, 0) + v
        stripped = strip_js_comments(src)
        orphan["vfs"] += len(re.findall(r"(?<![\w.$])vfs\.", stripped))
        orphan["fsp"] += len(re.findall(r"(?<![\w.$])fsp\.", stripped))
        resid = sorted({name for name in c if name not in kept_only})
        if resid:
            per_file_resid.append((rel, resid))

    migratable = sum(v for k, v in totals.items() if k not in kept_only)
    print(f"\n  files scanned: {len(files)}   files calling fs.*: {users}\n")
    print(f"  {'method':<26} {'live call sites':>15}")
    print(f"  {'-' * 26} {'-' * 15}")
    for name in CENSUS_ORDER:
        if name in totals:
            tag = "  (kept on vfs)" if name in KEEP_ON_VFS else ""
            print(f"  fs.{name:<23} {totals[name]:>15}{tag}")
    for name in sorted(set(totals) - set(CENSUS_ORDER)):
        # native members appear here once a wave lands (fs.mkdirSync from
        # ensureDirSync, fs.createWriteStream from the import fold); they sit in
        # kept_only, so they never feed the migratable total.
        tag = "   (native, not migratable)" if name in kept_only else "   (not in survey table)"
        print(f"  fs.{name:<23} {totals[name]:>15}{tag}")
    print(f"\n  migratable call sites still on fs.* (0 == wave complete): {migratable}")
    print(f"  vfs.* call sites: {orphan['vfs']}    fsp.* call sites: {orphan['fsp']}")
    if per_file_resid:
        print(f"\n  {len(per_file_resid)} file(s) not yet migrated:")
        for rel, resid in per_file_resid:
            print(f"    {rel}: {', '.join('fs.' + n for n in resid)}")
    return 0


def run_migrate(files, dry_run, do_node_check):
    changed = skipped = unchanged = failed = 0
    all_notes = []
    for p in files:
        rel = os.path.relpath(p, REPO_ROOT)
        with open(p, encoding="utf-8", errors="replace") as f:
            src = f.read()
        try:
            new_src, notes = migrate_source(src, rel)
        except SkipFile as ex:
            print(f"  SKIP  {rel}  ({ex})")
            skipped += 1
            continue
        all_notes.extend(notes)
        if new_src == src:
            unchanged += 1
            continue
        if do_node_check:
            ok, err = node_check_source(new_src)
            if ok is False:
                print(f"  FAIL  {rel}  (node --check: {err})")
                failed += 1
                continue
        if dry_run:
            print(f"  DRY   {rel}  would migrate")
            changed += 1
            continue
        tmp = p + ".tmp"
        with open(tmp, "w", encoding="utf-8", newline="") as f:
            f.write(new_src)
        os.replace(tmp, p)
        print(f"  OK    {rel}")
        changed += 1

    print(f"\n  migrated: {changed}   unchanged: {unchanged}   skipped: {skipped}   failed: {failed}")
    if all_notes:
        print(f"\n  {len(all_notes)} hand-migration note(s):")
        for n in all_notes:
            print(f"    {n}")
    return 1 if failed else 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0].strip())
    ap.add_argument("game_ids", nargs="*", metavar="GAME_ID", help="game-<id> folders to migrate")
    ap.add_argument("--templates", action="store_true", help="also migrate template-*/")
    ap.add_argument("--shared", action="store_true",
                    help="also migrate resources/downloader + resources/browsers")
    ap.add_argument("--custom", action="store_true", help="also migrate zCustomGames/** + helper-*/")
    ap.add_argument("--all", action="store_true", help="every in-scope file")
    ap.add_argument("--dry-run", action="store_true", help="preview changes, write nothing")
    ap.add_argument("--report", action="store_true", help="print method census + residuals, write nothing")
    ap.add_argument("--no-node-check", action="store_true", help="skip node --check on migrated output")
    args = ap.parse_args(argv)

    want_templates = args.templates or args.all
    want_shared = args.shared or args.all
    want_custom = args.custom or args.all
    game_ids = set(args.game_ids) or None

    if args.report and not (game_ids or want_templates or want_shared or want_custom):
        want_templates = want_shared = want_custom = True  # --report alone -> whole repo
    if not (game_ids or want_templates or want_shared or want_custom):
        ap.error("nothing to do: pass GAME_IDs, a scope flag (--templates/--shared/--custom), or --all")

    all_games = game_ids is None and (args.all or not (want_templates or want_shared or want_custom))
    files = collect_files(None if all_games else game_ids, want_templates, want_shared, want_custom)
    if game_ids is None and not args.all and (want_templates or want_shared or want_custom) \
            and not args.report:
        # scope flags without game ids and without --all: don't sweep every game
        files = [p for p in files if not os.path.relpath(p, REPO_ROOT).startswith("game-")]

    if not files:
        print("  no matching files")
        return 0

    if args.report:
        return run_report(files)
    return run_migrate(files, args.dry_run, not args.no_node_check)


if __name__ == "__main__":
    sys.exit(main() or 0)
