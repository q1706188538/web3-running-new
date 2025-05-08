/**
 * 游戏数据后端服务器
 * 用于保存和获取与钱包地址关联的用户游戏数据
 */

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 数据存储目录
const DATA_DIR = path.join(__dirname, 'data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`创建数据目录: ${DATA_DIR}`);
}

// 中间件
// 配置CORS，允许所有来源
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 解析JSON请求体
app.use(bodyParser.json({
    limit: '1mb',
    extended: true
}));

// 详细的日志中间件
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] ${req.method} ${req.url}`);
    console.log(`请求头: ${JSON.stringify(req.headers, null, 2)}`);

    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`请求体: ${JSON.stringify(req.body, null, 2)}`);
    }

    // 捕获响应
    const originalSend = res.send;
    res.send = function(body) {
        console.log(`响应状态: ${res.statusCode}`);
        console.log(`响应体: ${body}`);
        return originalSend.call(this, body);
    };

    next();
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 检查data目录端点
app.get('/check-data-dir', (req, res) => {
    try {
        // 确保data目录存在
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log(`创建数据目录: ${DATA_DIR}`);
        }

        // 读取data目录内容
        const files = fs.readdirSync(DATA_DIR);
        console.log(`数据目录内容: ${files.join(', ') || '(空)'}`);

        // 返回目录内容
        res.status(200).json({
            dataDir: DATA_DIR,
            files: files,
            isEmpty: files.length === 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`检查data目录时出错: ${error.message}`);
        res.status(500).json({ error: `检查data目录时出错: ${error.message}` });
    }
});

// 创建新用户数据端点
app.get('/create-user-data/:walletAddress', (req, res) => {
    try {
        const { walletAddress } = req.params;

        // 验证钱包地址格式
        if (!isValidWalletAddress(walletAddress)) {
            return res.status(400).json({ error: '无效的钱包地址格式' });
        }

        // 确保data目录存在
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log(`创建数据目录: ${DATA_DIR}`);
        }

        // 检查用户数据是否已存在
        const filePath = getUserDataPath(walletAddress);
        if (fs.existsSync(filePath)) {
            console.log(`用户数据已存在: ${filePath}`);

            // 读取现有用户数据
            const existingUserData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // 返回已存在的用户数据
            return res.status(200).json({
                success: true,
                message: `用户数据已存在: ${filePath}`,
                data: existingUserData,
                isNew: false
            });
        }

        // 创建新用户数据 - 简化结构，只包含三个关键数据
        const userData = {
            coins: 0,          // 当前可用金币 (com.gemioli.tombrunner.coins)
            highScore: 0,      // 累计获得金币 (com.gemioli.tombrunner.highscore)
            lastScore: 0,      // 历史最高得分 (com.gemioli.tombrunner.score)
            lastUpdated: new Date().toISOString()
        };

        // 保存新用户数据
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));

        console.log(`已创建新用户数据: ${filePath}`);

        // 读取data目录内容
        const files = fs.readdirSync(DATA_DIR);
        console.log(`数据目录内容: ${files.join(', ') || '(空)'}`);

        // 返回成功信息
        res.status(201).json({
            success: true,
            message: `已创建新用户数据: ${filePath}`,
            data: userData,
            dataDir: DATA_DIR,
            files: files,
            isNew: true
        });
    } catch (error) {
        console.error(`创建新用户数据时出错: ${error.message}`);
        res.status(500).json({ error: `创建新用户数据时出错: ${error.message}` });
    }
});

/**
 * 获取用户数据
 * GET /api/user/:walletAddress
 */
app.get('/api/user/:walletAddress', (req, res) => {
    const { walletAddress } = req.params;

    // 验证钱包地址格式
    if (!isValidWalletAddress(walletAddress)) {
        return res.status(400).json({ error: '无效的钱包地址格式' });
    }

    const filePath = getUserDataPath(walletAddress);

    // 检查用户数据是否存在
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '未找到用户数据' });
    }

    try {
        // 读取用户数据
        const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.status(200).json(userData);
    } catch (error) {
        console.error(`读取用户数据出错: ${error.message}`);
        res.status(500).json({ error: '读取用户数据时出错' });
    }
});

/**
 * 保存用户数据
 * POST /api/user/:walletAddress
 * 请求体: 用户数据对象
 */
app.post('/api/user/:walletAddress', (req, res) => {
    const { walletAddress } = req.params;
    const userData = req.body;

    // 验证钱包地址格式
    if (!isValidWalletAddress(walletAddress)) {
        return res.status(400).json({ error: '无效的钱包地址格式' });
    }

    // 验证请求体
    if (!userData || typeof userData !== 'object') {
        return res.status(400).json({ error: '无效的用户数据' });
    }

    try {
        // 添加时间戳
        userData.lastUpdated = new Date().toISOString();

        // 保存用户数据
        const filePath = getUserDataPath(walletAddress);
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));

        res.status(200).json({ success: true, message: '用户数据已保存' });
    } catch (error) {
        console.error(`保存用户数据出错: ${error.message}`);
        res.status(500).json({ error: '保存用户数据时出错' });
    }
});

/**
 * 更新用户数据（部分更新）
 * PATCH /api/user/:walletAddress
 * 请求体: 部分用户数据对象
 */
app.patch('/api/user/:walletAddress', (req, res) => {
    const { walletAddress } = req.params;
    const updates = req.body;

    // 验证钱包地址格式
    if (!isValidWalletAddress(walletAddress)) {
        return res.status(400).json({ error: '无效的钱包地址格式' });
    }

    // 验证请求体
    if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ error: '无效的更新数据' });
    }

    const filePath = getUserDataPath(walletAddress);

    try {
        // 检查用户数据是否存在
        let userData = {};
        if (fs.existsSync(filePath)) {
            userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        // 处理特殊情况：如果更新包含progress.coins，需要将其添加到当前可用金币中
        if (updates.progress && typeof updates.progress.coins === 'number' && updates.progress.coins > 0) {
            console.log(`检测到游戏进度更新，本次游戏获得金币: ${updates.progress.coins}`);

            // 确保userData.coins存在
            userData.coins = userData.coins || 0;

            // 将本次游戏获得的金币添加到当前可用金币中
            userData.coins += updates.progress.coins;
            console.log(`更新后的当前可用金币: ${userData.coins}`);

            // 同时更新累计获得金币
            userData.highScore = (userData.highScore || 0) + updates.progress.coins;
            console.log(`更新后的累计获得金币: ${userData.highScore}`);
        }

        // 合并更新
        const updatedData = { ...userData, ...updates, lastUpdated: new Date().toISOString() };

        // 保存更新后的数据
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));

        res.status(200).json({ success: true, message: '用户数据已更新' });
    } catch (error) {
        console.error(`更新用户数据出错: ${error.message}`);
        res.status(500).json({ error: '更新用户数据时出错' });
    }
});

/**
 * 获取用户金币
 * GET /api/user/:walletAddress/coins
 */
app.get('/api/user/:walletAddress/coins', (req, res) => {
    const { walletAddress } = req.params;

    // 验证钱包地址格式
    if (!isValidWalletAddress(walletAddress)) {
        return res.status(400).json({ error: '无效的钱包地址格式' });
    }

    const filePath = getUserDataPath(walletAddress);

    try {
        // 检查用户数据是否存在
        if (!fs.existsSync(filePath)) {
            return res.status(200).json({ coins: 0 });
        }

        // 读取用户数据
        const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // 只返回三个关键数据
        res.status(200).json({
            coins: userData.coins || 0,          // 当前可用金币 (com.gemioli.tombrunner.coins)
            highScore: userData.highScore || 0,  // 累计获得金币 (com.gemioli.tombrunner.highscore)
            lastScore: userData.lastScore || 0   // 历史最高得分 (com.gemioli.tombrunner.score)
        });
    } catch (error) {
        console.error(`获取用户金币出错: ${error.message}`);
        res.status(500).json({ error: '获取用户金币时出错' });
    }
});

/**
 * 更新用户金币
 * POST /api/user/:walletAddress/coins
 * 请求体: { coins: 数量, operation: "add"|"set", reason: "购买原因" }
 */
app.post('/api/user/:walletAddress/coins', (req, res) => {
    const { walletAddress } = req.params;
    const { coins, operation = 'add', reason = '' } = req.body;

    // 验证钱包地址格式
    if (!isValidWalletAddress(walletAddress)) {
        return res.status(400).json({ error: '无效的钱包地址格式' });
    }

    // 验证金币数量
    if (typeof coins !== 'number' || isNaN(coins)) {
        return res.status(400).json({ error: '无效的金币数量' });
    }

    const filePath = getUserDataPath(walletAddress);

    try {
        // 读取现有用户数据
        let userData = {};
        if (fs.existsSync(filePath)) {
            userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        // 记录操作原因
        console.log(`金币操作原因: ${reason || '未指定'}`);

        // 更新金币 - 简化逻辑
        if (operation === 'set') {
            // 直接设置当前可用金币
            userData.coins = coins;
            console.log(`设置用户金币为 ${coins}，原因: ${reason || '未指定'}`);
        } else if (operation === 'subtract') {
            // 扣除金币
            const oldCoins = userData.coins || 0;
            userData.coins = Math.max(0, oldCoins - coins);
            console.log(`扣除用户金币 ${coins}，原因: ${reason || '未指定'}, 从 ${oldCoins} 变为 ${userData.coins}`);

            // 如果是购买操作，记录购买历史
            if (reason === 'purchase') {
                // 确保购买历史存在
                userData.purchases = userData.purchases || [];

                // 添加购买记录
                userData.purchases.push({
                    date: new Date().toISOString(),
                    cost: coins,
                    balance: userData.coins
                });

                console.log(`记录购买历史: 花费 ${coins} 金币，剩余 ${userData.coins} 金币`);
            }
        } else {
            // 添加金币
            const oldCoins = userData.coins || 0;
            userData.coins = oldCoins + coins;
            console.log(`添加用户金币 ${coins}，原因: ${reason || '未指定'}, 从 ${oldCoins} 变为 ${userData.coins}`);

            // 只有在添加金币时才更新累计获得金币
            if (coins > 0) {
                // 确保highScore存在
                userData.highScore = userData.highScore || 0;

                // 累加获得的金币到累计金币中
                userData.highScore += coins;
                console.log(`更新用户累计获得金币: ${userData.highScore}`);
            }
        }

        // 确保金币不为负数
        userData.coins = Math.max(0, userData.coins);

        // 添加时间戳
        userData.lastUpdated = new Date().toISOString();

        // 保存更新后的数据
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));

        res.status(200).json({
            success: true,
            coins: userData.coins,
            highScore: userData.highScore || 0,
            reason: reason
        });
    } catch (error) {
        console.error(`更新用户金币出错: ${error.message}`);
        res.status(500).json({ error: '更新用户金币时出错' });
    }
});

/**
 * 获取用户代币余额
 * GET /api/user/:walletAddress/tokens
 */
app.get('/api/user/:walletAddress/tokens', (req, res) => {
    const { walletAddress } = req.params;

    // 验证钱包地址格式
    if (!isValidWalletAddress(walletAddress)) {
        return res.status(400).json({ error: '无效的钱包地址格式' });
    }

    const filePath = getUserDataPath(walletAddress);

    try {
        // 检查用户数据是否存在
        if (!fs.existsSync(filePath)) {
            return res.status(200).json({ tokens: 0 });
        }

        // 读取用户数据
        const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // 返回代币余额
        res.status(200).json({
            tokens: userData.tokens || 0
        });
    } catch (error) {
        console.error(`获取用户代币余额出错: ${error.message}`);
        res.status(500).json({ error: '获取用户代币余额时出错' });
    }
});

/**
 * 兑换代币
 * POST /api/user/:walletAddress/exchange-tokens
 * 请求体: { tokenAmount: 数量, coinsPerToken: 兑换比例, feePercent: 手续费百分比 }
 */
app.post('/api/user/:walletAddress/exchange-tokens', (req, res) => {
    const { walletAddress } = req.params;
    const { tokenAmount, coinsPerToken = 1000, feePercent = 2 } = req.body;

    // 验证钱包地址格式
    if (!isValidWalletAddress(walletAddress)) {
        return res.status(400).json({ error: '无效的钱包地址格式' });
    }

    // 验证代币数量
    if (typeof tokenAmount !== 'number' || tokenAmount <= 0) {
        return res.status(400).json({ error: '无效的代币数量' });
    }

    const filePath = getUserDataPath(walletAddress);

    try {
        // 读取现有用户数据
        let userData = {};
        if (fs.existsSync(filePath)) {
            userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        // 计算需要的金币数量
        const requiredCoins = tokenAmount * coinsPerToken;

        // 计算手续费
        const feePercentage = feePercent / 100;
        const feeAmount = Math.ceil(requiredCoins * feePercentage);
        const totalCoinsNeeded = requiredCoins + feeAmount;

        console.log(`兑换代币: ${tokenAmount} 个代币，需要 ${requiredCoins} 金币，手续费 ${feeAmount} 金币，总计 ${totalCoinsNeeded} 金币`);

        // 检查金币是否足够
        const currentCoins = userData.coins || 0;
        if (currentCoins < totalCoinsNeeded) {
            return res.status(400).json({
                error: `金币不足，需要 ${totalCoinsNeeded} 金币，当前余额 ${currentCoins} 金币`,
                required: totalCoinsNeeded,
                current: currentCoins
            });
        }

        // 扣除金币
        userData.coins = currentCoins - totalCoinsNeeded;
        console.log(`扣除金币: ${totalCoinsNeeded}，剩余金币: ${userData.coins}`);

        // 增加代币
        userData.tokens = (userData.tokens || 0) + tokenAmount;
        console.log(`增加代币: ${tokenAmount}，当前代币余额: ${userData.tokens}`);

        // 确保兑换历史记录存在
        userData.exchangeHistory = userData.exchangeHistory || [];

        // 添加兑换记录
        const exchangeRecord = {
            date: new Date().toISOString(),
            tokenAmount: tokenAmount,
            coinsAmount: requiredCoins,
            feeAmount: feeAmount,
            totalCoins: totalCoinsNeeded,
            coinsPerToken: coinsPerToken,
            feePercent: feePercent,
            coinsBalanceAfter: userData.coins,
            tokensBalanceAfter: userData.tokens
        };

        userData.exchangeHistory.push(exchangeRecord);
        console.log(`添加兑换记录:`, exchangeRecord);

        // 添加时间戳
        userData.lastUpdated = new Date().toISOString();

        // 保存更新后的数据
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));

        res.status(200).json({
            success: true,
            tokens: userData.tokens,
            coins: userData.coins,
            exchanged: tokenAmount,
            coinsUsed: totalCoinsNeeded,
            feeAmount: feeAmount,
            record: exchangeRecord
        });
    } catch (error) {
        console.error(`兑换代币出错: ${error.message}`);
        res.status(500).json({ error: '兑换代币时出错' });
    }
});

/**
 * 获取兑换历史
 * GET /api/user/:walletAddress/exchange-history
 */
app.get('/api/user/:walletAddress/exchange-history', (req, res) => {
    const { walletAddress } = req.params;

    // 验证钱包地址格式
    if (!isValidWalletAddress(walletAddress)) {
        return res.status(400).json({ error: '无效的钱包地址格式' });
    }

    const filePath = getUserDataPath(walletAddress);

    try {
        // 检查用户数据是否存在
        if (!fs.existsSync(filePath)) {
            return res.status(200).json({ history: [] });
        }

        // 读取用户数据
        const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // 返回兑换历史
        res.status(200).json({
            history: userData.exchangeHistory || []
        });
    } catch (error) {
        console.error(`获取兑换历史出错: ${error.message}`);
        res.status(500).json({ error: '获取兑换历史时出错' });
    }
});

// 辅助函数：获取用户数据文件路径
function getUserDataPath(walletAddress) {
    // 使用钱包地址的小写形式作为文件名
    const fileName = `${walletAddress.toLowerCase()}.json`;
    return path.join(DATA_DIR, fileName);
}

// 辅助函数：验证钱包地址格式
function isValidWalletAddress(address) {
    if (!address) return false;

    // 更宽松的验证：以0x开头的至少10位字符
    const isValid = /^0x[a-fA-F0-9]{10,}$/.test(address);

    console.log(`验证钱包地址: ${address}, 结果: ${isValid}`);

    return isValid;
}

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器已启动，监听端口 ${PORT}`);
    console.log(`数据存储目录: ${DATA_DIR}`);
});
