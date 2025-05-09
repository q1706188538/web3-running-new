/**
 * 游戏配置
 * 用于设置游戏的各种参数
 */
const GameConfig = {
    // 游戏开始需要扣除的金币数量
    GAME_START_COST: 0,

    // 再来一次需要扣除的金币数量
    RESTART_GAME_COST: 0,

    // 游戏速度系数（1.0为正常速度，小于1.0为减速，大于1.0为加速）
    GAME_SPEED: 1,

    // 是否启用调试模式
    DEBUG_MODE: false,

    // 是否使用API
    USE_API: true,

    // API基础URL
    API_BASE_URL: '/api',

    // 代币兑换相关配置
    TOKEN_EXCHANGE: {
        // 代币名称
        TOKEN_NAME: "TWB",

        // 兑换比例：多少游戏金币兑换1个代币
        COINS_PER_TOKEN: 1000,

        // 最小兑换数量（代币）
        MIN_EXCHANGE_AMOUNT: 1,

        // 最大兑换数量（代币）
        MAX_EXCHANGE_AMOUNT: 1000,

        // 兑换手续费（百分比）
        EXCHANGE_FEE_PERCENT: 2,

        // 代币合约地址
        CONTRACT_ADDRESS: "0xeb246449b283f9a98933a32132bee0ba7a2fdce6",

        // 游戏服务器合约地址（用于验证签名）
        GAME_SERVER_ADDRESS: "0xE628408B47918c17cf6B97dDfa2A27c9a1CF451d",

        // 合约所在网络ID（1=主网，56=BSC主网，97=BSC测试网）
        NETWORK_ID: 56
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

        // 如果存在ApiService，设置API基础URL
        if (typeof ApiService !== 'undefined') {
            ApiService.baseUrl = this.API_BASE_URL;
        }

        // 尝试设置游戏速度
        this.applyGameSpeed();

        console.log('游戏配置初始化完成');
    },

    // 应用游戏速度设置
    applyGameSpeed: function(customSpeed) {
        // 使用自定义速度或配置中的速度
        const speedToApply = customSpeed !== undefined ? customSpeed : this.GAME_SPEED;

        // 当GEMIOLI对象可用时，尝试设置游戏速度
        if (typeof GEMIOLI !== 'undefined') {
            console.log(`尝试设置游戏速度系数: ${speedToApply}`);

            // 记录所有找到的速度属性
            const foundSpeedProps = [];

            // 方式1: 直接设置GEMIOLI.speed属性
            if (GEMIOLI.speed !== undefined) {
                console.log('找到GEMIOLI.speed，设置为:', speedToApply);
                GEMIOLI.speed = speedToApply;
                foundSpeedProps.push('GEMIOLI.speed');
            }

            // 方式2: 如果存在GEMIOLI.Play对象，尝试设置其速度相关属性
            if (GEMIOLI.Play !== undefined) {
                console.log('找到GEMIOLI.Play，尝试设置速度相关属性');

                // 可能的速度属性名称
                const possibleSpeedProps = ['speed', 'gameSpeed', 'playerSpeed', 'runSpeed', 'timeScale'];

                // 尝试设置每个可能的属性
                possibleSpeedProps.forEach(prop => {
                    if (GEMIOLI.Play[prop] !== undefined) {
                        console.log(`找到GEMIOLI.Play.${prop}，设置为:`, speedToApply);
                        GEMIOLI.Play[prop] = speedToApply;
                        foundSpeedProps.push(`GEMIOLI.Play.${prop}`);
                    }
                });
            }

            // 方式3: 如果存在GEMIOLI.Application对象，尝试通过事件通知游戏引擎
            if (GEMIOLI.Application !== undefined && typeof GEMIOLI.Application.dispatchEvent === 'function') {
                console.log('通过事件通知游戏引擎设置速度');
                GEMIOLI.Application.dispatchEvent({
                    type: 'set_game_speed',
                    speed: speedToApply
                });
                foundSpeedProps.push('event:set_game_speed');
            }

            // 记录找到的速度属性
            if (foundSpeedProps.length > 0) {
                console.log('找到并设置了以下速度属性:', foundSpeedProps.join(', '));
            } else {
                console.log('未找到任何速度属性');
            }

            console.log('游戏速度设置尝试完成');

            // 返回找到的速度属性
            return foundSpeedProps;
        } else {
            console.log('GEMIOLI对象不可用，无法设置游戏速度');

            // 如果GEMIOLI对象不可用，我们可以在文档加载完成后再次尝试
            window.addEventListener('DOMContentLoaded', () => {
                // 延迟一段时间再尝试，确保游戏引擎已加载
                setTimeout(() => {
                    if (typeof GEMIOLI !== 'undefined') {
                        console.log('延迟加载后尝试设置游戏速度');
                        this.applyGameSpeed(speedToApply);
                    } else {
                        console.log('延迟加载后GEMIOLI对象仍不可用，无法设置游戏速度');
                    }
                }, 2000); // 延迟2秒
            });

            // 返回空数组表示未找到任何速度属性
            return [];
        }
    },

    // 设置游戏速度
    setGameSpeed: function(speed) {
        if (speed > 0) {
            console.log(`设置游戏速度为: ${speed}`);
            this.GAME_SPEED = speed;
            return this.applyGameSpeed(speed);
        } else {
            console.error('游戏速度必须大于0');
            return [];
        }
    }
};

