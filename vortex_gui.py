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
import os
import shutil
import sys

from PySide6.QtCore import (
    QAbstractTableModel, QModelIndex, QObject, QPointF, QProcess,
    QSortFilterProxyModel, Qt, Signal,
)
from PySide6.QtGui import QAction, QColor, QFont, QPainter, QPen, QTextCursor
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


# == Data model ================================================================

COL_GAME_ID, COL_NAME, COL_VERSION, COL_DATE, COL_ENGINE, COL_FOLDER = range(6)
HEADERS = ("Game ID", "Name", "Version", "Date", "Engine", "Folder")


class GameRow:
    __slots__ = ("game_id", "name", "version", "date", "engine", "folder")

    def __init__(self, game_id, name, version, date, engine, folder):
        self.game_id = game_id
        self.name = name or ""
        self.version = version or ""
        self.date = date or ""
        self.engine = engine or ""
        self.folder = folder


class GameModel(QAbstractTableModel):
    def __init__(self):
        super().__init__()
        self._rows: list[GameRow] = []

    def load(self):
        self.beginResetModel()
        rows = []
        for folder, game_id, src in vu.iter_game_folders():
            info = vu.read_info_json(folder) or {}
            version = info.get("version", "")
            _v, date = vu.parse_changelog_latest(folder)
            name = vu.extract_game_name(src) or game_id
            engine = vu.detect_engine(src)
            rows.append(GameRow(game_id, name, version, date, engine, folder))
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
        if role == Qt.DisplayRole:
            return (row.game_id, row.name, row.version, row.date,
                    row.engine, row.folder)[index.column()]
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

    def set_text(self, text: str):
        self._text = text.strip().lower()
        self.invalidateFilter()

    def filterAcceptsRow(self, source_row, source_parent):
        if not self._text:
            return True
        row = self.sourceModel()._rows[source_row]
        return self._text in row.game_id.lower() or self._text in row.name.lower()


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
        p.finished.connect(self._on_finished)
        self._process = p
        p.start(cmd[0], cmd[1:])

    def _on_output(self, p: QProcess):
        data = p.readAllStandardOutput()
        self.log_signal.emit(bytes(data).decode("utf-8", errors="replace"))

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
        self._proxy = GameFilterModel()
        self._proxy.setSourceModel(self._model)

        self._runner = ScriptRunner()
        self._runner.log_signal.connect(self._append_log)
        self._runner.started_signal.connect(self._on_run_started)
        self._runner.finished_signal.connect(self._on_run_finished)

        self._action_btns: dict[str, QAction] = {}
        self._refresh_after_run = False

        self._build_ui()
        self._refresh_data()

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
        self._filter_edit.setPlaceholderText("Game ID or name...")
        self._filter_edit.setClearButtonEnabled(True)
        self._filter_edit.textChanged.connect(self._proxy.set_text)
        self._filter_edit.textChanged.connect(self._update_status_bar)
        top_bar.addWidget(self._filter_edit, stretch=1)
        self._refresh_btn = QPushButton("Refresh")
        self._refresh_btn.clicked.connect(self._refresh_data)
        top_bar.addWidget(self._refresh_btn)
        self._new_game_btn = QPushButton("New Game...")
        self._new_game_btn.clicked.connect(self._on_new_game)
        top_bar.addWidget(self._new_game_btn)
        root_layout.addLayout(top_bar)

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
        add_action("Setup Test Folder", self._on_setup_test, sep=True)
        add_action("Patch", self._on_patch)
        add_action("Open Folder", self._on_open_folder, sep=True)
        add_action("Open in Editor", self._on_open_editor)
        root_layout.addWidget(toolbar)

        # splitter: table on top, log pane on bottom
        splitter = QSplitter(Qt.Vertical)
        root_layout.addWidget(splitter)

        # --- game table ---
        self._table = QTableView()
        self._table.setModel(self._proxy)
        self._table.setSortingEnabled(True)
        self._table.setSelectionBehavior(QTableView.SelectRows)
        self._table.setSelectionMode(QTableView.ExtendedSelection)
        self._table.setAlternatingRowColors(True)
        self._table.setColumnHidden(COL_FOLDER, True)
        hdr = self._table.horizontalHeader()
        hdr.setSectionResizeMode(COL_NAME, QHeaderView.Stretch)
        hdr.setSectionResizeMode(COL_GAME_ID, QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_VERSION, QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_DATE, QHeaderView.Interactive)
        hdr.setSectionResizeMode(COL_ENGINE, QHeaderView.Interactive)
        self._table.setColumnWidth(COL_GAME_ID, 200)
        self._table.setColumnWidth(COL_VERSION, 70)
        self._table.setColumnWidth(COL_DATE, 92)
        self._table.setColumnWidth(COL_ENGINE, 195)
        self._table.sortByColumn(COL_GAME_ID, Qt.AscendingOrder)
        self._table.selectionModel().selectionChanged.connect(self._on_selection_changed)
        self._table.setContextMenuPolicy(Qt.CustomContextMenu)
        self._table.customContextMenuRequested.connect(self._on_context_menu)
        self._table.doubleClicked.connect(self._on_open_editor)
        splitter.addWidget(self._table)

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

    def _refresh_data(self):
        QApplication.setOverrideCursor(Qt.WaitCursor)
        try:
            self._model.load()
        finally:
            QApplication.restoreOverrideCursor()
        self._update_status_bar()

    # -- Selection helpers -----------------------------------------------------

    def _selected_rows(self) -> list[GameRow]:
        sel = self._table.selectionModel().selectedRows()
        seen: set[str] = set()
        result: list[GameRow] = []
        for idx in sel:
            src_idx = self._proxy.mapToSource(idx)
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
        ids = self._selected_ids()
        enabled = bool(ids)
        for action in self._action_btns.values():
            action.setEnabled(enabled)
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
        total = self._proxy.rowCount()
        selected = len(self._table.selectionModel().selectedRows())
        self._status_label.setText(f"{total} games shown  |  {selected} selected")
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
    win = MainWindow()
    win.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
