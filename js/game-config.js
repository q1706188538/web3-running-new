/**
 * 游戏配置
 * 用于设置游戏的各种参数
 */
const GameConfig = {
    // 游戏开始需要扣除的金币数量
    GAME_START_COST: 0,

    // 再来一次需要扣除的金币数量
    RESTART_GAME_COST: 0,

    // 游戏速度已移除

    // 是否启用调试模式
    DEBUG_MODE: false,

    // 是否使用API
    USE_API: true,

    // API基础URL
    API_BASE_URL: '/api',

    // 代币兑换相关配置
    TOKEN_EXCHANGE: {
        // 代币名称
        TOKEN_NAME: "DeSci",

        // 兑换比例：多少游戏金币兑换1个代币
        COINS_PER_TOKEN: 100,

        // 最小兑换数量（代币）
        MIN_EXCHANGE_AMOUNT: 1,

        // 最大兑换数量（代币）
        MAX_EXCHANGE_AMOUNT: 1000,

        // 兑换手续费（基点，100=1%）
        EXCHANGE_FEE_PERCENT: 200, // 2%，与合约中的exchangeFeeRate=200一致

        // 代币合约地址
        CONTRACT_ADDRESS: "0x9c3748543cB4AE1951dd61485C417e12696Ca408",

        // 游戏服务器合约地址（用于验证签名）
        GAME_SERVER_ADDRESS: "0xE628408B47918c17cf6B97dDfa2A27c9a1CF451d", // 与服务器端使用的地址一致

        // 代币持有者地址
        TOKEN_HOLDER_ADDRESS: "0xcf0d5de2ad5be4d1721fb77b99ac738d3f2a4444",

        // 税收钱包地址
        TAX_WALLET_ADDRESS: "0x828E565E19572aE99c2aE9fa2833E72FB16F8946",

        // 合约所在网络ID（1=主网，56=BSC主网，97=BSC测试网）
        NETWORK_ID: 97 // 使用BSC测试网
    },

    // 代币充值相关配置
    TOKEN_RECHARGE: {
        // 代币名称
        TOKEN_NAME: "DeSci",

        // 充值比例：1个代币可以充值多少游戏金币
        COINS_PER_TOKEN: 100,

        // 最小充值数量（代币）
        MIN_RECHARGE_AMOUNT: 1,

        // 最大充值数量（代币）
        MAX_RECHARGE_AMOUNT: 1000,

        // 充值手续费（直接百分比）
        RECHARGE_FEE_PERCENT: 2, // 2%，设置充值金币税率为2%

        // 代币合约地址（与兑换使用相同合约）
        CONTRACT_ADDRESS: "0x9c3748543cB4AE1951dd61485C417e12696Ca408",

        // 游戏服务器合约地址（用于验证签名）
        GAME_SERVER_ADDRESS: "0xE628408B47918c17cf6B97dDfa2A27c9a1CF451d", // 与服务器端使用的地址一致

        // 代币持有者地址
        TOKEN_HOLDER_ADDRESS: "0xcf0d5de2ad5be4d1721fb77b99ac738d3f2a4444",

        // 税收钱包地址
        TAX_WALLET_ADDRESS: "0x828E565E19572aE99c2aE9fa2833E72FB16F8946",

        // 合约所在网络ID（1=主网，56=BSC主网，97=BSC测试网）
        NETWORK_ID: 97 // 使用BSC测试网
    },

    // 初始化
    init: function() {
        console.log('初始化游戏配置...');

        // 设置全局调试模式
        window.DEBUG_MODE = this.DEBUG_MODE;

        // 如果存在WalletProgress，设置是否使用API
        if (typeof WalletProgress !== 'undefined') {
            WalletProgress.useApi = this.USE_API;
        }

        // 不再需要设置ApiService

        console.log('游戏配置初始化完成');
    }
};

// 游戏速度相关函数已移除

// 在页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
    // 初始化游戏配置
    GameConfig.init();

    // 游戏速度相关事件监听已移除
});
