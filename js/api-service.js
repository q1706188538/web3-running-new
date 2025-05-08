/**
 * API服务
 * 用于与后端服务器通信，保存和获取用户数据
 */
const ApiService = {
    // API基础URL
    baseUrl: 'http://localhost:3000/api',

    // 设置API基础URL
    setBaseUrl: function(url) {
        this.baseUrl = url;
        console.log('API基础URL已设置为:', url);
    },

    // 获取用户数据
    getUserData: async function(walletAddress) {
        if (!walletAddress) {
            console.error('获取用户数据失败: 钱包地址为空');
            return null;
        }

        try {
            const response = await fetch(`${this.baseUrl}/user/${walletAddress}`);

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
            const url = `${this.baseUrl}/user/${walletAddress}`;
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
            const response = await fetch(`${this.baseUrl}/user/${walletAddress}`, {
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
            const response = await fetch(`${this.baseUrl}/user/${walletAddress}/coins`);

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
            const url = `${this.baseUrl}/user/${walletAddress}/coins`;
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

    // 测试API连接
    testConnection: async function() {
        try {
            const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);

            if (!response.ok) {
                throw new Error('API连接测试失败');
            }

            const data = await response.json();
            console.log('API连接测试成功:', data);
            return true;
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
            const url = `${this.baseUrl.replace('/api', '')}/create-user-data/${walletAddress}`;
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

    // 获取用户代币余额
    getTokenBalance: async function(walletAddress) {
        if (!walletAddress) {
            console.error('获取用户代币余额失败: 钱包地址为空');
            return 0;
        }

        try {
            const response = await fetch(`${this.baseUrl}/user/${walletAddress}/tokens`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '获取用户代币余额失败');
            }

            const data = await response.json();
            console.log('获取用户代币余额成功:', data);
            return data.tokens || 0;
        } catch (error) {
            console.error('获取用户代币余额出错:', error.message);
            return 0;
        }
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
            const url = `${this.baseUrl}/user/${walletAddress}/exchange-tokens`;
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
            const response = await fetch(`${this.baseUrl}/user/${walletAddress}/exchange-history`);

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
        const contractAddress = typeof GameConfig !== 'undefined' &&
                               GameConfig.TOKEN_EXCHANGE &&
                               GameConfig.TOKEN_EXCHANGE.CONTRACT_ADDRESS ?
                               GameConfig.TOKEN_EXCHANGE.CONTRACT_ADDRESS :
                               '0xeb246449b283f9a98933a32132bee0ba7a2fdce6';

        try {
            const url = `${this.baseUrl}/sign-exchange`;
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

            return {
                success: true,
                signature: result.signature,
                nonce: result.nonce,
                message: '获取兑换签名成功'
            };
        } catch (error) {
            console.error('获取兑换签名出错:', error);
            console.error('错误详情:', error.message);
            return { success: false, error: error.message || '获取兑换签名时发生错误' };
        }
    }
};
