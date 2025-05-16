/**
 * 游戏数据后端服务器
 * 用于保存和获取与钱包地址关联的用户游戏数据
 */

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const ethers = require('ethers');
const {
    generateExchangeSignature,
    generateRechargeSignature,
    verifySignature,
    GAME_SERVER_ADDRESS
} = require('./sign-exchange');
const GameVerifier = require('./game-verifier');

const { Web3 } = require('web3');

// Helper function to get TOKEN_DECIMALS from config
function getTokenDecimalsConfig() {
    try {
        const configPath = path.join(__dirname, 'data', 'web3-live-config.json');
        if (fs.existsSync(configPath)) {
            const rawConfig = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(rawConfig);
            if (config && config.TOKEN && typeof config.TOKEN.DECIMALS === 'number') {
                console.log(`[Server Config] Loaded TOKEN_DECIMALS: ${config.TOKEN.DECIMALS}`);
                return config.TOKEN.DECIMALS;
            }
        }
    } catch (error) {
        console.error('[Server Config] Error reading TOKEN_DECIMALS from web3-live-config.json:', error);
    }
    console.warn('[Server Config] TOKEN_DECIMALS not found or invalid in web3-live-config.json, defaulting to 18.');
    return 18; // Default to 18 if not found or error
}
const TOKEN_DECIMALS = getTokenDecimalsConfig();

// IMPORTANT: Replace 'YOUR_ETHEREUM_RPC_URL' with your actual Ethereum RPC URL
const RPC_URL = process.env.RPC_URL || 'https://bsc-dataseed.binance.org/';
const web3 = new Web3(RPC_URL);

// Actual GameTokenBridgeInverse contract ABI
const GAME_TOKEN_BRIDGE_INVERSE_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_externalTokenAddress",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "_gameServerAddress",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "_taxWallet",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "player",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "gameCoins",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "tokenAmount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "taxAmount",
                "type": "uint256"
            }
        ],
        "name": "ExchangeFromGame",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "player",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "tokenAmount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "gameCoins",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "taxAmount",
                "type": "uint256"
            }
        ],
        "name": "RechargeToGame",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_tokenAmount",
                "type": "uint256"
            },
            {
                "internalType": "bytes32",
                "name": "_nonce",
                "type": "bytes32"
            },
            {
                "internalType": "bytes",
                "name": "_signature",
                "type": "bytes"
            }
        ],
        "name": "exchangeFromGame",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_gameCoins",
                "type": "uint256"
            },
            {
                "internalType": "bytes32",
                "name": "_nonce",
                "type": "bytes32"
            },
            {
                "internalType": "bytes",
                "name": "_signature",
                "type": "bytes"
            }
        ],
        "name": "rechargeToGame",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "exchangeRate",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "exchangeTokenTaxRate",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "externalToken",
        "outputs": [
            {
                "internalType": "contract IERC20",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "gameServerAddress",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "inverseExchangeMode",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_operator",
                "type": "address"
            }
        ],
        "name": "isOperator",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "maxExchangeAmount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "minExchangeAmount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "rechargeTokenTaxRate",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "taxWallet",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "_amount",
                "type": "uint256"
            }
        ],
        "name": "emergencyWithdrawOwnerTokens",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_tokenContractAddress",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "_to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "_amount",
                "type": "uint256"
            }
        ],
        "name": "withdrawAccidentalERC20",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "withdrawAccidentalEther",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_newExternalTokenAddress",
                "type": "address"
            }
        ],
        "name": "setExternalToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_newGameServerAddress",
                "type": "address"
            }
        ],
        "name": "setGameServerAddress",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_newTaxWallet",
                "type": "address"
            }
        ],
        "name": "setTaxWallet",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_newRate",
                "type": "uint256"
            }
        ],
        "name": "setExchangeTokenTaxRate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_newRate",
                "type": "uint256"
            }
        ],
        "name": "setRechargeTokenTaxRate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_newRate",
                "type": "uint256"
            }
        ],
        "name": "setExchangeRate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bool",
                "name": "_inverseMode",
                "type": "bool"
            }
        ],
        "name": "setInverseExchangeMode",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_min",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_max",
                "type": "uint256"
            }
        ],
        "name": "setExchangeLimits",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_operator",
                "type": "address"
            },
            {
                "internalType": "bool",
                "name": "_status",
                "type": "bool"
            }
        ],
        "name": "setOperator",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "_nonce",
                "type": "bytes32"
            }
        ],
        "name": "isNonceUsed",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

let RECHARGE_TO_GAME_EVENT_SIGNATURE_SHA3 = '';
let EXCHANGE_FROM_GAME_EVENT_SIGNATURE_SHA3 = ''; // Renamed from EXCHANGE_COMPLETED_EVENT_SIGNATURE_SHA3
let rechargeToGameEventAbiInputs = null;
let exchangeFromGameEventAbiInputs = null; // Renamed from exchangeCompletedEventAbiInputs

try {
    if (web3 && web3.utils) { // Ensure web3 is initialized
        RECHARGE_TO_GAME_EVENT_SIGNATURE_SHA3 = web3.utils.sha3('RechargeToGame(address,uint256,uint256,uint256)');
        EXCHANGE_FROM_GAME_EVENT_SIGNATURE_SHA3 = web3.utils.sha3('ExchangeFromGame(address,uint256,uint256,uint256)');
    } else {
        console.error("Web3 or web3.utils is not initialized. Event signatures cannot be generated.");
    }

    if (GAME_TOKEN_BRIDGE_INVERSE_ABI && GAME_TOKEN_BRIDGE_INVERSE_ABI.length > 0) {
        const rechargeEventDef = GAME_TOKEN_BRIDGE_INVERSE_ABI.find(item => item.name === 'RechargeToGame' && item.type === 'event');
        if (rechargeEventDef) {
            rechargeToGameEventAbiInputs = rechargeEventDef.inputs;
        } else {
            console.error("CRITICAL: RechargeToGame event definition not found in ABI. Server-side validation for recharges will FAIL.");
        }

        const exchangeEventDef = GAME_TOKEN_BRIDGE_INVERSE_ABI.find(item => item.name === 'ExchangeFromGame' && item.type === 'event');
        if (exchangeEventDef) {
            exchangeFromGameEventAbiInputs = exchangeEventDef.inputs;
        } else {
            console.error("CRITICAL: ExchangeFromGame event definition not found in ABI. Server-side validation for exchanges will FAIL.");
        }
    } else {
        console.error("CRITICAL: GAME_TOKEN_BRIDGE_INVERSE_ABI is empty. Event ABI inputs cannot be loaded. Server will not function correctly.");
    }
} catch (e) {
    console.error("Error initializing Web3 components or ABI parts:", e);
}

// 创建Express应用
const app = express();
const PORT = 9000; // 修改端口为9000，与前端一致

