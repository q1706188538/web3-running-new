/**
 * 游戏数据工具
 * 用于获取游戏数据，仅保留必要功能
 */
const DebugTools = {
    // 游戏使用的原始键名
    GAME_COINS_KEY: 'com.gemioli.tombrunner.coins',
    GAME_HIGHSCORE_KEY: 'com.gemioli.tombrunner.highscore',
    GAME_SCORE_KEY: 'com.gemioli.tombrunner.score',
    GAME_SKIN_KEY: 'com.gemioli.tombrunner.skin',
    GAME_SKIN_PREFIX: 'com.gemioli.tombrunner.skin',

    // 游戏中的总皮肤数量 - 根据游戏数据分析得出
    TOTAL_SKINS: 6,

    // 获取游戏金币 - 从API获取
    getGameCoins: async function() {
        if (WalletManager.isConnected()) {
            try {
                const walletAddress = WalletManager.getAccount();
                const userData = await ApiService.getUserData(walletAddress);
                if (userData && userData.coins !== undefined) {
                    return userData.coins;
                }
            } catch (error) {
                console.error('获取游戏金币时出错:', error);
            }
        }
        return 0;
    },

    // 获取累计获得金币 - 从API获取
    getGameHighScore: async function() {
        if (WalletManager.isConnected()) {
            try {
                const walletAddress = WalletManager.getAccount();
                const userData = await ApiService.getUserData(walletAddress);
                if (userData && userData.highScore !== undefined) {
                    return userData.highScore;
                }
            } catch (error) {
                console.error('获取累计获得金币时出错:', error);
            }
        }
        return 0;
    },

    // 获取历史最高得分 - 从API获取
    getGameScore: async function() {
        if (WalletManager.isConnected()) {
            try {
                const walletAddress = WalletManager.getAccount();
                const userData = await ApiService.getUserData(walletAddress);
                if (userData && userData.lastScore !== undefined) {
                    return userData.lastScore;
                }
            } catch (error) {
                console.error('获取历史最高得分时出错:', error);
            }
        }
        return 0;
    },

    // 获取当前使用的皮肤
    getCurrentSkin: function() {
        const skin = localStorage.getItem(this.GAME_SKIN_KEY);
        return skin ? parseInt(skin, 10) : 0;
    },

    // 获取已解锁的皮肤数量
    getUnlockedSkinsCount: function() {
        let count = 0;

        // 遍历localStorage查找皮肤数据
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.GAME_SKIN_PREFIX) &&
                key !== this.GAME_SKIN_KEY &&
                localStorage.getItem(key) === '1') {
                count++;
            }
        }

        return count;
    },

    // 获取皮肤详细信息
    getSkinsInfo: function() {
        const result = {
            currentSkin: this.getCurrentSkin(),
            unlockedCount: 0,
            skins: [],
            totalSkins: this.TOTAL_SKINS
        };

        // 遍历localStorage查找皮肤数据
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.GAME_SKIN_PREFIX) && key !== this.GAME_SKIN_KEY) {
                const skinNumber = key.replace(this.GAME_SKIN_PREFIX, '');
                if (skinNumber && !isNaN(parseInt(skinNumber, 10))) {
                    const skinId = parseInt(skinNumber, 10);
                    const isUnlocked = localStorage.getItem(key) === '1';

                    if (isUnlocked) {
                        result.unlockedCount++;
                    }

                    result.skins.push({
                        id: skinId,
                        unlocked: isUnlocked
                    });
                }
            }
        }

        // 按ID排序
        result.skins.sort((a, b) => a.id - b.id);

        return result;
    },

    // 获取总皮肤数量
    getTotalSkins: function() {
        // 直接返回预设的总皮肤数量
        return this.TOTAL_SKINS;
    }
};
