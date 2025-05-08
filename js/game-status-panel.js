/**
 * 游戏状态面板
 * 用于显示当前账号的游戏金币余额和游戏进度
 */
const GameStatusPanel = {
    // 面板元素
    panel: null,

    // 初始化
    init: function() {
        console.log('初始化游戏状态面板...');

        // 创建面板
        this.createPanel();

        // 监听钱包连接事件
        if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
            // 监听钱包连接事件
            GEMIOLI.Application.addEventListener('wallet_connected', this.onWalletConnected.bind(this));

            // 监听钱包断开连接事件
            GEMIOLI.Application.addEventListener('wallet_disconnected', this.onWalletDisconnected.bind(this));

            // 监听游戏结束事件，更新金币和进度
            GEMIOLI.Application.addEventListener('game_over', this.onGameOver.bind(this));

            // 关卡完成事件监听已删除 - 不需要此功能
        }

        // 如果钱包已经连接，立即更新面板
        if (WalletManager && WalletManager.isConnected()) {
            console.log('钱包已连接，立即更新状态面板');
            this.updatePanel();
        }

        // 添加延迟检查，确保在页面完全加载后再次检查钱包状态
        setTimeout(this.checkWalletAndUpdatePanel.bind(this), 1000);

        // 添加DOM变化监听，在游戏容器显示时检查钱包状态
        this.observeGameContainer();

        // 添加页面可见性变化监听
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('页面变为可见，检查钱包状态');
                if (WalletManager && WalletManager.isConnected()) {
                    this.updatePanel();
                }
            }
        });

        // 添加窗口焦点监听
        window.addEventListener('focus', () => {
            console.log('窗口获得焦点，检查钱包状态');
            if (WalletManager && WalletManager.isConnected()) {
                this.updatePanel();
            }
        });
    },

    // 检查钱包状态并更新面板
    checkWalletAndUpdatePanel: function() {
        console.log('延迟检查钱包状态...');
        if (WalletManager && WalletManager.isConnected()) {
            console.log('钱包已连接，更新状态面板（延迟检查）');
            this.updatePanel();
        }
    },

    // 不再监听游戏容器的显示状态
    observeGameContainer: function() {
        console.log('不再监听游戏容器，改为直接监听钱包状态变化');

        // 直接更新面板
        this.updatePanel();

        // 设置定期更新
        setInterval(() => {
            if (WalletManager && WalletManager.isConnected()) {
                this.updatePanel();
            }
        }, 5000); // 每5秒更新一次

        // 监听钱包连接事件
        if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
            GEMIOLI.Application.addEventListener('wallet_connected', async () => {
                console.log('钱包连接事件触发，更新面板');
                // 等待一小段时间，确保后端数据已更新
                await new Promise(resolve => setTimeout(resolve, 500));
                this.updatePanel();
            });

            GEMIOLI.Application.addEventListener('wallet_disconnected', () => {
                console.log('钱包断开连接事件触发，更新面板');
                this.updatePanel();
            });

            GEMIOLI.Application.addEventListener('game_over', async () => {
                console.log('游戏结束事件触发，更新面板');
                // 等待一小段时间，确保后端数据已更新
                await new Promise(resolve => setTimeout(resolve, 1000));
                this.updatePanel();
            });

            // 关卡完成事件监听已删除 - 不需要此功能
        }
    },

    // 创建面板
    createPanel: function() {
        // 创建面板容器 - 使用完全透明背景设计，单行横向布局，居中显示
        this.panel = document.createElement('div');
        this.panel.id = 'game-status-panel';
        this.panel.style.cssText = 'position: absolute; top: 10px; left: 50%; transform: translateX(-50%); background-color: transparent; color: white; padding: 5px; border-radius: 10px; font-family: "Arial", sans-serif; z-index: 1000; display: none; text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7); display: flex; flex-direction: row; justify-content: center; align-items: center; flex-wrap: nowrap; overflow-x: auto; white-space: nowrap; max-width: 90%;';

        // 标题和账号信息已删除，使界面更加简洁

        // 创建单个元素，直接组合图标、标签和值
        const coinsElement = document.createElement('div');
        coinsElement.style.cssText = 'display: inline-flex; align-items: center; background-color: transparent; padding: 3px 8px; margin: 0 5px;';

        const coinsIcon = document.createElement('div');
        coinsIcon.style.cssText = 'width: 26px; height: 26px; background-color: #f5a623; border-radius: 50%; margin-right: 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); display: flex; justify-content: center; align-items: center;';
        coinsIcon.innerHTML = '<span style="color: white; font-weight: bold; font-size: 16px;">¥</span>';

        const coinsLabel = document.createElement('span');
        coinsLabel.textContent = '金币:';
        coinsLabel.style.cssText = 'font-size: 16px; color: #f5a623; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);';

        const coinsValue = document.createElement('span');
        coinsValue.id = 'status-coins';
        coinsValue.textContent = '0';
        coinsValue.style.cssText = 'font-weight: bold; color: #f5a623; font-size: 18px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); margin-left: 3px;';

        coinsElement.appendChild(coinsIcon);
        coinsElement.appendChild(coinsLabel);
        coinsElement.appendChild(coinsValue);

        // 创建进度信息 - 简化为单行显示
        const progressElement = document.createElement('div');
        progressElement.style.cssText = 'display: inline-flex; align-items: center; background-color: transparent; padding: 3px 8px; margin: 0 5px;';

        const progressIcon = document.createElement('div');
        progressIcon.style.cssText = 'width: 26px; height: 26px; background-color: #f5a623; border-radius: 50%; margin-right: 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); display: flex; justify-content: center; align-items: center;';
        progressIcon.innerHTML = '<span style="color: white; font-weight: bold; font-size: 16px;">P</span>';

        const progressLabel = document.createElement('span');
        progressLabel.textContent = '进度:';
        progressLabel.style.cssText = 'font-size: 16px; color: #f5a623; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);';

        const progressText = document.createElement('span');
        progressText.id = 'status-progress-text';
        progressText.textContent = '0%';
        progressText.style.cssText = 'font-weight: bold; color: #f5a623; font-size: 18px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); margin-left: 3px;';

        // 将进度相关元素添加到容器中
        progressElement.appendChild(progressIcon);
        progressElement.appendChild(progressLabel);
        progressElement.appendChild(progressText);

        // 创建隐藏的进度条元素，用于保存进度值
        const progressBar = document.createElement('div');
        progressBar.id = 'status-progress-bar';
        progressBar.style.cssText = 'display: none;';

        // 创建最高金币信息
        const highCoinsElement = document.createElement('div');
        highCoinsElement.style.cssText = 'display: inline-flex; align-items: center; background-color: transparent; padding: 3px 8px; margin: 0 5px;';

        const coinIcon = document.createElement('div');
        coinIcon.style.cssText = 'width: 26px; height: 26px; background-color: #f5a623; border-radius: 50%; margin-right: 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); display: flex; justify-content: center; align-items: center; border: 1px solid #e67e22; box-sizing: border-box;';
        coinIcon.innerHTML = '<span style="color: white; font-weight: bold; font-size: 16px;">Σ</span>';

        const highCoinsLabel = document.createElement('span');
        highCoinsLabel.textContent = '累计获得:';
        highCoinsLabel.style.cssText = 'font-size: 16px; color: #f5a623; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);';

        const highCoinsValue = document.createElement('span');
        highCoinsValue.id = 'status-high-coins';
        highCoinsValue.textContent = '0';
        highCoinsValue.style.cssText = 'font-weight: bold; color: #f5a623; font-size: 18px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); margin-left: 3px;';

        highCoinsElement.appendChild(coinIcon);
        highCoinsElement.appendChild(highCoinsLabel);
        highCoinsElement.appendChild(highCoinsValue);

        // 创建最高得分信息
        const lastScoreElement = document.createElement('div');
        lastScoreElement.style.cssText = 'display: inline-flex; align-items: center; background-color: transparent; padding: 3px 8px; margin: 0 5px;';

        const scoreIcon = document.createElement('div');
        scoreIcon.style.cssText = 'width: 26px; height: 26px; background-color: #3498db; border-radius: 50%; margin-right: 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); display: flex; justify-content: center; align-items: center; font-weight: bold; color: white; font-size: 16px;';
        scoreIcon.textContent = 'S';

        const lastScoreLabel = document.createElement('span');
        lastScoreLabel.textContent = '最高得分:';
        lastScoreLabel.style.cssText = 'font-size: 16px; color: #3498db; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);';

        const lastScoreValue = document.createElement('span');
        lastScoreValue.id = 'status-last-score';
        lastScoreValue.textContent = '0';
        lastScoreValue.style.cssText = 'font-weight: bold; color: #3498db; font-size: 18px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); margin-left: 3px;';

        lastScoreElement.appendChild(scoreIcon);
        lastScoreElement.appendChild(lastScoreLabel);
        lastScoreElement.appendChild(lastScoreValue);

        // 创建皮肤信息
        const skinsElement = document.createElement('div');
        skinsElement.style.cssText = 'display: inline-flex; align-items: center; background-color: transparent; padding: 3px 8px; margin: 0 5px;';

        const skinIcon = document.createElement('div');
        skinIcon.style.cssText = 'width: 26px; height: 26px; background-color: #9b59b6; border-radius: 5px; margin-right: 5px; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);';

        // 创建小人图标
        const personIcon = document.createElement('div');
        personIcon.style.cssText = 'width: 14px; height: 14px; background-color: white; border-radius: 50% 50% 0 0; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);';
        skinIcon.appendChild(personIcon);

        const skinsLabel = document.createElement('span');
        skinsLabel.textContent = '皮肤:';
        skinsLabel.style.cssText = 'font-size: 16px; color: #9b59b6; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);';

        const skinsValue = document.createElement('span');
        skinsValue.id = 'status-skins';
        skinsValue.textContent = '0/0';
        skinsValue.style.cssText = 'font-weight: bold; color: #9b59b6; font-size: 18px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); margin-left: 3px;';

        skinsElement.appendChild(skinIcon);
        skinsElement.appendChild(skinsLabel);
        skinsElement.appendChild(skinsValue);

        // 创建当前皮肤信息
        const currentSkinElement = document.createElement('div');
        currentSkinElement.style.cssText = 'display: inline-flex; align-items: center; background-color: transparent; padding: 3px 8px; margin: 0 5px;';

        const currentSkinIcon = document.createElement('div');
        currentSkinIcon.style.cssText = 'width: 26px; height: 26px; background-color: #e74c3c; border-radius: 5px; margin-right: 5px; display: flex; justify-content: center; align-items: center; font-size: 16px; color: white; font-weight: bold; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);';
        currentSkinIcon.textContent = '#';

        const currentSkinLabel = document.createElement('span');
        currentSkinLabel.textContent = '使用:';
        currentSkinLabel.style.cssText = 'font-size: 16px; color: #e74c3c; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);';

        const currentSkinValue = document.createElement('span');
        currentSkinValue.id = 'status-current-skin';
        currentSkinValue.textContent = '0';
        currentSkinValue.style.cssText = 'font-weight: bold; color: #e74c3c; font-size: 18px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3); margin-left: 3px;';

        currentSkinElement.appendChild(currentSkinIcon);
        currentSkinElement.appendChild(currentSkinLabel);
        currentSkinElement.appendChild(currentSkinValue);

        // 所有按钮已删除 - 不需要向最终玩家展示这些外挂功能

        // 代币兑换按钮已移至钱包连接面板，从游戏状态面板中移除

        // 组装面板 - 单行横向布局
        this.panel.appendChild(coinsElement);
        this.panel.appendChild(highCoinsElement);
        this.panel.appendChild(lastScoreElement);
        this.panel.appendChild(progressElement);
        this.panel.appendChild(progressBar); // 添加隐藏的进度条元素
        this.panel.appendChild(skinsElement);
        this.panel.appendChild(currentSkinElement);

        // 添加到页面
        document.body.appendChild(this.panel);
    },

    // 更新面板信息 - 直接从API获取数据
    updatePanel: async function() {
        if (!WalletManager.isConnected()) {
            this.hidePanel();
            return;
        }

        console.log('从API获取最新数据更新面板...');
        const walletAddress = WalletManager.getAccount();

        try {
            // 从API获取最新用户数据
            const userData = await ApiService.getUserData(walletAddress);

            if (!userData) {
                console.error('无法从API获取用户数据');
                return;
            }

            console.log('从API获取的用户数据:', userData);

            // 账号信息显示已移除

            // 更新金币余额
            const coinsElement = document.getElementById('status-coins');
            if (coinsElement) {
                const coins = userData.coins || 0;
                console.log('更新金币显示:', coins);
                coinsElement.textContent = coins.toLocaleString(); // 使用逗号分隔的数字格式
            }

            // 获取游戏进度百分比
            let progressPercentage = 0;
            try {
                progressPercentage = await WalletProgress.getProgressPercentage();
            } catch (error) {
                console.error('获取游戏进度百分比时出错:', error);
            }

            // 只更新进度文本，不再需要更新进度条的宽度
            const progressTextElement = document.getElementById('status-progress-text');

            if (progressTextElement) {
                progressTextElement.textContent = progressPercentage + '%';
            }

            // 保存进度值到隐藏的进度条元素
            const progressBarElement = document.getElementById('status-progress-bar');
            if (progressBarElement) {
                progressBarElement.setAttribute('data-progress', progressPercentage);
            }

            // 更新累计获得金币
            const highCoinsElement = document.getElementById('status-high-coins');
            if (highCoinsElement) {
                const highCoins = userData.highScore || 0;
                console.log('显示累计获得金币:', highCoins);
                highCoinsElement.textContent = highCoins.toLocaleString();
            }

            // 更新历史最高得分
            const lastScoreElement = document.getElementById('status-last-score');
            if (lastScoreElement) {
                const highestScore = userData.lastScore || 0;
                lastScoreElement.textContent = highestScore.toLocaleString();
            }

            // 获取皮肤信息
            // 注意：由于API可能没有皮肤信息，我们仍然从本地获取
            const skinsElement = document.getElementById('status-skins');
            if (skinsElement) {
                const skinsInfo = DebugTools.getSkinsInfo();
                skinsElement.textContent = `${skinsInfo.unlockedCount}/${skinsInfo.totalSkins}`;
            }

            // 更新当前皮肤
            const currentSkinElement = document.getElementById('status-current-skin');
            if (currentSkinElement) {
                const currentSkin = DebugTools.getCurrentSkin();
                // 只显示当前选择的皮肤编号
                currentSkinElement.textContent = currentSkin;
            }

            // 显示面板
            this.showPanel();
        } catch (error) {
            console.error('更新面板时出错:', error);

            // 显示错误消息
            this.showErrorMessage('无法从服务器获取数据，请检查网络连接');
        }
    },

    // 显示错误消息
    showErrorMessage: function(message) {
        console.error('面板错误:', message);

        // 账号信息显示已移除

        // 创建或更新错误消息元素
        let errorElement = document.getElementById('panel-error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'panel-error-message';
            errorElement.style.cssText = 'color: red; margin-top: 10px; text-align: center; font-weight: bold;';
            this.panel.appendChild(errorElement);
        }

        errorElement.textContent = message;

        // 显示面板
        this.showPanel();
    },

    // 显示面板
    showPanel: function() {
        if (this.panel) {
            this.panel.style.display = 'block';
        }
    },

    // 隐藏面板
    hidePanel: function() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
    },

    // 钱包连接事件处理
    onWalletConnected: function(event) {
        console.log('状态面板收到钱包连接事件:', event.address);
        this.updatePanel();
    },

    // 钱包断开连接事件处理
    onWalletDisconnected: function() {
        console.log('状态面板收到钱包断开连接事件');
        this.hidePanel();
    },

    // 游戏结束事件处理
    onGameOver: async function(event) {
        console.log('状态面板收到游戏结束事件:', event);

        // 不再在这里调用saveCoins，避免重复保存金币
        // 金币保存由wallet-game-integration.js中的onGameOver方法统一处理

        // 等待一小段时间，确保后端数据已更新
        await new Promise(resolve => setTimeout(resolve, 500));

        // 更新面板 - 直接从API获取最新数据
        this.updatePanel();
    },

    // 关卡完成事件处理已删除 - 不需要此功能

    // 清理所有观察器和事件监听器
    cleanupObservers: function() {
        console.log('清理游戏状态面板的所有观察器和事件监听器...');

        // 清理MutationObserver
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
            console.log('已清理MutationObserver');
        }

        // 清理ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
            console.log('已清理ResizeObserver');
        }

        // 清理窗口事件监听器
        if (this.windowEventHandler) {
            window.removeEventListener('resize', this.windowEventHandler);
            window.removeEventListener('scroll', this.windowEventHandler);
            this.windowEventHandler = null;
            console.log('已清理窗口事件监听器');
        }
    },

    // 销毁面板和清理所有资源
    destroy: function() {
        console.log('销毁游戏状态面板...');

        // 清理所有观察器和事件监听器
        this.cleanupObservers();

        // 移除面板元素
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
            this.panel = null;
            console.log('已移除面板元素');
        }

        // 移除事件监听器
        if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
            GEMIOLI.Application.removeEventListener('wallet_connected', this.onWalletConnected);
            GEMIOLI.Application.removeEventListener('wallet_disconnected', this.onWalletDisconnected);
            GEMIOLI.Application.removeEventListener('game_over', this.onGameOver);
            // 关卡完成事件监听器移除代码已删除 - 不需要此功能
            console.log('已移除GEMIOLI事件监听器');
        }

        console.log('游戏状态面板销毁完成');
    }
};
