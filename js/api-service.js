if (typeof window.ApiService === 'undefined') {
  window.ApiService = {
    // API基础URL - 将由Config.init()动态设置
    baseUrl: '/api', // 默认值，将被Config.init()覆盖

    // 设置API基础URL
    setBaseUrl: function(url) {
        this.baseUrl = url;
        console.log('ApiService: 设置API基础URL为', url);
    },

    // 构建API URL的辅助方法 - 使用baseUrl
    buildApiUrl: function(path) {
        const apiPath = path.startsWith('/') ? path : `/${path}`;

        // 如果baseUrl已设置，使用baseUrl
        if (this.baseUrl) {
            // 确保不重复添加/api前缀
            if (apiPath.startsWith('/api/')) {
                return this.baseUrl.replace('/api', '') + apiPath;
            }
            return this.baseUrl + apiPath;
        }

        // 如果baseUrl未设置，使用相对路径（向后兼容）
        if (apiPath.startsWith('/api/')) {
            return apiPath;
        }
        return `/api${apiPath}`;
    },

    // 用户数据缓存
    _userDataCache: {},
    _userDataTimestamps: {},
    _userDataRequests: {},

    // 获取用户数据
    getUserData: async function(walletAddress) {
        if (!walletAddress) {
            console.error('获取用户数据失败: 钱包地址为空');
            return null;
        }

        // 防抖动：如果同一个钱包地址的请求正在进行中，返回缓存数据或等待
        if (this._userDataRequests[walletAddress]) {
            console.log('已有相同钱包地址的请求正在进行中，使用缓存数据或等待');

            // 如果有缓存数据且不超过5秒，直接返回缓存
            const now = Date.now();
            if (this._userDataCache[walletAddress] &&
                this._userDataTimestamps[walletAddress] &&
                (now - this._userDataTimestamps[walletAddress] < 5000)) {
                console.log('使用缓存的用户数据');
                return this._userDataCache[walletAddress];
            }

            // 否则等待现有请求完成
            try {
                await this._userDataRequests[walletAddress];
                return this._userDataCache[walletAddress] || {};
            } catch (error) {
                console.error('等待现有请求时出错:', error);
                return this._userDataCache[walletAddress] || {};
            }
        }

        // 创建一个Promise，用于跟踪请求状态
        this._userDataRequests[walletAddress] = new Promise(async (resolve, reject) => {
            try {
                // 使用辅助方法构建API URL
                const url = this.buildApiUrl(`/user/${walletAddress}`);
                console.log('获取用户数据URL:', url);

                // 添加缓存控制头，避免使用缓存的结果
                const response = await fetch(url, {
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

                if (response.status === 404) {
                    console.log('未找到用户数据，返回空对象');
                    this._userDataCache[walletAddress] = {};
                    this._userDataTimestamps[walletAddress] = Date.now();
                    resolve({});
                    return {};
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorMessage;
                    try {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.error || '获取用户数据失败';
                    } catch (e) {
                        errorMessage = `获取用户数据失败: ${response.status} ${response.statusText}`;
                    }
                    throw new Error(errorMessage);
                }

                const userData = await response.json();
                console.log('获取用户数据成功:', userData);

                // 更新缓存
                this._userDataCache[walletAddress] = userData;
                this._userDataTimestamps[walletAddress] = Date.now();

                resolve(userData);
                return userData;
            } catch (error) {
                console.error('获取用户数据出错:', error.message);
                // 如果API请求失败，返回缓存数据或空对象
                const cachedData = this._userDataCache[walletAddress] || {};
                reject(error);
                return cachedData;
            } finally {
                // 请求完成后，删除请求标记
                delete this._userDataRequests[walletAddress];
            }
        });

        try {
            return await this._userDataRequests[walletAddress];
        } catch (error) {
            // 如果请求失败，返回缓存数据或空对象
            return this._userDataCache[walletAddress] || {};
        }
    },

    // 保存用户数据
    saveUserData: async function(walletAddress, userData) {
        if (!walletAddress) {
            console.error('保存用户数据失败: 钱包地址为空');
            return false;
        }

        console.log('尝试保存用户数据到API:', walletAddress, userData);

        try {
            const url = this.buildApiUrl(`/user/${walletAddress}`);
            console.log('API请求URL:', url);
            console.log('请求方法: POST');
            console.log('请求体:', JSON.stringify(userData, null, 2));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            console.log('API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应错误:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || '保存用户数据失败');
                } catch (e) {
                    throw new Error(`保存用户数据失败: ${response.status} ${response.statusText}`);
                }
            }

            const result = await response.json();
            console.log('保存用户数据成功:', result);
            return true;
        } catch (error) {
            console.error('保存用户数据出错:', error);
            console.error('错误详情:', error.message);
            return false;
        }
    },

    // 更新用户数据（部分更新）
    updateUserData: async function(walletAddress, updates) {
        if (!walletAddress) {
            console.error('更新用户数据失败: 钱包地址为空');
            return false;
        }

        try {
            const url = this.buildApiUrl(`/user/${walletAddress}`);
            console.log('更新用户数据URL:', url);
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '更新用户数据失败');
            }

            const result = await response.json();
            console.log('更新用户数据成功:', result);
            return true;
        } catch (error) {
            console.error('更新用户数据出错:', error.message);
            return false;
        }
    },

    // 获取用户金币
    getCoins: async function(walletAddress) {
        if (!walletAddress) {
            console.error('获取用户金币失败: 钱包地址为空');
            return 0;
        }

        try {
            const url = this.buildApiUrl(`/user/${walletAddress}/coins`);
            console.log('获取用户金币URL:', url);
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取用户金币失败');
            }

            const data = await response.json();
            console.log('获取用户金币成功:', data);

            // 不再将数据同步到本地存储，直接返回API数据

            return data.coins;
        } catch (error) {
            console.error('获取用户金币出错:', error.message);

            // 如果API获取失败，尝试从本地存储获取
            try {
                // 直接从本地存储获取当前可用金币
                const savedCoins = localStorage.getItem('com.gemioli.tombrunner.coins');

                if (savedCoins) {
                    console.log('从本地存储获取金币余额:', savedCoins);
                    return parseInt(savedCoins, 10);
                }
            } catch (e) {
                console.error('从本地存储获取金币余额时出错:', e);
            }

            return 0;
        }
    },

    // 更新用户金币
    updateCoins: async function(walletAddress, coins, operation = 'add', reason = '') {
        if (!walletAddress) {
            console.error('更新用户金币失败: 钱包地址为空');
            return false;
        }

        console.log(`尝试更新用户金币到API: ${walletAddress}, 金币: ${coins}, 操作: ${operation}, 原因: ${reason}`);

        try {
            const url = this.buildApiUrl(`/user/${walletAddress}/coins`);
            console.log('API请求URL:', url);
            console.log('请求方法: POST');
            console.log('请求体:', JSON.stringify({ coins, operation, reason }, null, 2));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ coins, operation, reason })
            });

            console.log('API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应错误:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || '更新用户金币失败');
                } catch (e) {
                    throw new Error(`更新用户金币失败: ${response.status} ${response.statusText}`);
                }
            }

            const result = await response.json();
            console.log('更新用户金币成功:', result);

            // 不再将数据同步到本地存储，直接返回API结果

            return result.coins;
        } catch (error) {
            console.error('更新用户金币出错:', error);
            console.error('错误详情:', error.message);
            return null;
        }
    },

    // 保存游戏进度
    saveProgress: async function(walletAddress, progressData) {
        console.log('保存游戏进度:', progressData);

        // 不在前端更新金币，而是让后端处理
        // 这样可以避免金币被重复增加

        // 调用API更新游戏进度
        const result = await this.updateUserData(walletAddress, { progress: progressData });

        // 不再将数据同步到本地存储，直接返回API结果

        return result;
    },

    // 获取游戏进度
    getProgress: async function(walletAddress) {
        const userData = await this.getUserData(walletAddress);
        return userData?.progress || null;
    },

    // 保存累计获得金币（直接设置为指定值）
    saveHighScore: async function(walletAddress, score) {
        return this.updateUserData(walletAddress, { highScore: score });
    },

    // 获取累计获得金币
    getHighScore: async function(walletAddress) {
        const userData = await this.getUserData(walletAddress);
        return userData?.highScore || 0;
    },

    // 保存历史最高得分
    saveLastScore: async function(walletAddress, score) {
        try {
            // 更新后端数据
            const updated = await this.updateUserData(walletAddress, { lastScore: score });

            // 不再将数据同步到本地存储，直接返回API结果

            return updated;
        } catch (error) {
            console.error('保存历史最高得分时出错:', error);
            return false;
        }
    },

    // 获取历史最高得分
    getLastScore: async function(walletAddress) {
        try {
            const userData = await this.getUserData(walletAddress);
            const lastScore = userData?.lastScore || 0;

            // 不再将数据同步到本地存储，直接返回API结果

            return lastScore;
        } catch (error) {
            console.error('获取历史最高得分时出错:', error);

            // 尝试从本地存储获取
            const savedScore = localStorage.getItem('com.gemioli.tombrunner.score');
            return savedScore ? parseInt(savedScore, 10) : 0;
        }
    },

    // 保存成就
    saveAchievement: async function(walletAddress, achievementId) {
        const userData = await this.getUserData(walletAddress);
        const achievements = userData?.achievements || [];

        // 检查成就是否已存在
        if (!achievements.includes(achievementId)) {
            achievements.push(achievementId);
            return this.updateUserData(walletAddress, { achievements });
        }

        return false;
    },

    // 获取成就
    getAchievements: async function(walletAddress) {
        const userData = await this.getUserData(walletAddress);
        return userData?.achievements || [];
    },

    // 验证游戏数据并更新金币和最高得分
    verifyGameData: async function(walletAddress, gameCoins, verification, gameScore) {
        if (!walletAddress) {
            console.error('验证游戏数据失败: 钱包地址为空');
            return { success: false, error: '钱包地址为空' };
        }

        if (typeof gameCoins !== 'number' || gameCoins < 0) {
            console.error('验证游戏数据失败: 无效的游戏金币数量');
            return { success: false, error: '无效的游戏金币数量' };
        }

        if (!verification || !verification.code || !verification.timestamp) {
            console.error('验证游戏数据失败: 无效的验证数据');
            return { success: false, error: '无效的验证数据' };
        }

        try {
            const url = this.buildApiUrl('/verify-game-data');
            console.log('验证游戏数据URL:', url);
            console.log('游戏得分:', gameScore);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    walletAddress,
                    gameCoins,
                    verification,
                    gameScore: gameScore || 0 // 添加游戏得分
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '验证游戏数据失败');
            }

            const data = await response.json();
            console.log('验证游戏数据成功:', data);

            return data;
        } catch (error) {
            console.error('验证游戏数据出错:', error.message);
            return { success: false, error: error.message || '验证游戏数据时出错' };
        }
    },

    // 测试API连接
    testConnection: async function() {
        try {
            // 如果Config对象存在，使用Config的端点检测功能
            if (window.Config && typeof Config.detectApiEndpoint === 'function') {
                console.log('使用Config.detectApiEndpoint检测API端点...');
                const apiUrl = await Config.detectApiEndpoint();

                // 更新ApiService的baseUrl
                this.setBaseUrl(apiUrl);
                console.log('API基础URL已更新为:', apiUrl);

                // 构建健康检查URL
                const healthUrl = apiUrl.includes('://')
                    ? apiUrl.replace('/api', '/health')
                    : '/health';

                console.log('测试API连接，URL:', healthUrl);

                // 添加超时设置
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

                try {
                    const response = await fetch(healthUrl, {
                        signal: controller.signal,
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0'
                        }
                    });

                    // 清除超时
                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        console.error('API连接测试失败，状态码:', response.status);
                        return false;
                    }

                    const data = await response.json();
                    console.log('API连接测试成功:', data);
                    return true;
                } catch (fetchError) {
                    // 清除超时
                    clearTimeout(timeoutId);

                    if (fetchError.name === 'AbortError') {
                        console.error('API连接测试超时');
                    } else {
                        console.error('API连接测试出错:', fetchError.message);
                    }
                    return false;
                }
            } else {
                // 如果Config对象不存在，使用默认的健康检查
                console.log('Config对象不存在，使用默认健康检查...');

                // 始终使用相对路径 /health
                const testUrl = '/health';
                console.log('测试API连接，URL:', testUrl);

                // 添加超时设置，避免长时间等待
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

                try {
                    const response = await fetch(testUrl, {
                        signal: controller.signal,
                        // 添加缓存控制，避免使用缓存的结果
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0'
                        }
                    });

                    // 清除超时
                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        console.error('API连接测试失败，状态码:', response.status);
                        return false;
                    }

                    const data = await response.json();
                    console.log('API连接测试成功:', data);
                    return true;
                } catch (fetchError) {
                    // 清除超时
                    clearTimeout(timeoutId);

                    if (fetchError.name === 'AbortError') {
                        console.error('API连接测试超时');
                    } else {
                        console.error('API连接测试出错:', fetchError.message);
                    }
                    return false;
                }
            }
        } catch (error) {
            console.error('API连接测试出错:', error.message);
            return false;
        }
    },

    // 创建新用户数据
    createUserData: async function(walletAddress) {
        if (!walletAddress) {
            console.error('创建新用户数据失败: 钱包地址为空');
            return false;
        }

        console.log('尝试创建新用户数据:', walletAddress);

        try {
            // 使用辅助方法构建API URL
            // 始终使用相对路径 /create-user-data/...
            const url = `/create-user-data/${walletAddress}`;

            console.log('API请求URL:', url);

            const response = await fetch(url);
            console.log('API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应错误:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || '创建新用户数据失败');
                } catch (e) {
                    throw new Error(`创建新用户数据失败: ${response.status} ${response.statusText}`);
                }
            }

            const result = await response.json();
            console.log('创建新用户数据成功:', result);
            return true;
        } catch (error) {
            console.error('创建新用户数据出错:', error);
            console.error('错误详情:', error.message);
            return false;
        }
    },

    // 获取代币兑换配置
    getTokenExchangeConfig: async function() {
        try {
            // 尝试从GameConfig获取（如果已加载）
            if (typeof GameConfig !== 'undefined' && GameConfig.TOKEN_EXCHANGE) {
                console.log('从GameConfig获取代币兑换配置');
                return GameConfig.TOKEN_EXCHANGE;
            }

            // 如果GameConfig未加载或没有相关配置，则从API获取
            console.log('从API获取代币兑换配置');
            const url = this.buildApiUrl('/config/token-exchange');
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取代币兑换配置失败');
            }

            const config = await response.json();
            console.log('获取代币兑换配置成功:', config);
            return config;
        } catch (error) {
            console.error('获取代币兑换配置出错:', error.message);
            // 返回默认配置或错误处理
            const defaultConfig = {
                TOKEN_NAME: 'Token',
                COINS_PER_TOKEN: 100,
                MIN_EXCHANGE_AMOUNT: 1,
                MAX_EXCHANGE_AMOUNT: 10000,
                EXCHANGE_FEE_PERCENT: 0,
                TAX_WALLET_ADDRESS: '',
                TAX_RATE_BIPS: 0, // 税率，以BIPS为单位 (例如 100 BIPS = 1%)
                INVERSE_MODE: false // 是否为反向兑换模式
            };
            console.warn('返回默认代币兑换配置:', defaultConfig);
            return defaultConfig;
        }
    },

    // 获取代币充值配置
    getTokenRechargeConfig: async function() {
        try {
            // 尝试从GameConfig获取（如果已加载）
            if (typeof GameConfig !== 'undefined' && GameConfig.TOKEN_RECHARGE) {
                console.log('从GameConfig获取代币充值配置');
                return GameConfig.TOKEN_RECHARGE;
            }

            // 如果GameConfig未加载或没有相关配置，则从API获取
            console.log('从API获取代币充值配置');
            const url = this.buildApiUrl('/config/token-recharge');
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取代币充值配置失败');
            }

            const config = await response.json();
            console.log('获取代币充值配置成功:', config);
            return config;
        } catch (error) {
            console.error('获取代币充值配置出错:', error.message);
            // 返回默认配置或错误处理
            const defaultConfig = {
                TOKEN_NAME: 'Token',
                COINS_PER_TOKEN: 100,
                MIN_RECHARGE_AMOUNT: 1,
                MAX_RECHARGE_AMOUNT: 10000,
                RECHARGE_FEE_PERCENT: 0,
                TAX_WALLET_ADDRESS: '',
                TAX_RATE_BIPS: 0, // 税率，以BIPS为单位 (例如 100 BIPS = 1%)
                INVERSE_MODE: false // 是否为反向兑换模式
            };
            console.warn('返回默认代币充值配置:', defaultConfig);
            return defaultConfig;
        }
    },

    // 记录代币兑换历史
    recordExchangeHistory: async function(walletAddress, type, amount, coins, transactionHash, status, fee, tax) {
        if (!walletAddress) {
            console.error('记录代币兑换历史失败: 钱包地址为空');
            return { success: false, error: '钱包地址为空' };
        }

        console.log('尝试记录代币兑换历史到API:', { walletAddress, type, amount, coins, transactionHash, status, fee, tax });

        try {
            const url = this.buildApiUrl(`/user/${walletAddress}/exchange-history`);
            console.log('API请求URL:', url);
            console.log('请求方法: POST');
            console.log('请求体:', JSON.stringify({ type, amount, coins, transactionHash, status, fee, tax }, null, 2));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type, amount, coins, transactionHash, status, fee, tax })
            });

            console.log('API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应错误:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || '记录代币兑换历史失败');
                } catch (e) {
                    throw new Error(`记录代币兑换历史失败: ${response.status} ${response.statusText}`);
                }
            }

            const result = await response.json();
            console.log('记录代币兑换历史成功:', result);
            return { success: true, data: result };
        } catch (error) {
            console.error('记录代币兑换历史出错:', error);
            console.error('错误详情:', error.message);
            return { success: false, error: error.message || '记录代币兑换历史时出错' };
        }
    },

    // 获取代币兑换历史
    getExchangeHistory: async function(walletAddress) {
        if (!walletAddress) {
            console.error('获取代币兑换历史失败: 钱包地址为空');
            return [];
        }

        try {
            const url = this.buildApiUrl(`/user/${walletAddress}/exchange-history`);
            console.log('获取代币兑换历史URL:', url);
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取代币兑换历史失败');
            }

            const history = await response.json();
            console.log('获取代币兑换历史成功:', history);
            return history;
        } catch (error) {
            console.error('获取代币兑换历史出错:', error.message);
            return [];
        }
    },

    // 记录代币充值历史
    recordRechargeHistory: async function(walletAddress, type, amount, coins, transactionHash, status, fee, tax) {
        if (!walletAddress) {
            console.error('记录代币充值历史失败: 钱包地址为空');
            return { success: false, error: '钱包地址为空' };
        }

        console.log('尝试记录代币充值历史到API:', { walletAddress, type, amount, coins, transactionHash, status, fee, tax });

        try {
            const url = this.buildApiUrl(`/user/${walletAddress}/recharge-history`);
            console.log('API请求URL:', url);
            console.log('请求方法: POST');
            console.log('请求体:', JSON.stringify({ type, amount, coins, transactionHash, status, fee, tax }, null, 2));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type, amount, coins, transactionHash, status, fee, tax })
            });

            console.log('API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应错误:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || '记录代币充值历史失败');
                } catch (e) {
                    throw new Error(`记录代币充值历史失败: ${response.status} ${response.statusText}`);
                }
            }

            const result = await response.json();
            console.log('记录代币充值历史成功:', result);
            return { success: true, data: result };
        } catch (error) {
            console.error('记录代币充值历史出错:', error);
            console.error('错误详情:', error.message);
            return { success: false, error: error.message || '记录代币充值历史时出错' };
        }
    },

    // 获取代币充值历史
    getRechargeHistory: async function(walletAddress) {
        if (!walletAddress) {
            console.error('获取代币充值历史失败: 钱包地址为空');
            return [];
        }

        try {
            const url = this.buildApiUrl(`/user/${walletAddress}/recharge-history`);
            console.log('获取代币充值历史URL:', url);
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取代币充值历史失败');
            }

            const history = await response.json();
            console.log('获取代币充值历史成功:', history);
            return history;
        } catch (error) {
            console.error('获取代币充值历史出错:', error.message);
            return [];
        }
    },

    // 获取排行榜数据
    getLeaderboard: async function(limit = 10) {
        try {
            const url = this.buildApiUrl(`/leaderboard?limit=${limit}`);
            console.log('获取排行榜数据URL:', url);
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取排行榜数据失败');
            }

            const leaderboardData = await response.json();
            console.log('获取排行榜数据成功:', leaderboardData);
            return leaderboardData;
        } catch (error) {
            console.error('获取排行榜数据出错:', error.message);
            return [];
        }
    },

    // 获取游戏配置
    getGameConfig: async function() {
        try {
            const url = this.buildApiUrl('/config/game');
            console.log('获取游戏配置URL:', url);
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取游戏配置失败');
            }

            const config = await response.json();
            console.log('获取游戏配置成功:', config);
            return config;
        } catch (error) {
            console.error('获取游戏配置出错:', error.message);
            // 返回默认配置或错误处理
            const defaultConfig = {
                START_COST: 0,
                RESTART_COST: 0,
                DEBUG_MODE: false,
                USE_API: true,
                API_BASE_URL: '/api'
            };
            console.warn('返回默认游戏配置:', defaultConfig);
            return defaultConfig;
        }
    },

    // 获取网络配置
    getNetworkConfig: async function() {
        try {
            const url = this.buildApiUrl('/config/network');
            console.log('获取网络配置URL:', url);
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取网络配置失败');
            }

            const config = await response.json();
            console.log('获取网络配置成功:', config);
            return config;
        } catch (error) {
            console.error('获取网络配置出错:', error.message);
            // 返回默认配置或错误处理
            const defaultConfig = {
                ID: 97, // BSC Testnet
                NAME: 'Binance Smart Chain Testnet',
                RPC_URL: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
                EXPLORER_URL: 'https://testnet.bscscan.com'
            };
            console.warn('返回默认网络配置:', defaultConfig);
            return defaultConfig;
        }
    },

    // 获取桥接合约配置
    getBridgeContractConfig: async function() {
        try {
            const url = this.buildApiUrl('/config/bridge-contract');
            console.log('获取桥接合约配置URL:', url);
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取桥接合约配置失败');
            }

            const config = await response.json();
            console.log('获取桥接合约配置成功:', config);
            return config;
        } catch (error) {
            console.error('获取桥接合约配置出错:', error.message);
            // 返回默认配置或错误处理
            const defaultConfig = {
                ADDRESS: '',
                OWNER_ADDRESS: '',
                GAME_SERVER_ADDRESS: '',
                TAX_WALLET_ADDRESS: ''
            };
            console.warn('返回默认桥接合约配置:', defaultConfig);
            return defaultConfig;
        }
    },

    // 获取代币配置
    getTokenConfig: async function() {
        try {
            const url = this.buildApiUrl('/config/token');
            console.log('获取代币配置URL:', url);
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取代币配置失败');
            }

            const config = await response.json();
            console.log('获取代币配置成功:', config);
            return config;
        } catch (error) {
            console.error('获取代币配置出错:', error.message);
            // 返回默认配置或错误处理
            const defaultConfig = {
                NAME: 'Token',
                SYMBOL: 'TKN',
                DECIMALS: 18,
                ADDRESS: ''
            };
            console.warn('返回默认代币配置:', defaultConfig);
            return defaultConfig;
        }
    },

    // 获取所有Web3配置
    getAllWeb3Config: async function() {
        try {
            const url = this.buildApiUrl('/config/all-web3-config');
            console.log('获取所有Web3配置URL:', url);
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取所有Web3配置失败');
            }

            const config = await response.json();
            console.log('获取所有Web3配置成功:', config);
            return config;
        } catch (error) {
            console.error('获取所有Web3配置出错:', error.message);
            // 返回包含所有默认配置的对象
            const defaultConfig = {
                GAME: await this.getGameConfig(),
                NETWORK: await this.getNetworkConfig(),
                BRIDGE_CONTRACT: await this.getBridgeContractConfig(),
                TOKEN: await this.getTokenConfig(),
                EXCHANGE: await this.getTokenExchangeConfig(),
                RECHARGE: await this.getTokenRechargeConfig()
            };
            console.warn('返回默认所有Web3配置:', defaultConfig);
            return defaultConfig;
        }
    }, // 添加逗号
