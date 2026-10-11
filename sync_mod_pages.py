"""
sync_mod_pages.py

Compare, pull or push each extension's Nexus Mods page against the repo's
DESCRIPTION.bbcode. The push uses the v3 editMod route (PATCH /mods/{uid}); the page
summary is built from the file (first line + a store sentence from its Supported
Versions list), so the file is the one source for both fields.

Modes (one per run):
    (default)   Report only. Reads the live page, prints whether it matches the repo file,
                the line counts of the difference and the summary the push would send.
                Writes nothing.
    --pull      Save the live page text to <backup-dir>/<id>/<timestamp>_live.bbcode and a
                unified diff (live -> repo) next to it. With --write, also overwrite the
                extension's DESCRIPTION.bbcode with the live text. A live page that uses the
                old layout (no "Mod Installation Notes" heading in the generated style) is
                skipped by generate_notes.js --description afterwards.
    --push      Replace the live summary + description with the repo file.

Safety, in this order, for every --push:
    1. First-push gate. A page this script has never pushed is only pushed when the live
       text already equals the repo file, or with --force. The live text usually differs
       (hand-written blocks the generator cannot produce), so the first push of each page
       is a deliberate act: read the report / --pull diff first, then re-run with --force.
    2. Backup. <backup-dir>/<id>/<timestamp>_before.json (summary, description as BBCode,
       the raw v1 response) is written and read back before the PATCH; a backup that does
       not read back aborts that page. After a successful PATCH the pushed text is saved as
       <timestamp>_pushed.bbcode.
    3. State. <backup-dir>/pushed.json records what was pushed per page (hash, summary, body
       file). The v1 read API keeps returning the OLD text after an editMod (measured), so a
       page already in the state is compared against and backed up from its last-pushed body,
       not from v1. A push of an unchanged file is skipped.

The v1 description is BBCode with every newline written as "\\n<br />"; it is converted back
before comparing or saving. A push cannot be verified through the API: look at the page.

Needs NEXUS_API_KEY (env var or HKCU registry) belonging to the mod's team or an admin.
Reads cost one v1 call per page. release_extension.py --push-description calls push_pages().

Usage:
    python sync_mod_pages.py GAME_ID [GAME_ID ...]
    python sync_mod_pages.py GAME_ID --diff
    python sync_mod_pages.py GAME_ID --pull
    python sync_mod_pages.py GAME_ID --pull --write
    python sync_mod_pages.py GAME_ID --push --dry-run
    python sync_mod_pages.py GAME_ID --push
    python sync_mod_pages.py GAME_ID --push --force
    python sync_mod_pages.py GAME_ID --backup-dir DIR

Flags:
    --pull / --push   Mode (mutually exclusive).
    --write           With --pull: also overwrite DESCRIPTION.bbcode with the live text.
    --diff            With the default mode or --pull: print the diff (ASCII only, capped).
    --force           With --push: push a page that has never been pushed even though the
                      live text differs from the repo file.
    --dry-run         With --push: do everything except write backups and send the PATCH.
                      With --pull: save nothing and write nothing.
    --backup-dir DIR  Default: <repo>/page-backups/ (gitignored).

Environment variables:
    NEXUS_API_KEY   (required; key of an account on the mod's team)

Exit code: 1 if any page errored (a skipped page is not an error), else 0.
"""

import argparse
import difflib
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone

from vortex_utils import (
    REPO_ROOT, GAME_PREFIX,
    build_arg_parser, assert_is_game_id,
    read_index_js, extract_extension_url, parse_nexus_mod_url,
    nexus_get_mod, nexus_v3_patch_json, get_api_key,
    read_json, write_json_atomic, write_text_atomic,
    log_info, log_warn, log_error, log_dry,
)

DESCRIPTION_FILE = "DESCRIPTION.bbcode"
DEFAULT_BACKUP_DIR = os.path.join(REPO_ROOT, "page-backups")
STATE_FILE = "pushed.json"
SUMMARY_MAX = 350
DIFF_PRINT_CAP = 80

