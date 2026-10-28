"""
sync_mod_pages.py

Compare, pull or push each extension's Nexus Mods page against the repo's
DESCRIPTION.bbcode. The push uses the v3 editMod route (PATCH /mods/{uid}); the page
summary is built from the file (first line + a store sentence from its Supported
Versions list + an optional summary note), so the file is the one source for both fields.

Summary note: a line `[summary]Load Order support for pak mods.[/summary]` anywhere in
DESCRIPTION.bbcode is appended to the summary and never sent as page text (nor compared as
page text). It is where what a live summary says beyond the opening and the stores is kept.

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
    --specials  List the special statements of each live page: lines the repo file does not
                carry (exactly, reworded, or by the same link for images / donation buttons /
                credits), so a push would drop them. Each is tagged by the section it sat under:
                special (opening, warnings, usage notes, credits, images - carry over), install
                (an old install bullet, usually replaced by a generated one), store (old store
                wording), summary (a live summary sentence the built summary lacks - carry into
                the [summary] note). Prints them, saves the live text to <backup-dir>/<id>/ and
                one worklist for the run to <backup-dir>/specials/<timestamp>_specials.md.
                Status "specials" when special/summary statements remain, else "clean".
    --mark-reviewed
                Record a never-pushed page's live text (summary included) in
                <backup-dir>/reviewed.json, so --push takes it without --force. Refused while
                special/summary statements are not in the repo file; with --force it marks
                anyway and records those statements as accepted to drop.
    --backup    Save each live page as <backup-dir>/<id>/<timestamp>_snapshot.json (same record
                as a push's _before.json: summary, description as BBCode, raw v1 response) and
                read it back. Pushes nothing. Pages this script already pushed are saved from
                their last-pushed body (v1 stays stale). Use before a mass push.

Workflow for pages never pushed: --specials, carry what matters into DESCRIPTION.bbcode
(install-list items need BBCode markup to survive regeneration; summary extras go in the
[summary] note), regenerate, --specials again until clean, --mark-reviewed, --push --dry-run,
--push.

Safety, in this order, for every --push:
    1. First-push gate. A page this script has never pushed is only pushed when the live
       text already equals the repo file, when --mark-reviewed recorded this exact live text
       and the repo file still carries every statement found then (minus those accepted to
       drop), or with --force. The live text usually differs (hand-written blocks the
       generator cannot produce), so the first push of each page is a deliberate act.
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
    python sync_mod_pages.py --all --specials
    python sync_mod_pages.py GAME_ID --specials [--dry-run]
    python sync_mod_pages.py GAME_ID --mark-reviewed [--force]
    python sync_mod_pages.py --all --backup [--dry-run]
    python sync_mod_pages.py GAME_ID --diff
    python sync_mod_pages.py GAME_ID --pull
    python sync_mod_pages.py GAME_ID --pull --write
    python sync_mod_pages.py GAME_ID --push --dry-run
    python sync_mod_pages.py GAME_ID --push
    python sync_mod_pages.py GAME_ID --push --force
    python sync_mod_pages.py GAME_ID --backup-dir DIR

Flags:
    --pull / --push / --specials / --mark-reviewed / --backup
                      Mode (mutually exclusive).
    --all             Every game-* page instead of GAME_IDs, minus games-never-upload.txt and
                      games-deprecated.txt (never released, so never pushed).
    --write           With --pull: also overwrite DESCRIPTION.bbcode with the live text.
    --diff            With the default mode or --pull: print the diff (ASCII only, capped).
    --force           With --push: push a page that has never been pushed even though the
                      live text differs from the repo file. With --mark-reviewed: mark it
                      although special statements were not carried over.
    --dry-run         With --push: do everything except write backups and send the PATCH.
                      With --pull / --specials / --mark-reviewed / --backup: save nothing.
    --backup-dir DIR  Default: <repo>/page-backups/ (gitignored).

Environment variables:
    NEXUS_API_KEY   (required; key of an account on the mod's team)

Exit code: 1 if any page errored (a skipped page is not an error), else 0.
"""

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
    NEVER_UPLOAD_GAMES, DEPRECATED_GAMES,
)

