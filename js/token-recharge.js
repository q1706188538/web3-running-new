/**
 * 代币充值模块
 * 用于实现Web3代币充值为游戏金币的功能
 */
const TokenRecharge = {
    // 是否已初始化
    initialized: false,

    // 当前钱包地址
    walletAddress: null,

    // 当前金币余额
    currentCoins: 0,

    // 当前代币余额
    currentTokens: 0,

    // 充值配置
    config: {
        TOKEN_NAME: "TWB",
        COINS_PER_TOKEN: 100, // 每个代币可以充值的金币数量，与兑换时相同
        MIN_RECHARGE_AMOUNT: 100, // 最小充值金币数量
        MAX_RECHARGE_AMOUNT: 10000, // 最大充值金币数量
        RECHARGE_FEE_PERCENT: 2, // 充值金币税率，2%（直接百分比）
        TOKEN_TAX_PERCENT: 1 // 代币税率，1%
    },

    // 初始化
    init: async function() {
        if (this.initialized) {
            return;
        }

        console.log('初始化代币充值模块...');

        // 从GameConfig获取配置
        if (typeof GameConfig !== 'undefined' && GameConfig.TOKEN_RECHARGE) {
            this.config = GameConfig.TOKEN_RECHARGE;
            console.log('从GameConfig加载代币充值配置:', this.config);
        }

        // 创建UI
        this.createUI();

        // 添加事件监听器
        this.addEventListeners();

        // 初始化Web3代币合约
        if (typeof Web3TokenContract !== 'undefined') {
            try {
                console.log('初始化代币充值模块...');

                // 游戏已经要求连接钱包，所以这里直接使用已连接的钱包
                if (window.ethereum && window.ethereum.selectedAddress) {
                    // 直接使用已连接的钱包地址
                    this.walletAddress = window.ethereum.selectedAddress;
                    Web3TokenContract.userAddress = this.walletAddress;
                    console.log('使用已连接的钱包地址:', this.walletAddress);
                } else if (Web3TokenContract.userAddress) {
                    // 如果Web3TokenContract已有地址，使用它
                    this.walletAddress = Web3TokenContract.userAddress;
                    console.log('使用Web3TokenContract中的钱包地址:', this.walletAddress);
                }

                // 初始化合约
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

                            // 更新充值代币税率
                            if (taxRates.rechargeTokenTaxRate !== undefined) {
                                this.config.TOKEN_TAX_PERCENT = taxRates.rechargeTokenTaxRate / 100;
                                console.log('更新充值代币税率为:', this.config.TOKEN_TAX_PERCENT, '%');

                                // 更新UI中的代币税率和金币税率
                                // 在初始化时，UI可能还没有创建，所以我们需要在show方法中更新
                                this.updateTaxRateUI();
                                this.updateFeeRateUI();
                            }
                        }
                    } catch (taxError) {
                        console.warn('获取代币税率失败:', taxError);
                    }
                } else {
                    console.warn('Web3代币合约初始化失败，将使用API模式');
                }
            } catch (error) {
                console.error('初始化Web3代币合约时出错:', error);
            }
        } else {
            console.warn('Web3TokenContract未定义，将使用API模式');
        }

        // 创建UI后更新单位标签和税率显示
        if (document.getElementById('token-recharge-container')) {
            this.updateUnitLabels();
            this.updateTaxRateUI();
            this.updateFeeRateUI();
        }

        // 标记为已初始化
        this.initialized = true;

        console.log('代币充值模块初始化完成');
    },

    // 创建UI
    createUI: function() {
        // 检查是否已存在充值界面
        if (document.getElementById('token-recharge-container')) {
            return;
        }

        console.log('创建代币充值UI...');

        // 创建主容器
        const container = document.createElement('div');
        container.id = 'token-recharge-container';
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

        // 创建充值面板
        const panel = document.createElement('div');
        panel.id = 'token-recharge-panel';
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
        title.textContent = '充值金币';
        title.style.cssText = `
            text-align: center;
            margin-top: 0;
            color: #333;
            font-size: 24px;
        `;

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.id = 'token-recharge-close';
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
        balanceInfo.id = 'token-recharge-balance-info';
        balanceInfo.style.cssText = `
            margin: 15px 0;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
        `;

        // 创建金币余额
        const coinsBalance = document.createElement('p');
        coinsBalance.id = 'token-recharge-coins-balance';
        coinsBalance.innerHTML = '当前金币: <span>0</span>';
        coinsBalance.style.cssText = `
            margin: 5px 0;
            font-size: 16px;
        `;

        // 创建代币余额
        const tokensBalance = document.createElement('p');
        tokensBalance.id = 'token-recharge-tokens-balance';
        tokensBalance.innerHTML = `${this.config.TOKEN_NAME} 余额: <span>0</span>`;
        tokensBalance.style.cssText = `
            margin: 5px 0;
            font-size: 16px;
        `;

        // 添加余额信息
        balanceInfo.appendChild(coinsBalance);
        balanceInfo.appendChild(tokensBalance);

        // 创建充值表单
        const form = document.createElement('div');
        form.style.cssText = `
            margin: 20px 0;
        `;

        // 创建充值比例信息
        const rateInfo = document.createElement('p');
        rateInfo.innerHTML = `充值比例: <strong>1</strong> ${this.config.TOKEN_NAME} = <strong>${this.config.COINS_PER_TOKEN}</strong> 金币`;
        rateInfo.style.cssText = `
            margin: 10px 0;
            font-size: 14px;
            color: #666;
        `;

        // 创建手续费信息
        const feeInfo = document.createElement('p');
        feeInfo.id = 'token-recharge-fee-info';
        feeInfo.innerHTML = `金币手续费: <strong>${this.config.RECHARGE_FEE_PERCENT}%</strong>`;
        feeInfo.style.cssText = `
            margin: 5px 0 5px 0;
            font-size: 14px;
            color: #666;
        `;

        // 创建代币税信息
        const taxInfo = document.createElement('p');
        taxInfo.id = 'token-recharge-tax-info';
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
        inputLabel.textContent = '充值金币数量:';
        inputLabel.style.cssText = `
            margin-right: 10px;
            font-size: 16px;
        `;

        // 创建输入框 - 使用简单的数字输入
        const input = document.createElement('input');
        input.id = 'token-recharge-amount';
        input.type = 'text'; // 使用text类型，允许退格键
        input.inputMode = 'numeric'; // 在移动设备上显示数字键盘
        input.value = this.config.MIN_RECHARGE_AMOUNT;
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
            TokenRecharge.updateCalculation();
        });

        // 在失去焦点时验证输入值
        input.addEventListener('blur', function() {
            // 如果输入框为空，设置为最小值
            if (this.value === '') {
                this.value = TokenRecharge.config.MIN_RECHARGE_AMOUNT.toString();
            } else {
                // 转换为整数
                let value = parseInt(this.value);

                // 确保在允许范围内
                if (value < TokenRecharge.config.MIN_RECHARGE_AMOUNT) {
                    this.value = TokenRecharge.config.MIN_RECHARGE_AMOUNT.toString();
                } else if (value > TokenRecharge.config.MAX_RECHARGE_AMOUNT) {
                    this.value = TokenRecharge.config.MAX_RECHARGE_AMOUNT.toString();
                } else {
                    this.value = value.toString();
                }
            }

            // 更新计算结果
            TokenRecharge.updateCalculation();
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
        unitLabel.textContent = '金币'; // 使用"金币"而不是代币名称
        unitLabel.className = 'token-unit-label';
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
        calculationResult.id = 'token-recharge-calculation';
        calculationResult.style.cssText = `
            margin: 15px 0;
            padding: 10px;
            background-color: #f0f8ff;
            border-radius: 5px;
            font-size: 14px;
        `;

        // 创建充值按钮
        const rechargeButton = document.createElement('button');
        rechargeButton.id = 'token-recharge-button';
        rechargeButton.textContent = '充值';
        rechargeButton.style.cssText = `
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
        resultMessage.id = 'token-recharge-result';
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
        form.appendChild(taxInfo);
        form.appendChild(inputGroup);
        form.appendChild(calculationResult);
        form.appendChild(rechargeButton);
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

        console.log('代币充值UI创建完成');
    },

    // 添加事件监听器
    addEventListeners: function() {
        console.log('添加代币充值事件监听器...');

        // 关闭按钮点击事件
        const closeButton = document.getElementById('token-recharge-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hide();
            });
        }

        // 充值数量输入事件 - 已在输入框创建时添加

        // 充值按钮点击事件
        const rechargeButton = document.getElementById('token-recharge-button');
        if (rechargeButton) {
            rechargeButton.addEventListener('click', () => {
                this.performRecharge();
            });
        }

        // 点击背景关闭
        const container = document.getElementById('token-recharge-container');
        if (container) {
            container.addEventListener('click', (event) => {
                if (event.target === container) {
                    this.hide();
                }
            });
        }

        console.log('代币充值事件监听器添加完成');
    },

    // 显示充值界面
    show: async function() {
        console.log('显示代币充值界面');

        // 确保已初始化
        if (!this.initialized) {
            this.init();
        }

        // 获取当前钱包地址
        if (typeof WalletManager !== 'undefined') {
            this.walletAddress = WalletManager.getAccount();
        } else if (typeof Web3TokenContract !== 'undefined' && Web3TokenContract.userAddress) {
            this.walletAddress = Web3TokenContract.userAddress;
        }

        if (!this.walletAddress) {
            console.log('钱包未连接，尝试获取已连接的钱包地址...');

            // 游戏已经要求连接钱包，所以这里直接使用已连接的钱包
            if (window.ethereum && window.ethereum.selectedAddress) {
                // 直接使用已连接的钱包地址
                this.walletAddress = window.ethereum.selectedAddress;
                Web3TokenContract.userAddress = this.walletAddress;
                console.log('使用已连接的钱包地址:', this.walletAddress);
            } else if (Web3TokenContract.userAddress) {
                // 如果Web3TokenContract已有地址，使用它
                this.walletAddress = Web3TokenContract.userAddress;
                console.log('使用Web3TokenContract中的钱包地址:', this.walletAddress);
            } else {
                // 如果仍然没有钱包地址，提示用户刷新页面
                console.log('未检测到钱包地址');
                alert('未检测到钱包地址，请刷新页面后重试');
                return;
            }
        }

        // 显示加载中状态
        this.showLoading(true);

        // 更新余额信息
        await this.updateBalances();

        // 检查localStorage中是否有测试页面保存的值
        const testValue = localStorage.getItem('inputTestValue');
        if (testValue) {
            // 找到输入框并设置值
            const input = document.getElementById('token-recharge-amount');
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

        // 更新金币税率UI
        this.updateFeeRateUI();

        // 更新单位标签
        this.updateUnitLabels();

        // 显示充值界面
        const container = document.getElementById('token-recharge-container');
        if (container) {
            container.style.display = 'flex';
        }

        // 隐藏加载中状态
        this.showLoading(false);
    },

    // 隐藏充值界面
    hide: function() {
        console.log('隐藏代币充值界面');

        const container = document.getElementById('token-recharge-container');
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
                        this.currentTokens = parseFloat(balanceResult.balanceInEther);
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
            const coinsBalanceElement = document.querySelector('#token-recharge-coins-balance span');
            if (coinsBalanceElement) {
                coinsBalanceElement.textContent = this.currentCoins.toLocaleString();
            }

            const tokensBalanceElement = document.querySelector('#token-recharge-tokens-balance span');
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

        const amountInput = document.getElementById('token-recharge-amount');
        const calculationElement = document.getElementById('token-recharge-calculation');
        const rechargeButton = document.getElementById('token-recharge-button');

        if (!amountInput || !calculationElement || !rechargeButton) {
            console.error('更新计算结果失败: 找不到必要的UI元素');
            return;
        }

        // 获取用户想要充值的金币数量
        let desiredCoins = 0;

        // 如果输入框为空，使用0
        if (amountInput.value === '') {
            desiredCoins = 0;
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

            desiredCoins = value;
        }

        // 使用解析后的值
        const correctedCoins = desiredCoins;

        // 计算金币税（直接使用百分比值）
        const coinsFeePercentage = this.config.RECHARGE_FEE_PERCENT / 100; // 转换为小数
        console.log('金币税率:', coinsFeePercentage, '(', this.config.RECHARGE_FEE_PERCENT, '%)');
        console.log('充值金币数量:', correctedCoins);

        // 确保金币税率不超过99%（仅用于计算，不影响显示）
        const effectiveFeePercentage = Math.min(coinsFeePercentage, 0.99);

        const coinsFeeAmount = Math.floor(correctedCoins * effectiveFeePercentage);
        console.log('金币税金额:', coinsFeeAmount);

        const actualCoinsAfterFee = correctedCoins - coinsFeeAmount;
        console.log('扣除金币税后的金币数量:', actualCoinsAfterFee);

        // 计算需要的代币数量
        const tokenAmount = correctedCoins / this.config.COINS_PER_TOKEN;

        // 计算代币税
        const tokenTaxPercentage = this.config.TOKEN_TAX_PERCENT / 100;
        const tokenTaxAmount = tokenAmount * tokenTaxPercentage;
        const actualTokensToContract = tokenAmount - tokenTaxAmount;

        // 更新计算结果
        calculationElement.innerHTML = `
            <p>您将获得: <strong>${actualCoinsAfterFee.toLocaleString()}</strong> 金币</p>
            <p>金币税: <strong>${coinsFeeAmount.toLocaleString()}</strong> 金币 (${this.config.RECHARGE_FEE_PERCENT}%)</p>
            <p>需要支付: <strong>${tokenAmount.toFixed(4)}</strong> ${this.config.TOKEN_NAME}</p>
            <p>代币税率: <strong>${tokenTaxPercentage*100}%</strong></p>
            <p>代币分配:</p>
            <p>- 进入合约: <strong>${actualTokensToContract.toFixed(4)}</strong> ${this.config.TOKEN_NAME} (${(100-tokenTaxPercentage*100)}%)</p>
            <p>- 税收钱包获得: <strong>${tokenTaxAmount.toFixed(4)}</strong> ${this.config.TOKEN_NAME} (${tokenTaxPercentage*100}%)</p>
        `;

        // 检查代币是否足够
        const isEnoughTokens = this.currentTokens >= tokenAmount;

        // 更新充值按钮状态
        rechargeButton.disabled = !isEnoughTokens;
        rechargeButton.style.opacity = isEnoughTokens ? '1' : '0.5';
        rechargeButton.style.cursor = isEnoughTokens ? 'pointer' : 'not-allowed';

        // 如果代币不足，添加提示
        if (!isEnoughTokens) {
            calculationElement.innerHTML += `
                <p style="color: red; margin-top: 10px;">代币不足，还需要 ${(tokenAmount - this.currentTokens).toFixed(4)} ${this.config.TOKEN_NAME}</p>
            `;
        }
    },

    // 执行充值
    performRecharge: async function() {
        console.log('执行代币充值');

        // 检查钱包地址
        if (!this.walletAddress) {
            // 游戏已经要求连接钱包，所以这里直接使用已连接的钱包
            if (window.ethereum && window.ethereum.selectedAddress) {
                // 直接使用已连接的钱包地址
                this.walletAddress = window.ethereum.selectedAddress;
                Web3TokenContract.userAddress = this.walletAddress;
                console.log('使用已连接的钱包地址:', this.walletAddress);
            } else if (Web3TokenContract.userAddress) {
                // 如果Web3TokenContract已有地址，使用它
                this.walletAddress = Web3TokenContract.userAddress;
                console.log('使用Web3TokenContract中的钱包地址:', this.walletAddress);
            } else {
                // 如果仍然没有钱包地址，提示用户刷新页面
                this.showResultMessage('未检测到钱包地址，请刷新页面后重试', 'error');
                return;
            }
        }

        const amountInput = document.getElementById('token-recharge-amount');
        if (!amountInput) {
            this.showResultMessage('找不到充值数量输入框', 'error');
            return;
        }

        // 获取用户想要充值的金币数量
        const desiredCoins = amountInput.value === '' ? 0 : parseInt(amountInput.value);

        // 验证充值数量
        if (amountInput.value === '' || desiredCoins < this.config.MIN_RECHARGE_AMOUNT) {
            this.showResultMessage(`充值数量不能小于 ${this.config.MIN_RECHARGE_AMOUNT} 金币`, 'error');
            return;
        }

        if (desiredCoins > this.config.MAX_RECHARGE_AMOUNT) {
            this.showResultMessage(`充值数量不能大于 ${this.config.MAX_RECHARGE_AMOUNT} 金币`, 'error');
            return;
        }

        // 计算金币税（直接使用百分比值）
        const coinsFeePercentage = this.config.RECHARGE_FEE_PERCENT / 100; // 转换为小数

        // 确保金币税率不超过99%（仅用于计算，不影响显示）
        const effectiveFeePercentage = Math.min(coinsFeePercentage, 0.99);

        const coinsFeeAmount = Math.floor(desiredCoins * effectiveFeePercentage);
        const actualCoinsAfterFee = desiredCoins - coinsFeeAmount;

        // 计算需要的代币数量
        const tokenAmount = desiredCoins / this.config.COINS_PER_TOKEN;

        // 计算代币税
        const tokenTaxPercentage = this.config.TOKEN_TAX_PERCENT / 100;
        const tokenTaxAmount = tokenAmount * tokenTaxPercentage;
        const actualTokensToContract = tokenAmount - tokenTaxAmount;

        // 实际获得的金币数量（扣除金币税后）
        const actualCoinsGained = actualCoinsAfterFee;

        // 检查代币是否足够
        if (this.currentTokens < tokenAmount) {
            this.showResultMessage(`代币不足，需要 ${tokenAmount.toFixed(4)} ${this.config.TOKEN_NAME}，当前余额 ${this.currentTokens.toLocaleString()} ${this.config.TOKEN_NAME}`, 'error');
            return;
        }

        // 显示加载中状态
        this.showLoading(true);

        try {
            // 使用Web3合约进行充值
            if (typeof Web3TokenContract !== 'undefined') {
                console.log('使用Web3合约进行代币充值...');

                // 检查合约是否已初始化
                if (!Web3TokenContract.tokenContract) {
                    console.log('合约未初始化，请先连接钱包');
                    this.showResultMessage('合约未初始化，请先连接钱包', 'error');
                    return;
                }

                // 检查钱包是否已连接
                if (!Web3TokenContract.userAddress) {
                    console.log('钱包未连接，请先连接钱包');
                    this.showResultMessage('钱包未连接，请先连接钱包', 'error');
                    return;
                }

                // 获取游戏金币数据和代币数据
                const gameCoinsToGain = actualCoinsGained;
                const tokenAmountToUse = tokenAmount;

                console.log('充值参数:');
                console.log('- 玩家地址:', this.walletAddress);
                console.log('- 代币数量:', tokenAmountToUse.toFixed(4));
                console.log('- 游戏金币数量（实际获得）:', gameCoinsToGain);
                console.log('- 代币税金额:', tokenTaxAmount.toFixed(4));
                console.log('- 实际进入合约的代币:', actualTokensToContract.toFixed(4));

                // 首先从API获取签名
                try {
                    // 获取签名数据
                    let signatureData = null;

                    if (typeof ApiService !== 'undefined') {
                        try {
                            // 从API获取签名
                            signatureData = await ApiService.getRechargeSignature(
                                this.walletAddress,
                                tokenAmountToUse,
                                gameCoinsToGain
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

                    // 调用Web3TokenContract的rechargeTokensForCoins方法
                    const rechargeResult = await Web3TokenContract.rechargeTokensForCoinsWithSignature(
                        tokenAmountToUse,
                        gameCoinsToGain,
                        signatureData.nonce,
                        signatureData.signature
                    );

                    if (!rechargeResult.success) {
                        throw new Error(rechargeResult.error || '充值失败，请稍后重试');
                    }

                    // 获取交易结果
                    const tx = rechargeResult.data;

                    console.log('充值交易已提交:', tx);

                    // 向后端确认充值成功，添加金币
                    try {
                        if (typeof ApiService !== 'undefined') {
                            const confirmResult = await ApiService.confirmRecharge(
                                this.walletAddress,
                                tokenAmountToUse,
                                gameCoinsToGain,
                                signatureData.nonce,
                                tx.transactionHash || tx.hash
                            );

                            if (confirmResult && confirmResult.success) {
                                console.log('充值确认成功:', confirmResult);
                            } else {
                                console.warn('充值确认失败，但交易已成功:', confirmResult?.error || '未知错误');
                            }
                        }
                    } catch (confirmError) {
                        console.error('确认充值时出错:', confirmError);
                        // 不阻止流程继续，因为交易已经成功
                    }

                    // 充值成功
                    this.showResultMessage(`成功充值 ${gameCoinsToGain} 金币`, 'success');

                    // 更新余额信息
                    await this.updateBalances();

                    // 更新计算结果
                    this.updateCalculation();
                } catch (contractError) {
                    console.error('合约交互失败:', contractError);

                    let errorMessage = '充值失败，请稍后重试';

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
                this.showResultMessage('Web3合约不可用，无法执行充值', 'error');
            }
        } catch (error) {
            console.error('执行充值出错:', error);
            this.showResultMessage('充值过程中发生错误，请稍后重试', 'error');
        } finally {
            // 隐藏加载中状态
            this.showLoading(false);
        }
    },

    // 显示结果消息
    showResultMessage: function(message, type = 'info') {
        console.log(`显示结果消息: ${message}, 类型: ${type}`);

        const resultElement = document.getElementById('token-recharge-result');
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
        const resultElement = document.getElementById('token-recharge-result');
        if (resultElement) {
            resultElement.style.display = 'none';
            resultElement.textContent = '';
        }
    },

    // 更新代币税率UI
    updateTaxRateUI: function() {
        console.log('更新代币税率UI');

        // 查找代币税信息元素
        const taxInfo = document.getElementById('token-recharge-tax-info');
        if (taxInfo) {
            // 将基点值转换为百分比（基点值除以100）
            const taxPercent = this.config.TOKEN_TAX_PERCENT;
            taxInfo.innerHTML = `代币税: <strong>${taxPercent}%</strong>`;
            console.log('代币税率UI已更新，显示为:', taxPercent, '%');
        } else {
            console.warn('找不到代币税率UI元素');
        }
    },

    // 更新金币税率UI
    updateFeeRateUI: function() {
        console.log('更新金币税率UI');

        // 查找金币税信息元素
        const feeInfo = document.getElementById('token-recharge-fee-info');
        if (feeInfo) {
            // 直接使用百分比值
            feeInfo.innerHTML = `金币手续费: <strong>${this.config.RECHARGE_FEE_PERCENT}%</strong>`;
            console.log('金币税率UI已更新，显示为:', this.config.RECHARGE_FEE_PERCENT, '%');
        } else {
            console.warn('找不到金币税率UI元素');
        }
    },

    // 更新单位标签
    updateUnitLabels: function() {
        console.log('更新单位标签');

        // 查找所有单位标签
        const unitLabels = document.querySelectorAll('.token-unit-label');
        unitLabels.forEach(label => {
            // 如果是充值页面的单位标签，设置为"金币"
            if (label.closest('#token-recharge-container')) {
                label.textContent = '金币';
                console.log('充值页面单位标签已更新为"金币"');
            }
        });
    },

    // 显示/隐藏加载中状态
    showLoading: function(show) {
        const rechargeButton = document.getElementById('token-recharge-button');
        if (rechargeButton) {
            if (show) {
                rechargeButton.textContent = '处理中...';
                rechargeButton.disabled = true;
                rechargeButton.style.opacity = '0.7';
                rechargeButton.style.cursor = 'not-allowed';
            } else {
                rechargeButton.textContent = '充值';
                rechargeButton.disabled = false;
                rechargeButton.style.opacity = '1';
                rechargeButton.style.cursor = 'pointer';

                // 更新计算结果会重新设置按钮状态
                this.updateCalculation();
            }
        }
    }
};