# Store labels as the Supported Versions list writes them -> the wording the live summaries use.
_STORE_WORDING = {"Xbox (Game Pass)": "Game Pass"}
_BBCODE_TAG = re.compile(r"\[/?[A-Za-z*]+(?:=[^\]]*)?\]")


# == Text helpers ==============================================================

def v1_to_bbcode(text):
    """Convert a v1 description back to plain BBCode: each "\\n<br />" is one newline."""
    return re.sub(r"\r?\n<br\s*/?>", "\n", text or "")


def _norm(text):
    """Canonical form for comparing and sending: LF endings, no leading/trailing blank space."""
    return (text or "").replace("\r\n", "\n").strip()


def _sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _ascii(text):
    """Console-safe copy of text (the pages carry emoji; printing them can crash a cp1252 console)."""
    return text.encode("ascii", "replace").decode("ascii")


def _join_and(items):
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + " and " + items[-1]


def build_summary(description):
    """Page summary from a DESCRIPTION.bbcode: its first line plus a store sentence.

    "This extension adds X modding support to Vortex Mod Manager. Steam and Game Pass versions
    supported." The stores come from the Supported Versions list; the trailing "Other versions
    may need..." item is not a store. Raises ValueError when the result is not 1-350 characters."""
    first = next((ln.strip() for ln in description.splitlines() if ln.strip()), "")
    first = _BBCODE_TAG.sub("", first).strip()
    stores = []
    m = re.search(r"\[b\][^\n\[]*Supported Versions:\[/b\]\s*\[list\](.*?)\[/list\]", description, re.S)
    if m:
        for item in re.findall(r"\[\*\](.*?)\[/\*\]", m.group(1)):
            item = item.strip()
            if item and not item.startswith("Other versions"):
                stores.append(_STORE_WORDING.get(item, item))
    sentence = ""
    if stores:
        sentence = f"{_join_and(stores)} version{'s' if len(stores) > 1 else ''} supported."
    summary = " ".join(f"{first} {sentence}".split())
    if not 1 <= len(summary) <= SUMMARY_MAX:
        raise ValueError(f"summary is {len(summary)} characters, the page allows 1-{SUMMARY_MAX}: {_ascii(summary[:80])}")
    return summary


def _diff(live_text, repo_text):
    """Unified diff lines, live -> repo."""
    return list(difflib.unified_diff(
        _norm(live_text).splitlines(), _norm(repo_text).splitlines(),
        "live", "repo", lineterm="", n=1,
    ))


def _diff_counts(lines):
    added = sum(1 for ln in lines if ln.startswith("+") and not ln.startswith("+++"))
    removed = sum(1 for ln in lines if ln.startswith("-") and not ln.startswith("---"))
    return added, removed


def _print_diff(lines):
    for ln in lines[:DIFF_PRINT_CAP]:
        print("      " + _ascii(ln[:200]))
    if len(lines) > DIFF_PRINT_CAP:
        print(f"      ... {len(lines) - DIFF_PRINT_CAP} more diff line(s); --pull saves the full diff")


def _now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _stamp(out_dir=None):
    """Timestamp for backup names; with out_dir, one no file there already uses (never clobber a backup)."""
    stamp = time.strftime("%Y-%m-%d_%H-%M-%S")
    if out_dir is None:
        return stamp
    unique, n = stamp, 1
    while any(name.startswith(unique + "_") for name in os.listdir(out_dir)):
        n += 1
        unique = f"{stamp}-{n}"
    return unique


def _read_text(path):
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except OSError:
        return None


# == Page loading ==============================================================

def _result(game_id, status, msg, **extra):
    return {"id": game_id, "status": status, "msg": msg, **extra}


