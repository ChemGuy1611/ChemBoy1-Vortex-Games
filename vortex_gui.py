"""
vortex_gui.py

GUI dashboard for ChemBoy1-Vortex-Games developer scripts. Lists all game-*
extensions in a sortable/filterable table with Nexus stats columns (End, DL),
image columns (Cover, Title, Banner), flag/note system, and group-by-engine view.

Toolbar buttons run developer scripts against selected games. An always-visible
log pane streams live subprocess output, coloring error and command-echo lines.
Settings (geometry, column widths, filter text, grouping, flagged-only, category
filter, checked rows) persist across sessions via QSettings.

Dark theme applied via Fusion palette + stylesheet. Engine grouping inserts
read-only header rows via GroupProxy. "Flagged Only" restricts the table to
flagged rows; the category dropdown is a multi-select checkbox list of engines
(OR'd together) plus special categories (bundled downloader module, non-UE load
order -- each AND'd on top); Space toggles the checkbox on all selected rows.

Requirements:
    pip install pyside6

Usage:
    python vortex_gui.py
"""

import codecs
import collections
import os
import shutil
import sys

import subprocess
from datetime import datetime

from PySide6.QtCore import (
    QAbstractProxyModel, QAbstractTableModel, QEvent, QItemSelectionModel, QModelIndex,
    QObject, QPointF, QProcess, QProcessEnvironment, QSettings, QSize, QSortFilterProxyModel, Qt, QThread, QUrl, Signal,
)
from PySide6.QtGui import (
    QAction, QColor, QDesktopServices, QFont, QIcon, QKeySequence, QPainter, QPainterPath,
    QPen, QPixmap, QShortcut, QStandardItem, QTextCharFormat, QTextCursor,
)
from PySide6.QtSvg import QSvgRenderer
from PySide6.QtWidgets import (
    QAbstractItemView, QApplication, QCheckBox, QComboBox, QDialog, QDialogButtonBox,
    QFileDialog, QFormLayout, QHBoxLayout, QHeaderView, QInputDialog, QLabel, QLineEdit,
    QMainWindow, QMenu, QMessageBox, QPlainTextEdit, QProxyStyle, QPushButton,
    QRadioButton, QSplitter, QStyle, QTableView, QToolBar, QVBoxLayout, QWidget,
)

import vortex_utils as vu
import gui_tray

REPO_ROOT = vu.REPO_ROOT
PYTHON = sys.executable
NODE = shutil.which("node") or "node"
SETTINGS_ORG = "ChemBoy1"
SETTINGS_APP = "VortexExtensionManager"
SINGLE_INSTANCE_KEY = f"{SETTINGS_ORG}.{SETTINGS_APP}"
FLAGS_PATH = vu.GUI_FLAGS_PATH
ROW_CACHE_PATH = os.path.join(REPO_ROOT, "vortex_gui_row_cache.json")
_ROW_CACHE_VERSION = 2


# == Flag / stats storage ======================================================

def _load_flags() -> dict:
    return vu.read_json(FLAGS_PATH)


def _save_flags(data: dict):
    vu.write_json_atomic(FLAGS_PATH, data)


def _load_stats() -> dict:
    return vu.read_gui_stats()


def _safe_mtime(path: str) -> float:
    """Return the modification time of path, or -1.0 if it does not exist."""
    try:
        return os.path.getmtime(path)
    except OSError:
        return -1.0


def _load_row_cache() -> dict:
    """Return {folder_entry: cached_fields} from the row cache.

    Returns {} if the cache is absent or its schema version does not match,
    so a stale-schema cache is transparently rebuilt on the next load."""
    data = vu.read_json(ROW_CACHE_PATH, default={})
    if data.get("v") != _ROW_CACHE_VERSION:
        return {}
    return data.get("entries", {})


def _save_row_cache(entries: dict):
    """Persist the per-folder parse cache (atomic). Safe to call off the UI thread."""
    vu.write_json_atomic(ROW_CACHE_PATH, {"v": _ROW_CACHE_VERSION, "entries": entries})


def _save_flag(game_id: str, flagged: bool, note: str):
    flags = _load_flags()
    if not flagged and not note:
        flags.pop(game_id, None)
    else:
        flags[game_id] = {"flagged": flagged, "note": note}
    _save_flags(flags)


# == Image helpers =============================================================

def _load_icon(path: str, max_w: int, max_h: int) -> "QIcon | None":
    """Load an image file, scale to fit within max_w x max_h, return QIcon or None."""
    px = QPixmap(path)
    if px.isNull():
        return None
    px = px.scaled(max_w, max_h, Qt.KeepAspectRatio, Qt.SmoothTransformation)
    return QIcon(px)


def _load_svg_icon(path: str, size: int) -> "QIcon | None":
    """Render an SVG at size x size pixels, return QIcon or None."""
    renderer = QSvgRenderer(path)
    if not renderer.isValid():
        return None
    px = QPixmap(size, size)
    px.fill(Qt.transparent)
    p = QPainter(px)
    renderer.render(p)
    p.end()
    return QIcon(px)


VORTEX_EXE: "str | None" = vu.find_vortex_exe()

# == Dark theme palette ========================================================

_DK_BG       = "#1e1e2e"
_DK_BG_ALT   = "#252535"
_DK_BG_RAISE = "#2a2a3d"
_DK_BORDER   = "#3a3a4f"
_DK_TEXT     = "#e4e4ec"
_DK_TEXT_DIM = "#9090a0"
_DK_ACCENT   = "#5a8eff"
_DK_ACCENT_H = "#7aa3ff"
_LOG_ERROR   = "#e74c3c"   # log-pane color for [ERROR ...] / [exited with code N] lines
_LOG_CMD     = _DK_ACCENT  # log-pane color for "> command" echo lines


def _apply_dark_theme(app):
    from PySide6.QtGui import QPalette
    pal = QPalette()
    bg       = QColor(_DK_BG)
    bg_alt   = QColor(_DK_BG_ALT)
    bg_raise = QColor(_DK_BG_RAISE)
    text     = QColor(_DK_TEXT)
    text_dim = QColor(_DK_TEXT_DIM)
    accent   = QColor(_DK_ACCENT)
    border   = QColor(_DK_BORDER)
    disabled_text = QColor("#606070")

    pal.setColor(QPalette.Window,          bg)
    pal.setColor(QPalette.WindowText,      text)
    pal.setColor(QPalette.Base,            bg_alt)
    pal.setColor(QPalette.AlternateBase,   bg_raise)
    pal.setColor(QPalette.Text,            text)
    pal.setColor(QPalette.BrightText,      text)
    pal.setColor(QPalette.Button,          bg_raise)
    pal.setColor(QPalette.ButtonText,      text)
    pal.setColor(QPalette.Highlight,       accent)
    pal.setColor(QPalette.HighlightedText, QColor("#ffffff"))
    pal.setColor(QPalette.Link,            accent)
    pal.setColor(QPalette.LinkVisited,     QColor(_DK_ACCENT_H))
    pal.setColor(QPalette.ToolTipBase,     bg_raise)
    pal.setColor(QPalette.ToolTipText,     text)
    pal.setColor(QPalette.PlaceholderText, text_dim)
    pal.setColor(QPalette.Disabled, QPalette.Text,       disabled_text)
    pal.setColor(QPalette.Disabled, QPalette.ButtonText, disabled_text)
    pal.setColor(QPalette.Disabled, QPalette.WindowText, disabled_text)
    app.setPalette(pal)

    ss = f"""
QMainWindow, QDialog, QWidget {{
    background-color: {_DK_BG};
    color: {_DK_TEXT};
}}
QToolBar {{
    background-color: {_DK_BG_RAISE};
    border-bottom: 1px solid {_DK_BORDER};
    spacing: 2px;
    padding: 2px 4px;
}}
QToolBar::separator {{
    background: {_DK_BORDER};
    width: 1px;
    margin: 3px 4px;
}}
QToolButton {{
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 2px 6px;
    color: {_DK_TEXT};
}}
QToolButton:hover {{
    background: {_DK_BG_ALT};
    border-color: {_DK_BORDER};
}}
QToolButton:pressed {{
    background: {_DK_BORDER};
}}
QToolButton:disabled {{
    color: #606070;
}}
QPushButton {{
    background-color: {_DK_BG_RAISE};
    border: 1px solid {_DK_BORDER};
    border-radius: 4px;
    padding: 3px 10px;
    color: {_DK_TEXT};
}}
QPushButton:hover {{
    background-color: {_DK_BG_ALT};
    border-color: {_DK_ACCENT};
}}
QPushButton:pressed {{
    background-color: {_DK_BORDER};
}}
QPushButton:checked {{
    background-color: {_DK_ACCENT};
    border-color: {_DK_ACCENT};
    color: #ffffff;
}}
QPushButton:disabled {{
    color: #606070;
    border-color: {_DK_BORDER};
}}
QLineEdit {{
    background-color: {_DK_BG_ALT};
    border: 1px solid {_DK_BORDER};
    border-radius: 4px;
    padding: 2px 6px;
    color: {_DK_TEXT};
    selection-background-color: {_DK_ACCENT};
}}
QLineEdit:focus {{
    border-color: {_DK_ACCENT};
}}
QTableView {{
    gridline-color: {_DK_BORDER};
    background-color: {_DK_BG_ALT};
    alternate-background-color: {_DK_BG_RAISE};
    border: 1px solid {_DK_BORDER};
    selection-background-color: {_DK_ACCENT};
    selection-color: #ffffff;
}}
QTableView::item:selected {{
    background-color: {_DK_ACCENT};
    color: #ffffff;
}}
QHeaderView::section {{
    background-color: {_DK_BG_RAISE};
    color: {_DK_TEXT};
    border: none;
    border-right: 1px solid {_DK_BORDER};
    border-bottom: 1px solid {_DK_BORDER};
    padding: 3px 4px;
}}
QHeaderView::section:checked {{
    background-color: {_DK_BG_ALT};
}}
QPlainTextEdit {{
    background-color: {_DK_BG_ALT};
    color: {_DK_TEXT};
    border: 1px solid {_DK_BORDER};
    border-radius: 4px;
    selection-background-color: {_DK_ACCENT};
}}
QPlainTextEdit#logPane {{
    background-color: #000000;
    color: #f0f0f0;
    border: 1px solid {_DK_BORDER};
    border-radius: 0px;
    font-family: Consolas, "Courier New", monospace;
}}
QScrollBar:vertical {{
    background: {_DK_BG_ALT};
    width: 10px;
    border: none;
}}
QScrollBar::handle:vertical {{
    background: {_DK_BORDER};
    border-radius: 5px;
    min-height: 20px;
}}
QScrollBar::handle:vertical:hover {{
    background: {_DK_TEXT_DIM};
}}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
    height: 0px;
}}
QScrollBar:horizontal {{
    background: {_DK_BG_ALT};
    height: 10px;
    border: none;
}}
QScrollBar::handle:horizontal {{
    background: {_DK_BORDER};
    border-radius: 5px;
    min-width: 20px;
}}
QScrollBar::handle:horizontal:hover {{
    background: {_DK_TEXT_DIM};
}}
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{
    width: 0px;
}}
QStatusBar {{
    background-color: {_DK_BG_RAISE};
    color: {_DK_TEXT_DIM};
    border-top: 1px solid {_DK_BORDER};
}}
QMenu {{
    background-color: {_DK_BG_RAISE};
    color: {_DK_TEXT};
    border: 1px solid {_DK_BORDER};
}}
QMenu::item:selected {{
    background-color: {_DK_ACCENT};
    color: #ffffff;
}}
QMenu::separator {{
    height: 1px;
    background: {_DK_BORDER};
    margin: 2px 4px;
}}
QComboBox {{
    background-color: {_DK_BG_ALT};
    border: 1px solid {_DK_BORDER};
    border-radius: 4px;
    padding: 2px 6px;
    color: {_DK_TEXT};
    selection-background-color: {_DK_ACCENT};
}}
QComboBox QAbstractItemView {{
    background-color: {_DK_BG_RAISE};
    color: {_DK_TEXT};
    border: 1px solid {_DK_BORDER};
    selection-background-color: {_DK_ACCENT};
    selection-color: #ffffff;
}}
QCheckBox {{
    color: {_DK_TEXT};
    spacing: 6px;
}}
QLabel {{
    color: {_DK_TEXT};
}}
QDialogButtonBox QPushButton {{
    min-width: 72px;
}}
QToolTip {{
    background-color: {_DK_BG_RAISE};
    color: {_DK_TEXT};
    border: 1px solid {_DK_BORDER};
    padding: 3px 6px;
}}
QSplitter::handle {{
    background: {_DK_BORDER};
}}
"""
    app.setStyleSheet(ss)


