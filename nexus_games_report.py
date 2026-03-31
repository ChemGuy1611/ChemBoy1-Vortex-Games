import os
import sys
import json
import datetime
import urllib.request

NEXUS_V1 = "https://api.nexusmods.com/v1"
MANIFEST_PATH = r"C:\ProgramData\vortex\temp\extensions-manifest.json"
OUTPUT_FILE = "nexus_games_report.md"
DEFAULT_DAYS = 90


def get_api_key():
    key = os.environ.get("NEXUS_API_KEY")
    if not key:
        try:
            from winreg import OpenKey, QueryValueEx, HKEY_CURRENT_USER
            with OpenKey(HKEY_CURRENT_USER, "Environment") as k:
                key, _ = QueryValueEx(k, "NEXUS_API_KEY")
        except Exception:
            pass
    return key


def nexus_get(endpoint, api_key):
    url = f"{NEXUS_V1}{endpoint}"
    req = urllib.request.Request(url, headers={"apikey": api_key, "User-Agent": "nexus-games-report/1.0"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def load_supported_game_ids():
    try:
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        return {e["gameId"] for e in manifest.get("extensions", []) if "gameId" in e}
    except Exception as e:
        print(f"  Warning: could not read manifest ({e}). Supported column will be empty.")
        return set()


def main():
    args = sys.argv[1:]
    new_only = "--new-only" in args
    args = [a for a in args if a != "--new-only"]

    days = DEFAULT_DAYS
    if args:
        try:
            days = int(args[0])
        except ValueError:
            print(f"ERROR: argument must be a number of days (e.g. 120). Got: {args[0]}")
            sys.exit(1)

    now = datetime.datetime.now(tz=datetime.timezone.utc)
    cutoff_dt = now - datetime.timedelta(days=days)
    cutoff_ts = int(cutoff_dt.timestamp())
    cutoff_str = cutoff_dt.strftime("%Y-%m-%d")

    api_key = get_api_key()
    if not api_key:
        print("ERROR: NEXUS_API_KEY not found.")
        sys.exit(1)

    print("Loading extensions manifest...")
    supported_ids = load_supported_game_ids()
    print(f"  Known supported games: {len(supported_ids)}")

    print(f"Fetching games list from Nexus Mods (window: last {days} days, since {cutoff_str})...")
    games = nexus_get("/games.json?include_unapproved=false", api_key)
    print(f"  Total games: {len(games)}")

    # Determine sort field from the full list before filtering
    sort_field = "unique_downloads" if games and "unique_downloads" in games[0] else "downloads"
    sort_label = sort_field.replace("_", " ").title()
    print(f"  Sorting by: {sort_field}")

    filtered = [
        g for g in games
        if g.get("approved_date", 0) >= cutoff_ts
        and g.get(sort_field, 0) >= 500
    ]
    print(f"  Games added in window (>=500 downloads): {len(filtered)}")

    if new_only:
        filtered = [g for g in filtered if g.get("domain_name") not in supported_ids]
        print(f"  After filtering already-supported: {len(filtered)}")

    if not filtered:
        print("No games found. Nothing to write.")
        return

    filtered.sort(key=lambda g: g.get(sort_field, 0), reverse=True)

    filter_note = " (unsupported only)" if new_only else ""
    lines = [
        "# Nexus Mods — Recently Added Games",
        "",
        f"_Generated {now.strftime('%Y-%m-%d')} — {len(filtered)} games added in the last {days} days (since {cutoff_str}){filter_note}, sorted by {sort_label} descending._",
        "",
        f"| # | Supported | Game | Mods | {sort_label} (k) | Approved Date |",
        "| --- | --- | --- | --- | --- | --- |",
    ]

    for i, g in enumerate(filtered, 1):
        name = g.get("name", "?")
        domain = g.get("domain_name", "?")
        mods = g.get("mods", 0)
        dl = g.get(sort_field, 0)
        approved = datetime.datetime.fromtimestamp(
            g["approved_date"], tz=datetime.timezone.utc
        ).strftime("%Y-%m-%d")
        supported = "Yes" if domain in supported_ids else "No"
        lines.append(f"| {i} | {supported} | [{name}](https://www.nexusmods.com/{domain}) | {mods:,} | {dl / 1000:,.1f} | {approved} |")

    lines.append("")
    output = "\n".join(lines)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(output)

    print(f"Written to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
