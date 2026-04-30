"""
audit_scripts.py

Runs three audits and reports drift found in any:

  1. Header docstring audit -- compares each script's argparse flags and
     env-var reads against the flags and env vars documented in its own
     header docstring (Usage: and Environment variables: sections).

  2. SCRIPTS.md audit -- compares the same code-extracted flags and env vars
     against the corresponding script section in SCRIPTS.md (### name --
     Usage and ### name -- Environment Variables subsections).

  3. scripts.txt cross-check -- warns when a *.py or *.js in the repo root is
     not listed in scripts.txt, or when scripts.txt references a missing file.

Read-only; never modifies any file.

Usage:
    python audit_scripts.py
    python audit_scripts.py SCRIPT [SCRIPT ...]
    python audit_scripts.py --json

Examples:
    python audit_scripts.py
    python audit_scripts.py new_extension.py release_extension.py
    python audit_scripts.py --json | jq .drift_found

Details:
    Skips vortex_utils.py (library), generate_explained.js (Node), and
    SCRIPTS.md. These are listed in the SKIP set.

    Env vars consumed inside vortex_utils helpers (STEAMGRIDDB_API_KEY,
    NEXUS_API_KEY, STEAM_API_KEY) are listed in INDIRECT_ENVVARS and
    allowed as documented-but-not-directly-called without raising a flag.

    Detects orphan SCRIPTS.md sections (## script.py headings whose file no
    longer exists on disk). Use --json for machine-readable output; exits 1
    when drift is found (both modes).

Requirements:
    No additional packages required (Python stdlib only).
"""

import argparse
import ast
import json
import os
import re
import sys

from vortex_utils import iter_repo_scripts, REPO_ROOT

# Scripts that are libraries, config files, or otherwise not dev scripts
SKIP = {"vortex_utils.py", "generate_explained.js", "SCRIPTS.md", "eslint.config.js"}

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
    """Return set of --flag-name strings found in add_argument() calls.
    Uses ast to avoid false misses when help= strings contain parentheses."""
    flags = set()
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return flags
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        fn = node.func
        if not (isinstance(fn, ast.Attribute) and fn.attr == 'add_argument'):
            continue
        for arg in node.args:
            if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                if arg.value.startswith('--'):
                    flags.add(arg.value)
        for kw in node.keywords:
            if isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str):
                if kw.value.value.startswith('--'):
                    flags.add(kw.value.value)
    return flags


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
    """Audit SCRIPTS.md docs against each script's code.
    Returns (any_drift, findings_by_name, missing_from_md, orphan_sections)."""
    md_data = _parse_scripts_md()
    findings_by_name = {}
    missing_from_md = []
    orphan_sections = []

    if not md_data:
        return False, findings_by_name, missing_from_md, orphan_sections

    # Orphan sections: headings in SCRIPTS.md for files that don't exist on disk
    auditable_names = {os.path.basename(p) for p in paths}
    for script_name in md_data:
        if script_name.endswith('.py') and not os.path.isfile(os.path.join(REPO_ROOT, script_name)):
            orphan_sections.append(script_name)

    any_drift = bool(orphan_sections)

    for path in paths:
        name = os.path.basename(path)
        if name in SKIP or not name.endswith('.py'):
            continue
        if name not in md_data:
            missing_from_md.append(name)
            any_drift = True
            continue
        if not os.path.isfile(path):
            continue
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
        findings_by_name[name] = findings
        if any(findings[k] for k in findings):
            any_drift = True

    return any_drift, findings_by_name, missing_from_md, orphan_sections


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
    """Cross-check scripts.txt against the filesystem.
    Returns (any_issue, missing_files, unlisted_files)."""
    if not os.path.isfile(SCRIPTS_TXT):
        return True, [], []

    with open(SCRIPTS_TXT, encoding='utf-8') as f:
        lines = [l.strip() for l in f if l.strip() and not l.strip().startswith('#')]

    listed = set(lines)
    missing_files = sorted(
        name for name in listed
        if not os.path.isfile(os.path.join(REPO_ROOT, name))
    )
    on_disk = {
        f for f in os.listdir(REPO_ROOT)
        if (f.endswith('.py') or f.endswith('.js'))
        and os.path.isfile(os.path.join(REPO_ROOT, f))
    }
    unlisted_files = sorted((on_disk - listed) - SKIP)
    any_issue = bool(missing_files or unlisted_files)
    return any_issue, missing_files, unlisted_files


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
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON instead of human-readable text.",
    )
    args = parser.parse_args()

    if args.scripts:
        paths = [os.path.join(REPO_ROOT, s) for s in args.scripts]
    else:
        paths = [p for p in iter_repo_scripts()
                 if os.path.basename(p) not in SKIP
                 and p.endswith('.py')]

    # -- Header docstring audit --
    header_findings = {}
    for path in paths:
        name = os.path.basename(path)
        if name in SKIP:
            continue
        if not os.path.isfile(path):
            header_findings[name] = {"error": "NOT FOUND"}
            continue
        header_findings[name] = audit_script(path)

    header_drift = any(
        any(v for v in f.values()) if isinstance(f, dict) else False
        for f in header_findings.values()
    )

    # -- SCRIPTS.md audit --
    md_drift, md_findings, missing_from_md, orphan_sections = audit_scripts_md(paths)

    # -- scripts.txt cross-check --
    txt_issue, missing_files, unlisted_files = audit_scripts_txt()

    any_drift = header_drift or md_drift or txt_issue

    if args.json:
        output = {
            "header_audit": {
                name: {k: v for k, v in f.items() if v}
                for name, f in header_findings.items()
                if isinstance(f, dict) and any(v for v in f.values())
            },
            "scripts_md_audit": {
                "findings": {
                    name: {k: v for k, v in f.items() if v}
                    for name, f in md_findings.items()
                    if any(v for v in f.values())
                },
                "missing_from_md": missing_from_md,
                "orphan_sections": orphan_sections,
            },
            "scripts_txt_audit": {
                "missing_files": missing_files,
                "unlisted_files": unlisted_files,
            },
            "drift_found": any_drift,
        }
        print(json.dumps(output, indent=2))
        sys.exit(1 if any_drift else 0)

    # Human-readable output
    print(f"Auditing {len(paths)} script(s) against their header docstrings...\n")
    for name, findings in header_findings.items():
        if "error" in findings:
            print(f"  {name}: {findings['error']}")
        else:
            print_report(name, findings)

    print()
    print(f"Auditing SCRIPTS.md against script code...\n")
    if not _parse_scripts_md():
        print("  SCRIPTS.md not found or has no script sections.")
    else:
        for name in missing_from_md:
            print(f"  {name}: not in SCRIPTS.md")
        for name, findings in md_findings.items():
            print_report(name, findings)
        for name in orphan_sections:
            print(f"  {name}: in SCRIPTS.md but file not found in repo root")
        if not missing_from_md and not md_findings and not orphan_sections:
            print("  (no auditable Python scripts found in SCRIPTS.md)")

    print()
    print("Cross-checking scripts.txt against the filesystem...\n")
    if not os.path.isfile(SCRIPTS_TXT):
        print("  scripts.txt not found.")
    else:
        for name in missing_files:
            print(f"  scripts.txt references missing file: {name}")
        for name in unlisted_files:
            print(f"  {name}: exists in repo root but not listed in scripts.txt")
        if not missing_files and not unlisted_files:
            print("  scripts.txt: OK")

    print()
    if any_drift:
        print("Drift found. Update headers, SCRIPTS.md, or scripts.txt to match the code.")
        sys.exit(1)
    else:
        print("All clear.")


if __name__ == "__main__":
    main()
