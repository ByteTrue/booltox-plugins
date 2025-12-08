from __future__ import annotations

import json
import math
import sys
from dataclasses import asdict, dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional

from PySide6.QtCore import QDate, QObject, QSettings, QTimer, Qt, Signal
from PySide6.QtGui import QFont, QIcon
from PySide6.QtWidgets import (
    QApplication,
    QFormLayout,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QVBoxLayout,
    QWidget,
)
from qfluentwidgets import (
    BodyLabel,
    CaptionLabel,
    CardWidget,
    FluentIcon,
    InfoBar,
    InfoBarPosition,
    MSFluentWindow,
    PrimaryPushButton,
    ProgressRing,
    PushButton,
    SpinBox,
    SwitchButton,
    Theme,
    setFont,
    setTheme,
    setThemeColor,
)

try:
    from plyer import notification
except Exception:  # pragma: no cover - plyer may be unavailable on CI
    notification = None


APP_ID = "BoolTox/PomodoroDemo"
DEFAULT_THEME_COLOR = '#d83b01'


class PomodoroMode(str, Enum):
    FOCUS = 'focus'
    SHORT_BREAK = 'short_break'
    LONG_BREAK = 'long_break'

    @property
    def label(self) -> str:
        return {
            PomodoroMode.FOCUS: '专注',
            PomodoroMode.SHORT_BREAK: '短休息',
            PomodoroMode.LONG_BREAK: '长休息',
        }[self]


@dataclass
class PomodoroConfig:
    focus_minutes: int = 25
    short_break_minutes: int = 5
    long_break_minutes: int = 15
    long_break_interval: int = 4
    auto_start_focus: bool = False
    auto_start_break: bool = True
    sound_enabled: bool = False

    @staticmethod
    def from_settings(settings: QSettings) -> 'PomodoroConfig':
        data = {**asdict(PomodoroConfig())}
        for key in data.keys():
            value = settings.value(f'config/{key}', data[key])
            if isinstance(data[key], bool):
                data[key] = bool(int(value)) if isinstance(value, str) else bool(value)
            else:
                data[key] = int(value)
        return PomodoroConfig(**data)

    def persist(self, settings: QSettings) -> None:
        for key, value in asdict(self).items():
            settings.setValue(f'config/{key}', value)

    def duration_for_mode(self, mode: PomodoroMode) -> int:
        return {
            PomodoroMode.FOCUS: self.focus_minutes,
            PomodoroMode.SHORT_BREAK: self.short_break_minutes,
            PomodoroMode.LONG_BREAK: self.long_break_minutes,
        }[mode]


class StatsStore:
    def __init__(self, settings: QSettings):
        self._settings = settings
        self._key = 'stats/history'

    def _load(self) -> Dict[str, Dict[str, int]]:
        raw = self._settings.value(self._key, '{}')
        if isinstance(raw, bytes):
            raw = raw.decode('utf-8')
        try:
            return json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            return {}

    def _save(self, data: Dict[str, Dict[str, int]]) -> None:
        self._settings.setValue(self._key, json.dumps(data))

    def log_focus(self, minutes: int) -> None:
        today = QDate.currentDate().toString(Qt.ISODate)
        data = self._load()
        entry = data.get(today, {'pomodoros': 0, 'focusMinutes': 0})
        entry['pomodoros'] += 1
        entry['focusMinutes'] += minutes
        data[today] = entry
        self._save(data)

    def weekly_report(self) -> List[Dict[str, int]]:
        data = self._load()
        days: List[Dict[str, int]] = []
        today = QDate.currentDate()
        for delta in range(6, -1, -1):
            day = today.addDays(-delta)
            key = day.toString(Qt.ISODate)
            entry = data.get(key, {'pomodoros': 0, 'focusMinutes': 0})
            days.append({'date': key, **entry})
        return days

    def today_stats(self) -> Dict[str, int]:
        today = QDate.currentDate().toString(Qt.ISODate)
        data = self._load()
        return data.get(today, {'pomodoros': 0, 'focusMinutes': 0})


class SystemNotifier:
    def __init__(self, enabled: bool):
        self.enabled = enabled and notification is not None

    def notify(self, title: str, message: str) -> None:
        if not self.enabled:
            return
        try:
            notification.notify(title=title, message=message, app_name='Pomodoro', timeout=3)
        except Exception:
            pass