def _load_page(game_id, api_key, state, backup_dir, need_repo=True):
    """Resolve the repo file and the live page for one id.

    Returns (page, None) or (None, result) where result is the early exit (error / no-url).
    live["source"] is "v1" (read from the API) or "last-pushed" (this script's own record,
    because v1 keeps serving the old text after an editMod)."""
    try:
        assert_is_game_id(game_id)
    except ValueError as e:
        return None, _result(game_id, "error", str(e))
    folder = os.path.join(REPO_ROOT, GAME_PREFIX + game_id)
    if not os.path.isdir(folder):
        return None, _result(game_id, "error", f"no {GAME_PREFIX}{game_id} folder")
    src = read_index_js(folder)
    url = extract_extension_url(src) if src else None
    parsed = parse_nexus_mod_url(url) if url else None
    if not parsed:
        return None, _result(game_id, "no-url", "EXTENSION_URL not set (page not published yet)")
    domain, mod_id = parsed

    desc_path = os.path.join(folder, DESCRIPTION_FILE)
    repo_text = _read_text(desc_path)
    if need_repo and (repo_text is None or not repo_text.strip()):
        return None, _result(game_id, "error",
                             f"no {DESCRIPTION_FILE} (run: node generate_notes.js --description {game_id})")

    try:
        data, remaining = nexus_get_mod(domain, mod_id, api_key)
    except Exception as e:
        return None, _result(game_id, "error", f"v1 read of {domain}/mods/{mod_id} failed: {e}")
    uid = str(data.get("uid") or "")
    if not uid:
        return None, _result(game_id, "error", "v1 response has no uid")

    live = {
        "source": "v1",
        "summary": data.get("summary") or "",
        "description": v1_to_bbcode(data.get("description")),
        "warn": None,
    }
    entry = state.get(uid)
    if entry:
        body = _read_text(os.path.join(backup_dir, *entry.get("body_file", "").split("/")))
        if body is not None:
            live.update(source="last-pushed", description=body, summary=entry.get("summary", ""))
        else:
            live["warn"] = "pushed.json lists a push of this page but its body file is gone; the v1 text may be stale"
    page = {
        "id": game_id, "folder": folder, "desc_path": desc_path, "repo_text": repo_text,
        "domain": domain, "mod_id": mod_id, "uid": uid, "live": live, "raw": data,
        "remaining": remaining,
    }
    return page, None


def _live_label(live):
    return "last pushed by this script" if live["source"] == "last-pushed" else "v1 read"


# == Modes =====================================================================

def _report_page(game_id, api_key, state, backup_dir, show_diff):
    page, early = _load_page(game_id, api_key, state, backup_dir, need_repo=False)
    if early:
        return early
    live, repo = page["live"], page["repo_text"]
    if live["warn"]:
        log_warn(game_id, live["warn"])
    if repo is None or not repo.strip():
        return _result(game_id, "no-file", f"live page read ({_live_label(live)}), but there is no {DESCRIPTION_FILE} to compare")
    lines = _diff(live["description"], repo)
    added, removed = _diff_counts(lines)
    try:
        summary = build_summary(repo)
    except ValueError as e:
        summary = None
        log_warn(game_id, str(e))
    same_desc = not lines
    same_summary = summary is not None and live["summary"] == summary
    if same_desc and same_summary:
        msg = f"matches the repo file ({_live_label(live)})"
        status = "same"
    else:
        parts = ["description matches" if same_desc else f"description differs (+{added}/-{removed} lines, {len(live['description'])} -> {len(_norm(repo))} chars)"]
        if not same_summary:
            parts.append("summary differs")
        msg = f"{'; '.join(parts)} ({_live_label(live)})"
        status = "differs"
    log_info(game_id, msg)
    if not same_summary and summary is not None:
        print(f"      summary live: {_ascii(live['summary'])}")
        print(f"      summary repo: {_ascii(summary)}")
    if show_diff and lines:
        _print_diff(lines)
    return _result(game_id, status, msg)