DESCRIPTION_FILE = "DESCRIPTION.bbcode"
DEFAULT_BACKUP_DIR = os.path.join(REPO_ROOT, "page-backups")
STATE_FILE = "pushed.json"
REVIEWED_FILE = "reviewed.json"
SPECIALS_DIR = "specials"
SUMMARY_MAX = 350
DIFF_PRINT_CAP = 80
# A live line at least this similar to a repo line is the same statement reworded.
SIMILAR_RATIO = 0.85

_BBCODE_TAG = re.compile(r"\[/?[A-Za-z*]+(?:=[^\]]*)?\]")
_SUMMARY_NOTE = re.compile(r"^\s*\[summary\](.*?)\[/summary\]\s*$", re.I)


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


def split_summary_note(text):
    """Split a DESCRIPTION.bbcode into (page body, summary note).

    The note is an optional line `[summary]...[/summary]` holding what the page summary says
    beyond the first line and the store sentence ("Load Order support for pak mods."). It is
    never part of the page: the body comes back without that line, normalised like _norm."""
    note = ""
    kept = []
    for line in (text or "").replace("\r\n", "\n").split("\n"):
        m = _SUMMARY_NOTE.match(line)
        if m:
            note = " ".join(m.group(1).split())
        else:
            kept.append(line)
    return _norm("\n".join(kept)), note


# Store labels generate_notes.js writes into the Supported Versions list (its STORE_IDS).
# Any other item there is a hand-written caveat ("Xbox is NOT supported"), not a store.
STORE_LABELS = ("Steam", "Steam Demo", "GOG", "Epic", "Ubisoft Connect", "EA", "Xbox")


def build_summary(description):
    """Page summary from a DESCRIPTION.bbcode: its first line plus a store sentence.

    "This extension adds X modding support to Vortex Mod Manager. Steam and Xbox versions
    supported." The stores come from the Supported Versions list: only items that are a store
    label (STORE_LABELS) count, so the trailing "Other versions may need..." item and any
    hand-written caveat are left out. A `[summary]...[/summary]` note line is appended last.
    Raises ValueError when the result is not 1-350 characters."""
    description, note = split_summary_note(description)
    first = next((ln.strip() for ln in description.splitlines() if ln.strip()), "")
    first = _BBCODE_TAG.sub("", first).strip()
    stores = []
    m = re.search(r"\[b\][^\n\[]*Supported Versions:\[/b\]\s*\[list\](.*?)\[/list\]", description, re.S)
    if m:
        for item in re.findall(r"\[\*\](.*?)\[/\*\]", m.group(1)):
            item = item.strip()
            if item in STORE_LABELS:
                stores.append(item)
    sentence = ""
    if stores:
        sentence = f"{_join_and(stores)} version{'s' if len(stores) > 1 else ''} supported."
    summary = " ".join(f"{first} {sentence} {note}".split())
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


# == Special statements ========================================================

# Boilerplate every page carries in some wording; never a statement worth carrying over.
_BOILERPLATE = (
    "other versions may need",
    "if you would like to support my work",
    "you can open several useful",
    "you can open multiple useful",
)
_URL = re.compile(r"\[(?:url|img)(?:=([^\]]+))?\]([^\[]*)", re.I)


def _plain(line):
    """A line reduced to its words for comparing: no BBCode, no emoji or symbols, one space,
    lower case, no closing punctuation."""
    s = _BBCODE_TAG.sub(" ", line).replace("\xa0", " ")
    s = re.sub(r"[^\w\s.,:;!?'\"()/\\%&+=<>-]", " ", s)
    return " ".join(s.split()).lower().strip(" .:;,!")