class PomodoroEngine(QObject):
    tick = Signal(PomodoroMode, int, int)
    modeChanged = Signal(PomodoroMode)
    cycleCompleted = Signal(PomodoroMode)

    def __init__(self, config: PomodoroConfig):
        super().__init__()
        self.config = config
        self.timer = QTimer(self)
        self.timer.setInterval(1000)
        self.timer.timeout.connect(self._handle_tick)
        self.current_mode = PomodoroMode.FOCUS
        self.remaining = self._total_seconds(self.current_mode)
        self.completed_sessions = 0
        self._is_running = False

    def _total_seconds(self, mode: PomodoroMode) -> int:
        return self.config.duration_for_mode(mode) * 60

    def start(self):
        if self._is_running:
            return
        self._is_running = True
        self.timer.start()
        self.tick.emit(self.current_mode, self.remaining, self._total_seconds(self.current_mode))

    def pause(self):
        if not self._is_running:
            return
        self._is_running = False
        self.timer.stop()

    def reset(self, keep_mode: bool = True):
        self.pause()
        if not keep_mode:
            self.current_mode = PomodoroMode.FOCUS
        self.remaining = self._total_seconds(self.current_mode)
        self.tick.emit(self.current_mode, self.remaining, self._total_seconds(self.current_mode))

    def skip(self):
        self._complete_cycle(forced=True)

    def is_running(self) -> bool:
        return self._is_running

    def update_config(self, config: PomodoroConfig):
        self.config = config
        self.remaining = min(self.remaining, self._total_seconds(self.current_mode))
        self.tick.emit(self.current_mode, self.remaining, self._total_seconds(self.current_mode))

    def _handle_tick(self):
        self.remaining -= 1
        if self.remaining <= 0:
            self._complete_cycle()
            return
        self.tick.emit(self.current_mode, self.remaining, self._total_seconds(self.current_mode))

    def _complete_cycle(self, forced: bool = False):
        self.pause()
        mode = self.current_mode
        self.cycleCompleted.emit(mode)
        if mode == PomodoroMode.FOCUS and not forced:
            self.completed_sessions += 1
        next_mode = self._next_mode(mode)
        self.current_mode = next_mode
        self.remaining = self._total_seconds(next_mode)
        self.modeChanged.emit(next_mode)
        self.tick.emit(next_mode, self.remaining, self._total_seconds(next_mode))

    def _next_mode(self, mode: PomodoroMode) -> PomodoroMode:
        if mode == PomodoroMode.FOCUS:
            if (
                self.completed_sessions > 0
                and self.completed_sessions % self.config.long_break_interval == 0
            ):
                self.completed_sessions = 0
                return PomodoroMode.LONG_BREAK
            return PomodoroMode.SHORT_BREAK
        return PomodoroMode.FOCUS


