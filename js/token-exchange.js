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
        COINS_PER_TOKEN: 100,
        MIN_EXCHANGE_AMOUNT: 1,
        MAX_EXCHANGE_AMOUNT: 100000000,
        EXCHANGE_FEE_PERCENT: 0, // 不再使用金币税
        TOKEN_TAX_PERCENT: 2 // 代币税率，2%
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

        // 添加对最小兑换金额更新的监听
        document.addEventListener('minExchangeAmountUpdated', (event) => {
            const minAmount = event.detail.minExchangeAmount;
            console.log('收到最小兑换金额更新:', minAmount);

            // 更新本地配置
            this.config.MIN_EXCHANGE_AMOUNT = minAmount;

            // 更新UI中的最小兑换金额显示
            this.updateMinExchangeAmountUI(minAmount);
        });

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

                    // 获取代币税率
                    try {
                        const taxRates = await Web3TokenContract.getTokenTaxRates();
                        if (taxRates) {
                            console.log('获取到代币税率:', taxRates);

                            // 更新兑换代币税率
                            if (taxRates.exchangeTokenTaxRate !== undefined) {
                                this.config.TOKEN_TAX_PERCENT = taxRates.exchangeTokenTaxRate / 100;
                                console.log('更新兑换代币税率为:', this.config.TOKEN_TAX_PERCENT, '%');

                                // 更新UI中的代币税率
                                // 在初始化时，UI可能还没有创建，所以我们需要在show方法中更新
                                this.updateTaxRateUI();
                            }
                        }
                    } catch (taxError) {
                        console.warn('获取代币税率失败:', taxError);
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

        // 创建代币税信息
        const taxInfo = document.createElement('p');
        taxInfo.id = 'token-exchange-tax-info';
        taxInfo.innerHTML = `代币税: <strong>${this.config.TOKEN_TAX_PERCENT}%</strong>`;
        taxInfo.style.cssText = `
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

        // 创建输入框 - 使用简单的数字输入
        const input = document.createElement('input');
        input.id = 'token-exchange-amount';
        input.type = 'text'; // 使用text类型，允许退格键
        input.inputMode = 'numeric'; // 在移动设备上显示数字键盘
        input.value = this.config.MIN_EXCHANGE_AMOUNT;
        input.autocomplete = 'off'; // 禁用自动完成
        input.spellcheck = false; // 禁用拼写检查

        // 添加keydown事件，确保退格键可用
        input.addEventListener('keydown', function(event) {
            if (event.key === 'Backspace' || event.key === 'Delete') {
                // 阻止事件冒泡，防止被全局处理器捕获
                event.stopPropagation();
            }
        }, true);

        // 添加input事件，处理输入并更新计算结果
        input.addEventListener('input', function() {
            // 过滤非数字字符
            let numericValue = '';
            let cursorPosition = this.selectionStart;
            let hadNonNumeric = false;

            for (let i = 0; i < this.value.length; i++) {
                if (this.value[i] >= '0' && this.value[i] <= '9') {
                    numericValue += this.value[i];
                } else {
                    hadNonNumeric = true;
                    if (i < cursorPosition) {
                        cursorPosition--;
                    }
                }
            }

            // 只有在有非数字字符时才更新值
            if (hadNonNumeric) {
                this.value = numericValue;
                this.setSelectionRange(cursorPosition, cursorPosition);
            }

            // 更新计算结果
            TokenExchange.updateCalculation();
        });

        // 在失去焦点时验证输入值
        input.addEventListener('blur', function() {
            // 如果输入框为空，设置为最小值
            if (this.value === '') {
                this.value = TokenExchange.config.MIN_EXCHANGE_AMOUNT.toString();
            } else {
                // 转换为整数
                let value = parseInt(this.value);

                // 确保在允许范围内
                if (value < TokenExchange.config.MIN_EXCHANGE_AMOUNT) {
                    this.value = TokenExchange.config.MIN_EXCHANGE_AMOUNT.toString();
                } else if (value > TokenExchange.config.MAX_EXCHANGE_AMOUNT) {
                    this.value = TokenExchange.config.MAX_EXCHANGE_AMOUNT.toString();
                } else {
                    this.value = value.toString();
                }
            }

            // 更新计算结果
            TokenExchange.updateCalculation();
        });

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
        form.appendChild(taxInfo);
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

        // 兑换数量输入事件 - 已在输入框创建时添加

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

        // 检查localStorage中是否有测试页面保存的值
        const testValue = localStorage.getItem('inputTestValue');
        if (testValue) {
            // 找到输入框并设置值
            const input = document.getElementById('token-exchange-amount');
            if (input) {
                input.value = testValue;
                // 清除localStorage中的值，避免重复使用
                localStorage.removeItem('inputTestValue');
                console.log('从测试页面应用值:', testValue);
            }
        }

        // 更新计算结果
        this.updateCalculation();

        // 更新代币税率UI
        this.updateTaxRateUI();

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

            // 获取代币余额 - 只使用Web3合约
            if (typeof Web3TokenContract !== 'undefined' && Web3TokenContract.tokenContract) {
                try {
                    const balanceResult = await Web3TokenContract.getBalance(this.walletAddress);
                    if (balanceResult) {
                        this.currentTokens = parseFloat(balanceResult.balanceInEther);
                        console.log('从Web3合约获取的代币余额:', this.currentTokens);
                    } else {
                        console.error('获取代币余额失败');
                        this.showResultMessage('获取代币余额失败，请刷新页面后重试', 'error');
                        this.currentTokens = 0;
                    }
                } catch (error) {
                    console.error('获取代币余额失败:', error);
                    this.showResultMessage('获取代币余额失败: ' + error.message, 'error');
                    this.currentTokens = 0;
                }
            } else {
                console.error('Web3合约不可用，无法获取代币余额');
                this.showResultMessage('Web3合约不可用，无法获取代币余额', 'error');
                this.currentTokens = 0;
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
        let tokenAmount = 0;

        // 如果输入框为空，使用0
        if (amountInput.value === '') {
            tokenAmount = 0;
        } else {
            // 尝试解析为整数
            let value = 0;
            try {
                // 过滤非数字字符
                let numericValue = '';
                for (let i = 0; i < amountInput.value.length; i++) {
                    if (amountInput.value[i] >= '0' && amountInput.value[i] <= '9') {
                        numericValue += amountInput.value[i];
                    }
                }

                if (numericValue !== '') {
                    value = parseInt(numericValue);
                }
            } catch (e) {
                value = 0;
            }

            tokenAmount = value;
        }

        // 计算需要的金币数量（不再有金币税）
        const requiredCoins = tokenAmount * this.config.COINS_PER_TOKEN;
        const totalCoinsNeeded = requiredCoins; // 不再有金币税

        // 计算代币税
        const tokenTaxPercentage = this.config.TOKEN_TAX_PERCENT / 100;
        const tokenTaxAmount = tokenAmount * tokenTaxPercentage;
        const actualTokensReceived = tokenAmount - tokenTaxAmount;

        // 更新计算结果
        calculationElement.innerHTML = `
            <p>需要支付: <strong>${requiredCoins.toLocaleString()}</strong> 金币</p>
            <p>应得代币: <strong>${tokenAmount.toLocaleString()}</strong> ${this.config.TOKEN_NAME}</p>
            <p>代币税: <strong>${tokenTaxAmount.toLocaleString()}</strong> ${this.config.TOKEN_NAME} (${this.config.TOKEN_TAX_PERCENT}%)</p>
            <p>实际获得: <strong>${actualTokensReceived.toLocaleString()}</strong> ${this.config.TOKEN_NAME}</p>
            <p>税收钱包获得: <strong>${tokenTaxAmount.toLocaleString()}</strong> ${this.config.TOKEN_NAME}</p>
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

        // 声明变量，使其在整个方法中可用
        let signatureData = null;
        let tokenAmount = 0;
        let gameCoinsToUse = 0;

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
        tokenAmount = amountInput.value === '' ? 0 : parseInt(amountInput.value);

        // 验证兑换数量
        if (amountInput.value === '' || tokenAmount < this.config.MIN_EXCHANGE_AMOUNT) {
            this.showResultMessage(`兑换数量不能小于 ${this.config.MIN_EXCHANGE_AMOUNT} ${this.config.TOKEN_NAME}`, 'error');
            return;
        }

        if (tokenAmount > this.config.MAX_EXCHANGE_AMOUNT) {
            this.showResultMessage(`兑换数量不能大于 ${this.config.MAX_EXCHANGE_AMOUNT} ${this.config.TOKEN_NAME}`, 'error');
            return;
        }

        // 计算需要的金币数量 - 与合约中的计算逻辑保持一致
        // 合约中的计算:
        // uint256 expectedGameCoins = tokenAmount * exchangeRate / (10**decimals());
        // 不再计算金币税
        const requiredCoins = tokenAmount * this.config.COINS_PER_TOKEN;
        const totalCoinsNeeded = requiredCoins; // 不再有金币税

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
                gameCoinsToUse = totalCoinsNeeded;

                console.log('兑换参数:');
                console.log('- 玩家地址:', this.walletAddress);
                console.log('- 代币数量:', tokenAmount);
                console.log('- 游戏金币数量:', gameCoinsToUse);

                // 使用签名验证兑换
                try {
                    // 获取签名数据
                    if (typeof ApiService !== 'undefined') {
                        try {
                            console.log('准备获取交易签名...');
                            console.log('- 钱包地址:', this.walletAddress);
                            console.log('- 代币数量:', tokenAmount);
                            console.log('- 游戏金币:', gameCoinsToUse);

                            // 从API获取签名
                            signatureData = await ApiService.getExchangeSignature(
                                this.walletAddress,
                                tokenAmount,
                                gameCoinsToUse
                            );

                            if (!signatureData || !signatureData.success) {
                                console.error('获取签名失败:', signatureData);
                                throw new Error(signatureData?.error || '获取签名失败');
                            }

                            console.log('获取到交易签名:', signatureData);
                            console.log('- Nonce:', signatureData.nonce);
                            console.log('- 签名:', signatureData.signature);
                            console.log('- 签名长度:', signatureData.signature.length);
                            console.log('- 签名者:', signatureData.signer);
                        } catch (signError) {
                            console.error('获取交易签名失败:', signError);
                            throw new Error('获取交易签名失败，请稍后重试');
                        }
                    } else {
                        throw new Error('ApiService不可用，无法获取交易签名');
                    }

                    // 获取合约地址
                    let contractAddress = '';
                    if (typeof GameConfig !== 'undefined' &&
                        GameConfig.TOKEN_EXCHANGE &&
                        GameConfig.TOKEN_EXCHANGE.CONTRACT_ADDRESS) {
                        contractAddress = GameConfig.TOKEN_EXCHANGE.CONTRACT_ADDRESS;
                        console.log('使用的合约地址:', contractAddress);
                    } else {
                        console.warn('未找到合约地址配置，将使用默认值');
                    }

                    // 调用Web3TokenContract的exchangeCoinsForTokens方法
                    console.log('准备调用合约方法...');
                    console.log('- 代币数量:', tokenAmount);
                    console.log('- 游戏金币:', gameCoinsToUse);
                    console.log('- Nonce:', signatureData.nonce);
                    console.log('- 签名长度:', signatureData.signature.length);

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

                    // 注意：金币已经在后端的/api/sign-exchange端点中被扣除，不需要在前端再次扣除
                } catch (contractError) {
                    console.error('合约交互失败:', contractError);

                    let errorMessage = '兑换失败，请稍后重试';

                    // 解析错误消息
                    if (contractError.message.includes('user rejected transaction')) {
                        errorMessage = '用户取消了交易';

                        // 用户取消交易，调用API退还金币
                        if (typeof ApiService !== 'undefined' && signatureData && signatureData.nonce) {
                            try {
                                console.log('用户取消交易，尝试退还金币...');
                                console.log('- 玩家地址:', this.walletAddress);
                                console.log('- 代币数量:', tokenAmount);
                                console.log('- 游戏金币:', gameCoinsToUse);
                                console.log('- Nonce:', signatureData.nonce);

                                const cancelResult = await ApiService.cancelExchange(
                                    this.walletAddress,
                                    tokenAmount,
                                    gameCoinsToUse,
                                    signatureData.nonce
                                );

                                if (cancelResult.success) {
                                    console.log('金币退还成功:', cancelResult);
                                    errorMessage = '用户取消了交易，金币已退还';

                                    // 更新余额信息
                                    await this.updateBalances();

                                    // 更新计算结果
                                    this.updateCalculation();
                                } else {
                                    console.error('金币退还失败:', cancelResult.error);
                                    errorMessage = '用户取消了交易，但金币退还失败，请联系客服';
                                }
                            } catch (cancelError) {
                                console.error('退还金币时出错:', cancelError);
                                errorMessage = '用户取消了交易，但金币退还失败，请联系客服';
                            }
                        } else {
                            console.warn('无法退还金币，ApiService不可用或签名数据不完整');
                            errorMessage = '用户取消了交易，但无法自动退还金币，请联系客服';
                        }
                    } else if (contractError.message.includes('insufficient funds')) {
                        errorMessage = 'Gas费用不足，请确保您的钱包中有足够的BNB';

                        // Gas费不足，也需要退还金币
                        if (typeof ApiService !== 'undefined' && signatureData && signatureData.nonce) {
                            try {
                                console.log('Gas费不足，尝试退还金币...');

                                const cancelResult = await ApiService.cancelExchange(
                                    this.walletAddress,
                                    tokenAmount,
                                    gameCoinsToUse,
                                    signatureData.nonce
                                );

                                if (cancelResult.success) {
                                    console.log('金币退还成功:', cancelResult);
                                    errorMessage = 'Gas费用不足，交易已取消，金币已退还';

                                    // 更新余额信息
                                    await this.updateBalances();

                                    // 更新计算结果
                                    this.updateCalculation();
                                } else {
                                    console.error('金币退还失败:', cancelResult.error);
                                    errorMessage = 'Gas费用不足，交易已取消，但金币退还失败，请联系客服';
                                }
                            } catch (cancelError) {
                                console.error('退还金币时出错:', cancelError);
                                errorMessage = 'Gas费用不足，交易已取消，但金币退还失败，请联系客服';
                            }
                        }
                    } else if (contractError.message.includes('execution reverted')) {
                        // 尝试提取合约错误消息
                        const revertReason = contractError.message.match(/reason string: '(.+?)'/);
                        if (revertReason && revertReason[1]) {
                            errorMessage = `合约执行失败: ${revertReason[1]}`;
                        }

                        // 合约执行失败，也需要退还金币
                        if (typeof ApiService !== 'undefined' && signatureData && signatureData.nonce) {
                            try {
                                console.log('合约执行失败，尝试退还金币...');

                                const cancelResult = await ApiService.cancelExchange(
                                    this.walletAddress,
                                    tokenAmount,
                                    gameCoinsToUse,
                                    signatureData.nonce
                                );

                                if (cancelResult.success) {
                                    console.log('金币退还成功:', cancelResult);
                                    errorMessage += '，金币已退还';

                                    // 更新余额信息
                                    await this.updateBalances();

                                    // 更新计算结果
                                    this.updateCalculation();
                                } else {
                                    console.error('金币退还失败:', cancelResult.error);
                                    errorMessage += '，但金币退还失败，请联系客服';
                                }
                            } catch (cancelError) {
                                console.error('退还金币时出错:', cancelError);
                                errorMessage += '，但金币退还失败，请联系客服';
                            }
                        }
                    } else if (contractError.message.includes('nonce already used')) {
                        errorMessage = '交易已被处理，请刷新页面后重试';
                    } else if (contractError.message.includes('invalid signature')) {
                        errorMessage = '签名验证失败，请刷新页面后重试';

                        // 签名验证失败，也需要退还金币
                        if (typeof ApiService !== 'undefined' && signatureData && signatureData.nonce) {
                            try {
                                console.log('签名验证失败，尝试退还金币...');

                                const cancelResult = await ApiService.cancelExchange(
                                    this.walletAddress,
                                    tokenAmount,
                                    gameCoinsToUse,
                                    signatureData.nonce
                                );

                                if (cancelResult.success) {
                                    console.log('金币退还成功:', cancelResult);
                                    errorMessage = '签名验证失败，交易已取消，金币已退还';

                                    // 更新余额信息
                                    await this.updateBalances();

                                    // 更新计算结果
                                    this.updateCalculation();
                                } else {
                                    console.error('金币退还失败:', cancelResult.error);
                                    errorMessage = '签名验证失败，交易已取消，但金币退还失败，请联系客服';
                                }
                            } catch (cancelError) {
                                console.error('退还金币时出错:', cancelError);
                                errorMessage = '签名验证失败，交易已取消，但金币退还失败，请联系客服';
                            }
                        }
                    } else {
                        // 其他错误，也尝试退还金币
                        if (typeof ApiService !== 'undefined' && signatureData && signatureData.nonce) {
                            try {
                                console.log('交易失败，尝试退还金币...');

                                const cancelResult = await ApiService.cancelExchange(
                                    this.walletAddress,
                                    tokenAmount,
                                    gameCoinsToUse,
                                    signatureData.nonce
                                );

                                if (cancelResult.success) {
                                    console.log('金币退还成功:', cancelResult);
                                    errorMessage += '，金币已退还';

                                    // 更新余额信息
                                    await this.updateBalances();

                                    // 更新计算结果
                                    this.updateCalculation();
                                } else {
                                    console.error('金币退还失败:', cancelResult.error);
                                    errorMessage += '，但金币退还失败，请联系客服';
                                }
                            } catch (cancelError) {
                                console.error('退还金币时出错:', cancelError);
                                errorMessage += '，但金币退还失败，请联系客服';
                            }
                        }
                    }

                    this.showResultMessage(errorMessage, 'error');
                }
            } else {
                this.showResultMessage('Web3合约不可用，无法执行兑换', 'error');
            }
        } catch (error) {
            console.error('执行兑换出错:', error);
            console.error('错误类型:', typeof error);
            console.error('错误消息:', error.message);
            console.error('错误详情:', JSON.stringify(error, null, 2));

            // 检查错误是否包含用户取消交易的信息
            if ((error.originalError && error.originalError.includes('user rejected transaction')) ||
                (error.message && error.message.includes('user rejected transaction')) ||
                (error.message && error.message.includes('User denied transaction')) ||
                (error.message && error.message.includes('MetaMask Tx Signature: User denied'))) {
                console.log('用户取消了交易，尝试退还金币...');

                // 用户取消交易，调用API退还金币
                console.log('检查signatureData:', signatureData);

                if (typeof ApiService !== 'undefined' && signatureData && signatureData.nonce) {
                    try {
                        console.log('用户取消交易，尝试退还金币...');
                        console.log('- 玩家地址:', this.walletAddress);
                        console.log('- 代币数量:', tokenAmount);
                        console.log('- 游戏金币:', gameCoinsToUse);
                        console.log('- Nonce:', signatureData.nonce);

                        const cancelResult = await ApiService.cancelExchange(
                            this.walletAddress,
                            tokenAmount,
                            gameCoinsToUse,
                            signatureData.nonce
                        );

                        if (cancelResult.success) {
                            console.log('金币退还成功:', cancelResult);
                            this.showResultMessage('用户取消了交易，金币已退还', 'error');

                            // 更新余额信息
                            await this.updateBalances();

                            // 更新计算结果
                            this.updateCalculation();
                        } else {
                            console.error('金币退还失败:', cancelResult.error);
                            this.showResultMessage('用户取消了交易，但金币退还失败，请联系客服', 'error');
                        }
                    } catch (cancelError) {
                        console.error('退还金币时出错:', cancelError);
                        this.showResultMessage('用户取消了交易，但金币退还失败，请联系客服', 'error');
                    }
                } else {
                    console.warn('无法退还金币，ApiService不可用或签名数据不完整');
                    console.warn('ApiService可用:', typeof ApiService !== 'undefined');
                    console.warn('signatureData:', signatureData);
                    console.warn('tokenAmount:', tokenAmount);
                    console.warn('gameCoinsToUse:', gameCoinsToUse);

                    this.showResultMessage('用户取消了交易，但无法自动退还金币，请联系客服', 'error');
                }
            } else {
                this.showResultMessage('兑换过程中发生错误，请稍后重试', 'error');
            }
        } finally {
            // 隐藏加载中状态
            this.showLoading(false);
        }
    },

    // 显示结果消息
    showResultMessage: function(message, type) {
        const resultDiv = document.getElementById('token-exchange-result');
        if (!resultDiv) return;

        // 设置消息内容
        resultDiv.textContent = message;

        // 设置样式
        if (type === 'success') {
            resultDiv.style.backgroundColor = '#d4edda';
            resultDiv.style.color = '#155724';
        } else if (type === 'error') {
            resultDiv.style.backgroundColor = '#f8d7da';
            resultDiv.style.color = '#721c24';

            // 对特定错误类型添加提示
            if (message.includes('兑换金额低于最小限制') || message.includes('amount below minimum')) {
                const minAmount = this.config.MIN_EXCHANGE_AMOUNT;
                const helpText = document.createElement('div');
                helpText.innerHTML = `<br>请将兑换数量调整为至少 <strong>${minAmount} ${this.config.TOKEN_NAME}</strong>`;
                helpText.style.fontSize = '0.9em';
                helpText.style.marginTop = '5px';

                resultDiv.innerHTML = '';
                resultDiv.appendChild(document.createTextNode(message));
                resultDiv.appendChild(helpText);

                // 自动调整输入框的值
                const amountInput = document.getElementById('token-exchange-amount');
                if (amountInput) {
                    amountInput.value = minAmount;
                    this.updateCalculation();

                    // 高亮输入框
                    amountInput.style.borderColor = '#dc3545';
                    amountInput.style.backgroundColor = '#fff8f8';
                    setTimeout(() => {
                        amountInput.style.borderColor = '';
                        amountInput.style.backgroundColor = '';
                    }, 3000);
                }
            }
        } else {
            resultDiv.style.backgroundColor = '#fff3cd';
            resultDiv.style.color = '#856404';
        }

        // 显示消息
        resultDiv.style.display = 'block';

        // 5秒后自动隐藏
        setTimeout(() => {
            resultDiv.style.display = 'none';
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

    // 更新代币税率UI
    updateTaxRateUI: function() {
        console.log('更新代币税率UI');

        // 查找代币税信息元素
        const taxInfo = document.getElementById('token-exchange-tax-info');
        if (taxInfo) {
            taxInfo.innerHTML = `代币税: <strong>${this.config.TOKEN_TAX_PERCENT}%</strong>`;
            console.log('代币税率UI已更新');
        } else {
            console.warn('找不到代币税率UI元素');
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
    },

    // 更新最小兑换金额UI
    updateMinExchangeAmountUI: function(minAmount) {
        // 更新输入框最小值
        const amountInput = document.getElementById('token-exchange-amount');
        if (amountInput) {
            amountInput.min = minAmount;

            // 如果当前值小于最小值，则自动更新
            if (parseFloat(amountInput.value) < minAmount) {
                amountInput.value = minAmount;
                // 触发输入事件以更新相关计算
                const event = new Event('input');
                amountInput.dispatchEvent(event);
            }

            // 更新输入框提示
            amountInput.placeholder = `最小兑换: ${minAmount} ${this.config.TOKEN_NAME}`;
        }

        // 添加或更新最小兑换金额提示
        const exchangeContainer = document.getElementById('token-exchange-panel');
        if (exchangeContainer) {
            let minAmountTip = document.getElementById('min-exchange-amount-tip');
            if (!minAmountTip) {
                // 创建提示元素
                minAmountTip = document.createElement('div');
                minAmountTip.id = 'min-exchange-amount-tip';

                // 查找合适的位置插入提示
                const rateInfo = document.querySelector('#token-exchange-panel p');
                if (rateInfo) {
                    exchangeContainer.insertBefore(minAmountTip, rateInfo.nextSibling);
                } else {
                    exchangeContainer.appendChild(minAmountTip);
                }
            }

            // 设置提示内容和样式
            minAmountTip.innerHTML = `<strong>注意:</strong> 最小兑换数量为 <span style="color:#0066cc; font-weight:bold;">${minAmount} ${this.config.TOKEN_NAME}</span>`;
            minAmountTip.style.cssText = `
                margin: 10px 0;
                padding: 8px 12px;
                background-color: #f8f9fa;
                border-left: 3px solid #0066cc;
                color: #333;
                font-size: 14px;
                border-radius: 3px;
            `;
        }

        // 更新计算结果
        this.updateCalculation();

        console.log(`最小兑换金额UI已更新: ${minAmount} ${this.config.TOKEN_NAME}`);
    }
};
