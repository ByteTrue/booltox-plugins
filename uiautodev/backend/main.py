#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BoolTox Plugin Backend for uiautodev
启动 uiautodev 本地服务，BoolTox 将在系统浏览器中打开
使用本地源代码，无需从 PyPI 安装
"""

import atexit
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

# 将本地 uiautodev 源代码添加到 Python 路径
PLUGIN_DIR = Path(__file__).parent.parent
UIAUTODEV_SRC = PLUGIN_DIR / "uiautodev"
if UIAUTODEV_SRC.exists():
    sys.path.insert(0, str(PLUGIN_DIR))

# uiautodev 服务配置
UIAUTODEV_HOST = "127.0.0.1"
UIAUTODEV_PORT = 20242
UIAUTODEV_URL = f"http://{UIAUTODEV_HOST}:{UIAUTODEV_PORT}"

# 全局进程引用
server_process = None


def log(message: str, level: str = "INFO"):
    """输出日志到 stderr（BoolTox 会捕获）"""
    print(f"[{level}] {message}", file=sys.stderr, flush=True)


def start_uiautodev_server():
    """启动 uiautodev 服务（使用本地静态文件）"""
    global server_process

    log("正在启动 uiautodev 服务（完全本地化）...")

    try:
        # 获取工具目录作为工作目录
        plugin_dir = Path(__file__).parent.parent

        # 检查静态文件目录是否存在
        static_dir = plugin_dir / "static"
        if not static_dir.exists():
            log("⚠️ 静态文件目录不存在，请运行 extract_cache.py", level="ERROR")
            log(f"   位置: {static_dir}", level="ERROR")
            sys.exit(1)

        # 使用本地源代码启动 uiautodev server
        uiautodev_main = plugin_dir / "uiautodev" / "__main__.py"

        # 构建启动命令（无需 --offline，现在使用静态文件服务）
        cmd = [
            sys.executable, str(uiautodev_main),
            "server",
            "--host", UIAUTODEV_HOST,
            "--port", str(UIAUTODEV_PORT),
            "--no-browser"
        ]

        log("使用静态文件服务（完全本地化，无需网络）")

        # 设置环境变量，确保使用本地源代码
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        env["PYTHONPATH"] = str(plugin_dir) + os.pathsep + env.get("PYTHONPATH", "")

        # 启动服务（不捕获输出，直接打印到 stdout/stderr）
        server_process = subprocess.Popen(
            cmd,
            cwd=str(plugin_dir),
            env=env
        )

        log(f"uiautodev 服务进程已启动 (PID: {server_process.pid})")
        log(f"服务地址: {UIAUTODEV_URL}")

        # 等待进程结束（阻塞）
        server_process.wait()

        exit_code = server_process.returncode
        if exit_code == 0:
            log("uiautodev 服务正常退出")
        else:
            log(f"uiautodev 服务异常退出 (code: {exit_code})", level="ERROR")
            sys.exit(exit_code)

    except Exception as e:
        log(f"启动 uiautodev 服务失败: {str(e)}", level="ERROR")
        sys.exit(1)


def cleanup():
    """清理资源"""
    global server_process

    if server_process:
        log("正在停止 uiautodev 服务...")
        try:
            server_process.terminate()
            server_process.wait(timeout=5)
            log("服务已停止")
        except subprocess.TimeoutExpired:
            log("强制终止服务", level="WARN")
            server_process.kill()
        except Exception as e:
            log(f"停止服务时出错: {e}", level="ERROR")
        server_process = None


def signal_handler(signum, frame):
    """信号处理"""
    log(f"收到信号 {signum}，正在退出...")
    cleanup()
    sys.exit(0)


def main():
    # 注册清理函数
    atexit.register(cleanup)
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    # 启动 uiautodev 服务（阻塞直到服务退出）
    start_uiautodev_server()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        cleanup()
