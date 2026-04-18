"""
audit_scripts.py

Compares each developer script's implementation against its own header
docstring. Reports flags and environment variables that appear in the code
but are absent from the docs, or appear in the docs but are absent from the
code. Read-only; never modifies any file.

Usage:
    python audit_scripts.py
    python audit_scripts.py SCRIPT [SCRIPT ...]

Examples:
    python audit_scripts.py
    python audit_scripts.py new_extension.py release_extension.py

Requirements:
    No additional packages required (Python stdlib only).
"""

import argparse
import ast
import os
import re
import sys

from vortex_utils import iter_repo_scripts, REPO_ROOT

# Scripts that are libraries or non-Python — skip them
SKIP = {"vortex_utils.py", "generate_explained.js", "SCRIPTS.md"}

# Env vars consumed inside vortex_utils helpers (indirect use).
# Scripts that document these but don't call os.environ.get() directly are correct.
INDIRECT_ENVVARS = {"STEAMGRIDDB_API_KEY", "NEXUS_API_KEY", "STEAM_API_KEY"}


# ── Extraction helpers ────────────────────────────────────────────────────────

def _extract_module_docstring(src):
    """Return the module-level docstring from Python source, or ''."""
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return ''
    if (tree.body
            and isinstance(tree.body[0], ast.Expr)
            and isinstance(tree.body[0].value, ast.Constant)
            and isinstance(tree.body[0].value.value, str)):
        return tree.body[0].value.value
    return ''


def _extract_argparse_flags(src):
    """Return set of --flag-name strings found in add_argument() calls."""
    return set(re.findall(r'add_argument\([^)]*?(--[\w-]+)', src))


def _extract_code_envvars(src):
    """Return set of env var names from os.environ.get() and get_api_key() calls."""
    names = set()
    names.update(re.findall(r'os\.environ\.get\s*\(\s*[\'"]([A-Z][A-Z0-9_]+)[\'"]', src))
    names.update(re.findall(r'get_api_key\s*\(\s*[\'"]([A-Z][A-Z0-9_]+)[\'"]', src))
    return names


def _parse_docstring_flags(docstring):
    """Return set of --flag-name strings found in the Usage: section."""
    flags = set()
    in_usage = False
    for line in docstring.splitlines():
        stripped = line.strip()
        if re.match(r'^Usage\s*:', stripped):
            in_usage = True
            continue
        if in_usage:
            # New top-level section ends Usage
            if re.match(r'^[A-Za-z][A-Za-z ]+\s*:', stripped) and not stripped.startswith('python'):
                in_usage = False
                continue
            flags.update(re.findall(r'--[\w-]+', line))
    return flags


def _parse_docstring_envvars(docstring):
    """Return set of env var names from the Environment variables: section."""
    envvars = set()
    in_env = False
    for line in docstring.splitlines():
        stripped = line.strip()
        if re.match(r'^Environment variables\s*:', stripped, re.IGNORECASE):
            in_env = True
            continue
        if in_env:
            if not stripped:
                continue
            # New top-level section
            if re.match(r'^[A-Za-z][A-Za-z ]+\s*:', stripped) and len(stripped) < 50:
                in_env = False
                continue
            # First token on the line is the var name
            m = re.match(r'\s*([A-Z][A-Z0-9_]{2,})', line)
            if m:
                envvars.add(m.group(1))
    return envvars


# ── Audit ─────────────────────────────────────────────────────────────────────

def audit_script(path):
    """Return a dict with drift findings for a single script."""
    with open(path, encoding='utf-8') as f:
        src = f.read()

    docstring = _extract_module_docstring(src)

    code_flags = _extract_argparse_flags(src)
    doc_flags = _parse_docstring_flags(docstring)

    code_envvars = _extract_code_envvars(src)
    doc_envvars = _parse_docstring_envvars(docstring)

    return {
        "flags_undocumented": sorted(code_flags - doc_flags),
        "flags_phantom":      sorted(doc_flags - code_flags),
        "envvars_undocumented": sorted(code_envvars - doc_envvars),
        "envvars_phantom":      sorted((doc_envvars - code_envvars) - INDIRECT_ENVVARS),
    }


def print_report(name, findings):
    issues = []
    if findings["flags_undocumented"]:
        issues.append(("Flags in code, missing from header",
                        findings["flags_undocumented"]))
    if findings["flags_phantom"]:
        issues.append(("Flags in header, not in argparse",
                        findings["flags_phantom"]))
    if findings["envvars_undocumented"]:
        issues.append(("Env vars in code, missing from header",
                        findings["envvars_undocumented"]))
    if findings["envvars_phantom"]:
        issues.append(("Env vars in header, not in code",
                        findings["envvars_phantom"]))

    if not issues:
        print(f"  {name}: OK")
        return

    print(f"  {name}:")
    for label, items in issues:
        print(f"    {label}:")
        for item in items:
            print(f"      {item}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Audit developer script headers for drift against their code."
    )
    parser.add_argument(
        "scripts",
        nargs="*",
        metavar="SCRIPT",
        help="Script filenames to audit. Omit to audit all scripts in scripts.txt.",
    )
    args = parser.parse_args()

    if args.scripts:
        paths = [os.path.join(REPO_ROOT, s) for s in args.scripts]
    else:
        paths = [p for p in iter_repo_scripts()
                 if os.path.basename(p) not in SKIP
                 and p.endswith('.py')]

    any_drift = False
    print(f"Auditing {len(paths)} script(s)...\n")
    for path in paths:
        name = os.path.basename(path)
        if name in SKIP:
            continue
        if not os.path.isfile(path):
            print(f"  {name}: NOT FOUND")
            continue
        findings = audit_script(path)
        has_drift = any(findings[k] for k in findings)
        if has_drift:
            any_drift = True
        print_report(name, findings)

    print()
    if any_drift:
        print("Drift found. Update the header docstrings to match the code.")
    else:
        print("All clear.")


if __name__ == "__main__":
    main()
