/**
 * 钱包游戏进度管理器
 * 用于保存和加载与钱包地址关联的游戏进度
 * 支持本地存储和后端API存储
 */
const WalletProgress = {
    // 是否使用API服务
    useApi: true,

    // 设置是否使用API服务
    setUseApi: function(value) {
        this.useApi = value;
        console.log('使用API服务:', this.useApi);
    },

    // 初始化
    init: function() {
        // 测试API连接
        if (this.useApi) {
            ApiService.testConnection()
                .then(connected => {
                    if (!connected) {
                        console.warn('API连接测试失败，将使用本地存储');
                        this.useApi = false;
                    } else {
                        console.log('API连接测试成功，将使用后端存储');
                        // 连接成功后，尝试同步本地数据到后端
                        this.syncLocalDataToBackend();
                    }
                });
        }
    },

    // 强制同步本地数据到后端
    syncLocalDataToBackend: async function() {
        if (!this.useApi || !WalletManager.isConnected()) {
            console.log('不同步本地数据到后端：API未启用或钱包未连接');
            return false;
        }

        const walletAddress = WalletManager.getAccount();
        console.log('强制同步本地数据到后端，钱包地址:', walletAddress);

        try {
            // 收集三个关键数据
            const localData = {
                coins: 0,           // 当前可用金币 (com.gemioli.tombrunner.coins)
                highScore: 0,       // 累计获得金币 (com.gemioli.tombrunner.highscore)
                lastScore: 0,       // 历史最高得分 (com.gemioli.tombrunner.score)
                lastUpdated: new Date().toISOString()
            };

            // 获取当前可用金币 (com.gemioli.tombrunner.coins)
            try {
                const savedCoins = localStorage.getItem('com.gemioli.tombrunner.coins');

                if (savedCoins) {
                    localData.coins = parseInt(savedCoins, 10);
                    console.log('从本地存储获取当前可用金币:', localData.coins);
                }
            } catch (error) {
                console.error('获取本地金币数据时出错:', error);
            }

            // 获取累计获得金币 (com.gemioli.tombrunner.highscore)
            try {
                const savedHighScore = localStorage.getItem('com.gemioli.tombrunner.highscore');

                if (savedHighScore) {
                    localData.highScore = parseInt(savedHighScore, 10);
                    console.log('从本地存储获取累计获得金币:', localData.highScore);
                }
            } catch (error) {
                console.error('获取本地累计获得金币数据时出错:', error);
            }

            // 注意：我们不再使用maxCoins参数，因为它不存在
            // 在游戏中，com.gemioli.tombrunner.highscore实际上存储的是累计获得金币
            // 统一使用highScore参数表示累计获得金币

            // 获取历史最高得分 (com.gemioli.tombrunner.score)
            try {
                const savedLastScore = localStorage.getItem('com.gemioli.tombrunner.score');

                if (savedLastScore) {
                    localData.lastScore = parseInt(savedLastScore, 10);
                    console.log('从本地存储获取历史最高得分:', localData.lastScore);
                }
            } catch (error) {
                console.error('获取本地历史最高得分数据时出错:', error);
            }

            // 不再获取游戏进度和成就数据，只关注三个关键数据

            // 保存数据到后端
            console.log('将本地数据同步到后端:', localData);
            const saved = await ApiService.saveUserData(walletAddress, localData);

            if (saved) {
                console.log('本地数据成功同步到后端');
                return true;
            } else {
                console.error('本地数据同步到后端失败');
                return false;
            }
        } catch (error) {
            console.error('同步本地数据到后端时出错:', error);
            return false;
        }
    },

    // 从后端同步所有用户数据到本地
    syncDataFromBackend: async function() {
        if (!this.useApi || !WalletManager.isConnected()) {
            console.log('不从后端同步数据：API未启用或钱包未连接');
            return false;
        }

        const walletAddress = WalletManager.getAccount();
        console.log('从后端同步用户数据，钱包地址:', walletAddress);

        try {
            // 获取后端用户数据
            const userData = await ApiService.getUserData(walletAddress);
            if (!userData || Object.keys(userData).length === 0) {
                console.log('后端没有用户数据，尝试创建新用户数据');
                await ApiService.createUserData(walletAddress);
                return false;
            }

            console.log('成功获取后端用户数据:', userData);

            // 更新本地存储中的三个关键数据

            // 1. 当前可用金币 (com.gemioli.tombrunner.coins)
            if (userData.coins !== undefined) {
                localStorage.setItem('com.gemioli.tombrunner.coins', userData.coins.toString());
                console.log('已同步当前可用金币到本地存储:', userData.coins);
            }

            // 2. 累计获得金币 (com.gemioli.tombrunner.highscore)
            if (userData.highScore !== undefined) {
                localStorage.setItem('com.gemioli.tombrunner.highscore', userData.highScore.toString());
                console.log('已同步累计获得金币到本地存储:', userData.highScore);
            }

            // 3. 历史最高得分 (com.gemioli.tombrunner.score)
            if (userData.lastScore !== undefined) {
                localStorage.setItem('com.gemioli.tombrunner.score', userData.lastScore.toString());
                console.log('已同步历史最高得分到本地存储:', userData.lastScore);
            } else {
                // 如果后端没有历史最高得分数据，尝试从本地存储获取
                const savedScore = localStorage.getItem('com.gemioli.tombrunner.score');

                if (savedScore) {
                    // 将本地存储的历史最高得分同步到后端
                    const score = parseInt(savedScore, 10);
                    try {
                        await ApiService.saveLastScore(walletAddress, score);
                        console.log('已将本地历史最高得分同步到后端:', score);
                    } catch (error) {
                        console.error('同步本地历史最高得分到后端时出错:', error);
                    }
                }
            }

            // 如果有游戏状态面板，立即更新
            if (typeof GameStatusPanel !== 'undefined') {
                GameStatusPanel.updatePanel();
            }

            console.log('所有用户数据已从后端同步到本地存储');
            return true;
        } catch (error) {
            console.error('从后端同步数据时出错:', error);
            return false;
        }
    },
    // 保存游戏进度
    saveProgress: async function(progressData) {
        if (WalletManager.isConnected()) {
            const walletAddress = WalletManager.getAccount();
            console.log('保存游戏进度，钱包地址:', walletAddress, '进度数据:', progressData);

            // 使用API服务保存
            if (this.useApi) {
                try {
                    const success = await ApiService.saveProgress(walletAddress, progressData);
                    if (success) {
                        console.log('已通过API保存游戏进度，钱包地址:', walletAddress);

                        // 如果进度数据包含金币，立即从后端获取最新数据以更新本地存储
                        if (progressData && typeof progressData.coins === 'number' && progressData.coins > 0) {
                            try {
                                // 获取最新的用户数据
                                await this.fetchUserData();

                                // 如果有游戏状态面板，立即更新
                                if (typeof GameStatusPanel !== 'undefined') {
                                    GameStatusPanel.updatePanel();
                                }
                            } catch (error) {
                                console.error('获取最新用户数据时出错:', error);
                            }
                        }

                        return true;
                    }
                } catch (error) {
                    console.error('通过API保存进度时出错:', error);
                    // 如果API保存失败，回退到本地存储
                }
            }

            // 使用本地存储保存
            const key = `temple_run_progress_${walletAddress}`;
            try {
                localStorage.setItem(key, JSON.stringify(progressData));
                console.log('已保存游戏进度到本地存储，钱包地址:', walletAddress);

                // 不再在本地模式下更新本地存储中的金币数据
                // 所有数据都从API获取

                // 如果有游戏状态面板，立即更新
                if (typeof GameStatusPanel !== 'undefined') {
                    GameStatusPanel.updatePanel();
                }

                return true;
            } catch (error) {
                console.error('保存进度到本地存储时出错:', error);
                return false;
            }
        }
        return false;
    },

    // 加载游戏进度
    loadProgress: async function() {
        if (WalletManager.isConnected()) {
            const walletAddress = WalletManager.getAccount();

            // 使用API服务加载
            if (this.useApi) {
                try {
                    const progress = await ApiService.getProgress(walletAddress);
                    if (progress) {
                        console.log('已通过API加载游戏进度，钱包地址:', walletAddress);
                        return progress;
                    }
                } catch (error) {
                    console.error('通过API加载进度时出错:', error);
                    // 如果API加载失败，回退到本地存储
                }
            }

            // 使用本地存储加载
            const key = `temple_run_progress_${walletAddress}`;
            try {
                const savedData = localStorage.getItem(key);
                if (savedData) {
                    console.log('已从本地存储加载游戏进度，钱包地址:', walletAddress);
                    return JSON.parse(savedData);
                }
            } catch (error) {
                console.error('从本地存储加载进度时出错:', error);
            }
        }
        return null;
    },

    // 清除游戏进度
    clearProgress: function() {
        if (WalletManager.isConnected()) {
            const walletAddress = WalletManager.getAccount();
            const key = `temple_run_progress_${walletAddress}`;

            try {
                localStorage.removeItem(key);
                console.log('已清除游戏进度，钱包地址:', walletAddress);
                return true;
            } catch (error) {
                console.error('清除进度时出错:', error);
                return false;
            }
        }
        return false;
    },

    // 保存成就
    saveAchievement: function(achievementId) {
        if (WalletManager.isConnected()) {
            const achievements = this.getAchievements();
            if (!achievements.includes(achievementId)) {
                achievements.push(achievementId);

                // 保存成就
                const walletAddress = WalletManager.getAccount();
                const key = `temple_run_achievements_${walletAddress}`;

                try {
                    localStorage.setItem(key, JSON.stringify(achievements));
                    console.log('已解锁成就:', achievementId);
                    return true;
                } catch (error) {
                    console.error('保存成就时出错:', error);
                    return false;
                }
            }
        }
        return false;
    },

    // 获取成就
    getAchievements: function() {
        if (WalletManager.isConnected()) {
            const walletAddress = WalletManager.getAccount();
            const key = `temple_run_achievements_${walletAddress}`;

            try {
                const savedData = localStorage.getItem(key);
                if (savedData) {
                    return JSON.parse(savedData);
                }
            } catch (error) {
                console.error('加载成就时出错:', error);
            }
        }

        return [];
    },

    // 保存累计获得金币（累加金币）(com.gemioli.tombrunner.highscore)
    saveHighScore: function(additionalCoins) {
        if (WalletManager.isConnected()) {
            const currentHighScore = this.getHighScore();
            const newHighScore = currentHighScore + additionalCoins;

            try {
                localStorage.setItem('com.gemioli.tombrunner.highscore', newHighScore.toString());
                console.log('已更新累计获得金币:', currentHighScore, '+', additionalCoins, '=', newHighScore);
                return true;
            } catch (error) {
                console.error('保存累计获得金币时出错:', error);
                return false;
            }
        }
        return false;
    },

    // 设置累计获得金币 (com.gemioli.tombrunner.highscore)
    setHighScore: function(score) {
        if (WalletManager.isConnected()) {
            try {
                // 更新累计获得金币数据
                localStorage.setItem('com.gemioli.tombrunner.highscore', score.toString());
                console.log('已设置累计获得金币:', score);

                return true;
            } catch (error) {
                console.error('设置累计获得金币时出错:', error);
                return false;
            }
        }
        return false;
    },

    // 获取累计获得金币 (com.gemioli.tombrunner.highscore)
    getHighScore: async function() {
        if (WalletManager.isConnected()) {
            try {
                // 从API获取用户数据
                const userData = await this.getUserData();
                if (userData && userData.highScore !== undefined) {
                    return userData.highScore;
                }
            } catch (error) {
                console.error('获取累计获得金币时出错:', error);
            }
        }

        return 0;
    },

    // 保存金币余额
    saveCoins: async function(coins) {
        if (WalletManager.isConnected()) {
            const walletAddress = WalletManager.getAccount();
            console.log('======= WalletProgress.saveCoins 金币计算 =======');
            console.log('保存金币余额，钱包地址:', walletAddress, '金币数量:', coins);

            // 使用API服务保存
            if (this.useApi) {
                console.log('使用API服务保存金币余额');
                try {
                    // 确保钱包地址有效
                    if (!walletAddress || walletAddress.length < 10) {
                        console.error('无效的钱包地址:', walletAddress);
                        throw new Error('无效的钱包地址');
                    }

                    // 确保金币数量有效
                    if (typeof coins !== 'number' || isNaN(coins)) {
                        console.error('无效的金币数量:', coins);
                        throw new Error('无效的金币数量');
                    }

                    // 获取当前用户数据，用于计算和显示
                    try {
                        const userData = await ApiService.getUserData(walletAddress);
                        if (userData) {
                            console.log('当前用户数据:', userData);
                            console.log('当前可用金币:', userData.coins || 0);
                            console.log('当前累计获得金币:', userData.highScore || 0);

                            // 计算预期的新值
                            const expectedTotalCoins = (userData.coins || 0) + coins;
                            const expectedHighScore = (userData.highScore || 0) + coins;

                            console.log('预期更新后的总金币:', expectedTotalCoins);
                            console.log('预期更新后的累计获得金币:', expectedHighScore);
                        }
                    } catch (e) {
                        console.error('获取当前用户数据时出错:', e);
                    }

                    console.log('调用ApiService.updateCoins:', walletAddress, coins, 'add');
                    const newTotal = await ApiService.updateCoins(walletAddress, coins, 'add');
                    console.log('ApiService.updateCoins返回结果:', newTotal);

                    if (newTotal !== null) {
                        console.log('已通过API更新金币余额:', coins, '新总额:', newTotal);

                        // 获取更新后的用户数据，用于验证
                        try {
                            const updatedUserData = await ApiService.getUserData(walletAddress);
                            if (updatedUserData) {
                                console.log('更新后的用户数据:', updatedUserData);
                                console.log('更新后的可用金币:', updatedUserData.coins || 0);
                                console.log('更新后的累计获得金币:', updatedUserData.highScore || 0);
                            }
                        } catch (e) {
                            console.error('获取更新后的用户数据时出错:', e);
                        }

                        console.log('======= WalletProgress.saveCoins 金币计算结束 =======');

                        // 如果有游戏状态面板，立即更新
                        if (typeof GameStatusPanel !== 'undefined') {
                            GameStatusPanel.updatePanel();
                        }

                        return true;
                    } else {
                        console.error('API返回null，无法更新金币余额');
                    }
                } catch (error) {
                    console.error('通过API保存金币余额时出错:', error);
                    console.error('错误详情:', error.message);
                    // 如果API保存失败，回退到本地存储
                }
            }

            // 使用本地存储保存
            try {
                // 更新当前可用金币 (com.gemioli.tombrunner.coins)
                let currentCoins = localStorage.getItem('com.gemioli.tombrunner.coins');
                currentCoins = currentCoins ? parseInt(currentCoins, 10) : 0;
                const newTotal = currentCoins + coins;
                localStorage.setItem('com.gemioli.tombrunner.coins', newTotal.toString());
                console.log('当前可用金币更新:', currentCoins, '+', coins, '=', newTotal);

                // 如果金币为正数，同时更新累计获得金币
                if (coins > 0) {
                    // 更新累计获得金币 (com.gemioli.tombrunner.highscore)
                    let currentHighScore = localStorage.getItem('com.gemioli.tombrunner.highscore');
                    currentHighScore = currentHighScore ? parseInt(currentHighScore, 10) : 0;
                    const newHighScore = currentHighScore + coins;
                    localStorage.setItem('com.gemioli.tombrunner.highscore', newHighScore.toString());
                    console.log('累计获得金币更新:', currentHighScore, '+', coins, '=', newHighScore);
                }

                console.log('已保存金币余额到本地存储');

                // 调试：确认保存成功
                const savedCoins = localStorage.getItem('com.gemioli.tombrunner.coins');
                console.log('保存后确认 - 当前可用金币:', savedCoins);

                // 如果有游戏状态面板，立即更新
                if (typeof GameStatusPanel !== 'undefined') {
                    GameStatusPanel.updatePanel();
                }

                return true;
            } catch (error) {
                console.error('保存金币余额到本地存储时出错:', error);
                return false;
            }
        }
        return false;
    },

    // 获取当前可用金币 (com.gemioli.tombrunner.coins)
    getCoins: async function() {
        if (WalletManager.isConnected()) {
            const walletAddress = WalletManager.getAccount();

            try {
                // 从API获取用户数据
                const userData = await ApiService.getUserData(walletAddress);
                if (userData && userData.coins !== undefined) {
                    console.log('已通过API获取当前可用金币:', userData.coins);
                    return userData.coins;
                }

                console.log('API中未找到任何金币数据，返回0');
            } catch (error) {
                console.error('获取当前可用金币时出错:', error);
            }
        }

        return 0;
    },

    // 设置当前可用金币 (com.gemioli.tombrunner.coins)
    setCoins: async function(coins) {
        if (WalletManager.isConnected()) {
            const walletAddress = WalletManager.getAccount();

            // 使用API服务设置
            if (this.useApi) {
                try {
                    const newTotal = await ApiService.updateCoins(walletAddress, coins, 'set');
                    if (newTotal !== null) {
                        console.log('已通过API设置当前可用金币:', newTotal);

                        // 如果有游戏状态面板，立即更新
                        if (typeof GameStatusPanel !== 'undefined') {
                            GameStatusPanel.updatePanel();
                        }

                        return true;
                    }
                } catch (error) {
                    console.error('通过API设置当前可用金币时出错:', error);
                    // 如果API设置失败，回退到本地存储
                }
            }

            // 使用本地存储设置
            try {
                // 更新当前可用金币
                localStorage.setItem('com.gemioli.tombrunner.coins', coins.toString());
                console.log('已设置当前可用金币:', coins);

                // 如果有游戏状态面板，立即更新
                if (typeof GameStatusPanel !== 'undefined') {
                    GameStatusPanel.updatePanel();
                }

                return true;
            } catch (error) {
                console.error('设置当前可用金币到本地存储时出错:', error);
                return false;
            }
        }
        return false;
    },

    // 获取游戏进度百分比
    getProgressPercentage: async function() {
        if (WalletManager.isConnected()) {
            try {
                const walletAddress = WalletManager.getAccount();
                const progressData = await ApiService.getProgress(walletAddress);

                if (progressData && progressData.level) {
                    // 假设游戏总共有10个关卡
                    const totalLevels = 10;
                    return Math.min(Math.round((progressData.level / totalLevels) * 100), 100);
                }
            } catch (error) {
                console.error('获取游戏进度百分比时出错:', error);
            }
        }
        return 0;
    },

    // 保存历史最高得分 (com.gemioli.tombrunner.score)
    saveLastScore: async function(score) {
        if (WalletManager.isConnected()) {
            const walletAddress = WalletManager.getAccount();

            // 使用API服务保存
            if (this.useApi) {
                try {
                    const success = await ApiService.saveLastScore(walletAddress, score);
                    if (success) {
                        console.log('已通过API保存历史最高得分:', score);
                        return true;
                    }
                } catch (error) {
                    console.error('通过API保存历史最高得分时出错:', error);
                    // 如果API保存失败，回退到本地存储
                }
            }

            // 使用本地存储保存
            try {
                // 更新历史最高得分数据
                localStorage.setItem('com.gemioli.tombrunner.score', score.toString());
                console.log('已保存历史最高得分到本地存储:', score);

                return true;
            } catch (error) {
                console.error('保存历史最高得分到本地存储时出错:', error);
                return false;
            }
        }
        return false;
    },

    // 获取历史最高得分 (com.gemioli.tombrunner.score)
    getLastScore: async function() {
        if (WalletManager.isConnected()) {
            try {
                // 从API获取用户数据
                const userData = await this.getUserData();
                if (userData && userData.lastScore !== undefined) {
                    console.log('从API获取历史最高得分:', userData.lastScore);
                    return userData.lastScore;
                }

                console.log('API中未找到任何历史最高得分数据，返回0');
            } catch (error) {
                console.error('获取历史最高得分时出错:', error);
            }
        }

        return 0;
    },

    // 注意：getLastScoreAsync 方法已被移除，因为 getLastScore 已经是异步方法

    // 保存原始金币数量（在游戏开始时调用）
    saveOriginalCoins: async function() {
        if (WalletManager.isConnected()) {
            try {
                // 获取当前金币数量（等待Promise解析）
                const currentCoins = await this.getCoins();

                // 保存为原始金币数量
                const key = 'original_coins_before_game';
                localStorage.setItem(key, currentCoins.toString());
                console.log('已保存原始金币数量:', currentCoins);
                return currentCoins;
            } catch (error) {
                console.error('保存原始金币数量时出错:', error);
                return 0;
            }
        }
        return 0;
    },

    // 获取原始金币数量
    getOriginalCoins: async function() {
        // 获取保存的原始金币数量
        const key = 'original_coins_before_game';
        const savedCoins = localStorage.getItem(key);

        if (savedCoins && savedCoins !== '[object Promise]') {
            try {
                return parseInt(savedCoins, 10);
            } catch (error) {
                console.error('解析原始金币数量时出错:', error);
                // 如果解析出错，返回0
                return 0;
            }
        }

        // 如果没有保存或者是Promise对象字符串，返回当前金币数量
        try {
            return await this.getCoins();
        } catch (error) {
            console.error('获取当前金币数量时出错:', error);
            return 0;
        }
    },

    // 从后端获取用户数据
    getUserData: async function() {
        if (!this.useApi || !WalletManager.isConnected()) {
            console.log('不从后端获取用户数据：API未启用或钱包未连接');
            return null;
        }

        const walletAddress = WalletManager.getAccount();
        console.log('从后端获取用户数据，钱包地址:', walletAddress);

        try {
            const userData = await ApiService.getUserData(walletAddress);
            console.log('获取用户数据成功:', userData);
            return userData;
        } catch (error) {
            console.error('获取用户数据出错:', error);
            return null;
        }
    },

    // 更新用户数据
    updateUserData: async function(updatedData) {
        if (!this.useApi || !WalletManager.isConnected()) {
            console.log('不更新用户数据：API未启用或钱包未连接');
            return false;
        }

        const walletAddress = WalletManager.getAccount();
        console.log('更新用户数据，钱包地址:', walletAddress, '更新数据:', updatedData);

        try {
            const success = await ApiService.updateUserData(walletAddress, updatedData);
            if (success) {
                console.log('更新用户数据成功');
                return true;
            } else {
                console.error('更新用户数据失败');
                return false;
            }
        } catch (error) {
            console.error('更新用户数据时出错:', error);
            return false;
        }
    },

    // 从后端获取用户数据并更新本地存储
    fetchUserData: async function() {
        if (!this.useApi || !WalletManager.isConnected()) {
            console.log('不从后端获取用户数据：API未启用或钱包未连接');
            return false;
        }

        const walletAddress = WalletManager.getAccount();
        console.log('从后端获取用户数据并更新本地存储，钱包地址:', walletAddress);

        try {
            const userData = await ApiService.getUserData(walletAddress);
            if (!userData) {
                console.log('未找到用户数据');
                return false;
            }

            console.log('获取用户数据成功:', userData);

            // 不再将数据同步到本地存储，直接使用API数据
            try {
                console.log('已从API获取最新用户数据:', userData);

                // 如果有游戏状态面板，立即更新
                if (typeof GameStatusPanel !== 'undefined') {
                    GameStatusPanel.updatePanel();
                }

                return true;
            } catch (error) {
                console.error('更新本地存储时出错:', error);
                return false;
            }
        } catch (error) {
            console.error('获取用户数据出错:', error);
            return false;
        }
    },

    // 强制设置金币数量（不检查钱包连接状态，用于恢复原始金币）
    forceSetCoins: async function(coins) {
        const walletAddress = WalletManager.getAccount();

        // 使用API服务强制设置（如果可用）
        if (this.useApi && walletAddress) {
            try {
                const newTotal = await ApiService.updateCoins(walletAddress, coins, 'set');
                if (newTotal !== null) {
                    console.log('已通过API强制设置金币余额:', newTotal);

                    // 如果有游戏状态面板，立即更新
                    if (typeof GameStatusPanel !== 'undefined') {
                        GameStatusPanel.updatePanel();
                    }

                    return true;
                }
            } catch (error) {
                console.error('通过API强制设置金币余额时出错:', error);
                // 如果API设置失败，回退到本地存储
            }
        }

        // 不再使用本地存储强制设置
        // 所有数据都从API获取
        console.warn('无法强制设置金币，API不可用且不再使用本地存储');

        // 如果有游戏状态面板，立即更新
        if (typeof GameStatusPanel !== 'undefined') {
            GameStatusPanel.updatePanel();
        }

        return false;
    }
};
