"""
vortex_gui.py

GUI dashboard for ChemBoy1-Vortex-Games developer scripts.
Lists all game-* extensions in a sortable/filterable table and provides
toolbar buttons to run developer scripts against selected games.

Requirements:
    pip install pyside6

Usage:
    python vortex_gui.py
"""

import glob
import json
import os
import shutil
import sys

import subprocess

from PySide6.QtCore import (
    QAbstractProxyModel, QAbstractTableModel, QItemSelectionModel, QModelIndex,
    QObject, QPointF, QProcess, QSettings, QSize, QSortFilterProxyModel, Qt, QUrl, Signal,
)
from PySide6.QtGui import (
    QAction, QColor, QDesktopServices, QFont, QIcon, QKeySequence, QPainter, QPainterPath,
    QPen, QPixmap, QShortcut, QTextCursor,
)
from PySide6.QtSvg import QSvgRenderer
from PySide6.QtWidgets import (
    QApplication, QCheckBox, QComboBox, QDialog, QDialogButtonBox,
    QFormLayout, QHBoxLayout, QHeaderView, QLabel, QLineEdit,
    QMainWindow, QMenu, QMessageBox, QPlainTextEdit, QProxyStyle, QPushButton,
    QSplitter, QStyle, QTableView, QToolBar, QVBoxLayout, QWidget,
)

import vortex_utils as vu

REPO_ROOT = vu.REPO_ROOT
PYTHON = sys.executable
NODE = shutil.which("node") or "node"
FLAGS_PATH = os.path.join(REPO_ROOT, "vortex_gui_flags.json")


# == Flag storage ==============================================================

def _load_flags() -> dict:
    if os.path.isfile(FLAGS_PATH):
        try:
            with open(FLAGS_PATH, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _save_flags(data: dict):
    tmp = FLAGS_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, FLAGS_PATH)


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


def _resolve_vortex_exe() -> "str | None":
    candidates = [
        r"C:\Program Files\Black Tree Gaming Ltd\Vortex\Vortex.exe",
        shutil.which("Vortex.exe") or "",
    ]
    for path in candidates:
        if path and os.path.isfile(path):
            return path
    return None


VORTEX_EXE: "str | None" = _resolve_vortex_exe()

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
        p.setPen(QPen(QColor("#1a1a1a"), 1.5))
        p.drawLine(3, 2, 3, 14)
        tri = QPainterPath()
        tri.moveTo(3.0, 2.0)
        tri.lineTo(13.0, 5.0)
        tri.lineTo(3.0, 8.0)
        tri.closeSubpath()
        p.setPen(Qt.NoPen)
        p.fillPath(tri, QColor("#e74c3c") if flagged else QColor("#888888"))
        p.end()
        return QIcon(px)

    _FLAG_ICON = _draw_flag(True)
    _UNFLAG_ICON = _draw_flag(False)

    # -- nexus icon (SVG) ----------------------------------------------------
    _NEXUS_ICON = _load_svg_icon(os.path.join(REPO_ROOT, "nexus.svg"), 18)

    # -- gear icons (drawn) --------------------------------------------------
    def _draw_gear(dim: bool) -> QIcon:
        fill_color = QColor("#cccccc") if dim else QColor("#555555")
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

    _GEAR_ICON = _draw_gear(False)
    _GEAR_ICON_DIM = _draw_gear(True)

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

COL_FLAG, COL_ICON, COL_GAME_ID, COL_NAME, COL_VERSION, COL_DATE, COL_ENGINE, \
    COL_COVER, COL_TITLE, COL_BANNER, COL_NEXUS, COL_EXT_URL, COL_FOLDER, COL_VORTEX = range(14)
HEADERS = ("Flag", "Icon", "Game ID", "Name", "Ver", "Date", "Engine", "Cover", "Title", "Banner", "Nex", "Ext", "Open", "Vort")
_THUMBNAIL_COLS = frozenset({COL_ICON, COL_COVER, COL_TITLE, COL_BANNER})
_LINK_COLS = frozenset({COL_NEXUS, COL_EXT_URL, COL_FOLDER, COL_VORTEX})
_IS_GROUP_HEADER_ROLE = Qt.UserRole + 10