def _heading(line, plain):
    """Section name when the line is a heading ("[b]... Usage Notes:[/b]"), else None."""
    if "[b]" in line.lower() and line.rstrip().endswith((":[/b]", ":[/size]", ":[/b][/size]", ":[/size][/b]")) \
            or (plain and len(plain) < 50 and _BBCODE_TAG.sub("", line).strip().endswith(":")):
        return plain
    return None


def _links(line):
    return {m.group(1) or m.group(2) for m in _URL.finditer(line) if (m.group(1) or m.group(2)).strip()}


def _closest(plain, repo_plain):
    best, ratio = "", 0.0
    for other in repo_plain:
        sm = difflib.SequenceMatcher(None, plain, other)
        if sm.real_quick_ratio() <= ratio or sm.quick_ratio() <= ratio:
            continue
        r = sm.ratio()
        if r > ratio:
            best, ratio = other, r
    return best, ratio


def _summary_sentences(summary):
    """Sentences of a summary or opening line. A game name with its own sentence mark
    ("Sparking! Zero", "RV There Yet?", "S.T.A.L.K.E.R. 2") would split the opening in two, so an
    "Adds X" / "This extension adds X" fragment without "Vortex" is joined to the next sentence."""
    parts = [s.strip() for s in re.split(r"(?<=[.!?])\s+", summary or "") if s.strip()]
    out = []
    for s in parts:
        if out and re.match(r"^(this extension )?adds ", _plain(out[-1])) and "vortex" not in _plain(out[-1]):
            out[-1] += " " + s
        else:
            out.append(s)
    return out


_NOTICE_START = re.compile(r"^(note|notice|important|if |update|warning|attention|join|august|june)", re.I)


def is_generated_opening(sentence):
    """True for the page's "This extension adds X modding support to Vortex Mod Manager." in any
    of its old wordings ("Adds X support to Vortex Mod Manager.", "Vortex mod support for X."),
    which the generator writes itself. A notice that merely mentions Vortex ("NOTE: You must
    update Vortex ...", "If you used the Vortex extension prior to 2.0.0 ...") is not one."""
    plain = _plain(sentence)
    if not plain or _NOTICE_START.match(plain) or "vortex" not in plain:
        return False
    return bool(re.search(r"\bsupport\b|\bextension (to|for)\b|\bmod installs?\b|install mods", plain))


def find_specials(live_text, repo_text, live_summary="", repo_summary=""):
    """Statements on the live page that the repo file does not carry, so a push would drop them.

    Returns one dict per statement: {kind, section, text, closest, ratio}. kind is
      special  - opening text, warnings, usage notes, credits, images, anything outside the
                 two generated lists: carry it into DESCRIPTION.bbcode
      install  - an old Mod Installation Notes bullet; usually replaced by a generated bullet,
                 but it can hold an extra worth keeping
      store    - an old Supported Versions item; usually just old wording
      summary  - a sentence of the live summary the built summary lacks: carry it into the
                 [summary] note (and into the page text if it matters there too)
    A line counts as carried when the repo page has it, or the same statement reworded
    (SIMILAR_RATIO), or - for images, donation buttons and credits - the same link. The repo
    summary note is not page text, so it never counts as carrying a page statement."""
    body, _note = split_summary_note(repo_text or "")
    repo_lines = body.split("\n")
    repo_plain = {p for p in (_plain(ln) for ln in repo_lines) if p}
    repo_links = set()
    for ln in repo_lines:
        repo_links |= _links(ln)
    found = []
    section = "opening"
    for line in _norm(live_text).split("\n"):
        plain = _plain(line)
        if not plain:
            continue
        if section == "opening":
            # The opening "This extension adds ... to Vortex Mod Manager." is rebuilt by the
            # generator in its own words (it is not always the page's first line: a notice can
            # come first); only what a line says beyond it is a statement.
            rest = [s for s in _summary_sentences(line) if not is_generated_opening(s)]
            if not rest:
                continue
            line = " ".join(rest)
            plain = _plain(line)
        head = _heading(line, plain)
        if head is not None:
            section = head
            continue
        if plain in repo_plain or any(b in plain for b in _BOILERPLATE):
            continue
        if not re.search(r"[^\W_]", plain):
            # A separator ("=====") or other line without a letter or digit says nothing.
            continue
        links = _links(line)
        if links and links <= repo_links and ("[img" in line.lower() or plain.startswith("credit") or len(plain) < 40):
            continue
        closest, ratio = _closest(plain, repo_plain)
        if ratio >= SIMILAR_RATIO:
            continue
        kind = ("store" if "supported versions" in section
                else "install" if "installation notes" in section else "special")
        found.append({"kind": kind, "section": section, "text": line.strip(),
                      "closest": closest, "ratio": round(ratio, 2)})
    built = [_plain(s) for s in _summary_sentences(repo_summary)]
    for sentence in _summary_sentences(live_summary):
        plain = _plain(sentence)
        # The opening and the store sentence are rebuilt from the page; only extras matter.
        if not plain or "vortex" in plain or re.search(r"\bsupported$", plain):
            continue
        if any(difflib.SequenceMatcher(None, plain, b).ratio() >= SIMILAR_RATIO for b in built):
            continue
        found.append({"kind": "summary", "section": "summary", "text": sentence,
                      "closest": "", "ratio": 0.0})
    return found


