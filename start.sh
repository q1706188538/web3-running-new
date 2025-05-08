#!/bin/bash

# 安装依赖
echo "安装根目录依赖..."
npm install

echo "安装后端依赖..."
cd server
npm install
cd ..

# 启动服务
echo "启动前端和后端服务..."
npm start