class GameRow:
    __slots__ = (
        "game_id", "name", "version", "date", "engine", "folder",
        "icon", "icon_path", "cover", "cover_path",
        "title", "title_path", "banner", "banner_path",
        "extension_url",
        "flagged", "note",
    )

    def __init__(self, game_id, name, version, date, engine, folder,
                 icon, icon_path, cover, cover_path,
                 title, title_path, banner, banner_path,
                 extension_url,
                 flagged, note):
        self.game_id = game_id
        self.name = name or ""
        self.version = version or ""
        self.date = date or ""
        self.engine = engine or ""
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
        self.flagged = flagged
        self.note = note


class GameModel(QAbstractTableModel):
    def __init__(self):
        super().__init__()
        self._rows: list[GameRow] = []

    def load(self):
        self.beginResetModel()
        flags = _load_flags()
        rows = []
        for folder, game_id, src in vu.iter_game_folders():
            info = vu.read_info_json(folder) or {}
            version = info.get("version", "")
            _v, date = vu.parse_changelog_latest(folder)
            name = vu.extract_game_name(src) or game_id
            engine = vu.detect_engine(src)

            icon_path = os.path.join(folder, "exec.png")
            icon = _load_icon(icon_path, 22, 20) if os.path.isfile(icon_path) else None

            cover_path = os.path.join(folder, f"{game_id}.jpg")
            cover = _load_icon(cover_path, 40, 20) if os.path.isfile(cover_path) else None

            title_path = os.path.join(vu.TITLE_IMAGES_DIR, f"{game_id}_title.jpg")
            title = _load_icon(title_path, 40, 20) if os.path.isfile(title_path) else None

            banner_path = os.path.join(vu.BANNER_IMAGES_DIR, f"{game_id}_banner.jpg")
            banner = _load_icon(banner_path, 40, 20) if os.path.isfile(banner_path) else None

            extension_url = vu.extract_extension_url(src)

            fd = flags.get(game_id, {})
            rows.append(GameRow(
                game_id, name, version, date, engine, folder,
                icon, icon_path if os.path.isfile(icon_path) else None,
                cover, cover_path if os.path.isfile(cover_path) else None,
                title, title_path if os.path.isfile(title_path) else None,
                banner, banner_path if os.path.isfile(banner_path) else None,
                extension_url,
                fd.get("flagged", False), fd.get("note", ""),
            ))
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

        if role == Qt.DecorationRole:
            if col == COL_FLAG:    return _FLAG_ICON if row.flagged else _UNFLAG_ICON
            if col == COL_ICON:    return row.icon
            if col == COL_COVER:   return row.cover
            if col == COL_TITLE:   return row.title
            if col == COL_BANNER:  return row.banner
            if col == COL_NEXUS:   return _NEXUS_ICON
            if col == COL_EXT_URL: return _GEAR_ICON if row.extension_url else _GEAR_ICON_DIM
            if col == COL_FOLDER:  return _FOLDER_ICON
            if col == COL_VORTEX:  return _VORTEX_ICON if VORTEX_EXE else _VORTEX_ICON_DIM
            return None

        if role == Qt.ToolTipRole:
            if col == COL_FLAG:
                return row.note if row.note else "Click to flag / add note"
            if col == COL_NEXUS:
                return f"https://www.nexusmods.com/{row.game_id}"
            if col == COL_EXT_URL:
                return row.extension_url or "EXTENSION_URL not set"
            if col == COL_FOLDER:
                return row.folder
            if col == COL_VORTEX:
                return f"Open in Vortex: {row.game_id}" if VORTEX_EXE else "Vortex.exe not found"
            return None

        if role == Qt.DisplayRole:
            if col == COL_FLAG or col in _THUMBNAIL_COLS or col in _LINK_COLS:
                return ""
            return {
                COL_GAME_ID: row.game_id,
                COL_NAME:    row.name,
                COL_VERSION: row.version,
                COL_DATE:    row.date,
                COL_ENGINE:  row.engine,
            }.get(col)

        if role == Qt.UserRole:
            return row

        return None

    def headerData(self, section, orientation, role=Qt.DisplayRole):
        if orientation == Qt.Horizontal and role == Qt.DisplayRole:
            return HEADERS[section]
        return None


