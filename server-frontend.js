/**
 * 前端静态文件服务器
 * 用于托管游戏文件
 */

const express = require('express');
const path = require('path');

// 创建Express应用
const app = express();
const PORT = 9000; // 固定端口为9000

// 设置静态文件目录
app.use(express.static(__dirname));

// 设置默认首页
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`前端服务器已启动，监听端口 ${PORT}`);
    console.log(`访问地址: http://localhost:${PORT}`);
});
