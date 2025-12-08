#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BoolTox Plugin Backend for uiautodev
启动 uiautodev 本地服务，并通过 JSON-RPC 与前端通信
使用本地源代码，无需从 PyPI 安装
"""

import atexit
import json
import os
import signal
import socket
import subprocess
import sys
import threading
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


def write_message(payload: dict):
    """发送 JSON-RPC 消息到 stdout"""
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def emit(event: str, data=None):
    """发送事件通知"""
    write_message({
        "jsonrpc": "2.0",
        "method": "$event",
        "params": {"event": event, "data": data}
    })


def send_ready(methods: list):
    """发送就绪信号"""
    write_message({
        "jsonrpc": "2.0",
        "method": "$ready",
        "params": {"methods": methods}
    })


def send_response(request_id, result=None, error=None):
    """发送 RPC 响应"""
    if error:
        write_message({
            "jsonrpc": "2.0",
            "id": request_id,
            "error": error
        })
    else:
        write_message({
            "jsonrpc": "2.0",
            "id": request_id,
            "result": result
        })


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """检查端口是否被占用"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex((host, port)) == 0


def wait_for_server(timeout: int = 30) -> bool:
    """等待服务器启动"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        if is_port_in_use(UIAUTODEV_PORT, UIAUTODEV_HOST):
            # 额外验证服务是否真正可用
            try:
                import urllib.request
                with urllib.request.urlopen(f"{UIAUTODEV_URL}/api/info", timeout=2) as resp:
                    if resp.status == 200:
                        return True
            except Exception:
                pass
        time.sleep(0.5)
    return False


def start_uiautodev_server() -> bool:
    """启动 uiautodev 服务（使用本地源代码）"""
    global server_process

    # 检查是否已有服务运行
    if is_port_in_use(UIAUTODEV_PORT, UIAUTODEV_HOST):
        emit("log", {"level": "info", "message": "uiautodev 服务已在运行"})
        return True

    emit("log", {"level": "info", "message": "正在启动 uiautodev 服务（本地源代码）..."})

    try:
        # 获取插件目录作为工作目录（缓存文件会存在这里）
        plugin_dir = Path(__file__).parent.parent
        cache_dir = plugin_dir / "cache"
        cache_dir.mkdir(exist_ok=True)

        # 使用本地源代码启动 uiautodev server
        # 直接运行 uiautodev 包的 __main__.py
        uiautodev_main = plugin_dir / "uiautodev" / "__main__.py"

        cmd = [
            sys.executable, str(uiautodev_main),
            "server",
            "--host", UIAUTODEV_HOST,
            "--port", str(UIAUTODEV_PORT),
            "--offline",
            "--no-browser"
        ]

        # 设置环境变量，确保使用本地源代码
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        env["PYTHONPATH"] = str(plugin_dir) + os.pathsep + env.get("PYTHONPATH", "")

        server_process = subprocess.Popen(
            cmd,
            cwd=str(plugin_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env
        )
        
        # 后台线程读取服务日志
        def read_output(pipe, level):
            for line in iter(pipe.readline, b''):
                if line:
                    emit("log", {"level": level, "message": line.decode('utf-8', errors='ignore').strip()})
        
        threading.Thread(target=read_output, args=(server_process.stdout, "info"), daemon=True).start()
        threading.Thread(target=read_output, args=(server_process.stderr, "error"), daemon=True).start()
        
        # 等待服务启动
        if wait_for_server(timeout=30):
            emit("log", {"level": "info", "message": f"uiautodev 服务已启动: {UIAUTODEV_URL}"})
            return True
        else:
            emit("log", {"level": "error", "message": "uiautodev 服务启动超时"})
            return False
            
    except Exception as e:
        emit("log", {"level": "error", "message": f"启动 uiautodev 服务失败: {str(e)}"})
        return False


def stop_uiautodev_server():
    """停止 uiautodev 服务"""
    global server_process
    
    if server_process:
        try:
            server_process.terminate()
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()
        except Exception:
            pass
        server_process = None
    
    # 尝试通过 API 关闭可能已存在的服务
    try:
        import urllib.request
        urllib.request.urlopen(f"{UIAUTODEV_URL}/shutdown", timeout=2)
    except Exception:
        pass


def handle_request(request: dict) -> dict:
    """处理 RPC 请求"""
    method = request.get("method", "")
    
    if method == "getServerUrl":
        # 返回 uiautodev 服务地址
        return {"result": {"url": UIAUTODEV_URL}}
    
    elif method == "getServerStatus":
        # 返回服务状态
        is_running = is_port_in_use(UIAUTODEV_PORT, UIAUTODEV_HOST)
        return {"result": {"running": is_running, "url": UIAUTODEV_URL if is_running else None}}
    
    elif method == "restartServer":
        # 重启服务
        stop_uiautodev_server()
        time.sleep(1)
        success = start_uiautodev_server()
        return {"result": {"success": success, "url": UIAUTODEV_URL if success else None}}
    
    elif method == "shutdown":
        # 关闭服务
        stop_uiautodev_server()
        return {"result": {"success": True}}
    
    else:
        return {"error": {"code": -32601, "message": f"Method not found: {method}"}}


def cleanup():
    """清理资源"""
    stop_uiautodev_server()


def signal_handler(signum, frame):
    """信号处理"""
    cleanup()
    sys.exit(0)


def main():
    # 注册清理函数
    atexit.register(cleanup)
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    # 启动 uiautodev 服务
    server_started = start_uiautodev_server()
    
    # 发送就绪信号（包含服务 URL）
    send_ready(["getServerUrl", "getServerStatus", "restartServer", "shutdown"])
    
    # 发送初始状态
    emit("serverReady", {
        "success": server_started,
        "url": UIAUTODEV_URL if server_started else None
    })
    
    # 主循环：处理来自前端的请求
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        
        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            continue
        
        request_id = request.get("id")
        response = handle_request(request)
        
        if request_id is not None:
            if "result" in response:
                send_response(request_id, result=response["result"])
            elif "error" in response:
                send_response(request_id, error=response["error"])


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        cleanup()