# Kinds that block --mark-reviewed: real content a push would drop.
_BLOCKING_KINDS = ("special", "summary")


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
    body = split_summary_note(repo)[0]
    lines = _diff(live["description"], body)
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
        parts = ["description matches" if same_desc else f"description differs (+{added}/-{removed} lines, {len(live['description'])} -> {len(body)} chars)"]
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
    lines = _diff(live["description"], split_summary_note(repo)[0])
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


def _live_fingerprint(live):
    """Hash of the live page as read, summary included: a review is only valid for this text."""
    return _sha256(_norm(live["description"]) + "\n\x00\n" + (live["summary"] or ""))


def _review_gate(page, reviewed):
    """None when a never-pushed page may be pushed without --force, else the reason it may not.

    It may when --mark-reviewed recorded this exact live text, and the repo file still carries
    every blocking statement found on it except those the review accepted dropping."""
    entry = reviewed.get(page["uid"])
    if not entry:
        return "not reviewed"
    if entry.get("live_sha256") != _live_fingerprint(page["live"]):
        return "the live page changed since it was reviewed"
    repo = page["repo_text"] or ""
    try:
        summary = build_summary(repo)
    except ValueError:
        summary = ""
    accepted = set(entry.get("accepted", []))
    missing = [s for s in find_specials(page["live"]["description"], repo, page["live"]["summary"], summary)
               if s["kind"] in _BLOCKING_KINDS and _plain(s["text"]) not in accepted]
    if missing:
        return f"{len(missing)} special statement(s) found at review are no longer in the repo file"
    return None


def _write_backup(game_id, page, out_dir, stamp, suffix, note):
    """Write <out_dir>/<stamp>_<suffix>.json (summary, BBCode description, raw v1 response) and
    read it back; returns the path, raises when the read-back differs."""
    live = page["live"]
    path = os.path.join(out_dir, f"{stamp}_{suffix}.json")
    record = {
        "note": note + " 'description' is BBCode (v1 newline markers converted); 'source' says whether "
                "it came from v1 or from this script's last push (v1 stays stale after an edit). "
                "'v1_response' is the raw v1 body.",
        "fetched_utc": _now_iso(),
        "id": game_id, "uid": page["uid"], "domain": page["domain"], "mod_id": page["mod_id"],
        "source": live["source"], "summary": live["summary"], "description": live["description"],
        "v1_response": page["raw"],
    }
    write_json_atomic(path, record)
    with open(path, encoding="utf-8") as f:
        back = json.load(f)
    if back.get("description") != record["description"] or back.get("summary") != record["summary"] \
            or back.get("uid") != record["uid"]:
        raise ValueError("read-back differs from what was written")
    return path


