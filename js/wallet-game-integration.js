/**
 * 钱包与游戏集成模块
 * 用于处理钱包与游戏之间的交互
 */
const WalletGameIntegration = {
    // 初始化
    init: function() {
        console.log('初始化钱包游戏集成...');

        // 监听钱包连接事件
        if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
            // 监听钱包连接事件
            GEMIOLI.Application.addEventListener('wallet_connected', this.onWalletConnected.bind(this));

            // 监听钱包断开连接事件
            GEMIOLI.Application.addEventListener('wallet_disconnected', this.onWalletDisconnected.bind(this));

            // 我们不再使用事件监听器来捕获游戏开始和结束
            // 而是直接监听游戏中的关键变量和场景加载

            // 只保留钱包连接和断开连接的事件监听器
            // 其他事件通过我们自己的监视器来捕获
        }

        // 设置玩家死亡状态监视器，这是游戏结束的关键标志
        this.setupPlayerDeadMonitor();

        // 设置场景加载监视器，捕获游戏开始场景加载
        this.setupSceneLoadMonitor();

        // 不再从游戏容器判断钱包状态
        // 也不再操作游戏容器显示状态
    },

    // 钱包连接事件处理
    onWalletConnected: function(event) {
        console.log('游戏收到钱包连接事件:', event.address);

        // 显示欢迎消息
        this.showWalletMessage('钱包已连接: ' + WalletManager.shortenAddress(event.address));

        // 加载该钱包的游戏进度
        const savedProgress = WalletProgress.loadProgress();
        if (savedProgress) {
            console.log('加载已保存的游戏进度:', savedProgress);

            // 显示上次游戏信息
            if (savedProgress.lastScore) {
                this.showWalletMessage('上次得分: ' + savedProgress.lastScore);
            }

            // 这里可以根据游戏的具体实现来加载进度
            // 例如：设置起始关卡、恢复收集的物品等
        }

        // 加载最高分
        const highScore = WalletProgress.getHighScore();
        if (highScore > 0) {
            console.log('加载最高分:', highScore);
            this.showWalletMessage('最高分: ' + highScore);

            // 更新游戏中的最高分显示
            // 这里需要根据游戏的具体实现来更新UI
        }
    },

    // 钱包断开连接事件处理
    onWalletDisconnected: function() {
        console.log('游戏收到钱包断开连接事件');

        // 不显示断开连接消息，保持安静
        // this.showWalletMessage('钱包已断开连接');

        // 注意：具体的游戏结束和重置逻辑由WalletManager.disconnectWalletHandler处理
        // 这里不需要额外的处理
    },

    // 游戏结束事件处理
    onGameOver: function(event) {
        // 只在DEBUG_MODE下输出详细日志
        if (window.DEBUG_MODE) {
            console.log('游戏结束事件被触发:', event);
            console.log('调用堆栈:', new Error().stack);
            console.log('当前钱包状态:', WalletManager.isConnected() ? '已连接' : '未连接');
            console.log('当前API状态:', WalletProgress.useApi ? '已启用' : '未启用');
        }

        // 如果是因为钱包断开连接而结束游戏，不保存进度和奖励
        if (event.reason === 'wallet_disconnected' && event.forceEnd) {
            console.log('因钱包断开连接结束游戏，不保存进度和奖励');

            // 清除临时游戏数据
            this.clearGameSessionData();

            return; // 直接返回，不执行后续保存逻辑
        }

        // 如果钱包已连接，保存游戏进度
        if (WalletManager.isConnected()) {
            if (window.DEBUG_MODE) console.log('钱包已连接，准备保存游戏进度');

            // 获取本次游戏的分数和金币
            let currentGameScore = 0;
            let currentGameCoins = 0;

            try {
                // 直接从GEMIOLI.Play获取本次游戏的分数和金币
                currentGameScore = Math.floor(GEMIOLI.Play.distance);
                currentGameCoins = GEMIOLI.Play.coins;

                if (window.DEBUG_MODE) {
                    console.log('本次游戏分数:', currentGameScore);
                    console.log('本次游戏获得金币:', currentGameCoins);
                }
            } catch (e) {
                if (window.DEBUG_MODE) {
                    console.error('从GEMIOLI.Play获取数据时出错:', e);
                }

                // 如果无法从GEMIOLI.Play获取，则使用事件中的数据
                currentGameScore = event.score || 0;
                currentGameCoins = event.coins || 0;

                if (window.DEBUG_MODE) {
                    console.log('使用事件中的数据 - 分数:', currentGameScore);
                    console.log('使用事件中的数据 - 金币:', currentGameCoins);
                }
            }

            // 显示获得金币的消息
            if (currentGameCoins > 0) {
                this.showWalletMessage('获得 ' + currentGameCoins + ' 金币!');
            }

            // 如果API已启用，直接从后端获取数据并更新
            if (WalletProgress.useApi) {
                if (window.DEBUG_MODE) console.log('API已启用，直接从后端获取数据并更新...');

                // 获取当前钱包地址
                const walletAddress = WalletManager.getAccount();
                if (!walletAddress) {
                    console.error('无法获取钱包地址，无法上传游戏数据');
                    this.showWalletMessage('无法获取钱包地址，请重新连接钱包', 5000);
                    return;
                }

                console.log('当前钱包地址:', walletAddress);

                // 从后端获取当前用户数据
                const self = this; // 保存this引用，在Promise回调中使用

                // 使用Promise链式调用处理数据
                WalletProgress.getUserData()
                    .then(userData => {
                        // 始终打印后端用户数据，不受DEBUG_MODE限制
                        console.log('======= 金币计算数据 =======');
                        console.log('后端用户数据:', userData);

                        // 确保userData是有效对象
                        if (!userData || typeof userData !== 'object') {
                            console.error('无效的用户数据:', userData);
                            self.showWalletMessage('获取数据失败，请刷新页面重试', 5000);
                            return;
                        }

                        // 计算新的总金币数量
                        const totalCoins = (userData.coins || 0) + currentGameCoins;

                        // 更新累计获得金币（highScore表示累计获得金币，不是最高分）
                        // 只需要累加本次获得的金币，不需要与当前分数比较
                        const newHighScore = (userData.highScore || 0) + currentGameCoins;

                        // 判断是否是新的最高得分
                        const isNewLastScore = currentGameScore > (userData.lastScore || 0);
                        const newLastScore = isNewLastScore ? currentGameScore : (userData.lastScore || 0);

                        // 始终打印金币计算数据，不受DEBUG_MODE限制
                        console.log('当前可用金币:', userData.coins || 0);
                        console.log('本次游戏获得金币:', currentGameCoins);
                        console.log('计算后的总金币:', totalCoins);
                        console.log('当前累计获得金币:', userData.highScore || 0);
                        console.log('更新后的累计获得金币:', newHighScore);
                        console.log('是否是新的最高得分:', isNewLastScore);
                        console.log('当前最高得分:', userData.lastScore || 0);
                        console.log('新的最高得分:', newLastScore);
                        console.log('本次游戏得分:', currentGameScore);
                        console.log('======= 金币计算数据结束 =======');

                        // 确保ApiService对象存在
                        if (typeof window.ApiService === 'undefined') {
                            console.error('ApiService对象未定义');
                            console.error('window对象上的所有属性:', Object.keys(window).join(', '));

                            // 创建一个临时的ApiService对象
                            console.log('创建临时ApiService对象...');
                            window.ApiService = {
                                baseUrl: '/api',
                                verifyGameData: async function(walletAddress, gameCoins, verification) {
                                    console.log('使用临时ApiService.verifyGameData方法');
                                    console.log('参数:', { walletAddress, gameCoins, verification });

                                    try {
                                        const url = '/api/verify-game-data';
                                        console.log('验证游戏数据URL:', url);

                                        const response = await fetch(url, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({
                                                walletAddress,
                                                gameCoins,
                                                verification
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
                                }
                            };

                            console.log('临时ApiService对象已创建');
                        }

                        // 检查ApiService对象的所有方法
                        console.log('ApiService对象的所有方法:', Object.keys(window.ApiService).join(', '));

                        // 特别检查verifyGameData方法
                        if (typeof window.ApiService.verifyGameData !== 'function') {
                            console.error('ApiService.verifyGameData方法不可用');
                            console.error('ApiService对象类型:', typeof window.ApiService);
                            console.error('ApiService是否为数组:', Array.isArray(window.ApiService));
                            console.error('ApiService.verifyGameData类型:', typeof window.ApiService.verifyGameData);

                            // 添加verifyGameData方法
                            console.log('添加verifyGameData方法到ApiService对象...');

                            ApiService.verifyGameData = async function(walletAddress, gameCoins, verification) {
                                console.log('使用动态添加的verifyGameData方法');
                                console.log('参数:', { walletAddress, gameCoins, verification });

                                try {
                                    const url = '/api/verify-game-data';
                                    console.log('验证游戏数据URL:', url);

                                    const response = await fetch(url, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({
                                            walletAddress,
                                            gameCoins,
                                            verification
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
                            };

                            console.log('verifyGameData方法已添加到ApiService对象');
                        }

                        // 定义一个函数，用于处理验证游戏数据
                        const processGameVerification = function(verificationData, gameScore, isNewScore) {
                            console.log('生成的校验数据:', verificationData);
                            console.log('游戏得分:', gameScore, '是否是新的最高得分:', isNewScore);

                            // 如果ApiService.verifyGameData方法不可用，使用fetch API
                            if (typeof window.ApiService.verifyGameData !== 'function') {
                                console.log('ApiService.verifyGameData方法不可用，使用fetch API发送验证请求');

                                const verifyUrl = `/api/verify-game-data`;
                                return fetch(verifyUrl, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        walletAddress,
                                        gameCoins: currentGameCoins,
                                        verification: verificationData,
                                        gameScore: gameScore || 0, // 添加游戏得分
                                        isNewHighScore: isNewScore || false // 添加是否是新的最高得分标志
                                    })
                                })
                                .then(response => {
                                    console.log('验证请求响应状态:', response.status);
                                    if (response.ok) {
                                        return response.json();
                                    } else {
                                        throw new Error(`验证游戏数据失败，状态码: ${response.status}`);
                                    }
                                })
                                .then(result => {
                                    if (result.success) {
                                        console.log('成功验证游戏数据并更新金币');
                                        self.showWalletMessage('数据已验证并同步到后端', 3000);

                                        // 如果是新的最高得分，显示祝贺消息
                                        if (isNewLastScore) {
                                            self.showWalletMessage('恭喜！新的最高得分: ' + currentGameScore);
                                        }

                                        return result;
                                    } else {
                                        console.error('验证游戏数据失败:', result.error);
                                        self.showWalletMessage('数据验证失败: ' + (result.error || '未知错误'), 5000);
                                        return false;
                                    }
                                })
                                .catch(error => {
                                    console.error('验证游戏数据时出错:', error);
                                    self.showWalletMessage('验证游戏数据时出错: ' + error.message, 5000);
                                    return false;
                                });
                            } else {
                                // 使用ApiService.verifyGameData方法
                                console.log('使用ApiService.verifyGameData方法验证游戏数据');
                                return ApiService.verifyGameData(walletAddress, currentGameCoins, verificationData, gameScore);
                            }
                        };

                        // 生成游戏数据校验码
                        return GameVerifier.generateVerificationCode(walletAddress, currentGameCoins)
                            .then(verificationData => {
                                if (!verificationData) {
                                    console.error('生成校验码失败');
                                    self.showWalletMessage('生成校验码失败，无法更新数据', 5000);
                                    return false;
                                }

                                // 处理验证
                                return processGameVerification(verificationData, currentGameScore, isNewLastScore)
                                    .then(result => {
                                        if (result && result.success) {
                                            if (window.DEBUG_MODE) console.log('成功验证游戏数据并更新金币');

                                            // 显示同步成功消息
                                            self.showWalletMessage('数据已验证并同步到后端', 3000);

                                            // 如果是新的最高得分，显示祝贺消息
                                            if (isNewLastScore) {
                                                self.showWalletMessage('恭喜！新的最高得分: ' + currentGameScore);
                                            }

                                            // 更新游戏状态面板
                                            if (typeof GameStatusPanel !== 'undefined') {
                                                if (window.DEBUG_MODE) console.log('更新游戏状态面板');
                                                GameStatusPanel.updatePanel();
                                            }

                                            // 验证游戏数据的接口已经更新了金币和相关数据，不需要再次更新用户数据
                                            console.log('验证游戏数据成功，服务器已更新所有相关数据，无需额外更新');

                                            // 直接返回成功结果
                                            return true;
                                        } else {
                                            if (window.DEBUG_MODE) console.log('验证游戏数据失败:', result ? result.error : '未知错误');

                                            // 显示验证失败消息
                                            self.showWalletMessage('数据验证失败: ' + (result && result.error ? result.error : '未知错误'), 5000);
                                            return false;
                                        }
                                    });
                            });
                    })
                    .catch(error => {
                        if (window.DEBUG_MODE) {
                            console.error('处理用户数据时出错:', error);
                        }

                        // 显示错误消息
                        self.showWalletMessage('获取或更新数据出错，请刷新页面重试', 5000);
                    });
            } else {
                // API未启用，显示错误消息
                if (window.DEBUG_MODE) console.log('API未启用，无法保存游戏数据');
                this.showWalletMessage('API服务未启用，无法保存游戏数据', 5000);
            }
        } else {
            if (window.DEBUG_MODE) console.log('钱包未连接，不保存游戏进度');
        }
    },

    // 本地存储备用方案已移除，完全依赖API

    // 关卡完成事件处理已删除 - 不需要此功能

    // 游戏启动事件处理
    onGameStart: function(event) {
        if (window.DEBUG_MODE) {
            console.log('游戏启动:', event);
        }

        // 显示游戏启动消息
        if (event.wallet) {
            this.showWalletMessage('游戏开始！钱包已连接: ' + WalletManager.shortenAddress(event.wallet));
        } else {
            this.showWalletMessage('游戏开始！');
        }

        // 设置游戏已开始标志
        WalletManager.gameStarted = true;

        // 重置死亡检测状态
        this.lastDeadTimer = 0;
        this.deathDetected = false;

        // 从后端获取最新数据
        if (WalletManager.isConnected() && WalletProgress.useApi) {
            if (window.DEBUG_MODE) {
                console.log('游戏开始时从后端获取最新数据');
            }

            // 获取用户数据
            WalletProgress.fetchUserData()
                .then(success => {
                    if (success && window.DEBUG_MODE) {
                        console.log('成功从后端获取用户数据');
                    }
                })
                .catch(error => {
                    if (window.DEBUG_MODE) {
                        console.error('从后端获取用户数据时出错:', error);
                    }
                });
        }
    },

    // 游戏暂停事件处理
    onGamePause: function(event) {
        console.log('游戏暂停:', event);

        // 显示游戏暂停消息
        if (event.reason === 'wallet_disconnected') {
            this.showWalletMessage('游戏暂停：钱包已断开连接');
        } else {
            this.showWalletMessage('游戏暂停');
        }
    },

    // 游戏重置事件处理
    onGameReset: function(event) {
        console.log('游戏重置:', event);

        // 如果是因为钱包断开连接而重置，不保存进度和奖励
        if (event.reason === 'wallet_disconnected' && event.discardRewards) {
            console.log('因钱包断开连接重置游戏，不保存进度和奖励');

            // 恢复断开连接前的金币数量
            const originalCoins = WalletProgress.getOriginalCoins();
            if (originalCoins !== null) {
                console.log('恢复断开连接前的金币数量:', originalCoins);
                WalletProgress.forceSetCoins(originalCoins);
            }

            // 清除临时游戏数据
            this.clearGameSessionData();

            // 不显示任何消息，保持安静
            // this.showWalletMessage('游戏已重置');
        } else {
            // 正常的游戏重置
            this.showWalletMessage('游戏已重置');
        }
    },

    // 清除监听器和定时器
    clearMonitors: function() {
        console.log('清除监听器和定时器...');

        // 清除玩家死亡状态监视器
        if (this.playerDeadInterval) {
            clearInterval(this.playerDeadInterval);
            this.playerDeadInterval = null;
        }

        // 重置状态
        this.lastDeadTimer = 0;
        this.deathDetected = false;
    },

    // 清除游戏会话数据
    clearGameSessionData: function() {
        console.log('清除游戏会话数据...');

        // 清除监听器和定时器
        this.clearMonitors();

        // 清除可能的游戏进度缓存
        const gameDataKeys = [
            'current_score',
            'current_level',
            'current_distance',
            'current_coins',
            'temp_coins',
            'temp_score',
            'session_rewards',
            'session_achievements',
            'com.gemioli.tombrunner.score' // 添加全局得分数据
        ];

        // 尝试清除所有可能的临时游戏数据
        gameDataKeys.forEach(key => {
            try {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    console.log('已删除临时游戏数据:', key);
                }
            } catch (e) {
                console.log('删除临时游戏数据失败:', key, e);
            }
        });

        // 尝试清除所有以"temp_"或"current_"开头的键
        for (let i = 0; i < localStorage.length; i++) {
            try {
                const key = localStorage.key(i);
                if (key && (key.startsWith('temp_') || key.startsWith('current_') || key.startsWith('session_'))) {
                    localStorage.removeItem(key);
                    console.log('已删除临时游戏数据:', key);
                }
            } catch (e) {
                console.log('删除临时游戏数据失败:', e);
            }
        }
    },

    // 返回主菜单事件处理
    onReturnToMainMenu: function(event) {
        console.log('返回主菜单:', event);

        // 如果是因为钱包断开连接而返回主菜单，不显示消息
        if (event.reason === 'wallet_disconnected') {
            console.log('因钱包断开连接返回主菜单');

            // 不显示任何消息，保持安静
            // this.showWalletMessage('已返回主菜单');

            // 重置游戏已开始标志
            WalletManager.gameStarted = false;

            // 显示登录屏幕
            const loginScreen = document.getElementById('wallet-login-screen');
            if (loginScreen && WalletManager.loginRequired) {
                loginScreen.style.display = 'flex';
            }
        } else {
            // 正常返回主菜单
            this.showWalletMessage('已返回主菜单');

            // 重置游戏已开始标志
            WalletManager.gameStarted = false;
        }
    },

    // 显示钱包相关消息
    showWalletMessage: function(message, duration) {
        duration = duration || 3000; // 默认显示3秒

        // 创建或获取消息容器
        let messageContainer = document.getElementById('wallet-message');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'wallet-message';
            messageContainer.style.cssText = 'position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: rgba(0, 0, 0, 0.7); color: white; padding: 10px 20px; border-radius: 5px; font-family: Arial, sans-serif; font-size: 14px; z-index: 1000; transition: opacity 0.3s;';
            document.body.appendChild(messageContainer);
        }

        // 设置消息内容
        messageContainer.textContent = message;
        messageContainer.style.opacity = '1';

        // 定时隐藏消息
        setTimeout(function() {
            messageContainer.style.opacity = '0';
        }, duration);
    },

    // 我们不再使用复杂的函数覆盖和DOM观察
    // 而是直接使用setupPlayerDeadMonitor和setupSceneLoadMonitor来捕获游戏开始和结束

    // 监听游戏中的GEMIOLI.Play.deadTimer变量，这是游戏结束的关键标志
    setupPlayerDeadMonitor: function() {
        console.log('设置玩家死亡状态监视器...');

        const self = this;
        let lastDeadTimer = 0; // 假设初始值为0或正数（非死亡状态）
        let deathDetected = false; // 用于防止重复触发

        // 在全局作用域添加一个函数，方便在浏览器控制台中查看deadTimer
        window.checkDeadTimer = function(silent) {
            if (typeof GEMIOLI !== 'undefined' && typeof GEMIOLI.Play !== 'undefined') {
                const deadTimer = GEMIOLI.Play.deadTimer;
                if (!silent) {
                    console.log('deadTimer =', deadTimer, (deadTimer < 0 ? '(死亡状态)' : '(活着状态)'));
                }
                return deadTimer;
            } else {
                if (!silent) {
                    console.log('GEMIOLI.Play不存在');
                }
                return null;
            }
        };

        // 调试功能已删除 - 不需要向最终玩家展示这些外挂功能

        // 使用定时器定期检查deadTimer
        this.playerDeadInterval = setInterval(function() {
            // 确保GEMIOLI.Play存在
            if (typeof GEMIOLI === 'undefined' || typeof GEMIOLI.Play === 'undefined') {
                return;
            }

            const currentDeadTimer = GEMIOLI.Play.deadTimer;

            // 只在DEBUG_MODE下输出状态变化
            if (window.DEBUG_MODE && currentDeadTimer !== lastDeadTimer) {
                console.log('deadTimer变化:', lastDeadTimer, '->', currentDeadTimer);
            }

            // 检测从非负值变为负值的情况（表示死亡开始）
            if (currentDeadTimer < 0 && lastDeadTimer >= 0 && !deathDetected) {
                if (window.DEBUG_MODE) {
                    console.log('检测到deadTimer从非负变为负值，玩家死亡');
                }
                deathDetected = true;

                // 获取本次游戏的分数和金币
                let currentGameScore = 0;
                let currentGameCoins = 0;

                try {
                    // 直接从GEMIOLI.Play获取本次游戏的分数和金币
                    currentGameScore = Math.floor(GEMIOLI.Play.distance);
                    currentGameCoins = GEMIOLI.Play.coins;

                    if (window.DEBUG_MODE) {
                        console.log('本次游戏分数:', currentGameScore);
                        console.log('本次游戏获得金币:', currentGameCoins);
                    }
                } catch (e) {
                    if (window.DEBUG_MODE) {
                        console.error('获取本次游戏分数和金币时出错:', e);
                    }

                    // 如果出错，使用默认值0
                    currentGameScore = 0; // 默认分数为0
                    currentGameCoins = 0; // 默认金币为0
                }

                // inspectPlay函数已被删除，不再需要调用
                console.log('======= 游戏结束数据 =======');

                // 打印本次游戏的关键数据
                console.log('本次游戏分数:', currentGameScore);
                console.log('本次游戏获得金币:', currentGameCoins);

                // 尝试获取当前用户数据
                try {
                    // 获取当前钱包地址
                    const walletAddress = WalletManager.getAccount();
                    if (!walletAddress) {
                        console.error('无法获取钱包地址，无法获取用户数据');
                        return;
                    }
                    console.log('当前钱包地址:', walletAddress);

                    // 确保WalletProgress.useApi设置正确
                    if (typeof WalletProgress !== 'undefined' && typeof WalletProgress.useApi !== 'undefined') {
                        console.log('当前WalletProgress.useApi状态:', WalletProgress.useApi);

                        // 如果API连接测试成功，确保useApi设置为true
                        if (typeof window.ApiService !== 'undefined' && typeof ApiService.testConnection === 'function') {
                            ApiService.testConnection().then(connected => {
                                if (connected && !WalletProgress.useApi) {
                                    console.log('API连接测试成功，设置WalletProgress.useApi = true');
                                    WalletProgress.setUseApi(true);
                                }
                            }).catch(error => {
                                console.error('API连接测试出错:', error);
                            });
                        }
                    }

                    // 尝试从API获取当前用户数据
                    console.log('尝试从API获取当前用户数据...');

                    // 添加更多调试信息
                    console.log('从后端获取用户数据，钱包地址:', walletAddress);

                    // 检查ApiService是否可用
                    if (typeof window.ApiService === 'undefined') {
                        console.error('ApiService对象未定义，请检查api-service.js是否正确加载');
                        console.error('window对象上的所有属性:', Object.keys(window).join(', '));
                    } else if (typeof window.ApiService.getUserData !== 'function') {
                        console.error('ApiService.getUserData方法不可用，请检查api-service.js是否正确加载');
                        console.error('ApiService对象上的所有方法:', Object.keys(window.ApiService).join(', '));
                    }

                    // 确保ApiService正确初始化
                    if (window.ApiService && typeof window.ApiService.getUserData === 'function') {
                        // 检查ApiService.baseUrl
                        console.log('当前ApiService.baseUrl:', ApiService.baseUrl);

                        // 构建API URL并打印
                        const apiUrl = ApiService.buildApiUrl(`/user/${walletAddress}`);
                        console.log('获取用户数据URL:', apiUrl);

                        // 这里我们直接打印，不等待异步结果，因为onGameOver会处理实际的数据更新
                        ApiService.getUserData(walletAddress)
                        .then(userData => {
                            if (userData) {
                                console.log('当前用户数据:', userData);
                                console.log('当前可用金币:', userData.coins || 0);
                                console.log('当前累计获得金币:', userData.highScore || 0);
                                console.log('当前最高得分:', userData.lastScore || 0);

                                // 计算预期的新值
                                const expectedTotalCoins = (userData.coins || 0) + currentGameCoins;
                                const expectedHighScore = (userData.highScore || 0) + currentGameCoins;

                                console.log('预期更新后的总金币:', expectedTotalCoins);
                                console.log('预期更新后的累计获得金币:', expectedHighScore);
                            } else {
                                console.log('无法获取当前用户数据');
                            }
                        })
                        .catch(error => {
                            console.error('获取用户数据时出错:', error);
                            console.error('错误详情:', error.message);
                            console.error('错误堆栈:', error.stack);

                            // 尝试使用fetch API直接获取用户数据
                            console.log('尝试使用fetch API直接获取用户数据...');
                            fetch(`/api/user/${walletAddress}`)
                            .then(response => {
                                console.log('fetch响应状态:', response.status);
                                if (response.ok) {
                                    return response.json();
                                } else {
                                    throw new Error(`获取用户数据失败，状态码: ${response.status}`);
                                }
                            })
                            .then(data => {
                                console.log('使用fetch API获取的用户数据:', data);
                            })
                            .catch(fetchError => {
                                console.error('使用fetch API获取用户数据时出错:', fetchError);
                            });
                        });
                    } else {
                        console.error('ApiService不可用，无法获取用户数据');
                        console.error('请确保api-service.js已正确加载，并且后端服务器正在运行');

                        // 尝试使用fetch API直接获取用户数据
                        console.log('尝试使用fetch API直接获取用户数据...');
                        fetch(`/api/user/${walletAddress}`)
                        .then(response => {
                            console.log('fetch响应状态:', response.status);
                            if (response.ok) {
                                return response.json();
                            } else {
                                throw new Error(`获取用户数据失败，状态码: ${response.status}`);
                            }
                        })
                        .then(data => {
                            console.log('使用fetch API获取的用户数据:', data);
                        })
                        .catch(fetchError => {
                            console.error('使用fetch API获取用户数据时出错:', fetchError);
                        });
                    }
                } catch (e) {
                    console.error('尝试获取用户数据时出错:', e);
                }

                console.log('======= 游戏结束数据结束 =======');

                // 触发游戏结束事件
                // 注意：这里只传递本次游戏的分数和金币
                // 总分数和总金币的累加将在onGameOver方法中处理
                self.onGameOver({
                    score: currentGameScore,
                    level: 1,
                    distance: currentGameScore, // 使用分数作为距离
                    coins: currentGameCoins,
                    source: 'deadTimer_monitor'
                });
            }

            // 检测从负值变为非负值的情况（表示新游戏开始）
            if (currentDeadTimer >= 0 && lastDeadTimer < 0) {
                if (window.DEBUG_MODE) {
                    console.log('检测到deadTimer从负变为非负值，可能是新游戏开始');
                }
                deathDetected = false;
            }

            // 更新上一次的值
            lastDeadTimer = currentDeadTimer;
        }, 100); // 每100毫秒检查一次

        // 添加DEBUG_MODE开关，默认关闭
        if (typeof window.DEBUG_MODE === 'undefined') {
            window.DEBUG_MODE = false;
        }

        // 初始化状态
        this.lastDeadTimer = 0;
        this.deathDetected = false;
    },

    // 监听游戏场景加载，特别是Nachalo.js（游戏开始场景）
    setupSceneLoadMonitor: function() {
        console.log('设置场景加载监视器...');

        const self = this;

        // 所有调试功能已删除 - 不需要向最终玩家展示这些外挂功能

        // 覆盖console.log函数，捕获场景加载日志
        const originalConsoleLog = console.log;
        console.log = function() {
            // 调用原始console.log
            originalConsoleLog.apply(console, arguments);

            // 检查参数是否包含场景加载信息
            if (arguments.length >= 3 && arguments[0] === 'show') {
                const sceneType = arguments[1];
                // 第三个参数是场景ID，记录在日志中
                console.log('场景加载: 类型=', sceneType, '场景ID=', arguments[2]);

                // 检测到Nachalo.js场景加载，表示游戏开始
                if (sceneType === 'Nachalo.js') {
                    console.log('检测到游戏开始场景加载: Nachalo.js');

                    // 触发游戏开始事件
                    self.onGameStart({
                        wallet: WalletManager.isConnected() ? WalletManager.getAccount() : null,
                        source: 'scene_load_monitor'
                    });
                }

                // 检测到Level08.js场景加载，表示游戏进行中
                if (sceneType === 'Level08.js') {
                    console.log('检测到游戏关卡加载: Level08.js');

                    // 确保游戏已开始标志设置为true
                    WalletManager.gameStarted = true;
                }
            }
        };
    }
};
