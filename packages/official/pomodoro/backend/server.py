#!/usr/bin/env python3
"""
番茄钟后端服务
基于 JSON-RPC 2.0 协议与前端通信
"""

import json
import sys
import time
import threading
from datetime import datetime, timedelta
from plyer import notification


class PomodoroTimer:
    def __init__(self):
        self.duration = 25 * 60  # 25 分钟（秒）
        self.remaining = self.duration
        self.is_running = False
        self.timer_thread = None
        self.start_time = None

    def send(self, method: str, params: dict = None) -> None:
        """发送 JSON-RPC 2.0 通知到前端"""
        message = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {}
        }
        sys.stdout.write(json.dumps(message, ensure_ascii=False) + "\n")
        sys.stdout.flush()

    def send_response(self, request_id, result=None, error=None) -> None:
        """发送 JSON-RPC 2.0 响应"""
        response = {
            "jsonrpc": "2.0",
            "id": request_id
        }

        if error:
            response["error"] = error
        else:
            response["result"] = result

        sys.stdout.write(json.dumps(response, ensure_ascii=False) + "\n")
        sys.stdout.flush()

    def timer_loop(self):
        """计时器循环"""
        while self.is_running and self.remaining > 0:
            time.sleep(1)
            self.remaining -= 1

            # 每秒发送更新
            self.send("$event", {
                "type": "tick",
                "remaining": self.remaining,
                "total": self.duration
            })

            # 倒计时结束
            if self.remaining <= 0:
                self.is_running = False
                self.send("$event", {
                    "type": "complete"
                })

                # 发送系统通知
                try:
                    notification.notify(
                        title="番茄钟提醒",
                        message="🍅 番茄钟时间到！休息一下吧~",
                        app_name="BoolTox",
                        timeout=10
                    )
                except Exception as e:
                    sys.stderr.write(f"通知失败: {str(e)}\n")

    def start_timer(self, duration: int = None) -> dict:
        """开始计时"""
        if self.is_running:
            return {"success": False, "error": "Timer already running"}

        if duration:
            self.duration = duration
            self.remaining = duration
        else:
            self.remaining = self.duration

        self.is_running = True
        self.start_time = datetime.now()

        # 启动计时器线程
        self.timer_thread = threading.Thread(target=self.timer_loop, daemon=True)
        self.timer_thread.start()

        return {"success": True, "remaining": self.remaining}

    def pause_timer(self) -> dict:
        """暂停计时"""
        if not self.is_running:
            return {"success": False, "error": "Timer not running"}

        self.is_running = False
        return {"success": True, "remaining": self.remaining}

    def reset_timer(self) -> dict:
        """重置计时"""
        self.is_running = False
        self.remaining = self.duration
        self.start_time = None

        self.send("$event", {
            "type": "reset",
            "remaining": self.remaining
        })

        return {"success": True, "remaining": self.remaining}

    def get_status(self) -> dict:
        """获取当前状态"""
        return {
            "isRunning": self.is_running,
            "remaining": self.remaining,
            "duration": self.duration,
            "startTime": self.start_time.isoformat() if self.start_time else None
        }


def main():
    timer = PomodoroTimer()

    # 发送就绪通知
    timer.send("$ready", {
        "version": "1.0.0",
        "methods": ["start", "pause", "reset", "getStatus"]
    })

    # 主循环：读取 JSON-RPC 请求
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break

            request = json.loads(line)
            method = request.get("method")
            params = request.get("params", {})
            request_id = request.get("id")

            # 处理方法调用
            result = None
            error = None

            if method == "start":
                duration = params.get("duration")
                result = timer.start_timer(duration)
            elif method == "pause":
                result = timer.pause_timer()
            elif method == "reset":
                result = timer.reset_timer()
            elif method == "getStatus":
                result = timer.get_status()
            else:
                error = {"code": -32601, "message": f"Method not found: {method}"}

            # 发送响应
            if request_id is not None:
                timer.send_response(request_id, result=result, error=error)

        except json.JSONDecodeError as e:
            sys.stderr.write(f"JSON 解析错误: {str(e)}\n")
        except Exception as e:
            sys.stderr.write(f"处理错误: {str(e)}\n")
            if 'request_id' in locals() and request_id is not None:
                timer.send_response(request_id, error={
                    "code": -32603,
                    "message": f"Internal error: {str(e)}"
                })


if __name__ == "__main__":
    main()