def _backup_page(game_id, api_key, state, backup_dir, dry_run):
    page, early = _load_page(game_id, api_key, state, backup_dir, need_repo=False)
    if early:
        return early
    if dry_run:
        log_dry(f"[{game_id}] would back up the live page ({_live_label(page['live'])}); nothing saved")
        return _result(game_id, "backed-up", "dry run")
    out_dir = os.path.join(backup_dir, game_id)
    os.makedirs(out_dir, exist_ok=True)
    try:
        path = _write_backup(game_id, page, out_dir, _stamp(out_dir), "snapshot",
                             "Snapshot of the live page saved by sync_mod_pages.py --backup (no push made).")
    except Exception as e:
        return _result(game_id, "error", f"backup did not read back ({e})")
    msg = f"saved {os.path.relpath(path, REPO_ROOT)} ({_live_label(page['live'])})"
    log_info(game_id, msg)
    return _result(game_id, "backed-up", msg)


def _push_page(game_id, api_key, state, backup_dir, force, dry_run, reviewed=None):
    page, early = _load_page(game_id, api_key, state, backup_dir)
    if early:
        return early
    live, repo = page["live"], page["repo_text"]
    body = split_summary_note(repo)[0]
    try:
        summary = build_summary(repo)
    except ValueError as e:
        return _result(game_id, "error", str(e))
    if live["warn"]:
        log_warn(game_id, live["warn"])

    same_desc = _norm(live["description"]) == body
    same_summary = live["summary"] == summary
    if same_desc and same_summary:
        return _result(game_id, "unchanged", f"already up to date ({_live_label(live)}), nothing to push")
    if live["source"] == "v1" and not force:
        why = _review_gate(page, reviewed or {})
        if why:
            lines = _diff(live["description"], body)
            added, removed = _diff_counts(lines)
            return _result(
                game_id, "gated",
                f"SKIPPED - never pushed by this script and the live page differs (+{added}/-{removed} lines"
                f"{'' if same_summary else ', summary differs'}); {why}. Check it with: python sync_mod_pages.py "
                f"{game_id} --specials, carry what matters into {DESCRIPTION_FILE}, then --mark-reviewed",
            )

    if dry_run:
        log_dry(f"[{game_id}] would push {len(body)} chars to {page['domain']}/mods/{page['mod_id']} "
                f"(uid {page['uid']}, live source: {_live_label(live)})")
        print(f"      summary: {_ascii(summary)}")
        return _result(game_id, "would-push", "dry run")

    out_dir = os.path.join(backup_dir, game_id)
    os.makedirs(out_dir, exist_ok=True)
    stamp = _stamp(out_dir)
    try:
        before_path = _write_backup(game_id, page, out_dir, stamp, "before",
                                    "State of the page immediately before a sync_mod_pages.py push.")
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


def _page_specials(page):
    repo = page["repo_text"] or ""
    try:
        summary = build_summary(repo)
    except ValueError:
        summary = ""
    return find_specials(page["live"]["description"], repo, page["live"]["summary"], summary)


def _count_kinds(found):
    counts = {}
    for s in found:
        counts[s["kind"]] = counts.get(s["kind"], 0) + 1
    return counts


def _specials_page(game_id, api_key, state, backup_dir, dry_run, worklist):
    page, early = _load_page(game_id, api_key, state, backup_dir)
    if early:
        return early
    live = page["live"]
    if live["warn"]:
        log_warn(game_id, live["warn"])
    found = _page_specials(page)
    counts = _count_kinds(found)
    tally = ", ".join(f"{n} {k}" for k, n in sorted(counts.items())) or "nothing the repo file lacks"
    msg = f"{tally} ({_live_label(live)})"
    log_info(game_id, msg)
    for s in found:
        print(f"      [{s['kind']}] ({_ascii(s['section'][:30])}) {_ascii(s['text'][:160])}")
    if found:
        worklist.append(f"## {game_id} - {page['domain']}/mods/{page['mod_id']} - {tally}\n")
        for s in found:
            worklist.append(f"- [{s['kind']}] ({s['section']}) {s['text']}")
            if s["closest"]:
                worklist.append(f"  - closest repo line ({s['ratio']}): {s['closest']}")
        worklist.append("")
    if not dry_run and found:
        out_dir = os.path.join(backup_dir, game_id)
        os.makedirs(out_dir, exist_ok=True)
        write_text_atomic(os.path.join(out_dir, f"{_stamp(out_dir)}_live.bbcode"), _norm(live["description"]) + "\n")
    blocking = sum(n for k, n in counts.items() if k in _BLOCKING_KINDS)
    return _result(game_id, "specials" if blocking else "clean", msg, specials=found)


