# Script Environment Bootstrap

Steps to set up the dev script environment on a new Windows PC.

---

## 1. Prerequisites

| Tool | Notes |
| --- | --- |
| **Git** | Required for all repos |
| **Python 3.11+** | Must be on `PATH` |
| **Node.js LTS** | Must be on `PATH`; required for `generate_explained.js`, `node --check`, and ESLint |
| **Vortex** | Install normally; creates `C:\ProgramData\vortex\` |

---

## 2. Clone Repos

```text
C:\Game_Tools\0 GitHub Repos\
  ChemBoy1-Vortex-Games\   <- primary repo
  Vortex-Backend\           <- read-only app backend (optional)
  Personal\                 <- standalone utility scripts
  Vortex\                   <- read-only app source (optional, needed for API types)
```

All paths above are the expected locations. Scripts derive `REPO_ROOT` relative to their own file, but some paths are hardcoded in env vars — match the folder layout or override with env vars (section 4).

---

## 3. Python Dependencies

Install from the repo root:

```text
pip install PySide6 Pillow
```

| Package | Required by |
| --- | --- |
| `PySide6` | `vortex_gui.py` |
| `Pillow` | `vortex_utils.py` image resize, `fetch_cover_art.py`, `fetch_exec_icon.py`, `new_extension.py`, `patch_extensions.py` |

`vortex_utils.py` itself uses stdlib only. Pillow is lazy-imported — scripts run without it but image operations are skipped with a warning.

**Personal repo only:**

```text
pip install requests
```

Required by `steam_wishlist_prices.py`.

---

## 4. Node.js Dependencies

From `ChemBoy1-Vortex-Games\`:

```text
npm install
```

Installs dev dependencies: `eslint`, `prettier`, `prettier-eslint`, `typescript`, and `source-map`.

---

## 5. Windows Environment Variables

Set all of these under `HKEY_CURRENT_USER\Environment` (i.e. user-level, not system). The easiest way is **System Properties -> Environment Variables -> User variables**.

| Variable | Value | Required by |
| --- | --- | --- |
| `NEXUS_API_KEY` | Your Nexus Mods API key | `new_extension.py`, `fetch_nexus_stats.py`, `patch_extensions.py`, `nexus_games_report.py` |
| `STEAM_API_KEY` | Your Steam Web API key | `new_extension.py` (Steam app info lookups) |
| `STEAM_USER_ID` | Your Steam 64-bit ID | `new_extension.py` |
| `STEAMGRIDDB_API_KEY` | Your SteamGridDB API key | `fetch_cover_art.py` |
| `VORTEX_MANIFEST_PATH` | *(optional override)* `%APPDATA%\Vortex\temp\extensions-manifest.json` | `patch_extensions.py`, `nexus_games_report.py`; override only — default resolves automatically via `%APPDATA%` |

API keys are read via `os.environ.get()` first, then `HKEY_CURRENT_USER\Environment` registry fallback. Do not hardcode them.

After setting user env vars, restart any open terminals for the changes to take effect.

---

## 6. Extension Manifest

`extensions-manifest.json` is the canonical source for which Nexus mod ID corresponds to each Vortex extension. It is used by `patch_extensions.py` (extension URL patching) and `nexus_games_report.py` (supported-status column).

The file is written by Vortex at runtime to `%APPDATA%\Vortex\temp\extensions-manifest.json`. Launch Vortex at least once to generate it before running scripts that consume it.

---

## 7. Verify Setup

```text
# Check Python + key packages
python -c "import vortex_utils; print('vortex_utils OK')"
python -c "from PIL import Image; print('Pillow OK')"
python -c "from PySide6.QtWidgets import QApplication; print('PySide6 OK')"

# Check Node
node --version
npx eslint --version

# Check manifest path exists
python -c "import os; p=os.path.join(os.environ.get('APPDATA',''), 'Vortex', 'temp', 'extensions-manifest.json'); print('manifest OK' if os.path.exists(p) else 'MISSING: ' + p)"

# Check env vars
python -c "import os; [print(k, '=', 'SET' if os.environ.get(k) else 'MISSING') for k in ['NEXUS_API_KEY','STEAM_API_KEY','STEAM_USER_ID','STEAMGRIDDB_API_KEY']]"
```