_FLAG_ICON: "QIcon | None" = None
_UNFLAG_ICON: "QIcon | None" = None
_NEXUS_ICON: "QIcon | None" = None
_GEAR_ICON: "QIcon | None" = None
_GEAR_ICON_DIM: "QIcon | None" = None
_FOLDER_ICON: "QIcon | None" = None
_VORTEX_ICON: "QIcon | None" = None
_VORTEX_ICON_DIM: "QIcon | None" = None


def _make_icons():
    """Build all QIcons. Must be called after QApplication is created."""
    import math
    global _FLAG_ICON, _UNFLAG_ICON, _NEXUS_ICON, _GEAR_ICON, _GEAR_ICON_DIM, \
           _FOLDER_ICON, _VORTEX_ICON, _VORTEX_ICON_DIM

    # -- flag icons ----------------------------------------------------------
    def _draw_flag(flagged: bool) -> QIcon:
        px = QPixmap(16, 16)
        px.fill(Qt.transparent)
        p = QPainter(px)
        p.setRenderHint(QPainter.Antialiasing)
        if not flagged:
            p.setOpacity(0.3)
        p.setPen(QPen(QColor(_DK_TEXT_DIM), 1.5))
        p.drawLine(3, 2, 3, 14)
        tri = QPainterPath()
        tri.moveTo(3.0, 2.0)
        tri.lineTo(13.0, 5.0)
        tri.lineTo(3.0, 8.0)
        tri.closeSubpath()
        p.setPen(Qt.NoPen)
        p.fillPath(tri, QColor("#e74c3c") if flagged else QColor("#5a5a6a"))
        p.end()
        return QIcon(px)

    _FLAG_ICON = _draw_flag(True)
    _UNFLAG_ICON = _draw_flag(False)

    # -- nexus icon (SVG) ----------------------------------------------------
    _NEXUS_ICON = _load_svg_icon(os.path.join(REPO_ROOT, "nexus.svg"), 18)

    # -- gear icons (drawn) --------------------------------------------------
    def _draw_gear(dim: bool) -> QIcon:
        fill_color = QColor("#c0c0d0") if dim else QColor("#5a5a6a")
        px = QPixmap(18, 18)
        px.fill(Qt.transparent)
        p = QPainter(px)
        p.setRenderHint(QPainter.Antialiasing)
        cx, cy = 9.0, 9.0
        r_out, r_in, r_hole = 8.0, 5.5, 2.8
        n, tooth_frac = 8, 0.35
        half = math.pi * tooth_frac / n
        pts = []
        for i in range(n):
            ca = math.tau * i / n
            pts += [
                QPointF(cx + r_in  * math.cos(ca - half), cy + r_in  * math.sin(ca - half)),
                QPointF(cx + r_out * math.cos(ca - half), cy + r_out * math.sin(ca - half)),
                QPointF(cx + r_out * math.cos(ca + half), cy + r_out * math.sin(ca + half)),
                QPointF(cx + r_in  * math.cos(ca + half), cy + r_in  * math.sin(ca + half)),
            ]
        gear_path = QPainterPath()
        gear_path.moveTo(pts[0])
        for pt in pts[1:]:
            gear_path.lineTo(pt)
        gear_path.closeSubpath()
        hole_path = QPainterPath()
        hole_path.addEllipse(QPointF(cx, cy), r_hole, r_hole)
        p.setPen(Qt.NoPen)
        p.fillPath(gear_path.subtracted(hole_path), fill_color)
        p.end()
        return QIcon(px)

    _GEAR_ICON = _draw_gear(True)
    _GEAR_ICON_DIM = _draw_gear(False)

    # -- folder icon (Qt standard) -------------------------------------------
    from PySide6.QtWidgets import QApplication, QStyle
    _FOLDER_ICON = QApplication.style().standardIcon(QStyle.SP_DirIcon)

    # -- vortex icon (PNG + dim variant) -------------------------------------
    vortex_full = _load_icon(os.path.join(REPO_ROOT, "vortex.png"), 18, 18)
    _VORTEX_ICON = vortex_full
    if vortex_full is not None:
        src_px = vortex_full.pixmap(18, 18)
        dim_px = QPixmap(src_px.size())
        dim_px.fill(Qt.transparent)
        p = QPainter(dim_px)
        p.setOpacity(0.35)
        p.drawPixmap(0, 0, src_px)
        p.end()
        _VORTEX_ICON_DIM = QIcon(dim_px)
    else:
        _VORTEX_ICON_DIM = None


# == Data model ================================================================

COL_CHECK, COL_FLAG, COL_ICON, COL_GAME_ID, COL_NAME, COL_VERSION, COL_DATE, COL_ENGINE, \
    COL_STORES, COL_END, COL_DL, COL_NEXUS_PUB, \
    COL_COVER, COL_TITLE, COL_BANNER = range(15)
HEADERS = ("", "Flag", "Icon", "Game ID", "Name", "Ver", "Updated", "Engine", "Stores", "End", "DL", "Pub", "Cover", "Title", "Banner")
_THUMBNAIL_COLS = frozenset({COL_ICON, COL_COVER, COL_TITLE, COL_BANNER})
_IS_GROUP_HEADER_ROLE = Qt.UserRole + 10

_ICON_CACHE_MAX = 512
_icon_cache: "collections.OrderedDict[tuple[str, float], QIcon | None]" = collections.OrderedDict()


def _load_icon_cached(path: str, max_w: int, max_h: int) -> "QIcon | None":
    try:
        mtime = os.path.getmtime(path)
    except OSError:
        return None
    key = (path, mtime)
    if key in _icon_cache:
        _icon_cache.move_to_end(key)
        return _icon_cache[key]
    icon = _load_icon(path, max_w, max_h)
    _icon_cache[key] = icon
    if len(_icon_cache) > _ICON_CACHE_MAX:
        _icon_cache.popitem(last=False)
    return icon


class GameRow:
    __slots__ = (
        "game_id", "name", "version", "date", "engine", "stores", "folder",
        "icon", "icon_path", "cover", "cover_path",
        "title", "title_path", "banner", "banner_path",
        "extension_url",
        "endorsements", "unique_downloads", "nexus_published", "stats_fetched_at",
        "flagged", "note",
        "has_downloader", "has_load_order",
    )

    def __init__(self, game_id, name, version, date, engine, stores, folder,
                 icon, icon_path, cover, cover_path,
                 title, title_path, banner, banner_path,
                 extension_url,
                 endorsements, unique_downloads, nexus_published, stats_fetched_at,
                 flagged, note, has_downloader, has_load_order):
        self.game_id = game_id
        self.name = name or ""
        self.version = version or ""
        self.date = date or ""
        self.engine = engine or ""
        self.stores = stores or ""
        self.folder = folder
        self.icon = icon
        self.icon_path = icon_path
        self.cover = cover
        self.cover_path = cover_path
        self.title = title
        self.title_path = title_path
        self.banner = banner
        self.banner_path = banner_path
        self.extension_url = extension_url
        self.endorsements = endorsements
        self.unique_downloads = unique_downloads
        self.nexus_published = nexus_published
        self.stats_fetched_at = stats_fetched_at
        self.flagged = flagged
        self.note = note
        self.has_downloader = has_downloader
        self.has_load_order = has_load_order