class GameFilterModel(QSortFilterProxyModel):
    def __init__(self):
        super().__init__()
        self.setFilterCaseSensitivity(Qt.CaseInsensitive)
        self.setSortCaseSensitivity(Qt.CaseInsensitive)
        self._text = ""
        self._grouping = False

    def set_text(self, text: str):
        self._text = text.strip().lower()
        self.invalidate()

    def set_grouping(self, enabled: bool):
        if enabled == self._grouping:
            return
        self._grouping = enabled
        self.invalidate()

    def filterAcceptsRow(self, source_row, source_parent):
        if not self._text:
            return True
        row = self.sourceModel()._rows[source_row]
        return (self._text in row.game_id.lower()
                or self._text in row.name.lower()
                or self._text in row.engine.lower()
                or self._text in row.note.lower())

    def lessThan(self, left, right):
        l_row = self.sourceModel()._rows[left.row()]
        r_row = self.sourceModel()._rows[right.row()]
        if self._grouping and l_row.engine != r_row.engine:
            return l_row.engine < r_row.engine
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

    def setSourceModel(self, model):
        old = self.sourceModel()
        if old is not None:
            old.modelReset.disconnect(self._rebuild)
            old.layoutChanged.disconnect(self._rebuild)
            old.dataChanged.disconnect(self._on_data_changed)
        super().setSourceModel(model)
        if model is not None:
            model.modelReset.connect(self._rebuild)
            model.layoutChanged.connect(self._rebuild)
            model.dataChanged.connect(self._on_data_changed)
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
            self.endResetModel()
            return
        n = src.rowCount()
        if not self._grouping:
            self._map = [(False, i, "") for i in range(n)]
        else:
            result = []
            cur_engine = None
            for i in range(n):
                engine = src.data(src.index(i, COL_ENGINE)) or ""
                if engine != cur_engine:
                    cur_engine = engine
                    result.append((True, -1, engine))
                result.append((False, i, engine))
            self._map = result
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
        src_row = source_index.row()
        for proxy_row, (is_header, sr, _) in enumerate(self._map):
            if not is_header and sr == src_row:
                return self.createIndex(proxy_row, source_index.column())
        return QModelIndex()

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
                return QColor("#c8d4e8")
            if role == Qt.ForegroundRole:
                return QColor("#1a1a2e")
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


# == Script runner =============================================================

class ScriptRunner(QObject):
    log_signal = Signal(str)
    started_signal = Signal(str)   # description, emitted once per run() call
    finished_signal = Signal(int)  # exit code, emitted once when queue is done

    def __init__(self):
        super().__init__()
        self._process: QProcess | None = None
        self._queue: list[list[str]] = []
        self._desc = ""

    def run(self, cmds: list[list[str]], desc: str = ""):
        self._queue = list(cmds)
        self._desc = desc
        if self._queue:
            self.started_signal.emit(desc)
        self._run_next()

    def stop(self):
        self._queue.clear()
        if self._process and self._process.state() != QProcess.NotRunning:
            self._process.kill()

    @property
    def is_running(self) -> bool:
        return bool(self._process and self._process.state() != QProcess.NotRunning)

    def _run_next(self):
        if not self._queue:
            self.finished_signal.emit(0)
            return
        cmd = self._queue.pop(0)
        self.log_signal.emit(f"\n> {' '.join(cmd)}\n")
        p = QProcess()
        p.setWorkingDirectory(REPO_ROOT)
        p.setProcessChannelMode(QProcess.MergedChannels)
        p.readyReadStandardOutput.connect(lambda: self._on_output(p))
        p.errorOccurred.connect(self._on_process_error)
        p.finished.connect(self._on_finished)
        self._process = p
        p.start(cmd[0], cmd[1:])

    def _on_output(self, p: QProcess):
        data = p.readAllStandardOutput()
        self.log_signal.emit(bytes(data).decode("utf-8", errors="replace"))

    def _on_process_error(self, err):
        if err == QProcess.ProcessError.FailedToStart:
            self.log_signal.emit(
                "\n[ERROR: Failed to start -- executable not found or no permission]\n"
            )
            self._queue.clear()
            self.finished_signal.emit(-1)

    def _on_finished(self, code, _status):
        if code != 0:
            self.log_signal.emit(f"\n[exited with code {code}]\n")
            self._queue.clear()
            self.finished_signal.emit(code)
        else:
            self._run_next()