def _review_page(game_id, api_key, state, backup_dir, force, dry_run, reviewed):
    page, early = _load_page(game_id, api_key, state, backup_dir)
    if early:
        return early
    live = page["live"]
    if live["source"] != "v1":
        return _result(game_id, "unchanged", "already pushed by this script; pushes need no review")
    found = [s for s in _page_specials(page) if s["kind"] in _BLOCKING_KINDS]
    if found and not force:
        for s in found:
            print(f"      [{s['kind']}] {_ascii(s['text'][:160])}")
        return _result(game_id, "not-reviewed",
                       f"NOT marked - {len(found)} special statement(s) are not in {DESCRIPTION_FILE} yet. "
                       f"Carry them over, or mark anyway with --force to drop them on push")
    if dry_run:
        log_dry(f"[{game_id}] would mark reviewed ({len(found)} statement(s) accepted as dropped)")
        return _result(game_id, "reviewed", "dry run")
    reviewed[page["uid"]] = {
        "id": game_id, "time": _now_iso(), "live_sha256": _live_fingerprint(live),
        "accepted": sorted({_plain(s["text"]) for s in found}),
    }
    write_json_atomic(os.path.join(backup_dir, REVIEWED_FILE), reviewed, sort_keys=True)
    msg = "marked reviewed" + (f"; {len(found)} statement(s) accepted as dropped" if found else "")
    log_info(game_id, msg)
    return _result(game_id, "reviewed", msg)


# == Runner ====================================================================

def run_pages(game_ids, *, mode="report", backup_dir=DEFAULT_BACKUP_DIR, force=False, dry_run=False,
              write=False, show_diff=False):
    """Process each id in mode ("report" | "pull" | "push" | "specials" | "review" | "backup");
    returns one result dict per id.

    A result is {id, status, msg}; status is one of same, differs, no-file, pulled, pushed,
    would-push, unchanged, gated, specials, clean, reviewed, not-reviewed, backed-up, no-url, error.
    Errors are returned, never raised. "specials" results also carry the statements found."""
    api_key = get_api_key("NEXUS_API_KEY")
    if not api_key:
        for gid in game_ids:
            log_error(gid, "NEXUS_API_KEY is not set (env var or HKCU registry)")
        return [_result(gid, "error", "NEXUS_API_KEY is not set") for gid in game_ids]
    state = read_json(os.path.join(backup_dir, STATE_FILE), default={})
    reviewed = read_json(os.path.join(backup_dir, REVIEWED_FILE), default={})
    worklist = []
    results = []
    for gid in game_ids:
        try:
            if mode == "push":
                r = _push_page(gid, api_key, state, backup_dir, force, dry_run, reviewed)
            elif mode == "pull":
                r = _pull_page(gid, api_key, state, backup_dir, write, dry_run, show_diff)
            elif mode == "specials":
                r = _specials_page(gid, api_key, state, backup_dir, dry_run, worklist)
            elif mode == "review":
                r = _review_page(gid, api_key, state, backup_dir, force, dry_run, reviewed)
            elif mode == "backup":
                r = _backup_page(gid, api_key, state, backup_dir, dry_run)
            else:
                r = _report_page(gid, api_key, state, backup_dir, show_diff)
        except Exception as e:
            r = _result(gid, "error", f"unexpected error: {e}")
        if r["status"] == "error":
            log_error(gid, r["msg"])
        elif r["status"] in ("gated", "no-url", "no-file", "not-reviewed"):
            log_warn(gid, r["msg"])
        elif r["status"] == "unchanged":
            log_info(gid, r["msg"])
        results.append(r)
    if mode == "specials" and worklist and not dry_run:
        out_dir = os.path.join(backup_dir, SPECIALS_DIR)
        os.makedirs(out_dir, exist_ok=True)
        path = os.path.join(out_dir, f"{_stamp(out_dir)}_specials.md")
        header = ["# Special statements: live page text the repo DESCRIPTION.bbcode lacks", "",
                  "special/summary = carry over (summary -> [summary] note); install/store = usually "
                  "replaced by generated lines, keep only real extras.", ""]
        write_text_atomic(path, "\n".join(header + worklist) + "\n")
        print(f"\n  worklist: {os.path.relpath(path, REPO_ROOT)}")
    return results


