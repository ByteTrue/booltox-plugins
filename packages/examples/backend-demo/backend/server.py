#!/usr/bin/env python3
"""
系统信息监控后端
使用 psutil 库获取系统信息并通过 STDIO 与前端通信
"""

from __future__ import annotations

import json
import sys
import time
import threading
from typing import Any, Dict, List
import platform

try:
    import psutil
except ImportError:
    notification = {"jsonrpc": "2.0", "method": "error", "params": {"message": "psutil 库未安装，请运行: pip install psutil"}}
    print(json.dumps(notification), flush=True)
    sys.exit(1)


class SystemMonitor:
    """系统监控类"""

    def __init__(self):
        self.monitoring = False
        self.monitor_thread = None

    def send(self, method: str, params: Dict[str, Any] = None) -> None:
        """发送 JSON-RPC 2.0 通知到前端"""
        notification = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {}
        }
        sys.stdout.write(json.dumps(notification, ensure_ascii=False) + "\n")
        sys.stdout.flush()

    def get_system_info(self) -> Dict[str, Any]:
        """获取静态系统信息"""
        try:
            boot_time = psutil.boot_time()
            boot_time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(boot_time))

            return {
                "platform": platform.system(),
                "platform_release": platform.release(),
                "platform_version": platform.version(),
                "architecture": platform.machine(),
                "hostname": platform.node(),
                "processor": platform.processor(),
                "python_version": platform.python_version(),
                "cpu_count": psutil.cpu_count(logical=False),
                "cpu_count_logical": psutil.cpu_count(logical=True),
                "boot_time": boot_time_str,
            }
        except Exception as e:
            return {"error": str(e)}

    def get_cpu_info(self) -> Dict[str, Any]:
        """获取 CPU 信息"""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            cpu_percent_per_core = psutil.cpu_percent(interval=0.1, percpu=True)
            cpu_freq = psutil.cpu_freq()

            return {
                "percent": cpu_percent,
                "percent_per_core": cpu_percent_per_core,
                "frequency": {
                    "current": cpu_freq.current if cpu_freq else 0,
                    "min": cpu_freq.min if cpu_freq else 0,
                    "max": cpu_freq.max if cpu_freq else 0,
                } if cpu_freq else None,
            }
        except Exception as e:
            return {"error": str(e)}

    def get_memory_info(self) -> Dict[str, Any]:
        """获取内存信息"""
        try:
            mem = psutil.virtual_memory()
            swap = psutil.swap_memory()

            return {
                "total": mem.total,
                "available": mem.available,
                "used": mem.used,
                "percent": mem.percent,
                "swap_total": swap.total,
                "swap_used": swap.used,
                "swap_percent": swap.percent,
            }
        except Exception as e:
            return {"error": str(e)}

    def get_disk_info(self) -> List[Dict[str, Any]]:
        """获取磁盘信息"""
        try:
            disks = []
            for partition in psutil.disk_partitions():
                try:
                    usage = psutil.disk_usage(partition.mountpoint)
                    disks.append({
                        "device": partition.device,
                        "mountpoint": partition.mountpoint,
                        "fstype": partition.fstype,
                        "total": usage.total,
                        "used": usage.used,
                        "free": usage.free,
                        "percent": usage.percent,
                    })
                except PermissionError:
                    continue
            return disks
        except Exception as e:
            return [{"error": str(e)}]

    def get_network_info(self) -> Dict[str, Any]:
        """获取网络信息"""
        try:
            net_io = psutil.net_io_counters()
            return {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv,
            }
        except Exception as e:
            return {"error": str(e)}

    def get_processes(self, sort_by: str = "cpu", limit: int = 10) -> List[Dict[str, Any]]:
        """获取进程列表"""
        try:
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                try:
                    pinfo = proc.info
                    processes.append({
                        "pid": pinfo['pid'],
                        "name": pinfo['name'],
                        "cpu_percent": pinfo['cpu_percent'] or 0,
                        "memory_percent": pinfo['memory_percent'] or 0,
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            # 排序
            if sort_by == "cpu":
                processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
            elif sort_by == "memory":
                processes.sort(key=lambda x: x['memory_percent'], reverse=True)

            return processes[:limit]
        except Exception as e:
            return [{"error": str(e)}]

    def monitor_loop(self) -> None:
        """监控循环，每秒推送一次数据"""
        while self.monitoring:
            try:
                data = {
                    "cpu": self.get_cpu_info(),
                    "memory": self.get_memory_info(),
                    "network": self.get_network_info(),
                    "timestamp": time.time(),
                }
                self.send("monitor_data", {"data": data})
                time.sleep(1)
            except Exception as e:
                self.send("error", {"message": f"监控循环错误: {str(e)}"})
                break

    def start_monitor(self) -> None:
        """开始监控"""
        if self.monitoring:
            self.send("info", {"message": "监控已在运行"})
            return

        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self.monitor_loop, daemon=True)
        self.monitor_thread.start()
        self.send("monitor_started", {"message": "实时监控已启动"})

    def stop_monitor(self) -> None:
        """停止监控"""
        if not self.monitoring:
            self.send("info", {"message": "监控未运行"})
            return

        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=2)
        self.send("monitor_stopped", {"message": "实时监控已停止"})

    def handle_command(self, payload: Dict[str, Any]) -> None:
        """处理前端命令"""
        command = payload.get("command")

        if command == "get_system_info":
            info = self.get_system_info()
            self.send("system_info", {"data": info})

        elif command == "get_cpu_info":
            info = self.get_cpu_info()
            self.send("cpu_info", {"data": info})

        elif command == "get_memory_info":
            info = self.get_memory_info()
            self.send("memory_info", {"data": info})

        elif command == "get_disk_info":
            info = self.get_disk_info()
            self.send("disk_info", {"data": info})

        elif command == "get_network_info":
            info = self.get_network_info()
            self.send("network_info", {"data": info})

        elif command == "get_processes":
            sort_by = payload.get("sort_by", "cpu")
            limit = payload.get("limit", 10)
            processes = self.get_processes(sort_by, limit)
            self.send("processes", {"data": processes})

        elif command == "start_monitor":
            self.start_monitor()

        elif command == "stop_monitor":
            self.stop_monitor()

        else:
            self.send("unknown_command", {"command": command})


def main() -> None:
    """主函数"""
    monitor = SystemMonitor()

    # 发送就绪消息
    monitor.send("backend_ready", {"message": "系统监控后端已启动"})

    # 读取标准输入
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            payload = json.loads(line)
        except json.JSONDecodeError as e:
            monitor.send("error", {"message": f"JSON 解析失败: {e.msg}"})
            continue

        try:
            monitor.handle_command(payload)
        except Exception as e:
            monitor.send("error", {"message": f"命令处理错误: {str(e)}"})


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        notification = {"jsonrpc": "2.0", "method": "exit", "params": {"message": "后端被中断"}}
        sys.stdout.write(json.dumps(notification) + "\n")
        sys.stdout.flush()
    except Exception as e:
        notification = {"jsonrpc": "2.0", "method": "error", "params": {"message": f"后端错误: {str(e)}"}}
        sys.stdout.write(json.dumps(notification) + "\n")
        sys.stdout.flush()
        sys.exit(1)
