/**
 * Web3配置
 * 用于设置与区块链交互的各种参数以及游戏配置
 *
 * 当需要部署新的桥接合约或修改游戏配置时，只需更新此文件中的相关参数
 */
const Web3Config = {
    // 游戏基础配置
    GAME: {
        START_COST: 0,  // 游戏开始需要扣除的金币数量
        RESTART_COST: 0,  // 再来一次需要扣除的金币数量
        DEBUG_MODE: false,  // 是否启用调试模式
        USE_API: true,  // 是否使用API
        API_BASE_URL: '/api'  // API基础URL
    },

    // 网络配置
    NETWORK: {
        ID: 97,  // BSC测试网
        NAME: "Binance Smart Chain Testnet",
        RPC_URL: "https://data-seed-prebsc-1-s1.binance.org:8545/",
        EXPLORER_URL: "https://testnet.bscscan.com"
    },

    // 桥接合约配置
    BRIDGE_CONTRACT: {
        ADDRESS: "0x4A9499e648D201BedaFFc9E481604E15D8447280",  // 桥接合约地址（新部署的合约地址）
        OWNER_ADDRESS: "0x744b9acff32f9184c6f6639e6536437e975a4444",  // 合约所有者地址
        GAME_SERVER_ADDRESS: "0xE628408B47918c17cf6B97dDfa2A27c9a1CF451d",  // 游戏服务器地址
        TAX_WALLET_ADDRESS: "0x828E565E19572aE99c2aE9fa2833E72FB16F8946"  // 税收钱包地址
    },

    // 代币配置
    TOKEN: {
        NAME: "Running",  // 代币名称
        SYMBOL: "Running",  // 代币符号
        DECIMALS: 18,  // 代币小数位数
        ADDRESS: "0xcf0d5de2ad5be4d1721fb77b99ac738d3f2a4444"  // 代币合约地址
    },

    // 兑换配置
    EXCHANGE: {
        RATE: 100,  // 兑换比例：100个代币 = 1个游戏金币
        INVERSE_MODE: true,  // 使用反向兑换模式（代币兑换金币）
        MIN_AMOUNT: 1,  // 最小兑换金额（代币）
        MAX_AMOUNT: 1000,  // 最大兑换金额（代币）
        TAX_RATE: 1000  // 兑换税率（基点，1000 = 10%）
    },

    // 充值配置
    RECHARGE: {
        RATE: 100,  // 充值比例：100个代币 = 1个游戏金币
        INVERSE_MODE: true,  // 使用反向兑换模式（代币兑换金币）
        MIN_AMOUNT: 1,  // 最小充值金额（代币）
        MAX_AMOUNT: 1000,  // 最大充值金额（代币）
        TAX_RATE: 0  // 充值税率（基点，0 = 0%）
    },

    /**
     * 获取当前网络的配置
     * @returns {Object} 网络配置
     */
    getNetwork: function() {
        return this.NETWORK;
    },

    /**
     * 获取桥接合约配置
     * @returns {Object} 桥接合约配置
     */
    getBridgeContract: function() {
        return this.BRIDGE_CONTRACT;
    },

    /**
     * 获取代币配置
     * @returns {Object} 代币配置
     */
    getToken: function() {
        return this.TOKEN;
    },

    /**
     * 获取兑换配置
     * @returns {Object} 兑换配置
     */
    getExchange: function() {
        return this.EXCHANGE;
    },

    /**
     * 获取充值配置
     * @returns {Object} 充值配置
     */
    getRecharge: function() {
        return this.RECHARGE;
    },

    /**
     * 获取游戏基础配置
     * @returns {Object} 游戏基础配置
     */
    getGame: function() {
        return this.GAME;
    },

    /**
     * 初始化配置
     * 可以在这里添加从服务器获取配置的逻辑
     */
    init: function() {
        console.log('初始化Web3配置...');

        // 设置全局调试模式
        window.DEBUG_MODE = this.GAME.DEBUG_MODE;

        // 如果存在WalletProgress，设置是否使用API
        if (typeof WalletProgress !== 'undefined') {
            WalletProgress.useApi = this.GAME.USE_API;
        }

        // 这里可以添加从服务器获取最新配置的逻辑
        // 例如：
        // fetch('/api/web3-config')
        //     .then(response => response.json())
        //     .then(config => {
        //         this.NETWORK = config.network;
        //         this.BRIDGE_CONTRACT = config.bridgeContract;
        //         this.TOKEN = config.token;
        //         this.EXCHANGE = config.exchange;
        //         this.RECHARGE = config.recharge;
        //         this.GAME = config.game;
        //         console.log('Web3配置已从服务器更新');
        //     })
        //     .catch(error => {
        //         console.error('获取Web3配置失败:', error);
        //     });

        console.log('Web3配置初始化完成');
    }
};

// 在页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
    // 初始化Web3配置
    Web3Config.init();
});