def all_page_ids():
    """Every game-* folder id, minus test beds / personal-use (games-never-upload.txt) and retired
    extensions (games-deprecated.txt): those pages are never released, so never pushed."""
    ids = []
    for entry in sorted(os.listdir(REPO_ROOT)):
        if entry.startswith(GAME_PREFIX) and os.path.isdir(os.path.join(REPO_ROOT, entry)):
            gid = entry[len(GAME_PREFIX):]
            if gid not in NEVER_UPLOAD_GAMES and gid not in DEPRECATED_GAMES:
                ids.append(gid)
    return ids


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
                         with_force=False, ids_required=False)
    mode = p.add_mutually_exclusive_group()
    mode.add_argument("--pull", action="store_true", help="Save the live page text (and a diff) to the backup dir.")
    mode.add_argument("--push", action="store_true", help="Replace the live summary + description with the repo file.")
    mode.add_argument("--specials", action="store_true",
                      help="List live page statements the repo file lacks (a push would drop them); writes a worklist.")
    mode.add_argument("--mark-reviewed", action="store_true",
                      help="Record a never-pushed page as reviewed so --push takes it without --force.")
    mode.add_argument("--backup", action="store_true",
                      help="Save each live page (summary, description, raw v1) as <id>/<timestamp>_snapshot.json.")
    p.add_argument("--all", action="store_true",
                   help="Every game-* page except games-never-upload.txt / games-deprecated.txt.")
    p.add_argument("--write", action="store_true", help="With --pull: overwrite DESCRIPTION.bbcode with the live text.")
    p.add_argument("--diff", action="store_true", help="Print the live -> repo diff (ASCII only, capped).")
    p.add_argument("--force", action="store_true",
                   help="With --push: push a never-pushed page even though the live text differs. "
                        "With --mark-reviewed: mark it although special statements are not carried over.")
    p.add_argument("--backup-dir", default=DEFAULT_BACKUP_DIR, metavar="DIR",
                   help="Backups, pushed.json, reviewed.json and specials/ location (default: <repo>/page-backups/).")
    args = p.parse_args()
    if args.write and not args.pull:
        p.error("--write only applies with --pull")
    if args.force and not (args.push or args.mark_reviewed):
        p.error("--force only applies with --push or --mark-reviewed")
    if args.all and args.game_ids:
        p.error("give GAME_IDs or --all, not both")
    if not args.all and not args.game_ids:
        p.error("give one or more GAME_IDs, or --all")

    mode_name = ("push" if args.push else "pull" if args.pull else "specials" if args.specials
                 else "review" if args.mark_reviewed else "backup" if args.backup else "report")
    ids = all_page_ids() if args.all else args.game_ids
    results = run_pages(ids, mode=mode_name, backup_dir=os.path.abspath(args.backup_dir),
                        force=args.force, dry_run=args.dry_run, write=args.write, show_diff=args.diff)
    _print_summary(results)
    return 1 if any(r["status"] == "error" for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