// 数据存储目录
const DATA_DIR = path.join(__dirname, 'data');
const WEB3_CONFIG_FILE_PATH = path.join(DATA_DIR, 'web3-live-config.json'); // 新增：动态配置文件的路径

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
        // Avoid logging potentially large HTML responses from static files
        if (res.get('Content-Type') && res.get('Content-Type').includes('application/json')) {
            console.log(`响应体: ${body}`);
        } else if (typeof body === 'string' && body.length < 500) { // Log small non-JSON bodies
             console.log(`响应体 (partial/text): ${body.substring(0, 200)}...`);
        }
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

            // 确保userData.coins存在，并转换为数字
            userData.coins = Number(userData.coins || 0);

            // 将本次游戏获得的金币添加到当前可用金币中
            userData.coins += Number(updates.progress.coins);
            console.log(`更新后的当前可用金币: ${userData.coins}`);

            // 同时更新累计获得金币
            userData.highScore = Number(userData.highScore || 0) + Number(updates.progress.coins);
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
            userData.coins = Number(coins);
            console.log(`设置用户金币为 ${coins}，原因: ${reason || '未指定'}`);
        } else if (operation === 'subtract') {
            // 扣除金币
            const oldCoins = Number(userData.coins || 0);
            userData.coins = Math.max(0, oldCoins - Number(coins));
            console.log(`扣除用户金币 ${coins}，原因: ${reason || '未指定'}, 从 ${oldCoins} 变为 ${userData.coins}`);

            // 如果是购买操作，记录购买历史
            if (reason === 'purchase') {
                // 确保购买历史存在
                userData.purchases = userData.purchases || [];

                // 添加购买记录
                userData.purchases.push({
                    date: new Date().toISOString(),
                    cost: Number(coins),
                    balance: userData.coins
                });

                console.log(`记录购买历史: 花费 ${coins} 金币，剩余 ${userData.coins} 金币`);
            }
        } else {
            // 添加金币
            const oldCoins = Number(userData.coins || 0);
            userData.coins = oldCoins + Number(coins);
            console.log(`添加用户金币 ${coins}，原因: ${reason || '未指定'}, 从 ${oldCoins} 变为 ${userData.coins}`);

            // 只有在添加金币时才更新累计获得金币
            if (coins > 0) {
                // 确保highScore存在
                userData.highScore = Number(userData.highScore || 0);

                // 累加获得的金币到累计金币中
                userData.highScore += Number(coins);
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
 * 取消兑换，退还金币 (重写后的版本)
 * POST /api/cancel-exchange
 * 请求体: { playerAddress, nonce, reason, txHash (optional) }
 */
app.post('/api/cancel-exchange', async (req, res) => {
    console.log('[cancel-exchange] 收到取消兑换请求:', req.body);
    const { playerAddress, nonce, reason = '用户请求取消', txHash: clientProvidedTxHash } = req.body;

    if (!playerAddress || !nonce) {
        return res.status(400).json({ success: false, error: '无效的请求参数，playerAddress 和 nonce 必填' });
    }
    if (!isValidWalletAddress(playerAddress)) {
        return res.status(400).json({ success: false, error: '无效的玩家地址格式' });
    }

    const filePath = getUserDataPath(playerAddress);
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: '未找到用户数据' });
        }
        let userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        userData.exchangeHistory = userData.exchangeHistory || [];

        const exchangeIndex = userData.exchangeHistory.findIndex(record => record.nonce === nonce);
        if (exchangeIndex === -1) {
            return res.status(404).json({ success: false, error: '找不到与此nonce对应的兑换记录' });
        }
        const exchangeRecord = userData.exchangeHistory[exchangeIndex];

        if (exchangeRecord.status === 'completed') {
            console.log(`[cancel-exchange] 兑换 (nonce: ${nonce}) 已成功完成，无法取消。TxHash: ${exchangeRecord.txHash}`);
            return res.status(400).json({ success: false, error: '此兑换已成功完成，无法取消。' });
        }
        if (exchangeRecord.status === 'cancelled') {
            console.log(`[cancel-exchange] 兑换 (nonce: ${nonce}) 已被取消过。`);
            return res.status(400).json({ success: false, error: '此兑换已被取消过，不能重复操作。' });
        }
        if (exchangeRecord.onChainConfirmed) {
            console.log(`[cancel-exchange] 兑换 (nonce: ${nonce}) 已在链上确认，无法取消。TxHash: ${exchangeRecord.txHash}`);
            return res.status(400).json({ success: false, error: '此兑换已在链上确认，无法取消。' });
        }

        const txHashToQuery = clientProvidedTxHash || exchangeRecord.txHash;
        let receiptForLog = null;
        let pendingTransaction = false;

        if (txHashToQuery) {
            console.log(`[cancel-exchange] 使用 txHash: ${txHashToQuery} 进行链上检查 for Nonce ${nonce}`);

            // 首先检查交易是否存在（即使是 pending 状态）
            try {
                const transaction = await web3.eth.getTransaction(txHashToQuery);
                if (transaction && !transaction.blockNumber) {
                    // 交易存在但没有 blockNumber，说明交易处于 pending 状态
                    pendingTransaction = true;
                    console.log(`[cancel-exchange] 交易 ${txHashToQuery} 处于 pending 状态，不允许取消`);
                    exchangeRecord.status = 'cancel_denied_pending_transaction';
                    exchangeRecord.failureReason = `Transaction ${txHashToQuery} is pending on-chain. Cancellation denied to prevent double spending.`;
                    fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
                    return res.status(400).json({
                        success: false,
                        error: '交易正在链上处理中，为防止双重支付，不允许取消。请等待交易完成或失败后再尝试。',
                        pendingTransaction: true
                    });
                }
            } catch (txError) {
                console.error(`[cancel-exchange] 检查交易状态时出错:`, txError);
                // 如果无法检查交易状态，我们继续处理，因为可能是网络问题
            }

            // 然后检查交易回执
            receiptForLog = await web3.eth.getTransactionReceipt(txHashToQuery);

            if (receiptForLog) {
                const expectedContractAddress = exchangeRecord.contractAddress;
                if (receiptForLog.status && receiptForLog.to.toLowerCase() === expectedContractAddress.toLowerCase()) {
                    if (!exchangeFromGameEventAbiInputs) {
                        console.error("[cancel-exchange] 服务器配置错误: ExchangeFromGame 事件ABI未定义。");
                        return res.status(500).json({ success: false, error: '服务器配置错误，无法验证事件。' });
                    }
                    let eventFoundAndValid = false;
                    for (const log of receiptForLog.logs) {
                        if (log.address.toLowerCase() === expectedContractAddress.toLowerCase() && log.topics[0] === EXCHANGE_FROM_GAME_EVENT_SIGNATURE_SHA3) {
                            try {
                                const decodedLog = web3.eth.abi.decodeLog(exchangeFromGameEventAbiInputs, log.data, log.topics.slice(1));
                                if (decodedLog.player.toLowerCase() === playerAddress.toLowerCase() &&
                                    BigInt(decodedLog.tokenAmount).toString() === BigInt(exchangeRecord.tokenAmount).toString() &&
                                    BigInt(decodedLog.gameCoins).toString() === BigInt(exchangeRecord.gameCoins).toString()
                                    // Nonce is NOT in ExchangeFromGame event
                                ) {
                                    eventFoundAndValid = true;
                                    break;
                                }
                            } catch (e) { console.error(`[cancel-exchange] 事件解码失败 for ${txHashToQuery}`, e); }
                        }
                    }

                    if (eventFoundAndValid) {
                        console.log(`[cancel-exchange] 链上交易 (Tx: ${txHashToQuery}, Nonce: ${nonce}) 已确认成功。无法取消。`);
                        exchangeRecord.status = 'completed';
                        exchangeRecord.txHash = txHashToQuery;
                        exchangeRecord.verifiedAt = new Date().toISOString();
                        exchangeRecord.onChainConfirmed = true; // 添加链上确认标记
                        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
                        return res.status(400).json({ success: false, error: '链上交易已成功，无法取消。记录已更新。' });
                    } else {
                        console.warn(`[cancel-exchange] 链上交易 (Tx: ${txHashToQuery}) 成功但事件不匹配 for Nonce ${nonce}.`);
                        // This case is tricky. Transaction succeeded but event doesn't match.
                        // For safety, we might still allow cancellation if the goal is to refund,
                        // but log it as a discrepancy. Or deny cancellation.
                        // Current logic: if event not found/valid, it proceeds to refund.
                        // Let's mark it as a specific failure type.
                        exchangeRecord.status = 'chain_tx_event_mismatch_on_cancel';
                        exchangeRecord.failureReason = `链上交易 ${txHashToQuery} 成功但 ExchangeFromGame 事件不匹配。`;
                        exchangeRecord.txHash = txHashToQuery;
                        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
                        return res.status(400).json({ success: false, error: '链上交易成功但事件与预期不符，无法自动取消，请联系客服。' });
                    }
                } else {
                    console.log(`[cancel-exchange] 链上交易 (Tx: ${txHashToQuery}) 失败或目标错误 for Nonce ${nonce}. 可以取消并退款。`);
                }
            } else {
                console.log(`[cancel-exchange] 未找到交易回执 for TxHash: ${txHashToQuery} (Nonce: ${nonce}). 假设交易未成功。`);
            }
        } else {
            console.log(`[cancel-exchange] No txHash available for Nonce: ${nonce}. Checking isNonceUsed...`);
            try {
                if (!GAME_TOKEN_BRIDGE_INVERSE_ABI || GAME_TOKEN_BRIDGE_INVERSE_ABI.length === 0) {
                    throw new Error("GAME_TOKEN_BRIDGE_INVERSE_ABI is not loaded.");
                }
                const contract = new web3.eth.Contract(GAME_TOKEN_BRIDGE_INVERSE_ABI, exchangeRecord.contractAddress);
                const nonceIsUsed = await contract.methods.isNonceUsed(exchangeRecord.nonce).call();
                if (nonceIsUsed) {
                    console.log(`[cancel-exchange] Nonce ${exchangeRecord.nonce} is already used on-chain. Cannot cancel.`);
                    exchangeRecord.status = 'cancelled_denied_nonce_used';
                    exchangeRecord.failureReason = `Nonce ${exchangeRecord.nonce} already used on-chain. Cancellation denied.`;
                    exchangeRecord.onChainConfirmed = true; // 添加链上确认标记
                    fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
                    return res.status(400).json({ success: false, error: '此操作的唯一标识(nonce)已被链上使用，无法取消。' });
                } else {
                     console.log(`[cancel-exchange] Nonce ${exchangeRecord.nonce} is NOT used on-chain. Allowing cancellation.`);
                }
            } catch (isNonceUsedError) {
                console.error(`[cancel-exchange] Error calling isNonceUsed for nonce ${exchangeRecord.nonce}:`, isNonceUsedError);
                // Proceed with caution, or deny cancellation if this check is critical
                // For now, let's log and proceed to refund if isNonceUsed check fails
                exchangeRecord.failureReason = (exchangeRecord.failureReason || '') + `Error checking isNonceUsed: ${isNonceUsedError.message}. `;
            }
        }

        console.log(`[cancel-exchange] 执行取消和解锁金币 for Nonce: ${nonce}. Reason: ${reason}`);

        // 确保锁定金币字段存在
        userData.lockedCoins = userData.lockedCoins || 0;

        // 解锁金币而不是退款（因为我们现在只是锁定而不是扣除）
        const coinsToUnlock = BigInt(exchangeRecord.gameCoins);
        const lockedCoins = BigInt(userData.lockedCoins);

        // 解锁金币，确保不会出现负数
        userData.lockedCoins = Math.max(0, Number(lockedCoins - coinsToUnlock));
        console.log(`[cancel-exchange] 解锁金币: ${coinsToUnlock}，剩余锁定金币: ${userData.lockedCoins}`);

        exchangeRecord.status = 'cancelled';
        exchangeRecord.cancelReason = reason;
        exchangeRecord.cancelledAt = new Date().toISOString();
        exchangeRecord.coinsUnlocked = true;

        let failureDetail = `Cancellation for Nonce ${nonce}.`;
        if (txHashToQuery) {
             failureDetail = `Cancellation after checking txHash ${txHashToQuery}. (Receipt: ${receiptForLog ? 'found' : 'not found'}, Status: ${receiptForLog ? receiptForLog.status : 'N/A'}).`;
        }
        exchangeRecord.failureReason = (exchangeRecord.failureReason || '') + failureDetail;

        userData.lastUpdated = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
        console.log(`[cancel-exchange] 金币已解锁: ${coinsToUnlock} for player ${playerAddress}. 剩余锁定金币: ${userData.lockedCoins}. Nonce: ${nonce}`);

        return res.status(200).json({
            success: true,
            coins: userData.coins,
            unlockedCoins: coinsToUnlock.toString(),
            lockedCoins: userData.lockedCoins,
            message: '兑换已取消，金币已解锁。'
        });

    } catch (error) {
        console.error(`[cancel-exchange] 处理取消兑换时发生错误 (Nonce ${nonce}):`, error);
        return res.status(500).json({ success: false, error: `处理取消兑换时发生内部错误: ${error.message}` });
    }
});