class GameModel(QAbstractTableModel):
    def __init__(self):
        super().__init__()
        self._rows: list[GameRow] = []
        self._checked_ids: set[str] = set()

    def _load_rows(self) -> list:
        """Load all row data from disk. Must NOT create QPixmap/QIcon objects -- safe to call
        from a background thread. Call _attach_icons(rows) on the UI thread afterward.

        Per-folder index.js/info.json/CHANGELOG parsing is cached in ROW_CACHE_PATH keyed by
        folder name + those files' mtimes, so unchanged extensions skip the read+regex on
        later launches (the dominant startup cost). Image existence and Nexus stats are read
        live -- they change independently of the cached source files."""
        flags = _load_flags()
        stats = _load_stats()
        cache = _load_row_cache()
        new_cache: dict = {}
        rows = []
        for entry in sorted(os.listdir(REPO_ROOT)):
            folder = os.path.join(REPO_ROOT, entry)
            if not entry.startswith(vu.GAME_PREFIX) or not os.path.isdir(folder):
                continue
            mtimes = [
                _safe_mtime(os.path.join(folder, "index.js")),
                _safe_mtime(os.path.join(folder, "info.json")),
                _safe_mtime(os.path.join(folder, "CHANGELOG.md")),
            ]
            cached = cache.get(entry)
            if cached and cached.get("mtimes") == mtimes and cached.get("game_id"):
                game_id       = cached["game_id"]
                name          = cached["name"]
                version       = cached["version"]
                date          = cached["date"]
                engine        = cached["engine"]
                stores        = cached["stores"]
                extension_url = cached["extension_url"]
                load_order    = cached["load_order"]
            else:
                src = vu.read_index_js(folder)
                if not src:
                    continue
                game_id = vu.extract_game_id(src)
                if not game_id:
                    continue
                info = vu.read_info_json(folder) or {}
                version = info.get("version", "")
                _v, date = vu.parse_changelog_latest(folder)
                name = vu.extract_game_name(src) or game_id
                engine = vu.detect_engine(src)
                stores = vu.detect_stores(src)
                extension_url = vu.extract_extension_url(src)
                load_order = vu.is_load_order_game(src)
            new_cache[entry] = {
                "game_id": game_id, "name": name, "version": version, "date": date,
                "engine": engine, "stores": stores, "extension_url": extension_url,
                "load_order": load_order,
                "mtimes": mtimes,
            }
            # downloader modules are separate files -- check live, independent of the
            # index.js parse cache (same rule as image existence)
            has_downloader = (vu.has_downloader_js(folder)
                              or vu.has_gamebanana_downloader_js(folder)
                              or vu.has_moddb_downloader_js(folder))

            icon_path = os.path.join(folder, "exec.png")
            cover_path = os.path.join(folder, f"{game_id}.jpg")
            title_path = os.path.join(vu.TITLE_IMAGES_DIR, f"{game_id}_title.jpg")
            banner_path = os.path.join(vu.BANNER_IMAGES_DIR, f"{game_id}_banner.jpg")

            s = stats.get(game_id) or {}
            endorsements = s.get("endorsements") if not s.get("error") else None
            unique_downloads = s.get("unique_downloads") if not s.get("error") else None
            stats_fetched_at = s.get("fetched_at")
            _ts = s.get("created_timestamp")
            nexus_published = datetime.fromtimestamp(_ts).strftime("%Y-%m-%d") if _ts else None

            fd = flags.get(game_id, {})
            rows.append(GameRow(
                game_id, name, version, date, engine, stores, folder,
                None, icon_path if os.path.isfile(icon_path) else None,
                None, cover_path if os.path.isfile(cover_path) else None,
                None, title_path if os.path.isfile(title_path) else None,
                None, banner_path if os.path.isfile(banner_path) else None,
                extension_url,
                endorsements, unique_downloads, nexus_published, stats_fetched_at,
                fd.get("flagged", False), fd.get("note", ""),
                has_downloader, load_order,
            ))
        _save_row_cache(new_cache)
        return rows

    @staticmethod
    def _attach_icons(rows: list) -> None:
        """Build QIcon objects for all rows. Must be called on the UI thread -- Qt forbids
        constructing QPixmap outside the main thread."""
        for row in rows:
            if row.icon_path:
                row.icon = _load_icon_cached(row.icon_path, 22, 20)
            if row.cover_path:
                row.cover = _load_icon_cached(row.cover_path, 40, 20)
            if row.title_path:
                row.title = _load_icon_cached(row.title_path, 40, 20)
            if row.banner_path:
                row.banner = _load_icon_cached(row.banner_path, 40, 20)

    def apply_rows(self, rows: list):
        self.beginResetModel()
        self._rows = rows
        self.endResetModel()

    def rowCount(self, parent=QModelIndex()):
        return 0 if parent.isValid() else len(self._rows)

    def columnCount(self, parent=QModelIndex()):
        return 0 if parent.isValid() else len(HEADERS)

    def data(self, index, role=Qt.DisplayRole):
        if not index.isValid():
            return None
        row = self._rows[index.row()]
        col = index.column()

        if role == Qt.CheckStateRole:
            if col == COL_CHECK:
                return Qt.Checked if row.game_id in self._checked_ids else Qt.Unchecked
            return None

        if role == Qt.DecorationRole:
            if col == COL_FLAG:   return _FLAG_ICON if row.flagged else _UNFLAG_ICON
            if col == COL_ICON:   return row.icon
            if col == COL_COVER:  return row.cover
            if col == COL_TITLE:  return row.title
            if col == COL_BANNER: return row.banner
            return None

        if role == Qt.ToolTipRole:
            if col == COL_FLAG:
                return row.note if row.note else "Click to flag / add note"
            if col in (COL_END, COL_DL, COL_NEXUS_PUB):
                if row.stats_fetched_at:
                    ts = datetime.fromtimestamp(row.stats_fetched_at).strftime("%Y-%m-%d %H:%M")
                    return f"Last fetched: {ts}"
                return "Stats not yet fetched -- run Fetch Nexus Stats"
            return None

        if role == Qt.DisplayRole:
            if col in (COL_CHECK, COL_FLAG) or col in _THUMBNAIL_COLS:
                return ""
            if col == COL_END:
                return "" if row.endorsements is None else f"{row.endorsements:,}"
            if col == COL_DL:
                return "" if row.unique_downloads is None else f"{row.unique_downloads:,}"
            if col == COL_NEXUS_PUB:
                return row.nexus_published or ""
            return {
                COL_GAME_ID: row.game_id,
                COL_NAME:    row.name,
                COL_VERSION: row.version,
                COL_DATE:    row.date,
                COL_ENGINE:  row.engine,
                COL_STORES:  row.stores,
            }.get(col)

        if role == Qt.TextAlignmentRole:
            if col in (COL_END, COL_DL):
                return int(Qt.AlignRight | Qt.AlignVCenter)
            return None

        if role == Qt.UserRole:
            return row

        if role == Qt.UserRole + 1:
            if col == COL_VERSION:
                # int tuple so 0.10.0 sorts after 0.2.0 (string compare would not)
                try:
                    return tuple(int(x) for x in row.version.split("."))
                except ValueError:
                    return (-1, -1, -1)
            if col == COL_END:
                return row.endorsements if row.endorsements is not None else -1
            if col == COL_DL:
                return row.unique_downloads if row.unique_downloads is not None else -1
            if col == COL_NEXUS_PUB:
                if row.nexus_published:
                    try:
                        return datetime.strptime(row.nexus_published, "%Y-%m-%d").timestamp()
                    except ValueError:
                        return float('inf')
                return float('inf')
            if col in (COL_ICON, COL_COVER, COL_TITLE, COL_BANNER):
                p = {COL_ICON: row.icon_path, COL_COVER: row.cover_path,
                     COL_TITLE: row.title_path, COL_BANNER: row.banner_path}[col]
                try:
                    return os.path.getmtime(p) if p else -1.0
                except OSError:
                    return -1.0
            return None

        return None

    def headerData(self, section, orientation, role=Qt.DisplayRole):
        if orientation == Qt.Horizontal and role == Qt.DisplayRole:
            return HEADERS[section]
        return None

    def clear_checked(self):
        if not self._checked_ids:
            return
        self._checked_ids.clear()
        if self._rows:
            self.dataChanged.emit(
                self.index(0, COL_CHECK),
                self.index(len(self._rows) - 1, COL_CHECK),
                [Qt.CheckStateRole],
            )


class _RefreshWorker(QThread):
    done = Signal(list)

    def __init__(self, model, parent=None):
        super().__init__(parent)
        self._model = model

    def run(self):
        self.done.emit(self._model._load_rows())


class GameFilterModel(QSortFilterProxyModel):
    def __init__(self):
        super().__init__()
        self.setFilterCaseSensitivity(Qt.CaseInsensitive)
        self.setSortCaseSensitivity(Qt.CaseInsensitive)
        self._text = ""
        self._grouping = False
        self._flagged_only = False
        self._categories: set[str] = set()

    def set_text(self, text: str):
        self._text = text.strip().lower()
        self.invalidate()

    def set_flagged_only(self, enabled: bool):
        if enabled == self._flagged_only:
            return
        self._flagged_only = enabled
        self.invalidate()

    def set_categories(self, categories: set):
        """Restrict rows to the given category values (empty set = all rows).

        Values: "engine:<label>" (multiple engines OR'd together), "downloader",
        "loadorder" (each AND'd on top of the engine match)."""
        categories = set(categories)
        if categories == self._categories:
            return
        self._categories = categories
        self.invalidate()

    def set_grouping(self, enabled: bool):
        if enabled == self._grouping:
            return
        self._grouping = enabled
        self.invalidate()

    def filterAcceptsRow(self, source_row, source_parent):
        row = self.sourceModel()._rows[source_row]
        if row.game_id in self.sourceModel()._checked_ids:
            return True  # checked rows stay pinned through every filter
        if self._flagged_only and not row.flagged:
            return False
        engines = {c[7:] for c in self._categories if c.startswith("engine:")}
        if engines and row.engine not in engines:
            return False
        if "downloader" in self._categories and not row.has_downloader:
            return False
        if "loadorder" in self._categories and not row.has_load_order:
            return False
        if not self._text:
            return True
        return (self._text in row.game_id.lower()
                or self._text in row.name.lower()
                or self._text in row.engine.lower()
                or self._text in row.note.lower())

    def lessThan(self, left, right):
        l_row = self.sourceModel()._rows[left.row()]
        r_row = self.sourceModel()._rows[right.row()]
        if self._grouping and l_row.engine != r_row.engine:
            return l_row.engine < r_row.engine
        if left.column() in (COL_VERSION, COL_END, COL_DL, COL_NEXUS_PUB, COL_ICON, COL_COVER, COL_TITLE, COL_BANNER):
            src = self.sourceModel()
            lv = src.data(left,  Qt.UserRole + 1)
            rv = src.data(right, Qt.UserRole + 1)
            lv = lv if lv is not None else -1
            rv = rv if rv is not None else -1
            return lv < rv
        if left.column() == COL_FLAG:
            if l_row.flagged != r_row.flagged:
                return l_row.flagged  # flagged rows sort first in ascending order
        return super().lessThan(left, right)


# == Group proxy ===============================================================

