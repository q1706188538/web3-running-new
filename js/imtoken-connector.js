/**
 * imToken钱包连接器
 * 专为移动设备上的imToken钱包连接设计
 */
const ImTokenConnector = {
    // 初始化
    init: function() {
        console.log('初始化imToken钱包连接器...');

        // 检测移动设备
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // 检测iOS设备
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        // 检测Android设备
        this.isAndroid = /Android/.test(navigator.userAgent);

        // 检测是否在imToken内置浏览器中
        this.isInImToken = this.checkIfInImToken();
        console.log('是否在imToken内置浏览器中:', this.isInImToken);

        // imToken应用链接
        this.imTokenAppLink = {
            ios: 'imtokenv2://navigate/DappView?url=',
            android: 'imtokenv2://navigate/DappView?url=',
            universal: 'https://token.im/download'
        };

        // 添加页面可见性变化事件监听
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // 如果在imToken内置浏览器中，自动尝试连接
        if (this.isInImToken) {
            console.log('检测到在imToken内置浏览器中，自动尝试连接...');
            // 延迟一点时间再连接，确保页面完全加载
            setTimeout(() => {
                this.connectInImToken();


            }, 1000);
        }
    },

    // 检查是否在imToken内置浏览器中
    checkIfInImToken: function() {
        // 检查用户代理字符串
        const userAgent = navigator.userAgent.toLowerCase();

        // imToken内置浏览器的特征
        const imTokenSignatures = [
            'imtoken',
            'token.im',
            'tokenpocket'  // 有些版本可能会包含这个
        ];

        // 检查是否包含imToken特征
        for (const signature of imTokenSignatures) {
            if (userAgent.includes(signature)) {
                console.log('检测到imToken特征:', signature);
                return true;
            }
        }

        // 检查是否有imToken特有的全局变量或方法
        if (typeof window.ethereum !== 'undefined') {
            // 检查提供商名称
            if (window.ethereum.isImToken ||
                (window.ethereum.isTokenPocket && userAgent.includes('imtoken')) ||
                (window.ethereum.providers && window.ethereum.providers.some(p => p.isImToken))) {
                console.log('检测到imToken提供商');
                return true;
            }
        }

        return false;
    },

    // 在imToken内置浏览器中连接
    connectInImToken: function() {
        console.log('在imToken内置浏览器中连接...');

        try {
            // 显示加载中状态
            this.showLoadingStatus('正在连接imToken钱包...');

            // 检查ethereum对象
            if (typeof window.ethereum === 'undefined') {
                console.error('在imToken内置浏览器中未找到ethereum对象');
                this.hideLoadingStatus();
                this.showImTokenGuide();
                return;
            }

            // 获取imToken提供商
            let provider = window.ethereum;

            // 如果有多个提供商，尝试找到imToken提供商
            if (window.ethereum.providers) {
                const imTokenProvider = window.ethereum.providers.find(p => p.isImToken);
                if (imTokenProvider) {
                    provider = imTokenProvider;
                    console.log('找到imToken提供商');
                }
            }

            // 请求账户
            provider.request({ method: 'eth_requestAccounts' })
                .then(accounts => {
                    console.log('imToken连接成功，账户:', accounts);

                    // 隐藏加载中状态
                    this.hideLoadingStatus();

                    // 如果有账户，连接成功
                    if (accounts && accounts.length > 0) {
                        // 获取链ID
                        provider.request({ method: 'eth_chainId' })
                            .then(chainId => {
                                // 通知WalletManager
                                if (typeof WalletManager !== 'undefined') {
                                    // 使用专门的imToken成功处理方法
                                    if (typeof WalletManager.handleImTokenSuccess === 'function') {
                                        WalletManager.handleImTokenSuccess(provider, accounts[0], chainId);
                                    } else {
                                        // 回退到WalletConnect处理方法
                                        WalletManager.handleWalletConnectSuccess(provider, accounts[0], chainId);
                                    }
                                }

                                // 尝试修复加载问题
                                this.handleConnectionSuccess(accounts[0], chainId);
                            })
                            .catch(error => {
                                console.error('获取链ID失败:', error);
                                // 使用默认链ID
                                if (typeof WalletManager !== 'undefined') {
                                    // 使用专门的imToken成功处理方法
                                    if (typeof WalletManager.handleImTokenSuccess === 'function') {
                                        WalletManager.handleImTokenSuccess(provider, accounts[0], '0x1');
                                    } else {
                                        // 回退到WalletConnect处理方法
                                        WalletManager.handleWalletConnectSuccess(provider, accounts[0], '0x1');
                                    }
                                }

                                // 尝试修复加载问题
                                this.handleConnectionSuccess(accounts[0], '0x1');
                            });
                    } else {
                        console.error('imToken连接成功但未返回账户');
                        this.showImTokenGuide();
                    }
                })
                .catch(error => {
                    console.error('imToken连接请求失败:', error);
                    this.hideLoadingStatus();
                    this.showImTokenGuide();
                });
        } catch (error) {
            console.error('在imToken内置浏览器中连接失败:', error);
            this.hideLoadingStatus();
            this.showImTokenGuide();
        }
    },

    // 连接imToken钱包
    connect: async function() {
        console.log('尝试连接imToken钱包...');

        try {
            // 检查是否在移动设备上
            if (!this.isMobile) {
                throw new Error('imToken连接仅支持移动设备');
            }

            // 检查是否已经在imToken内置浏览器中
            if (this.isInImToken) {
                console.log('已在imToken内置浏览器中，直接连接');
                return this.connectInImToken();
            }

            // 显示加载中状态
            this.showLoadingStatus('正在打开imToken钱包...');

            // 获取当前页面URL
            const currentUrl = window.location.href;
            console.log('当前页面URL:', currentUrl);

            // 尝试打开imToken应用
            const opened = await this.openImTokenApp(currentUrl);

            // 如果无法打开imToken应用，显示指导
            if (!opened) {
                this.hideLoadingStatus();
                this.showImTokenGuide();
            } else {
                // 设置连接状态检查
                this.setupConnectionCheck();
            }

            return true;
        } catch (error) {
            console.error('连接imToken钱包失败:', error);

            // 隐藏加载中状态
            this.hideLoadingStatus();

            // 显示错误提示
            alert('连接imToken钱包失败: ' + (error.message || '未知错误'));

            return false;
        }
    },

    // 打开imToken应用
    openImTokenApp: async function(url) {
        return new Promise((resolve) => {
            console.log('尝试打开imToken应用...');

            // 编码URL
            const encodedUrl = encodeURIComponent(url);

            // 根据设备类型选择合适的链接
            let appLink;
            if (this.isIOS) {
                appLink = this.imTokenAppLink.ios + encodedUrl;
            } else if (this.isAndroid) {
                appLink = this.imTokenAppLink.android + encodedUrl;
            } else {
                appLink = this.imTokenAppLink.universal;
            }

            console.log('使用链接打开imToken:', appLink);

            // 记录当前时间
            const startTime = Date.now();

            // 尝试打开imToken应用
            window.location.href = appLink;

            // 设置超时检查
            setTimeout(() => {
                // 如果页面仍然可见，说明没有成功打开应用
                if (document.visibilityState === 'visible' && (Date.now() - startTime) > 1500) {
                    console.log('无法打开imToken应用');
                    resolve(false);
                } else {
                    console.log('已尝试打开imToken应用');
                    resolve(true);
                }
            }, 2000);
        });
    },

    // 设置连接状态检查
    setupConnectionCheck: function() {
        console.log('设置连接状态检查...');

        // 设置检查间隔
        this.connectionCheckInterval = setInterval(() => {
            // 检查钱包是否已连接
            if (typeof WalletManager !== 'undefined' && WalletManager.isConnected()) {
                console.log('检测到钱包已连接，清除检查间隔');
                clearInterval(this.connectionCheckInterval);
                this.hideLoadingStatus();
            }
        }, 1000);

        // 设置超时，如果长时间未连接，清除检查间隔
        setTimeout(() => {
            if (this.connectionCheckInterval) {
                console.log('连接超时，清除检查间隔');
                clearInterval(this.connectionCheckInterval);
                this.hideLoadingStatus();
            }
        }, 60000); // 1分钟超时
    },

    // 处理页面可见性变化
    handleVisibilityChange: function() {
        if (document.visibilityState === 'visible') {
            console.log('页面变为可见，检查钱包连接状态');

            // 如果从imToken应用返回，检查钱包是否已连接
            if (typeof WalletManager !== 'undefined') {
                WalletManager.checkWalletConnection();
            }
        }
    },

    // 显示imToken指导
    showImTokenGuide: function() {
        console.log('显示imToken指导...');

        // 创建指导容器
        const guideDiv = document.createElement('div');
        guideDiv.id = 'imtoken-guide';
        guideDiv.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.8); display: flex; justify-content: center; align-items: center; z-index: 10000;';

        // 创建指导内容
        const guideContent = document.createElement('div');
        guideContent.style.cssText = 'background-color: white; padding: 20px; border-radius: 10px; text-align: center; max-width: 90%; width: 320px;';

        // 创建标题
        const title = document.createElement('div');
        title.textContent = '连接imToken钱包';
        title.style.cssText = 'font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #3b99fc;';

        // 创建imToken图标
        const icon = document.createElement('img');
        icon.src = 'https://token.im/favicon.ico';
        icon.alt = 'imToken';
        icon.style.cssText = 'width: 60px; height: 60px; margin-bottom: 15px;';

        // 添加图片加载错误处理
        icon.onerror = function() {
            this.style.display = 'none';
            const textIcon = document.createElement('div');
            textIcon.textContent = 'imToken';
            textIcon.style.cssText = 'width: 60px; height: 60px; border-radius: 30px; background-color: #3b99fc; color: white; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 14px; margin: 0 auto 15px auto;';
            this.parentNode.insertBefore(textIcon, this);
        };

        // 创建说明
        const description = document.createElement('div');
        description.innerHTML = `
            <p style="margin-bottom: 15px;">请按照以下步骤连接imToken钱包:</p>
            <ol style="text-align: left; margin-left: 20px; margin-bottom: 15px; line-height: 1.5;">
                <li>安装并打开imToken应用</li>
                <li>点击底部的"发现"选项</li>
                <li>点击"扫码"或"WalletConnect"</li>
                <li>扫描下方二维码或输入连接代码</li>
            </ol>
        `;
        description.style.cssText = 'margin-bottom: 15px; color: #333; font-size: 14px;';

        // 创建下载按钮
        const downloadButton = document.createElement('a');
        downloadButton.href = 'https://token.im/download';
        downloadButton.target = '_blank';
        downloadButton.textContent = '下载imToken';
        downloadButton.style.cssText = 'background-color: #3b99fc; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-bottom: 10px; display: block; text-decoration: none; text-align: center;';

        // 创建WalletConnect按钮
        const wcButton = document.createElement('button');
        wcButton.textContent = '使用WalletConnect连接';
        wcButton.style.cssText = 'background-color: #3b99fc; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-bottom: 10px; width: 100%;';

        // 添加WalletConnect按钮事件
        wcButton.onclick = function() {
            // 移除指导容器
            document.body.removeChild(guideDiv);

            // 显示WalletConnect二维码
            if (typeof StaticWalletConnect !== 'undefined' && typeof StaticWalletConnect.showQRCode === 'function') {
                StaticWalletConnect.showQRCode();
            } else {
                alert('WalletConnect不可用');
            }
        };

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = 'background-color: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;';

        // 添加关闭按钮事件
        closeButton.onclick = function() {
            document.body.removeChild(guideDiv);
        };

        // 组装指导内容
        guideContent.appendChild(title);
        guideContent.appendChild(icon);
        guideContent.appendChild(description);
        guideContent.appendChild(downloadButton);
        guideContent.appendChild(wcButton);
        guideContent.appendChild(closeButton);

        // 添加指导内容到容器
        guideDiv.appendChild(guideContent);

        // 添加到页面
        document.body.appendChild(guideDiv);
    },

    // 显示加载中状态
    showLoadingStatus: function(message) {
        // 默认消息
        const loadingMessage = message || '正在连接imToken钱包...';

        // 创建加载中提示
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'imtoken-loading';
        loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.8); color: white; padding: 20px; border-radius: 10px; z-index: 10000; text-align: center;';
        loadingDiv.innerHTML = `<div style="margin-bottom: 15px;">${loadingMessage}</div><div class="spinner" style="border: 4px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top: 4px solid white; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto;"></div><div style="margin-top: 15px; font-size: 12px;">请在imToken应用中确认连接</div>`;

        // 添加旋转动画样式
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }

        // 添加到页面
        document.body.appendChild(loadingDiv);
    },

    // 隐藏加载中状态
    hideLoadingStatus: function() {
        const loadingDiv = document.getElementById('imtoken-loading');
        if (loadingDiv) {
            document.body.removeChild(loadingDiv);
        }
    },

    // 处理连接成功
    handleConnectionSuccess: function(account, chainId) {
        console.log('处理imToken连接成功:', account, chainId);

        try {
            // 确保游戏容器可见
            const container = document.getElementById('container');
            if (container) {
                console.log('确保游戏容器可见');
                container.style.display = 'block';
                container.style.visibility = 'visible';
                container.style.opacity = '1';
            }

            // 确保所有canvas元素可见
            const canvases = document.querySelectorAll('canvas');
            canvases.forEach(canvas => {
                console.log('确保canvas元素可见:', canvas);
                canvas.style.display = 'block';
                canvas.style.visibility = 'visible';
                canvas.style.opacity = '1';
            });

            // 尝试触发游戏引擎的钱包连接事件
            if (typeof GEMIOLI !== 'undefined' && GEMIOLI.Application) {
                console.log('触发游戏引擎的钱包连接事件');
                GEMIOLI.Application.dispatchEvent({
                    type: 'wallet_connected',
                    address: account
                });
            }




        } catch (error) {
            console.error('处理imToken连接成功时出错:', error);
        }
    },

    // 检查连接状态
    checkConnectionStatus: function() {
        console.log('检查imToken连接状态...');

        try {
            // 检查ethereum对象
            if (typeof window.ethereum === 'undefined') {
                console.log('未找到ethereum对象，无法检查连接状态');
                return;
            }

            // 获取imToken提供商
            let provider = window.ethereum;

            // 如果有多个提供商，尝试找到imToken提供商
            if (window.ethereum.providers) {
                const imTokenProvider = window.ethereum.providers.find(p => p.isImToken);
                if (imTokenProvider) {
                    provider = imTokenProvider;
                }
            }

            // 检查是否已连接
            provider.request({ method: 'eth_accounts' })
                .then(accounts => {
                    if (accounts && accounts.length > 0) {
                        console.log('imToken已连接，账户:', accounts[0]);

                        // 获取链ID
                        provider.request({ method: 'eth_chainId' })
                            .then(chainId => {
                                // 处理连接成功
                                this.handleConnectionSuccess(accounts[0], chainId);
                            })
                            .catch(error => {
                                console.error('获取链ID失败:', error);
                                // 使用默认链ID
                                this.handleConnectionSuccess(accounts[0], '0x1');
                            });
                    } else {
                        console.log('imToken未连接');

                        // 尝试连接
                        this.connectInImToken();
                    }
                })
                .catch(error => {
                    console.error('检查imToken连接状态失败:', error);
                });
        } catch (error) {
            console.error('检查imToken连接状态时出错:', error);
        }
    },



    // 处理页面可见性变化
    handleVisibilityChange: function() {
        if (document.visibilityState === 'visible') {
            console.log('页面变为可见，检查连接状态');

            // 如果在imToken内置浏览器中，检查连接状态
            if (this.isInImToken) {
                this.checkConnectionStatus();
            }


        }
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    ImTokenConnector.init();
});
