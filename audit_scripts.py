"""
audit_scripts.py

Runs three audits and reports drift found in any:

  1. Header docstring audit -- compares each script's argparse flags and
     env-var reads against the flags and env vars documented in its own
     header docstring (Usage: and Environment variables: sections).

  2. SCRIPTS.md audit -- compares the same code-extracted flags and env vars
     against the corresponding script section in SCRIPTS.md (### name --
     Usage and ### name -- Environment Variables subsections).

  3. scripts.txt cross-check -- warns when a *.py in the repo root is not
     listed in scripts.txt, or when scripts.txt references a missing file.

Read-only; never modifies any file.

Usage:
    python audit_scripts.py
    python audit_scripts.py SCRIPT [SCRIPT ...]

Examples:
    python audit_scripts.py
    python audit_scripts.py new_extension.py release_extension.py

Details:
    Skips vortex_utils.py (library), generate_explained.js (Node), and
    SCRIPTS.md. These are listed in the SKIP set.

    Env vars consumed inside vortex_utils helpers (STEAMGRIDDB_API_KEY,
    NEXUS_API_KEY, STEAM_API_KEY) are listed in INDIRECT_ENVVARS and
    allowed as documented-but-not-directly-called without raising a flag.

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

SCRIPTS_MD  = os.path.join(REPO_ROOT, "SCRIPTS.md")
SCRIPTS_TXT = os.path.join(REPO_ROOT, "scripts.txt")


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
    """Return set of env var names from os.environ.get(), os.getenv(), and get_api_key() calls."""
    names = set()
    names.update(re.findall(r'os\.environ\.get\s*\(\s*[\'"]([A-Z][A-Z0-9_]+)[\'"]', src))
    names.update(re.findall(r'os\.getenv\s*\(\s*[\'"]([A-Z][A-Z0-9_]+)[\'"]', src))
    names.update(re.findall(r'get_api_key\s*\(\s*[\'"]([A-Z][A-Z0-9_]+)[\'"]', src))
    return names


_SECTION_HEADERS = {
    'usage', 'options', 'examples', 'requirements', 'environment variables',
    'output', 'details', 'notes', 'flags', 'arguments',
}


def _parse_docstring_flags(docstring):
    """Return set of --flag-name strings found in the Usage: section."""
    flags = set()
    in_usage = False
    for line in docstring.splitlines():
        stripped = line.strip()
        if re.match(r'^Usage\s*:', stripped, re.IGNORECASE):
            in_usage = True
            continue
        if in_usage:
            m = re.match(r'^([A-Za-z][A-Za-z ]*?)\s*:', stripped)
            if m and m.group(1).lower() in _SECTION_HEADERS:
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
            m = re.match(r'^([A-Za-z][A-Za-z ]*?)\s*:', stripped)
            if m and m.group(1).lower() in _SECTION_HEADERS:
                in_env = False
                continue
            # First token on the line is the var name
            m = re.match(r'\s*([A-Z][A-Z0-9_]{2,})', line)
            if m:
                envvars.add(m.group(1))
    return envvars


# ── SCRIPTS.md parser ────────────────────────────────────────────────────────

def _parse_scripts_md():
    """Parse SCRIPTS.md; return {script_name: {'flags': set, 'envvars': set}}."""
    if not os.path.isfile(SCRIPTS_MD):
        return {}
    with open(SCRIPTS_MD, encoding='utf-8') as f:
        content = f.read()

    result = {}
    current_script = None
    current_sub = None

    for line in content.splitlines():
        # Level-2 heading that names a script file
        m = re.match(r'^## (\S+\.(?:py|js))\b', line)
        if m:
            current_script = m.group(1)
            current_sub = None
            result[current_script] = {'flags': set(), 'envvars': set()}
            continue

        # Level-3 subsection — detect Usage vs Environment Variables
        if current_script and re.match(r'^### ', line):
            lower = line.lower()
            if 'usage' in lower:
                current_sub = 'usage'
            elif 'environment' in lower:
                current_sub = 'envvars'
            else:
                current_sub = None
            continue

        if current_script is None:
            continue

        if current_sub == 'usage':
            result[current_script]['flags'].update(re.findall(r'--[\w-]+', line))
        elif current_sub == 'envvars':
            # Match backtick-quoted VAR_NAME in first table column
            m = re.match(r'\|\s*`([A-Z][A-Z0-9_]+)`', line)
            if m:
                result[current_script]['envvars'].add(m.group(1))

    return result


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


def audit_scripts_md(paths):
    """Audit SCRIPTS.md docs against each script's code. Returns True if drift found."""
    md_data = _parse_scripts_md()
    if not md_data:
        print("  SCRIPTS.md not found or has no script sections.")
        return False

    any_drift = False
    checked = 0
    for path in paths:
        name = os.path.basename(path)
        if name in SKIP or not name.endswith('.py'):
            continue
        if name not in md_data:
            print(f"  {name}: not in SCRIPTS.md")
            any_drift = True
            continue
        if not os.path.isfile(path):
            continue
        checked += 1
        with open(path, encoding='utf-8') as f:
            src = f.read()

        code_flags   = _extract_argparse_flags(src)
        md_flags     = md_data[name]['flags']
        code_envvars = _extract_code_envvars(src)
        md_envvars   = md_data[name]['envvars']

        findings = {
            "flags_undocumented":   sorted(code_flags - md_flags),
            "flags_phantom":        sorted(md_flags - code_flags),
            "envvars_undocumented": sorted(code_envvars - md_envvars),
            "envvars_phantom":      sorted((md_envvars - code_envvars) - INDIRECT_ENVVARS),
        }
        if any(findings[k] for k in findings):
            any_drift = True
        print_report(name, findings)

    if checked == 0 and not any_drift:
        print("  (no auditable Python scripts found in SCRIPTS.md)")
    return any_drift


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


