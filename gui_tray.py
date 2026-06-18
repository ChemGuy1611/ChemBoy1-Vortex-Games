#!/usr/bin/env python3
"""
gui_tray.py
-----------
Shared PySide6 helpers that make a single-window GUI tray-resident and
single-instance. Imported only by the GUI scripts -- never by the CLI scripts --
so it is safe for this module to depend on PySide6 (vortex_utils.py must not).

Provides:
    another_instance_running(key)   -- True if an instance is already listening
                                       on the named local server `key`; signals
                                       that instance to restore its window.
    listen_for_activation(key, cb)  -- become the named server; call cb() each
                                       time another launch pings it. Returns the
                                       QLocalServer (keep a reference alive).
    TrayManager                     -- adds close-to-tray, click-to-restore, and
                                       a Show/Quit tray menu to a QMainWindow.

Typical wiring in a GUI's main():

    app = QApplication(sys.argv)
    if gui_tray.another_instance_running(KEY):
        sys.exit(0)
    win = MainWindow()                       # creates self._tray = TrayManager(...)
    win._server = gui_tray.listen_for_activation(KEY, win._tray.restore)
    win.show()
    sys.exit(app.exec())

and in MainWindow.closeEvent (after saving settings, before real-quit cleanup):

    if not self._tray.on_close(event):
        return   # window hidden to the tray; keep running

Not run directly.
"""

from PySide6.QtCore import QSettings, Qt
from PySide6.QtGui import QColor, QIcon, QPainter, QPixmap
from PySide6.QtNetwork import QLocalServer, QLocalSocket
from PySide6.QtWidgets import QMenu, QSystemTrayIcon


def another_instance_running(key: str, timeout_ms: int = 300) -> bool:
    """Return True if another instance is already listening on `key`.

    When one is found it is signalled to restore its window before returning,
    so a second launch focuses the existing window instead of starting anew."""
    sock = QLocalSocket()
    sock.connectToServer(key)
    if not sock.waitForConnected(timeout_ms):
        return False
    sock.write(b"show")
    sock.flush()
    sock.waitForBytesWritten(timeout_ms)
    sock.disconnectFromServer()
    return True


def listen_for_activation(key: str, on_activate) -> QLocalServer:
    """Listen on the named local server `key`; call on_activate() on each ping.

    Returns the QLocalServer -- the caller must keep a reference so it is not
    garbage-collected (which would stop it listening)."""
    QLocalServer.removeServer(key)  # clear any stale endpoint from a crash
    server = QLocalServer()
    server.listen(key)

    def _on_new_connection():
        conn = server.nextPendingConnection()
        if conn is not None:
            conn.disconnectFromServer()
        on_activate()

    server.newConnection.connect(_on_new_connection)
    return server


def _badge_icon(letter: str, color: str = "#5a7fb5") -> QIcon:
    """Draw a simple rounded-square badge with a centered letter (fallback icon)."""
    px = QPixmap(32, 32)
    px.fill(Qt.transparent)
    p = QPainter(px)
    p.setRenderHint(QPainter.Antialiasing)
    p.setPen(Qt.NoPen)
    p.setBrush(QColor(color))
    p.drawRoundedRect(2, 2, 28, 28, 7, 7)
    p.setPen(QColor("#ffffff"))
    f = p.font()
    f.setBold(True)
    f.setPointSize(16)
    p.setFont(f)
    p.drawText(px.rect(), Qt.AlignCenter, (letter or "?")[:1].upper())
    p.end()
    return QIcon(px)


class TrayManager:
    """Make a QMainWindow close-to-tray + click-to-restore.

    The window's close button hides it to the system tray and the app keeps
    running; the tray menu's Quit (or quit()) performs the real shutdown. If no
    system tray is available, on_close() always returns True so the app quits
    normally (graceful degradation -- no window becomes unreachable)."""

    def __init__(self, window, *, app_name, settings_org, settings_app, icon=None):
        self.window = window
        self.app_name = app_name
        self._org = settings_org
        self._app = settings_app
        self.force_quit = False
        self.available = QSystemTrayIcon.isSystemTrayAvailable()
        self.tray = None
        if not self.available:
            return
        if icon is None or icon.isNull():
            icon = _badge_icon(app_name)
        window.setWindowIcon(icon)
        self.tray = QSystemTrayIcon(icon, window)
        self.tray.setToolTip(app_name)
        menu = QMenu()
        menu.addAction("Show", self.restore)
        menu.addSeparator()
        menu.addAction("Quit", self.quit)
        self.tray.setContextMenu(menu)
        self.tray.activated.connect(self._on_activated)
        self.tray.show()

    def _on_activated(self, reason):
        if reason in (QSystemTrayIcon.ActivationReason.Trigger,
                      QSystemTrayIcon.ActivationReason.DoubleClick):
            self.restore()

    def restore(self):
        """Show, un-minimize, and focus the window."""
        self.window.showNormal()
        self.window.raise_()
        self.window.activateWindow()

    def quit(self):
        """Trigger a real application shutdown (closes the window for good)."""
        self.force_quit = True
        self.window.close()

    def on_close(self, event) -> bool:
        """Return True if the close should proceed (real quit), False if the
        window was intercepted and hidden to the tray. Call from closeEvent."""
        if self.force_quit or not self.available:
            return True
        event.ignore()
        self.window.hide()
        self._notify_once()
        return False

    def _notify_once(self):
        s = QSettings(self._org, self._app)
        if s.value("trayNoticeShown", False, type=bool):
            return
        if self.tray is not None:
            self.tray.showMessage(
                self.app_name,
                "Still running in the tray. Right-click the tray icon to quit.",
                QSystemTrayIcon.MessageIcon.Information, 4000,
            )
        s.setValue("trayNoticeShown", True)