// 获取代币兑换签名
    getExchangeSignature: async function(playerAddress, tokenAmount, gameCoins, contractAddress, isInverse) {
        if (!playerAddress || typeof tokenAmount === 'undefined' || typeof gameCoins === 'undefined' || !contractAddress) {
            console.error('获取兑换签名失败: 缺少必要参数');
            return { success: false, error: '获取兑换签名失败: 缺少必要参数' };
        }

        console.log('ApiService: 请求兑换签名，参数:', { playerAddress, tokenAmount, gameCoins, contractAddress, isInverse });

        try {
            const url = this.buildApiUrl('/sign-exchange'); // 使用 buildApiUrl 构造完整路径
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerAddress,
                    tokenAmount,
                    gameCoins,
                    contractAddress,
                    isInverse
                })
            });

            const responseData = await response.json();

            if (!response.ok) {
                console.error('获取兑换签名API响应错误:', responseData);
                throw new Error(responseData.error || `获取兑换签名失败: ${response.status}`);
            }

            console.log('ApiService: 获取兑换签名成功:', responseData);
            return responseData; // 期望包含 { success: true, signature, nonce, signer }
        } catch (error) {
            console.error('ApiService: 获取兑换签名出错:', error);
            return { success: false, error: error.message || '获取兑换签名时发生客户端错误' };
        }
    }, // 添加逗号，因为它不再是最后一个方法

    // 获取代币充值签名
    getRechargeSignature: async function(playerAddress, tokenAmount, gameCoins, contractAddress, isInverse) {
        if (!playerAddress || typeof tokenAmount === 'undefined' || typeof gameCoins === 'undefined' || !contractAddress) {
            console.error('获取充值签名失败: 缺少必要参数');
            return { success: false, error: '获取充值签名失败: 缺少必要参数' };
        }

        // 如果未提供 isInverse 参数，尝试从 Web3Config 获取
        if (typeof isInverse === 'undefined' && typeof Web3Config !== 'undefined' && Web3Config.RECHARGE) {
            isInverse = Web3Config.RECHARGE.INVERSE_MODE;
            console.log('从 Web3Config 获取 isInverse 值:', isInverse);
        } else if (typeof isInverse === 'undefined') {
            // 如果 Web3Config 不可用，默认使用 true
            isInverse = true;
            console.log('使用默认的 isInverse 值:', isInverse);
        }

        console.log('ApiService: 请求充值签名，参数:', { playerAddress, tokenAmount, gameCoins, contractAddress, isInverse });

        try {
            const url = this.buildApiUrl('/sign-recharge');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerAddress,
                    tokenAmount,
                    gameCoins,
                    contractAddress,
                    isInverse
                })
            });

            const responseData = await response.json();

            if (!response.ok) {
                console.error('获取充值签名API响应错误:', responseData);
                throw new Error(responseData.error || `获取充值签名失败: ${response.status}`);
            }

            console.log('ApiService: 获取充值签名成功:', responseData);
            return responseData;
        } catch (error) {
            console.error('ApiService: 获取充值签名出错:', error);
            return { success: false, error: error.message || '获取充值签名时发生客户端错误' };
        }
    }, // 添加逗号，因为它不再是最后一个方法

    // 确认代币充值
    confirmRecharge: async function(playerAddress, tokenAmount, gameCoins, nonce, txHash) {
        if (!playerAddress || typeof tokenAmount === 'undefined' || typeof gameCoins === 'undefined' || !nonce || !txHash) {
            console.error('确认充值失败: 缺少必要参数');
            return { success: false, error: '确认充值失败: 缺少必要参数' };
        }

        console.log('ApiService: 请求确认充值，参数:', { playerAddress, tokenAmount, gameCoins, nonce, txHash });

        try {
            const url = this.buildApiUrl('/confirm-recharge');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerAddress,
                    tokenAmount,
                    gameCoins,
                    nonce,
                    txHash
                })
            });

            const responseData = await response.json();

            if (!response.ok) {
                console.error('确认充值API响应错误:', responseData);
                throw new Error(responseData.error || `确认充值失败: ${response.status}`);
            }

            console.log('ApiService: 确认充值成功:', responseData);
            return responseData;
        } catch (error) {
            console.error('ApiService: 确认充值出错:', error);
            return { success: false, error: error.message || '确认充值时发生客户端错误' };
        }
    },

    // 确认代币兑换 (通知服务器)
    confirmExchangeOnServer: async function(playerAddress, tokenAmount, gameCoins, nonce, txHash, isInverse) {
        if (!playerAddress || typeof tokenAmount === 'undefined' || typeof gameCoins === 'undefined' || !nonce || !txHash || typeof isInverse === 'undefined') {
            console.error('确认兑换失败: 缺少必要参数', { playerAddress, tokenAmount, gameCoins, nonce, txHash, isInverse });
            return { success: false, error: '确认兑换失败: 缺少必要参数' };
        }

        console.log('ApiService: 请求确认兑换，参数:', { playerAddress, tokenAmount, gameCoins, nonce, txHash, isInverse });

        try {
            const url = this.buildApiUrl('/confirm-exchange');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerAddress,
                    tokenAmount,
                    gameCoins,
                    nonce,
                    txHash,
                    isInverse
                })
            });

            const responseData = await response.json();

            if (!response.ok) {
                console.error('确认兑换API响应错误:', responseData);
                throw new Error(responseData.error || `确认兑换失败: ${response.status}`);
            }

            console.log('ApiService: 确认兑换成功:', responseData);
            return responseData; // 期望包含 { success: true, message, coinsRefunded, failureReason }
        } catch (error) {
            console.error('ApiService: 确认兑换出错:', error);
            return { success: false, error: error.message || '确认兑换时发生客户端错误' };
        }
    },

    // 取消兑换 (通知服务器)
    cancelExchange: async function(playerAddress, tokenAmount, gameCoins, nonce, reason = '用户取消或交易失败') {
        if (!playerAddress || typeof tokenAmount === 'undefined' || typeof gameCoins === 'undefined' || !nonce) {
            console.error('取消兑换失败: 缺少必要参数');
            return { success: false, error: '取消兑换失败: 缺少必要参数' };
        }

        console.log('ApiService: 请求取消兑换，参数:', { playerAddress, tokenAmount, gameCoins, nonce, reason });

        try {
            const url = this.buildApiUrl('/cancel-exchange');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerAddress,
                    tokenAmount,
                    gameCoins,
                    nonce,
                    reason
                })
            });

            const responseData = await response.json();

            if (!response.ok) {
                console.error('取消兑换API响应错误:', responseData);
                // 即便API调用失败，也可能只是通知性质的，不一定需要阻塞前端流程
                // 但至少要记录错误
            }

            console.log('ApiService: 取消兑换API调用完成:', responseData);
            return responseData;
        } catch (error) {
            console.error('ApiService: 取消兑换出错:', error);
            return { success: false, error: error.message || '取消兑换时发生客户端错误' };
        }
    },

    // 获取提现记录
    getWithdrawalHistory: async function(walletAddress) {
        if (!walletAddress) {
            console.error('获取提现记录失败: 钱包地址为空');
            return [];
        }

        try {
            const url = this.buildApiUrl(`/user/${walletAddress}/withdrawal-history`);
            console.log('获取提现记录URL:', url);
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取提现记录失败');
            }

            const history = await response.json();
            console.log('获取提现记录成功:', history);
            return history;
        } catch (error) {
            console.error('获取提现记录出错:', error.message);
            return [];
        }
    },

    // 获取充值记录
    getRechargeHistory: async function(walletAddress) {
        if (!walletAddress) {
            console.error('获取充值记录失败: 钱包地址为空');
            return [];
        }

        try {
            const url = this.buildApiUrl(`/user/${walletAddress}/recharge-history`);
            console.log('获取充值记录URL:', url);
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取充值记录失败');
            }

            const history = await response.json();
            console.log('获取充值记录成功:', history);
            return history;
        } catch (error) {
            console.error('获取充值记录出错:', error.message);
            return [];
        }
    } // 这个现在是最后一个方法，所以末尾不需要逗号
  };
}