# ── scripts.txt cross-check ──────────────────────────────────────────────────

def audit_scripts_txt():
    """Cross-check scripts.txt against the filesystem. Returns True if any issues found."""
    if not os.path.isfile(SCRIPTS_TXT):
        print("  scripts.txt not found.")
        return True

    with open(SCRIPTS_TXT, encoding='utf-8') as f:
        lines = [l.strip() for l in f if l.strip() and not l.strip().startswith('#')]

    listed = set(lines)
    any_issue = False

    for name in sorted(listed):
        path = os.path.join(REPO_ROOT, name)
        if not os.path.isfile(path):
            print(f"  scripts.txt references missing file: {name}")
            any_issue = True

    on_disk = {
        f for f in os.listdir(REPO_ROOT)
        if f.endswith('.py') and os.path.isfile(os.path.join(REPO_ROOT, f))
    }
    unlisted = sorted(on_disk - listed)
    for name in unlisted:
        print(f"  {name}: exists in repo root but not listed in scripts.txt")
        any_issue = True

    if not any_issue:
        print("  scripts.txt: OK")
    return any_issue


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

    print(f"Auditing {len(paths)} script(s) against their header docstrings...\n")
    for path in paths:
        name = os.path.basename(path)
        if name in SKIP:
            continue
        if not os.path.isfile(path):
            print(f"  {name}: NOT FOUND")
            continue
        findings = audit_script(path)
        if any(findings[k] for k in findings):
            any_drift = True
        print_report(name, findings)

    print()
    print(f"Auditing SCRIPTS.md against script code...\n")
    if audit_scripts_md(paths):
        any_drift = True

    print()
    print("Cross-checking scripts.txt against the filesystem...\n")
    if audit_scripts_txt():
        any_drift = True

    print()
    if any_drift:
        print("Drift found. Update headers, SCRIPTS.md, or scripts.txt to match the code.")
    else:
        print("All clear.")


if __name__ == "__main__":
    main()