// 在全局作用域中添加一个函数，方便在浏览器控制台中调整游戏速度
window.setGameSpeed = function(speed) {
    if (typeof GameConfig !== 'undefined' && typeof GameConfig.setGameSpeed === 'function') {
        return GameConfig.setGameSpeed(speed);
    } else {
        console.error('GameConfig不可用，无法设置游戏速度');
        return [];
    }
};

// 在全局作用域中添加一个函数，方便在浏览器控制台中获取当前游戏速度
window.getGameSpeed = function() {
    if (typeof GameConfig !== 'undefined') {
        console.log(`当前游戏速度系数: ${GameConfig.GAME_SPEED}`);
        return GameConfig.GAME_SPEED;
    } else {
        console.error('GameConfig不可用，无法获取游戏速度');
        return null;
    }
};

// 在页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
    // 初始化游戏配置
    GameConfig.init();

    // 监听游戏事件
    if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application && typeof GEMIOLI.Application.addEventListener === 'function') {
        // 监听游戏开始事件
        GEMIOLI.Application.addEventListener('game_start', function() {
            console.log('监听到游戏开始事件，应用游戏速度设置');
            GameConfig.applyGameSpeed();
        });

        // 监听关卡加载事件
        GEMIOLI.Application.addEventListener('level_loaded', function() {
            console.log('监听到关卡加载事件，应用游戏速度设置');
            GameConfig.applyGameSpeed();
        });

        console.log('已设置游戏事件监听');
    } else {
        console.log('GEMIOLI.Application不可用，无法设置游戏事件监听');

        // 延迟尝试设置事件监听
        setTimeout(function() {
            if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application && typeof GEMIOLI.Application.addEventListener === 'function') {
                // 监听游戏开始事件
                GEMIOLI.Application.addEventListener('game_start', function() {
                    console.log('延迟监听到游戏开始事件，应用游戏速度设置');
                    GameConfig.applyGameSpeed();
                });

                // 监听关卡加载事件
                GEMIOLI.Application.addEventListener('level_loaded', function() {
                    console.log('延迟监听到关卡加载事件，应用游戏速度设置');
                    GameConfig.applyGameSpeed();
                });

                console.log('已延迟设置游戏事件监听');
            } else {
                console.log('延迟后GEMIOLI.Application仍不可用，无法设置游戏事件监听');
            }
        }, 3000); // 延迟3秒
    }
});