def _pull_page(game_id, api_key, state, backup_dir, write, dry_run, show_diff):
    page, early = _load_page(game_id, api_key, state, backup_dir, need_repo=False)
    if early:
        return early
    live, repo = page["live"], page["repo_text"] or ""
    if live["warn"]:
        log_warn(game_id, live["warn"])
    lines = _diff(live["description"], repo)
    added, removed = _diff_counts(lines)
    msg = f"live page ({_live_label(live)}) differs from the repo file by +{added}/-{removed} lines" if lines \
        else f"live page ({_live_label(live)}) matches the repo file"
    if dry_run:
        log_dry(f"[{game_id}] {msg}; nothing saved")
        return _result(game_id, "pulled", msg + " (dry run)")
    out_dir = os.path.join(backup_dir, game_id)
    os.makedirs(out_dir, exist_ok=True)
    stamp = _stamp(out_dir)
    live_path = os.path.join(out_dir, f"{stamp}_live.bbcode")
    write_text_atomic(live_path, _norm(live["description"]) + "\n")
    if lines:
        write_text_atomic(os.path.join(out_dir, f"{stamp}_live.diff"), "\n".join(lines) + "\n")
    log_info(game_id, f"{msg}; saved {os.path.relpath(live_path, REPO_ROOT)}")
    if show_diff and lines:
        _print_diff(lines)
    if write:
        if not lines:
            log_info(game_id, f"{DESCRIPTION_FILE} already equals the live text, not rewritten")
        else:
            write_text_atomic(page["desc_path"], _norm(live["description"]) + "\n")
            log_info(game_id, f"{DESCRIPTION_FILE} overwritten with the live text "
                              "(generate_notes.js --description will skip it unless it uses the generated headings)")
    return _result(game_id, "pulled", msg)


def _push_page(game_id, api_key, state, backup_dir, force, dry_run):
    page, early = _load_page(game_id, api_key, state, backup_dir)
    if early:
        return early
    live, repo = page["live"], page["repo_text"]
    body = _norm(repo)
    try:
        summary = build_summary(body)
    except ValueError as e:
        return _result(game_id, "error", str(e))
    if live["warn"]:
        log_warn(game_id, live["warn"])

    same_desc = _norm(live["description"]) == body
    same_summary = live["summary"] == summary
    if same_desc and same_summary:
        return _result(game_id, "unchanged", f"already up to date ({_live_label(live)}), nothing to push")
    if live["source"] == "v1" and not force:
        lines = _diff(live["description"], body)
        added, removed = _diff_counts(lines)
        return _result(
            game_id, "gated",
            f"SKIPPED - never pushed by this script and the live page differs (+{added}/-{removed} lines"
            f"{'' if same_summary else ', summary differs'}). Read it with: python sync_mod_pages.py {game_id} --diff, "
            f"then push with --force",
        )

    if dry_run:
        log_dry(f"[{game_id}] would push {len(body)} chars to {page['domain']}/mods/{page['mod_id']} "
                f"(uid {page['uid']}, live source: {_live_label(live)})")
        print(f"      summary: {_ascii(summary)}")
        return _result(game_id, "would-push", "dry run")

    out_dir = os.path.join(backup_dir, game_id)
    os.makedirs(out_dir, exist_ok=True)
    stamp = _stamp(out_dir)
    before_path = os.path.join(out_dir, f"{stamp}_before.json")
    record = {
        "note": "State of the page immediately before a sync_mod_pages.py push. 'description' is BBCode "
                "(v1 newline markers converted); 'source' says whether it came from v1 or from this "
                "script's last push (v1 stays stale after an edit). 'v1_response' is the raw v1 body.",
        "fetched_utc": _now_iso(),
        "id": game_id, "uid": page["uid"], "domain": page["domain"], "mod_id": page["mod_id"],
        "source": live["source"], "summary": live["summary"], "description": live["description"],
        "v1_response": page["raw"],
    }
    try:
        write_json_atomic(before_path, record)
        with open(before_path, encoding="utf-8") as f:
            back = json.load(f)
        if back.get("description") != record["description"] or back.get("summary") != record["summary"] \
                or back.get("uid") != record["uid"]:
            raise ValueError("read-back differs from what was written")
    except Exception as e:
        return _result(game_id, "error", f"backup did not read back ({e}); nothing was sent")

    try:
        nexus_v3_patch_json(f"/mods/{page['uid']}", {"summary": summary, "description": body}, api_key)
    except RuntimeError as e:
        return _result(game_id, "error", f"PATCH failed, page unchanged: {e} (backup: {os.path.relpath(before_path, REPO_ROOT)})")

    body_rel = f"{game_id}/{stamp}_pushed.bbcode"
    write_text_atomic(os.path.join(backup_dir, *body_rel.split("/")), body + "\n")
    state[page["uid"]] = {
        "id": game_id, "time": _now_iso(), "sha256": _sha256(body),
        "summary": summary, "body_file": body_rel,
    }
    write_json_atomic(os.path.join(backup_dir, STATE_FILE), state, sort_keys=True)
    msg = (f"pushed {len(body)} chars to {page['domain']}/mods/{page['mod_id']}; backup "
           f"{os.path.relpath(before_path, REPO_ROOT)}. v1 keeps the old text, so check the page by eye")
    log_info(game_id, msg)
    return _result(game_id, "pushed", msg)