class TimerPage(QWidget):
    def __init__(self, engine: PomodoroEngine, config: PomodoroConfig, stats: StatsStore, notifier: SystemNotifier):
        super().__init__()
        self.engine = engine
        self.config = config
        self.stats = stats
        self.notifier = notifier
        self.total_seconds = engine._total_seconds(engine.current_mode)
        self._build_ui()
        self._bind_signals()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(36, 36, 36, 36)
        layout.setSpacing(18)

        self.modeLabel = BodyLabel('模式: 专注', self)
        self.modeLabel.setAlignment(Qt.AlignCenter)
        setFont(self.modeLabel, 18, QFont.Medium)

        heroCard = CardWidget(self)
        heroCardLayout = QVBoxLayout(heroCard)
        heroCardLayout.setContentsMargins(24, 24, 24, 24)
        heroCardLayout.setSpacing(16)

        self.progress = ProgressRing(self)
        self.progress.setRange(0, 100)
        self.progress.setFixedSize(220, 220)
        self.progress.setStrokeWidth(7)

        self.timeLabel = QLabel('25:00', self)
        time_font = QFont('Microsoft YaHei UI', 52, QFont.Bold)
        self.timeLabel.setFont(time_font)
        self.timeLabel.setAlignment(Qt.AlignCenter)

        self.statusLabel = CaptionLabel('准备开始', self)
        self.statusLabel.setAlignment(Qt.AlignCenter)

        heroCardLayout.addWidget(self.modeLabel)
        heroCardLayout.addWidget(self.progress, alignment=Qt.AlignCenter)
        heroCardLayout.addWidget(self.timeLabel)
        heroCardLayout.addWidget(self.statusLabel)

        btnLayout = QHBoxLayout()
        btnLayout.setSpacing(16)

        self.startButton = PrimaryPushButton('开始', self)
        self.startButton.setMinimumHeight(44)
        self.resetButton = PushButton('重置', self)
        self.skipButton = PushButton('跳过', self)

        btnLayout.addWidget(self.startButton)
        btnLayout.addWidget(self.resetButton)
        btnLayout.addWidget(self.skipButton)

        layout.addWidget(heroCard)
        layout.addLayout(btnLayout)

    def _bind_signals(self):
        self.startButton.clicked.connect(self._toggle_start)
        self.resetButton.clicked.connect(lambda: self.engine.reset(keep_mode=True))
        self.skipButton.clicked.connect(self.engine.skip)

        self.engine.tick.connect(self._on_tick)
        self.engine.modeChanged.connect(self._on_mode_change)
        self.engine.cycleCompleted.connect(self._on_cycle_complete)

    def _toggle_start(self):
        if self.engine.is_running():
            self.engine.pause()
            self.startButton.setText('开始')
            self.statusLabel.setText('已暂停')
        else:
            self.engine.start()
            self.startButton.setText('暂停')
            self.statusLabel.setText('专注中...')

    def _on_tick(self, mode: PomodoroMode, remaining: int, total: int):
        minutes = remaining // 60
        seconds = remaining % 60
        self.timeLabel.setText(f"{minutes:02d}:{seconds:02d}")
        pct = int((remaining / total) * 100) if total else 0
        self.progress.setValue(pct)

    def _on_mode_change(self, mode: PomodoroMode):
        self.startButton.setText('开始')
        self.statusLabel.setText('准备开始')
        self.modeLabel.setText(f'模式: {mode.label}')

    def _on_cycle_complete(self, mode: PomodoroMode):
        if mode == PomodoroMode.FOCUS:
            self.stats.log_focus(self.config.focus_minutes)
            self.notifier.notify('番茄钟', '专注结束，去休息一下吧！')
        else:
            self.notifier.notify('番茄钟', '休息结束，准备继续专注！')
        InfoBar.success('提示', f'{mode.label}阶段结束', parent=self, position=InfoBarPosition.TOP_RIGHT, duration=2000)


class SettingsPage(QWidget):
    configChanged = Signal(PomodoroConfig)

    def __init__(self, config: PomodoroConfig):
        super().__init__()
        self.config = config
        self._build_ui()

    def _build_ui(self):
        layout = QFormLayout(self)
        layout.setContentsMargins(36, 36, 36, 36)
        layout.setSpacing(14)

        self.focusSpin = SpinBox()
        self.focusSpin.setRange(10, 90)
        self.focusSpin.setValue(self.config.focus_minutes)
        self.focusSpin.setSuffix(' 分钟')

        self.shortSpin = SpinBox()
        self.shortSpin.setRange(3, 30)
        self.shortSpin.setValue(self.config.short_break_minutes)
        self.shortSpin.setSuffix(' 分钟')

        self.longSpin = SpinBox()
        self.longSpin.setRange(5, 60)
        self.longSpin.setValue(self.config.long_break_minutes)
        self.longSpin.setSuffix(' 分钟')

        self.intervalSpin = SpinBox()
        self.intervalSpin.setRange(2, 8)
        self.intervalSpin.setValue(self.config.long_break_interval)
        self.intervalSpin.setSuffix(' 个番茄')

        self.autoFocusSwitch = SwitchButton()
        self.autoFocusSwitch.setChecked(self.config.auto_start_focus)

        self.autoBreakSwitch = SwitchButton()
        self.autoBreakSwitch.setChecked(self.config.auto_start_break)

        self.soundSwitch = SwitchButton()
        self.soundSwitch.setChecked(self.config.sound_enabled)

        layout.addRow('专注时长 (分钟)', self.focusSpin)
        layout.addRow('短休息时长 (分钟)', self.shortSpin)
        layout.addRow('长休息时长 (分钟)', self.longSpin)
        layout.addRow('长休息间隔 (个番茄)', self.intervalSpin)
        layout.addRow('自动开始专注', self.autoFocusSwitch)
        layout.addRow('自动开始休息', self.autoBreakSwitch)
        layout.addRow('系统通知', self.soundSwitch)

        btn = PrimaryPushButton('保存设置')
        btn.clicked.connect(self._save)
        layout.addRow(btn)

    def _save(self):
        self.config.focus_minutes = self.focusSpin.value()
        self.config.short_break_minutes = self.shortSpin.value()
        self.config.long_break_minutes = self.longSpin.value()
        self.config.long_break_interval = self.intervalSpin.value()
        self.config.auto_start_focus = self.autoFocusSwitch.isChecked()
        self.config.auto_start_break = self.autoBreakSwitch.isChecked()
        self.config.sound_enabled = self.soundSwitch.isChecked()
        self.configChanged.emit(self.config)
        InfoBar.success('已保存', '设置已更新', parent=self, duration=1500)


