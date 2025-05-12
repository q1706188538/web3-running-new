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

    // 检测是否是移动设备
    isMobileDevice: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    // 检测是否在MetaMask浏览器中
    isInMetaMaskBrowser: function() {
        return window.ethereum && window.ethereum.isMetaMask && /MetaMask\/[0-9\.]+/i.test(navigator.userAgent);
    },

    // 检测是否可以使用MetaMask SDK
    canUseMetaMaskSDK: function() {
        return typeof MetaMaskSDKManager !== 'undefined' && MetaMaskSDKManager.sdk !== null;
    },

    // 初始化
    init: function() {
        console.log('初始化钱包管理器...');

        // 创建UI元素
        this.createUI();

        // 创建登录屏幕
        this.createLoginScreen();

        // 检查是否需要重置连接状态
        this.checkResetNeeded();

        // 绑定按钮事件
        document.getElementById('connect-wallet').addEventListener('click', this.connectWallet.bind(this));
        document.getElementById('disconnect-wallet').addEventListener('click', this.disconnectWallet.bind(this));
        document.getElementById('login-connect-button').addEventListener('click', this.connectWallet.bind(this));

        // 添加页面可见性变化事件监听器
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // 检查是否已经连接
        this.checkConnection();
    },

    // 检查是否需要重置连接状态
    checkResetNeeded: function() {
        // 检查URL参数是否包含reset_wallet=true
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('reset_wallet') === 'true') {
            console.log('检测到reset_wallet参数，重置钱包连接状态');

            // 清除所有钱包相关的localStorage
            localStorage.removeItem('wallet_manually_disconnected');
            localStorage.removeItem('metamask_connected');
            localStorage.removeItem('metamask_account');
            localStorage.removeItem('wallet_connected');
            localStorage.removeItem('wallet_account');
            localStorage.removeItem('last_connected_account');

            // 移除URL参数
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
        }
    },

    // 处理页面可见性变化
    handleVisibilityChange: function() {
        if (!document.hidden) {
            console.log('页面变为可见，检查钱包连接状态');

            // 当页面从隐藏变为可见时，重新检查连接状态
            setTimeout(() => {
                this.refreshConnectionStatus();
            }, 1000); // 延迟1秒，确保MetaMask有时间更新状态
        }
    },

    // 刷新连接状态
    refreshConnectionStatus: async function() {
        console.log('刷新钱包连接状态');

        // 如果用户手动断开了连接，不自动重连
        if (this.manuallyDisconnected) {
            console.log('用户手动断开了连接，不自动重连');
            return;
        }

        // 获取MetaMask提供商
        const provider = this.getWalletProvider();

        if (provider) {
            try {
                // 获取当前连接的账户
                const accounts = await provider.request({ method: 'eth_accounts' });

                if (accounts.length > 0) {
                    // MetaMask已连接账户
                    if (!this.account || this.account !== accounts[0]) {
                        console.log('检测到MetaMask已连接但网站未连接，更新连接状态');
                        this.handleAccountsChanged(accounts);
                    }
                } else {
                    // MetaMask未连接账户
                    if (this.account) {
                        console.log('检测到MetaMask未连接但网站已连接，断开连接');
                        this.disconnectWallet();
                    }
                }
            } catch (error) {
                console.error('刷新连接状态时出错:', error);
            }
        }
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

        // 钱包信息区域 - 极简版，包含断开连接按钮和兑换代币按钮，没有背景
        const walletInfo = document.createElement('div');
        walletInfo.id = 'wallet-info';
        walletInfo.style.cssText = 'display: none; position: fixed; bottom: 10px; right: 10px; z-index: 1001; flex-direction: column; align-items: flex-end; gap: 10px;';

        // 断开连接按钮 - 移到右下角，没有背景
        const disconnectBtn = document.createElement('button');
        disconnectBtn.id = 'disconnect-wallet';
        disconnectBtn.className = 'wallet-button';
        disconnectBtn.textContent = '断开连接';
        disconnectBtn.style.cssText = 'background-color: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);';

        // 创建兑换代币按钮 - 放在断开连接按钮下方
        const exchangeBtn = document.createElement('button');
        exchangeBtn.id = 'exchange-token-btn';
        exchangeBtn.className = 'wallet-button';
        exchangeBtn.textContent = '兑换代币';
        exchangeBtn.style.cssText = 'background-color: #4CAF50; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); transition: all 0.2s ease;';

        // 添加悬停效果
        exchangeBtn.addEventListener('mouseover', function() {
            this.style.backgroundColor = '#45a049';
            this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.4)';
        });

        exchangeBtn.addEventListener('mouseout', function() {
            this.style.backgroundColor = '#4CAF50';
            this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        });

        // 添加点击事件
        exchangeBtn.addEventListener('click', function() {
            if (typeof TokenExchange !== 'undefined') {
                TokenExchange.show();
            } else {
                console.error('TokenExchange模块未加载');
                alert('代币兑换功能暂时不可用，请稍后重试');
            }
        });

        // 创建充值金币按钮 - 放在兑换代币按钮下方
        const rechargeBtn = document.createElement('button');
        rechargeBtn.id = 'recharge-coins-btn';
        rechargeBtn.className = 'wallet-button';
        rechargeBtn.textContent = '充值金币';
        rechargeBtn.style.cssText = 'background-color: #9b59b6; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); transition: all 0.2s ease;';

        // 添加悬停效果
        rechargeBtn.addEventListener('mouseover', function() {
            this.style.backgroundColor = '#8e44ad';
            this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.4)';
        });

        rechargeBtn.addEventListener('mouseout', function() {
            this.style.backgroundColor = '#9b59b6';
            this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        });

        // 添加点击事件
        rechargeBtn.addEventListener('click', function() {
            if (typeof TokenRecharge !== 'undefined') {
                TokenRecharge.show();
            } else {
                console.error('TokenRecharge模块未加载');
                alert('充值金币功能暂时不可用，请稍后重试');
            }
        });

        // 创建免费体验按钮 - 放在充值金币按钮下方
        const freeTrialBtn = document.createElement('button');
        freeTrialBtn.id = 'free-trial-btn';
        freeTrialBtn.className = 'wallet-button';
        freeTrialBtn.textContent = '免费体验';
        freeTrialBtn.style.cssText = 'background-color: #3498db; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); transition: all 0.2s ease;';

        // 添加悬停效果
        freeTrialBtn.addEventListener('mouseover', function() {
            this.style.backgroundColor = '#2980b9';
            this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.4)';
        });

        freeTrialBtn.addEventListener('mouseout', function() {
            this.style.backgroundColor = '#3498db';
            this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        });

        // 添加点击事件 - 在当前标签页跳转
        freeTrialBtn.addEventListener('click', function() {
            console.log('跳转到免费体验版本');
            window.location.href = 'http://taowwww.blakcat.top/';
        });

        // 组装UI - 添加断开连接按钮、兑换代币按钮、充值金币按钮和免费体验按钮
        walletInfo.appendChild(disconnectBtn);
        walletInfo.appendChild(exchangeBtn);
        walletInfo.appendChild(rechargeBtn);
        walletInfo.appendChild(freeTrialBtn);
        walletUI.appendChild(connectBtn);
        walletUI.appendChild(walletInfo);

        // 添加到页面
        document.body.appendChild(walletUI);
    },

    // 创建登录屏幕
    createLoginScreen: function() {
        console.log('创建登录屏幕...');

        // 检查是否是移动设备
        const isMobile = this.isMobileDevice();
        const isInMetaMaskBrowser = this.isInMetaMaskBrowser();

        console.log('设备检测: 移动设备 =', isMobile, '在MetaMask浏览器中 =', isInMetaMaskBrowser);

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
        metamaskIcon.title = 'MetaMask钱包';

        // 创建连接按钮
        const connectButton = document.createElement('button');
        connectButton.id = 'login-connect-button';

        // 根据设备类型设置不同的按钮文本
        if (isMobile && !isInMetaMaskBrowser) {
            connectButton.textContent = '在移动设备上连接MetaMask';
        } else {
            connectButton.textContent = '连接MetaMask钱包';
        }

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

        // 根据设备类型设置不同的提示文本
        if (isMobile && !isInMetaMaskBrowser) {
            hint.innerHTML = '在移动设备上，您需要: <br>1. 安装 <a href="https://metamask.io/download.html" target="_blank" style="color: #f5a623; text-decoration: none;">MetaMask应用</a><br>2. 在MetaMask应用内的浏览器中打开本游戏';
        } else {
            hint.innerHTML = '没有MetaMask? <a href="https://metamask.io/download.html" target="_blank" style="color: #f5a623; text-decoration: none;">点击这里安装</a>';
        }

        hint.style.cssText = 'font-size: 14px; margin-top: 20px; line-height: 1.5;';

        // 创建免费体验按钮
        const freeTrialButton = document.createElement('button');
        freeTrialButton.textContent = '免费体验版本';
        freeTrialButton.style.cssText = 'background-color: #3498db; color: white; border: none; padding: 12px 25px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 16px; margin-top: 20px; transition: background-color 0.3s;';

        // 鼠标悬停效果
        freeTrialButton.onmouseover = function() {
            this.style.backgroundColor = '#2980b9';
        };
        freeTrialButton.onmouseout = function() {
            this.style.backgroundColor = '#3498db';
        };

        // 添加点击事件 - 在当前标签页跳转
        freeTrialButton.onclick = function() {
            console.log('从登录屏幕跳转到免费体验版本');
            window.location.href = 'http://taowwww.blakcat.top/';
        };

        // 组装登录屏幕
        loginScreen.appendChild(title);
        loginScreen.appendChild(description);
        loginScreen.appendChild(metamaskIcon);
        loginScreen.appendChild(connectButton);
        loginScreen.appendChild(freeTrialButton);
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

        // 检查可用的钱包提供商
        const provider = this.getWalletProvider();

        if (provider) {
            try {
                // 保存提供商引用，避免后续被其他钱包插件覆盖
                this.provider = provider;

                // 初始化Web3
                this.web3 = new Web3(this.provider);
                console.log('Web3初始化成功，使用提供商:', this.provider === window.ethereum ? 'window.ethereum' : '其他提供商');

                // 获取已连接的账户
                const accounts = await this.provider.request({ method: 'eth_accounts' });

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

                // 先移除可能存在的事件监听器，避免重复
                this.removeEventListeners();

                // 添加事件监听器
                this.addEventListeners();
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
            console.log('未检测到MetaMask钱包插件');

            // 未检测到钱包插件，如果需要强制登录，显示登录屏幕
            if (this.loginRequired) {
                const loginScreen = document.getElementById('wallet-login-screen');
                if (loginScreen) {
                    loginScreen.style.display = 'flex';
                }
            }
        }
    },

    // 添加事件监听器
    addEventListeners: function() {
        if (!this.provider) return;

        console.log('添加MetaMask事件监听器');

        // 使用命名函数，以便后续可以移除
        this._handleAccountsChanged = this.handleAccountsChanged.bind(this);
        this._handleChainChanged = this.handleChainChanged.bind(this);

        // 监听账户变化
        this.provider.on('accountsChanged', this._handleAccountsChanged);
        // 监听链变化
        this.provider.on('chainChanged', this._handleChainChanged);

        // 保存监听器状态
        this.listenersAdded = true;
    },

    // 移除事件监听器
    removeEventListeners: function() {
        if (!this.provider || !this.listenersAdded) return;

        console.log('移除MetaMask事件监听器');

        try {
            // 移除特定事件监听器
            if (this._handleAccountsChanged) {
                this.provider.removeListener('accountsChanged', this._handleAccountsChanged);
            }

            if (this._handleChainChanged) {
                this.provider.removeListener('chainChanged', this._handleChainChanged);
            }
        } catch (e) {
            console.log('移除事件监听器时出错:', e);

            // 如果removeListener方法失败，尝试使用off方法
            try {
                if (typeof this.provider.off === 'function') {
                    this.provider.off('accountsChanged', this._handleAccountsChanged);
                    this.provider.off('chainChanged', this._handleChainChanged);
                }
            } catch (offError) {
                console.log('使用off方法移除事件监听器时出错:', offError);
            }
        }

        // 重置监听器状态
        this.listenersAdded = false;
    },

    // 获取钱包提供商 - 只检测MetaMask
    getWalletProvider: function() {
        console.log('检测MetaMask钱包提供商...');

        // 检查是否是移动设备
        if (this.isMobileDevice()) {
            console.log('检测到移动设备');

            // 检查是否在MetaMask浏览器中
            if (this.isInMetaMaskBrowser()) {
                console.log('检测到在MetaMask移动浏览器中');

                // 在MetaMask移动浏览器中，ethereum对象应该可用
                if (window.ethereum && window.ethereum.isMetaMask) {
                    console.log('检测到MetaMask移动浏览器的ethereum对象');
                    return window.ethereum;
                }
            } else {
                console.log('不在MetaMask移动浏览器中，需要使用MetaMask应用的内置浏览器');
            }
        }

        // 检查是否有ethereum提供商
        if (window.ethereum) {
            // 检查是否是MetaMask
            if (window.ethereum.isMetaMask) {
                console.log('检测到 MetaMask 钱包');
                return window.ethereum;
            }

            // 如果没有MetaMask标识，但存在ethereum对象，检查是否可能是MetaMask
            try {
                // 尝试获取提供商名称
                const providerName = window.ethereum.constructor.name || '';
                if (providerName.toLowerCase().includes('metamask')) {
                    console.log('检测到可能是 MetaMask 的提供商:', providerName);
                    return window.ethereum;
                }
            } catch (e) {
                console.log('检查提供商名称时出错:', e);
            }

            console.log('ethereum对象存在，但不是MetaMask，尝试使用它');
            return window.ethereum;
        }

        // 检查旧版MetaMask
        if (window.web3 && window.web3.currentProvider && window.web3.currentProvider.isMetaMask) {
            console.log('检测到旧版 MetaMask 提供商');
            return window.web3.currentProvider;
        }

        console.log('未检测到 MetaMask 钱包提供商');
        return null;
    },

    // 连接钱包
    connectWallet: async function() {
        console.log('尝试连接钱包...');

        // 检查是否是移动设备
        if (this.isMobileDevice()) {
            console.log('检测到移动设备');

            // 检查是否可以使用MetaMask直连
            if (typeof this.canUseMetaMaskDirect === 'function' && this.canUseMetaMaskDirect()) {
                console.log('检测到可以使用MetaMask直连，尝试直接连接');
                return this.connectWithMetaMaskDirect();
            }

            // 检查是否可以使用MetaMask SDK
            if (this.canUseMetaMaskSDK()) {
                console.log('检测到可以使用MetaMask SDK，尝试直接连接');
                return this.connectWithMetaMaskSDK();
            }

            console.log('显示移动设备连接选项');
            this.showMobileConnectGuide();
            return;
        }

        // 获取MetaMask提供商
        const provider = this.getWalletProvider();

        if (provider) {
            try {
                // 保存提供商引用，避免后续被其他钱包插件覆盖
                this.provider = provider;

                // 初始化Web3
                this.web3 = new Web3(this.provider);
                console.log('Web3初始化成功');

                // 清除断开连接标志
                this.manuallyDisconnected = false;
                localStorage.removeItem('wallet_manually_disconnected');
                console.log('已清除断开连接标志');

                // 先移除可能存在的事件监听器，避免重复
                this.removeEventListeners();

                // 尝试获取当前账户
                try {
                    const currentAccounts = await this.provider.request({ method: 'eth_accounts' });
                    console.log('当前已连接账户:', currentAccounts);
                } catch (e) {
                    console.log('检查当前账户时出错:', e);
                }

                // 请求连接账户
                console.log('请求连接MetaMask账户...');
                let accounts = [];

                // 尝试使用wallet_requestPermissions API强制显示MetaMask
                if (this.provider.isMetaMask) {
                    try {
                        await this.provider.request({
                            method: 'wallet_requestPermissions',
                            params: [{ eth_accounts: {} }]
                        });
                        console.log('成功请求MetaMask权限');
                    } catch (permError) {
                        console.log('请求MetaMask权限失败:', permError);
                        // 如果用户拒绝了权限请求，我们继续尝试eth_requestAccounts
                    }
                }

                try {
                    // 获取账户
                    accounts = await this.provider.request({ method: 'eth_requestAccounts' });
                    console.log('获取到MetaMask账户:', accounts);
                } catch (accountsError) {
                    console.error('获取MetaMask账户失败:', accountsError);

                    // 如果是用户拒绝错误，直接抛出
                    if (accountsError.code === 4001) { // 用户拒绝
                        throw new Error('用户拒绝了连接请求');
                    }

                    // 尝试使用备用方法
                    try {
                        accounts = await this.provider.enable();
                        console.log('使用备用方法获取到MetaMask账户:', accounts);
                    } catch (enableError) {
                        console.error('备用方法获取MetaMask账户也失败:', enableError);
                        throw new Error('无法连接到MetaMask，请确保MetaMask已安装并解锁');
                    }
                }

                // 获取链ID
                try {
                    this.chainId = await this.provider.request({ method: 'eth_chainId' });
                    console.log('已连接到链ID:', this.chainId);
                } catch (chainError) {
                    console.error('获取链ID失败:', chainError);
                    // 不阻止继续，使用默认链ID
                    this.chainId = '0x1'; // 默认以太坊主网
                }

                // 添加事件监听器
                this.addEventListeners();

                // 处理账户变化（这会触发数据同步和登录成功事件）
                if (accounts.length > 0) {
                    await this.handleAccountsChanged(accounts);

                    // 保存连接状态到localStorage
                    localStorage.setItem('metamask_connected', 'true');
                    localStorage.setItem('metamask_account', accounts[0]);
                } else {
                    throw new Error('未能获取MetaMask账户');
                }

                // 确保游戏容器可见
                const container = document.getElementById('container');
                if (container && container.style.display === 'none') {
                    console.log('连接MetaMask后显示游戏容器');
                    container.style.display = 'block';
                }

                // 确保所有canvas元素可见
                document.querySelectorAll('canvas').forEach(function(canvas) {
                    canvas.style.display = 'block';
                    console.log('Canvas元素已设置为可见:', canvas);
                });

                // 强制刷新Canvas
                setTimeout(function() {
                    document.querySelectorAll('canvas').forEach(function(canvas) {
                        // 尝试触发重绘
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.fillStyle = '#000000';
                            ctx.fillRect(0, 0, 1, 1);
                            console.log('Canvas已重绘');
                        }
                    });
                }, 500);

                return true;
            } catch (error) {
                console.error('连接MetaMask失败:', error);
                alert('连接MetaMask失败: ' + (error.message || '未知错误'));
                return false;
            }
        } else {
            alert('未检测到MetaMask钱包插件，请安装MetaMask');
            window.open('https://metamask.io/download.html', '_blank');
            return false;
        }
    },

    // 断开连接
    disconnectWallet: async function() {
        console.log('断开钱包连接');

        // 检查是否使用WalletConnect
        const isWalletConnect = localStorage.getItem('wallet_provider') === 'walletconnect';

        // 尝试断开连接
        if (this.web3 && this.provider) {
            try {
                // 移除事件监听器
                this.removeEventListeners();

                if (isWalletConnect) {
                    console.log('尝试断开WalletConnect连接...');

                    // WalletConnect支持直接断开连接
                    if (typeof this.provider.disconnect === 'function') {
                        await this.provider.disconnect();
                        console.log('WalletConnect已断开连接');
                    }
                } else {
                    console.log('尝试断开MetaMask连接...');

                    // 注意：MetaMask不支持直接断开连接的API，但我们可以尝试清除一些状态

                    // 尝试获取当前账户，不会弹出MetaMask
                    try {
                        const accounts = await this.provider.request({ method: 'eth_accounts' });
                        console.log('断开前的MetaMask账户:', accounts);
                    } catch (e) {
                        console.log('获取断开前MetaMask账户时出错:', e);
                    }
                }
            } catch (error) {
                console.log('尝试断开钱包连接时出错:', error);
            }
        }

        // 清除账户和Web3实例
        this.account = null;
        this.web3 = null;

        // 清除提供商引用
        this.provider = null;

        // 更新UI
        document.getElementById('wallet-info').style.display = 'none';
        document.getElementById('connect-wallet').style.display = 'block';

        // 设置断开连接标志
        this.manuallyDisconnected = true;

        // 将断开连接状态保存到localStorage
        localStorage.setItem('wallet_manually_disconnected', 'true');

        // 清除MetaMask相关缓存
        localStorage.removeItem('metamask_connected');
        localStorage.removeItem('metamask_account');
        localStorage.removeItem('wallet_connected');
        localStorage.removeItem('wallet_account');

        console.log('已设置断开连接标志，刷新页面后不会自动重连');

        // 提示用户在MetaMask中断开连接
        this.showDisconnectInstructions();

        // 调用断开连接后的处理函数
        await this.disconnectWalletHandler();
    },

    // 显示移动设备连接选项
    showMobileConnectGuide: function() {
        // 创建提示框
        const guideBox = document.createElement('div');
        guideBox.id = 'mobile-wallet-guide';
        guideBox.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.9); color: white; padding: 20px; border-radius: 10px; z-index: 10000; max-width: 90%; width: 350px; text-align: center; box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);';

        // 创建标题
        const title = document.createElement('h3');
        title.textContent = '在移动设备上连接钱包';
        title.style.cssText = 'margin-top: 0; color: #f5a623; font-size: 18px;';

        // 创建说明
        const description = document.createElement('p');
        description.textContent = '请选择连接方式:';
        description.style.cssText = 'margin-bottom: 20px; line-height: 1.5;';

        // 检查是否可以使用MetaMask SDK
        const canUseSDK = this.canUseMetaMaskSDK();

        // 如果可以使用MetaMask SDK，添加直接连接按钮
        if (canUseSDK) {
            // 创建MetaMask SDK按钮
            const sdkButton = document.createElement('button');
            sdkButton.id = 'metamask-sdk-button';
            sdkButton.innerHTML = '<img src="https://metamask.io/images/metamask-fox.svg" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;">直接连接MetaMask';
            sdkButton.style.cssText = 'background-color: #f5a623; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; margin-bottom: 15px; display: flex; align-items: center; justify-content: center;';

            // 添加MetaMask SDK按钮事件
            sdkButton.onclick = () => {
                document.body.removeChild(guideBox);
                this.connectWithMetaMaskSDK();
            };

            // 添加到提示框
            guideBox.appendChild(sdkButton);
        }

        // 创建WalletConnect按钮
        const walletConnectButton = document.createElement('button');
        walletConnectButton.id = 'wallet-connect-button';
        walletConnectButton.innerHTML = '<img src="https://docs.walletconnect.com/img/walletconnect-logo.svg" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;">使用WalletConnect连接';
        walletConnectButton.style.cssText = 'background-color: #3b99fc; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; margin-bottom: 15px; display: flex; align-items: center; justify-content: center;';

        // 添加WalletConnect按钮事件
        walletConnectButton.onclick = () => {
            document.body.removeChild(guideBox);
            this.connectWithWalletConnect();
        };

        // 创建MetaMask按钮
        const metamaskButton = document.createElement('button');
        metamaskButton.id = 'metamask-button';
        metamaskButton.innerHTML = '<img src="https://metamask.io/images/metamask-fox.svg" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;">在MetaMask中连接';
        metamaskButton.style.cssText = 'background-color: #f5a623; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; margin-bottom: 15px; display: flex; align-items: center; justify-content: center;';

        // 添加MetaMask按钮事件 - 显示MetaMask连接指南
        metamaskButton.onclick = () => {
            document.body.removeChild(guideBox);
            this.showMetaMaskMobileGuide();
        };

        // 创建免费体验按钮
        const freeTrialButton = document.createElement('a');
        freeTrialButton.href = 'http://taowwww.blakcat.top/';
        freeTrialButton.textContent = '免费体验版本';
        freeTrialButton.style.cssText = 'background-color: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; text-decoration: none; display: block; margin-bottom: 15px; text-align: center;';

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = 'background-color: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; display: block; width: 100%;';

        // 添加关闭按钮事件
        closeButton.onclick = function() {
            document.body.removeChild(guideBox);
        };

        // 组装提示框
        guideBox.appendChild(title);
        guideBox.appendChild(description);

        // 如果没有添加SDK按钮，添加其他按钮
        if (!canUseSDK) {
            guideBox.appendChild(walletConnectButton);
        }

        guideBox.appendChild(walletConnectButton);
        guideBox.appendChild(metamaskButton);
        guideBox.appendChild(freeTrialButton);
        guideBox.appendChild(closeButton);

        // 添加到页面
        document.body.appendChild(guideBox);
    },

    // 显示MetaMask移动版连接指南
    showMetaMaskMobileGuide: function() {
        // 创建提示框
        const guideBox = document.createElement('div');
        guideBox.id = 'metamask-mobile-guide';
        guideBox.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.9); color: white; padding: 20px; border-radius: 10px; z-index: 10000; max-width: 90%; width: 350px; text-align: center; box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);';

        // 创建标题
        const title = document.createElement('h3');
        title.textContent = '在MetaMask中连接';
        title.style.cssText = 'margin-top: 0; color: #f5a623; font-size: 18px;';

        // 创建图片
        const image = document.createElement('div');
        image.style.cssText = 'width: 100px; height: 100px; background-image: url(https://metamask.io/images/metamask-fox.svg); background-size: contain; background-repeat: no-repeat; background-position: center; margin: 0 auto 20px auto;';

        // 创建说明
        const description = document.createElement('div');
        description.style.cssText = 'margin-bottom: 20px; line-height: 1.5; text-align: left;';

        // 添加步骤说明
        const steps = document.createElement('ol');
        steps.style.cssText = 'padding-left: 20px; margin-top: 10px;';

        const step1 = document.createElement('li');
        step1.innerHTML = '打开 <strong>MetaMask应用</strong>';
        step1.style.cssText = 'margin-bottom: 10px;';

        const step2 = document.createElement('li');
        step2.innerHTML = '点击底部的<strong>浏览器图标</strong>';
        step2.style.cssText = 'margin-bottom: 10px;';

        const step3 = document.createElement('li');
        step3.innerHTML = '输入网址: <strong>' + window.location.href + '</strong>';
        step3.style.cssText = 'margin-bottom: 10px;';

        const step4 = document.createElement('li');
        step4.innerHTML = '在MetaMask浏览器中打开的游戏页面上点击<strong>连接钱包</strong>';
        step4.style.cssText = 'margin-bottom: 10px;';

        steps.appendChild(step1);
        steps.appendChild(step2);
        steps.appendChild(step3);
        steps.appendChild(step4);

        description.appendChild(document.createTextNode('在移动设备上，您需要在MetaMask应用内的浏览器中访问游戏:'));
        description.appendChild(steps);

        // 创建复制按钮
        const copyButton = document.createElement('button');
        copyButton.textContent = '复制游戏网址';
        copyButton.style.cssText = 'background-color: #f5a623; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; margin-bottom: 15px;';

        // 添加复制按钮事件
        copyButton.onclick = async () => {
            try {
                // 使用现代Clipboard API
                await navigator.clipboard.writeText(window.location.href);

                // 更改按钮文本，表示已复制
                copyButton.textContent = '✓ 网址已复制';
                copyButton.style.backgroundColor = '#27ae60';

                // 2秒后恢复按钮文本
                setTimeout(() => {
                    copyButton.textContent = '复制游戏网址';
                    copyButton.style.backgroundColor = '#f5a623';
                }, 2000);
            } catch (err) {
                // 如果Clipboard API不可用，使用传统方法
                try {
                    const tempInput = document.createElement('input');
                    tempInput.value = window.location.href;
                    tempInput.style.position = 'absolute';
                    tempInput.style.left = '-9999px';
                    document.body.appendChild(tempInput);
                    tempInput.select();

                    // 尝试使用已弃用的方法
                    const success = document.execCommand('copy');
                    document.body.removeChild(tempInput);

                    if (success) {
                        // 更改按钮文本，表示已复制
                        copyButton.textContent = '✓ 网址已复制';
                        copyButton.style.backgroundColor = '#27ae60';
                    } else {
                        copyButton.textContent = '复制失败';
                        copyButton.style.backgroundColor = '#e74c3c';
                    }

                    // 2秒后恢复按钮文本
                    setTimeout(() => {
                        copyButton.textContent = '复制游戏网址';
                        copyButton.style.backgroundColor = '#f5a623';
                    }, 2000);
                } catch (e) {
                    // 如果都失败了，提示用户手动复制
                    alert('无法自动复制。请手动复制网址: ' + window.location.href);
                }
            }
        };

        // 创建下载按钮
        const downloadButton = document.createElement('a');
        downloadButton.href = 'https://metamask.io/download/';
        downloadButton.target = '_blank';
        downloadButton.textContent = '下载MetaMask';
        downloadButton.style.cssText = 'background-color: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; text-decoration: none; display: block; margin-bottom: 15px; text-align: center;';

        // 创建提示文本
        const tipText = document.createElement('p');
        tipText.innerHTML = '<strong>提示:</strong> 移动设备上只能在MetaMask应用内的浏览器中连接钱包。';
        tipText.style.cssText = 'font-size: 12px; color: #f5a623; margin-bottom: 15px; text-align: left; background-color: rgba(245, 166, 35, 0.1); padding: 10px; border-radius: 5px;';

        // 创建返回按钮
        const backButton = document.createElement('button');
        backButton.textContent = '返回';
        backButton.style.cssText = 'background-color: #7f8c8d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; display: block; width: 100%; margin-bottom: 10px;';

        // 添加返回按钮事件
        backButton.onclick = () => {
            document.body.removeChild(guideBox);
            this.showMobileConnectGuide();
        };

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = 'background-color: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; display: block; width: 100%;';

        // 添加关闭按钮事件
        closeButton.onclick = function() {
            document.body.removeChild(guideBox);
        };

        // 组装提示框
        guideBox.appendChild(title);
        guideBox.appendChild(image);
        guideBox.appendChild(description);
        guideBox.appendChild(copyButton);
        guideBox.appendChild(tipText);
        guideBox.appendChild(downloadButton);
        guideBox.appendChild(backButton);
        guideBox.appendChild(closeButton);

        // 添加到页面
        document.body.appendChild(guideBox);
    },

    // 使用MetaMask SDK连接
    connectWithMetaMaskSDK: async function() {
        try {
            console.log('尝试使用MetaMask SDK连接...');

            // 检查SDK是否可用
            if (!this.canUseMetaMaskSDK()) {
                throw new Error('MetaMask SDK未初始化或不可用');
            }

            // 创建加载中提示
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'metamask-sdk-loading';
            loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.8); color: white; padding: 20px; border-radius: 10px; z-index: 10000; text-align: center;';
            loadingDiv.innerHTML = '<div style="margin-bottom: 15px;">正在连接MetaMask...</div><div class="spinner" style="border: 4px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top: 4px solid white; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto;"></div><div style="margin-top: 15px; font-size: 12px;">请在MetaMask应用中确认连接请求</div>';

            // 添加旋转动画样式
            if (!document.getElementById('spinner-style')) {
                const style = document.createElement('style');
                style.id = 'spinner-style';
                style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
                document.head.appendChild(style);
            }

            document.body.appendChild(loadingDiv);

            // 设置超时，防止加载提示一直显示
            const loadingTimeout = setTimeout(function() {
                // 检查加载提示是否仍然存在
                if (document.body.contains(loadingDiv)) {
                    // 更新加载提示内容，提示用户可能出现问题
                    loadingDiv.querySelector('div:first-child').textContent = '连接似乎有些问题...';
                    loadingDiv.querySelector('div:nth-child(3)').textContent = '请检查MetaMask应用是否已打开，或点击下方按钮取消';

                    // 添加取消按钮
                    const cancelButton = document.createElement('button');
                    cancelButton.textContent = '取消连接';
                    cancelButton.style.cssText = 'margin-top: 15px; background-color: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer;';
                    cancelButton.onclick = function() {
                        if (document.body.contains(loadingDiv)) {
                            document.body.removeChild(loadingDiv);
                        }
                    };
                    loadingDiv.appendChild(cancelButton);
                }
            }, 10000); // 10秒后更新提示

            try {
                // 使用MetaMask SDK连接
                const success = await MetaMaskSDKManager.connect();

                // 清除超时
                clearTimeout(loadingTimeout);

                if (success) {
                    console.log('MetaMask SDK连接成功');

                    // 获取账户和链ID
                    const account = MetaMaskSDKManager.getAccount();
                    const chainId = MetaMaskSDKManager.getChainId();

                    // 更新钱包管理器状态
                    this.account = account;
                    this.chainId = chainId;
                    this.web3 = new Web3(MetaMaskSDKManager.ethereum);
                    this.provider = MetaMaskSDKManager.ethereum;

                    // 清除断开连接标志
                    this.manuallyDisconnected = false;
                    localStorage.removeItem('wallet_manually_disconnected');

                    // 保存连接状态
                    localStorage.setItem('wallet_connected', 'true');
                    localStorage.setItem('wallet_account', account);
                    localStorage.setItem('wallet_provider', 'metamask_sdk');

                    // 确保游戏容器可见
                    const container = document.getElementById('container');
                    if (container && container.style.display === 'none') {
                        console.log('连接MetaMask SDK后显示游戏容器');
                        container.style.display = 'block';
                    }

                    // 确保所有canvas元素可见
                    document.querySelectorAll('canvas').forEach(function(canvas) {
                        canvas.style.display = 'block';
                        console.log('Canvas元素已设置为可见:', canvas);
                    });

                    // 移除加载提示
                    if (document.body.contains(loadingDiv)) {
                        document.body.removeChild(loadingDiv);
                    }

                    return true;
                } else {
                    throw new Error('MetaMask SDK连接失败');
                }
            } catch (error) {
                // 清除超时
                clearTimeout(loadingTimeout);

                // 移除加载提示
                if (document.body.contains(loadingDiv)) {
                    document.body.removeChild(loadingDiv);
                }

                throw error;
            }
        } catch (error) {
            console.error('连接MetaMask SDK失败:', error);
            alert('连接MetaMask失败: ' + (error.message || '未知错误') + '\n\n请确保已安装MetaMask应用，并允许连接请求。');
            return false;
        }
    },

    // 使用imToken钱包连接
    connectWithImToken: async function() {
        try {
            console.log('尝试使用imToken钱包连接...');

            // 检查ImTokenConnector是否可用
            if (typeof ImTokenConnector === 'undefined') {
                throw new Error('ImTokenConnector未定义，请确保已引入相关脚本');
            }

            // 使用ImTokenConnector连接
            const success = await ImTokenConnector.connect();

            if (success) {
                console.log('imToken连接流程启动成功');
                return true;
            } else {
                throw new Error('imToken连接流程启动失败');
            }
        } catch (error) {
            console.error('连接imToken钱包失败:', error);
            alert('连接imToken钱包失败: ' + (error.message || '未知错误') + '\n\n请确保已安装imToken应用，或尝试使用其他连接方式。');
            return false;
        }
    },

    // 使用简化版WalletConnect连接
    connectWithSimpleWalletConnect: async function() {
        try {
            console.log('尝试使用简化版WalletConnect连接...');

            // 检查SimpleWalletConnect是否可用
            if (typeof SimpleWalletConnect === 'undefined') {
                throw new Error('SimpleWalletConnect未定义，请确保已引入相关脚本');
            }

            // 使用SimpleWalletConnect连接
            const success = await SimpleWalletConnect.connect();

            if (success) {
                console.log('SimpleWalletConnect连接成功');
                return true;
            } else {
                throw new Error('SimpleWalletConnect连接失败');
            }
        } catch (error) {
            console.error('连接SimpleWalletConnect失败:', error);
            alert('连接WalletConnect失败: ' + (error.message || '未知错误') + '\n\n请确保已安装WalletConnect相关依赖，或尝试刷新页面后重试。');
            return false;
        }
    },

    // 处理WalletConnect连接成功
    handleWalletConnectSuccess: function(provider, account, chainId) {
        console.log('处理WalletConnect连接成功:', account, chainId);

        // 设置提供商和Web3
        this.provider = provider;
        this.web3 = new Web3(provider);

        // 设置账户和链ID
        this.account = account;
        this.chainId = chainId;

        // 清除断开连接标志
        this.manuallyDisconnected = false;
        localStorage.removeItem('wallet_manually_disconnected');

        // 保存连接状态
        localStorage.setItem('wallet_connected', 'true');
        localStorage.setItem('wallet_account', account);
        localStorage.setItem('wallet_provider', 'walletconnect');

        // 确保游戏容器可见
        const container = document.getElementById('container');
        if (container && container.style.display === 'none') {
            console.log('连接WalletConnect后显示游戏容器');
            container.style.display = 'block';
        }

        // 确保所有canvas元素可见
        document.querySelectorAll('canvas').forEach(function(canvas) {
            canvas.style.display = 'block';
            canvas.style.visibility = 'visible';
            canvas.style.opacity = '1';
            console.log('Canvas元素已设置为可见:', canvas);
        });

        // 强制刷新Canvas
        setTimeout(function() {
            document.querySelectorAll('canvas').forEach(function(canvas) {
                // 尝试触发重绘
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, 1, 1);
                    console.log('Canvas已重绘');
                }
            });
        }, 500);

        // 尝试修复移动设备黑屏问题
        if (typeof MobileScreenFix !== 'undefined') {
            setTimeout(function() {
                MobileScreenFix.checkAndFixBlackScreen();
            }, 1000);
        }

        // 启动加载页面监控
        if (typeof LoadingMonitor !== 'undefined') {
            setTimeout(function() {
                console.log('启动加载页面监控...');
                LoadingMonitor.startMonitoring();
            }, 1500);
        }

        return true;
    },

    // 处理imToken连接成功
    handleImTokenSuccess: function(provider, account, chainId) {
        console.log('处理imToken连接成功:', account, chainId);

        // 设置提供商和Web3
        this.provider = provider;
        this.web3 = new Web3(provider);

        // 设置账户和链ID
        this.account = account;
        this.chainId = chainId;

        // 清除断开连接标志
        this.manuallyDisconnected = false;
        localStorage.removeItem('wallet_manually_disconnected');

        // 保存连接状态
        localStorage.setItem('wallet_connected', 'true');
        localStorage.setItem('wallet_account', account);
        localStorage.setItem('wallet_provider', 'imtoken');

        // 确保游戏容器可见
        const container = document.getElementById('container');
        if (container) {
            console.log('连接imToken后显示游戏容器');
            container.style.display = 'block';
            container.style.visibility = 'visible';
            container.style.opacity = '1';
            container.style.zIndex = '1';


        }

        // 确保所有canvas元素可见
        document.querySelectorAll('canvas').forEach(function(canvas) {
            canvas.style.display = 'block';
            canvas.style.visibility = 'visible';
            canvas.style.opacity = '1';




            console.log('Canvas元素已设置为可见:', canvas);
        });

        // 强制刷新Canvas
        setTimeout(function() {
            document.querySelectorAll('canvas').forEach(function(canvas) {
                // 尝试触发重绘
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, 1, 1);
                    console.log('Canvas已重绘');
                }
            });
        }, 500);





        return true;
    },



    // 使用WalletConnect连接
    connectWithWalletConnect: async function() {
        try {
            console.log('尝试使用WalletConnect连接...');

            // 创建加载中提示
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'wallet-connect-loading';
            loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.8); color: white; padding: 20px; border-radius: 10px; z-index: 10000; text-align: center;';
            loadingDiv.innerHTML = '<div style="margin-bottom: 15px;">正在加载WalletConnect...</div><div class="spinner" style="border: 4px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top: 4px solid white; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto;"></div><div style="margin-top: 15px; font-size: 12px;">如果长时间未响应，请点击下方按钮取消</div><button id="show-qr-code-button" style="margin-top: 10px; margin-right: 5px; background-color: #3b99fc; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 14px;">直接显示二维码</button><button id="cancel-wallet-connect" style="margin-top: 10px; background-color: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 14px;">取消连接</button>';

            // 添加旋转动画样式
            if (!document.getElementById('spinner-style')) {
                const style = document.createElement('style');
                style.id = 'spinner-style';
                style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
                document.head.appendChild(style);
            }

            document.body.appendChild(loadingDiv);

            // 添加直接显示二维码按钮事件
            document.getElementById('show-qr-code-button').addEventListener('click', async () => {
                console.log('用户点击了直接显示二维码按钮');

                try {
                    // 创建WalletConnect提供商
                    console.log('创建WalletConnect提供商...');

                    // 检查全局变量
                    let provider;
                    if (typeof window.WalletConnectProvider !== 'undefined') {
                        console.log('使用全局WalletConnectProvider变量');

                        // 检查是否需要使用default属性
                        let ProviderClass = window.WalletConnectProvider;
                        if (ProviderClass.default) {
                            ProviderClass = ProviderClass.default;
                            console.log('使用WalletConnectProvider.default');
                        }

                        // 创建提供商
                        provider = new ProviderClass({
                            rpc: {
                                1: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // 以太坊主网
                                56: 'https://bsc-dataseed.binance.org/', // BSC主网
                                97: 'https://data-seed-prebsc-1-s1.binance.org:8545/' // BSC测试网
                            },
                            bridge: 'https://bridge.walletconnect.org',
                            qrcodeModal: window.WalletConnectQRCodeModal
                        });

                        // 移除加载提示
                        if (document.body.contains(loadingDiv)) {
                            document.body.removeChild(loadingDiv);
                        }

                        // 创建连接器
                        if (provider._walletConnector) {
                            // 获取URI
                            const uri = provider._walletConnector.uri;
                            if (uri) {
                                console.log('获取到URI:', uri);
                                // 显示自定义二维码
                                this.showCustomQRCode(uri);
                            } else {
                                console.error('无法获取URI');
                                alert('无法获取连接URI，请尝试其他连接方式');
                            }
                        } else {
                            console.error('无法获取WalletConnector');
                            alert('无法初始化WalletConnect，请尝试其他连接方式');
                        }
                    } else {
                        console.error('WalletConnectProvider未定义');
                        alert('WalletConnect库未加载，请刷新页面重试');
                    }
                } catch (error) {
                    console.error('显示二维码时出错:', error);
                    alert('显示二维码时出错: ' + (error.message || '未知错误'));
                }
            });

            // 添加取消按钮事件
            document.getElementById('cancel-wallet-connect').addEventListener('click', () => {
                // 移除加载提示
                if (document.body.contains(loadingDiv)) {
                    document.body.removeChild(loadingDiv);
                }

                // 抛出用户取消错误
                throw new Error('用户取消了连接');
            });

            // 设置超时，防止加载提示一直显示
            const loadingTimeout = setTimeout(() => {
                // 检查加载提示是否仍然存在
                if (document.body.contains(loadingDiv)) {
                    // 更新加载提示内容，提示用户可能出现问题
                    loadingDiv.querySelector('div:first-child').textContent = '连接似乎有些问题...';
                    loadingDiv.querySelector('div:nth-child(3)').textContent = '请检查您的网络连接，或点击下方按钮取消';
                }
            }, 10000); // 10秒后更新提示

            try {
                // 检查是否已经加载了WalletConnect库
                let WalletConnectProvider, QRCodeModal;

                // 如果全局变量不存在，动态加载库
                if (typeof window.WalletConnectProvider === 'undefined' || typeof window.WalletConnectQRCodeModal === 'undefined') {
                    console.log('WalletConnect库未加载，开始动态加载...');

                    // 动态加载WalletConnect脚本，添加超时处理
                    await new Promise((resolve, reject) => {
                        // 设置超时处理，防止无限等待
                        const timeout = setTimeout(() => {
                            console.error('加载WalletConnect库超时');
                            reject(new Error('加载WalletConnect库超时，请检查网络连接后重试'));
                        }, 15000); // 15秒超时

                        // 加载WalletConnect Provider
                        const wcScript = document.createElement('script');
                        wcScript.src = 'https://unpkg.com/@walletconnect/web3-provider@1.7.8/dist/umd/index.min.js';
                        wcScript.onload = () => {
                            console.log('WalletConnect Provider 加载成功');

                            // 加载QR Code Modal
                            const qrScript = document.createElement('script');
                            qrScript.src = 'https://unpkg.com/@walletconnect/qrcode-modal@1.7.8/dist/umd/index.min.js';
                            qrScript.onload = () => {
                                console.log('WalletConnect QR Code Modal 加载成功');
                                clearTimeout(timeout); // 清除超时
                                resolve();
                            };
                            qrScript.onerror = (error) => {
                                clearTimeout(timeout); // 清除超时
                                console.error('加载WalletConnect QR Code Modal失败:', error);
                                reject(new Error('加载WalletConnect QR Code Modal失败，请检查网络连接后重试'));
                            };
                            document.head.appendChild(qrScript);
                        };
                        wcScript.onerror = (error) => {
                            clearTimeout(timeout); // 清除超时
                            console.error('加载WalletConnect Provider失败:', error);
                            reject(new Error('加载WalletConnect Provider失败，请检查网络连接后重试'));
                        };
                        document.head.appendChild(wcScript);
                    });

                    console.log('WalletConnect库加载完成');

                    // 检查库是否已正确加载到全局变量
                    if (typeof window.WalletConnectProvider !== 'undefined') {
                        WalletConnectProvider = window.WalletConnectProvider;
                        console.log('已找到全局WalletConnectProvider变量');
                    } else if (typeof WalletConnectProvider !== 'undefined') {
                        console.log('已找到局部WalletConnectProvider变量');
                    } else {
                        throw new Error('WalletConnectProvider库加载失败');
                    }

                    if (typeof window.WalletConnectQRCodeModal !== 'undefined') {
                        QRCodeModal = window.WalletConnectQRCodeModal;
                        console.log('已找到全局WalletConnectQRCodeModal变量');
                    } else if (typeof QRCodeModal !== 'undefined') {
                        console.log('已找到局部QRCodeModal变量');
                    } else {
                        console.warn('QRCodeModal库可能未正确加载，但将继续尝试连接');
                    }
                } else {
                    console.log('WalletConnect库已加载');
                    WalletConnectProvider = window.WalletConnectProvider;
                    QRCodeModal = window.WalletConnectQRCodeModal;
                }

                // 如果库仍未加载，尝试使用npm安装的库
                if (!WalletConnectProvider) {
                    console.log('尝试使用npm安装的WalletConnect库...');

                    // 动态导入npm安装的库
                    try {
                        const WalletConnectProviderModule = await import('@walletconnect/web3-provider');
                        WalletConnectProvider = WalletConnectProviderModule.default;
                        console.log('成功导入npm安装的WalletConnectProvider');

                        const QRCodeModalModule = await import('@walletconnect/qrcode-modal');
                        QRCodeModal = QRCodeModalModule.default;
                        console.log('成功导入npm安装的QRCodeModal');
                    } catch (importError) {
                        console.error('导入npm安装的WalletConnect库失败:', importError);
                        throw new Error('无法加载WalletConnect库，请确保已安装相关依赖');
                    }
                }

                // 创建WalletConnect提供商
                console.log('创建WalletConnect提供商...');

                // 检查全局变量
                let provider;
                try {
                    if (typeof window.WalletConnectProvider !== 'undefined') {
                        console.log('使用全局WalletConnectProvider变量');

                        // 检查是否需要使用default属性
                        let ProviderClass = window.WalletConnectProvider;
                        if (ProviderClass.default) {
                            ProviderClass = ProviderClass.default;
                            console.log('使用WalletConnectProvider.default');
                        }

                        // 更新加载提示
                        loadingDiv.querySelector('div:first-child').textContent = '正在初始化WalletConnect...';

                        provider = new ProviderClass({
                            rpc: {
                                1: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // 以太坊主网
                                56: 'https://bsc-dataseed.binance.org/', // BSC主网
                                97: 'https://data-seed-prebsc-1-s1.binance.org:8545/' // BSC测试网
                            },
                            bridge: 'https://bridge.walletconnect.org',
                            // 备用bridge服务器
                            // bridge: 'https://wallet-connect-bridge.binance.org/',
                            // bridge: 'https://bridge.myhostedserver.com',
                            qrcodeModal: window.WalletConnectQRCodeModal, // 明确指定QR码模态框
                            qrcodeModalOptions: {
                                mobileLinks: [
                                    'metamask',
                                    'trust',
                                    'rainbow',
                                    'argent',
                                    'imtoken',
                                    'pillar'
                                ],
                                desktopLinks: [
                                    'metamask',
                                    'trust',
                                    'rainbow',
                                    'argent'
                                ]
                            },
                            // 添加超时设置
                            connectTimeout: 30000 // 30秒超时
                        });

                        // 确保QR码模态框可用
                        if (!window.WalletConnectQRCodeModal) {
                            console.warn('WalletConnectQRCodeModal未找到，尝试使用备用方法');
                            // 尝试使用备用方法
                            if (typeof QRCodeModal !== 'undefined') {
                                provider.qrcodeModal = QRCodeModal;
                            }
                        }

                        console.log('WalletConnect提供商创建成功');
                    } else {
                        throw new Error('WalletConnectProvider未定义，请刷新页面重试');
                    }
                } catch (error) {
                    console.error('创建WalletConnect提供商时出错:', error);
                    throw new Error('创建WalletConnect提供商失败: ' + (error.message || '未知错误'));
                }

                // 保存提供商引用
                this.provider = provider;

                // 启用会话（显示二维码）
                console.log('启用WalletConnect会话...');

                // 更新加载提示
                loadingDiv.querySelector('div:first-child').textContent = '请在钱包中扫描二维码...';
                loadingDiv.querySelector('div:nth-child(3)').textContent = '如果没有显示二维码，请点击下方按钮取消并重试';

                try {
                    // 设置一个超时，如果用户长时间未扫描二维码
                    const enableTimeout = setTimeout(() => {
                        // 检查加载提示是否仍然存在
                        if (document.body.contains(loadingDiv)) {
                            // 更新加载提示内容
                            loadingDiv.querySelector('div:first-child').textContent = '等待扫描超时...';
                            loadingDiv.querySelector('div:nth-child(3)').textContent = '请确认您已扫描并确认连接，或点击下方按钮取消';
                        }
                    }, 30000); // 30秒后更新提示

                    // 确保QR码模态框可用
                    if (!provider.qrcodeModal && window.WalletConnectQRCodeModal) {
                        console.log('手动设置QR码模态框');
                        provider.qrcodeModal = window.WalletConnectQRCodeModal;
                    }

                    // 检查是否在移动设备上
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    console.log('是否在移动设备上:', isMobile);

                    // 如果在移动设备上，尝试使用URI而不是二维码
                    if (isMobile && provider.connector && provider.connector.uri) {
                        // 检查URI格式是否正确
                        const uri = provider.connector.uri;
                        console.log('在移动设备上使用URI:', uri);

                        // 检查URI是否有效
                        if (uri && uri.startsWith('wc:') && uri.length > 5) {
                            try {
                                // 尝试使用多种方式打开URI

                                // 方式1：使用window.location.href
                                // 创建一个隐藏的iframe来尝试打开URI
                                const iframe = document.createElement('iframe');
                                iframe.style.display = 'none';
                                iframe.src = uri;
                                document.body.appendChild(iframe);

                                // 方式2：使用window.open
                                setTimeout(() => {
                                    try {
                                        window.open(uri, '_blank');
                                    } catch (e) {
                                        console.error('使用window.open打开URI失败:', e);
                                    }
                                }, 500);

                                // 方式3：最后尝试直接跳转
                                setTimeout(() => {
                                    try {
                                        window.location.href = uri;
                                    } catch (e) {
                                        console.error('使用location.href打开URI失败:', e);
                                    }
                                }, 1000);
                            } catch (e) {
                                console.error('尝试打开URI失败:', e);
                            }
                        } else {
                            console.warn('URI格式不正确或为空:', uri);
                        }

                        // 等待一段时间后继续
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }

                    // 启用WalletConnect会话
                    await provider.enable();

                    // 如果在移动设备上且有URI，但enable后仍未连接，再次尝试打开URI
                    if (isMobile && provider.connector && provider.connector.uri && !provider.connected) {
                        console.log('再次尝试使用URI:', provider.connector.uri);
                        window.location.href = provider.connector.uri;

                        // 等待一段时间后继续
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }

                    // 始终显示自定义二维码，确保用户能看到
                    if (provider.connector && provider.connector.uri) {
                        console.log('显示自定义二维码，确保用户能看到');

                        // 先检查是否已经显示了自定义二维码
                        if (!document.getElementById('custom-qrcode-container')) {
                            // 延迟一点显示自定义二维码，给官方QR码模态框一个显示的机会
                            setTimeout(() => {
                                // 再次检查是否已经显示了自定义二维码
                                if (!document.getElementById('custom-qrcode-container')) {
                                    // 检查页面上是否有WalletConnect模态框
                                    const hasQRCodeModal = document.querySelector('.walletconnect-qrcode');

                                    // 如果没有任何二维码显示，则显示自定义二维码
                                    if (!hasQRCodeModal) {
                                        console.log('未检测到任何二维码模态框，显示自定义二维码');
                                        this.showCustomQRCode(provider.connector.uri);
                                    } else {
                                        console.log('检测到WalletConnect二维码模态框，不显示自定义二维码');
                                    }
                                }
                            }, 1000);
                        }
                    } else {
                        console.warn('没有可用的URI，无法显示二维码');
                    }

                    // 清除超时
                    clearTimeout(enableTimeout);

                    console.log('WalletConnect会话已启用');

                    // 更新加载提示
                    loadingDiv.querySelector('div:first-child').textContent = '连接成功，正在初始化...';
                } catch (error) {
                    console.error('启用WalletConnect会话失败:', error);
                    throw new Error('启用WalletConnect会话失败: ' + (error.message || '未知错误'));
                }

                // 初始化Web3
                this.web3 = new Web3(provider);
                console.log('Web3初始化成功，使用WalletConnect提供商');

                // 清除断开连接标志
                this.manuallyDisconnected = false;
                localStorage.removeItem('wallet_manually_disconnected');
                console.log('已清除断开连接标志');

                // 获取连接的账户
                const accounts = provider.accounts;
                console.log('获取到WalletConnect账户:', accounts);

                if (accounts.length > 0) {
                    // 获取链ID
                    this.chainId = provider.chainId;
                    console.log('已连接到链ID:', this.chainId);

                    // 设置事件监听器
                    provider.on('accountsChanged', (accounts) => {
                        console.log('WalletConnect账户已更改:', accounts);
                        this.handleAccountsChanged(accounts);
                    });

                    provider.on('chainChanged', (chainId) => {
                        console.log('WalletConnect链ID已更改:', chainId);
                        this.handleChainChanged(chainId);
                    });

                    provider.on('disconnect', () => {
                        console.log('WalletConnect已断开连接');
                        this.disconnectWallet();
                    });

                    // 处理账户变化
                    await this.handleAccountsChanged(accounts);

                    // 保存连接状态
                    localStorage.setItem('wallet_connected', 'true');
                    localStorage.setItem('wallet_account', accounts[0]);
                    localStorage.setItem('wallet_provider', 'walletconnect');

                    // 确保游戏容器可见
                    const container = document.getElementById('container');
                    if (container && container.style.display === 'none') {
                        console.log('连接WalletConnect后显示游戏容器');
                        container.style.display = 'block';
                    }

                    // 确保所有canvas元素可见
                    document.querySelectorAll('canvas').forEach(function(canvas) {
                        canvas.style.display = 'block';
                        console.log('Canvas元素已设置为可见:', canvas);
                    });

                    // 强制刷新Canvas
                    setTimeout(function() {
                        document.querySelectorAll('canvas').forEach(function(canvas) {
                            // 尝试触发重绘
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.fillStyle = '#000000';
                                ctx.fillRect(0, 0, 1, 1);
                                console.log('Canvas已重绘');
                            }
                        });
                    }, 500);

                    // 清除超时
                    clearTimeout(loadingTimeout);

                    // 移除加载提示
                    if (document.body.contains(loadingDiv)) {
                        document.body.removeChild(loadingDiv);
                    }

                    return true;
                } else {
                    throw new Error('未能获取WalletConnect账户');
                }
            } catch (error) {
                console.error('WalletConnect连接过程中出错:', error);

                // 清除超时
                clearTimeout(loadingTimeout);

                // 移除加载提示
                if (document.body.contains(loadingDiv)) {
                    document.body.removeChild(loadingDiv);
                }

                throw error; // 重新抛出错误，让外层catch处理
            }
        } catch (error) {
            console.error('连接WalletConnect失败:', error);
            alert('连接WalletConnect失败: ' + (error.message || '未知错误') + '\n\n请确保已安装WalletConnect相关依赖，或尝试刷新页面后重试。');
            return false;
        }
    },

    // 显示自定义二维码
    showCustomQRCode: function(uri) {
        // 创建二维码容器
        const qrCodeContainer = document.createElement('div');
        qrCodeContainer.id = 'custom-qrcode-container';
        qrCodeContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.8); display: flex; justify-content: center; align-items: center; z-index: 10000;';

        // 创建二维码内容
        const qrCodeContent = document.createElement('div');
        qrCodeContent.style.cssText = 'background-color: white; padding: 20px; border-radius: 10px; text-align: center; max-width: 90%; width: 350px;';

        // 创建标题
        const title = document.createElement('h3');
        title.textContent = '使用WalletConnect扫描';
        title.style.cssText = 'margin-top: 0; color: #3b99fc; font-size: 18px;';

        // 创建说明
        const description = document.createElement('p');
        description.textContent = '请使用支持WalletConnect的钱包扫描下方二维码';
        description.style.cssText = 'margin-bottom: 15px; color: #333;';

        // 创建二维码图像
        const qrCodeImage = document.createElement('div');
        qrCodeImage.id = 'qrcode-image';
        qrCodeImage.style.cssText = 'width: 250px; height: 250px; margin: 0 auto 15px auto; background-color: white;';

        // 创建URI文本
        const uriText = document.createElement('div');
        uriText.textContent = uri;
        uriText.style.cssText = 'word-break: break-all; font-size: 12px; color: #666; margin-bottom: 15px; background-color: #f5f5f5; padding: 10px; border-radius: 5px; text-align: left;';

        // 创建复制按钮
        const copyButton = document.createElement('button');
        copyButton.textContent = '复制链接';
        copyButton.style.cssText = 'background-color: #3b99fc; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-bottom: 10px; width: 100%;';

        // 添加复制按钮事件
        copyButton.onclick = function() {
            // 使用现代Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(uri)
                    .then(() => {
                        alert('链接已复制到剪贴板');
                    })
                    .catch(err => {
                        console.error('使用Clipboard API复制失败:', err);
                        // 回退到传统方法
                        fallbackCopy();
                    });
            } else {
                // 回退到传统方法
                fallbackCopy();
            }

            // 传统复制方法
            function fallbackCopy() {
                // 创建临时输入框
                const tempInput = document.createElement('input');
                tempInput.value = uri;
                tempInput.style.position = 'absolute';
                tempInput.style.left = '-9999px';
                document.body.appendChild(tempInput);
                tempInput.select();

                // 复制文本
                try {
                    // 虽然已弃用，但作为后备方案仍然有用
                    const success = document.execCommand('copy');
                    if (success) {
                        alert('链接已复制到剪贴板');
                    } else {
                        alert('复制失败，请手动复制链接');
                    }
                } catch (err) {
                    console.error('复制失败:', err);
                    alert('复制失败，请手动复制链接');
                }

                // 移除临时输入框
                document.body.removeChild(tempInput);
            }
        };

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = 'background-color: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;';

        // 添加关闭按钮事件
        closeButton.onclick = function() {
            document.body.removeChild(qrCodeContainer);
        };

        // 组装二维码内容
        qrCodeContent.appendChild(title);
        qrCodeContent.appendChild(description);
        qrCodeContent.appendChild(qrCodeImage);
        qrCodeContent.appendChild(uriText);
        qrCodeContent.appendChild(copyButton);
        qrCodeContent.appendChild(closeButton);

        // 添加二维码内容到容器
        qrCodeContainer.appendChild(qrCodeContent);

        // 添加到页面
        document.body.appendChild(qrCodeContainer);

        // 动态加载QRCode.js库
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js';
        script.onload = function() {
            // 生成二维码
            if (window.QRCode) {
                new window.QRCode(document.getElementById('qrcode-image'), {
                    text: uri,
                    width: 250,
                    height: 250,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: window.QRCode.CorrectLevel.H
                });
            } else {
                console.error('QRCode库加载失败');
                document.getElementById('qrcode-image').textContent = '二维码生成失败，请使用复制链接功能';
            }
        };
        script.onerror = function() {
            console.error('加载QRCode库失败');
            document.getElementById('qrcode-image').textContent = '二维码生成失败，请使用复制链接功能';
        };
        document.head.appendChild(script);
    },

    // 显示断开连接指导
    showDisconnectInstructions: function() {
        // 创建提示框
        const instructionBox = document.createElement('div');
        instructionBox.id = 'metamask-disconnect-instructions';
        instructionBox.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.9); color: white; padding: 20px; border-radius: 10px; z-index: 10000; max-width: 400px; text-align: center; box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);';

        // 创建标题
        const title = document.createElement('h3');
        title.textContent = '请在MetaMask中完成断开连接';
        title.style.cssText = 'margin-top: 0; color: #f5a623; font-size: 18px;';

        // 创建说明
        const description = document.createElement('p');
        description.innerHTML = '为了完全断开连接，请在MetaMask钱包中点击<strong>断开连接</strong>，然后刷新页面。<br><br>如果MetaMask提示"断开连接并刷新"，请点击确认。';
        description.style.cssText = 'margin-bottom: 20px; line-height: 1.5;';

        // 创建图片
        const image = document.createElement('div');
        image.style.cssText = 'width: 100px; height: 100px; background-image: url(https://metamask.io/images/metamask-fox.svg); background-size: contain; background-repeat: no-repeat; background-position: center; margin: 0 auto 20px auto;';

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '我知道了';
        closeButton.style.cssText = 'background-color: #f5a623; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;';

        // 添加关闭按钮事件
        closeButton.onclick = function() {
            document.body.removeChild(instructionBox);
        };

        // 创建重置链接
        const resetLink = document.createElement('a');
        resetLink.textContent = '点击这里重置连接状态';
        resetLink.href = window.location.pathname + '?reset_wallet=true' + window.location.hash;
        resetLink.style.cssText = 'display: block; margin-top: 15px; color: #f5a623; text-decoration: underline; font-size: 14px;';

        // 组装提示框
        instructionBox.appendChild(title);
        instructionBox.appendChild(image);
        instructionBox.appendChild(description);
        instructionBox.appendChild(closeButton);
        instructionBox.appendChild(resetLink);

        // 添加到页面
        document.body.appendChild(instructionBox);

        // 5秒后自动关闭
        setTimeout(function() {
            if (document.body.contains(instructionBox)) {
                document.body.removeChild(instructionBox);
            }
        }, 10000);
    },

    // 断开连接后的处理
    disconnectWalletHandler: async function() {
        console.log('执行断开连接后的处理...');

        // 清除钱包提供商类型
        localStorage.removeItem('wallet_provider');

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

            // 确保所有canvas元素隐藏
            document.querySelectorAll('canvas').forEach(function(canvas) {
                canvas.style.display = 'none';
                console.log('已隐藏canvas元素');
            });

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
        console.log('处理账户变化:', accounts);

        // 防止重复处理
        if (this._handlingAccountsChanged) {
            console.log('已有一个账户变化处理正在进行，忽略此次调用');
            return;
        }

        this._handlingAccountsChanged = true;

        try {
            if (!accounts || accounts.length === 0) {
                // 用户断开了连接
                console.log('检测到账户为空，执行断开连接操作');
                await this.disconnectWallet();
            } else {
                // 检查账户是否真的变化了
                const newAccount = accounts[0];
                if (this.account === newAccount) {
                    console.log('账户未变化，无需处理:', newAccount);
                    return;
                }

                // 更新当前账户
                this.account = newAccount;
                console.log('当前账户已更新:', this.account);

                // 更新last_connected_account
                localStorage.setItem('last_connected_account', this.account);
                console.log('已更新last_connected_account:', this.account);

                // 显示钱包信息区域（包含断开连接按钮和兑换代币按钮）
                document.getElementById('wallet-info').style.display = 'flex';
                document.getElementById('connect-wallet').style.display = 'none';

                // 如果是新连接，触发登录成功事件
                if (this.web3 && this.provider) {
                    await this.onLoginSuccess();
                }

                // 隐藏登录屏幕，允许游戏开始
                if (this.loginRequired) {
                    const loginScreen = document.getElementById('wallet-login-screen');
                    if (loginScreen) {
                        loginScreen.style.display = 'none';
                        console.log('已隐藏登录屏幕');
                    }

                    // 确保游戏容器可见
                    const container = document.getElementById('container');
                    if (container && container.style.display === 'none') {
                        container.style.display = 'block';
                        console.log('账户变化后显示游戏容器');
                    }

                    // 确保所有canvas元素可见
                    document.querySelectorAll('canvas').forEach(function(canvas) {
                        canvas.style.display = 'block';
                        console.log('账户变化后显示canvas元素:', canvas);
                    });

                    // 强制刷新Canvas
                    setTimeout(function() {
                        document.querySelectorAll('canvas').forEach(function(canvas) {
                            // 尝试触发重绘
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.fillStyle = '#000000';
                                ctx.fillRect(0, 0, 1, 1);
                                console.log('账户变化后Canvas已重绘');
                            }
                        });
                    }, 500);

                    // 启动游戏
                    await this.startGame();
                }
            }
        } catch (error) {
            console.error('处理账户变化时出错:', error);
        } finally {
            // 无论成功还是失败，都重置处理标志
            this._handlingAccountsChanged = false;
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
                console.log('已显示游戏容器');
            }

            // 确保所有canvas元素可见
            document.querySelectorAll('canvas').forEach(function(canvas) {
                canvas.style.display = 'block';
                console.log('游戏启动时显示canvas元素:', canvas);
            });

            // 强制刷新Canvas
            setTimeout(function() {
                document.querySelectorAll('canvas').forEach(function(canvas) {
                    // 确保Canvas尺寸正确
                    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
                        canvas.width = window.innerWidth;
                        canvas.height = window.innerHeight;
                        console.log('游戏启动时Canvas尺寸已调整为', canvas.width, 'x', canvas.height);
                    }

                    // 确保Canvas样式正确
                    canvas.style.display = 'block';
                    canvas.style.visibility = 'visible';
                    canvas.style.opacity = '1';
                    canvas.style.position = 'fixed';
                    canvas.style.top = '0';
                    canvas.style.left = '0';
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';

                    // 尝试触发重绘
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        // 保存当前状态
                        ctx.save();

                        // 清除整个Canvas
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        // 绘制黑色背景
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        // 恢复状态
                        ctx.restore();

                        console.log('游戏启动时Canvas已重绘');
                    }
                });

                // 如果没有找到Canvas元素，尝试创建一个
                if (document.querySelectorAll('canvas').length === 0) {
                    console.log('未找到Canvas元素，尝试创建一个');
                    const container = document.getElementById('container');
                    if (container) {
                        const canvas = document.createElement('canvas');
                        canvas.width = window.innerWidth;
                        canvas.height = window.innerHeight;

                        // 设置Canvas样式
                        canvas.style.display = 'block';
                        canvas.style.visibility = 'visible';
                        canvas.style.opacity = '1';
                        canvas.style.position = 'fixed';
                        canvas.style.top = '0';
                        canvas.style.left = '0';
                        canvas.style.width = '100%';
                        canvas.style.height = '100%';
                        canvas.style.zIndex = '2';

                        // 添加到容器
                        container.appendChild(canvas);
                        console.log('已创建新的Canvas元素');

                        // 绘制黑色背景
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.fillStyle = '#000000';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                    }
                }


            }, 500);

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
