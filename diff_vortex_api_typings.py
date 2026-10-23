"""
diff_vortex_api_typings.py

Compares published @nexusmods/vortex-api typings (lib/api.d.ts) between versions as
symbol sets, the way an API audit needs them. The bundler reorders declarations between
builds, so a line diff of two api.d.ts files drowns in noise; a symbol-set diff shows what
was really added or removed.

For each version it reports the line count, the number of top-level declarations, the
number of @deprecated tags, and the number of unresolved "@/..." alias imports. For each
consecutive pair it reports whether the files are byte-identical, which declarations were
added or removed, and whether the set of @deprecated declarations changed.

Versions are npm versions ("2.9.0", "2.10.0-beta.2"), npm dist-tags ("latest", "beta"),
or "installed" (the copy in node_modules/vortex-api, read from disk). With no versions it
compares installed, latest and beta, and also says whether resources/api.d.ts still matches
the installed copy.

Usage:
    python diff_vortex_api_typings.py                          # installed vs latest vs beta
    python diff_vortex_api_typings.py 2.8.2 2.9.0              # two npm versions
    python diff_vortex_api_typings.py installed 2.10.0-beta.2  # local copy vs a beta
    python diff_vortex_api_typings.py 2.9.0 beta --save DIR    # also write each api.d.ts to DIR/<version>/
    python diff_vortex_api_typings.py --json 2.9.0 beta        # machine-readable output

Requirements:
    Python standard library only. Network access to registry.npmjs.org for any version
    other than "installed".

Notes:
    Tarballs are read in memory; only lib/api.d.ts is taken out of each, and nothing is
    extracted to disk unless --save is given. The app tag of a Vortex release and the npm
    package of the same number can come from different code lines (npm 2.9.0-beta.2 was
    built from master while the v2.9.0-beta.2 app tag was not), so this tool dates the
    typings only. Check the app with git in the Vortex repo.
"""

import argparse
import io
import json
import os
import re
import sys
import tarfile

from vortex_utils import REPO_ROOT, http_get_bytes, http_get_json

PACKAGE = "@nexusmods/vortex-api"
REGISTRY_URL = "https://registry.npmjs.org/@nexusmods/vortex-api"
TARBALL_MEMBER = "package/lib/api.d.ts"
INSTALLED_DIR = os.path.join(REPO_ROOT, "node_modules", "vortex-api")
INSTALLED_DTS = os.path.join(INSTALLED_DIR, "lib", "api.d.ts")
RESOURCES_DTS = os.path.join(REPO_ROOT, "resources", "api.d.ts")

# Same pattern the audits have used since 2026-10-01, so counts stay comparable
# (952 symbols at 2.8.2 and 2.9.0, 968 at 2.10.0-beta.2).
SYMBOL_RE = re.compile(
    r"^(?:export )?(?:declare )?(?:interface|type|const|function|class|enum|let|var) "
    r"([A-Za-z_$][\w$]*)",
    re.M,
)
ALIAS_IMPORT = 'from "@/'


def load_registry():
    """Return the npm registry document for the package."""
    return http_get_json(REGISTRY_URL)


def resolve_versions(requested, registry):
    """Turn dist-tags into versions, keep "installed" and plain versions, drop repeats."""
    tags = (registry or {}).get("dist-tags", {})
    resolved = []
    for name in requested:
        version = tags.get(name, name)
        if version not in resolved:
            resolved.append(version)
    return resolved


def installed_version():
    """Version string of the installed copy, or None when it is missing."""
    try:
        with open(os.path.join(INSTALLED_DIR, "package.json"), encoding="utf-8") as fh:
            return json.load(fh).get("version")
    except (OSError, ValueError):
        return None


def read_typings(version, registry):
    """Return the api.d.ts text for a version ("installed" reads node_modules)."""
    if version == "installed":
        with open(INSTALLED_DTS, encoding="utf-8") as fh:
            return fh.read()
    meta = (registry.get("versions") or {}).get(version)
    if meta is None:
        raise ValueError(f"{PACKAGE} has no published version {version}")
    data = http_get_bytes(meta["dist"]["tarball"])
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        member = tar.extractfile(TARBALL_MEMBER)
        if member is None:
            raise ValueError(f"{version} tarball has no {TARBALL_MEMBER}")
        return member.read().decode("utf-8")


