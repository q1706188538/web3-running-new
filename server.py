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

class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super().end_headers()
    
    def log_message(self, format, *args):
        # 减少日志输出
        if 'GET /favicon.ico' not in args[0]:
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
    # 查找可用端口
    PORT = find_free_port()
    if PORT is None:
        print("无法找到可用端口，请关闭一些应用程序后重试。")
        return
    
    # 创建服务器
    handler = MyHttpRequestHandler
    
    try:
        httpd = socketserver.TCPServer(("", PORT), handler)
        
        # 输出服务器信息
        print(f"服务器已启动在 http://localhost:{PORT}")
        print("按 Ctrl+C 停止服务器")
        
        # 打开浏览器
        webbrowser.open(f'http://localhost:{PORT}')
        
        # 启动服务器
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
        if 'httpd' in locals():
            httpd.server_close()
    except Exception as e:
        print(f"启动服务器时出错: {e}")

if __name__ == "__main__":
    start_server()