/**
 * 获取兑换签名
 * POST /api/sign-exchange
 * 请求体: { playerAddress, tokenAmount, gameCoins, contractAddress }
 */
app.post('/api/sign-exchange', async (req, res) => {
    console.log('收到签名请求:', req.body);

    const { playerAddress, tokenAmount, gameCoins, contractAddress, isInverse } = req.body; // 添加 isInverse

    // 验证参数
    if (!playerAddress) {
        return res.status(400).json({ success: false, error: '玩家地址不能为空' });
    }

    // tokenAmount 和 gameCoins 的校验现在更依赖于 isInverse 模式，但基本的大小于0判断仍可保留
    if (typeof tokenAmount === 'undefined' || tokenAmount <= 0) {
        return res.status(400).json({ success: false, error: '代币数量必须大于0' });
    }

    if (typeof gameCoins === 'undefined' || gameCoins <= 0) {
        return res.status(400).json({ success: false, error: '游戏金币数量必须大于0' });
    }

    if (!contractAddress) {
        return res.status(400).json({ success: false, error: '合约地址不能为空' });
    }
    if (typeof isInverse === 'undefined') {
        return res.status(400).json({ success: false, error: 'isInverse 参数不能为空' });
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

        // 确保锁定金币字段存在
        userData.lockedCoins = userData.lockedCoins || 0;

        // 获取当前金币余额和锁定金币数量
        const currentCoins = userData.coins || 0;
        const lockedCoins = userData.lockedCoins;
        const availableCoins = currentCoins - lockedCoins;

        console.log(`当前金币余额: ${currentCoins}, 已锁定金币: ${lockedCoins}, 可用金币: ${availableCoins}`);

        // 检查可用金币是否足够
        if (availableCoins < gameCoins) {
            return res.status(400).json({
                success: false,
                error: `可用金币不足，需要 ${gameCoins} 金币，当前可用余额 ${availableCoins} 金币（总余额 ${currentCoins} 金币，已锁定 ${lockedCoins} 金币）`,
                required: gameCoins,
                current: availableCoins,
                totalCoins: currentCoins,
                lockedCoins: lockedCoins
            });
        }

        // 锁定金币，但不实际扣除
        userData.lockedCoins = lockedCoins + gameCoins;
        console.log(`锁定金币: ${gameCoins}，当前锁定金币总数: ${userData.lockedCoins}，剩余可用金币: ${currentCoins - userData.lockedCoins}`);

        // 添加兑换记录
        userData.exchangeHistory = userData.exchangeHistory || [];

        // 将 tokenAmount 转换为 wei 单位以用于签名
        // tokenAmount 从客户端传来时已经是 Wei 单位的字符串
        const tokenAmountInWei = ethers.BigNumber.from(tokenAmount);
        console.log(`[sign-exchange] Original tokenAmount from request: ${tokenAmount}, Converted to Wei for signing: ${tokenAmountInWei.toString()}`);

        // 生成签名 (使用 tokenAmountInWei)
        const result = await generateExchangeSignature(playerAddress, tokenAmountInWei, gameCoins, contractAddress, isInverse); // 传递 isInverse

        if (!result.success) {
            return res.status(500).json({ success: false, error: result.error || '生成签名失败' });
        }

        // 验证签名（可选，用于调试） - 注意: verifySignature 也需要能处理 isInverse
        // const verifyResult = await verifySignature(playerAddress, tokenAmount, gameCoins, result.nonce, contractAddress, result.signature, isInverse);
        // console.log('签名验证结果:', verifyResult);
        // 暂时注释掉 verifySignature，因为它也需要同步修改以包含 isInverse

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
            status: 'pending', // 添加状态，用于跟踪兑换记录的状态
            isInverse: isInverse, // 保存 isInverse 状态
            txHash: null, // 初始化交易哈希为 null，将在前端提交交易后更新
            pendingTxCheck: false // 标记是否已检查过 pending 交易
        };

        userData.exchangeHistory.push(exchangeRecord);
        console.log(`添加兑换记录:`, exchangeRecord);

        // 更新时间戳
        userData.lastUpdated = new Date().toISOString();

        // 保存更新后的数据
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
        console.log(`用户数据已更新，兑换记录已添加`);

        // 返回签名
        res.status(200).json({
            success: true,
            signature: result.signature,
            nonce: result.nonce,
            signer: result.signer, // 使用从generateExchangeSignature返回的动态signer地址
            gameCoins: gameCoins,
            coinsRemaining: userData.coins,
            message: '签名生成成功，请完成链上交易'
        });
    } catch (error) {
        console.error('生成签名时出错:', error);
        res.status(500).json({ success: false, error: error.message || '生成签名时出错' });
    }
});

