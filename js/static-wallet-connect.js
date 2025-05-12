/**
 * 静态WalletConnect二维码生成器
 * 不依赖WebSocket连接，直接生成静态二维码
 */
const StaticWalletConnect = {
    // 初始化
    init: function() {
        console.log('初始化StaticWalletConnect...');
    },

    // 显示静态二维码
    showQRCode: function() {
        console.log('显示静态WalletConnect二维码...');

        // 创建二维码容器
        const qrCodeContainer = document.createElement('div');
        qrCodeContainer.id = 'static-wallet-connect-qrcode';
        qrCodeContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.8); display: flex; justify-content: center; align-items: center; z-index: 10000; overflow-y: auto;';

        // 创建二维码内容
        const qrCodeContent = document.createElement('div');
        qrCodeContent.style.cssText = 'background-color: white; padding: 15px; border-radius: 10px; text-align: center; max-width: 90%; width: 320px; margin: 20px auto;';

        // 创建标题
        const title = document.createElement('div');
        title.textContent = '使用WalletConnect连接';
        title.style.cssText = 'margin-top: 0; margin-bottom: 5px; color: #3b99fc; font-size: 16px; font-weight: bold;';

        // 创建说明
        const description = document.createElement('div');
        description.style.cssText = 'margin-bottom: 15px; color: #333;';

        // 添加简化说明
        description.innerHTML = `
            <p style="margin-bottom: 5px; font-size: 12px;">在钱包中选择WalletConnect，输入下方连接代码</p>
        `;

        // 创建钱包选择器
        const walletSelector = document.createElement('div');
        walletSelector.style.cssText = 'margin-bottom: 15px;';

        // 添加常用钱包选项
        const wallets = [
            { name: 'MetaMask', icon: 'https://metamask.io/images/metamask-fox.svg', url: 'https://metamask.io/download.html' },
            { name: 'TokenPocket', icon: 'https://tokenpocket.pro/favicon.ico', url: 'https://tokenpocket.pro/' },
            { name: 'imToken', icon: 'https://token.im/favicon.ico', url: 'https://token.im/' },
            { name: 'Trust Wallet', icon: 'https://trustwallet.com/assets/images/favicon.png', url: 'https://trustwallet.com/' },
            { name: 'ATON', icon: 'https://devdocs.platon.network/img/logo.svg', url: 'https://aton.platon.network/' },
            { name: 'Bitkeep', icon: 'https://bitkeep.com/favicon.ico', url: 'https://bitkeep.com/' },
            { name: 'Coin98', icon: 'https://coin98.com/favicon.ico', url: 'https://coin98.com/' },
            { name: 'Rainbow', icon: 'https://rainbow.me/favicon.ico', url: 'https://rainbow.me/' }
        ];

        // 创建钱包图标 - 使用更紧凑的布局
        const walletIcons = document.createElement('div');
        walletIcons.style.cssText = 'display: flex; flex-wrap: wrap; justify-content: center; margin-bottom: 10px;';

        // 只显示前4个钱包图标
        const topWallets = wallets.slice(0, 4);

        // 显示钱包图标
        topWallets.forEach(wallet => {
            const walletIcon = document.createElement('a');
            walletIcon.href = wallet.url;
            walletIcon.target = '_blank';
            walletIcon.style.cssText = 'margin: 5px; text-decoration: none; text-align: center; width: 60px;';

            const icon = document.createElement('img');
            icon.src = wallet.icon;
            icon.alt = wallet.name;
            icon.style.cssText = 'width: 30px; height: 30px; border-radius: 8px; object-fit: contain; background-color: #f5f5f5; padding: 3px;';

            // 添加图片加载错误处理
            icon.onerror = function() {
                // 如果图标加载失败，使用文本替代
                this.style.display = 'none';
                const textIcon = document.createElement('div');
                textIcon.textContent = wallet.name.charAt(0);
                textIcon.style.cssText = 'width: 30px; height: 30px; border-radius: 8px; background-color: #3b99fc; color: white; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 16px;';
                this.parentNode.insertBefore(textIcon, this);
            };

            const name = document.createElement('div');
            name.textContent = wallet.name;
            name.style.cssText = 'font-size: 10px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

            walletIcon.appendChild(icon);
            walletIcon.appendChild(name);
            walletIcons.appendChild(walletIcon);
        });

        walletSelector.appendChild(walletIcons);

        // 创建二维码图像
        const qrCodeImage = document.createElement('div');
        qrCodeImage.id = 'static-qrcode-image';
        qrCodeImage.style.cssText = 'width: 200px; height: 200px; margin: 0 auto 10px auto; background-color: white; display: flex; justify-content: center; align-items: center;';

        // 添加加载中动画
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'spinner';
        loadingSpinner.style.cssText = 'border: 4px solid rgba(59, 153, 252, 0.3); border-radius: 50%; border-top: 4px solid #3b99fc; width: 40px; height: 40px; animation: spin 1s linear infinite;';
        qrCodeImage.appendChild(loadingSpinner);

        // 添加旋转动画样式
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }

        // 创建连接代码输入框 - 更紧凑的版本
        const codeInput = document.createElement('div');
        codeInput.style.cssText = 'margin-bottom: 10px;';

        const codeLabel = document.createElement('div');
        codeLabel.textContent = '连接代码:';
        codeLabel.style.cssText = 'font-size: 12px; color: #333; margin-bottom: 3px; text-align: left; font-weight: bold;';

        const codeValue = document.createElement('div');
        codeValue.id = 'static-connection-code';
        codeValue.textContent = '生成中...';
        codeValue.style.cssText = 'word-break: break-all; font-size: 12px; color: #3b99fc; background-color: #f5f5f5; padding: 8px; border-radius: 5px; text-align: center; font-family: monospace; font-weight: bold; border: 1px solid #3b99fc; max-height: 60px; overflow-y: auto;';

        codeInput.appendChild(codeLabel);
        codeInput.appendChild(codeValue);

        // 创建按钮容器 - 使用固定定位，确保始终可见
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'position: sticky; bottom: 0; background-color: white; padding-top: 5px; border-top: 1px solid #eee;';

        // 创建复制按钮
        const copyButton = document.createElement('button');
        copyButton.textContent = '复制连接代码';
        copyButton.style.cssText = 'background-color: #3b99fc; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-bottom: 8px; width: 100%; font-size: 14px;';

        // 添加复制按钮事件
        copyButton.onclick = function() {
            const code = document.getElementById('static-connection-code').textContent;
            if (code === '生成中...' || code === '生成失败') {
                alert('连接代码尚未生成，请稍候再试');
                return;
            }

            // 使用现代Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(code)
                    .then(() => {
                        // 显示复制成功提示
                        copyButton.textContent = '✓ 已复制';
                        copyButton.style.backgroundColor = '#2ecc71';

                        // 2秒后恢复按钮状态
                        setTimeout(() => {
                            copyButton.textContent = '复制连接代码';
                            copyButton.style.backgroundColor = '#3b99fc';
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('使用Clipboard API复制失败:', err);
                        // 回退到传统方法
                        fallbackCopy(code);
                    });
            } else {
                // 回退到传统方法
                fallbackCopy(code);
            }

            // 传统复制方法
            function fallbackCopy(text) {
                // 创建临时输入框
                const tempInput = document.createElement('input');
                tempInput.value = text;
                tempInput.style.position = 'absolute';
                tempInput.style.left = '-9999px';
                document.body.appendChild(tempInput);
                tempInput.select();

                // 复制文本
                try {
                    // 虽然已弃用，但作为后备方案仍然有用
                    const success = document.execCommand('copy');
                    if (success) {
                        // 显示复制成功提示
                        copyButton.textContent = '✓ 已复制';
                        copyButton.style.backgroundColor = '#2ecc71';

                        // 2秒后恢复按钮状态
                        setTimeout(() => {
                            copyButton.textContent = '复制连接代码';
                            copyButton.style.backgroundColor = '#3b99fc';
                        }, 2000);
                    } else {
                        alert('复制失败，请手动复制连接代码');
                    }
                } catch (err) {
                    console.error('复制失败:', err);
                    alert('复制失败，请手动复制连接代码');
                }

                // 移除临时输入框
                document.body.removeChild(tempInput);
            }
        };

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = 'background-color: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; font-size: 14px;';

        // 添加按钮到容器
        buttonContainer.appendChild(copyButton);
        buttonContainer.appendChild(closeButton);

        // 添加关闭按钮事件
        closeButton.onclick = function() {
            document.body.removeChild(qrCodeContainer);
        };

        // 组装二维码内容
        qrCodeContent.appendChild(title);
        qrCodeContent.appendChild(description);
        qrCodeContent.appendChild(walletSelector);
        qrCodeContent.appendChild(qrCodeImage);
        qrCodeContent.appendChild(codeInput);
        qrCodeContent.appendChild(buttonContainer);

        // 添加二维码内容到容器
        qrCodeContainer.appendChild(qrCodeContent);

        // 添加到页面
        document.body.appendChild(qrCodeContainer);

        // 生成静态连接代码和二维码
        this.generateStaticCode();
    },

    // 生成静态连接代码和二维码
    generateStaticCode: function() {
        // 生成随机的连接代码
        const code = this.generateRandomCode();
        console.log('生成的静态连接代码:', code);

        // 更新连接代码显示
        const codeElement = document.getElementById('static-connection-code');
        if (codeElement) {
            codeElement.textContent = code;
        }

        // 生成二维码
        this.generateQRCode(code);
    },

    // 生成随机的连接代码
    generateRandomCode: function() {
        // 根据ATON文档生成一个标准的WalletConnect URI
        // 格式: wc:{随机ID}@1?bridge={bridge地址}&key={随机密钥}

        // 生成随机ID (64位十六进制)
        const id = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // 生成随机密钥 (32位十六进制)
        const key = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // 使用多个可靠的bridge地址
        const bridges = [
            'https://bridge.walletconnect.org',
            'https://bridge.walletconnect.com',
            'https://safe-walletconnect.gnosis.io'
        ];

        // 随机选择一个bridge地址
        const bridge = bridges[Math.floor(Math.random() * bridges.length)];

        // 构建URI
        return `wc:${id}@1?bridge=${encodeURIComponent(bridge)}&key=${key}`;
    },

    // 生成二维码
    generateQRCode: function(code) {
        const qrCodeImage = document.getElementById('static-qrcode-image');
        if (!qrCodeImage) return;

        // 清空加载动画
        qrCodeImage.innerHTML = '';

        try {
            // 创建一个图像元素来显示二维码
            const qrImg = document.createElement('img');
            qrImg.style.cssText = 'width: 200px; height: 200px; display: block; margin: 0 auto;';

            // 使用Google Chart API生成二维码
            const googleChartUrl = 'https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=' + encodeURIComponent(code) + '&chld=H|0';
            qrImg.src = googleChartUrl;

            // 添加加载错误处理
            qrImg.onerror = () => {
                console.error('Google Chart API二维码加载失败，尝试使用QRServer API');

                // 尝试使用QRServer API作为备选
                const qrServerUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(code);
                qrImg.src = qrServerUrl;

                // 如果QRServer API也失败
                qrImg.onerror = () => {
                    console.error('QRServer API二维码加载也失败，尝试使用本地生成方法');

                    // 移除图像元素
                    if (qrCodeImage.contains(qrImg)) {
                        qrCodeImage.removeChild(qrImg);
                    }

                    // 使用本地方法生成简单的二维码替代
                    this.generateSimpleQRCodeFallback(qrCodeImage, code);
                };
            };

            // 添加到容器
            qrCodeImage.appendChild(qrImg);

            // 添加说明文本
            const textElement = document.createElement('div');
            textElement.style.cssText = 'margin-top: 10px; font-size: 12px; color: #666; text-align: center;';
            textElement.textContent = '请使用钱包扫描二维码或使用下方的连接代码';
            qrCodeImage.appendChild(textElement);
        } catch (error) {
            console.error('生成二维码失败:', error);
            this.showQRCodeError(qrCodeImage);
        }
    },

    // 使用本地方法生成简单的二维码替代
    generateSimpleQRCodeFallback: function(element, code) {
        try {
            // 创建一个canvas元素
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;

            // 获取2D上下文
            const ctx = canvas.getContext('2d');

            // 设置背景为白色
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 绘制边框
            ctx.strokeStyle = '#3b99fc';
            ctx.lineWidth = 2;
            ctx.strokeRect(10, 10, 180, 180);

            // 绘制WalletConnect文本
            ctx.fillStyle = '#3b99fc';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('WalletConnect', canvas.width / 2, 40);

            // 绘制连接代码的前10个字符
            if (code && code.length > 10) {
                ctx.font = '14px monospace';
                ctx.fillStyle = '#000000';
                ctx.fillText(code.substring(0, 10) + '...', canvas.width / 2, 70);
            }

            // 绘制提示文本
            ctx.font = '12px Arial';
            ctx.fillStyle = '#666666';
            ctx.fillText('请使用下方连接代码', canvas.width / 2, 100);
            ctx.fillText('在钱包中手动连接', canvas.width / 2, 120);

            // 添加到元素
            element.appendChild(canvas);

            // 添加说明文本
            const textElement = document.createElement('div');
            textElement.style.cssText = 'margin-top: 10px; font-size: 12px; color: #666; text-align: center;';
            textElement.textContent = '二维码生成失败，请使用下方的连接代码';
            element.appendChild(textElement);
        } catch (error) {
            console.error('生成简单二维码失败:', error);
            this.showQRCodeError(element);
        }
    },

    // 显示二维码错误
    showQRCodeError: function(element) {
        element.innerHTML = '';

        // 创建错误提示
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #f8f8f8; border-radius: 5px;';

        // 创建WalletConnect图标
        const wcIcon = document.createElement('img');
        wcIcon.src = 'https://docs.walletconnect.com/img/walletconnect-logo.svg';
        wcIcon.alt = 'WalletConnect';
        wcIcon.style.cssText = 'width: 60px; height: 60px; margin-bottom: 10px;';

        // 添加图片加载错误处理
        wcIcon.onerror = function() {
            this.style.display = 'none';
            const textIcon = document.createElement('div');
            textIcon.textContent = 'WC';
            textIcon.style.cssText = 'width: 60px; height: 60px; border-radius: 30px; background-color: #3b99fc; color: white; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 24px; margin-bottom: 10px;';
            errorDiv.insertBefore(textIcon, errorDiv.firstChild);
        };

        // 创建错误文本
        const errorText = document.createElement('div');
        errorText.textContent = '二维码生成失败';
        errorText.style.cssText = 'font-size: 14px; color: #e74c3c; margin-bottom: 5px;';

        // 创建提示文本
        const tipText = document.createElement('div');
        tipText.textContent = '请使用下方的连接代码';
        tipText.style.cssText = 'font-size: 12px; color: #666;';

        // 组装错误提示
        errorDiv.appendChild(wcIcon);
        errorDiv.appendChild(errorText);
        errorDiv.appendChild(tipText);

        // 添加到元素
        element.appendChild(errorDiv);
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    StaticWalletConnect.init();
});