# == Dialogs ===================================================================

def _get_templates() -> list[str]:
    return sorted(
        os.path.basename(d)[len("template-"):]
        for d in glob.glob(os.path.join(REPO_ROOT, "template-*"))
        if os.path.isdir(d)
    )


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
        self.template_combo.addItems(_get_templates())
        layout.addRow("Template:", self.template_combo)

        self.name_edit = QLineEdit()
        self.name_edit.setPlaceholderText("Game name or Steam App ID")
        layout.addRow("Game:", self.name_edit)

        self.force_cb = QCheckBox("--force (overwrite existing folder)")
        self.no_images_cb = QCheckBox("--no-images (skip art downloads)")
        self.dry_run_cb = QCheckBox("--dry-run (preview only, no writes)")
        layout.addRow("", self.force_cb)
        layout.addRow("", self.no_images_cb)
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
        self.template_combo.addItems(_get_templates())
        layout.addRow("Template:", self.template_combo)

        self.dry_run_cb = QCheckBox("--dry-run (preview only, no writes)")
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
        cmds = []
        for gid in game_ids:
            cmd = [PYTHON, script, gid, template]
            if self.dry_run_cb.isChecked():
                cmd.append("--dry-run")
            if self.force_cb.isChecked():
                cmd.append("--force")
            cmds.append(cmd)
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
        self._runner.finished_signal.connect(self._on_run_finished)

        self._action_btns: dict[str, QAction] = {}
        self._refresh_after_run = False
        self._splitter: QSplitter | None = None

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
        self._refresh_btn.setShortcut("F5")
        top_bar.addWidget(self._refresh_btn)
        self._new_game_btn = QPushButton("New Game...")
        self._new_game_btn.clicked.connect(self._on_new_game)
        self._new_game_btn.setShortcut(QKeySequence.StandardKey.New)
        top_bar.addWidget(self._new_game_btn)
        self._group_btn = QPushButton("Group by Engine")
        self._group_btn.setCheckable(True)
        self._group_btn.toggled.connect(self._on_group_toggled)
        top_bar.addWidget(self._group_btn)
        root_layout.addLayout(top_bar)

        QShortcut(QKeySequence("Ctrl+F"), self).activated.connect(self._filter_edit.setFocus)

        # script toolbar
        toolbar = QToolBar()
        toolbar.setMovable(False)

        def add_action(label: str, slot, sep: bool = False):
            if sep:
                toolbar.addSeparator()
            act = QAction(label, self)
            act.triggered.connect(slot)
            act.setEnabled(False)
            toolbar.addAction(act)
            self._action_btns[label] = act

        add_action("Release", self._on_release)
        add_action("Lint", self._on_lint)
        add_action("Generate Explained", self._on_generate_explained)
        add_action("Port to Template...", self._on_port_to_template)
        add_action("Fetch Icon", self._on_fetch_icon, sep=True)
        add_action("Fetch Cover", self._on_fetch_cover)
        add_action("Fetch Title", self._on_fetch_title)
        add_action("Fetch Banner", self._on_fetch_banner)
        add_action("View Icon", self._on_view_icon, sep=True)
        add_action("View Cover", self._on_view_cover)
        add_action("View Title", self._on_view_title)
        add_action("View Banner", self._on_view_banner)
        add_action("Setup Test Folder", self._on_setup_test, sep=True)
        add_action("Patch", self._on_patch)
        add_action("Open Folder", self._on_open_folder, sep=True)
        add_action("Open in Editor", self._on_open_editor)
        add_action("Open Nexus", self._on_open_nexus, sep=True)
        add_action("Open Ext", self._on_open_ext)
        add_action("Open in Vortex", self._on_open_in_vortex)
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
        hdr.setSectionResizeMode(COL_FLAG,    QHeaderView.Fixed)
        hdr.setSectionResizeMode(COL_ICON,    QHeaderView.Fixed)
        hdr.setSectionResizeMode(COL_GAME_ID, QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_NAME,    QHeaderView.Interactive)
        hdr.setStretchLastSection(False)
        hdr.setSectionResizeMode(COL_VERSION, QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_DATE,    QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_ENGINE,  QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_COVER,   QHeaderView.Fixed)
        hdr.setSectionResizeMode(COL_TITLE,   QHeaderView.Fixed)
        hdr.setSectionResizeMode(COL_BANNER,  QHeaderView.Fixed)
        hdr.setSectionResizeMode(COL_NEXUS,   QHeaderView.Fixed)
        hdr.setSectionResizeMode(COL_EXT_URL, QHeaderView.Fixed)
        hdr.setSectionResizeMode(COL_FOLDER,  QHeaderView.Fixed)
        hdr.setSectionResizeMode(COL_VORTEX,  QHeaderView.Fixed)
        self._table.setColumnWidth(COL_FLAG,    22)
        self._table.setColumnWidth(COL_ICON,    26)
        self._table.setColumnWidth(COL_NAME,    300)
        self._table.setColumnWidth(COL_GAME_ID, 200)
        self._table.setColumnWidth(COL_VERSION, 70)
        self._table.setColumnWidth(COL_DATE,    92)
        self._table.setColumnWidth(COL_ENGINE,  195)
        self._table.setColumnWidth(COL_COVER,   42)
        self._table.setColumnWidth(COL_TITLE,   42)
        self._table.setColumnWidth(COL_BANNER,  42)
        self._table.setColumnWidth(COL_NEXUS,   26)
        self._table.setColumnWidth(COL_EXT_URL, 26)
        self._table.setColumnWidth(COL_FOLDER,  26)
        self._table.setColumnWidth(COL_VORTEX,  26)
        self._table.sortByColumn(COL_GAME_ID, Qt.AscendingOrder)
        self._table.selectionModel().selectionChanged.connect(self._on_selection_changed)
        self._table.setContextMenuPolicy(Qt.CustomContextMenu)
        self._table.customContextMenuRequested.connect(self._on_context_menu)
        self._table.clicked.connect(self._on_table_cell_clicked)
        self._table.doubleClicked.connect(self._on_table_double_clicked)
        splitter.addWidget(self._table)
        self._proxy.modelReset.connect(self._apply_spans)

        # --- log pane ---
        self._log_pane = QPlainTextEdit()
        self._log_pane.setReadOnly(True)
        self._log_pane.setFont(QFont("Consolas", 9))
        self._log_pane.setMaximumBlockCount(5000)

        self._stop_btn = QPushButton("Stop Running")
        self._stop_btn.setEnabled(False)
        self._stop_btn.clicked.connect(self._runner.stop)
        clear_btn = QPushButton("Clear Log")
        clear_btn.clicked.connect(self._log_pane.clear)

        log_btn_row = QHBoxLayout()
        log_btn_row.addWidget(clear_btn)
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

    def _restore_settings(self):
        settings = QSettings("ChemBoy1", "VortexExtensionManager")
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

    def closeEvent(self, event):
        settings = QSettings("ChemBoy1", "VortexExtensionManager")
        settings.setValue("geometry", self.saveGeometry())
        settings.setValue("splitter", self._splitter.saveState())
        settings.setValue("tableHeader", self._table.horizontalHeader().saveState())
        settings.setValue("tableHeaderColCount", len(HEADERS))
        self._runner.stop()
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

    def _refresh_data(self):
        prev_ids = set(self._selected_ids())
        QApplication.setOverrideCursor(Qt.WaitCursor)
        try:
            self._model.load()
        finally:
            QApplication.restoreOverrideCursor()
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
        sel = self._table.selectionModel().selectedRows()
        seen: set[str] = set()
        result: list[GameRow] = []
        for idx in sel:
            if self._proxy.is_header_row(idx.row()):
                continue
            filter_idx = self._proxy.mapToSource(idx)
            src_idx = self._filter_model.mapToSource(filter_idx)
            row = self._model._rows[src_idx.row()]
            if row.game_id not in seen:
                seen.add(row.game_id)
                result.append(row)
        return result

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

        if col == COL_NEXUS:
            QDesktopServices.openUrl(QUrl(f"https://www.nexusmods.com/{row.game_id}"))
            return

        if col == COL_EXT_URL:
            if row.extension_url:
                QDesktopServices.openUrl(QUrl(row.extension_url))
            return

        if col == COL_FOLDER:
            os.startfile(row.folder)
            return

        if col == COL_VORTEX:
            if VORTEX_EXE:
                subprocess.Popen([VORTEX_EXE, "--game", row.game_id],
                                  cwd=os.path.dirname(VORTEX_EXE))
            else:
                print(f"[vortex_gui] Vortex.exe not found; cannot open {row.game_id}")
            return

        if col in _THUMBNAIL_COLS:
            path = {
                COL_ICON:   row.icon_path,
                COL_COVER:  row.cover_path,
                COL_TITLE:  row.title_path,
                COL_BANNER: row.banner_path,
            }.get(col)
            if path and os.path.isfile(path):
                os.startfile(path)

    def _on_table_double_clicked(self, proxy_index):
        if self._proxy.is_header_row(proxy_index.row()):
            return
        if proxy_index.column() in (*_THUMBNAIL_COLS, COL_FLAG, *_LINK_COLS):
            return
        self._on_open_editor()

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

    def _on_release(self):
        dlg = self._script_dlg(
            "Release Extension",
            flags=[
                ("--no-open", "Skip browser (don't open Nexus upload page)", False),
                ("--dry-run", "Preview only, no writes", False),
            ],
        )
        if dlg is None:
            return
        ids = self._selected_ids()
        self._run([[PYTHON, os.path.join(REPO_ROOT, "release_extension.py")] + ids + dlg.extra_args()],
                  "release_extension.py")

    def _on_lint(self):
        dlg = self._script_dlg(
            "Lint Extensions",
            flags=[
                ("--fix", "Auto-fix fixable issues", False),
                ("--templates", "Also lint template-*/index.js", False),
                ("--quiet", "Only show failures (suppress [OK] lines)", False),
            ],
        )
        if dlg is None:
            return
        ids = self._selected_ids()
        self._run([[NODE, os.path.join(REPO_ROOT, "lint_extensions.js")] + ids + dlg.extra_args()],
                  "lint_extensions.js")

    def _on_generate_explained(self):
        dlg = self._script_dlg("Generate Explained")
        if dlg is None:
            return
        ids = self._selected_ids()
        self._run([[NODE, os.path.join(REPO_ROOT, "generate_explained.js")] + ids],
                  "generate_explained.js")

    def _on_port_to_template(self):
        if not self._require_selection():
            return
        ids = self._selected_ids()
        dlg = PortTemplateDialog(ids, self)
        if dlg.exec() != QDialog.Accepted:
            return
        self._run(dlg.build_cmds(ids), "port_to_template.py")

    def _on_fetch_icon(self):
        dlg = self._script_dlg(
            "Fetch Icon",
            flags=[
                ("--dry-run", "Preview only, no downloads", False),
                ("--force", "Re-download even if exec.png already exists", False),
            ],
        )
        if dlg is None:
            return
        ids = self._selected_ids()
        self._run([[PYTHON, os.path.join(REPO_ROOT, "fetch_exec_icon.py")] + dlg.extra_args() + ids],
                  "fetch_exec_icon.py")

    def _on_fetch_cover(self):
        dlg = self._script_dlg(
            "Fetch Cover Art",
            flags=[
                ("--dry-run", "Preview only, no downloads", False),
                ("--force", "Re-download even if file already exists", False),
            ],
        )
        if dlg is None:
            return
        ids = self._selected_ids()
        self._run([[PYTHON, os.path.join(REPO_ROOT, "fetch_cover_art.py")] + dlg.extra_args() + ids],
                  "fetch_cover_art.py")

    def _on_fetch_title(self):
        dlg = self._script_dlg(
            "Fetch Title Image",
            flags=[
                ("--dry-run", "Preview only, no downloads", False),
                ("--force", "Re-download even if file already exists", False),
            ],
        )
        if dlg is None:
            return
        ids = self._selected_ids()
        self._run([[PYTHON, os.path.join(REPO_ROOT, "fetch_cover_art.py"), "--title"] + dlg.extra_args() + ids],
                  "fetch_cover_art.py --title")

    def _on_fetch_banner(self):
        dlg = self._script_dlg(
            "Fetch Banner Image",
            flags=[
                ("--dry-run", "Preview only, no downloads", False),
                ("--force", "Re-download even if file already exists", False),
            ],
        )
        if dlg is None:
            return
        ids = self._selected_ids()
        self._run([[PYTHON, os.path.join(REPO_ROOT, "fetch_cover_art.py"), "--banner"] + dlg.extra_args() + ids],
                  "fetch_cover_art.py --banner")

    def _on_setup_test(self):
        dlg = self._script_dlg(
            "Setup Test Folder",
            flags=[
                ("--dry-run", "Preview only, no writes", False),
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
                ("--dry-run", "Preview only, no writes", False),
                ("--force", "Re-run all URL patches (implies --force-pcgw)", False),
                ("--force-pcgw", "Re-evaluate PCGAMINGWIKI_URL even if already set", False),
                ("--debug", "Print raw PCGamingWiki search results", False),
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

    def _on_open_folder(self):
        if not self._require_selection():
            return
        for row in self._selected_rows():
            os.startfile(row.folder)

    def _on_open_editor(self):
        if not self._require_selection():
            return
        for row in self._selected_rows():
            index_path = os.path.join(row.folder, "index.js")
            if os.path.isfile(index_path):
                os.startfile(index_path)

    def _on_view_icon(self):
        if not self._require_selection():
            return
        for row in self._selected_rows():
            if row.icon_path and os.path.isfile(row.icon_path):
                os.startfile(row.icon_path)

    def _on_view_cover(self):
        if not self._require_selection():
            return
        for row in self._selected_rows():
            if row.cover_path and os.path.isfile(row.cover_path):
                os.startfile(row.cover_path)

    def _on_view_title(self):
        if not self._require_selection():
            return
        for row in self._selected_rows():
            if row.title_path and os.path.isfile(row.title_path):
                os.startfile(row.title_path)

    def _on_view_banner(self):
        if not self._require_selection():
            return
        for row in self._selected_rows():
            if row.banner_path and os.path.isfile(row.banner_path):
                os.startfile(row.banner_path)

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
            QMessageBox.information(self, "Single Game Only", "Open in Vortex works on one game at a time.")
            return
        if not VORTEX_EXE:
            QMessageBox.warning(self, "Vortex Not Found", "Vortex.exe could not be located.")
            return
        subprocess.Popen([VORTEX_EXE, "--game", rows[0].game_id],
                         cwd=os.path.dirname(VORTEX_EXE))

    def _on_new_game(self):
        dlg = NewGameDialog(self)
        if dlg.exec() != QDialog.Accepted:
            return
        cmd = dlg.build_cmd()
        self._refresh_after_run = "--dry-run" not in cmd
        self._run([cmd], "new_extension.py")

    # -- Log pane --------------------------------------------------------------

    def _append_log(self, text: str):
        self._log_pane.moveCursor(QTextCursor.End)
        self._log_pane.insertPlainText(text)
        self._log_pane.ensureCursorVisible()

    # -- State updates ---------------------------------------------------------

    def _on_selection_changed(self, *_):
        if not self._runner.is_running:
            ids = self._selected_ids()
            for action in self._action_btns.values():
                action.setEnabled(bool(ids))
        self._update_status_bar()

    def _on_run_started(self, desc: str):
        self._stop_btn.setEnabled(True)
        self._refresh_btn.setEnabled(False)
        self._new_game_btn.setEnabled(False)
        for action in self._action_btns.values():
            action.setEnabled(False)
        self.statusBar().showMessage(f"Running: {desc}")

    def _on_run_finished(self, code: int):
        self._stop_btn.setEnabled(False)
        self._refresh_btn.setEnabled(True)
        self._new_game_btn.setEnabled(True)
        refresh = self._refresh_after_run and code == 0
        self._refresh_after_run = False
        if refresh:
            self._refresh_data()
        else:
            ids = self._selected_ids()
            for action in self._action_btns.values():
                action.setEnabled(bool(ids))
            self._update_status_bar()

    def _update_status_bar(self):
        total_proxy = self._filter_model.rowCount()
        total_model = self._model.rowCount()
        selected = len(self._table.selectionModel().selectedRows())
        if total_proxy < total_model:
            count_str = f"{total_proxy} of {total_model} games shown"
        else:
            count_str = f"{total_proxy} games shown"
        self._status_label.setText(f"{count_str}  |  {selected} selected")
        if not self._runner.is_running:
            self.statusBar().clearMessage()

    # -- Context menu ----------------------------------------------------------

    def _on_context_menu(self, pos):
        if not self._selected_rows():
            return
        menu = QMenu(self)
        entries = [
            ("Release", self._on_release),
            ("Lint", self._on_lint),
            ("Generate Explained", self._on_generate_explained),
            ("Port to Template...", self._on_port_to_template),
            None,
            ("Fetch Icon", self._on_fetch_icon),
            ("Fetch Cover", self._on_fetch_cover),
            ("Fetch Title", self._on_fetch_title),
            ("Fetch Banner", self._on_fetch_banner),
            None,
            ("Setup Test Folder", self._on_setup_test),
            ("Patch", self._on_patch),
            None,
            ("Open Folder", self._on_open_folder),
            ("Open in Editor", self._on_open_editor),
        ]
        for entry in entries:
            if entry is None:
                menu.addSeparator()
            else:
                label, slot = entry
                menu.addAction(label, slot)
        menu.exec(self._table.viewport().mapToGlobal(pos))


# == Checkbox style ============================================================

class _CheckboxStyle(QProxyStyle):
    _GREEN = QColor("#27ae60")
    _BORDER = QColor("#1a1a1a")
    _WHITE = QColor("#ffffff")

    def drawPrimitive(self, element, option, painter, widget=None):
        if element != QStyle.PE_IndicatorCheckBox:
            super().drawPrimitive(element, option, painter, widget)
            return
        checked = bool(option.state & QStyle.State_On)
        r = option.rect.adjusted(1, 1, -1, -1)
        painter.save()
        painter.setRenderHint(QPainter.Antialiasing)
        painter.fillRect(r, self._GREEN if checked else self._WHITE)
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
    app.setStyle(_CheckboxStyle("Fusion"))
    _make_icons()
    win = MainWindow()
    win.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
