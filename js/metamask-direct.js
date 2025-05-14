/**
 * MetaMask直接集成模块
 * 不依赖外部SDK，直接实现与MetaMask移动应用的连接
 */
const MetaMaskManager = {
    // 连接状态
    connected: false,

    // 当前账户
    account: null,

    // 当前链ID
    chainId: null,

    // 初始化
    init: function() {
        console.log('初始化MetaMask直接集成...');

        // 检查是否在移动设备上
        this.isMobile = this.checkIsMobile();
        console.log('是否在移动设备上:', this.isMobile);

        // 检查是否已安装MetaMask
        this.checkMetaMaskInstalled();

        // 在WalletManager中注册
        if (typeof WalletManager !== 'undefined') {
            // 添加MetaMask直连选项
            WalletManager.canUseMetaMaskDirect = function() {
                return MetaMaskManager.isMobile;
            };

            // 添加MetaMask直连方法
            WalletManager.connectWithMetaMaskDirect = function() {
                return MetaMaskManager.connect();
            };
        }

        console.log('MetaMask直接集成初始化完成');
    },

    // 检查是否已安装MetaMask
    checkMetaMaskInstalled: function() {
        // 方法1：检查ethereum提供者
        if (window.ethereum && window.ethereum.isMetaMask) {
            console.log('检测到MetaMask已安装（通过ethereum提供者）');
            this.isInstalled = true;
            return true;
        }

        // 方法2：尝试创建隐藏iframe来检测metamask://协议
        try {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = 'metamask://';

            // 设置超时，如果能加载则可能已安装
            setTimeout(function() {
                if (iframe.contentWindow.location.href !== 'about:blank') {
                    console.log('检测到MetaMask可能已安装（通过协议检测）');
                    MetaMaskManager.isInstalled = true;
                }

                // 移除iframe
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 500);

            document.body.appendChild(iframe);
        } catch (error) {
            console.log('MetaMask协议检测失败:', error);
        }

        // 默认假设未安装
        this.isInstalled = false;
        return false;
    },

    // 检查是否在移动设备上
    checkIsMobile: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    // 连接到MetaMask
    connect: async function() {
        try {
            console.log('尝试连接到MetaMask移动应用...');

            // 显示连接中状态
            this.showConnectingStatus();

            // 构建深度链接URL
            const currentUrl = encodeURIComponent(window.location.href);
            const host = window.location.host;
            const path = window.location.pathname;
            const protocol = window.location.protocol;
            const isHttps = protocol === 'https:';

            console.log('当前协议:', protocol, '是否HTTPS:', isHttps);

            // 检测设备类型
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            const isAndroid = /Android/i.test(navigator.userAgent);

            console.log('当前设备信息:', navigator.userAgent);
            console.log('是否iOS设备:', isIOS);
            console.log('是否Android设备:', isAndroid);

            // 为不同设备优化的链接
            let metamaskDeepLink, metamaskAppLink, metamaskUniversalLink;

            if (isIOS) {
                // iOS设备使用app.link格式
                const host = window.location.host;
                const path = window.location.pathname;
                const search = window.location.search || '';

                // 1. iOS主链接 - 使用app.link/dapp格式
                metamaskDeepLink = `https://metamask.app.link/dapp/${host}${path}${search}`;

                // 2. iOS备用链接 - 使用metamask://协议
                metamaskAppLink = `metamask://`;

                // 3. iOS下载链接
                metamaskUniversalLink = `https://apps.apple.com/us/app/metamask/id1438144202`;
            } else if (isAndroid) {
                // Android设备使用intent格式

                // 1. Android主链接 - 使用intent格式
                metamaskDeepLink = `intent://metamask.io/#Intent;scheme=http;package=io.metamask;end`;

                // 2. Android备用链接 - 使用metamask://协议
                metamaskAppLink = `metamask://`;

                // 3. Android下载链接
                metamaskUniversalLink = `https://play.google.com/store/apps/details?id=io.metamask`;
            } else {
                // 其他设备使用通用格式

                // 1. 通用主链接
                metamaskDeepLink = `metamask://`;

                // 2. 通用备用链接
                metamaskAppLink = `https://metamask.io/download.html`;

                // 3. 通用下载链接
                metamaskUniversalLink = `https://metamask.io/download.html`;
            }

            console.log('MetaMask直接链接:', metamaskDeepLink);
            console.log('MetaMask以太坊链接:', metamaskAppLink);
            console.log('MetaMask下载链接:', metamaskUniversalLink);

            // 尝试打开MetaMask应用，使用所有三种链接格式
            this.openMetaMask(metamaskDeepLink, metamaskAppLink, metamaskUniversalLink);

            // 不要自动假设连接成功
            // 我们将等待用户手动确认连接

            // 移除连接中状态
            this.hideConnectingStatus();

            // 注意：我们不再自动显示手动连接指南
            // 用户可以通过选择界面中的"查看手动连接指南"按钮来查看

            return true;
        } catch (error) {
            console.error('连接MetaMask失败:', error);

            // 移除连接中状态
            this.hideConnectingStatus();

            // 显示错误提示
            alert('连接MetaMask失败: ' + (error.message || '未知错误') + '\n\n请确保已安装MetaMask应用，并允许连接请求。');

            return false;
        }
    },

    // 打开MetaMask应用
    openMetaMask: function(primaryLink, fallbackLink, universalLink) {
        // 检测设备类型
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isAndroid = /Android/i.test(navigator.userAgent);

        // 检查是否在dapp中（如果在dapp中，应该已经有provider可用）
        if (window.ethereum) {
            console.log('检测到在dapp中，尝试直接连接');
            // 直接使用ethereum provider连接
            if (typeof WalletManager !== 'undefined' && WalletManager.provider) {
                WalletManager.connectWallet();
            }
            return;
        }

        // 如果不在dapp中，直接打开MetaMask应用
        console.log('不在dapp中，直接打开MetaMask应用');

        // 根据设备类型选择合适的链接
        if (isIOS) {
            // 构建iOS专用深度链接
            const host = window.location.host;
            const path = window.location.pathname;
            const search = window.location.search || '';
            const iosDeepLink = `https://metamask.app.link/dapp/${host}${path}${search}`;
            console.log('iOS专用深度链接:', iosDeepLink);
            window.location.href = iosDeepLink;
        } else if (isAndroid) {
            // 构建Android专用深度链接
            const androidDeepLink = `intent://metamask.io/#Intent;scheme=http;package=io.metamask;end`;
            console.log('Android专用深度链接:', androidDeepLink);
            window.location.href = androidDeepLink;
        } else {
            // 其他设备使用通用链接
            console.log('使用通用链接:', primaryLink);
            window.location.href = primaryLink;
        }
    },

    // 显示连接中状态
    showConnectingStatus: function() {
        // 创建连接中提示
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'metamask-connecting';
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
    },

    // 隐藏连接中状态
    hideConnectingStatus: function() {
        const loadingDiv = document.getElementById('metamask-connecting');
        if (loadingDiv) {
            document.body.removeChild(loadingDiv);
        }
    },

    // 显示WalletConnect信息
    showWalletConnectInfo: function() {
        // 检测移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // 创建WalletConnect信息
        const infoDiv = document.createElement('div');
        infoDiv.id = 'walletconnect-info';
        infoDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.8); color: white; padding: 20px; border-radius: 10px; z-index: 10000; text-align: center; max-width: 90%; width: 350px;';

        // 添加内容
        infoDiv.innerHTML = `
            <div style="margin-bottom: 15px; font-weight: bold; color: #3b99fc;">什么是WalletConnect?</div>
            <div style="margin-bottom: 15px; text-align: left; line-height: 1.5;">
                <p>WalletConnect是一个开放协议，允许您的钱包与去中心化应用程序（DApps）安全连接。</p>
                <p style="margin-top: 10px;">优势:</p>
                <ul style="margin-left: 20px; margin-top: 5px;">
                    <li>无需安装浏览器扩展</li>
                    <li>支持多种钱包应用</li>
                    <li>在HTTP环境下也能正常工作</li>
                    <li>连接更稳定可靠</li>
                </ul>
                <p style="margin-top: 10px;">使用方法:</p>
                <ol style="margin-left: 20px; margin-top: 5px;">
                    <li>点击"使用WalletConnect连接"</li>
                    <li>扫描显示的二维码</li>
                    <li>在您的钱包应用中确认连接</li>
                </ol>
            </div>
            <div style="margin-bottom: 15px;">
                ${isMobile ? '<button id="walletconnect-info-imtoken" style="background-color: #3b99fc; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 10px;">使用imToken钱包连接</button>' : ''}
                <button id="walletconnect-info-static-connect" style="background-color: #3b99fc; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 10px;">使用WalletConnect连接</button>
                <button id="walletconnect-info-close" style="background-color: #e74c3c; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%;">关闭</button>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(infoDiv);

        // 添加imToken连接按钮事件
        if (isMobile && document.getElementById('walletconnect-info-imtoken')) {
            document.getElementById('walletconnect-info-imtoken').onclick = function() {
                document.body.removeChild(infoDiv);
                // 调用WalletManager的imToken连接方法
                if (typeof WalletManager !== 'undefined' && typeof WalletManager.connectWithImToken === 'function') {
                    WalletManager.connectWithImToken();
                } else {
                    alert('imToken连接方法不可用');
                }
            };
        }

        // 添加静态连接按钮事件
        document.getElementById('walletconnect-info-static-connect').onclick = function() {
            document.body.removeChild(infoDiv);
            // 显示静态WalletConnect二维码
            if (typeof StaticWalletConnect !== 'undefined' && typeof StaticWalletConnect.showQRCode === 'function') {
                StaticWalletConnect.showQRCode();
            } else {
                alert('静态WalletConnect不可用');
            }
        };

        // 注意：动态连接按钮已移除

        // 添加关闭按钮事件
        document.getElementById('walletconnect-info-close').onclick = function() {
            document.body.removeChild(infoDiv);
        };
    },

    // 显示手动连接指南
    showManualConnectGuide: function() {
        // 创建手动连接指南
        const guideDiv = document.createElement('div');
        guideDiv.id = 'metamask-manual-guide';
        guideDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.8); color: white; padding: 20px; border-radius: 10px; z-index: 10000; text-align: center; max-width: 90%; width: 350px;';

        // 添加内容
        guideDiv.innerHTML = `
            <div style="margin-bottom: 15px; font-weight: bold; color: #f5a623;">MetaMask手动连接指南</div>
            <div style="margin-bottom: 15px; text-align: left;">
                <p>由于您使用的是HTTP环境，需要手动在MetaMask中连接到此网站：</p>
                <ol style="margin-left: 20px; margin-top: 10px; line-height: 1.5;">
                    <li>打开MetaMask应用</li>
                    <li>点击浏览器图标</li>
                    <li>在地址栏输入当前网址: <span style="color: #f5a623;">${window.location.href}</span></li>
                    <li>连接到此网站</li>
                    <li>返回此页面，刷新后点击"连接钱包"</li>
                </ol>
            </div>
            <div style="margin-bottom: 15px;">
                <button id="manual-guide-copy" style="background-color: #3b99fc; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 10px;">复制网址</button>
                <button id="manual-guide-close" style="background-color: #e74c3c; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%;">关闭</button>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(guideDiv);

        // 添加复制按钮事件
        document.getElementById('manual-guide-copy').onclick = function() {
            const url = window.location.href;

            // 使用现代Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url)
                    .then(() => {
                        alert('网址已复制到剪贴板');
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
                tempInput.value = url;
                tempInput.style.position = 'absolute';
                tempInput.style.left = '-9999px';
                document.body.appendChild(tempInput);
                tempInput.select();

                // 复制文本
                try {
                    // 虽然已弃用，但作为后备方案仍然有用
                    const success = document.execCommand('copy');
                    if (success) {
                        alert('网址已复制到剪贴板');
                    } else {
                        alert('复制失败，请手动复制网址');
                    }
                } catch (err) {
                    console.error('复制失败:', err);
                    alert('复制失败，请手动复制网址');
                }

                // 移除临时输入框
                document.body.removeChild(tempInput);
            }
        };

        // 添加关闭按钮事件
        document.getElementById('manual-guide-close').onclick = function() {
            document.body.removeChild(guideDiv);
        };
    }
};

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    MetaMaskManager.init();

    // 修改WalletManager的连接方法，优先使用MetaMask直连
    if (typeof WalletManager !== 'undefined') {
        // 保存原始的showMobileConnectGuide方法以便以后可能需要恢复
        // 注意：我们目前没有使用这个变量，但保留它以便将来可能的扩展
        // const originalShowMobileConnectGuide = WalletManager.showMobileConnectGuide;

        // 重写showMobileConnectGuide方法
        WalletManager.showMobileConnectGuide = function() {
            console.log('在移动设备上直接连接，不显示选择UI');

            // 检查是否在dapp中（如果在dapp中，应该已经有provider可用）
            if (window.ethereum) {
                console.log('检测到在dapp中，尝试直接连接');
                // 继续执行后面的连接逻辑
                if (typeof WalletManager.connectWithMetaMaskDirect === 'function') {
                    WalletManager.connectWithMetaMaskDirect();
                } else {
                    // 如果没有直连方法，尝试使用标准方法
                    WalletManager.connectWithMetaMask();
                }
            } else {
                // 如果不在dapp中，显示MetaMask连接指南
                console.log('不在dapp中，显示MetaMask连接指南');
                WalletManager.showMetaMaskMobileGuide();
            }
        };
    }
});
