#!/usr/bin/env python3
"""
compare_to_head.py -- Diff what a repo-root Python script prints at git HEAD vs in the working tree.

Answers "did my change to this script (or to vortex_utils.py) change its output on the
real repo?" Runs SCRIPT twice against the SAME extension folders, lists and resources:
once as committed at HEAD, once as it is on disk now, then compares exit codes and
output. The HEAD run also loads every other repo-root .py module (vortex_utils.py and
friends) as committed, so a helper change shows up in the dependent script's output.

Both runs execute the script FOR REAL. Only use read-only invocations (--audit,
--dry-run, --check, --diff, --list...). That is why --confirm-read-only is required:
it is you promising the arguments cannot write files, upload, or spend API quota.
--upload is refused outright.

Usage:
    python compare_to_head.py --confirm-read-only [--ignore REGEX] [--max-diff-lines N] [--timeout SECONDS] SCRIPT [SCRIPT_ARGS ...]

Examples:
    python compare_to_head.py --confirm-read-only patch_extensions.py --audit
    python compare_to_head.py --confirm-read-only audit_parity.py --no-regen
    python compare_to_head.py --confirm-read-only --ignore "^Elapsed" categorize_games.py --dry-run

Options (they go BEFORE SCRIPT; everything after SCRIPT is passed to the script):
    --confirm-read-only   Required. Asserts the script arguments are read-only.
    --ignore REGEX        Drop output lines matching REGEX from both sides before
                          comparing (timings, timestamps). May be repeated.
    --max-diff-lines N    Print at most N diff lines (default: 200; 0 = all).
    --timeout SECONDS     Kill either run after SECONDS (default: 600).

SCRIPT is a bare file name in the repo root (e.g. patch_extensions.py) that is tracked
at HEAD. A module that is NEW since HEAD cannot be loaded as HEAD, so the HEAD side
imports the working-tree copy of it instead.

Exit code: 0 = identical exit code and output, 1 = they differ, 2 = could not run
(bad script name, not tracked at HEAD, missing --confirm-read-only, timeout).
"""

import argparse
import difflib
import importlib.abc
import importlib.util
import os
import re
import subprocess
import sys
import types

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))

# First argument of the internal child process that runs the HEAD copy. Not an argparse
# flag: the parent builds this command line, a user never types it.
_CHILD_MARKER = "--run-as-head"

# Arguments that publish or spend something no matter what else is on the line.
_REFUSED_ARGS = ("--upload",)


# == HEAD access ================================================================

def _git(*args):
    return subprocess.run(["git", "-C", REPO_ROOT, *args], capture_output=True)


def _git_show(name):
    """Return the text of repo-root file `name` as committed at HEAD.

    Not vortex_utils.git_show_text on purpose: this script compares HEAD against the working
    tree, so it must run without importing the very vortex_utils it may be asked to compare."""
    shown = _git("show", f"HEAD:{name}")
    if shown.returncode != 0:
        raise FileNotFoundError(f"{name} is not tracked at HEAD: {shown.stderr.decode(errors='replace').strip()}")
    return shown.stdout.decode("utf-8")


def _head_module_names():
    """Names (without .py) of the repo-root .py files tracked at HEAD."""
    listed = _git("ls-tree", "--name-only", "HEAD")
    if listed.returncode != 0:
        raise RuntimeError(f"git ls-tree failed: {listed.stderr.decode(errors='replace').strip()}")
    return {n[:-3] for n in listed.stdout.decode("utf-8").splitlines() if n.endswith(".py") and "/" not in n}


class _HeadLoader(importlib.abc.Loader):
    def __init__(self, name):
        self.name = name

    def create_module(self, spec):
        return None

    def exec_module(self, module):
        # __file__ must be the REAL path: scripts derive REPO_ROOT from it, so the HEAD
        # copy reads the same folders the working-tree copy does.
        module.__file__ = os.path.join(REPO_ROOT, self.name + ".py")
        exec(compile(_git_show(self.name + ".py"), f"HEAD:{self.name}.py", "exec"), module.__dict__)


class _HeadFinder(importlib.abc.MetaPathFinder):
    def __init__(self, names):
        self.names = names

    def find_spec(self, fullname, path=None, target=None):
        if fullname in self.names:
            return importlib.util.spec_from_loader(fullname, _HeadLoader(fullname))
        return None


