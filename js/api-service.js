/**
 * API服务
 * 用于与后端服务器通信，保存和获取用户数据
 */
const ApiService = {
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

    // 获取用户数据
    getUserData: async function(walletAddress) {
        if (!walletAddress) {
            console.error('获取用户数据失败: 钱包地址为空');
            return null;
        }

        try {
            // 使用辅助方法构建API URL
            const url = this.buildApiUrl(`/user/${walletAddress}`);
            console.log('获取用户数据URL:', url);
            const response = await fetch(url);

            if (response.status === 404) {
                console.log('未找到用户数据，返回空对象');
                return {};
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取用户数据失败');
            }

            const userData = await response.json();
            console.log('获取用户数据成功:', userData);
            return userData;
        } catch (error) {
            console.error('获取用户数据出错:', error.message);
            // 如果API请求失败，返回空对象而不是null，以便前端代码可以继续运行
            return {};
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
                throw new Error(`创建新用户数据失败: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.isNew) {
                console.log('成功创建新用户数据:', result);
            } else {
                console.log('用户数据已存在，返回现有数据:', result);
            }

            // 同步用户数据到本地存储
            if (result.data) {
                try {
                    // 不再将数据同步到本地存储，直接返回API结果
                    console.log('已成功创建新用户数据:', result.data);
                } catch (e) {
                    console.error('同步用户数据到本地存储时出错:', e);
                }
            }

            return result;
        } catch (error) {
            console.error('创建新用户数据出错:', error);
            console.error('错误详情:', error.message);
            return false;
        }
    },

    // 获取用户代币余额 - 已弃用，现在使用Web3合约直接获取
    getTokenBalance: async function(_) {
        console.warn('ApiService.getTokenBalance方法已弃用，请使用Web3TokenContract.getBalance方法');
        return 0;
    },

    // 兑换代币
    exchangeTokens: async function(walletAddress, tokenAmount) {
        if (!walletAddress) {
            console.error('兑换代币失败: 钱包地址为空');
            return { success: false, error: '钱包地址为空' };
        }

        if (!tokenAmount || tokenAmount <= 0) {
            console.error('兑换代币失败: 代币数量无效');
            return { success: false, error: '代币数量必须大于0' };
        }

        // 获取配置中的兑换比例
        const exchangeConfig = typeof GameConfig !== 'undefined' ? GameConfig.TOKEN_EXCHANGE : {
            COINS_PER_TOKEN: 1000,
            MIN_EXCHANGE_AMOUNT: 1,
            MAX_EXCHANGE_AMOUNT: 1000,
            EXCHANGE_FEE_PERCENT: 2
        };

        // 检查兑换数量是否在允许范围内
        if (tokenAmount < exchangeConfig.MIN_EXCHANGE_AMOUNT) {
            return {
                success: false,
                error: `兑换数量不能小于${exchangeConfig.MIN_EXCHANGE_AMOUNT}个代币`
            };
        }

        if (tokenAmount > exchangeConfig.MAX_EXCHANGE_AMOUNT) {
            return {
                success: false,
                error: `兑换数量不能大于${exchangeConfig.MAX_EXCHANGE_AMOUNT}个代币`
            };
        }

        // 计算需要的金币数量
        const requiredCoins = tokenAmount * exchangeConfig.COINS_PER_TOKEN;

        // 计算手续费
        const feePercentage = exchangeConfig.EXCHANGE_FEE_PERCENT / 100;
        const feeAmount = Math.ceil(requiredCoins * feePercentage);
        const totalCoinsNeeded = requiredCoins + feeAmount;

        console.log(`尝试兑换代币: ${tokenAmount} 个代币，需要 ${requiredCoins} 金币，手续费 ${feeAmount} 金币，总计 ${totalCoinsNeeded} 金币`);

        try {
            const url = this.buildApiUrl(`/user/${walletAddress}/exchange-tokens`);
            console.log('API请求URL:', url);
            console.log('请求方法: POST');
            console.log('请求体:', JSON.stringify({ tokenAmount }, null, 2));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tokenAmount,
                    coinsPerToken: exchangeConfig.COINS_PER_TOKEN,
                    feePercent: exchangeConfig.EXCHANGE_FEE_PERCENT
                })
            });

            console.log('API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应错误:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    return { success: false, error: errorData.error || '兑换代币失败' };
                } catch (e) {
                    return { success: false, error: `兑换代币失败: ${response.status} ${response.statusText}` };
                }
            }

            const result = await response.json();
            console.log('兑换代币成功:', result);

            return {
                success: true,
                data: result,
                message: `成功兑换 ${tokenAmount} 个代币，消耗 ${totalCoinsNeeded} 金币（含手续费 ${feeAmount} 金币）`
            };
        } catch (error) {
            console.error('兑换代币出错:', error);
            console.error('错误详情:', error.message);
            return { success: false, error: error.message || '兑换代币时发生错误' };
        }
    },

    // 获取兑换历史
    getExchangeHistory: async function(walletAddress) {
        if (!walletAddress) {
            console.error('获取兑换历史失败: 钱包地址为空');
            return [];
        }

        try {
            const url = this.buildApiUrl(`/user/${walletAddress}/exchange-history`);
            console.log('获取兑换历史URL:', url);
            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取兑换历史失败');
            }

            const data = await response.json();
            console.log('获取兑换历史成功:', data);
            return data.history || [];
        } catch (error) {
            console.error('获取兑换历史出错:', error.message);
            return [];
        }
    },



    // 获取兑换签名
    getExchangeSignature: async function(playerAddress, tokenAmount, gameCoins) {
        if (!playerAddress) {
            console.error('获取兑换签名失败: 玩家地址为空');
            return { success: false, error: '玩家地址为空' };
        }

        if (!tokenAmount || tokenAmount <= 0) {
            console.error('获取兑换签名失败: 代币数量无效');
            return { success: false, error: '代币数量必须大于0' };
        }

        if (!gameCoins || gameCoins <= 0) {
            console.error('获取兑换签名失败: 游戏金币数量无效');
            return { success: false, error: '游戏金币数量必须大于0' };
        }

        // 获取合约地址
        let contractAddress = '';
        if (typeof GameConfig !== 'undefined' &&
            GameConfig.TOKEN_EXCHANGE &&
            GameConfig.TOKEN_EXCHANGE.CONTRACT_ADDRESS) {
            contractAddress = GameConfig.TOKEN_EXCHANGE.CONTRACT_ADDRESS;
            console.log('使用配置中的合约地址:', contractAddress);
        } else {
            console.error('获取兑换签名失败: 未找到合约地址配置');
            return { success: false, error: '未找到合约地址配置，请检查GameConfig' };
        }

        try {
            console.log('准备获取兑换签名...');
            console.log('- 玩家地址:', playerAddress);
            console.log('- 代币数量:', tokenAmount);
            console.log('- 游戏金币:', gameCoins);
            console.log('- 合约地址:', contractAddress);

            const url = this.buildApiUrl(`/sign-exchange`);
            console.log('API请求URL:', url);
            console.log('请求方法: POST');
            console.log('请求体:', JSON.stringify({
                playerAddress,
                tokenAmount,
                gameCoins,
                contractAddress
            }, null, 2));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerAddress,
                    tokenAmount,
                    gameCoins,
                    contractAddress
                })
            });

            console.log('API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应错误:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    return { success: false, error: errorData.error || '获取兑换签名失败' };
                } catch (e) {
                    return { success: false, error: `获取兑换签名失败: ${response.status} ${response.statusText}` };
                }
            }

            const result = await response.json();
            console.log('获取兑换签名成功:', result);

            // 添加更多调试信息
            if (result.signature) {
                console.log('- 签名长度:', result.signature.length);
                console.log('- 签名前10个字符:', result.signature.substring(0, 10) + '...');
                console.log('- 签名后10个字符:', '...' + result.signature.substring(result.signature.length - 10));
            }

            if (result.nonce) {
                console.log('- Nonce:', result.nonce);
            }

            if (result.signer) {
                console.log('- 签名者地址:', result.signer);
                console.log('- 是否与游戏服务器地址匹配:',
                    typeof GameConfig !== 'undefined' &&
                    GameConfig.TOKEN_EXCHANGE &&
                    GameConfig.TOKEN_EXCHANGE.GAME_SERVER_ADDRESS === result.signer);
            }

            return {
                success: true,
                signature: result.signature,
                nonce: result.nonce,
                signer: result.signer,
                message: '获取兑换签名成功'
            };
        } catch (error) {
            console.error('获取兑换签名出错:', error);
            console.error('错误详情:', error.message);
            console.error('错误堆栈:', error.stack || '无堆栈信息');
            return { success: false, error: error.message || '获取兑换签名时发生错误' };
        }
    },

    // 获取充值签名
    getRechargeSignature: async function(playerAddress, tokenAmount, gameCoins) {
        if (!playerAddress) {
            console.error('获取充值签名失败: 玩家地址为空');
            return { success: false, error: '玩家地址为空' };
        }

        if (!tokenAmount || tokenAmount <= 0) {
            console.error('获取充值签名失败: 代币数量无效');
            return { success: false, error: '代币数量必须大于0' };
        }

        if (!gameCoins || gameCoins <= 0) {
            console.error('获取充值签名失败: 游戏金币数量无效');
            return { success: false, error: '游戏金币数量必须大于0' };
        }

        // 获取合约地址
        let contractAddress = '';
        if (typeof GameConfig !== 'undefined' &&
            GameConfig.TOKEN_RECHARGE &&
            GameConfig.TOKEN_RECHARGE.CONTRACT_ADDRESS) {
            contractAddress = GameConfig.TOKEN_RECHARGE.CONTRACT_ADDRESS;
        } else {
            console.error('获取充值签名失败: 未找到合约地址配置');
            return { success: false, error: '未找到合约地址配置，请检查GameConfig' };
        }

        try {
            // 注意：这里的参数顺序必须与合约中的_verifyRechargeSignature函数匹配
            // 合约中的参数顺序是: player, tokenAmount, gameCoins, nonce, address(this), "recharge"
            console.log('准备获取充值签名...');
            console.log('- 玩家地址:', playerAddress);
            console.log('- 代币数量:', tokenAmount);
            console.log('- 游戏金币:', gameCoins);
            console.log('- 合约地址:', contractAddress);

            const url = this.buildApiUrl(`/sign-recharge`);
            console.log('API请求URL:', url);
            console.log('请求方法: POST');
            console.log('请求体:', JSON.stringify({
                playerAddress,
                tokenAmount,
                gameCoins,
                contractAddress
            }, null, 2));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerAddress,
                    tokenAmount,
                    gameCoins,
                    contractAddress
                })
            });

            console.log('API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应错误:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    return { success: false, error: errorData.error || '获取充值签名失败' };
                } catch (e) {
                    return { success: false, error: `获取充值签名失败: ${response.status} ${response.statusText}` };
                }
            }

            const result = await response.json();
            console.log('获取充值签名成功:', result);

            // 添加更多调试信息
            if (result.signature) {
                console.log('- 签名长度:', result.signature.length);
                console.log('- 签名前10个字符:', result.signature.substring(0, 10) + '...');
                console.log('- 签名后10个字符:', '...' + result.signature.substring(result.signature.length - 10));
            }

            if (result.nonce) {
                console.log('- Nonce:', result.nonce);
            }

            if (result.signer) {
                console.log('- 签名者地址:', result.signer);
                console.log('- 是否与游戏服务器地址匹配:',
                    typeof GameConfig !== 'undefined' &&
                    GameConfig.TOKEN_EXCHANGE &&
                    GameConfig.TOKEN_EXCHANGE.GAME_SERVER_ADDRESS === result.signer);
            }

            return {
                success: true,
                signature: result.signature,
                nonce: result.nonce,
                signer: result.signer,
                message: '获取充值签名成功'
            };
        } catch (error) {
            console.error('获取充值签名出错:', error);
            console.error('错误详情:', error.message);
            return { success: false, error: error.message || '获取充值签名时发生错误' };
        }
    },

    // 取消兑换，退还金币
    cancelExchange: async function(playerAddress, tokenAmount, gameCoins, nonce) {
        if (!playerAddress) {
            console.error('取消兑换失败: 玩家地址为空');
            return { success: false, error: '玩家地址为空' };
        }

        if (!tokenAmount || tokenAmount <= 0) {
            console.error('取消兑换失败: 代币数量无效');
            return { success: false, error: '代币数量必须大于0' };
        }

        if (!gameCoins || gameCoins <= 0) {
            console.error('取消兑换失败: 游戏金币数量无效');
            return { success: false, error: '游戏金币数量必须大于0' };
        }

        if (!nonce) {
            console.error('取消兑换失败: nonce为空');
            return { success: false, error: 'nonce不能为空' };
        }

        try {
            const url = this.buildApiUrl(`/cancel-exchange`);
            console.log('API请求URL:', url);
            console.log('请求方法: POST');
            console.log('请求体:', JSON.stringify({
                playerAddress,
                tokenAmount,
                gameCoins,
                nonce,
                reason: '用户取消交易'
            }, null, 2));

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
                    reason: '用户取消交易'
                })
            });

            console.log('API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应错误:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    return { success: false, error: errorData.error || '取消兑换失败' };
                } catch (e) {
                    return { success: false, error: `取消兑换失败: ${response.status} ${response.statusText}` };
                }
            }

            const result = await response.json();
            console.log('取消兑换成功，金币已退还:', result);

            return {
                success: true,
                coins: result.coins,
                refundedCoins: result.refundedCoins,
                message: '兑换已取消，金币已退还'
            };
        } catch (error) {
            console.error('取消兑换出错:', error);
            console.error('错误详情:', error.message);
            return { success: false, error: error.message || '取消兑换时发生错误' };
        }
    },

    // 确认充值成功，添加金币
    confirmRecharge: async function(playerAddress, tokenAmount, gameCoins, nonce, txHash) {
        if (!playerAddress) {
            console.error('确认充值失败: 玩家地址为空');
            return { success: false, error: '玩家地址为空' };
        }

        if (!tokenAmount || tokenAmount <= 0) {
            console.error('确认充值失败: 代币数量无效');
            return { success: false, error: '代币数量必须大于0' };
        }

        if (!gameCoins || gameCoins <= 0) {
            console.error('确认充值失败: 游戏金币数量无效');
            return { success: false, error: '游戏金币数量必须大于0' };
        }

        if (!nonce) {
            console.error('确认充值失败: nonce为空');
            return { success: false, error: 'nonce不能为空' };
        }

        if (!txHash) {
            console.error('确认充值失败: 交易哈希为空');
            return { success: false, error: '交易哈希不能为空' };
        }

        try {
            const url = this.buildApiUrl(`/confirm-recharge`);
            console.log('API请求URL:', url);
            console.log('请求方法: POST');
            console.log('请求体:', JSON.stringify({
                playerAddress,
                tokenAmount,
                gameCoins,
                nonce,
                txHash
            }, null, 2));

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

            console.log('API响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API响应错误:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    return { success: false, error: errorData.error || '确认充值失败' };
                } catch (e) {
                    return { success: false, error: `确认充值失败: ${response.status} ${response.statusText}` };
                }
            }

            const result = await response.json();
            console.log('确认充值成功:', result);

            return {
                success: true,
                coins: result.coins,
                addedCoins: result.addedCoins,
                message: '确认充值成功，金币已添加'
            };
        } catch (error) {
            console.error('确认充值出错:', error);
            console.error('错误详情:', error.message);
            return { success: false, error: error.message || '确认充值时发生错误' };
        }
    }
};
