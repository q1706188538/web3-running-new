/**
 * 代币兑换模块
 * 用于实现游戏金币兑换Web3代币的功能
 */
const TokenExchange = {
    // 是否已初始化
    initialized: false,

    // 当前钱包地址
    walletAddress: null,

    // 当前金币余额
    currentCoins: 0,

    // 当前代币余额
    currentTokens: 0,

    // 兑换配置
    config: {
        TOKEN_NAME: "TWB",
        COINS_PER_TOKEN: 1000,
        MIN_EXCHANGE_AMOUNT: 1,
        MAX_EXCHANGE_AMOUNT: 1000,
        EXCHANGE_FEE_PERCENT: 2
    },

    // 初始化
    init: async function() {
        if (this.initialized) {
            return;
        }

        console.log('初始化代币兑换模块...');

        // 从GameConfig获取配置
        if (typeof GameConfig !== 'undefined' && GameConfig.TOKEN_EXCHANGE) {
            this.config = GameConfig.TOKEN_EXCHANGE;
            console.log('从GameConfig加载代币兑换配置:', this.config);
        }

        // 创建UI
        this.createUI();

        // 添加事件监听器
        this.addEventListeners();

        // 初始化Web3代币合约
        if (typeof Web3TokenContract !== 'undefined') {
            try {
                const initResult = await Web3TokenContract.init();
                if (initResult) {
                    console.log('Web3代币合约初始化成功');

                    // 获取代币信息
                    const tokenInfo = await Web3TokenContract.getTokenInfo();
                    if (tokenInfo) {
                        console.log('获取到代币信息:', tokenInfo);

                        // 更新代币名称
                        if (tokenInfo.symbol) {
                            this.config.TOKEN_NAME = tokenInfo.symbol;
                            console.log('更新代币名称为:', tokenInfo.symbol);

                            // 更新UI中的代币名称
                            const unitLabels = document.querySelectorAll('.token-unit-label');
                            unitLabels.forEach(label => {
                                label.textContent = tokenInfo.symbol;
                            });
                        }
                    }

                    // 监听代币转账事件
                    Web3TokenContract.listenToTransferEvents(eventData => {
                        console.log('收到代币转账事件，更新余额:', eventData);
                        this.updateBalances();
                    });

                    // 添加页面卸载时的清理函数
                    window.addEventListener('beforeunload', () => {
                        console.log('页面即将卸载，停止事件监听');
                        Web3TokenContract.stopListeningToTransferEvents();
                    });
                } else {
                    console.warn('Web3代币合约初始化失败，将使用API模式');
                }
            } catch (error) {
                console.error('初始化Web3代币合约时出错:', error);
            }
        } else {
            console.warn('Web3TokenContract未定义，将使用API模式');
        }

        // 标记为已初始化
        this.initialized = true;

        console.log('代币兑换模块初始化完成');
    },

    // 创建UI
    createUI: function() {
        // 检查是否已存在兑换界面
        if (document.getElementById('token-exchange-container')) {
            return;
        }

        console.log('创建代币兑换UI...');

        // 创建主容器
        const container = document.createElement('div');
        container.id = 'token-exchange-container';
        container.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        `;

        // 创建兑换面板
        const panel = document.createElement('div');
        panel.id = 'token-exchange-panel';
        panel.style.cssText = `
            background-color: #fff;
            border-radius: 10px;
            padding: 20px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        `;

        // 创建标题
        const title = document.createElement('h2');
        title.textContent = '兑换代币';
        title.style.cssText = `
            text-align: center;
            margin-top: 0;
            color: #333;
            font-size: 24px;
        `;

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.id = 'token-exchange-close';
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #fff;
        `;

        // 创建余额信息
        const balanceInfo = document.createElement('div');
        balanceInfo.id = 'token-exchange-balance-info';
        balanceInfo.style.cssText = `
            margin: 15px 0;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
        `;

        // 创建金币余额
        const coinsBalance = document.createElement('p');
        coinsBalance.id = 'token-exchange-coins-balance';
        coinsBalance.innerHTML = '可用金币: <span>0</span>';
        coinsBalance.style.cssText = `
            margin: 5px 0;
            font-size: 16px;
        `;

        // 创建代币余额
        const tokensBalance = document.createElement('p');
        tokensBalance.id = 'token-exchange-tokens-balance';
        tokensBalance.innerHTML = `${this.config.TOKEN_NAME} 余额: <span>0</span>`;
        tokensBalance.style.cssText = `
            margin: 5px 0;
            font-size: 16px;
        `;

        // 添加余额信息
        balanceInfo.appendChild(coinsBalance);
        balanceInfo.appendChild(tokensBalance);

        // 创建兑换表单
        const form = document.createElement('div');
        form.style.cssText = `
            margin: 20px 0;
        `;

        // 创建兑换比例信息
        const rateInfo = document.createElement('p');
        rateInfo.innerHTML = `兑换比例: <strong>${this.config.COINS_PER_TOKEN}</strong> 金币 = <strong>1</strong> ${this.config.TOKEN_NAME}`;
        rateInfo.style.cssText = `
            margin: 10px 0;
            font-size: 14px;
            color: #666;
        `;

        // 创建手续费信息
        const feeInfo = document.createElement('p');
        feeInfo.innerHTML = `手续费: <strong>${this.config.EXCHANGE_FEE_PERCENT}%</strong>`;
        feeInfo.style.cssText = `
            margin: 5px 0 15px 0;
            font-size: 14px;
            color: #666;
        `;

        // 创建输入区域
        const inputGroup = document.createElement('div');
        inputGroup.style.cssText = `
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        `;

        // 创建输入标签
        const inputLabel = document.createElement('label');
        inputLabel.textContent = '兑换数量:';
        inputLabel.style.cssText = `
            margin-right: 10px;
            font-size: 16px;
        `;

        // 创建输入框
        const input = document.createElement('input');
        input.id = 'token-exchange-amount';
        input.type = 'number';
        input.min = this.config.MIN_EXCHANGE_AMOUNT;
        input.max = this.config.MAX_EXCHANGE_AMOUNT;
        input.step = '1';
        input.value = this.config.MIN_EXCHANGE_AMOUNT;
        input.style.cssText = `
            flex: 1;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 16px;
        `;

        // 创建单位标签
        const unitLabel = document.createElement('span');
        unitLabel.textContent = this.config.TOKEN_NAME;
        unitLabel.style.cssText = `
            margin-left: 10px;
            font-size: 16px;
        `;

        // 添加输入组件
        inputGroup.appendChild(inputLabel);
        inputGroup.appendChild(input);
        inputGroup.appendChild(unitLabel);

        // 创建计算结果
        const calculationResult = document.createElement('div');
        calculationResult.id = 'token-exchange-calculation';
        calculationResult.style.cssText = `
            margin: 15px 0;
            padding: 10px;
            background-color: #f0f8ff;
            border-radius: 5px;
            font-size: 14px;
        `;

        // 创建兑换按钮
        const exchangeButton = document.createElement('button');
        exchangeButton.id = 'token-exchange-button';
        exchangeButton.textContent = '兑换';
        exchangeButton.style.cssText = `
            width: 100%;
            padding: 12px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 10px;
        `;

        // 创建结果消息
        const resultMessage = document.createElement('div');
        resultMessage.id = 'token-exchange-result';
        resultMessage.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            display: none;
        `;

        // 组装表单
        form.appendChild(rateInfo);
        form.appendChild(feeInfo);
        form.appendChild(inputGroup);
        form.appendChild(calculationResult);
        form.appendChild(exchangeButton);
        form.appendChild(resultMessage);

        // 组装面板
        panel.appendChild(title);
        panel.appendChild(balanceInfo);
        panel.appendChild(form);

        // 组装容器
        container.appendChild(closeButton);
        container.appendChild(panel);

        // 添加到文档
        document.body.appendChild(container);

        console.log('代币兑换UI创建完成');
    },

    // 添加事件监听器
    addEventListeners: function() {
        console.log('添加代币兑换事件监听器...');

        // 关闭按钮点击事件
        const closeButton = document.getElementById('token-exchange-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hide();
            });
        }

        // 兑换数量输入事件
        const amountInput = document.getElementById('token-exchange-amount');
        if (amountInput) {
            amountInput.addEventListener('input', () => {
                this.updateCalculation();
            });
        }

        // 兑换按钮点击事件
        const exchangeButton = document.getElementById('token-exchange-button');
        if (exchangeButton) {
            exchangeButton.addEventListener('click', () => {
                this.performExchange();
            });
        }

        // 点击背景关闭
        const container = document.getElementById('token-exchange-container');
        if (container) {
            container.addEventListener('click', (event) => {
                if (event.target === container) {
                    this.hide();
                }
            });
        }

        console.log('代币兑换事件监听器添加完成');
    },

    // 显示兑换界面
    show: async function() {
        console.log('显示代币兑换界面');

        // 确保已初始化
        if (!this.initialized) {
            this.init();
        }

        // 获取当前钱包地址
        if (typeof WalletManager !== 'undefined') {
            this.walletAddress = WalletManager.getAccount();
        }

        if (!this.walletAddress) {
            alert('请先连接钱包');
            return;
        }

        // 显示加载中状态
        this.showLoading(true);

        // 更新余额信息
        await this.updateBalances();

        // 更新计算结果
        this.updateCalculation();

        // 显示兑换界面
        const container = document.getElementById('token-exchange-container');
        if (container) {
            container.style.display = 'flex';
        }

        // 隐藏加载中状态
        this.showLoading(false);
    },

    // 隐藏兑换界面
    hide: function() {
        console.log('隐藏代币兑换界面');

        const container = document.getElementById('token-exchange-container');
        if (container) {
            container.style.display = 'none';
        }

        // 清除结果消息
        this.clearResultMessage();
    },

    // 更新余额信息
    updateBalances: async function() {
        console.log('更新余额信息');

        if (!this.walletAddress) {
            console.error('更新余额信息失败: 钱包地址为空');
            return;
        }

        try {
            // 获取金币余额
            if (typeof ApiService !== 'undefined') {
                this.currentCoins = await ApiService.getCoins(this.walletAddress);
                console.log('当前金币余额:', this.currentCoins);
            } else {
                console.error('ApiService不可用，无法获取金币余额');
                return;
            }

            // 获取代币余额 - 优先使用Web3合约
            if (typeof Web3TokenContract !== 'undefined' && Web3TokenContract.tokenContract) {
                try {
                    const balanceResult = await Web3TokenContract.getBalance(this.walletAddress);
                    if (balanceResult) {
                        this.currentTokens = parseFloat(balanceResult.formatted);
                        console.log('从Web3合约获取的代币余额:', this.currentTokens);
                    } else {
                        // 如果Web3获取失败，回退到API
                        this.currentTokens = await ApiService.getTokenBalance(this.walletAddress);
                        console.log('从API获取的代币余额:', this.currentTokens);
                    }
                } catch (error) {
                    console.error('从Web3获取代币余额失败，回退到API:', error);
                    this.currentTokens = await ApiService.getTokenBalance(this.walletAddress);
                    console.log('从API获取的代币余额:', this.currentTokens);
                }
            } else {
                // 如果Web3合约不可用，使用API
                this.currentTokens = await ApiService.getTokenBalance(this.walletAddress);
                console.log('从API获取的代币余额:', this.currentTokens);
            }

            // 更新UI
            const coinsBalanceElement = document.querySelector('#token-exchange-coins-balance span');
            if (coinsBalanceElement) {
                coinsBalanceElement.textContent = this.currentCoins.toLocaleString();
            }

            const tokensBalanceElement = document.querySelector('#token-exchange-tokens-balance span');
            if (tokensBalanceElement) {
                tokensBalanceElement.textContent = this.currentTokens.toLocaleString();
            }
        } catch (error) {
            console.error('更新余额信息出错:', error);
        }
    },

    // 更新计算结果
    updateCalculation: function() {
        console.log('更新计算结果');

        const amountInput = document.getElementById('token-exchange-amount');
        const calculationElement = document.getElementById('token-exchange-calculation');
        const exchangeButton = document.getElementById('token-exchange-button');

        if (!amountInput || !calculationElement || !exchangeButton) {
            console.error('更新计算结果失败: 找不到必要的UI元素');
            return;
        }

        // 获取输入的代币数量
        let tokenAmount = parseInt(amountInput.value) || 0;

        // 限制在允许范围内
        if (tokenAmount < this.config.MIN_EXCHANGE_AMOUNT) {
            tokenAmount = this.config.MIN_EXCHANGE_AMOUNT;
            amountInput.value = tokenAmount;
        } else if (tokenAmount > this.config.MAX_EXCHANGE_AMOUNT) {
            tokenAmount = this.config.MAX_EXCHANGE_AMOUNT;
            amountInput.value = tokenAmount;
        }

        // 计算需要的金币数量
        const requiredCoins = tokenAmount * this.config.COINS_PER_TOKEN;

        // 计算手续费
        const feePercentage = this.config.EXCHANGE_FEE_PERCENT / 100;
        const feeAmount = Math.ceil(requiredCoins * feePercentage);
        const totalCoinsNeeded = requiredCoins + feeAmount;

        // 更新计算结果
        calculationElement.innerHTML = `
            <p>需要金币: <strong>${requiredCoins.toLocaleString()}</strong></p>
            <p>手续费: <strong>${feeAmount.toLocaleString()}</strong> (${this.config.EXCHANGE_FEE_PERCENT}%)</p>
            <p>总计: <strong>${totalCoinsNeeded.toLocaleString()}</strong> 金币</p>
        `;

        // 检查金币是否足够
        const isEnoughCoins = this.currentCoins >= totalCoinsNeeded;

        // 更新兑换按钮状态
        exchangeButton.disabled = !isEnoughCoins;
        exchangeButton.style.opacity = isEnoughCoins ? '1' : '0.5';
        exchangeButton.style.cursor = isEnoughCoins ? 'pointer' : 'not-allowed';

        // 如果金币不足，添加提示
        if (!isEnoughCoins) {
            calculationElement.innerHTML += `
                <p style="color: red; margin-top: 10px;">金币不足，还需要 ${(totalCoinsNeeded - this.currentCoins).toLocaleString()} 金币</p>
            `;
        }
    },

    // 执行兑换
    performExchange: async function() {
        console.log('执行代币兑换');

        if (!this.walletAddress) {
            this.showResultMessage('请先连接钱包', 'error');

            // 尝试连接钱包
            if (typeof Web3TokenContract !== 'undefined') {
                try {
                    console.log('尝试连接钱包...');
                    await Web3TokenContract.initWeb3();

                    // 检查是否成功连接
                    if (Web3TokenContract.userAddress) {
                        this.walletAddress = Web3TokenContract.userAddress;
                        console.log('钱包连接成功:', this.walletAddress);
                        this.showResultMessage('钱包已连接，请再次点击兑换按钮', 'success');
                    } else {
                        console.log('钱包连接失败');
                        return;
                    }
                } catch (error) {
                    console.error('连接钱包失败:', error);
                    return;
                }
            } else {
                return;
            }
        }

        const amountInput = document.getElementById('token-exchange-amount');
        if (!amountInput) {
            this.showResultMessage('找不到兑换数量输入框', 'error');
            return;
        }

        // 获取输入的代币数量
        const tokenAmount = parseInt(amountInput.value) || 0;

        // 验证兑换数量
        if (tokenAmount < this.config.MIN_EXCHANGE_AMOUNT) {
            this.showResultMessage(`兑换数量不能小于 ${this.config.MIN_EXCHANGE_AMOUNT} ${this.config.TOKEN_NAME}`, 'error');
            return;
        }

        if (tokenAmount > this.config.MAX_EXCHANGE_AMOUNT) {
            this.showResultMessage(`兑换数量不能大于 ${this.config.MAX_EXCHANGE_AMOUNT} ${this.config.TOKEN_NAME}`, 'error');
            return;
        }

        // 计算需要的金币数量
        const requiredCoins = tokenAmount * this.config.COINS_PER_TOKEN;
        const feePercentage = this.config.EXCHANGE_FEE_PERCENT / 100;
        const feeAmount = Math.ceil(requiredCoins * feePercentage);
        const totalCoinsNeeded = requiredCoins + feeAmount;

        // 检查金币是否足够
        if (this.currentCoins < totalCoinsNeeded) {
            this.showResultMessage(`金币不足，需要 ${totalCoinsNeeded.toLocaleString()} 金币，当前余额 ${this.currentCoins.toLocaleString()} 金币`, 'error');
            return;
        }

        // 显示加载中状态
        this.showLoading(true);

        try {
            // 使用Web3合约进行兑换
            if (typeof Web3TokenContract !== 'undefined' && Web3TokenContract.tokenContract) {
                console.log('使用Web3合约进行代币兑换...');

                // 获取游戏金币数据
                const gameCoinsToUse = totalCoinsNeeded;

                console.log('兑换参数:');
                console.log('- 玩家地址:', this.walletAddress);
                console.log('- 代币数量:', tokenAmount);
                console.log('- 游戏金币数量:', gameCoinsToUse);

                // 首先从API获取签名
                try {
                    // 获取签名数据
                    let signatureData = null;

                    if (typeof ApiService !== 'undefined') {
                        try {
                            // 从API获取签名
                            signatureData = await ApiService.getExchangeSignature(
                                this.walletAddress,
                                tokenAmount,
                                gameCoinsToUse
                            );

                            if (!signatureData || !signatureData.success) {
                                throw new Error(signatureData?.error || '获取签名失败');
                            }

                            console.log('获取到交易签名:', signatureData);
                        } catch (signError) {
                            console.error('获取交易签名失败:', signError);
                            throw new Error('获取交易签名失败，请稍后重试');
                        }
                    } else {
                        throw new Error('ApiService不可用，无法获取交易签名');
                    }

                    // 调用Web3TokenContract的exchangeCoinsForTokens方法
                    const exchangeResult = await Web3TokenContract.exchangeCoinsForTokensWithSignature(
                        tokenAmount,
                        gameCoinsToUse,
                        signatureData.nonce,
                        signatureData.signature
                    );

                    if (!exchangeResult.success) {
                        throw new Error(exchangeResult.error || '兑换失败，请稍后重试');
                    }

                    // 获取交易结果
                    const tx = exchangeResult.data;

                    console.log('兑换交易已提交:', tx);

                    // 兑换成功
                    this.showResultMessage(`成功兑换 ${tokenAmount} ${this.config.TOKEN_NAME}`, 'success');

                    // 更新余额信息
                    await this.updateBalances();

                    // 更新计算结果
                    this.updateCalculation();

                    // 更新游戏中的金币数量（通过API）
                    if (typeof ApiService !== 'undefined') {
                        try {
                            // 只更新金币数量，不执行兑换
                            await ApiService.updateCoins(this.walletAddress, this.currentCoins - totalCoinsNeeded);
                        } catch (apiError) {
                            console.error('更新游戏金币数量失败:', apiError);
                            this.showResultMessage('代币兑换成功，但游戏金币数量更新失败，请刷新页面', 'warning');
                        }
                    }
                } catch (contractError) {
                    console.error('合约交互失败:', contractError);

                    let errorMessage = '兑换失败，请稍后重试';

                    // 解析错误消息
                    if (contractError.message.includes('user rejected transaction')) {
                        errorMessage = '用户取消了交易';
                    } else if (contractError.message.includes('insufficient funds')) {
                        errorMessage = 'Gas费用不足，请确保您的钱包中有足够的BNB';
                    } else if (contractError.message.includes('execution reverted')) {
                        // 尝试提取合约错误消息
                        const revertReason = contractError.message.match(/reason string: '(.+?)'/);
                        if (revertReason && revertReason[1]) {
                            errorMessage = `合约执行失败: ${revertReason[1]}`;
                        }
                    } else if (contractError.message.includes('nonce already used')) {
                        errorMessage = '交易已被处理，请刷新页面后重试';
                    } else if (contractError.message.includes('invalid signature')) {
                        errorMessage = '签名验证失败，请刷新页面后重试';
                    }

                    this.showResultMessage(errorMessage, 'error');
                }
            } else {
                this.showResultMessage('Web3合约不可用，无法执行兑换', 'error');
            }
        } catch (error) {
            console.error('执行兑换出错:', error);
            this.showResultMessage('兑换过程中发生错误，请稍后重试', 'error');
        } finally {
            // 隐藏加载中状态
            this.showLoading(false);
        }
    },

    // 显示结果消息
    showResultMessage: function(message, type = 'info') {
        console.log(`显示结果消息: ${message}, 类型: ${type}`);

        const resultElement = document.getElementById('token-exchange-result');
        if (!resultElement) {
            console.error('显示结果消息失败: 找不到结果消息元素');
            return;
        }

        // 设置消息内容
        resultElement.textContent = message;

        // 设置消息样式
        resultElement.style.display = 'block';

        // 根据类型设置颜色
        switch (type) {
            case 'success':
                resultElement.style.backgroundColor = '#dff0d8';
                resultElement.style.color = '#3c763d';
                break;
            case 'error':
                resultElement.style.backgroundColor = '#f2dede';
                resultElement.style.color = '#a94442';
                break;
            default:
                resultElement.style.backgroundColor = '#d9edf7';
                resultElement.style.color = '#31708f';
                break;
        }

        // 3秒后自动清除消息
        setTimeout(() => {
            this.clearResultMessage();
        }, 5000);
    },

    // 清除结果消息
    clearResultMessage: function() {
        const resultElement = document.getElementById('token-exchange-result');
        if (resultElement) {
            resultElement.style.display = 'none';
            resultElement.textContent = '';
        }
    },

    // 显示/隐藏加载中状态
    showLoading: function(show) {
        const exchangeButton = document.getElementById('token-exchange-button');
        if (exchangeButton) {
            if (show) {
                exchangeButton.textContent = '处理中...';
                exchangeButton.disabled = true;
                exchangeButton.style.opacity = '0.7';
                exchangeButton.style.cursor = 'not-allowed';
            } else {
                exchangeButton.textContent = '兑换';
                exchangeButton.disabled = false;
                exchangeButton.style.opacity = '1';
                exchangeButton.style.cursor = 'pointer';

                // 更新计算结果会重新设置按钮状态
                this.updateCalculation();
            }
        }
    }
};
