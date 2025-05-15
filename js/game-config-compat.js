/**
 * 游戏配置兼容层
 * 用于提供与旧版GameConfig相同的接口，但实际从Web3Config获取配置
 * 这样可以在不修改依赖于GameConfig的代码的情况下，统一使用Web3Config
 */
const GameConfig = {
    // 游戏开始需要扣除的金币数量
    get GAME_START_COST() {
        return typeof Web3Config !== 'undefined' ? Web3Config.GAME.START_COST : 0;
    },

    // 再来一次需要扣除的金币数量
    get RESTART_GAME_COST() {
        return typeof Web3Config !== 'undefined' ? Web3Config.GAME.RESTART_COST : 0;
    },

    // 是否启用调试模式
    get DEBUG_MODE() {
        return typeof Web3Config !== 'undefined' ? Web3Config.GAME.DEBUG_MODE : false;
    },

    // 是否使用API
    get USE_API() {
        return typeof Web3Config !== 'undefined' ? Web3Config.GAME.USE_API : true;
    },

    // API基础URL
    get API_BASE_URL() {
        return typeof Web3Config !== 'undefined' ? Web3Config.GAME.API_BASE_URL : '/api';
    },

    // 代币兑换相关配置
    get TOKEN_EXCHANGE() {
        if (typeof Web3Config === 'undefined') {
            return {
                TOKEN_NAME: "DeSci",
                COINS_PER_TOKEN: 1000,
                MIN_EXCHANGE_AMOUNT: 1,
                MAX_EXCHANGE_AMOUNT: 1000,
                EXCHANGE_FEE_PERCENT: 1000, // 10%
                CONTRACT_ADDRESS: "0x2244cb50Ce726ca34ae0FCD38f6ca99f2DA9f9A4",
                GAME_SERVER_ADDRESS: "0xE628408B47918c17cf6B97dDfa2A27c9a1CF451d",
                TOKEN_HOLDER_ADDRESS: "0xcf0d5de2ad5be4d1721fb77b99ac738d3f2a4444",
                TAX_WALLET_ADDRESS: "0x828E565E19572aE99c2aE9fa2833E72FB16F8946",
                NETWORK_ID: 97
            };
        }

        return {
            TOKEN_NAME: Web3Config.TOKEN.SYMBOL,
            COINS_PER_TOKEN: Web3Config.EXCHANGE.RATE,
            MIN_EXCHANGE_AMOUNT: Web3Config.EXCHANGE.MIN_AMOUNT,
            MAX_EXCHANGE_AMOUNT: Web3Config.EXCHANGE.MAX_AMOUNT,
            EXCHANGE_FEE_PERCENT: Web3Config.EXCHANGE.TAX_RATE, // 基点，100=1%
            CONTRACT_ADDRESS: Web3Config.BRIDGE_CONTRACT.ADDRESS,
            GAME_SERVER_ADDRESS: Web3Config.BRIDGE_CONTRACT.GAME_SERVER_ADDRESS,
            TOKEN_HOLDER_ADDRESS: Web3Config.BRIDGE_CONTRACT.OWNER_ADDRESS,
            TAX_WALLET_ADDRESS: Web3Config.BRIDGE_CONTRACT.TAX_WALLET_ADDRESS,
            NETWORK_ID: Web3Config.NETWORK.ID
        };
    },

    // 代币充值相关配置
    get TOKEN_RECHARGE() {
        if (typeof Web3Config === 'undefined') {
            return {
                TOKEN_NAME: "DeSci",
                COINS_PER_TOKEN: 1000,
                MIN_RECHARGE_AMOUNT: 1,
                MAX_RECHARGE_AMOUNT: 1000,
                RECHARGE_FEE_PERCENT: 0, // 0%
                CONTRACT_ADDRESS: "0x2244cb50Ce726ca34ae0FCD38f6ca99f2DA9f9A4",
                GAME_SERVER_ADDRESS: "0xE628408B47918c17cf6B97dDfa2A27c9a1CF451d",
                TOKEN_HOLDER_ADDRESS: "0xcf0d5de2ad5be4d1721fb77b99ac738d3f2a4444",
                TAX_WALLET_ADDRESS: "0x828E565E19572aE99c2aE9fa2833E72FB16F8946",
                NETWORK_ID: 97
            };
        }

        return {
            TOKEN_NAME: Web3Config.TOKEN.SYMBOL,
            COINS_PER_TOKEN: Web3Config.RECHARGE.RATE,
            MIN_RECHARGE_AMOUNT: Web3Config.RECHARGE.MIN_AMOUNT,
            MAX_RECHARGE_AMOUNT: Web3Config.RECHARGE.MAX_AMOUNT,
            RECHARGE_FEE_PERCENT: Web3Config.RECHARGE.TAX_RATE / 100, // 将基点转换为百分比
            CONTRACT_ADDRESS: Web3Config.BRIDGE_CONTRACT.ADDRESS,
            GAME_SERVER_ADDRESS: Web3Config.BRIDGE_CONTRACT.GAME_SERVER_ADDRESS,
            TOKEN_HOLDER_ADDRESS: Web3Config.BRIDGE_CONTRACT.OWNER_ADDRESS,
            TAX_WALLET_ADDRESS: Web3Config.BRIDGE_CONTRACT.TAX_WALLET_ADDRESS,
            NETWORK_ID: Web3Config.NETWORK.ID
        };
    },

    // 初始化
    init: function() {
        console.log('GameConfig兼容层初始化...');
        
        // 实际上不需要做任何事情，因为所有配置都是动态从Web3Config获取的
        // 这个方法只是为了保持与旧版GameConfig的接口兼容
        
        console.log('GameConfig兼容层初始化完成');
    }
};

// 在页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
    // 初始化游戏配置兼容层
    GameConfig.init();
});
