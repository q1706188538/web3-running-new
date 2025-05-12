/**
 * 简化版WalletConnect连接
 * 不依赖于官方库的QR码模态框，直接使用自定义二维码
 */
const SimpleWalletConnect = {
    // 连接状态
    connected: false,
    
    // 当前账户
    account: null,
    
    // 当前链ID
    chainId: null,
    
    // 提供商实例
    provider: null,
    
    // 初始化
    init: function() {
        console.log('初始化SimpleWalletConnect...');
    },
    
    // 连接钱包
    connect: async function() {
        try {
            console.log('尝试使用SimpleWalletConnect连接...');
            
            // 显示加载中状态
            this.showLoadingStatus();
            
            // 检查WalletConnect库是否已加载
            if (typeof window.WalletConnectProvider === 'undefined') {
                console.log('WalletConnect库未加载，尝试加载...');
                await this.loadWalletConnectLibrary();
            }
            
            // 创建WalletConnect提供商
            console.log('创建WalletConnect提供商...');
            
            // 检查全局变量
            let ProviderClass;
            if (typeof window.WalletConnectProvider !== 'undefined') {
                console.log('使用全局WalletConnectProvider变量');
                
                // 检查是否需要使用default属性
                ProviderClass = window.WalletConnectProvider;
                if (ProviderClass.default) {
                    ProviderClass = ProviderClass.default;
                    console.log('使用WalletConnectProvider.default');
                }
            } else {
                throw new Error('WalletConnectProvider未定义，请刷新页面重试');
            }
            
            // 创建提供商
            this.provider = new ProviderClass({
                rpc: {
                    1: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // 以太坊主网
                    56: 'https://bsc-dataseed.binance.org/', // BSC主网
                    97: 'https://data-seed-prebsc-1-s1.binance.org:8545/' // BSC测试网
                },
                bridge: 'https://bridge.walletconnect.org',
                // 禁用官方QR码模态框
                qrcodeModal: {
                    open: function() { console.log('QR码模态框打开请求被忽略'); },
                    close: function() { console.log('QR码模态框关闭请求被忽略'); }
                }
            });
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 获取连接URI
            console.log('获取连接URI...');
            let uri;
            
            // 尝试获取URI
            if (this.provider._walletConnector && this.provider._walletConnector.uri) {
                uri = this.provider._walletConnector.uri;
                console.log('成功获取URI:', uri);
            } else {
                // 如果无法直接获取URI，尝试创建会话
                console.log('无法直接获取URI，尝试创建会话...');
                
                // 创建一个Promise来等待URI
                const uriPromise = new Promise((resolve, reject) => {
                    // 监听连接器创建事件
                    const checkInterval = setInterval(() => {
                        if (this.provider._walletConnector && this.provider._walletConnector.uri) {
                            clearInterval(checkInterval);
                            resolve(this.provider._walletConnector.uri);
                        }
                    }, 100);
                    
                    // 设置超时
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        reject(new Error('获取URI超时'));
                    }, 5000);
                });
                
                // 触发连接
                try {
                    this.provider.enable().catch(e => console.log('启用提供商时出错，忽略:', e));
                    uri = await uriPromise;
                    console.log('通过创建会话获取URI:', uri);
                } catch (error) {
                    console.error('创建会话获取URI失败:', error);
                    throw new Error('无法获取连接URI');
                }
            }
            
            // 隐藏加载中状态
            this.hideLoadingStatus();
            
            // 显示二维码
            if (uri) {
                this.showQRCode(uri);
                
                // 检查是否在移动设备上
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                if (isMobile) {
                    // 在移动设备上尝试打开钱包应用
                    this.openWalletApp(uri);
                }
                
                // 等待连接
                console.log('等待钱包连接...');
                
                // 创建一个Promise来等待连接
                const connectionPromise = new Promise((resolve, reject) => {
                    // 设置连接事件监听器
                    const onConnect = (chainId) => {
                        console.log('WalletConnect已连接，链ID:', chainId);
                        this.provider.off('connect', onConnect);
                        resolve(chainId);
                    };
                    
                    // 设置断开连接事件监听器
                    const onDisconnect = (error) => {
                        console.log('WalletConnect已断开连接:', error);
                        this.provider.off('disconnect', onDisconnect);
                        reject(new Error('钱包断开连接'));
                    };
                    
                    // 添加事件监听器
                    this.provider.on('connect', onConnect);
                    this.provider.on('disconnect', onDisconnect);
                    
                    // 设置超时
                    setTimeout(() => {
                        this.provider.off('connect', onConnect);
                        this.provider.off('disconnect', onDisconnect);
                        reject(new Error('连接超时，请重试'));
                    }, 300000); // 5分钟超时
                });
                
                // 等待连接
                try {
                    const chainId = await connectionPromise;
                    this.chainId = chainId;
                    
                    // 获取账户
                    const accounts = this.provider.accounts || await this.provider.request({ method: 'eth_accounts' });
                    if (accounts && accounts.length > 0) {
                        this.account = accounts[0];
                        this.connected = true;
                        
                        // 通知WalletManager
                        if (typeof WalletManager !== 'undefined') {
                            WalletManager.handleWalletConnectSuccess(this.provider, this.account, this.chainId);
                        }
                        
                        return true;
                    } else {
                        throw new Error('未能获取账户');
                    }
                } catch (error) {
                    console.error('等待连接时出错:', error);
                    throw error;
                }
            } else {
                throw new Error('无法获取连接URI');
            }
        } catch (error) {
            console.error('SimpleWalletConnect连接失败:', error);
            
            // 隐藏加载中状态
            this.hideLoadingStatus();
            
            // 显示错误提示
            alert('连接WalletConnect失败: ' + (error.message || '未知错误'));
            
            return false;
        }
    },
    
    // 设置事件监听器
    setupEventListeners: function() {
        if (!this.provider) return;
        
        // 监听账户变化
        this.provider.on('accountsChanged', (accounts) => {
            console.log('WalletConnect账户已更改:', accounts);
            
            if (accounts.length > 0) {
                this.account = accounts[0];
                
                // 通知WalletManager
                if (typeof WalletManager !== 'undefined') {
                    WalletManager.handleAccountsChanged(accounts);
                }
            } else {
                this.connected = false;
                this.account = null;
                
                // 通知WalletManager
                if (typeof WalletManager !== 'undefined') {
                    WalletManager.disconnectWallet();
                }
            }
        });
        
        // 监听链变化
        this.provider.on('chainChanged', (chainId) => {
            console.log('WalletConnect链ID已更改:', chainId);
            this.chainId = chainId;
            
            // 通知WalletManager
            if (typeof WalletManager !== 'undefined') {
                WalletManager.handleChainChanged(chainId);
            }
        });
        
        // 监听断开连接
        this.provider.on('disconnect', (error) => {
            console.log('WalletConnect已断开连接:', error);
            this.connected = false;
            this.account = null;
            
            // 通知WalletManager
            if (typeof WalletManager !== 'undefined') {
                WalletManager.disconnectWallet();
            }
        });
    },
    
    // 加载WalletConnect库
    loadWalletConnectLibrary: async function() {
        return new Promise((resolve, reject) => {
            // 设置超时处理
            const timeout = setTimeout(() => {
                reject(new Error('加载WalletConnect库超时'));
            }, 15000); // 15秒超时
            
            // 加载WalletConnect Provider
            const wcScript = document.createElement('script');
            wcScript.src = 'https://unpkg.com/@walletconnect/web3-provider@1.7.8/dist/umd/index.min.js';
            wcScript.onload = () => {
                console.log('WalletConnect Provider加载成功');
                clearTimeout(timeout);
                resolve();
            };
            wcScript.onerror = (error) => {
                console.error('加载WalletConnect Provider失败:', error);
                clearTimeout(timeout);
                reject(new Error('加载WalletConnect Provider失败'));
            };
            document.head.appendChild(wcScript);
        });
    },
    
    // 显示加载中状态
    showLoadingStatus: function() {
        // 创建加载中提示
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'simple-wallet-connect-loading';
        loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.8); color: white; padding: 20px; border-radius: 10px; z-index: 10000; text-align: center;';
        loadingDiv.innerHTML = '<div style="margin-bottom: 15px;">正在初始化WalletConnect...</div><div class="spinner" style="border: 4px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top: 4px solid white; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto;"></div><div style="margin-top: 15px; font-size: 12px;">请稍候...</div>';
        
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
        const loadingDiv = document.getElementById('simple-wallet-connect-loading');
        if (loadingDiv) {
            document.body.removeChild(loadingDiv);
        }
    },
    
    // 显示二维码
    showQRCode: function(uri) {
        // 创建二维码容器
        const qrCodeContainer = document.createElement('div');
        qrCodeContainer.id = 'simple-wallet-connect-qrcode';
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
        qrCodeImage.id = 'simple-qrcode-image';
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
        closeButton.textContent = '取消连接';
        closeButton.style.cssText = 'background-color: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;';
        
        // 添加关闭按钮事件
        closeButton.onclick = () => {
            // 移除二维码容器
            document.body.removeChild(qrCodeContainer);
            
            // 断开连接
            if (this.provider) {
                try {
                    this.provider.disconnect();
                } catch (error) {
                    console.error('断开连接时出错:', error);
                }
            }
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
                new window.QRCode(document.getElementById('simple-qrcode-image'), {
                    text: uri,
                    width: 250,
                    height: 250,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: window.QRCode.CorrectLevel.H
                });
            } else {
                console.error('QRCode库加载失败');
                document.getElementById('simple-qrcode-image').textContent = '二维码生成失败，请使用复制链接功能';
            }
        };
        script.onerror = function() {
            console.error('加载QRCode库失败');
            document.getElementById('simple-qrcode-image').textContent = '二维码生成失败，请使用复制链接功能';
        };
        document.head.appendChild(script);
    },
    
    // 在移动设备上打开钱包应用
    openWalletApp: function(uri) {
        console.log('尝试在移动设备上打开钱包应用...');
        
        // 尝试使用多种方式打开URI
        try {
            // 方式1：使用iframe
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
            
            // 方式3：使用location.href
            setTimeout(() => {
                try {
                    window.location.href = uri;
                } catch (e) {
                    console.error('使用location.href打开URI失败:', e);
                }
            }, 1000);
        } catch (error) {
            console.error('打开钱包应用失败:', error);
        }
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    SimpleWalletConnect.init();
});
