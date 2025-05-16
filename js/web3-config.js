/**
 * Web3配置
 * 用于设置与区块链交互的各种参数以及游戏配置
 *
 * 当需要部署新的桥接合约或修改游戏配置时，只需更新此文件中的相关参数
 */
const Web3Config = {
    // 游戏基础配置
    GAME: {
        START_COST: 200,  // 游戏开始需要扣除的金币数量
        RESTART_COST: 200,  // 再来一次需要扣除的金币数量
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
        ADDRESS: "0xf54677367e6D3511DCa4C336EfE31eaDFc0cDc1b",  // 桥接合约地址（新部署的合约地址）
        OWNER_ADDRESS: "0x744b9acff32f9184c6f6639e6536437e975a4444",  // 合约所有者地址
        GAME_SERVER_ADDRESS: "0xE628408B47918c17cf6B97dDfa2A27c9a1CF451d",  // 游戏服务器地址 (恢复原始值)
        TAX_WALLET_ADDRESS: "0xedea273fbfad20943aa75d3d77646b23a63707a9"  // 税收钱包地址
    },

    // 代币配置
    TOKEN: {
        NAME: "Running",  // 代币名称
        SYMBOL: "Running",  // 代币符号
        DECIMALS: 18,  // 代币小数位数
        ADDRESS: "0x744b9acff32f9184c6f6639e6536437e975a4444"  // 代币合约地址
    },

    // 兑换配置
    EXCHANGE: {
        RATE: 100,  // 兑换比例：100个代币 = 1个游戏金币
        INVERSE_MODE: true,  // 使用反向兑换模式（代币兑换金币）
        MIN_AMOUNT: 100,  // 最小兑换金额（代币）
        MAX_AMOUNT: 1000000,  // 最大兑换金额（代币）
        TAX_RATE: 1000  // 兑换税率（基点，1000 = 10%）
    },

    // 充值配置
    RECHARGE: {
        RATE: 100,  // 充值比例：100个代币 = 1个游戏金币
        INVERSE_MODE: true,  // 使用反向兑换模式（代币兑换金币）
        MIN_AMOUNT: 100,  // 最小充值金额（代币）
        MAX_AMOUNT: 100000000,  // 最大充值金额（代币）
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
    init: async function() { // 声明为 async 函数
        console.log('Web3Config: 初始化Web3配置...'); // 添加前缀以区分

        try {
            console.log('Web3Config: 尝试从服务器获取动态Web3配置...');
            const response = await fetch('/api/web3-config');
            if (!response.ok) {
                throw new Error(`获取配置失败: ${response.status} ${response.statusText}`);
            }
            const liveConfig = await response.json();
            console.log('Web3Config: 从服务器获取到的动态配置:', liveConfig);

            if (liveConfig && typeof liveConfig === 'object' && Object.keys(liveConfig).length > 0) {
                if (liveConfig.GAME) {
                    Object.assign(this.GAME, liveConfig.GAME);
                    console.log('Web3Config: GAME配置已更新:', this.GAME);
                }
                if (liveConfig.NETWORK) {
                    Object.assign(this.NETWORK, liveConfig.NETWORK);
                    console.log('Web3Config: NETWORK配置已更新:', this.NETWORK);
                }
                if (liveConfig.BRIDGE_CONTRACT) {
                    Object.assign(this.BRIDGE_CONTRACT, liveConfig.BRIDGE_CONTRACT);
                    console.log('Web3Config: BRIDGE_CONTRACT配置已更新:', this.BRIDGE_CONTRACT);
                }
                if (liveConfig.TOKEN) {
                    Object.assign(this.TOKEN, liveConfig.TOKEN);
                    console.log('Web3Config: TOKEN配置已更新:', this.TOKEN);
                }
                if (liveConfig.EXCHANGE) {
                    Object.assign(this.EXCHANGE, liveConfig.EXCHANGE);
                    console.log('Web3Config: EXCHANGE配置已更新:', this.EXCHANGE);
                }
                if (liveConfig.RECHARGE) {
                    Object.assign(this.RECHARGE, liveConfig.RECHARGE);
                    console.log('Web3Config: RECHARGE配置已更新:', this.RECHARGE);
                }
                console.log('Web3Config: 配置已从服务器动态更新。');
            } else {
                console.log('Web3Config: 服务器未返回有效动态配置，或配置为空，将使用本地默认值。');
            }
        } catch (error) {
            console.error('Web3Config: 获取或应用动态Web3配置失败，将使用本地默认值:', error);
        }

        window.DEBUG_MODE = this.GAME.DEBUG_MODE;
        console.log('Web3Config: DEBUG_MODE设置为:', window.DEBUG_MODE);

        if (typeof WalletProgress !== 'undefined') {
            WalletProgress.useApi = this.GAME.USE_API;
            console.log('Web3Config: WalletProgress.useApi设置为:', WalletProgress.useApi);
        }

        console.log('Web3Config: 初始化完成。最终生效配置:', this);

        // 触发配置加载完成事件
        const event = new CustomEvent('web3ConfigLoaded', { detail: this });
        window.dispatchEvent(event);
        console.log('Web3Config: dispatched web3ConfigLoaded event.');
    }
};

// 在页面加载完成后初始化
window.addEventListener('DOMContentLoaded', async function() { // 修改为 async
    // 初始化Web3配置
    await Web3Config.init(); // 使用 await 确保配置加载完成
    // 其他依赖 Web3Config 完全初始化的模块现在应该监听 'web3ConfigLoaded' 事件
});
