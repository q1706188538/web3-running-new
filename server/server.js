/**
 * 游戏数据后端服务器
 * 用于保存和获取与钱包地址关联的用户游戏数据
 */

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const {
    generateExchangeSignature,
    generateRechargeSignature,
    verifySignature,
    GAME_SERVER_ADDRESS
} = require('./sign-exchange');
const GameVerifier = require('./game-verifier');

// 创建Express应用
const app = express();
const PORT = 9000; // 修改端口为9000，与前端一致

// 数据存储目录
const DATA_DIR = path.join(__dirname, 'data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`创建数据目录: ${DATA_DIR}`);
}

// 中间件
// 配置CORS，允许所有来源和所有请求头，并添加额外的响应头
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires', '*'],
    credentials: true
}));

// 添加额外的CORS和安全相关头
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Referrer-Policy', 'no-referrer-when-downgrade');
    next();
});

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
app.get('/health', (_, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        gameServerAddress: GAME_SERVER_ADDRESS
    });
});

// 检查data目录端点
app.get('/check-data-dir', (_, res) => {
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
 * 获取用户代币余额（使用代币持有者地址）- 已弃用，现在使用Web3合约直接获取
 * GET /api/token-balance/:walletAddress/:tokenHolderAddress
 */
app.get('/api/token-balance/:walletAddress/:tokenHolderAddress', (req, res) => {
    const { walletAddress, tokenHolderAddress } = req.params;
    console.log(`[已弃用] 获取用户代币余额 - 钱包地址: ${walletAddress}, 代币持有者地址: ${tokenHolderAddress}`);
    console.log('此API端点已弃用，请使用Web3合约直接获取代币余额');

    // 返回0作为余额
    res.status(200).json({
        walletAddress,
        tokenHolderAddress,
        balance: 0,
        deprecated: true,
        message: '此API端点已弃用，请使用Web3合约直接获取代币余额'
    });
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
 * 获取排行榜数据
 * GET /api/leaderboard-data
 */
app.get('/api/leaderboard-data', async (req, res) => {
    console.log('请求排行榜数据...');
    try {
        const files = await fs.promises.readdir(DATA_DIR); // 使用 fs.promises
        const jsonDataFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');
        
        let leaderboard = [];

        for (const fileName of jsonDataFiles) {
            try {
                const filePath = path.join(DATA_DIR, fileName);
                const fileContent = await fs.promises.readFile(filePath, 'utf-8');
                const userData = JSON.parse(fileContent);
                
                const userId = path.basename(fileName, '.json');
                
                if (userData && typeof userData.lastScore === 'number') {
                    leaderboard.push({
                        userId: userId,
                        score: userData.lastScore
                    });
                } else {
                    console.warn(`用户数据文件 ${fileName} 中缺少 lastScore 或格式不正确。`);
                }
            } catch (parseError) {
                console.error(`解析文件 ${fileName} 的JSON时出错:`, parseError);
            }
        }

        // 按分数降序排序
        leaderboard.sort((a, b) => b.score - a.score);

        console.log(`成功获取并排序了 ${leaderboard.length} 条排行榜数据。`);
        res.status(200).json(leaderboard);

    } catch (error) {
        console.error('获取排行榜数据时出错:', error);
        res.status(500).json({ error: '获取排行榜数据失败' });
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





/**
 * 取消兑换，退还金币
 * POST /api/cancel-exchange
 * 请求体: { playerAddress, tokenAmount, gameCoins, nonce, reason }
 */
app.post('/api/cancel-exchange', async (req, res) => {
    console.log('收到取消兑换请求:', req.body);

    const { playerAddress, tokenAmount, gameCoins, nonce, reason = '用户取消交易' } = req.body;

    // 验证参数
    if (!playerAddress) {
        return res.status(400).json({ success: false, error: '玩家地址不能为空' });
    }

    if (!tokenAmount || tokenAmount <= 0) {
        return res.status(400).json({ success: false, error: '代币数量必须大于0' });
    }

    if (!gameCoins || gameCoins <= 0) {
        return res.status(400).json({ success: false, error: '游戏金币数量必须大于0' });
    }

    if (!nonce) {
        return res.status(400).json({ success: false, error: 'nonce不能为空' });
    }

    try {
        // 验证钱包地址格式
        if (!isValidWalletAddress(playerAddress)) {
            return res.status(400).json({ success: false, error: '无效的钱包地址格式' });
        }

        // 获取用户数据文件路径
        const filePath = getUserDataPath(playerAddress);

        // 检查用户数据是否存在
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: '未找到用户数据' });
        }

        // 读取用户数据
        const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // 检查兑换历史记录
        userData.exchangeHistory = userData.exchangeHistory || [];

        // 查找对应的兑换记录
        const exchangeRecord = userData.exchangeHistory.find(record =>
            record.nonce === nonce &&
            record.status === 'pending' &&
            record.gameCoins === gameCoins &&
            record.tokenAmount === tokenAmount &&
            record.playerAddress.toLowerCase() === playerAddress.toLowerCase()
        );

        if (!exchangeRecord) {
            console.log('未找到对应的兑换记录，可能已经处理过或不存在');

            // 检查是否已经被取消过
            const cancelledRecord = userData.exchangeHistory.find(record =>
                record.nonce === nonce &&
                record.status === 'cancelled'
            );

            if (cancelledRecord) {
                console.log('该交易已经被取消过:', cancelledRecord);
                return res.status(400).json({
                    success: false,
                    error: '该交易已经被取消过，不能重复取消',
                    currentCoins: userData.coins || 0,
                    cancelledAt: cancelledRecord.cancelledAt
                });
            }

            return res.status(404).json({
                success: false,
                error: '未找到对应的兑换记录，可能已经处理过或不存在',
                currentCoins: userData.coins || 0
            });
        }

        // 添加时间验证，只允许取消5分钟内的交易
        const createdAt = new Date(exchangeRecord.createdAt);
        const now = new Date();
        const timeDiff = now.getTime() - createdAt.getTime();
        const fiveMinutes = 5 * 60 * 1000; // 5分钟（毫秒）

        if (timeDiff > fiveMinutes) {
            console.log('交易已超过5分钟，不能取消');
            return res.status(400).json({
                success: false,
                error: '交易已超过5分钟，不能取消',
                currentCoins: userData.coins || 0,
                createdAt: exchangeRecord.createdAt,
                timeDiff: Math.floor(timeDiff / 1000) + '秒'
            });
        }

        // 更新兑换记录状态
        exchangeRecord.status = 'cancelled';
        exchangeRecord.cancelReason = reason;
        exchangeRecord.cancelledAt = new Date().toISOString();

        // 退还金币
        const currentCoins = userData.coins || 0;
        const refundedCoins = gameCoins;
        userData.coins = currentCoins + refundedCoins;

        console.log(`退还金币: ${refundedCoins}，当前金币: ${userData.coins}`);

        // 更新时间戳
        userData.lastUpdated = new Date().toISOString();

        // 保存更新后的数据
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
        console.log(`用户数据已更新，金币已退还`);

        // 返回结果
        res.status(200).json({
            success: true,
            coins: userData.coins,
            refundedCoins: refundedCoins,
            message: '兑换已取消，金币已退还'
        });
    } catch (error) {
        console.error('取消兑换时出错:', error);
        res.status(500).json({ success: false, error: error.message || '取消兑换时出错' });
    }
});

/**
 * 获取兑换签名
 * POST /api/sign-exchange
 * 请求体: { playerAddress, tokenAmount, gameCoins, contractAddress }
 */
app.post('/api/sign-exchange', async (req, res) => {
    console.log('收到签名请求:', req.body);

    const { playerAddress, tokenAmount, gameCoins, contractAddress } = req.body;

    // 验证参数
    if (!playerAddress) {
        return res.status(400).json({ success: false, error: '玩家地址不能为空' });
    }

    if (!tokenAmount || tokenAmount <= 0) {
        return res.status(400).json({ success: false, error: '代币数量必须大于0' });
    }

    if (!gameCoins || gameCoins <= 0) {
        return res.status(400).json({ success: false, error: '游戏金币数量必须大于0' });
    }

    if (!contractAddress) {
        return res.status(400).json({ success: false, error: '合约地址不能为空' });
    }

    // 验证钱包地址格式
    if (!isValidWalletAddress(playerAddress)) {
        return res.status(400).json({ success: false, error: '无效的玩家地址格式' });
    }

    if (!isValidWalletAddress(contractAddress)) {
        return res.status(400).json({ success: false, error: '无效的合约地址格式' });
    }

    try {
        // 首先检查用户是否有足够的金币
        const filePath = getUserDataPath(playerAddress);

        // 读取现有用户数据
        let userData = {};
        if (fs.existsSync(filePath)) {
            userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } else {
            return res.status(400).json({ success: false, error: '用户数据不存在，请先创建用户数据' });
        }

        // 获取当前金币余额
        const currentCoins = userData.coins || 0;

        // 检查金币是否足够
        if (currentCoins < gameCoins) {
            return res.status(400).json({
                success: false,
                error: `金币不足，需要 ${gameCoins} 金币，当前余额 ${currentCoins} 金币`,
                required: gameCoins,
                current: currentCoins
            });
        }

        // 扣除金币
        userData.coins = currentCoins - gameCoins;
        console.log(`扣除金币: ${gameCoins}，剩余金币: ${userData.coins}`);

        // 添加兑换记录
        userData.exchangeHistory = userData.exchangeHistory || [];

        // 生成签名
        const result = await generateExchangeSignature(playerAddress, tokenAmount, gameCoins, contractAddress);

        if (!result.success) {
            return res.status(500).json({ success: false, error: result.error || '生成签名失败' });
        }

        // 验证签名（可选，用于调试）
        const verifyResult = await verifySignature(playerAddress, tokenAmount, gameCoins, result.nonce, contractAddress, result.signature);
        console.log('签名验证结果:', verifyResult);

        // 添加兑换记录
        const exchangeRecord = {
            date: new Date().toISOString(),
            createdAt: new Date().toISOString(), // 添加创建时间，用于时间验证
            tokenAmount: tokenAmount,
            gameCoins: gameCoins, // 使用gameCoins作为字段名，与cancel-exchange端点一致
            playerAddress: playerAddress, // 添加玩家地址，用于验证
            nonce: result.nonce,
            signature: result.signature,
            contractAddress: contractAddress,
            coinsBalanceAfter: userData.coins,
            status: 'pending' // 添加状态，用于跟踪兑换记录的状态
        };

        userData.exchangeHistory.push(exchangeRecord);
        console.log(`添加兑换记录:`, exchangeRecord);

        // 更新时间戳
        userData.lastUpdated = new Date().toISOString();

        // 保存更新后的数据
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
        console.log(`用户数据已更新，金币已扣除`);

        // 返回签名
        res.status(200).json({
            success: true,
            signature: result.signature,
            nonce: result.nonce,
            signer: GAME_SERVER_ADDRESS,
            coinsDeducted: gameCoins,
            coinsRemaining: userData.coins,
            message: '签名生成成功，金币已扣除'
        });
    } catch (error) {
        console.error('生成签名时出错:', error);
        res.status(500).json({ success: false, error: error.message || '生成签名时出错' });
    }
});

/**
 * 获取充值签名
 * POST /api/sign-recharge
 * 请求体: { playerAddress, tokenAmount, gameCoins, contractAddress }
 */
app.post('/api/sign-recharge', async (req, res) => {
    console.log('收到充值签名请求:', req.body);

    const { playerAddress, tokenAmount, gameCoins, contractAddress } = req.body;

    // 验证参数
    if (!playerAddress) {
        return res.status(400).json({ success: false, error: '玩家地址不能为空' });
    }

    if (!tokenAmount || tokenAmount <= 0) {
        return res.status(400).json({ success: false, error: '代币数量必须大于0' });
    }

    if (!gameCoins || gameCoins <= 0) {
        return res.status(400).json({ success: false, error: '游戏金币数量必须大于0' });
    }

    if (!contractAddress) {
        return res.status(400).json({ success: false, error: '合约地址不能为空' });
    }

    // 验证钱包地址格式
    if (!isValidWalletAddress(playerAddress)) {
        return res.status(400).json({ success: false, error: '无效的玩家地址格式' });
    }

    if (!isValidWalletAddress(contractAddress)) {
        return res.status(400).json({ success: false, error: '无效的合约地址格式' });
    }

    try {
        // 读取现有用户数据
        const filePath = getUserDataPath(playerAddress);
        let userData = {};

        if (fs.existsSync(filePath)) {
            userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } else {
            // 如果用户数据不存在，创建新的用户数据
            userData = {
                coins: 0,
                highScore: 0,
                lastScore: 0,
                lastUpdated: new Date().toISOString()
            };
        }

        // 确保充值历史记录存在
        userData.rechargeHistory = userData.rechargeHistory || [];

        // 生成签名
        const result = await generateRechargeSignature(playerAddress, tokenAmount, gameCoins, contractAddress);

        if (!result.success) {
            return res.status(500).json({ success: false, error: result.error || '生成充值签名失败' });
        }

        // 验证签名（可选，用于调试）
        const verifyResult = await verifySignature(playerAddress, tokenAmount, gameCoins, result.nonce, contractAddress, result.signature);
        console.log('充值签名验证结果:', verifyResult);

        // 添加充值记录
        const rechargeRecord = {
            date: new Date().toISOString(),
            tokenAmount: tokenAmount,
            gameCoinsToGain: gameCoins,
            nonce: result.nonce,
            signature: result.signature,
            contractAddress: contractAddress,
            status: 'pending' // 初始状态为待处理
        };

        userData.rechargeHistory.push(rechargeRecord);
        console.log(`添加充值记录:`, rechargeRecord);

        // 更新时间戳
        userData.lastUpdated = new Date().toISOString();

        // 保存更新后的数据
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
        console.log(`用户数据已更新，充值记录已添加`);

        // 返回签名
        res.status(200).json({
            success: true,
            signature: result.signature,
            nonce: result.nonce,
            signer: GAME_SERVER_ADDRESS,
            gameCoinsToGain: gameCoins,
            message: '充值签名生成成功'
        });
    } catch (error) {
        console.error('生成充值签名时出错:', error);
        res.status(500).json({ success: false, error: error.message || '生成充值签名时出错' });
    }
});

/**
 * 确认充值完成，添加金币
 * POST /api/confirm-recharge
 * 请求体: { playerAddress, tokenAmount, gameCoins, nonce, txHash }
 */
app.post('/api/confirm-recharge', async (req, res) => {
    console.log('收到充值确认请求:', req.body);

    const { playerAddress, tokenAmount, gameCoins, nonce, txHash } = req.body;

    // 验证参数
    if (!playerAddress) {
        return res.status(400).json({ success: false, error: '玩家地址不能为空' });
    }

    if (!tokenAmount || tokenAmount <= 0) {
        return res.status(400).json({ success: false, error: '代币数量必须大于0' });
    }

    if (!gameCoins || gameCoins <= 0) {
        return res.status(400).json({ success: false, error: '游戏金币数量必须大于0' });
    }

    if (!nonce) {
        return res.status(400).json({ success: false, error: 'nonce不能为空' });
    }

    if (!txHash) {
        return res.status(400).json({ success: false, error: '交易哈希不能为空' });
    }

    // 验证钱包地址格式
    if (!isValidWalletAddress(playerAddress)) {
        return res.status(400).json({ success: false, error: '无效的玩家地址格式' });
    }

    try {
        // 读取现有用户数据
        const filePath = getUserDataPath(playerAddress);
        if (!fs.existsSync(filePath)) {
            return res.status(400).json({ success: false, error: '用户数据不存在' });
        }

        let userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // 确保充值历史记录存在
        userData.rechargeHistory = userData.rechargeHistory || [];

        // 查找对应的充值记录
        const rechargeIndex = userData.rechargeHistory.findIndex(record =>
            record.nonce === nonce && record.status === 'pending');

        if (rechargeIndex === -1) {
            return res.status(400).json({
                success: false,
                error: '找不到对应的待处理充值记录，可能已经处理或不存在'
            });
        }

        const rechargeRecord = userData.rechargeHistory[rechargeIndex];

        // 验证充值记录中的金币数量是否与请求中的一致
        if (rechargeRecord.gameCoinsToGain !== gameCoins) {
            return res.status(400).json({
                success: false,
                error: `充值记录中的金币数量(${rechargeRecord.gameCoinsToGain})与请求中的(${gameCoins})不一致`
            });
        }

        // 验证充值记录中的代币数量是否与请求中的一致
        if (rechargeRecord.tokenAmount !== tokenAmount) {
            return res.status(400).json({
                success: false,
                error: `充值记录中的代币数量(${rechargeRecord.tokenAmount})与请求中的(${tokenAmount})不一致`
            });
        }

        // 更新充值记录状态
        userData.rechargeHistory[rechargeIndex].status = 'completed';
        userData.rechargeHistory[rechargeIndex].txHash = txHash;
        userData.rechargeHistory[rechargeIndex].completedAt = new Date().toISOString();

        // 添加金币
        const oldCoins = userData.coins || 0;
        userData.coins = oldCoins + gameCoins;
        console.log(`添加金币: ${gameCoins}，当前金币余额: ${userData.coins}`);

        // 更新时间戳
        userData.lastUpdated = new Date().toISOString();

        // 保存更新后的数据
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
        console.log(`用户数据已更新，充值已完成，金币已添加`);

        // 返回结果
        res.status(200).json({
            success: true,
            coins: userData.coins,
            addedCoins: gameCoins,
            message: '充值确认成功，金币已添加'
        });
    } catch (error) {
        console.error('确认充值时出错:', error);
        res.status(500).json({ success: false, error: error.message || '确认充值时出错' });
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



/**
 * 验证游戏数据校验码
 * POST /api/verify-game-data
 * 请求体: { walletAddress, gameCoins, verification, gameScore, isNewHighScore }
 */
app.post('/api/verify-game-data', (req, res) => {
    console.log('收到游戏数据验证请求:', req.body);

    const { walletAddress, gameCoins, verification, gameScore, isNewHighScore } = req.body;

    // 验证参数
    if (!walletAddress) {
        return res.status(400).json({ success: false, error: '钱包地址不能为空' });
    }

    if (gameCoins === undefined || gameCoins < 0) {
        return res.status(400).json({ success: false, error: '游戏金币数量无效' });
    }

    if (!verification || !verification.code || !verification.timestamp) {
        return res.status(400).json({ success: false, error: '验证数据无效' });
    }

    try {
        // 验证钱包地址格式
        if (!isValidWalletAddress(walletAddress)) {
            return res.status(400).json({ success: false, error: '无效的钱包地址格式' });
        }

        // 验证校验码
        const verificationData = {
            code: verification.code,
            wallet: walletAddress.toLowerCase(),
            coins: gameCoins,
            timestamp: verification.timestamp
        };

        const isValid = GameVerifier.verifyCode(verificationData);

        if (!isValid) {
            console.error('校验码验证失败');
            return res.status(400).json({
                success: false,
                error: '校验码验证失败，游戏数据可能被篡改'
            });
        }

        // 获取用户数据文件路径
        const filePath = getUserDataPath(walletAddress);

        // 读取现有用户数据
        let userData = {};
        if (fs.existsSync(filePath)) {
            userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        // 更新金币
        const oldCoins = userData.coins || 0;
        userData.coins = oldCoins + gameCoins;
        console.log(`添加用户金币 ${gameCoins}，从 ${oldCoins} 变为 ${userData.coins}`);

        // 更新累计获得金币
        userData.highScore = (userData.highScore || 0) + gameCoins;
        console.log(`更新用户累计获得金币: ${userData.highScore}`);

        // 更新最高得分（如果有）
        if (gameScore !== undefined && gameScore > 0) {
            const currentLastScore = userData.lastScore || 0;

            // 如果是新的最高得分，或者当前得分高于历史最高得分
            if (isNewHighScore || gameScore > currentLastScore) {
                userData.lastScore = gameScore;
                console.log(`更新用户最高得分: ${currentLastScore} -> ${gameScore}`);
            } else {
                console.log(`当前得分 ${gameScore} 不高于历史最高得分 ${currentLastScore}，不更新`);
            }
        }

        // 添加时间戳
        userData.lastUpdated = new Date().toISOString();

        // 保存更新后的数据
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));

        // 返回结果
        res.status(200).json({
            success: true,
            coins: userData.coins,
            highScore: userData.highScore,
            lastScore: userData.lastScore || 0,
            message: '校验成功，金币和得分已更新'
        });
    } catch (error) {
        console.error('验证游戏数据出错:', error);
        res.status(500).json({
            success: false,
            error: error.message || '验证游戏数据时出错'
        });
    }
});

// 设置静态文件服务
// 注意：静态文件服务应该放在所有API路由之后
// 使用上一级目录（项目根目录）作为静态文件目录
app.use(express.static(path.join(__dirname, '..')));

// 设置默认首页
app.get('/', (_, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器已启动，监听 0.0.0.0:${PORT}`);
    console.log(`数据存储目录: ${DATA_DIR}`);
    console.log(`游戏服务器地址: ${GAME_SERVER_ADDRESS}`);
    console.log(`静态文件目录: ${path.join(__dirname, '..')}`);
    console.log(`访问地址: http://localhost:${PORT}`);
});
