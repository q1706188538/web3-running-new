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
        walletInfo.style.cssText = 'display: none; position: fixed; top: 10px; right: 10px; z-index: 1001; flex-direction: column; align-items: flex-end; gap: 10px;';

        // 断开连接按钮 - 移到右上角，没有背景
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

        // 创建免费体验按钮 - 放在兑换代币按钮下方
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

        // 组装UI - 添加断开连接按钮、兑换代币按钮和免费体验按钮
        walletInfo.appendChild(disconnectBtn);
        walletInfo.appendChild(exchangeBtn);
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

    // 连接钱包 - 只连接MetaMask
    connectWallet: async function() {
        console.log('尝试连接MetaMask钱包...');

        // 检查是否是移动设备
        if (this.isMobileDevice() && !this.isInMetaMaskBrowser()) {
            console.log('检测到移动设备，显示移动设备连接指南');
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

    // 断开连接 - 只针对MetaMask
    disconnectWallet: async function() {
        console.log('断开MetaMask钱包连接');

        // 尝试使用MetaMask API断开连接
        if (this.web3 && this.provider) {
            try {
                console.log('尝试使用MetaMask API断开连接...');

                // 注意：MetaMask不支持直接断开连接的API，但我们可以尝试清除一些状态

                // 移除事件监听器
                this.removeEventListeners();

                // 尝试获取当前账户，不会弹出MetaMask
                try {
                    const accounts = await this.provider.request({ method: 'eth_accounts' });
                    console.log('断开前的MetaMask账户:', accounts);
                } catch (e) {
                    console.log('获取断开前MetaMask账户时出错:', e);
                }
            } catch (error) {
                console.log('尝试断开MetaMask连接时出错:', error);
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

    // 显示移动设备连接指南
    showMobileConnectGuide: function() {
        // 创建提示框
        const guideBox = document.createElement('div');
        guideBox.id = 'metamask-mobile-guide';
        guideBox.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.9); color: white; padding: 20px; border-radius: 10px; z-index: 10000; max-width: 90%; width: 350px; text-align: center; box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);';

        // 创建标题
        const title = document.createElement('h3');
        title.textContent = '在移动设备上连接MetaMask';
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
        step1.innerHTML = '下载并安装 <strong>MetaMask移动应用</strong>';
        step1.style.cssText = 'margin-bottom: 10px;';

        const step2 = document.createElement('li');
        step2.innerHTML = '在MetaMask应用中，点击底部的<strong>浏览器图标</strong>';
        step2.style.cssText = 'margin-bottom: 10px;';

        const step3 = document.createElement('li');
        step3.innerHTML = '在MetaMask浏览器中输入网址: <strong>' + window.location.href + '</strong>';
        step3.style.cssText = 'margin-bottom: 10px;';

        const step4 = document.createElement('li');
        step4.innerHTML = '在MetaMask浏览器中打开的游戏页面上连接钱包';
        step4.style.cssText = 'margin-bottom: 10px;';

        steps.appendChild(step1);
        steps.appendChild(step2);
        steps.appendChild(step3);
        steps.appendChild(step4);

        description.appendChild(document.createTextNode('在移动设备上，您需要使用MetaMask应用的内置浏览器来玩游戏:'));
        description.appendChild(steps);

        // 创建下载按钮
        const downloadButton = document.createElement('a');
        downloadButton.href = 'https://metamask.io/download/';
        downloadButton.target = '_blank';
        downloadButton.textContent = '下载MetaMask';
        downloadButton.style.cssText = 'background-color: #f5a623; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; text-decoration: none; display: inline-block; margin-bottom: 15px;';

        // 创建免费体验按钮
        const freeTrialButton = document.createElement('a');
        freeTrialButton.href = 'http://taowwww.blakcat.top/';
        freeTrialButton.textContent = '免费体验版本';
        freeTrialButton.style.cssText = 'background-color: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; text-decoration: none; display: inline-block; margin-bottom: 15px; margin-left: 10px;';

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = 'background-color: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; display: block; margin: 0 auto;';

        // 添加关闭按钮事件
        closeButton.onclick = function() {
            document.body.removeChild(guideBox);
        };

        // 组装提示框
        guideBox.appendChild(title);
        guideBox.appendChild(image);
        guideBox.appendChild(description);

        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; justify-content: center; margin-bottom: 15px;';
        buttonContainer.appendChild(downloadButton);
        buttonContainer.appendChild(freeTrialButton);

        guideBox.appendChild(buttonContainer);
        guideBox.appendChild(closeButton);

        // 添加到页面
        document.body.appendChild(guideBox);
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
                    // 尝试触发重绘
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(0, 0, 1, 1);
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
                        canvas.style.display = 'block';
                        container.appendChild(canvas);
                        console.log('已创建新的Canvas元素');
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