class GroupProxy(QAbstractProxyModel):
    """Wraps GameFilterModel; inserts read-only engine group header rows when enabled."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._grouping = False
        self._map: list[tuple[bool, int, str]] = []
        self._src_to_proxy: dict[int, int] = {}

    def setSourceModel(self, model):
        old = self.sourceModel()
        if old is not None:
            old.modelReset.disconnect(self._rebuild)
            old.layoutChanged.disconnect(self._rebuild)
            old.dataChanged.disconnect(self._on_data_changed)
            old.rowsRemoved.disconnect(self._rebuild)
            old.rowsInserted.disconnect(self._rebuild)
        super().setSourceModel(model)
        if model is not None:
            model.modelReset.connect(self._rebuild)
            model.layoutChanged.connect(self._rebuild)
            model.dataChanged.connect(self._on_data_changed)
            model.rowsRemoved.connect(self._rebuild)
            model.rowsInserted.connect(self._rebuild)
            self._rebuild()

    def set_grouping(self, enabled: bool):
        if enabled == self._grouping:
            return
        self._grouping = enabled
        src = self.sourceModel()
        if src is not None:
            src.set_grouping(enabled)
        # _rebuild fires automatically via layoutChanged from src.invalidate()

    def _rebuild(self):
        self.beginResetModel()
        src = self.sourceModel()
        if src is None:
            self._map = []
            self._src_to_proxy = {}
            self.endResetModel()
            return
        n = src.rowCount()
        if not self._grouping:
            self._map = [(False, i, "") for i in range(n)]
            self._src_to_proxy = {i: i for i in range(n)}
        else:
            result = []
            cache: dict[int, int] = {}
            cur_engine = None
            for i in range(n):
                engine = src.data(src.index(i, COL_ENGINE)) or ""
                if engine != cur_engine:
                    cur_engine = engine
                    result.append((True, -1, engine))
                cache[i] = len(result)
                result.append((False, i, engine))
            self._map = result
            self._src_to_proxy = cache
        self.endResetModel()

    def _on_data_changed(self, top_left, bottom_right, roles):
        proxy_tl = self.mapFromSource(top_left)
        proxy_br = self.mapFromSource(bottom_right)
        if proxy_tl.isValid() and proxy_br.isValid():
            self.dataChanged.emit(proxy_tl, proxy_br, roles)

    def rowCount(self, parent=QModelIndex()):
        return 0 if parent.isValid() else len(self._map)

    def columnCount(self, parent=QModelIndex()):
        src = self.sourceModel()
        return (src.columnCount() if src else 0) if not parent.isValid() else 0

    def index(self, row, col, parent=QModelIndex()):
        if parent.isValid():
            return QModelIndex()
        if row < 0 or row >= len(self._map):
            return QModelIndex()
        return self.createIndex(row, col)

    def parent(self, index=QModelIndex()):
        return QModelIndex()

    def mapToSource(self, proxy_index):
        if not proxy_index.isValid():
            return QModelIndex()
        r = proxy_index.row()
        if r < 0 or r >= len(self._map):
            return QModelIndex()
        is_header, src_row, _ = self._map[r]
        if is_header:
            return QModelIndex()
        src = self.sourceModel()
        return src.index(src_row, proxy_index.column())

    def mapFromSource(self, source_index):
        if not source_index.isValid():
            return QModelIndex()
        proxy_row = self._src_to_proxy.get(source_index.row(), -1)
        if proxy_row < 0:
            return QModelIndex()
        return self.createIndex(proxy_row, source_index.column())

    def data(self, index, role=Qt.DisplayRole):
        if not index.isValid():
            return None
        r = index.row()
        if r < 0 or r >= len(self._map):
            return None
        is_header, _, engine = self._map[r]
        if role == _IS_GROUP_HEADER_ROLE:
            return is_header
        if is_header:
            if role == Qt.DisplayRole:
                return engine if index.column() == 0 else ""
            if role == Qt.BackgroundRole:
                return QColor(_DK_BG_RAISE)
            if role == Qt.ForegroundRole:
                return QColor(_DK_ACCENT)
            if role == Qt.FontRole:
                f = QFont()
                f.setBold(True)
                return f
            return None
        return super().data(index, role)

    def flags(self, index):
        if not index.isValid():
            return Qt.NoItemFlags
        r = index.row()
        if r < 0 or r >= len(self._map):
            return Qt.NoItemFlags
        if self._map[r][0]:
            return Qt.ItemIsEnabled
        return super().flags(index)

    def headerData(self, section, orientation, role=Qt.DisplayRole):
        src = self.sourceModel()
        return src.headerData(section, orientation, role) if src else None

    def sort(self, column: int, order=Qt.AscendingOrder):
        src = self.sourceModel()
        if src is not None:
            src.sort(column, order)

    def is_header_row(self, proxy_row: int) -> bool:
        if 0 <= proxy_row < len(self._map):
            return self._map[proxy_row][0]
        return False


# == Check combo box ===========================================================

class CheckComboBox(QComboBox):
    """Combo box whose dropdown items are checkboxes; the popup stays open while
    toggling so several filters can be picked in one visit.

    The (read-only) line edit shows a summary: the placeholder text when nothing
    is checked, else the checked labels comma-joined. Item values live in
    Qt.UserRole -- read them via checked_values() / restore via
    set_checked_values(). `changed` fires once per user toggle;
    set_checked_values() is silent so callers can restore state without
    triggering slots."""

    changed = Signal()

    def __init__(self, placeholder: str = "All"):
        super().__init__()
        self._placeholder = placeholder
        self.setEditable(True)
        self.setSizeAdjustPolicy(QComboBox.AdjustToContents)
        self.setInsertPolicy(QComboBox.NoInsert)
        self.lineEdit().setReadOnly(True)
        self.lineEdit().installEventFilter(self)   # click on the text opens the popup
        self.view().viewport().installEventFilter(self)
        self.model().dataChanged.connect(self._on_data_changed)
        self._update_text()

    def add_check_item(self, label: str, value: str):
        item = QStandardItem(label)
        item.setData(value, Qt.UserRole)
        item.setFlags(Qt.ItemIsEnabled | Qt.ItemIsUserCheckable)
        # set the check state BEFORE appendRow so no dataChanged fires during builds
        item.setData(Qt.Unchecked, Qt.CheckStateRole)
        self.model().appendRow(item)

    def eventFilter(self, obj, event):
        if obj is self.view().viewport() and event.type() == QEvent.MouseButtonRelease:
            # toggle the clicked item and swallow the event so the popup stays open
            idx = self.view().indexAt(event.position().toPoint())
            item = self.model().itemFromIndex(idx)
            if item is not None and item.isCheckable():
                item.setCheckState(
                    Qt.Unchecked if item.checkState() == Qt.Checked else Qt.Checked)
            return True
        if obj is self.lineEdit() and event.type() == QEvent.MouseButtonPress:
            self.showPopup()
            return True
        return super().eventFilter(obj, event)

    def wheelEvent(self, event):
        event.ignore()   # scrolling must not change the current index / line edit

    def showPopup(self):
        # widen the popup to the longest label: column hint + checkbox indicator
        # + scrollbar, so labels never clip even when the closed combo is narrow
        view = self.view()
        width = (view.sizeHintForColumn(0)
                 + view.verticalScrollBar().sizeHint().width() + 32)
        view.setMinimumWidth(max(width, self.width()))
        super().showPopup()

    def checked_values(self) -> list:
        values = []
        model = self.model()
        for i in range(model.rowCount()):
            item = model.item(i)
            if item is not None and item.checkState() == Qt.Checked:
                values.append(item.data(Qt.UserRole))
        return values

    def set_checked_values(self, values):
        """Check exactly the items whose value is in `values`; unknown values are
        dropped silently. Does not emit `changed`."""
        wanted = set(values or [])
        prev = self.signalsBlocked()
        self.blockSignals(True)
        model = self.model()
        for i in range(model.rowCount()):
            item = model.item(i)
            if item is not None and item.isCheckable():
                item.setCheckState(
                    Qt.Checked if item.data(Qt.UserRole) in wanted else Qt.Unchecked)
        self.blockSignals(prev)
        self._update_text()

    def _on_data_changed(self, *_args):
        self._update_text()
        self.changed.emit()

    def _update_text(self):
        labels = []
        model = self.model()
        for i in range(model.rowCount()):
            item = model.item(i)
            if item is not None and item.checkState() == Qt.Checked:
                labels.append(item.text())
        self.lineEdit().setText(", ".join(labels) if labels else self._placeholder)


# == Script runner =============================================================

class ScriptRunner(QObject):
    log_signal = Signal(str)
    started_signal = Signal(str)     # description, emitted once per run() call
    progress_signal = Signal(int, int)  # (current 1-based, total), emitted per queued command
    finished_signal = Signal(int)    # exit code, emitted once when queue is done

    def __init__(self):
        super().__init__()
        self._process: QProcess | None = None
        self._queue: list[list[str]] = []
        self._desc = ""
        self._total = 0
        self._decoder = None
        self._finished_emitted = False

    def run(self, cmds: list[list[str]], desc: str = ""):
        self._queue = list(cmds)
        self._desc = desc
        self._total = len(self._queue)
        self._finished_emitted = False
        if self._queue:
            self.started_signal.emit(desc)
        self._run_next()

    def stop(self):
        self._queue.clear()
        if self._process and self._process.state() != QProcess.NotRunning:
            self._process.kill()

    def wait_for_finished(self, ms: int = 3000):
        if self._process is not None:
            self._process.waitForFinished(ms)

    @property
    def is_running(self) -> bool:
        return bool(self._process and self._process.state() != QProcess.NotRunning)

    def _emit_finished(self, code: int):
        """Emit finished_signal exactly once per run() call. kill() makes QProcess fire
        both errorOccurred(Crashed) and finished(), which would otherwise double-emit."""
        if self._finished_emitted:
            return
        self._finished_emitted = True
        self.finished_signal.emit(code)

    def _flush_decoder(self):
        if self._decoder is not None:
            tail = self._decoder.decode(b"", final=True)
            self._decoder = None
            if tail:
                self.log_signal.emit(tail)

    def _run_next(self):
        if not self._queue:
            self._emit_finished(0)
            return
        cmd = self._queue.pop(0)
        self.progress_signal.emit(self._total - len(self._queue), self._total)
        self.log_signal.emit(f"\n> {' '.join(cmd)}\n")
        p = QProcess()
        p.setWorkingDirectory(REPO_ROOT)
        p.setProcessChannelMode(QProcess.MergedChannels)
        env = QProcessEnvironment.systemEnvironment()
        env.insert("PYTHONIOENCODING", "utf-8")
        env.insert("PYTHONUTF8", "1")
        p.setProcessEnvironment(env)
        p.readyReadStandardOutput.connect(lambda: self._on_output(p))
        p.errorOccurred.connect(self._on_process_error)
        p.finished.connect(self._on_finished)
        self._process = p
        # incremental decoder: a multibyte UTF-8 char split across read chunks must
        # not decode as U+FFFD replacement characters
        self._decoder = codecs.getincrementaldecoder("utf-8")(errors="replace")
        p.start(cmd[0], cmd[1:])

    def _on_output(self, p: QProcess):
        data = bytes(p.readAllStandardOutput())
        text = (self._decoder.decode(data) if self._decoder is not None
                else data.decode("utf-8", errors="replace"))
        if text:
            self.log_signal.emit(text)

    def _on_process_error(self, err):
        msgs = {
            QProcess.ProcessError.FailedToStart: "Failed to start -- executable not found or no permission",
            QProcess.ProcessError.Crashed:       "Process crashed",
            QProcess.ProcessError.Timedout:      "Process timed out",
            QProcess.ProcessError.ReadError:     "Read error",
            QProcess.ProcessError.WriteError:    "Write error",
        }
        self._flush_decoder()
        self.log_signal.emit(f"\n[ERROR: {msgs.get(err, f'Process error {err}')}]\n")
        self._queue.clear()
        self._emit_finished(-1)

    def _on_finished(self, code, _status):
        self._flush_decoder()
        if code != 0:
            self.log_signal.emit(f"\n[exited with code {code}]\n")
            self._queue.clear()
            self._emit_finished(code)
        else:
            self._run_next()


# == Dialogs ===================================================================


class FlagDialog(QDialog):
    def __init__(self, game_id: str, flagged: bool, note: str, parent=None):
        super().__init__(parent)
        self.setWindowTitle(f"Flag: {game_id}")
        self.setMinimumWidth(350)
        layout = QVBoxLayout(self)

        self._flagged_cb = QCheckBox("Flagged")
        self._flagged_cb.setChecked(flagged)
        layout.addWidget(self._flagged_cb)

        layout.addWidget(QLabel("Note:"))
        self._note_edit = QPlainTextEdit()
        self._note_edit.setPlainText(note)
        self._note_edit.setMinimumHeight(80)
        layout.addWidget(self._note_edit)

        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

    @property
    def flagged(self) -> bool:
        return self._flagged_cb.isChecked()

    @property
    def note(self) -> str:
        return self._note_edit.toPlainText().strip()


class NewGameDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("New Game Extension")
        self.setMinimumWidth(420)
        layout = QFormLayout(self)

        self.template_combo = QComboBox()
        self.template_combo.addItems(vu.list_template_names())
        layout.addRow("Template:", self.template_combo)

        self.name_edit = QLineEdit()
        self.name_edit.setPlaceholderText("Game name or Steam App ID")
        layout.addRow("Game:", self.name_edit)

        self.force_cb = QCheckBox("--force (overwrite existing folder)")
        self.no_images_cb = QCheckBox("--no-images (skip art downloads)")
        self.refresh_images_cb = QCheckBox("--refresh-images (re-download all images for existing extension)")
        self.no_browser_cb = QCheckBox("--no-browser (skip opening browser tabs)")
        self.no_startfile_cb = QCheckBox("--no-startfile (skip opening images/index.js in editor)")
        self.dry_run_cb = QCheckBox("--dry-run (dry run, no writes)")
        layout.addRow("", self.force_cb)
        layout.addRow("", self.no_images_cb)
        layout.addRow("", self.refresh_images_cb)
        layout.addRow("", self.no_browser_cb)
        layout.addRow("", self.no_startfile_cb)
        layout.addRow("", self.dry_run_cb)

        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self._on_accept)
        buttons.rejected.connect(self.reject)
        layout.addRow(buttons)

    def _on_accept(self):
        if not self.name_edit.text().strip():
            QMessageBox.warning(self, "Input Required", "Enter a game name or Steam App ID.")
            return
        self.accept()

    def build_cmd(self) -> list[str]:
        cmd = [PYTHON, os.path.join(REPO_ROOT, "new_extension.py"),
               self.template_combo.currentText(), self.name_edit.text().strip()]
        if self.force_cb.isChecked():
            cmd.append("--force")
        if self.no_images_cb.isChecked():
            cmd.append("--no-images")
        if self.refresh_images_cb.isChecked():
            cmd.append("--refresh-images")
        if self.no_browser_cb.isChecked():
            cmd.append("--no-browser")
        if self.no_startfile_cb.isChecked():
            cmd.append("--no-startfile")
        if self.dry_run_cb.isChecked():
            cmd.append("--dry-run")
        return cmd


class PortTemplateDialog(QDialog):
    def __init__(self, game_ids: list[str], parent=None):
        super().__init__(parent)
        self.setWindowTitle("Port to Template")
        self.setMinimumWidth(350)
        layout = QFormLayout(self)

        ids_text = ", ".join(game_ids) if len(game_ids) <= 5 else f"{len(game_ids)} games"
        layout.addRow(QLabel(f"Games: {ids_text}"))

        self.template_combo = QComboBox()
        self.template_combo.addItems(vu.list_template_names())
        layout.addRow("Template:", self.template_combo)

        self.dry_run_cb = QCheckBox("--dry-run (dry run, no writes)")
        self.force_cb = QCheckBox("--force (overwrite .bak backup)")
        layout.addRow("", self.dry_run_cb)
        layout.addRow("", self.force_cb)

        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addRow(buttons)

    def build_cmds(self, game_ids: list[str]) -> list[list[str]]:
        template = self.template_combo.currentText()
        script = os.path.join(REPO_ROOT, "port_to_template.py")
        dry = self.dry_run_cb.isChecked()
        cmds = []
        for gid in game_ids:
            cmd = [PYTHON, script, gid, template, "--no-explained"]
            if dry:
                cmd.append("--dry-run")
            if self.force_cb.isChecked():
                cmd.append("--force")
            cmds.append(cmd)
        if not dry:
            cmds.append([NODE, os.path.join(REPO_ROOT, "generate_explained.js")] + game_ids)
        return cmds


# == Generic args dialog =======================================================

class ScriptArgsDialog(QDialog):
    """Popup for configuring optional CLI flags before running a script.

    flags:  [(flag_str, label, default_checked), ...]
    inputs: [(flag_str, label, placeholder), ...]  -- adds --flag value when non-empty
    """

    def __init__(self, title: str, game_ids: list[str],
                 flags: list[tuple] = (), inputs: list[tuple] = (),
                 parent=None):
        super().__init__(parent)
        self.setWindowTitle(title)
        self.setMinimumWidth(390)
        layout = QFormLayout(self)
        layout.setVerticalSpacing(6)

        if len(game_ids) <= 5:
            ids_text = ", ".join(game_ids)
        else:
            ids_text = f"{', '.join(game_ids[:5])}, ... ({len(game_ids)} games)"
        layout.addRow(QLabel("Selected:"), QLabel(ids_text))
        layout.addRow(QLabel(""))

        self._checkboxes: dict[str, QCheckBox] = {}
        for flag, label, default in flags:
            cb = QCheckBox(label)
            cb.setChecked(default)
            layout.addRow("", cb)
            self._checkboxes[flag] = cb

        self._line_edits: dict[str, QLineEdit] = {}
        for flag, label, placeholder in inputs:
            edit = QLineEdit()
            edit.setPlaceholderText(placeholder)
            layout.addRow(f"{label}:", edit)
            self._line_edits[flag] = edit

        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addRow(buttons)

    def extra_args(self) -> list[str]:
        args = []
        for flag, cb in self._checkboxes.items():
            if cb.isChecked():
                args.append(flag)
        for flag, edit in self._line_edits.items():
            val = edit.text().strip()
            if val:
                args.extend([flag, val])
        return args


class BumpTypeDialog(QDialog):
    """Radio-button popup for selecting major, minor, or manual version bump."""

    _SEMVER = vu.SEMVER_PATTERN

    def __init__(self, game_ids: list[str], parent=None):
        super().__init__(parent)
        self.setWindowTitle("Bump Version")
        self.setMinimumWidth(320)
        layout = QVBoxLayout(self)
        layout.setSpacing(8)

        if len(game_ids) <= 5:
            ids_text = ", ".join(game_ids)
        else:
            ids_text = f"{', '.join(game_ids[:5])}, ... ({len(game_ids)} games)"
        layout.addWidget(QLabel(f"Selected: {ids_text}"))

        self._major = QRadioButton("Major  (0.3.0 -> 0.4.0)")
        self._minor = QRadioButton("Minor  (0.3.0 -> 0.3.1)")
        self._manual = QRadioButton("Manual")
        self._major.setChecked(True)
        layout.addWidget(self._major)
        layout.addWidget(self._minor)

        manual_row = QHBoxLayout()
        manual_row.setContentsMargins(0, 0, 0, 0)
        manual_row.addWidget(self._manual)
        self._version_edit = QLineEdit()
        self._version_edit.setPlaceholderText("X.Y.Z")
        self._version_edit.setEnabled(False)
        manual_row.addWidget(self._version_edit)
        layout.addLayout(manual_row)

        self._manual.toggled.connect(self._version_edit.setEnabled)

        self._dry_run_cb = QCheckBox("--dry-run (dry run, no writes)")
        layout.addWidget(self._dry_run_cb)

        bb = QDialogButtonBox(QDialogButtonBox.Cancel)
        bb.addButton("Continue", QDialogButtonBox.AcceptRole)
        bb.accepted.connect(self._on_accept)
        bb.rejected.connect(self.reject)
        layout.addWidget(bb)

    def _on_accept(self):
        if self._manual.isChecked():
            ver = self._version_edit.text().strip()
            if not self._SEMVER.match(ver):
                QMessageBox.warning(
                    self, "Invalid Version",
                    f"'{ver}' is not valid semver.\nUse X.Y.Z format (e.g. 1.2.3).",
                )
                return
        self.accept()

    def bump_args(self) -> list[str]:
        if self._major.isChecked():
            args = ["--major"]
        elif self._minor.isChecked():
            args = ["--minor"]
        else:
            args = ["--version", self._version_edit.text().strip()]
        if self._dry_run_cb.isChecked():
            args.append("--dry-run")
        return args


# == Keyboard shortcuts ========================================================

# Single source of truth for shortcuts: MainWindow builds QShortcuts from this
# list and HelpDialog renders it, so bindings and help text cannot drift apart.
# (key sequences, description, MainWindow slot name or None if bound elsewhere,
#  widget attr for a WidgetShortcut context or None for window-wide)
SHORTCUT_DEFS = [
    (("Ctrl+F",),      "Focus filter",                  "_focus_filter",          None),
    (("Ctrl+R", "F5"), "Refresh table",                 "_refresh_data",          None),
    (("Ctrl+N",),      "New game",                      "_on_new_game",           None),
    (("Ctrl+G",),      "Jump to game",                  "_on_jump_to_game",       None),
    (("Ctrl+L",),      "Focus log pane",                "_focus_log",             None),
    (("Ctrl+E",),      "Open in editor",                "_on_open_editor",        None),
    (("Space",),       "Toggle check on selected rows", "_toggle_check_selected", "_table"),
    (("F1",),          "Show this help",                "_on_help",               None),
    (("F2", "Delete"), "Flag selected game",            "_on_flag_shortcut",      None),
    (("Escape",),      "Clear filter",                  "_clear_filter",          None),
]


# == Help dialog ===============================================================

class HelpDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Keyboard Shortcuts")
        self.setMinimumWidth(380)
        layout = QVBoxLayout(self)
        text = "\n".join(f"{' / '.join(keys):<22}  {desc}" for keys, desc, _slot, _w in SHORTCUT_DEFS)
        view = QPlainTextEdit()
        view.setReadOnly(True)
        view.setFont(QFont("Consolas", 10))
        view.setPlainText(text)
        view.setMinimumHeight(180)
        layout.addWidget(view)
        buttons = QDialogButtonBox(QDialogButtonBox.Close)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)


# == Toolbar / context-menu actions ============================================

# Toolbar buttons and the table context menu are both generated from this list,
# so a single edit here updates both surfaces.
# (label, MainWindow slot name, separator before entry, enabled without selection)
ACTION_DEFS = [
    ("Bump Version",        "_on_bump_version",      False, False),
    ("Release",             "_on_release",           False, False),
    ("Deploy to Vortex",    "_on_deploy_to_vortex",  False, False),
    ("Launch in Vortex",    "_on_open_in_vortex",    False, False),
    ("Open Folder",         "_on_open_folder",       True,  False),
    ("Open in Editor",      "_on_open_editor",       False, False),
    ("Open Changelog",      "_on_open_changelog",    False, False),
    ("Open Game Page",      "_on_open_nexus",        True,  False),
    ("Open Extension Page", "_on_open_ext",          False, False),
    ("Port to Template...", "_on_port_to_template",  True,  False),
    ("Setup Test Folder",   "_on_setup_test",        False, False),
    ("Patch",               "_on_patch",             False, False),
    ("Categorize",          "_on_categorize",        False, False),
    ("Analyze Log",         "_on_analyze_log",       True,  True),
    ("Audit Scripts",       "_on_audit_scripts",     False, True),
    ("Fetch Icon",          "_on_fetch_icon",        True,  False),
    ("Fetch Cover",         "_on_fetch_cover",       False, False),
    ("Fetch Title",         "_on_fetch_title",       False, False),
    ("Fetch Banner",        "_on_fetch_banner",      False, False),
    ("Fetch Nexus Stats",   "_on_fetch_nexus_stats", False, False),
    ("View Images",         "_on_view_images",       True,  False),
]


# == Main window ===============================================================

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Vortex Extension Manager")
        self.resize(1300, 850)

        self._model = GameModel()
        self._filter_model = GameFilterModel()
        self._filter_model.setSourceModel(self._model)
        self._proxy = GroupProxy()
        self._proxy.setSourceModel(self._filter_model)
        self._prev_header_rows: set[int] = set()

        self._runner = ScriptRunner()
        self._runner.log_signal.connect(self._append_log)
        self._runner.started_signal.connect(self._on_run_started)
        self._runner.progress_signal.connect(self._on_run_progress)
        self._runner.finished_signal.connect(self._on_run_finished)
        self._run_desc = ""

        self._action_btns: dict[str, QAction] = {}
        self._global_action_labels: set[str] = set()  # repo-wide; enabled regardless of selection
        self._refresh_after_run = False
        self._refresh_worker: _RefreshWorker | None = None
        self._splitter: QSplitter | None = None
        # category filter restored from QSettings before the first refresh has
        # built the engine entries; applied by _rebuild_category_combo
        self._pending_category: list | None = None

        self._tray = gui_tray.TrayManager(
            self, app_name="Vortex Extension Manager",
            settings_org=SETTINGS_ORG, settings_app=SETTINGS_APP,
        )

        self._build_ui()
        self._refresh_data()
        self._restore_settings()

    # -- UI construction -------------------------------------------------------

    def _build_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        root_layout = QVBoxLayout(central)
        root_layout.setContentsMargins(6, 6, 6, 6)
        root_layout.setSpacing(4)

        # top bar: filter + refresh + new game
        top_bar = QHBoxLayout()
        top_bar.addWidget(QLabel("Filter:"))
        self._filter_edit = QLineEdit()
        self._filter_edit.setPlaceholderText("Game ID, name, engine, or note...")
        self._filter_edit.setClearButtonEnabled(True)
        self._filter_edit.textChanged.connect(self._filter_model.set_text)
        self._filter_edit.textChanged.connect(self._update_status_bar)
        top_bar.addWidget(self._filter_edit, stretch=1)
        self._refresh_btn = QPushButton("Refresh")
        self._refresh_btn.clicked.connect(self._refresh_data)
        top_bar.addWidget(self._refresh_btn)
        self._new_game_btn = QPushButton("New Game...")
        self._new_game_btn.clicked.connect(self._on_new_game)
        top_bar.addWidget(self._new_game_btn)
        self._group_btn = QPushButton("Group by Engine")
        self._group_btn.setCheckable(True)
        self._group_btn.toggled.connect(self._on_group_toggled)
        top_bar.addWidget(self._group_btn)
        self._flagged_btn = QPushButton("Flagged Only")
        self._flagged_btn.setCheckable(True)
        self._flagged_btn.toggled.connect(self._on_flagged_only_toggled)
        top_bar.addWidget(self._flagged_btn)
        self._category_combo = CheckComboBox("All Categories")
        # engine entries are injected after each refresh (_rebuild_category_combo)
        self._category_combo.add_check_item("Downloader", "downloader")
        self._category_combo.add_check_item("Load Order", "loadorder")
        self._category_combo.setToolTip(
            "Check any number of filters; the popup stays open while toggling.\n"
            "Engines: detected from index.js -- checking several shows games of any of them.\n"
            "Downloader: bundles a downloader module (downloader.js / gamebanana / moddb).\n"
            "Load Order: registers a load order (UE4/5 games excluded -- template standard).\n"
            "Downloader / Load Order each narrow the engine match further.")
        self._category_combo.changed.connect(self._on_category_changed)
        top_bar.addWidget(self._category_combo)
        self._clear_checks_btn = QPushButton("Clear Checks")
        self._clear_checks_btn.setEnabled(False)
        self._clear_checks_btn.clicked.connect(self._clear_checks)
        top_bar.addWidget(self._clear_checks_btn)
        root_layout.addLayout(top_bar)

        # script toolbar, built from ACTION_DEFS (shared with the context menu)
        toolbar = QToolBar()
        toolbar.setMovable(False)
        for label, slot_name, sep, global_action in ACTION_DEFS:
            if sep:
                toolbar.addSeparator()
            act = QAction(label, self)
            act.triggered.connect(getattr(self, slot_name))
            act.setEnabled(global_action)  # global actions start enabled; others need selection
            toolbar.addAction(act)
            self._action_btns[label] = act
            if global_action:
                self._global_action_labels.add(label)
        root_layout.addWidget(toolbar)

        # splitter: table on top, log pane on bottom
        splitter = QSplitter(Qt.Vertical)
        self._splitter = splitter
        root_layout.addWidget(splitter)

        # --- game table ---
        self._table = QTableView()
        self._table.setModel(self._proxy)
        self._table.setSortingEnabled(True)
        self._table.setSelectionBehavior(QTableView.SelectRows)
        self._table.setSelectionMode(QTableView.ExtendedSelection)
        self._table.setAlternatingRowColors(True)
        self._table.setIconSize(QSize(40, 20))
        self._table.verticalHeader().setDefaultSectionSize(22)

        hdr = self._table.horizontalHeader()
        hdr.setSectionResizeMode(COL_CHECK,   QHeaderView.Fixed)
        hdr.setSectionResizeMode(COL_FLAG,    QHeaderView.Fixed)
        hdr.setSectionResizeMode(COL_ICON,    QHeaderView.Fixed)
        hdr.setSectionResizeMode(COL_GAME_ID, QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_NAME,    QHeaderView.Interactive)
        hdr.setStretchLastSection(False)
        hdr.setSectionResizeMode(COL_VERSION, QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_DATE,    QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_ENGINE,  QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_STORES,  QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_END,     QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_DL,        QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_NEXUS_PUB, QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_COVER,   QHeaderView.Fixed)
        hdr.setSectionResizeMode(COL_TITLE,   QHeaderView.Fixed)
        hdr.setSectionResizeMode(COL_BANNER,  QHeaderView.Fixed)
        self._table.setColumnWidth(COL_CHECK,   20)
        self._table.setColumnWidth(COL_FLAG,    22)
        self._table.setColumnWidth(COL_ICON,    26)
        self._table.setColumnWidth(COL_NAME,    300)
        self._table.setColumnWidth(COL_GAME_ID, 200)
        self._table.setColumnWidth(COL_VERSION, 70)
        self._table.setColumnWidth(COL_DATE,    92)
        self._table.setColumnWidth(COL_ENGINE,  195)
        self._table.setColumnWidth(COL_STORES,  60)
        self._table.setColumnWidth(COL_END,     62)
        self._table.setColumnWidth(COL_DL,        80)
        self._table.setColumnWidth(COL_NEXUS_PUB, 92)
        self._table.setColumnWidth(COL_COVER,   42)
        self._table.setColumnWidth(COL_TITLE,   42)
        self._table.setColumnWidth(COL_BANNER,  42)
        self._table.sortByColumn(COL_GAME_ID, Qt.AscendingOrder)
        self._table.selectionModel().selectionChanged.connect(self._on_selection_changed)
        self._table.setContextMenuPolicy(Qt.CustomContextMenu)
        self._table.customContextMenuRequested.connect(self._on_context_menu)
        self._table.clicked.connect(self._on_table_cell_clicked)
        self._table.doubleClicked.connect(self._on_table_double_clicked)
        splitter.addWidget(self._table)
        self._proxy.modelReset.connect(self._apply_spans)
        self._model.dataChanged.connect(self._on_model_data_changed)

        # --- log pane ---
        self._log_pane = QPlainTextEdit()
        self._log_pane.setObjectName("logPane")
        self._log_pane.setReadOnly(True)
        self._log_pane.setFont(QFont("Consolas", 10))
        self._log_pane.setMaximumBlockCount(5000)

        self._stop_btn = QPushButton("Stop Running")
        self._stop_btn.setEnabled(False)
        self._stop_btn.clicked.connect(self._runner.stop)
        clear_btn = QPushButton("Clear Log")
        clear_btn.clicked.connect(self._log_pane.clear)
        export_btn = QPushButton("Export Log")
        export_btn.clicked.connect(self._on_export_log)

        log_btn_row = QHBoxLayout()
        log_btn_row.addWidget(clear_btn)
        log_btn_row.addWidget(export_btn)
        log_btn_row.addWidget(self._stop_btn)
        log_btn_row.addStretch()

        log_container = QWidget()
        log_layout = QVBoxLayout(log_container)
        log_layout.setContentsMargins(0, 2, 0, 0)
        log_layout.setSpacing(2)
        log_layout.addLayout(log_btn_row)
        log_layout.addWidget(self._log_pane)
        splitter.addWidget(log_container)

        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 1)

        # status bar
        self._status_label = QLabel()
        self.statusBar().addWidget(self._status_label)

        # keyboard shortcuts, built from SHORTCUT_DEFS after all widgets exist
        for keys, _desc, slot_name, widget_attr in SHORTCUT_DEFS:
            if not slot_name:
                continue
            slot = getattr(self, slot_name)
            parent = getattr(self, widget_attr) if widget_attr else self
            for key in keys:
                sc = QShortcut(QKeySequence(key), parent)
                if widget_attr:
                    sc.setContext(Qt.WidgetShortcut)
                sc.activated.connect(slot)

    def _restore_settings(self):
        settings = QSettings(SETTINGS_ORG, SETTINGS_APP)
        geo = settings.value("geometry")
        if geo:
            self.restoreGeometry(geo)
        sp = settings.value("splitter")
        if sp:
            self._splitter.restoreState(sp)
        th = settings.value("tableHeader")
        saved_cols = settings.value("tableHeaderColCount", 0, type=int)
        if th and saved_cols == len(HEADERS):
            self._table.horizontalHeader().restoreState(th)
        filter_text = settings.value("filterText", "")
        if filter_text:
            self._filter_edit.setText(filter_text)
        if settings.value("groupByEngine", False, type=bool):
            self._group_btn.setChecked(True)
        if settings.value("flaggedOnly", False, type=bool):
            self._flagged_btn.setChecked(True)
        raw_cat = settings.value("categoryFilter", [])
        if isinstance(raw_cat, str):   # legacy single-string value from the old QComboBox
            raw_cat = [raw_cat] if raw_cat else []
        elif raw_cat is None:
            raw_cat = []
        self._pending_category = [c for c in raw_cat if c]
        raw_checked = settings.value("checkedIds", [])
        if isinstance(raw_checked, str):
            raw_checked = [raw_checked]
        elif raw_checked is None:
            raw_checked = []
        self._model._checked_ids = set(raw_checked)

    def closeEvent(self, event):
        settings = QSettings(SETTINGS_ORG, SETTINGS_APP)
        settings.setValue("geometry", self.saveGeometry())
        settings.setValue("splitter", self._splitter.saveState())
        settings.setValue("tableHeader", self._table.horizontalHeader().saveState())
        settings.setValue("tableHeaderColCount", len(HEADERS))
        settings.setValue("filterText", self._filter_edit.text())
        settings.setValue("groupByEngine", self._group_btn.isChecked())
        settings.setValue("flaggedOnly", self._flagged_btn.isChecked())
        settings.setValue("categoryFilter", self._category_combo.checked_values())
        settings.setValue("checkedIds", list(self._model._checked_ids))
        if not self._tray.on_close(event):
            return  # hidden to tray; keep running (settings already saved)
        self._runner.stop()
        self._runner.wait_for_finished(3000)
        if self._refresh_worker is not None:
            self._refresh_worker.quit()
            self._refresh_worker.wait()
        super().closeEvent(event)

    def _apply_spans(self):
        nc = self._proxy.columnCount()
        for r in self._prev_header_rows:
            self._table.setSpan(r, 0, 1, 1)
        self._prev_header_rows = set()
        for r in range(self._proxy.rowCount()):
            if self._proxy.is_header_row(r):
                self._table.setSpan(r, 0, 1, nc)
                self._prev_header_rows.add(r)

    def _on_group_toggled(self, checked: bool):
        self._proxy.set_grouping(checked)

    def _on_flagged_only_toggled(self, checked: bool):
        self._filter_model.set_flagged_only(checked)

    def _on_category_changed(self):
        self._filter_model.set_categories(set(self._category_combo.checked_values()))
        self._update_status_bar()

    def _rebuild_category_combo(self, engines: list[str]):
        """Rebuild the category dropdown: engine entries from the loaded rows,
        then a separator, then the special categories. Preserves the current
        checked set (or the one restored from QSettings on first build)."""
        combo = self._category_combo
        want = (self._pending_category if self._pending_category is not None
                else combo.checked_values())
        self._pending_category = None
        combo.clear()
        for eng in engines:
            combo.add_check_item(eng, f"engine:{eng}")
        combo.insertSeparator(combo.count())
        combo.add_check_item("Downloader", "downloader")
        combo.add_check_item("Load Order", "loadorder")
        combo.set_checked_values(want)   # silent; stale engine values drop out
        self._filter_model.set_categories(set(combo.checked_values()))

    def _refresh_data(self):
        if self._refresh_worker is not None:
            return
        prev_ids = set(self._selected_ids())
        self._refresh_btn.setEnabled(False)
        QApplication.setOverrideCursor(Qt.WaitCursor)
        self._refresh_worker = _RefreshWorker(self._model, self)
        self._refresh_worker.done.connect(lambda rows: self._on_refresh_done(rows, prev_ids))
        self._refresh_worker.start()

    def _on_refresh_done(self, rows: list, prev_ids: set):
        self._model._attach_icons(rows)   # QPixmap must be built on the UI thread
        self._model.apply_rows(rows)
        # drop checked ids whose extension no longer exists on disk
        self._model._checked_ids &= {r.game_id for r in rows}
        self._rebuild_category_combo(sorted({r.engine for r in rows}))
        self._refresh_worker.deleteLater()
        self._refresh_worker = None
        QApplication.restoreOverrideCursor()
        if not self._runner.is_running:
            self._refresh_btn.setEnabled(True)
        if prev_ids:
            sel = self._table.selectionModel()
            sel.clearSelection()
            first = None
            for r in range(self._proxy.rowCount()):
                gid = self._proxy.data(self._proxy.index(r, COL_GAME_ID))
                if gid in prev_ids:
                    sel.select(
                        self._proxy.index(r, 0),
                        QItemSelectionModel.SelectionFlag.Select
                        | QItemSelectionModel.SelectionFlag.Rows,
                    )
                    if first is None:
                        first = self._proxy.index(r, 0)
            if first:
                self._table.scrollTo(first)
        self._update_status_bar()

    # -- Selection helpers -----------------------------------------------------

    def _selected_rows(self) -> list[GameRow]:
        if self._model._checked_ids:
            seen: set[str] = set()
            result: list[GameRow] = []
            for row in self._model._rows:
                if row.game_id in self._model._checked_ids and row.game_id not in seen:
                    seen.add(row.game_id)
                    result.append(row)
            return result
        sel = self._table.selectionModel().selectedRows()
        seen2: set[str] = set()
        result2: list[GameRow] = []
        for idx in sel:
            if self._proxy.is_header_row(idx.row()):
                continue
            filter_idx = self._proxy.mapToSource(idx)
            src_idx = self._filter_model.mapToSource(filter_idx)
            row = self._model._rows[src_idx.row()]
            if row.game_id not in seen2:
                seen2.add(row.game_id)
                result2.append(row)
        return result2

    def _selected_ids(self) -> list[str]:
        return [r.game_id for r in self._selected_rows()]

    def _require_selection(self) -> bool:
        if not self._selected_ids():
            QMessageBox.information(self, "No Selection", "Select one or more games first.")
            return False
        return True

    # -- Table interaction -----------------------------------------------------

    def _on_table_cell_clicked(self, proxy_index):
        if self._proxy.is_header_row(proxy_index.row()):
            return
        col = proxy_index.column()
        filter_idx = self._proxy.mapToSource(proxy_index)
        src_idx = self._filter_model.mapToSource(filter_idx)
        row = self._model._rows[src_idx.row()]

        if col == COL_CHECK:
            gid = row.game_id
            if gid in self._model._checked_ids:
                self._model._checked_ids.discard(gid)
            else:
                self._model._checked_ids.add(gid)
            check_cell = self._model.index(src_idx.row(), COL_CHECK)
            self._model.dataChanged.emit(check_cell, check_cell, [Qt.CheckStateRole])
            return

        if col == COL_FLAG:
            dlg = FlagDialog(row.game_id, row.flagged, row.note, self)
            if dlg.exec() == QDialog.Accepted:
                row.flagged = dlg.flagged
                row.note = dlg.note
                flag_cell = self._model.index(src_idx.row(), COL_FLAG)
                self._model.dataChanged.emit(
                    flag_cell, flag_cell, [Qt.DecorationRole, Qt.ToolTipRole]
                )
                _save_flag(row.game_id, row.flagged, row.note)
            return

        if col in _THUMBNAIL_COLS:
            path = {
                COL_ICON:   row.icon_path,
                COL_COVER:  row.cover_path,
                COL_TITLE:  row.title_path,
                COL_BANNER: row.banner_path,
            }.get(col)
            if path and os.path.isfile(path):
                vu.open_in_default_app(path)

    def _on_table_double_clicked(self, proxy_index):
        if self._proxy.is_header_row(proxy_index.row()):
            return
        if proxy_index.column() in (*_THUMBNAIL_COLS, COL_CHECK, COL_FLAG):
            return
        # act on the double-clicked row only -- _on_open_editor would act on the
        # whole checked set instead whenever checks are active
        filter_idx = self._proxy.mapToSource(proxy_index)
        src_idx = self._filter_model.mapToSource(filter_idx)
        row = self._model._rows[src_idx.row()]
        index_path = os.path.join(row.folder, "index.js")
        if os.path.isfile(index_path):
            vu.open_in_default_app(index_path)

    def _on_flag_shortcut(self):
        for idx in self._table.selectionModel().selectedRows():
            if self._proxy.is_header_row(idx.row()):
                continue
            self._on_table_cell_clicked(self._proxy.index(idx.row(), COL_FLAG))
            break

    def _toggle_check_selected(self):
        """Space shortcut: flip the checkbox on every view-selected row."""
        changed: list[int] = []
        for idx in self._table.selectionModel().selectedRows():
            if self._proxy.is_header_row(idx.row()):
                continue
            filter_idx = self._proxy.mapToSource(idx)
            src_idx = self._filter_model.mapToSource(filter_idx)
            row = self._model._rows[src_idx.row()]
            if row.game_id in self._model._checked_ids:
                self._model._checked_ids.discard(row.game_id)
            else:
                self._model._checked_ids.add(row.game_id)
            changed.append(src_idx.row())
        # emit after the loop: dataChanged can re-filter and remap proxy rows,
        # which would invalidate the selection indexes mid-iteration
        for r in changed:
            cell = self._model.index(r, COL_CHECK)
            self._model.dataChanged.emit(cell, cell, [Qt.CheckStateRole])

    # -- Script launchers -------------------------------------------------------

    def _run(self, cmds: list[list[str]], desc: str):
        if self._runner.is_running:
            QMessageBox.warning(self, "Busy", "A script is already running. Stop it first.")
            return
        self._runner.run(cmds, desc)

    def _script_dlg(self, title: str, flags=(), inputs=()) -> ScriptArgsDialog | None:
        if not self._require_selection():
            return None
        dlg = ScriptArgsDialog(title, self._selected_ids(), flags=flags, inputs=inputs, parent=self)
        return dlg if dlg.exec() == QDialog.Accepted else None

    def _on_bump_version(self):
        if not self._require_selection():
            return
        ids = self._selected_ids()
        dlg = BumpTypeDialog(ids, self)
        if dlg.exec() != QDialog.Accepted:
            return
        bump_args = dlg.bump_args()
        self._refresh_after_run = "--dry-run" not in bump_args
        self._run(
            [[PYTHON, os.path.join(REPO_ROOT, "bump_version.py")] + bump_args + ids],
            "bump_version.py",
        )

    def _on_release(self):
        dlg = self._script_dlg(
            "Release Extension",
            flags=[
                ("--upload", "Upload (Nexus API v3)", True),
                ("--edit-changelog", "Open Changelog editor", True),
                ("--no-open", "Skip opening Nexus Page", False),
                ("--dry-run", "Dry run (no writes)", False),
                ("--skip-node-check", "Skip Node syntax", False),
                ("--skip-eslint", "Skip ESLint", False),
            ],
        )
        if dlg is None:
            return
        ids = self._selected_ids()
        extra = dlg.extra_args()
        self._run([[PYTHON, os.path.join(REPO_ROOT, "release_extension.py")] + ids + extra],
                  "release_extension.py")

    def _on_port_to_template(self):
        if not self._require_selection():
            return
        ids = self._selected_ids()
        dlg = PortTemplateDialog(ids, self)
        if dlg.exec() != QDialog.Accepted:
            return
        self._run(dlg.build_cmds(ids), "port_to_template.py")

    def _on_fetch_image(self, title: str, script: str, pre_args: list, desc: str, force_label: str):
        """Shared handler for the four image-fetch actions -- same dialog flags,
        refresh-after-run rule, and command shape."""
        dlg = self._script_dlg(
            title,
            flags=[
                ("--dry-run", "Preview only, no downloads", False),
                ("--force", force_label, False),
            ],
        )
        if dlg is None:
            return
        ids = self._selected_ids()
        self._refresh_after_run = "--dry-run" not in dlg.extra_args()
        self._run([[PYTHON, os.path.join(REPO_ROOT, script)] + list(pre_args) + dlg.extra_args() + ids],
                  desc)

    def _on_fetch_icon(self):
        self._on_fetch_image("Fetch Icon", "fetch_exec_icon.py", [], "fetch_exec_icon.py",
                             "Re-download even if exec.png already exists")

    def _on_fetch_cover(self):
        self._on_fetch_image("Fetch Cover Art", "fetch_cover_art.py", [], "fetch_cover_art.py",
                             "Re-download even if file already exists")

    def _on_fetch_title(self):
        self._on_fetch_image("Fetch Title Image", "fetch_cover_art.py", ["--title"],
                             "fetch_cover_art.py --title", "Re-download even if file already exists")

    def _on_fetch_banner(self):
        self._on_fetch_image("Fetch Banner Image", "fetch_cover_art.py", ["--banner"],
                             "fetch_cover_art.py --banner", "Re-download even if file already exists")

    def _on_fetch_nexus_stats(self):
        dlg = self._script_dlg(
            "Fetch Nexus Stats",
            flags=[
                ("--dry-run", "Preview only, no API calls", False),
                ("--force", "Re-fetch even if already cached", False),
                ("--prune", "Remove cache entries for game IDs no longer in repo, then exit", False),
                ("--report-groups", "Print extensions with multiple file groups from cache, then exit", False),
            ],
        )
        if dlg is None:
            return
        ids = self._selected_ids()
        extra = dlg.extra_args()
        self._refresh_after_run = "--dry-run" not in extra and "--report-groups" not in extra
        self._run([[PYTHON, os.path.join(REPO_ROOT, "fetch_nexus_stats.py")] + extra + ids],
                  "fetch_nexus_stats.py")

    def _on_setup_test(self):
        dlg = self._script_dlg(
            "Setup Test Folder",
            flags=[
                ("--dry-run", "Dry run (no writes)", False),
                ("--force", "Recreate .exe stub even if it already exists", False),
                ("--clean", "Delete test folder(s) instead of creating", False),
            ],
        )
        if dlg is None:
            return
        ids = self._selected_ids()
        self._run([[PYTHON, os.path.join(REPO_ROOT, "setup_test_folder.py")] + dlg.extra_args() + ids],
                  "setup_test_folder.py")

    def _on_patch(self):
        dlg = self._script_dlg(
            "Patch Extensions",
            flags=[
                ("--dry-run", "Dry run (no writes)", False),
                ("--force", "Re-run all URL patches (implies --force-pcgw)", False),
                ("--force-pcgw", "Re-evaluate PCGAMINGWIKI_URL even if already set", False),
                ("--debug", "Print raw PCGamingWiki search results", False),
                ("--list-patches", "List all patches with enabled status, then exit", False),
                ("--audit", "Run installer priority + FOMOD audits across all folders, then exit", False),
            ],
            inputs=[
                ("--only", "Only patch", "patch name (e.g. pcgamingwiki_url)"),
            ],
        )
        if dlg is None:
            return
        ids = self._selected_ids()
        self._run([[PYTHON, os.path.join(REPO_ROOT, "patch_extensions.py")] + dlg.extra_args() + ids],
                  "patch_extensions.py")

    def _on_deploy_to_vortex(self):
        dlg = self._script_dlg(
            "Deploy to Vortex",
            flags=[
                ("--dry-run", "Preview only, no copies", False),
                ("--force", "Overwrite existing plugin folder without prompting", False),
                ("--restart-vortex", "Close Vortex before copying, relaunch after", True),
            ],
        )
        if dlg is None:
            return
        ids = self._selected_ids()
        self._run([[PYTHON, os.path.join(REPO_ROOT, "deploy_to_vortex.py")] + dlg.extra_args() + ids],
                  "deploy_to_vortex.py")

    def _on_analyze_log(self):
        self._run(
            [[PYTHON, os.path.join(REPO_ROOT, "analyze_vortex_log.py"), "--force"]],
            "analyze_vortex_log.py",
        )

    def _on_categorize(self):
        dlg = self._script_dlg(
            "Categorize",
            flags=[("--dry-run", "Print categorizations without writing files", False)],
        )
        if dlg is None:
            return
        ids = self._selected_ids()
        self._run([[PYTHON, os.path.join(REPO_ROOT, "categorize_games.py")] + dlg.extra_args() + ids],
                  "categorize_games.py")

    def _on_audit_scripts(self):
        self._run([[PYTHON, os.path.join(REPO_ROOT, "audit_scripts.py")]], "audit_scripts.py")

    def _on_open_folder(self):
        if not self._require_selection():
            return
        for row in self._selected_rows():
            vu.open_in_default_app(row.folder)

    def _on_help(self):
        HelpDialog(self).exec()

    def _focus_filter(self):
        self._filter_edit.setFocus()

    def _clear_filter(self):
        self._filter_edit.clear()

    def _focus_log(self):
        self._log_pane.setFocus()

    def _on_open_editor(self):
        if not self._require_selection():
            return
        for row in self._selected_rows():
            index_path = os.path.join(row.folder, "index.js")
            if os.path.isfile(index_path):
                vu.open_in_default_app(index_path)

    def _on_open_changelog(self):
        if not self._require_selection():
            return
        for row in self._selected_rows():
            changelog_path = os.path.join(row.folder, "CHANGELOG.md")
            if os.path.isfile(changelog_path):
                vu.open_in_default_app(changelog_path)

    def _on_view_images(self):
        if not self._require_selection():
            return
        for row in self._selected_rows():
            for path in (row.icon_path, row.cover_path, row.title_path, row.banner_path):
                if path and os.path.isfile(path):
                    vu.open_in_default_app(path)

    def _on_open_nexus(self):
        if not self._require_selection():
            return
        for row in self._selected_rows():
            QDesktopServices.openUrl(QUrl(f"https://www.nexusmods.com/{row.game_id}"))

    def _on_open_ext(self):
        if not self._require_selection():
            return
        for row in self._selected_rows():
            if row.extension_url:
                QDesktopServices.openUrl(QUrl(row.extension_url))

    def _on_open_in_vortex(self):
        rows = self._selected_rows()
        if not rows:
            QMessageBox.information(self, "No Selection", "Select one or more games first.")
            return
        if len(rows) > 1:
            QMessageBox.information(self, "Single Game Only", "Launch in Vortex works on one game at a time.")
            return
        if not VORTEX_EXE:
            QMessageBox.warning(self, "Vortex Not Found", "Vortex.exe could not be located.")
            return
        try:
            subprocess.Popen([VORTEX_EXE, "--game", rows[0].game_id],
                             cwd=os.path.dirname(VORTEX_EXE),
                             creationflags=subprocess.CREATE_NO_WINDOW)
        except OSError as exc:
            QMessageBox.warning(self, "Launch Failed", f"Could not launch Vortex:\n{exc}")

    def _on_new_game(self):
        dlg = NewGameDialog(self)
        if dlg.exec() != QDialog.Accepted:
            return
        cmd = dlg.build_cmd()
        self._refresh_after_run = "--dry-run" not in cmd
        self._run([cmd], "new_extension.py")

    # -- Log pane --------------------------------------------------------------

    def _append_log(self, text: str):
        cursor = self._log_pane.textCursor()
        cursor.movePosition(QTextCursor.End)
        default_fmt = QTextCharFormat()
        error_fmt = QTextCharFormat()
        error_fmt.setForeground(QColor(_LOG_ERROR))
        cmd_fmt = QTextCharFormat()
        cmd_fmt.setForeground(QColor(_LOG_CMD))
        # our own runner markers arrive as whole chunks, so a per-line scan is
        # reliable for them; script-output lines split across chunks just stay
        # uncolored
        for line in text.splitlines(keepends=True):
            stripped = line.lstrip()
            if stripped.startswith("[ERROR") or stripped.startswith("[exited with code"):
                fmt = error_fmt
            elif stripped.startswith("> "):
                fmt = cmd_fmt
            else:
                fmt = default_fmt
            cursor.insertText(line, fmt)
        self._log_pane.setTextCursor(cursor)
        self._log_pane.ensureCursorVisible()

    def _on_export_log(self):
        text = self._log_pane.toPlainText()
        if not text.strip():
            QMessageBox.information(self, "Export Log", "Log pane is empty -- nothing to export.")
            return
        default_name = f"vortex_gui_log_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.txt"
        path, _ = QFileDialog.getSaveFileName(
            self, "Export Log",
            os.path.join(os.path.expanduser("~"), default_name),
            "Text files (*.txt);;All files (*)",
        )
        if not path:
            return
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
        except OSError as exc:
            QMessageBox.warning(self, "Export Failed", f"Could not write log file:\n{exc}")
            return
        self.statusBar().showMessage(f"Log exported to {path}", 5000)

    # -- Jump to game ------------------------------------------------------------

    def _on_jump_to_game(self):
        text, ok = QInputDialog.getText(self, "Jump to Game", "Game ID (or prefix):")
        if not ok or not text.strip():
            return
        needle = text.strip().lower()
        rows = self._model._rows
        row_i = next((i for i, r in enumerate(rows) if r.game_id.lower() == needle), None)
        if row_i is None:
            row_i = next((i for i, r in enumerate(rows) if r.game_id.lower().startswith(needle)), None)
        if row_i is None:
            QMessageBox.information(self, "Jump to Game", f"No game matching '{text.strip()}'.")
            return
        src_idx = self._model.index(row_i, 0)
        filter_idx = self._filter_model.mapFromSource(src_idx)
        if not filter_idx.isValid():
            # Row is hidden by the current filter -- clear it so the row is visible
            self._filter_edit.clear()
            filter_idx = self._filter_model.mapFromSource(src_idx)
            if not filter_idx.isValid():
                return
        proxy_idx = self._proxy.mapFromSource(filter_idx)
        if not proxy_idx.isValid():
            return
        self._table.clearSelection()
        self._table.selectRow(proxy_idx.row())
        self._table.scrollTo(proxy_idx, QAbstractItemView.ScrollHint.PositionAtCenter)
        self._table.setFocus()

    # -- State updates ---------------------------------------------------------

    def _set_actions_enabled(self, ids=None):
        """Enable toolbar actions. Global actions (repo-wide) always enabled; others need a selection."""
        if ids is None:
            ids = self._selected_ids()
        for label, action in self._action_btns.items():
            action.setEnabled(bool(ids) or label in self._global_action_labels)
        launch_act = self._action_btns.get("Launch in Vortex")
        if launch_act:
            n = len(ids) if ids else 0
            if n == 1:
                launch_act.setToolTip("Launch selected game in Vortex")
            elif n == 0:
                launch_act.setToolTip("Select a game to launch in Vortex")
            else:
                launch_act.setToolTip("Select exactly one game to launch in Vortex")

    def _on_selection_changed(self, *_):
        if not self._runner.is_running:
            self._set_actions_enabled()
        self._update_status_bar()

    def _on_run_started(self, desc: str):
        self._run_desc = desc
        self._stop_btn.setEnabled(True)
        self._refresh_btn.setEnabled(False)
        self._new_game_btn.setEnabled(False)
        for action in self._action_btns.values():
            action.setEnabled(False)
        self.statusBar().showMessage(f"Running: {desc}")

    def _on_run_progress(self, current: int, total: int):
        if total > 1:
            self.statusBar().showMessage(f"Running: {self._run_desc} ({current}/{total})")

    def _on_run_finished(self, code: int):
        self._stop_btn.setEnabled(False)
        self._refresh_btn.setEnabled(True)
        self._new_game_btn.setEnabled(True)
        refresh = self._refresh_after_run and code == 0
        self._refresh_after_run = False
        if refresh:
            self._refresh_data()
        else:
            self._set_actions_enabled()
            self._update_status_bar()

    def _clear_checks(self):
        self._model.clear_checked()

    def _on_model_data_changed(self, top_left, _bottom_right, _roles):
        if top_left.column() == COL_CHECK:
            self._update_status_bar()
            if not self._runner.is_running:
                self._set_actions_enabled()

    def _update_status_bar(self):
        total_proxy = self._filter_model.rowCount()
        total_model = self._model.rowCount()
        selected = len(self._table.selectionModel().selectedRows())
        checked = len(self._model._checked_ids)
        if total_proxy < total_model:
            count_str = f"{total_proxy} of {total_model} games shown"
        else:
            count_str = f"{total_proxy} games shown"
        parts = [count_str, f"{selected} selected"]
        if checked:
            parts.append(f"{checked} checked")
        self._status_label.setText("  |  ".join(parts))
        self._clear_checks_btn.setEnabled(bool(checked))
        if not self._runner.is_running:
            self.statusBar().clearMessage()

    # -- Context menu ----------------------------------------------------------

    def _on_context_menu(self, pos):
        if not self._selected_rows():
            return
        menu = QMenu(self)
        for label, slot_name, sep, _global in ACTION_DEFS:
            if sep:
                menu.addSeparator()
            menu.addAction(label, getattr(self, slot_name))
        menu.exec(self._table.viewport().mapToGlobal(pos))


# == Checkbox style ============================================================

class _CheckboxStyle(QProxyStyle):
    _GREEN = QColor("#27ae60")
    _BORDER = QColor(_DK_TEXT_DIM)
    _WHITE = QColor("#ffffff")
    _UNCHECKED_BG = QColor(_DK_BG_ALT)

    def drawPrimitive(self, element, option, painter, widget=None):
        if element != QStyle.PE_IndicatorCheckBox:
            super().drawPrimitive(element, option, painter, widget)
            return
        checked = bool(option.state & QStyle.State_On)
        r = option.rect.adjusted(1, 1, -1, -1)
        painter.save()
        painter.setRenderHint(QPainter.Antialiasing)
        painter.fillRect(r, self._GREEN if checked else self._UNCHECKED_BG)
        border_pen = QPen(self._BORDER, 1.5)
        painter.setPen(border_pen)
        painter.drawRect(r)
        if checked:
            check_pen = QPen(self._WHITE, 2.0)
            check_pen.setCapStyle(Qt.RoundCap)
            check_pen.setJoinStyle(Qt.RoundJoin)
            painter.setPen(check_pen)
            x, y, w, h = float(r.x()), float(r.y()), float(r.width()), float(r.height())
            p1 = QPointF(x + w * 0.20, y + h * 0.50)
            p2 = QPointF(x + w * 0.45, y + h * 0.76)
            p3 = QPointF(x + w * 0.80, y + h * 0.22)
            painter.drawLine(p1, p2)
            painter.drawLine(p2, p3)
        painter.restore()


# == Entry point ===============================================================

def main():
    app = QApplication(sys.argv)
    if gui_tray.another_instance_running(SINGLE_INSTANCE_KEY):
        sys.exit(0)  # focus the already-running window instead of starting a 2nd
    app.setStyle(_CheckboxStyle("Fusion"))
    _apply_dark_theme(app)
    _make_icons()
    win = MainWindow()
    win._server = gui_tray.listen_for_activation(SINGLE_INSTANCE_KEY, win._tray.restore)
    win.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
