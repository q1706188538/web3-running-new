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

        // 显示选择提示
        const choiceDiv = document.createElement('div');
        choiceDiv.id = 'metamask-choice';
        choiceDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.8); color: white; padding: 20px; border-radius: 10px; z-index: 10000; text-align: center;';

        // 根据设备类型显示不同的选项
        let choiceHTML = '';

        // 检测移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            // 移动设备选项
            choiceHTML = `
                <div style="margin-bottom: 15px;">请选择连接钱包的方式</div>
                <div style="color: #3b99fc; font-size: 12px; margin-bottom: 10px;">推荐: 使用imToken钱包连接</div>
                <button id="choice-imtoken" style="background-color: #3b99fc; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 10px;">使用imToken钱包连接</button>
                <div style="color: #3b99fc; font-size: 12px; margin-bottom: 10px;">或者: 使用WalletConnect连接其他钱包</div>
                <button id="choice-static-walletconnect" style="background-color: #3b99fc; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 10px;">使用WalletConnect连接</button>
                <div style="color: #f5a623; font-size: 12px; margin-bottom: 10px;">或者: 如果您已安装MetaMask，可以尝试直接连接</div>
                <button id="choice-primary" style="background-color: #f5a623; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 10px;">直接打开MetaMask</button>
            `;
        } else {
            // 桌面设备选项
            choiceHTML = `
                <div style="margin-bottom: 15px;">请选择连接钱包的方式</div>
                <div style="color: #3b99fc; font-size: 12px; margin-bottom: 10px;">推荐: 使用WalletConnect连接，兼容性更好</div>
                <button id="choice-static-walletconnect" style="background-color: #3b99fc; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 10px;">使用WalletConnect连接</button>
                <div style="color: #f5a623; font-size: 12px; margin-bottom: 10px;">或者: 如果您已安装MetaMask，可以尝试直接连接</div>
                <button id="choice-primary" style="background-color: #f5a623; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 10px;">直接打开MetaMask</button>
            `;
        }

        // 为Android设备添加Intent选项
        if (isAndroid) {
            choiceHTML += `
                <button id="choice-android" style="background-color: #3b99fc; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 10px;">方式2: Android专用方式</button>
            `;
        }

        // 为iOS设备添加专用选项
        if (isIOS) {
            choiceHTML += `
                <button id="choice-ios" style="background-color: #3b99fc; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 10px;">方式2: iOS专用方式</button>
            `;
        }

        // 添加通用选项
        choiceHTML += `
            <div style="color: #ccc; font-size: 12px; margin-bottom: 10px;">提示: 如果您没有安装钱包，可以下载安装</div>
            <button id="choice-universal" style="background-color: #2ecc71; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 10px;">下载MetaMask钱包</button>
            <button id="choice-walletconnect-info" style="background-color: #3b99fc; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 10px;">什么是WalletConnect?</button>
            <div style="color: #ccc; font-size: 12px; margin-bottom: 10px;">注意: 在HTTP环境下，您可能需要手动打开MetaMask并连接到此网站</div>
            <button id="choice-manual" style="background-color: #9b59b6; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; margin-bottom: 10px;">查看手动连接指南</button>
            <button id="choice-cancel" style="background-color: #e74c3c; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%;">取消</button>
        `;

        choiceDiv.innerHTML = choiceHTML;
        document.body.appendChild(choiceDiv);

        // 添加按钮事件
        // imToken钱包连接按钮事件
        if (isMobile && document.getElementById('choice-imtoken')) {
            document.getElementById('choice-imtoken').onclick = function() {
                document.body.removeChild(choiceDiv);
                // 调用WalletManager的imToken连接方法
                if (typeof WalletManager !== 'undefined' && typeof WalletManager.connectWithImToken === 'function') {
                    WalletManager.connectWithImToken();
                } else {
                    alert('imToken连接方法不可用');
                }
            };
        }

        // 静态WalletConnect按钮事件
        document.getElementById('choice-static-walletconnect').onclick = function() {
            document.body.removeChild(choiceDiv);
            // 显示静态WalletConnect二维码
            if (typeof StaticWalletConnect !== 'undefined' && typeof StaticWalletConnect.showQRCode === 'function') {
                StaticWalletConnect.showQRCode();
            } else {
                alert('静态WalletConnect不可用');
            }
        };

        // 注意：动态WalletConnect按钮已移除

        // MetaMask直接连接按钮事件
        document.getElementById('choice-primary').onclick = function() {
            document.body.removeChild(choiceDiv);
            window.location.href = primaryLink;
        };

        // 为Android设备添加事件
        if (isAndroid && document.getElementById('choice-android')) {
            document.getElementById('choice-android').onclick = function() {
                document.body.removeChild(choiceDiv);

                // 构建Android专用深度链接
                // 使用Intent格式，这在Android上更可靠
                const androidDeepLink = `intent://metamask.io/#Intent;scheme=http;package=io.metamask;end`;
                console.log('Android专用深度链接:', androidDeepLink);

                // 打开Android深度链接
                window.location.href = androidDeepLink;
            };
        }

        // 为iOS设备添加事件
        if (isIOS && document.getElementById('choice-ios')) {
            document.getElementById('choice-ios').onclick = function() {
                document.body.removeChild(choiceDiv);

                // 构建iOS专用深度链接
                // 格式: https://metamask.app.link/dapp/[host][path]
                const host = window.location.host;
                const path = window.location.pathname;
                const search = window.location.search || '';

                // 创建完整的iOS深度链接
                // 这个格式会告诉MetaMask打开指定的dapp URL
                const iosDeepLink = `https://metamask.app.link/dapp/${host}${path}${search}`;
                console.log('iOS专用深度链接:', iosDeepLink);

                // 打开iOS深度链接
                window.location.href = iosDeepLink;
            };
        }

        document.getElementById('choice-universal').onclick = function() {
            document.body.removeChild(choiceDiv);
            window.location.href = universalLink;
        };

        // WalletConnect信息按钮事件
        document.getElementById('choice-walletconnect-info').onclick = function() {
            document.body.removeChild(choiceDiv);
            // 显示WalletConnect信息
            MetaMaskManager.showWalletConnectInfo();
        };

        document.getElementById('choice-manual').onclick = function() {
            document.body.removeChild(choiceDiv);
            // 显示手动连接指南
            MetaMaskManager.showManualConnectGuide();
        };

        document.getElementById('choice-cancel').onclick = function() {
            document.body.removeChild(choiceDiv);
        };
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

            // 创建imToken按钮（优先显示）
            const imTokenButton = document.createElement('button');
            imTokenButton.id = 'imtoken-button';
            imTokenButton.innerHTML = '<img src="https://token.im/favicon.ico" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;">使用imToken钱包连接（推荐）';
            imTokenButton.style.cssText = 'background-color: #3b99fc; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; margin-bottom: 15px; display: flex; align-items: center; justify-content: center;';

            // 添加imToken按钮事件
            imTokenButton.onclick = () => {
                document.body.removeChild(guideBox);
                if (typeof WalletManager !== 'undefined' && typeof WalletManager.connectWithImToken === 'function') {
                    WalletManager.connectWithImToken();
                } else {
                    alert('imToken连接方法不可用');
                }
            };

            // 创建WalletConnect按钮
            const walletConnectButton = document.createElement('button');
            walletConnectButton.id = 'wallet-connect-button';
            walletConnectButton.innerHTML = '<img src="https://docs.walletconnect.com/img/walletconnect-logo.svg" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;">使用WalletConnect连接';
            walletConnectButton.style.cssText = 'background-color: #3b99fc; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; margin-bottom: 15px; display: flex; align-items: center; justify-content: center;';

            // 添加WalletConnect按钮事件
            walletConnectButton.onclick = () => {
                document.body.removeChild(guideBox);
                // 显示静态WalletConnect二维码
                if (typeof StaticWalletConnect !== 'undefined' && typeof StaticWalletConnect.showQRCode === 'function') {
                    StaticWalletConnect.showQRCode();
                } else {
                    alert('WalletConnect不可用');
                }
            };

            // 创建WalletConnect信息按钮
            const walletConnectInfoButton = document.createElement('button');
            walletConnectInfoButton.id = 'wallet-connect-info-button';
            walletConnectInfoButton.innerHTML = '什么是WalletConnect?';
            walletConnectInfoButton.style.cssText = 'background: none; color: #3b99fc; border: none; padding: 5px; margin-bottom: 15px; cursor: pointer; text-decoration: underline; font-size: 12px;';

            // 添加WalletConnect信息按钮事件
            walletConnectInfoButton.onclick = () => {
                document.body.removeChild(guideBox);
                MetaMaskManager.showWalletConnectInfo();
            };

            // 创建MetaMask直连按钮
            const metamaskDirectButton = document.createElement('button');
            metamaskDirectButton.id = 'metamask-direct-button';
            metamaskDirectButton.innerHTML = '<img src="https://metamask.io/images/metamask-fox.svg" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;">打开MetaMask应用';
            metamaskDirectButton.style.cssText = 'background-color: #f5a623; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; margin-bottom: 15px; display: flex; align-items: center; justify-content: center;';

            // 添加MetaMask直连按钮事件
            metamaskDirectButton.onclick = () => {
                document.body.removeChild(guideBox);
                WalletManager.connectWithMetaMaskDirect();
            };

            // 创建MetaMask下载按钮
            const metamaskDownloadButton = document.createElement('a');
            metamaskDownloadButton.href = 'https://metamask.io/download.html';
            metamaskDownloadButton.target = '_blank';
            metamaskDownloadButton.innerHTML = '<img src="https://metamask.io/images/metamask-fox.svg" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;">下载MetaMask';
            metamaskDownloadButton.style.cssText = 'background-color: #e2761b; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; text-decoration: none;';

            // 注意：WalletConnect按钮事件已在上面定义

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
            guideBox.appendChild(imTokenButton);
            guideBox.appendChild(walletConnectButton);
            guideBox.appendChild(walletConnectInfoButton);
            guideBox.appendChild(metamaskDirectButton);
            guideBox.appendChild(metamaskDownloadButton);
            guideBox.appendChild(closeButton);

            // 添加到页面
            document.body.appendChild(guideBox);
        };
    }
});