class StatsPage(QWidget):
    def __init__(self, stats: StatsStore):
        super().__init__()
        self.stats = stats
        self._build_ui()
        self.refresh()

    def _build_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(36, 36, 36, 36)
        layout.setSpacing(16)

        self.todayCard = CardWidget(self)
        todayLayout = QVBoxLayout(self.todayCard)
        todayLayout.setContentsMargins(24, 20, 24, 20)
        todayLayout.setSpacing(4)
        self.todayLabel = BodyLabel('', self.todayCard)
        setFont(self.todayLabel, 14, QFont.Medium)
        self.summaryLabel = CaptionLabel('', self.todayCard)
        todayLayout.addWidget(self.todayLabel)
        todayLayout.addWidget(self.summaryLabel)

        self.weekList = QListWidget(self)
        self.weekList.setSpacing(6)
        self.weekList.setStyleSheet('QListWidget { border-radius: 12px; background: transparent; }')

        self.refreshButton = PushButton('刷新数据')
        self.refreshButton.clicked.connect(self.refresh)

        layout.addWidget(self.todayCard)
        layout.addWidget(self.weekList)
        layout.addWidget(self.refreshButton, alignment=Qt.AlignRight)

    def refresh(self):
        today = self.stats.today_stats()
        self.todayLabel.setText('今日表现')
        self.summaryLabel.setText(f"番茄 {today.get('pomodoros', 0)} 次 · 专注 {today.get('focusMinutes', 0)} 分钟")
        self.weekList.clear()
        for day in self.stats.weekly_report():
            item = QListWidgetItem(f"{day['date']}｜{day['pomodoros']} 次 · {day['focusMinutes']} 分钟")
            self.weekList.addItem(item)


class PomodoroWindow(MSFluentWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('番茄钟计时器')
        self.resize(960, 640)
        setTheme(Theme.AUTO)
        setThemeColor(DEFAULT_THEME_COLOR)
        QSettings.setDefaultFormat(QSettings.IniFormat)
        self.settings = QSettings(APP_ID, 'Pomodoro')
        self.config = PomodoroConfig.from_settings(self.settings)
        self.engine = PomodoroEngine(self.config)
        self.stats = StatsStore(self.settings)
        self.notifier = SystemNotifier(self.config.sound_enabled)
        self._init_pages()
        self._wire_auto_start()

    def _init_pages(self):
        self.timerPage = TimerPage(self.engine, self.config, self.stats, self.notifier)
        self.settingsPage = SettingsPage(self.config)
        self.statsPage = StatsPage(self.stats)

        self.settingsPage.configChanged.connect(self._on_config_changed)

        # QFluentWidgets 要求接口 objectName 非空
        self.timerPage.setObjectName('pomodoro-timer')
        self.settingsPage.setObjectName('pomodoro-settings')
        self.statsPage.setObjectName('pomodoro-stats')

        self.addSubInterface(self.timerPage, FluentIcon.CALENDAR, '计时器')
        self.addSubInterface(self.settingsPage, FluentIcon.SETTING, '设置')
        self.addSubInterface(self.statsPage, FluentIcon.BOOK_SHELF, '统计')

    def _wire_auto_start(self):
        self.engine.cycleCompleted.connect(self._handle_auto_start)

    def _handle_auto_start(self, mode: PomodoroMode):
        next_mode = self.engine.current_mode
        if next_mode == PomodoroMode.FOCUS and self.config.auto_start_focus:
            self.engine.start()
        elif next_mode != PomodoroMode.FOCUS and self.config.auto_start_break:
            self.engine.start()

    def _on_config_changed(self, config: PomodoroConfig):
        config.persist(self.settings)
        self.notifier.enabled = config.sound_enabled and notification is not None
        self.engine.update_config(config)
        self.statsPage.refresh()


def main():
    app = QApplication(sys.argv)
    app.setOrganizationName('BoolTox')
    app.setApplicationName('Pomodoro Timer')
    app.setFont(QFont('Microsoft YaHei UI', 11))
    window = PomodoroWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == '__main__':
    main()
