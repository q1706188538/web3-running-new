/**
 * MetaMask钱包连接管理器
 * 用于神庙逃亡游戏的Web3集成
 */
const WalletManager = {
    web3: null,
    account: null,
    chainId: null,
    gameStarted: false,
    loginRequired: true, // 设置为true，表示必须登录才能玩游戏
    manuallyDisconnected: false, // 用户是否主动断开连接

    // 初始化
    init: function() {
        console.log('初始化钱包管理器...');

        // 创建UI元素
        this.createUI();

        // 创建登录屏幕
        this.createLoginScreen();

        // 绑定按钮事件
        document.getElementById('connect-wallet').addEventListener('click', this.connectWallet.bind(this));
        document.getElementById('disconnect-wallet').addEventListener('click', this.disconnectWallet.bind(this));
        document.getElementById('login-connect-button').addEventListener('click', this.connectWallet.bind(this));

        // 检查是否已经连接
        this.checkConnection();
    },

    // 创建UI元素
    createUI: function() {
        // 创建钱包登录UI
        const walletUI = document.createElement('div');
        walletUI.id = 'wallet-login';
        walletUI.style.cssText = 'position: absolute; top: 10px; right: 10px; z-index: 1000; font-family: Arial, sans-serif;';

        // 连接按钮
        const connectBtn = document.createElement('button');
        connectBtn.id = 'connect-wallet';
        connectBtn.className = 'wallet-button';
        connectBtn.textContent = '连接钱包';
        connectBtn.style.cssText = 'background-color: #f5a623; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;';

        // 钱包信息区域 - 极简版，只有断开连接按钮，没有背景
        const walletInfo = document.createElement('div');
        walletInfo.id = 'wallet-info';
        walletInfo.style.cssText = 'display: none; position: fixed; top: 10px; right: 10px; z-index: 1001;';

        // 断开连接按钮 - 移到右上角，没有背景
        const disconnectBtn = document.createElement('button');
        disconnectBtn.id = 'disconnect-wallet';
        disconnectBtn.className = 'wallet-button';
        disconnectBtn.textContent = '断开连接';
        disconnectBtn.style.cssText = 'background-color: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);';

        // 组装UI - 只添加断开连接按钮
        walletInfo.appendChild(disconnectBtn);
        walletUI.appendChild(connectBtn);
        walletUI.appendChild(walletInfo);

        // 添加到页面
        document.body.appendChild(walletUI);
    },

    // 创建登录屏幕
    createLoginScreen: function() {
        // 创建登录屏幕容器
        const loginScreen = document.createElement('div');
        loginScreen.id = 'wallet-login-screen';
        loginScreen.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.9); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 2000; font-family: Arial, sans-serif; color: white;';

        // 创建标题
        const title = document.createElement('h1');
        title.textContent = '神庙逃亡';
        title.style.cssText = 'font-size: 36px; margin-bottom: 20px; color: #f5a623;';

        // 创建说明文本
        const description = document.createElement('p');
        description.textContent = '请连接MetaMask钱包以开始游戏';
        description.style.cssText = 'font-size: 18px; margin-bottom: 30px;';

        // 创建MetaMask图标
        const metamaskIcon = document.createElement('div');
        metamaskIcon.style.cssText = 'width: 100px; height: 100px; background-image: url(https://metamask.io/images/metamask-fox.svg); background-size: contain; background-repeat: no-repeat; background-position: center; margin-bottom: 30px;';

        // 创建连接按钮
        const connectButton = document.createElement('button');
        connectButton.id = 'login-connect-button';
        connectButton.textContent = '连接MetaMask钱包';
        connectButton.style.cssText = 'background-color: #f5a623; color: white; border: none; padding: 15px 30px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 18px; transition: background-color 0.3s;';

        // 鼠标悬停效果
        connectButton.onmouseover = function() {
            this.style.backgroundColor = '#e69c1e';
        };
        connectButton.onmouseout = function() {
            this.style.backgroundColor = '#f5a623';
        };

        // 创建提示文本
        const hint = document.createElement('p');
        hint.innerHTML = '没有MetaMask? <a href="https://metamask.io/download.html" target="_blank" style="color: #f5a623; text-decoration: none;">点击这里安装</a>';
        hint.style.cssText = 'font-size: 14px; margin-top: 20px;';

        // 组装登录屏幕
        loginScreen.appendChild(title);
        loginScreen.appendChild(metamaskIcon);
        loginScreen.appendChild(description);
        loginScreen.appendChild(connectButton);
        loginScreen.appendChild(hint);

        // 添加到页面
        document.body.appendChild(loginScreen);

        // 如果不需要强制登录，则隐藏登录屏幕
        if (!this.loginRequired) {
            loginScreen.style.display = 'none';
        }
    },

    // 检查是否已连接
    checkConnection: async function() {
        console.log('检查钱包连接状态...');

        // 检查是否有保存的断开连接标志
        const savedDisconnectFlag = localStorage.getItem('wallet_manually_disconnected');
        if (savedDisconnectFlag === 'true') {
            console.log('检测到用户之前主动断开了连接，不会自动重连');
            this.manuallyDisconnected = true;

            // 如果需要强制登录，显示登录屏幕
            if (this.loginRequired) {
                const loginScreen = document.getElementById('wallet-login-screen');
                if (loginScreen) {
                    loginScreen.style.display = 'flex';
                }

                // 隐藏游戏容器
                const container = document.getElementById('container');
                if (container) {
                    container.style.display = 'none';
                }
            }

            return; // 不继续检查连接
        }

        // 如果需要强制登录，默认隐藏游戏容器
        if (this.loginRequired) {
            const container = document.getElementById('container');
            if (container) {
                container.style.display = 'none';
            }
        }

        // 检查是否安装了MetaMask
        if (typeof window.ethereum !== 'undefined') {
            try {
                // 获取已连接的账户
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });

                if (accounts.length > 0 && !this.manuallyDisconnected) {
                    // 只有在用户没有主动断开连接的情况下，才自动恢复连接
                    this.handleAccountsChanged(accounts);
                } else if (this.loginRequired) {
                    // 没有连接的账户，显示登录屏幕
                    const loginScreen = document.getElementById('wallet-login-screen');
                    if (loginScreen) {
                        loginScreen.style.display = 'flex';
                    }
                }

                // 监听账户变化
                window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
                // 监听链变化
                window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
            } catch (error) {
                console.error('检查连接时出错:', error);

                // 出错时，如果需要强制登录，显示登录屏幕
                if (this.loginRequired) {
                    const loginScreen = document.getElementById('wallet-login-screen');
                    if (loginScreen) {
                        loginScreen.style.display = 'flex';
                    }
                }
            }
        } else {
            console.log('未检测到MetaMask');

            // 未检测到MetaMask，如果需要强制登录，显示登录屏幕
            if (this.loginRequired) {
                const loginScreen = document.getElementById('wallet-login-screen');
                if (loginScreen) {
                    loginScreen.style.display = 'flex';
                }
            }
        }
    },

    // 连接钱包
    connectWallet: async function() {
        console.log('尝试连接钱包...');

        if (typeof window.ethereum !== 'undefined') {
            try {
                // 初始化Web3
                this.web3 = new Web3(window.ethereum);

                // 清除断开连接标志
                this.manuallyDisconnected = false;
                localStorage.removeItem('wallet_manually_disconnected');

                console.log('已清除断开连接标志');

                // 强制断开当前连接，确保MetaMask显示选择界面
                console.log('尝试强制断开当前连接...');

                try {
                    // 先尝试获取当前账户，不会弹出MetaMask
                    const currentAccounts = await window.ethereum.request({ method: 'eth_accounts' });
                    console.log('当前已连接账户:', currentAccounts);

                    // 如果有已连接账户，尝试断开
                    if (currentAccounts && currentAccounts.length > 0) {
                        // 注意：MetaMask不支持直接断开连接的API，我们通过其他方式强制刷新
                        console.log('检测到已连接账户，尝试强制刷新连接...');
                    }
                } catch (e) {
                    console.log('检查当前账户时出错:', e);
                }

                // 使用强制参数请求连接账户
                console.log('请求连接账户，强制显示MetaMask...');

                // 使用wallet_requestPermissions API强制显示MetaMask
                try {
                    // 这个API会强制显示MetaMask，即使已经连接
                    await window.ethereum.request({
                        method: 'wallet_requestPermissions',
                        params: [{ eth_accounts: {} }]
                    });
                    console.log('成功请求权限，现在获取账户...');
                } catch (permError) {
                    console.log('请求权限失败，可能被用户拒绝:', permError);
                    // 如果用户拒绝了权限请求，我们不继续
                    if (permError.code === 4001) { // 用户拒绝
                        throw permError;
                    }
                }

                // 获取账户
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                console.log('获取到账户:', accounts);

                // 获取链ID
                this.chainId = await window.ethereum.request({ method: 'eth_chainId' });
                console.log('已连接到链ID:', this.chainId);

                // 处理账户变化（这会触发数据同步和登录成功事件）
                await this.handleAccountsChanged(accounts);

                return true;
            } catch (error) {
                console.error('连接MetaMask失败:', error);
                alert('连接MetaMask失败: ' + error.message);
                return false;
            }
        } else {
            alert('请安装MetaMask钱包插件');
            window.open('https://metamask.io/download.html', '_blank');
            return false;
        }
    },

    // 断开连接
    disconnectWallet: async function() {
        console.log('断开钱包连接');

        // 尝试使用MetaMask API断开连接（如果支持）
        if (this.web3 && window.ethereum) {
            try {
                console.log('尝试使用MetaMask API断开连接...');

                // 注意：MetaMask不支持直接断开连接的API，但我们可以尝试清除一些状态

                // 移除所有事件监听器
                if (typeof window.ethereum.removeAllListeners === 'function') {
                    window.ethereum.removeAllListeners();
                    console.log('已移除所有MetaMask事件监听器');
                }

                // 尝试获取当前账户，不会弹出MetaMask
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                console.log('断开前的账户:', accounts);
            } catch (error) {
                console.log('尝试断开连接时出错:', error);
            }
        }

        this.account = null;
        this.web3 = null;
        document.getElementById('wallet-info').style.display = 'none';
        document.getElementById('connect-wallet').style.display = 'block';

        // 设置断开连接标志
        this.manuallyDisconnected = true;

        // 将断开连接状态保存到localStorage
        localStorage.setItem('wallet_manually_disconnected', 'true');

        // 清除其他可能的缓存
        localStorage.removeItem('metamask_connected');
        localStorage.removeItem('metamask_account');

        console.log('已设置断开连接标志，刷新页面后不会自动重连');

        // 调用断开连接后的处理函数
        await this.disconnectWalletHandler();
    },

    // 断开连接后的处理
    disconnectWalletHandler: async function() {
        // 检查游戏是否已经开始
        if (this.gameStarted) {
            console.log('游戏已开始，断开钱包连接，触发游戏结束...');

            // 触发游戏结束（人物死亡）
            this.triggerGameOver();

            // 重置游戏状态，不保存进度和奖励
            await this.resetGameWithoutSaving();
        }

        // 如果需要强制登录，则显示登录屏幕
        if (this.loginRequired) {
            const loginScreen = document.getElementById('wallet-login-screen');
            if (loginScreen) {
                loginScreen.style.display = 'flex';
            }
        }

        // 触发登出事件
        this.onLogout();
    },

    // 触发游戏结束（人物死亡）
    triggerGameOver: function() {
        console.log('触发游戏结束（人物死亡）...');

        // 通知游戏结束
        if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
            GEMIOLI.Application.dispatchEvent({
                type: 'game_over',
                reason: 'wallet_disconnected',
                forceEnd: true  // 强制结束，不保存进度
            });
        }

        // 如果游戏有自己的结束函数，调用它
        if (typeof gameOver === 'function') {
            gameOver();
        }

        // 如果游戏有自己的死亡函数，调用它
        if (typeof playerDie === 'function') {
            playerDie();
        }

        // 重置游戏状态
        this.gameStarted = false;
    },

    // 重置游戏，不保存进度和奖励
    resetGameWithoutSaving: async function() {
        console.log('重置游戏，不保存进度和奖励...');

        try {
            // 清除当前游戏会话中的所有进度和金币数据
            console.log('清除游戏进度和金币数据...');

            // 1. 清除当前游戏会话中可能已经获得但尚未保存的金币和分数
            if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
                // 发送清除游戏数据的事件
                GEMIOLI.Application.dispatchEvent({
                    type: 'clear_game_data',
                    reason: 'wallet_disconnected'
                });
            }

            // 2. 恢复断开连接前的金币数量（防止游戏中获得的金币被保存）
            try {
                const originalCoins = await WalletProgress.getOriginalCoins();
                if (originalCoins !== null) {
                    console.log('恢复断开连接前的金币数量:', originalCoins);
                    await WalletProgress.forceSetCoins(originalCoins);
                }
            } catch (error) {
                console.error('恢复原始金币数量时出错:', error);
                // 即使出错，也继续重置游戏
            }

            // 3. 清除可能的游戏进度缓存
            const gameProgressKeys = [
                'current_score',
                'current_level',
                'current_distance',
                'current_coins',
                'temp_coins',
                'temp_score'
            ];

            gameProgressKeys.forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    console.log('已删除临时游戏数据:', key);
                }
            });

            // 通知游戏重置
            if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
                GEMIOLI.Application.dispatchEvent({
                    type: 'game_reset',
                    reason: 'wallet_disconnected',
                    discardRewards: true  // 丢弃奖励，不保存
                });
            }

            // 如果游戏有自己的重置函数，调用它
            if (typeof resetGame === 'function') {
                resetGame(true);  // 传入true表示不保存进度
            }

            // 回到主页面
            this.returnToMainMenu();
        } catch (error) {
            console.error('重置游戏时出错:', error);
            // 即使出错，也尝试回到主页面
            this.returnToMainMenu();
        }
    },

    // 回到主页面
    returnToMainMenu: function() {
        console.log('回到主页面（汉堡菜单页）...');

        try {
            // 强制重置游戏状态
            this.gameStarted = false;

            // 隐藏游戏容器
            const container = document.getElementById('container');
            if (container) {
                container.style.display = 'none';
                console.log('已隐藏游戏容器');
            }

            // 显示登录屏幕（汉堡菜单页）
            const loginScreen = document.getElementById('wallet-login-screen');
            if (loginScreen) {
                // 确保登录屏幕可见
                loginScreen.style.display = 'flex';
                loginScreen.style.zIndex = '9999'; // 确保在最上层
                console.log('已显示登录屏幕（汉堡菜单页）');

                // 强制重新渲染登录屏幕
                loginScreen.style.opacity = '0.99';
                setTimeout(function() {
                    loginScreen.style.opacity = '1';
                }, 10);
            }

            // 尝试所有可能的方法回到主菜单

            // 1. 如果游戏有自己的回到主菜单函数，调用它
            if (typeof returnToMainMenu === 'function') {
                try {
                    returnToMainMenu();
                    console.log('调用returnToMainMenu()成功');
                } catch (e) {
                    console.log('调用returnToMainMenu()失败:', e);
                }
            }

            // 2. 尝试直接调用游戏的主菜单函数
            if (typeof GEMIOLI !== 'undefined') {
                // 尝试多种可能的主菜单函数名
                if (typeof GEMIOLI.showMainMenu === 'function') {
                    try {
                        GEMIOLI.showMainMenu();
                        console.log('调用GEMIOLI.showMainMenu()成功');
                    } catch (e) {
                        console.log('调用GEMIOLI.showMainMenu()失败:', e);
                    }
                } else if (typeof GEMIOLI.showMenu === 'function') {
                    try {
                        GEMIOLI.showMenu();
                        console.log('调用GEMIOLI.showMenu()成功');
                    } catch (e) {
                        console.log('调用GEMIOLI.showMenu()失败:', e);
                    }
                } else if (typeof GEMIOLI.Application && typeof GEMIOLI.Application.showMainMenu === 'function') {
                    try {
                        GEMIOLI.Application.showMainMenu();
                        console.log('调用GEMIOLI.Application.showMainMenu()成功');
                    } catch (e) {
                        console.log('调用GEMIOLI.Application.showMainMenu()失败:', e);
                    }
                }
            }

            // 3. 通知游戏回到主菜单
            if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
                try {
                    GEMIOLI.Application.dispatchEvent({
                        type: 'return_to_main_menu',
                        reason: 'wallet_disconnected',
                        force: true // 添加强制标志
                    });
                    console.log('发送return_to_main_menu事件成功');
                } catch (e) {
                    console.log('发送return_to_main_menu事件失败:', e);
                }
            }

            // 4. 尝试直接操作DOM，确保游戏容器隐藏，登录屏幕显示
            document.querySelectorAll('canvas').forEach(function(canvas) {
                canvas.style.display = 'none';
            });

            // 5. 尝试重置游戏状态
            if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
                try {
                    // 发送多个事件，确保游戏状态被重置
                    GEMIOLI.Application.dispatchEvent({type: 'game_pause'});
                    GEMIOLI.Application.dispatchEvent({type: 'game_stop'});
                    GEMIOLI.Application.dispatchEvent({type: 'game_reset'});
                    console.log('发送游戏重置事件成功');
                } catch (e) {
                    console.log('发送游戏重置事件失败:', e);
                }
            }

            console.log('所有返回主菜单的操作已完成');
        } catch (error) {
            console.error('返回主菜单时出错:', error);
        }
    },

    // 处理账户变化
    handleAccountsChanged: async function(accounts) {
        if (accounts.length === 0) {
            // 用户断开了连接
            this.disconnectWallet();
        } else {
            // 更新当前账户
            this.account = accounts[0];
            console.log('当前账户:', this.account);

            // 更新last_connected_account
            localStorage.setItem('last_connected_account', this.account);
            console.log('已更新last_connected_account:', this.account);

            // 显示断开连接按钮
            document.getElementById('wallet-info').style.display = 'block';
            document.getElementById('connect-wallet').style.display = 'none';

            // 如果是新连接，触发登录成功事件
            if (this.web3) {
                await this.onLoginSuccess();
            }

            // 隐藏登录屏幕，允许游戏开始
            if (this.loginRequired) {
                const loginScreen = document.getElementById('wallet-login-screen');
                if (loginScreen) {
                    loginScreen.style.display = 'none';
                }

                // 启动游戏
                await this.startGame();
            }
        }
    },

    // 处理链变化
    handleChainChanged: function(chainId) {
        console.log('链ID已更改:', chainId);
        this.chainId = chainId;

        // 可以在这里添加特定链的逻辑
    },

    // 缩短地址显示
    shortenAddress: function(address) {
        return address.substring(0, 6) + '...' + address.substring(address.length - 4);
    },

    // 登录成功回调
    onLoginSuccess: async function() {
        console.log('钱包连接成功:', this.account);

        // 从后端同步数据到本地，防止本地数据被篡改
        console.log('登录成功后从后端同步数据到本地...');
        try {
            const syncResult = await WalletProgress.syncDataFromBackend();
            console.log('登录后数据同步结果:', syncResult ? '成功' : '失败或无数据');

            // 如果同步失败或没有数据，尝试创建/获取用户数据
            if (!syncResult && WalletProgress.useApi) {
                console.log('尝试创建或获取用户数据...');
                const result = await ApiService.createUserData(this.account);

                if (result && result.isNew) {
                    console.log('已创建新用户数据');
                } else if (result) {
                    console.log('已获取现有用户数据');
                }

                // 再次同步，确保数据一致性
                await WalletProgress.syncDataFromBackend();
            } else if (syncResult) {
                console.log('数据同步成功，无需创建新用户数据');
            } else {
                // 如果API不可用或同步失败，尝试将本地数据同步到后端
                console.log('尝试将本地数据同步到后端...');
                const syncToBackendResult = await WalletProgress.syncLocalDataToBackend();
                if (syncToBackendResult) {
                    console.log('本地数据成功同步到后端');
                } else {
                    console.log('本地数据同步到后端失败或无需同步');
                }
            }
        } catch (error) {
            console.error('登录后数据同步出错:', error);
            // 即使同步失败，也继续登录流程
        }

        // 加载用户的游戏进度
        const savedProgress = await WalletProgress.loadProgress();
        if (savedProgress) {
            console.log('加载已保存的游戏进度:', savedProgress);

            // 通知游戏用户已登录
            if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
                GEMIOLI.Application.dispatchEvent({
                    type: 'wallet_connected',
                    address: this.account,
                    progress: savedProgress
                });
            }
        } else {
            // 通知游戏用户已登录，但没有保存的进度
            if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
                GEMIOLI.Application.dispatchEvent({
                    type: 'wallet_connected',
                    address: this.account
                });
            }

            // 为新用户设置初始金币
            const coins = await WalletProgress.getCoins();
            if (coins === 0) {
                await WalletProgress.setCoins(0); // 设置初始金币为0
                console.log('为新用户设置初始金币: 0');
            }
        }

        // 更新游戏状态面板
        if (typeof GameStatusPanel !== 'undefined') {
            GameStatusPanel.updatePanel();
        }
    },

    // 登出回调
    onLogout: function() {
        console.log('钱包已断开连接');

        // 通知游戏用户已登出
        if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
            GEMIOLI.Application.dispatchEvent({
                type: 'wallet_disconnected'
            });
        }
    },

    // 获取当前账户
    getAccount: function() {
        return this.account;
    },

    // 检查是否已登录
    isConnected: function() {
        return this.account !== null;
    },

    // 启动游戏
    startGame: async function() {
        if (!this.gameStarted) {
            console.log('准备启动游戏...');

            if (this.isConnected()) {
                // 从后端同步数据到本地，防止本地数据被篡改
                console.log('从后端同步数据到本地...');
                try {
                    await WalletProgress.syncDataFromBackend();
                    console.log('数据同步完成');
                } catch (error) {
                    console.error('数据同步出错:', error);
                    // 即使同步失败，也继续游戏
                }

                // 保存游戏开始前的原始金币数量
                await WalletProgress.saveOriginalCoins();
                console.log('已保存游戏开始前的原始金币数量');
            }

            console.log('启动游戏...');
            this.gameStarted = true;

            // 通知游戏可以开始
            if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
                GEMIOLI.Application.dispatchEvent({
                    type: 'game_start',
                    wallet: this.account
                });
            }

            // 显示游戏容器
            const container = document.getElementById('container');
            if (container) {
                container.style.display = 'block';
            }

            // 更新游戏状态面板
            if (typeof GameStatusPanel !== 'undefined' && this.isConnected()) {
                console.log('游戏启动时更新状态面板');
                GameStatusPanel.updatePanel();
            }

            // 如果游戏有自己的开始函数，调用它
            if (typeof startGame === 'function') {
                startGame();
            }
        }
    },

    // 暂停游戏
    pauseGame: function() {
        if (this.gameStarted) {
            console.log('暂停游戏...');
            this.gameStarted = false;

            // 通知游戏暂停
            if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
                GEMIOLI.Application.dispatchEvent({
                    type: 'game_pause',
                    reason: 'wallet_disconnected'
                });
            }

            // 如果游戏有自己的暂停函数，调用它
            if (typeof pauseGame === 'function') {
                pauseGame();
            }
        }
    }
};