# == Runner ====================================================================

def run_pages(game_ids, *, mode="report", backup_dir=DEFAULT_BACKUP_DIR, force=False, dry_run=False,
              write=False, show_diff=False):
    """Process each id in mode ("report" | "pull" | "push"); returns one result dict per id.

    A result is {id, status, msg}; status is one of same, differs, no-file, pulled, pushed,
    would-push, unchanged, gated, no-url, error. Errors are returned, never raised."""
    api_key = get_api_key("NEXUS_API_KEY")
    if not api_key:
        for gid in game_ids:
            log_error(gid, "NEXUS_API_KEY is not set (env var or HKCU registry)")
        return [_result(gid, "error", "NEXUS_API_KEY is not set") for gid in game_ids]
    state = read_json(os.path.join(backup_dir, STATE_FILE), default={})
    results = []
    for gid in game_ids:
        try:
            if mode == "push":
                r = _push_page(gid, api_key, state, backup_dir, force, dry_run)
            elif mode == "pull":
                r = _pull_page(gid, api_key, state, backup_dir, write, dry_run, show_diff)
            else:
                r = _report_page(gid, api_key, state, backup_dir, show_diff)
        except Exception as e:
            r = _result(gid, "error", f"unexpected error: {e}")
        if r["status"] == "error":
            log_error(gid, r["msg"])
        elif r["status"] in ("gated", "no-url", "no-file"):
            log_warn(gid, r["msg"])
        elif r["status"] == "unchanged":
            log_info(gid, r["msg"])
        results.append(r)
    return results


def push_pages(game_ids, *, force=False, dry_run=False, backup_dir=DEFAULT_BACKUP_DIR):
    """Push DESCRIPTION.bbcode to each id's Nexus page (see the module docstring for the guards)."""
    return run_pages(game_ids, mode="push", backup_dir=backup_dir, force=force, dry_run=dry_run)


def _print_summary(results):
    counts = {}
    for r in results:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    print("\n" + "-" * 50)
    print("  " + ", ".join(f"{n} {s}" for s, n in sorted(counts.items())))


def main():
    p = build_arg_parser("Compare, pull or push Nexus mod pages against DESCRIPTION.bbcode.",
                         with_force=False)
    mode = p.add_mutually_exclusive_group()
    mode.add_argument("--pull", action="store_true", help="Save the live page text (and a diff) to the backup dir.")
    mode.add_argument("--push", action="store_true", help="Replace the live summary + description with the repo file.")
    p.add_argument("--write", action="store_true", help="With --pull: overwrite DESCRIPTION.bbcode with the live text.")
    p.add_argument("--diff", action="store_true", help="Print the live -> repo diff (ASCII only, capped).")
    p.add_argument("--force", action="store_true",
                   help="With --push: push a never-pushed page even though the live text differs.")
    p.add_argument("--backup-dir", default=DEFAULT_BACKUP_DIR, metavar="DIR",
                   help="Backups + pushed.json location (default: <repo>/page-backups/).")
    args = p.parse_args()
    if args.write and not args.pull:
        p.error("--write only applies with --pull")
    if args.force and not args.push:
        p.error("--force only applies with --push")

    mode_name = "push" if args.push else "pull" if args.pull else "report"
    results = run_pages(args.game_ids, mode=mode_name, backup_dir=os.path.abspath(args.backup_dir),
                        force=args.force, dry_run=args.dry_run, write=args.write, show_diff=args.diff)
    _print_summary(results)
    return 1 if any(r["status"] == "error" for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
