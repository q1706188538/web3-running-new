#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
简单的HTTP服务器，用于本地测试H5游戏
自动尝试不同端口，避免端口冲突
"""

import http.server
import socketserver
import webbrowser
import os
import socket
import sys
import signal
import time

class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super().end_headers()

    def log_message(self, format, *args):
        # 减少日志输出
        try:
            # 检查args[0]是否为字符串且包含favicon.ico
            if args and isinstance(args[0], str) and 'GET /favicon.ico' in args[0]:
                return  # 不记录favicon.ico请求
        except:
            pass  # 如果出错，继续正常记录
        return super().log_message(format, *args)

def find_free_port(start_port=8000, max_port=8100):
    """查找可用端口"""
    for port in range(start_port, max_port):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    return None

def start_server():
    global httpd_global, running

    # 查找可用端口
    PORT = find_free_port()
    if PORT is None:
        print("无法找到可用端口，请关闭一些应用程序后重试。")
        return

    # 创建服务器
    handler = MyHttpRequestHandler
    httpd = None

    try:
        # 设置允许地址重用，避免端口占用问题
        socketserver.TCPServer.allow_reuse_address = True

        # 创建服务器
        httpd = socketserver.TCPServer(("", PORT), handler)
        httpd_global = httpd  # 保存到全局变量，便于信号处理函数访问

        # 输出服务器信息
        print(f"服务器已启动在 http://localhost:{PORT}")
        print("按 Ctrl+C 停止服务器")
        print("如果 Ctrl+C 无效，请在任务管理器中结束 Python 进程")

        # 打开浏览器
        #webbrowser.open(f'http://localhost:{PORT}')

        # 设置超时，使serve_forever能够定期检查中断信号
        httpd.timeout = 1.0

        # 使用自定义循环代替serve_forever，以便更好地响应中断
        while running:
            httpd.handle_request()

    except KeyboardInterrupt:
        print("\n收到终止信号，服务器正在停止...")
    except Exception as e:
        print(f"启动服务器时出错: {e}")
    finally:
        # 确保在任何情况下都关闭服务器
        if httpd:
            print("关闭服务器...")
            httpd.server_close()
            print("服务器已停止")

# 全局变量，用于控制服务器运行状态
running = True
httpd_global = None

# 信号处理函数
def signal_handler(sig, frame):
    global running, httpd_global
    print("\n收到终止信号 (Ctrl+C)，服务器正在停止...")
    running = False

    # 如果服务器实例存在，尝试关闭它
    if httpd_global:
        print("正在关闭服务器...")
        httpd_global.server_close()
        print("服务器已停止")

    # 等待一秒，确保消息显示
    time.sleep(1)

    # 强制退出程序
    sys.exit(0)

if __name__ == "__main__":
    # 注册信号处理程序
    signal.signal(signal.SIGINT, signal_handler)  # Ctrl+C
    signal.signal(signal.SIGTERM, signal_handler)  # 终止信号

    # 启动服务器
    start_server()
