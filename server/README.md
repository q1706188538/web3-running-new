# 游戏数据后端服务器

这是一个简单的后端服务器，用于保存和获取与钱包地址关联的用户游戏数据。

## 功能

- 保存和获取用户游戏进度
- 保存和获取用户金币余额
- 保存和获取用户成就
- 保存和获取用户最高分

## 安装

1. 确保已安装Node.js（建议版本14或更高）
2. 进入server目录
3. 安装依赖：

```bash
npm install
```

## 启动服务器

```bash
npm start
```

服务器将在端口3000上启动。

## API端点

### 健康检查

```
GET /health
```

返回服务器状态。

### 获取用户数据

```
GET /api/user/:walletAddress
```

返回与钱包地址关联的所有用户数据。

### 保存用户数据

```
POST /api/user/:walletAddress
```

保存与钱包地址关联的用户数据。

请求体示例：

```json
{
  "progress": {
    "level": 5,
    "score": 1000,
    "distance": 2500
  },
  "coins": 150,
  "highScore": 2000,
  "achievements": ["level_1", "level_2", "coins_100"]
}
```

### 更新用户数据（部分更新）

```
PATCH /api/user/:walletAddress
```

更新与钱包地址关联的部分用户数据。

请求体示例：

```json
{
  "progress": {
    "level": 6
  }
}
```

### 获取用户金币

```
GET /api/user/:walletAddress/coins
```

返回与钱包地址关联的金币余额。

### 更新用户金币

```
POST /api/user/:walletAddress/coins
```

更新与钱包地址关联的金币余额。

请求体示例：

```json
{
  "coins": 50,
  "operation": "add"  // 或 "set"
}
```

## 数据存储

用户数据以JSON文件形式存储在`data`目录中，文件名为钱包地址的小写形式。

## 安全注意事项

这是一个简单的演示服务器，不适合生产环境使用。在生产环境中，应该：

1. 添加适当的身份验证和授权
2. 使用HTTPS加密通信
3. 使用更可靠的数据库存储数据
4. 添加速率限制和其他安全措施

## 与前端集成

前端通过`ApiService`模块与后端通信。如果后端服务器不可用，前端会自动回退到使用localStorage存储数据。