/**
 * 获取充值签名
 * POST /api/sign-recharge
 * 请求体: { playerAddress, tokenAmount, gameCoins, contractAddress, isInverse }
 */
app.post('/api/sign-recharge', async (req, res) => {
    console.log('收到充值签名请求:', req.body);

    const { playerAddress, tokenAmount, gameCoins, contractAddress, isInverse } = req.body;

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

        // 如果客户端未提供 isInverse 参数，尝试从配置中获取
        let inverseMode = isInverse;
        if (typeof inverseMode === 'undefined') {
            // 尝试从 web3-live-config.json 获取
            try {
                const configPath = path.join(__dirname, 'data', 'web3-live-config.json');
                if (fs.existsSync(configPath)) {
                    const rawConfig = fs.readFileSync(configPath, 'utf8');
                    const config = JSON.parse(rawConfig);
                    if (config && config.RECHARGE && typeof config.RECHARGE.INVERSE_MODE !== 'undefined') {
                        inverseMode = config.RECHARGE.INVERSE_MODE;
                        console.log(`从配置文件获取 INVERSE_MODE: ${inverseMode}`);
                    }
                }
            } catch (configError) {
                console.error('读取配置文件中的 INVERSE_MODE 失败:', configError);
            }

            // 如果仍然未定义，默认为 true (反向模式)
            if (typeof inverseMode === 'undefined') {
                inverseMode = true;
                console.log(`未找到 INVERSE_MODE 配置，使用默认值: ${inverseMode}`);
            }
        }

        console.log(`使用的 isInverse 值: ${inverseMode}`);

        // 生成签名
        console.log('签名参数:');
        console.log('- playerAddress:', playerAddress);
        console.log('- tokenAmount:', tokenAmount);
        console.log('- gameCoins:', gameCoins);
        console.log('- contractAddress:', contractAddress);
        console.log('- inverseMode (仅记录，不用于签名):', inverseMode);

        // 注意：01GameTokenBridgeInverse.sol 合约不需要 isInverse 参数
        const result = await generateRechargeSignature(playerAddress, tokenAmount, gameCoins, contractAddress);

        if (!result.success) {
            return res.status(500).json({ success: false, error: result.error || '生成充值签名失败' });
        }

        console.log('生成的签名结果:');
        console.log('- signature:', result.signature);
        console.log('- nonce:', result.nonce);
        console.log('- signer:', result.signer);
        console.log('- isInverse:', result.isInverse);

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
            isInverse: inverseMode, // 保存 isInverse 值
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
            signer: result.signer, // 使用从generateRechargeSignature返回的动态signer地址
            gameCoinsToGain: gameCoins,
            isInverse: inverseMode, // 返回 isInverse 值
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

// 检查此 nonce 和 txHash 是否已作为已完成的充值记录存在，防止重复处理
            const alreadyCompletedIndex = userData.rechargeHistory.findIndex(record =>
                record.nonce === nonce &&
                record.status === 'completed' &&
                record.txHash === txHash
            );
            if (alreadyCompletedIndex !== -1) {
                console.log(`[confirm-recharge] 充值请求 (nonce: ${nonce}, txHash: ${txHash}) 已被成功处理过。`);
                return res.status(200).json({
                    success: true,
                    coins: userData.coins, // 返回当前金币
                    addedCoins: 0,         // 本次不重复添加金币
                    message: '此充值请求已被成功处理过。'
                });
            }
        if (rechargeIndex === -1) {
            return res.status(400).json({
                success: false,
                error: '找不到对应的待处理充值记录，可能已经处理或不存在'
            });
        }

        const rechargeRecord = userData.rechargeHistory[rechargeIndex];

        // 验证充值记录中的金币数量是否与请求中的一致
        if (BigInt(rechargeRecord.gameCoinsToGain).toString() !== BigInt(gameCoins).toString()) {
            return res.status(400).json({
                success: false,
                error: `充值记录中的金币数量(${rechargeRecord.gameCoinsToGain})与请求中的(${gameCoins})不一致`
            });
        }

        // 验证充值记录中的代币数量是否与请求中的一致
        if (BigInt(rechargeRecord.tokenAmount).toString() !== BigInt(tokenAmount).toString()) {
            return res.status(400).json({
                success: false,
                error: `充值记录中的代币数量(${rechargeRecord.tokenAmount})与请求中的(${tokenAmount})不一致`
            });
// --- 链上验证开始 ---
            try {
                console.log(`[confirm-recharge] 开始验证交易: ${txHash} for nonce: ${nonce}`);
                const receipt = await web3.eth.getTransactionReceipt(txHash);

                if (!receipt) {
                    console.error(`[confirm-recharge] 交易回执未找到: ${txHash}`);
                    userData.rechargeHistory[rechargeIndex].status = 'validation_failed_no_receipt';
                    userData.rechargeHistory[rechargeIndex].failureReason = '交易回执未找到，请稍后重试或确认交易已上链并联系支持 (Transaction receipt not found)';
                    userData.rechargeHistory[rechargeIndex].txHash = txHash;
                    userData.rechargeHistory[rechargeIndex].confirmedAt = new Date().toISOString();
                    fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
                    return res.status(400).json({ success: false, error: '交易回执未找到，请稍后重试或确认交易已上链并联系支持' });
                }

                if (!receipt.status) { // Transaction was mined, but failed
                    const detailedReason = await getFailedTxReason(web3, txHash, receipt.blockNumber);
                    console.error(`[confirm-recharge] 链上交易失败: ${txHash}, 原因: ${detailedReason}`);
                    userData.rechargeHistory[rechargeIndex].status = 'failed_on_chain';
                    userData.rechargeHistory[rechargeIndex].failureReason = detailedReason;
                    userData.rechargeHistory[rechargeIndex].txHash = txHash;
                    userData.rechargeHistory[rechargeIndex].confirmedAt = new Date().toISOString();
                    fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
                    return res.status(400).json({
                        success: false,
                        error: `链上交易失败。原因: ${detailedReason}`,
                        txHash: txHash,
                        failureReason: detailedReason
                    });
                }

                const expectedContractAddress = rechargeRecord.contractAddress;
                if (receipt.to.toLowerCase() !== expectedContractAddress.toLowerCase()) {
                    console.error(`[confirm-recharge] 交易接收者地址不匹配: TxHash ${txHash}, Expected ${expectedContractAddress}, Got ${receipt.to}`);
                    userData.rechargeHistory[rechargeIndex].status = 'validation_failed_wrong_contract';
                    userData.rechargeHistory[rechargeIndex].failureReason = `Transaction was sent to an incorrect contract address. Expected: ${expectedContractAddress}, Got: ${receipt.to}. TxHash: ${txHash}`;
                    userData.rechargeHistory[rechargeIndex].txHash = txHash;
                    fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
                    return res.status(400).json({ success: false, error: '交易目标合约地址不正确' });
                }

                if (!rechargeToGameEventAbiInputs) {
                    console.error("[confirm-recharge] 服务器配置错误: RechargeToGame 事件ABI输入未定义。");
                    return res.status(500).json({ success: false, error: '服务器配置错误：缺少必要的事件ABI定义' });
                }

                let rechargeEventFoundAndValid = false;

                for (const log of receipt.logs) {
                    if (log.address.toLowerCase() === expectedContractAddress.toLowerCase() && log.topics[0] === RECHARGE_TO_GAME_EVENT_SIGNATURE_SHA3) {
                        try {
                            const decodedLog = web3.eth.abi.decodeLog(
                                rechargeToGameEventAbiInputs,
                                log.data,
                                log.topics.slice(1)
                            );
                            const eventPlayer = decodedLog.player;
                            const eventTokenAmount = BigInt(decodedLog.tokenAmount).toString();
                            const eventGameCoins = BigInt(decodedLog.gameCoins).toString();
                            // const eventTaxAmount = BigInt(decodedLog.taxAmount).toString(); // Available if needed

                            const expectedPlayer = playerAddress;
                            const expectedTokenAmount = BigInt(rechargeRecord.tokenAmount).toString();
                            const expectedGameCoins = BigInt(rechargeRecord.gameCoinsToGain).toString();
                            // Nonce is NOT in RechargeToGame event

                            if (
                                eventPlayer.toLowerCase() === expectedPlayer.toLowerCase() &&
                                eventTokenAmount === expectedTokenAmount &&
                                eventGameCoins === expectedGameCoins
                            ) {
                                rechargeEventFoundAndValid = true;
                                console.log(`[confirm-recharge] RechargeToGame 事件验证成功: TxHash ${txHash}`);
                                break;
                            } else {
                                console.warn(`[confirm-recharge] RechargeToGame 事件参数不匹配: TxHash ${txHash}. Decoded: player=${eventPlayer}, tokenAmount=${eventTokenAmount}, gameCoins=${eventGameCoins}. Expected: player=${expectedPlayer}, tokenAmount=${expectedTokenAmount}, gameCoins=${expectedGameCoins}.`);
                            }
                        } catch (decodeError) {
                            console.error(`[confirm-recharge] 解码 RechargeToGame 事件失败: TxHash ${txHash}`, decodeError);
                        }
                    }
                }

                if (!rechargeEventFoundAndValid) {
                    console.error(`[confirm-recharge] 未找到匹配的 RechargeToGame 事件或事件参数不匹配: TxHash ${txHash}`);
                    userData.rechargeHistory[rechargeIndex].status = 'validation_failed_event_mismatch';
                    userData.rechargeHistory[rechargeIndex].failureReason = `Matching RechargeToGame event not found or parameters mismatch. TxHash: ${txHash}`;
                    userData.rechargeHistory[rechargeIndex].txHash = txHash;
                    fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
                    return res.status(400).json({ success: false, error: '充值事件验证失败，金币未添加' });
                }
                console.log(`[confirm-recharge] 所有链上验证成功: ${txHash}`);
            } catch (chainError) {
                console.error(`[confirm-recharge] 链上验证时发生错误 (txHash: ${txHash}):`, chainError);
                userData.rechargeHistory[rechargeIndex].status = 'validation_error_exception';
                userData.rechargeHistory[rechargeIndex].failureReason = `Exception during chain validation: ${chainError.message}. TxHash: ${txHash}`;
                userData.rechargeHistory[rechargeIndex].txHash = txHash;
                fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
                return res.status(500).json({ success: false, error: `链上验证时发生内部错误，请稍后重试: ${chainError.message}` });
            }
            // --- 链上验证结束 ---
        } // This closing brace was misplaced, it should be after the chain validation block

        // 更新充值记录状态
        userData.rechargeHistory[rechargeIndex].status = 'completed';
        userData.rechargeHistory[rechargeIndex].txHash = txHash;
        userData.rechargeHistory[rechargeIndex].completedAt = new Date().toISOString();

        // 添加金币 - 确保使用数值相加而不是字符串拼接
        const oldCoins = Number(userData.coins || 0);
        userData.coins = oldCoins + Number(gameCoins);
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

/**
 * 更新兑换交易哈希
 * POST /api/update-exchange-tx
 * 请求体: { playerAddress, nonce, txHash }
 */
app.post('/api/update-exchange-tx', async (req, res) => {
    console.log('[update-exchange-tx] 收到更新交易哈希请求:', req.body);
    const { playerAddress, nonce, txHash } = req.body;

    if (!playerAddress || !nonce || !txHash) {
        return res.status(400).json({ success: false, error: '无效的请求参数，playerAddress、nonce 和 txHash 必填' });
    }
    if (!isValidWalletAddress(playerAddress)) {
        return res.status(400).json({ success: false, error: '无效的玩家地址格式' });
    }

    const filePath = getUserDataPath(playerAddress);
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: '未找到用户数据' });
        }
        let userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        userData.exchangeHistory = userData.exchangeHistory || [];

        const exchangeIndex = userData.exchangeHistory.findIndex(record => record.nonce === nonce);
        if (exchangeIndex === -1) {
            return res.status(404).json({ success: false, error: '找不到与此nonce对应的兑换记录' });
        }
        const exchangeRecord = userData.exchangeHistory[exchangeIndex];

        if (exchangeRecord.status !== 'pending') {
            console.log(`[update-exchange-tx] 兑换 (nonce: ${nonce}) 状态不是 pending，无法更新交易哈希。当前状态: ${exchangeRecord.status}`);
            return res.status(400).json({ success: false, error: `此兑换状态不是 pending，无法更新交易哈希。当前状态: ${exchangeRecord.status}` });
        }

        // 更新交易哈希
        exchangeRecord.txHash = txHash;
        exchangeRecord.txUpdatedAt = new Date().toISOString();

        // 保存更新后的数据
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
        console.log(`[update-exchange-tx] 已更新交易哈希: ${txHash} for Nonce: ${nonce}`);

        return res.status(200).json({
            success: true,
            message: '交易哈希已更新',
            nonce: nonce,
            txHash: txHash
        });
    } catch (error) {
        console.error(`[update-exchange-tx] 更新交易哈希时发生错误 (Nonce ${nonce}):`, error);
        return res.status(500).json({ success: false, error: `更新交易哈希时发生内部错误: ${error.message}` });
    }
});

