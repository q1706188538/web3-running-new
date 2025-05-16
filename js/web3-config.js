/**
 * Web3配置
 * 用于设置与区块链交互的各种参数以及游戏配置
 *
 * 当需要部署新的桥接合约或修改游戏配置时，只需更新此文件中的相关参数
 */

// 强制刷新配置的自执行函数
(function() {
    // 检测是否在DApp浏览器中运行
    function isDAppBrowser() {
        return (
            window.ethereum ||
            window.web3 ||
            /MetaMask|TokenPocket|imToken|Trust|Coinbase|Opera Crypto/.test(navigator.userAgent)
        );
    }

    // 如果在DApp浏览器中，强制刷新配置
    if (isDAppBrowser()) {
        console.log('检测到DApp浏览器，启用强制配置刷新机制');

        // 生成唯一的版本号
        const configVersion = Date.now();

        // 强制从服务器获取最新配置
        fetch(`/api/web3-config?v=${configVersion}`, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            cache: 'no-store'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`获取配置失败: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(liveConfig => {
            console.log('DApp浏览器: 强制获取最新配置成功，版本:', configVersion);
            console.log('DApp浏览器: 配置内容:', liveConfig);

            // 如果配置有效，立即应用
            if (liveConfig && typeof liveConfig === 'object' && Object.keys(liveConfig).length > 0) {
                // 保存到localStorage以便在页面刷新时使用
                localStorage.setItem('web3_config_cache', JSON.stringify({
                    timestamp: configVersion,
                    data: liveConfig
                }));

                // 如果Web3Config已定义，立即更新
                if (window.Web3Config) {
                    console.log('DApp浏览器: 立即更新Web3Config');

                    // 更新各个配置部分
                    if (liveConfig.GAME) {
                        Object.assign(window.Web3Config.GAME, liveConfig.GAME);
                    }
                    if (liveConfig.NETWORK) {
                        Object.assign(window.Web3Config.NETWORK, liveConfig.NETWORK);
                    }
                    if (liveConfig.BRIDGE_CONTRACT) {
                        Object.assign(window.Web3Config.BRIDGE_CONTRACT, liveConfig.BRIDGE_CONTRACT);
                    }
                    if (liveConfig.TOKEN) {
                        Object.assign(window.Web3Config.TOKEN, liveConfig.TOKEN);
                    }
                    if (liveConfig.EXCHANGE) {
                        Object.assign(window.Web3Config.EXCHANGE, liveConfig.EXCHANGE);
                    }
                    if (liveConfig.RECHARGE) {
                        Object.assign(window.Web3Config.RECHARGE, liveConfig.RECHARGE);
                    }

                    console.log('DApp浏览器: Web3Config已更新为最新配置');

                    // 触发配置更新事件
                    const event = new CustomEvent('web3ConfigUpdated', { detail: window.Web3Config });
                    window.dispatchEvent(event);
                }
            }
        })
        .catch(error => {
            console.error('DApp浏览器: 强制获取最新配置时出错:', error);

            // 尝试从localStorage获取缓存的配置
            try {
                const cachedConfig = localStorage.getItem('web3_config_cache');
                if (cachedConfig) {
                    const { timestamp, data } = JSON.parse(cachedConfig);
                    console.log('DApp浏览器: 使用缓存的配置，时间戳:', new Date(timestamp).toLocaleString());

                    // 如果Web3Config已定义，使用缓存更新
                    if (window.Web3Config && data) {
                        // 更新各个配置部分
                        if (data.GAME) {
                            Object.assign(window.Web3Config.GAME, data.GAME);
                        }
                        if (data.NETWORK) {
                            Object.assign(window.Web3Config.NETWORK, data.NETWORK);
                        }
                        if (data.BRIDGE_CONTRACT) {
                            Object.assign(window.Web3Config.BRIDGE_CONTRACT, data.BRIDGE_CONTRACT);
                        }
                        if (data.TOKEN) {
                            Object.assign(window.Web3Config.TOKEN, data.TOKEN);
                        }
                        if (data.EXCHANGE) {
                            Object.assign(window.Web3Config.EXCHANGE, data.EXCHANGE);
                        }
                        if (data.RECHARGE) {
                            Object.assign(window.Web3Config.RECHARGE, data.RECHARGE);
                        }

                        console.log('DApp浏览器: Web3Config已使用缓存配置更新');
                    }
                }
            } catch (cacheError) {
                console.error('DApp浏览器: 使用缓存配置时出错:', cacheError);
            }
        });
    }
})();
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
        ID: 56,  // BSC主网
        NAME: "Binance Smart Chain Mainnet",
        RPC_URL: "https://bsc-dataseed.binance.org/",
        EXPLORER_URL: "https://bscscan.com"
    },

    // 桥接合约配置
    BRIDGE_CONTRACT: {
        ADDRESS: "0xf54677367e6D3511DCa4C336EfE31eaDFc0cDc1b",  // 桥接合约地址（新部署的合约地址）
        OWNER_ADDRESS: "0x744b9acff32f9184c6f6639e6536437e975a4444",  // 合约所有者地址
        GAME_SERVER_ADDRESS: "0xadd34cadc4f69c65fb38c1ceecec707f05865163",  // 游戏服务器地址 (与live-config一致)
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

        // 检测是否在DApp浏览器中运行
        function isDAppBrowser() {
            return (
                window.ethereum ||
                window.web3 ||
                /MetaMask|TokenPocket|imToken|Trust|Coinbase|Opera Crypto/.test(navigator.userAgent)
            );
        }

        // 如果在DApp浏览器中，尝试使用localStorage中的缓存配置
        if (isDAppBrowser()) {
            try {
                const cachedConfig = localStorage.getItem('web3_config_cache');
                if (cachedConfig) {
                    const { timestamp, data } = JSON.parse(cachedConfig);
                    const cacheAge = Date.now() - timestamp;

                    // 如果缓存不超过5分钟，直接使用
                    if (cacheAge < 5 * 60 * 1000) {
                        console.log('Web3Config: 使用DApp浏览器缓存的配置，缓存时间:', new Date(timestamp).toLocaleString());

                        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                            if (data.GAME) {
                                Object.assign(this.GAME, data.GAME);
                                console.log('Web3Config: GAME配置已从缓存更新:', this.GAME);
                            }
                            if (data.NETWORK) {
                                Object.assign(this.NETWORK, data.NETWORK);
                                console.log('Web3Config: NETWORK配置已从缓存更新:', this.NETWORK);
                            }
                            if (data.BRIDGE_CONTRACT) {
                                Object.assign(this.BRIDGE_CONTRACT, data.BRIDGE_CONTRACT);
                                console.log('Web3Config: BRIDGE_CONTRACT配置已从缓存更新:', this.BRIDGE_CONTRACT);
                            }
                            if (data.TOKEN) {
                                Object.assign(this.TOKEN, data.TOKEN);
                                console.log('Web3Config: TOKEN配置已从缓存更新:', this.TOKEN);
                            }
                            if (data.EXCHANGE) {
                                Object.assign(this.EXCHANGE, data.EXCHANGE);
                                console.log('Web3Config: EXCHANGE配置已从缓存更新:', this.EXCHANGE);
                            }
                            if (data.RECHARGE) {
                                Object.assign(this.RECHARGE, data.RECHARGE);
                                console.log('Web3Config: RECHARGE配置已从缓存更新:', this.RECHARGE);
                            }

                            // 设置全局变量
                            window.Web3Config = this;

                            // 完成初始化后，仍然尝试从服务器获取最新配置
                            this.fetchLatestConfig();

                            return true;
                        }
                    } else {
                        console.log('Web3Config: DApp浏览器缓存配置已过期，将从服务器获取最新配置');
                    }
                }
            } catch (cacheError) {
                console.error('Web3Config: 使用DApp浏览器缓存配置时出错:', cacheError);
            }
        }

        // 如果没有使用缓存配置，从服务器获取
        try {
            console.log('Web3Config: 尝试从服务器获取动态Web3配置...');

            // 添加时间戳和缓存控制
            const timestamp = Date.now();
            const response = await fetch(`/api/web3-config?v=${timestamp}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`获取配置失败: ${response.status} ${response.statusText}`);
            }

            const liveConfig = await response.json();
            console.log('Web3Config: 从服务器获取到的动态配置:', liveConfig);

            if (liveConfig && typeof liveConfig === 'object' && Object.keys(liveConfig).length > 0) {
                // 保存到localStorage以便DApp浏览器使用
                if (isDAppBrowser()) {
                    localStorage.setItem('web3_config_cache', JSON.stringify({
                        timestamp: Date.now(),
                        data: liveConfig
                    }));
                    console.log('Web3Config: 配置已缓存到localStorage供DApp浏览器使用');
                }

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
    },

    /**
     * 从服务器获取最新配置
     * 用于在使用缓存配置后仍然尝试获取最新配置
     */
    fetchLatestConfig: async function() {
        try {
            console.log('Web3Config: 后台获取最新配置...');

            // 添加时间戳和缓存控制
            const timestamp = Date.now();
            const response = await fetch(`/api/web3-config?v=${timestamp}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`获取配置失败: ${response.status} ${response.statusText}`);
            }

            const liveConfig = await response.json();
            console.log('Web3Config: 后台获取到的最新配置:', liveConfig);

            let configChanged = false;

            if (liveConfig && typeof liveConfig === 'object' && Object.keys(liveConfig).length > 0) {
                // 检查配置是否有变化
                if (liveConfig.GAME && liveConfig.GAME.START_COST !== this.GAME.START_COST) {
                    configChanged = true;
                    console.log('Web3Config: 检测到START_COST配置变化:', this.GAME.START_COST, '->', liveConfig.GAME.START_COST);
                }

                // 保存到localStorage
                localStorage.setItem('web3_config_cache', JSON.stringify({
                    timestamp: Date.now(),
                    data: liveConfig
                }));

                // 更新配置
                if (liveConfig.GAME) {
                    Object.assign(this.GAME, liveConfig.GAME);
                }
                if (liveConfig.NETWORK) {
                    Object.assign(this.NETWORK, liveConfig.NETWORK);
                }
                if (liveConfig.BRIDGE_CONTRACT) {
                    Object.assign(this.BRIDGE_CONTRACT, liveConfig.BRIDGE_CONTRACT);
                }
                if (liveConfig.TOKEN) {
                    Object.assign(this.TOKEN, liveConfig.TOKEN);
                }
                if (liveConfig.EXCHANGE) {
                    Object.assign(this.EXCHANGE, liveConfig.EXCHANGE);
                }
                if (liveConfig.RECHARGE) {
                    Object.assign(this.RECHARGE, liveConfig.RECHARGE);
                }

                console.log('Web3Config: 配置已在后台更新');

                // 如果配置有变化，触发更新事件
                if (configChanged) {
                    console.log('Web3Config: 检测到配置变化，触发更新事件');
                    const event = new CustomEvent('web3ConfigUpdated', { detail: this });
                    window.dispatchEvent(event);

                    // 显示提示
                    if (typeof showConfigUpdateNotification === 'function') {
                        showConfigUpdateNotification();
                    } else {
                        // 添加一个简单的通知
                        const notification = document.createElement('div');
                        notification.style.position = 'fixed';
                        notification.style.top = '10px';
                        notification.style.left = '50%';
                        notification.style.transform = 'translateX(-50%)';
                        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                        notification.style.color = 'white';
                        notification.style.padding = '10px 20px';
                        notification.style.borderRadius = '5px';
                        notification.style.zIndex = '9999';
                        notification.style.fontSize = '14px';
                        notification.textContent = '配置已更新，刷新页面以应用最新设置';

                        document.body.appendChild(notification);

                        // 3秒后自动消失
                        setTimeout(() => {
                            notification.style.opacity = '0';
                            notification.style.transition = 'opacity 0.5s';
                            setTimeout(() => {
                                document.body.removeChild(notification);
                            }, 500);
                        }, 3000);
                    }
                }
            }
        } catch (error) {
            console.error('Web3Config: 后台获取最新配置失败:', error);
        }
    }
};

// 在页面加载完成后初始化
window.addEventListener('DOMContentLoaded', async function() { // 修改为 async
    // 初始化Web3配置
    await Web3Config.init(); // 使用 await 确保配置加载完成
    // 其他依赖 Web3Config 完全初始化的模块现在应该监听 'web3ConfigLoaded' 事件

    // 检测是否在DApp浏览器中运行
    function isDAppBrowser() {
        return (
            window.ethereum ||
            window.web3 ||
            /MetaMask|TokenPocket|imToken|Trust|Coinbase|Opera Crypto/.test(navigator.userAgent)
        );
    }

    // 如果在DApp浏览器中，添加刷新按钮
    if (isDAppBrowser()) {
        // 等待DOM完全加载
        setTimeout(() => {
            // 创建刷新按钮
            const refreshButton = document.createElement('button');
            refreshButton.textContent = '刷新网页';
            refreshButton.className = 'wallet-button';
            refreshButton.style.backgroundColor = '#3498db'; // 使用蓝色，与断开连接按钮的红色区分
            refreshButton.style.color = 'white';
            refreshButton.style.border = 'none';
            refreshButton.style.padding = '8px 12px';
            refreshButton.style.borderRadius = '5px';
            refreshButton.style.cursor = 'pointer';
            refreshButton.style.fontWeight = 'bold';
            refreshButton.style.fontSize = '12px';
            refreshButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
            refreshButton.style.minWidth = '80px';
            refreshButton.style.textAlign = 'center';
            refreshButton.style.transition = 'all 0.2s ease';

            // 添加悬停效果
            refreshButton.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#2980b9';
                this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.4)';
            });

            refreshButton.addEventListener('mouseout', function() {
                this.style.backgroundColor = '#3498db';
                this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
            });

            // 点击事件
            refreshButton.addEventListener('click', function() {
                // 显示加载中提示
                const loadingNotification = document.createElement('div');
                loadingNotification.style.position = 'fixed';
                loadingNotification.style.top = '50%';
                loadingNotification.style.left = '50%';
                loadingNotification.style.transform = 'translate(-50%, -50%)';
                loadingNotification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                loadingNotification.style.color = 'white';
                loadingNotification.style.padding = '20px';
                loadingNotification.style.borderRadius = '10px';
                loadingNotification.style.zIndex = '10000';
                loadingNotification.style.textAlign = 'center';
                loadingNotification.innerHTML = '正在刷新网页...<br>请稍候';

                document.body.appendChild(loadingNotification);

                // 强制刷新页面
                setTimeout(() => {
                    window.location.reload(true);
                }, 500);
            });

            // 将刷新按钮添加到钱包信息区域，放在断开连接按钮上方
            const walletInfo = document.getElementById('wallet-info');
            const disconnectBtn = document.getElementById('disconnect-wallet');

            if (walletInfo && disconnectBtn) {
                // 将刷新按钮插入到断开连接按钮之前
                walletInfo.insertBefore(refreshButton, disconnectBtn);
                console.log('刷新按钮已添加到断开连接按钮上方');
            } else {
                // 如果找不到钱包信息区域或断开连接按钮，则添加到页面
                document.body.appendChild(refreshButton);
                console.log('未找到钱包信息区域或断开连接按钮，刷新按钮已添加到页面');
            }

            // 监听页面获得焦点事件，自动检查配置更新
            window.addEventListener('focus', function() {
                console.log('DApp浏览器: 页面获得焦点，检查配置更新');
                Web3Config.fetchLatestConfig();
            });
        }, 1000);
    }
});