def deprecated_declarations(text):
    """The declaration line following each @deprecated tag (first 60 chars, trimmed)."""
    found = []
    pending = False
    for line in text.splitlines():
        stripped = line.strip()
        if "@deprecated" in stripped:
            pending = True
            continue
        if not pending or not stripped:
            continue
        if stripped.startswith(("*", "/*", "//")):
            continue
        found.append(stripped[:60])
        pending = False
    return found


def summarize(label, text):
    """Per-version figures used by the report."""
    return {
        "version": label,
        "lines": text.count("\n"),
        "symbols": set(SYMBOL_RE.findall(text)),
        "deprecated": deprecated_declarations(text),
        "alias_imports": text.count(ALIAS_IMPORT),
        "text": text,
    }


def compare(a, b):
    """Differences between two summaries."""
    return {
        "from": a["version"],
        "to": b["version"],
        "identical": a["text"] == b["text"],
        "added": sorted(b["symbols"] - a["symbols"]),
        "removed": sorted(a["symbols"] - b["symbols"]),
        "deprecated_added": sorted(set(b["deprecated"]) - set(a["deprecated"])),
        "deprecated_removed": sorted(set(a["deprecated"]) - set(b["deprecated"])),
    }


def print_report(summaries, diffs, resources_note):
    print("=== Versions ===")
    for s in summaries:
        print(f"  {s['version']:<22} lines={s['lines']:<6} symbols={len(s['symbols']):<5} "
              f"@deprecated={len(s['deprecated']):<3} '@/' imports={s['alias_imports']}")
    for d in diffs:
        print(f"\n=== {d['from']} -> {d['to']} ===")
        if d["identical"]:
            print("  byte-identical")
            continue
        print(f"  + {len(d['added'])} symbol(s): {', '.join(d['added']) or '-'}")
        print(f"  - {len(d['removed'])} symbol(s): {', '.join(d['removed']) or '-'}")
        if d["deprecated_added"] or d["deprecated_removed"]:
            for decl in d["deprecated_added"]:
                print(f"  + @deprecated: {decl}")
            for decl in d["deprecated_removed"]:
                print(f"  - @deprecated: {decl}")
        else:
            print("  @deprecated set unchanged")
    if resources_note:
        print(f"\n{resources_note}")


def main():
    ap = argparse.ArgumentParser(description="Symbol-set diff of published vortex-api typings.")
    ap.add_argument("versions", nargs="*",
                    help='npm versions, dist-tags, or "installed" (default: installed latest beta)')
    ap.add_argument("--save", metavar="DIR", help="also write each api.d.ts to DIR/<version>/api.d.ts")
    ap.add_argument("--json", action="store_true", help="print JSON instead of the text report")
    args = ap.parse_args()

    requested = args.versions or ["installed", "latest", "beta"]
    needs_registry = any(v != "installed" for v in requested)
    try:
        registry = load_registry() if needs_registry else {}
    except Exception as exc:
        print(f"[ERROR] could not read the npm registry: {exc}", file=sys.stderr)
        return 1

    summaries = []
    for version in resolve_versions(requested, registry):
        label = version
        if version == "installed":
            label = f"installed ({installed_version() or 'unknown'})"
        try:
            text = read_typings(version, registry)
        except Exception as exc:
            print(f"[ERROR] {version}: {exc}", file=sys.stderr)
            return 1
        summaries.append(summarize(label, text))
        if args.save:
            folder = os.path.join(args.save, version)
            os.makedirs(folder, exist_ok=True)
            with open(os.path.join(folder, "api.d.ts"), "w", encoding="utf-8", newline="") as fh:
                fh.write(text)

    diffs = [compare(a, b) for a, b in zip(summaries, summaries[1:])]

    resources_note = None
    if not args.versions and os.path.exists(INSTALLED_DTS) and os.path.exists(RESOURCES_DTS):
        with open(INSTALLED_DTS, "rb") as fa, open(RESOURCES_DTS, "rb") as fb:
            same = fa.read() == fb.read()
        resources_note = ("resources/api.d.ts matches the installed copy" if same else
                          "resources/api.d.ts DIFFERS from the installed copy - re-copy it")

    if args.json:
        out = {
            "versions": [
                {k: (len(v) if k == "symbols" else v) for k, v in s.items() if k != "text"}
                for s in summaries
            ],
            "diffs": diffs,
            "resources_matches_installed": None if resources_note is None else "matches" in resources_note,
        }
        print(json.dumps(out, indent=2))
    else:
        print_report(summaries, diffs, resources_note)
    return 0


if __name__ == "__main__":
    sys.exit(main())