def _run_as_head(script, args):
    """Child process body: run the HEAD copy of `script` as __main__ with `args`."""
    sys.meta_path.insert(0, _HeadFinder(_head_module_names()))
    main_module = types.ModuleType("__main__")
    main_module.__file__ = os.path.join(REPO_ROOT, script)
    sys.modules["__main__"] = main_module
    sys.argv = [main_module.__file__, *args]
    try:
        exec(compile(_git_show(script), f"HEAD:{script}", "exec"), main_module.__dict__)
    except SystemExit as exit_request:
        code = exit_request.code
        return code if isinstance(code, int) else (0 if code is None else 1)
    return 0


# == Parent =====================================================================

def _run_side(label, cmd, timeout):
    """Run one side; return (exit_code, output_lines) or raise TimeoutError."""
    env = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUTF8="1")
    try:
        done = subprocess.run(
            cmd, cwd=REPO_ROOT, env=env, timeout=timeout,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        )
    except subprocess.TimeoutExpired:
        raise TimeoutError(f"{label} run exceeded {timeout}s")
    return done.returncode, done.stdout.decode("utf-8", errors="replace").splitlines()


def _filtered(lines, ignore):
    return [ln for ln in lines if not any(rx.search(ln) for rx in ignore)]


def main():
    parser = argparse.ArgumentParser(
        description="Diff a repo-root script's output at git HEAD vs the working tree.",
    )
    parser.add_argument("--confirm-read-only", action="store_true",
                        help="Required: assert the script arguments are read-only.")
    parser.add_argument("--ignore", action="append", default=[], metavar="REGEX",
                        help="Drop output lines matching REGEX from both sides (repeatable).")
    parser.add_argument("--max-diff-lines", type=int, default=200, metavar="N",
                        help="Print at most N diff lines (default: 200; 0 = all).")
    parser.add_argument("--timeout", type=int, default=600, metavar="SECONDS",
                        help="Kill either run after SECONDS (default: 600).")
    parser.add_argument("script", metavar="SCRIPT",
                        help="Repo-root .py file name, tracked at HEAD.")
    parser.add_argument("script_args", nargs=argparse.REMAINDER, metavar="SCRIPT_ARGS",
                        help="Arguments passed through to the script.")
    args = parser.parse_args()

    if not args.confirm_read_only:
        print("ERROR: both runs execute the script for real. Pass --confirm-read-only to assert the "
              "arguments cannot write, upload or spend quota.")
        return 2
    refused = [a for a in args.script_args if a in _REFUSED_ARGS]
    if refused:
        print(f"ERROR: refusing {', '.join(refused)}: it publishes, and would run twice.")
        return 2
    if os.path.basename(args.script) != args.script or not args.script.endswith(".py"):
        print(f"ERROR: SCRIPT must be a bare .py file name in the repo root, got {args.script!r}.")
        return 2
    if not os.path.isfile(os.path.join(REPO_ROOT, args.script)):
        print(f"ERROR: {args.script} not found in the repo root.")
        return 2
    try:
        ignore = [re.compile(p) for p in args.ignore]
        _git_show(args.script)
    except (re.error, FileNotFoundError) as err:
        print(f"ERROR: {err}")
        return 2

    print(f"Running {args.script} {' '.join(args.script_args)}".rstrip())
    try:
        now_code, now_lines = _run_side(
            "working tree", [sys.executable, os.path.join(REPO_ROOT, args.script), *args.script_args], args.timeout)
        head_code, head_lines = _run_side(
            "HEAD", [sys.executable, os.path.abspath(__file__), _CHILD_MARKER, args.script, *args.script_args],
            args.timeout)
    except TimeoutError as err:
        print(f"ERROR: {err}")
        return 2

    head_lines, now_lines = _filtered(head_lines, ignore), _filtered(now_lines, ignore)
    print(f"  HEAD         : exit {head_code}, {len(head_lines)} lines")
    print(f"  working tree : exit {now_code}, {len(now_lines)} lines")

    diff = list(difflib.unified_diff(head_lines, now_lines, "HEAD", "working tree", lineterm="", n=2))
    if head_code == now_code and not diff:
        print("IDENTICAL")
        return 0

    print("DIFFERENT" + (f" (exit code {head_code} -> {now_code})" if head_code != now_code else ""))
    shown = diff if args.max_diff_lines <= 0 else diff[:args.max_diff_lines]
    for line in shown:
        print(line)
    if len(shown) < len(diff):
        print(f"... {len(diff) - len(shown)} more diff lines (--max-diff-lines 0 shows all)")
    return 1


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == _CHILD_MARKER:
        sys.exit(_run_as_head(sys.argv[2], sys.argv[3:]))
    sys.exit(main())
