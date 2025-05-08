# 神庙逃亡游戏

## 端口配置

- 前端服务器: 9000
- 后端服务器: 9001

## 部署说明

### 方法一：使用启动脚本

1. 确保已安装 Node.js 和 npm
2. 给启动脚本添加执行权限：`chmod +x start.sh`
3. 运行启动脚本：`./start.sh`

### 方法二：手动启动

1. 安装根目录依赖：
   ```
   npm install
   ```

2. 安装后端依赖：
   ```
   cd server
   npm install
   cd ..
   ```

3. 启动前端服务器：
   ```
   npm run start-frontend
   ```

4. 启动后端服务器：
   ```
   npm run start-backend
   ```

### 使用 PM2 部署（推荐用于生产环境）

1. 安装 PM2：
   ```
   npm install -g pm2
   ```

2. 启动前端服务器：
   ```
   pm2 start server-frontend.js --name "temple-run-frontend"
   ```

3. 启动后端服务器：
   ```
   pm2 start server/server.js --name "temple-run-backend"
   ```

4. 设置开机自启：
   ```
   pm2 startup
   pm2 save
   ```

5. 查看运行状态：
   ```
   pm2 status
   ```

## 访问游戏

- 游戏地址：http://localhost:9000
- 后端API地址：http://localhost:9001/api

## 注意事项

- 确保端口 9000 和 9001 未被其他应用占用
- 如需修改端口，请同时更新以下文件：
  - 前端端口：server-frontend.js
  - 后端端口：server/server.js
  - API基础URL：js/api-service.js