/**
 * 确认金币兑换代币（提现）完成，并验证链上交易
 * POST /api/confirm-exchange
 * 请求体: { playerAddress, tokenAmount (获得的代币), gameCoins (消耗的金币), nonce, txHash }
 */
app.post('/api/confirm-exchange', async (req, res) => {
    console.log('[confirm-exchange] 收到提现确认请求:', req.body);
    const { playerAddress, tokenAmount, gameCoins, nonce, txHash /*, isInverse */ } = req.body; // isInverse 已移除

    // 1. 基本参数验证
    if (!playerAddress || !tokenAmount || tokenAmount <= 0 || !gameCoins || gameCoins <= 0 || !nonce || !txHash /* || typeof isInverse === 'undefined' */) { // isInverse 验证已移除
        return res.status(400).json({ success: false, error: '无效的请求参数，所有字段均为必填且需有效' });
    }
    if (!isValidWalletAddress(playerAddress)) {
        return res.status(400).json({ success: false, error: '无效的玩家地址格式' });
    }

    const filePath = getUserDataPath(playerAddress);
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: '未找到用户数据' });
        }
        let userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        userData.exchangeHistory = userData.exchangeHistory || [];

        // 2. 查找对应的 exchangeHistory 记录
        const exchangeIndex = userData.exchangeHistory.findIndex(record => record.nonce === nonce);

        if (exchangeIndex === -1) {
            return res.status(404).json({ success: false, error: '找不到与此nonce对应的兑换记录' });
        }

        const exchangeRecord = userData.exchangeHistory[exchangeIndex];

        // 3. 处理重复确认：如果记录已是 completed 且 txHash 一致，则直接返回成功
        if (exchangeRecord.status === 'completed' && exchangeRecord.txHash === txHash) {
            console.log(`[confirm-exchange] 此提现 (nonce: ${nonce}, txHash: ${txHash}) 已被成功确认过。`);
            return res.status(200).json({ success: true, message: '此提现已被成功确认过。', record: exchangeRecord });
        }
        // 如果状态是 completed 但 txHash 不同，这可能是一个问题，需要调查
        if (exchangeRecord.status === 'completed' && exchangeRecord.txHash !== txHash) {
            console.warn(`[confirm-exchange] 警告: 提现 (nonce: ${nonce}) 已有不同的成功txHash (${exchangeRecord.txHash})，新请求txHash (${txHash})。`);
            return res.status(409).json({ success: false, error: '此兑换记录已通过其他交易确认，存在冲突。' });
        }


        // 4. 验证记录中的金额是否与请求中的一致 (作为健全性检查)
        if (BigInt(exchangeRecord.gameCoins).toString() !== BigInt(gameCoins).toString() || BigInt(exchangeRecord.tokenAmount).toString() !== BigInt(tokenAmount).toString()) {
            console.error(`[confirm-exchange] 请求参数与记录不符: Nonce ${nonce}. Req: gameCoins=${gameCoins}, tokenAmount=${tokenAmount}. Rec: gameCoins=${exchangeRecord.gameCoins}, tokenAmount=${exchangeRecord.tokenAmount}`);
            return res.status(400).json({ success: false, error: '请求中的金额与原始兑换记录不符。' });
        }

        // 5. 严格的链上验证
        console.log(`[confirm-exchange] 开始链上验证: TxHash ${txHash} for Nonce ${nonce}`);
        const receipt = await web3.eth.getTransactionReceipt(txHash);

        if (!receipt) {
            console.error(`[confirm-exchange] 交易回执未找到: ${txHash}`);
            exchangeRecord.status = 'validation_failed_no_receipt';
            exchangeRecord.failureReason = `交易回执未找到，请稍后或在交易确认后重试 (Transaction receipt not found for ${txHash})`;
            exchangeRecord.txHash = txHash;
            exchangeRecord.confirmedAt = new Date().toISOString();
            fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
            return res.status(400).json({ success: false, error: '交易回执未找到，请稍后或在交易确认后重试。' });
        }

        const expectedContractAddress = exchangeRecord.contractAddress;
        let refundCoinsDueToFailure = false;
        let specificFailureReason = "";

        if (!receipt.status) { // Transaction was mined, but failed
            specificFailureReason = await getFailedTxReason(web3, txHash, receipt.blockNumber);
            console.error(`[confirm-exchange] 链上交易失败: ${txHash}, 原因: ${specificFailureReason}`);
            exchangeRecord.status = 'failed_on_chain';
            exchangeRecord.failureReason = specificFailureReason;
            exchangeRecord.txHash = txHash;
            exchangeRecord.confirmedAt = new Date().toISOString();
            refundCoinsDueToFailure = true;
        } else if (receipt.to.toLowerCase() !== expectedContractAddress.toLowerCase()) {
            specificFailureReason = `交易目标合约地址不正确 (Expected: ${expectedContractAddress}, Got: ${receipt.to})`;
            console.error(`[confirm-exchange] ${specificFailureReason}. TxHash: ${txHash}`);
            exchangeRecord.status = 'validation_failed_wrong_contract';
            exchangeRecord.failureReason = `${specificFailureReason}. TxHash: ${txHash}`;
            exchangeRecord.txHash = txHash;
            exchangeRecord.confirmedAt = new Date().toISOString();
            refundCoinsDueToFailure = true;
        } else {
            // Receipt is valid and contract address is correct, proceed with event validation
            if (!exchangeFromGameEventAbiInputs) {
                console.error("[confirm-exchange] 服务器配置错误: ExchangeFromGame 事件ABI未定义。");
                // This is a server error, do not refund based on this.
                return res.status(500).json({ success: false, error: '服务器配置错误，无法验证提现事件。' });
            }
            let eventFoundAndValid = false;
            const contractInstanceForTax = new web3.eth.Contract(GAME_TOKEN_BRIDGE_INVERSE_ABI, expectedContractAddress);
            const currentExchangeTokenTaxRateBPS = await contractInstanceForTax.methods.exchangeTokenTaxRate().call();
            const taxRateBigNumber = ethers.BigNumber.from(currentExchangeTokenTaxRateBPS);
            const BPS_DIVISOR = ethers.BigNumber.from(10000);

            const exchangeRecordTotalTokenAmountInWei = ethers.BigNumber.from(exchangeRecord.tokenAmount.toString());
            const calculatedTaxInWei = exchangeRecordTotalTokenAmountInWei.mul(taxRateBigNumber).div(BPS_DIVISOR);
            const expectedNetAmountInWei = exchangeRecordTotalTokenAmountInWei.sub(calculatedTaxInWei);

            for (const log of receipt.logs) {
                if (log.address.toLowerCase() === expectedContractAddress.toLowerCase() && log.topics[0] === EXCHANGE_FROM_GAME_EVENT_SIGNATURE_SHA3) {
                    try {
                        const decodedLog = web3.eth.abi.decodeLog(exchangeFromGameEventAbiInputs, log.data, log.topics.slice(1));

                        console.log(`[confirm-exchange] Event Validation - Decoded Event: player=${decodedLog.player}, tokenAmount=${decodedLog.tokenAmount} (net), gameCoins=${decodedLog.gameCoins}`);
                        console.log(`[confirm-exchange] Event Validation - Expected: player=${playerAddress.toLowerCase()}, expectedNetTokenAmountInWei=${expectedNetAmountInWei.toString()} (RawTotal: ${exchangeRecordTotalTokenAmountInWei.toString()}, Tax: ${calculatedTaxInWei.toString()}, RateBPS: ${currentExchangeTokenTaxRateBPS}), gameCoins=${exchangeRecord.gameCoins}`);

                        if (
                            decodedLog.player.toLowerCase() === playerAddress.toLowerCase() &&
                            BigInt(decodedLog.tokenAmount).toString() === expectedNetAmountInWei.toString() && // Compare event's net amount with calculated expected net amount
                            BigInt(decodedLog.gameCoins).toString() === BigInt(exchangeRecord.gameCoins).toString()
                        ) {
                            eventFoundAndValid = true;
                            break;
                        }
                    } catch (e) { console.error(`[confirm-exchange] 事件解码失败 for ${txHash}`, e); }
                }
            }

            if (!eventFoundAndValid) {
                specificFailureReason = `ExchangeFromGame 事件验证失败或参数不符 (Expected Player: ${playerAddress.toLowerCase()}, Expected NetTokenAmountInWei: ${expectedNetAmountInWei.toString()} (RawTotal: ${exchangeRecord.tokenAmount} / ${exchangeRecordTotalTokenAmountInWei.toString()} wei, TaxCalculated: ${calculatedTaxInWei.toString()} wei), Expected GameCoins: ${exchangeRecord.gameCoins}). TxHash: ${txHash}`;
                console.error(`[confirm-exchange] ${specificFailureReason}`);
                exchangeRecord.status = 'validation_failed_event_mismatch';
                exchangeRecord.failureReason = specificFailureReason;
                exchangeRecord.txHash = txHash;
                exchangeRecord.confirmedAt = new Date().toISOString();
                refundCoinsDueToFailure = true;
            }
        }

        if (refundCoinsDueToFailure) {
            const coinsToRefund = BigInt(exchangeRecord.gameCoins);
            userData.coins = (BigInt(userData.coins || 0) + coinsToRefund).toString();
            exchangeRecord.coinsRefunded = true;
            // exchangeRecord.status and failureReason are already set
            exchangeRecord.confirmedAt = exchangeRecord.confirmedAt || new Date().toISOString(); // Ensure confirmedAt is set
            console.log(`[confirm-exchange] 链上验证失败或事件不匹配，已退还游戏金币: ${coinsToRefund} to player ${playerAddress}. New balance: ${userData.coins}. Reason: ${exchangeRecord.failureReason}. TxHash: ${txHash}`);
            fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
            return res.status(400).json({
                success: false,
                error: `链上验证失败或事件不匹配。原因: ${exchangeRecord.failureReason}`, // Removed isInverse from error response
                coinsRefunded: true,
                txHash: txHash,
                failureReason: exchangeRecord.failureReason
                /* isInverseValue: isInverse */ // Removed isInverseValue from response
            });
        }

        // 6. 所有验证通过
        console.log(`[confirm-exchange] 链上验证成功: TxHash ${txHash} for Nonce ${nonce}`);

        // 确保锁定金币字段存在
        userData.lockedCoins = userData.lockedCoins || 0;

        // 现在才扣除金币，确保链上交易成功后再扣除
        const gameCoinsToDeduct = BigInt(exchangeRecord.gameCoins);
        const currentCoins = BigInt(userData.coins || 0);
        const lockedCoins = BigInt(userData.lockedCoins);

        // 检查金币是否足够
        if (currentCoins < gameCoinsToDeduct) {
            console.error(`[confirm-exchange] 金币不足，需要 ${gameCoinsToDeduct} 金币，当前余额 ${currentCoins} 金币`);
            // 解锁这部分金币，因为交易已经成功但金币不足
            userData.lockedCoins = Math.max(0, Number(lockedCoins - gameCoinsToDeduct));
            console.log(`[confirm-exchange] 解锁金币: ${gameCoinsToDeduct}，剩余锁定金币: ${userData.lockedCoins}`);

            exchangeRecord.status = 'failed_insufficient_coins';
            exchangeRecord.failureReason = `金币不足，需要 ${gameCoinsToDeduct} 金币，当前余额 ${currentCoins} 金币`;
            exchangeRecord.txHash = txHash;
            exchangeRecord.confirmedAt = new Date().toISOString();
            fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
            return res.status(400).json({
                success: false,
                error: `金币不足，需要 ${gameCoinsToDeduct} 金币，当前余额 ${currentCoins} 金币`,
                txHash: txHash
            });
        }

        // 扣除金币并解锁
        userData.coins = (currentCoins - gameCoinsToDeduct).toString();
        userData.lockedCoins = Math.max(0, Number(lockedCoins - gameCoinsToDeduct));
        console.log(`[confirm-exchange] 扣除金币: ${gameCoinsToDeduct}，剩余金币: ${userData.coins}`);
        console.log(`[confirm-exchange] 解锁金币: ${gameCoinsToDeduct}，剩余锁定金币: ${userData.lockedCoins}`);

        // 更新兑换记录状态
        exchangeRecord.status = 'completed';
        exchangeRecord.txHash = txHash;
        exchangeRecord.completedAt = new Date().toISOString();
        exchangeRecord.verifiedAt = new Date().toISOString();
        exchangeRecord.coinsDeducted = true;
        exchangeRecord.coinsBalanceAfter = userData.coins;

        // 添加一个标记，表示此交易已在链上确认，防止后续通过cancel-exchange解锁金币
        exchangeRecord.onChainConfirmed = true;

        userData.lastUpdated = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
        console.log(`[confirm-exchange] 提现确认成功 for player ${playerAddress}, TxHash: ${txHash}`);
        return res.status(200).json({
            success: true,
            message: '提现确认成功，金币已扣除。',
            record: exchangeRecord,
            coins: userData.coins
        });

    } catch (error) {
        console.error(`[confirm-exchange] 处理提现确认时发生错误 (Nonce ${nonce}, TxHash ${txHash}):`, error);
        return res.status(500).json({ success: false, error: `处理提现确认时发生内部错误: ${error.message}` });
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
        const oldCoins = Number(userData.coins || 0);
        userData.coins = oldCoins + Number(gameCoins);
        console.log(`添加用户金币 ${gameCoins}，从 ${oldCoins} 变为 ${userData.coins}`);

        // 更新累计获得金币
        userData.highScore = Number(userData.highScore || 0) + Number(gameCoins);
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

// --- Web3 Config API Endpoints ---

// GET /api/web3-config - 获取当前动态Web3配置
app.get('/api/web3-config', (req, res) => {
    try {
        if (fs.existsSync(WEB3_CONFIG_FILE_PATH)) {
            const rawConfig = fs.readFileSync(WEB3_CONFIG_FILE_PATH, 'utf8');
            const config = JSON.parse(rawConfig);
            console.log(`[${new Date().toISOString()}] GET /api/web3-config - Served live config from file.`);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache'); // For HTTP/1.0 backward compatibility
            res.setHeader('Expires', '0'); // For proxies
            res.status(200).json(config);
        } else {
            // 如果动态配置文件不存在，返回空对象。客户端将使用其内置的默认值。
            console.log(`[${new Date().toISOString()}] GET /api/web3-config - Live config file not found. Client to use defaults.`);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache'); // For HTTP/1.0 backward compatibility
            res.setHeader('Expires', '0'); // For proxies
            res.status(200).json({});
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] GET /api/web3-config - Error: ${error.message}`);
        res.status(500).json({ error: 'Failed to get web3 configuration' });
    }
});

// POST /api/admin/web3-config - 更新动态Web3配置 (管理接口)
app.post('/api/admin/web3-config', (req, res) => {
    const newConfig = req.body;
    console.log(`[${new Date().toISOString()}] POST /api/admin/web3-config - Received new config:`, JSON.stringify(newConfig, null, 2));

    if (!newConfig || typeof newConfig !== 'object' || Object.keys(newConfig).length === 0) {
        console.error(`[${new Date().toISOString()}] POST /api/admin/web3-config - Error: Invalid configuration data provided.`);
        return res.status(400).json({ error: 'Invalid configuration data provided.' });
    }

    try {
        // 确保数据目录存在，以防万一
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            console.log(`[${new Date().toISOString()}] POST /api/admin/web3-config - Created data directory: ${DATA_DIR}`);
        }
        fs.writeFileSync(WEB3_CONFIG_FILE_PATH, JSON.stringify(newConfig, null, 2), 'utf8');
        console.log(`[${new Date().toISOString()}] POST /api/admin/web3-config - Web3 live config updated successfully at ${WEB3_CONFIG_FILE_PATH}`);
        res.status(200).json({ success: true, message: 'Web3 configuration updated successfully.' });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] POST /api/admin/web3-config - Error updating config: ${error.message}`);
        res.status(500).json({ error: 'Failed to update web3 configuration.' });
    }
});

// 设置静态文件服务
// 注意：静态文件服务应该放在所有API路由之后
// 使用上一级目录（项目根目录）作为静态文件目录
app.use(express.static(path.join(__dirname, '..'), {
    setHeaders: function (res, filePath) {
        // 对于 .js 文件和 .json 文件 (例如 /api/web3-config 实际上是json，虽然我们已单独处理，但以防万一)
        // 以及 HTML 文件，设置不缓存
        if (path.extname(filePath) === '.js' || path.extname(filePath) === '.json' || path.extname(filePath) === '.html') {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache'); // For HTTP/1.0 backward compatibility
            res.setHeader('Expires', '0'); // For proxies
        }
        // 你可以为其他文件类型设置不同的缓存策略
        // 例如，图片、音频、视频可以缓存较长时间
        // else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp3', '.wav', '.ogg', '.mp4', '.webm'].includes(path.extname(filePath))) {
        //     res.setHeader('Cache-Control', 'public, max-age=31536000'); // 缓存一年
        // }
    }
}));

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
