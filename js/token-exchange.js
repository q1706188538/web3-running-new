// Helper function to generate a nonce
function generateNonce() {
    // Generates a random alphanumeric string
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
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

    // 兑换配置 (将作为从合约获取配置失败时的回退)
    config: {
        TOKEN_NAME: "TWB", // 会被合约的 externalToken().symbol() 覆盖
        TOKEN_DECIMALS: 18, // 会被合约的 externalToken().decimals() 覆盖
        COINS_PER_TOKEN: 100, // 汇率: X金币 = 1代币单位. 会被合约的 exchangeRate() 覆盖
        MIN_EXCHANGE_AMOUNT: 1, // 以代币单位. 会被合约的 minExchangeAmount() 覆盖
        MAX_EXCHANGE_AMOUNT: 100000000, // 以代币单位. 会被合约的 maxExchangeAmount() 覆盖
        TOKEN_TAX_PERCENT: 2, // 代币税率 %. 会被合约的 taxRate 覆盖
        // 新增: 用于存储从合约直接获取的配置
        contractConfig: {
            inverseMode: null, // boolean: true for coin->token, false for token->coin
            exchangeRate: null, // BigInt: 合约原始汇率 (e.g., 1 token WEI = X game coins, or 1 game coin = X token WEI)
            exchangeTokenTaxRateBPS: null, // BigInt: BPS for coin->token
            rechargeTokenTaxRateBPS: null, // BigInt: BPS for token->coin
            minExchangeAmountWei: null, // BigInt: wei
            maxExchangeAmountWei: null, // BigInt: wei
            tokenDecimals: 18, // Default, will be updated from externalToken
            tokenSymbol: "TWB" // Default, will be updated
        }
    },

    // 初始化
    init: async function() {
        if (this.initialized) {
            return;
        }
        console.log('初始化代币兑换模块 TokenExchange.init...');

        // 1. 创建UI结构 (此时不填充动态数据)
        this.createUI();
        this.addEventListeners();

        // 2. 初始化Web3和合约实例 (Web3TokenContract)
        if (typeof Web3TokenContract !== 'undefined') {
            try {
                const web3ContractInitSuccess = await Web3TokenContract.init(); //确保 Web3TokenContract.init 完成
                if (!web3ContractInitSuccess || !Web3TokenContract.tokenContract) {
                    console.error('TokenExchange.init: Web3TokenContract 初始化失败或合约实例未创建。将使用API模式或默认配置。');
                    this.loadFallbackConfig(); // 加载基于Web3Config/GameConfig的旧配置作为回退
                } else {
                    console.log('TokenExchange.init: Web3TokenContract 初始化成功。');
                    // 3. 加载配置 (回滚到使用 Web3Config)
                    console.log('TokenExchange.init: Web3TokenContract 初始化成功，现在加载回退/Web3Config 配置。');
                    this.loadFallbackConfig(); // 主要配置加载点

                    // 确保在 loadFallbackConfig 后更新UI中可能依赖的代币名称
                    // TOKEN_NAME 和 TOKEN_DECIMALS 会在 loadFallbackConfig 中从 Web3Config 设置
                    // contractConfig.tokenSymbol 和 contractConfig.tokenDecimals 也会在那里得到处理
                    if (this.config.TOKEN_NAME) {
                         this.updateTokenNameInUI(this.config.TOKEN_NAME);
                         console.log('TokenExchange.init: 使用的代币名称 (来自Web3Config):', this.config.TOKEN_NAME);
                    } else if (this.config.contractConfig && this.config.contractConfig.tokenSymbol) {
                         this.updateTokenNameInUI(this.config.contractConfig.tokenSymbol);
                         console.log('TokenExchange.init: 使用的代币名称 (来自contractConfig.tokenSymbol):', this.config.contractConfig.tokenSymbol);
                    } else {
                        console.warn('TokenExchange.init: 未能从配置中确定代币名称。');
                    }
                    // 移除了对 loadAndApplyContractConfig 和 getTokenInfoFromExternal 的调用
                }
            } catch (error) {
                console.error('TokenExchange.init: 初始化Web3TokenContract时出错:', error); // 移除了 "或加载合约配置时"
                this.loadFallbackConfig(); // 出错则加载旧配置
            }
        } else {
            console.warn('TokenExchange.init: Web3TokenContract 未定义，将使用API模式或默认配置。');
            this.loadFallbackConfig();
        }

        // 旧的配置加载逻辑，现在移到 loadFallbackConfig
        // this.loadFallbackConfig(); // 如果上面成功，这里就不需要了

        // 添加事件监听器 - 已提前
        // this.addEventListeners();

        // 监听代币转账事件 (如果Web3TokenContract已成功初始化)
        if (Web3TokenContract && Web3TokenContract.listenToTransferEvents) {
             Web3TokenContract.listenToTransferEvents(eventData => {
                console.log('收到代币转账事件，更新余额:', eventData);
                this.updateBalances();
            });
            window.addEventListener('beforeunload', () => {
                console.log('页面即将卸载，停止事件监听');
                if (Web3TokenContract.stopListeningToTransferEvents) {
                    Web3TokenContract.stopListeningToTransferEvents();
                }
            });
        }

        // 标记为已初始化
        this.initialized = true;
        console.log('TokenExchange.init: 代币兑换模块初始化流程完成。');
        // 初始UI更新应在 show() 方法中或此处显式调用 updateAllDynamicUI()
        this.updateAllDynamicUI();
    },

    loadFallbackConfig: function() {
        console.log('TokenExchange.loadFallbackConfig: 加载基于Web3Config/GameConfig的回退配置...');
        if (typeof Web3Config !== 'undefined') {
            // Load from Web3Config first
            if (Web3Config.TOKEN) {
                if (typeof Web3Config.TOKEN.NAME === 'string' && Web3Config.TOKEN.NAME.trim() !== '') {
                    this.config.TOKEN_NAME = Web3Config.TOKEN.NAME;
                    if (this.config.contractConfig) this.config.contractConfig.tokenSymbol = Web3Config.TOKEN.NAME;
                }
                if (typeof Web3Config.TOKEN.DECIMALS === 'number' && !isNaN(Web3Config.TOKEN.DECIMALS)) {
                    this.config.TOKEN_DECIMALS = Web3Config.TOKEN.DECIMALS;
                    if (this.config.contractConfig) this.config.contractConfig.tokenDecimals = Web3Config.TOKEN.DECIMALS;
                }
            }
            if (Web3Config.EXCHANGE && Web3Config.EXCHANGE.RATE) this.config.COINS_PER_TOKEN = Web3Config.EXCHANGE.RATE;
            if (Web3Config.EXCHANGE && Web3Config.EXCHANGE.MIN_AMOUNT) this.config.MIN_EXCHANGE_AMOUNT = Web3Config.EXCHANGE.MIN_AMOUNT;
            if (Web3Config.EXCHANGE && Web3Config.EXCHANGE.MAX_AMOUNT) this.config.MAX_EXCHANGE_AMOUNT = Web3Config.EXCHANGE.MAX_AMOUNT;
            if (Web3Config.EXCHANGE && Web3Config.EXCHANGE.TAX_RATE !== undefined) { // TAX_RATE is BPS
                this.config.TOKEN_TAX_PERCENT = Web3Config.EXCHANGE.TAX_RATE / 100; // BPS to %
            }
            // Determine inverseMode
            this.config.contractConfig = this.config.contractConfig || {}; // Ensure contractConfig object exists
// 从 Web3Config 加载合约地址到 this.config.contractConfig.contractAddress
            if (typeof Web3Config !== 'undefined' && Web3Config.BRIDGE_CONTRACT && typeof Web3Config.BRIDGE_CONTRACT.ADDRESS === 'string' && Web3Config.BRIDGE_CONTRACT.ADDRESS.trim() !== '') {
                this.config.contractConfig.contractAddress = Web3Config.BRIDGE_CONTRACT.ADDRESS;
                console.log('TokenExchange.loadFallbackConfig: contractAddress populated from Web3Config.BRIDGE_CONTRACT.ADDRESS:', this.config.contractConfig.contractAddress);
            } else {
                // 尝试从 GameConfig 加载 (如果 GameConfig 遵循相似的结构)
                if (typeof GameConfig !== 'undefined' && GameConfig.BRIDGE_CONTRACT && typeof GameConfig.BRIDGE_CONTRACT.ADDRESS === 'string' && GameConfig.BRIDGE_CONTRACT.ADDRESS.trim() !== '') {
                    this.config.contractConfig.contractAddress = GameConfig.BRIDGE_CONTRACT.ADDRESS;
                    console.log('TokenExchange.loadFallbackConfig: contractAddress populated from GameConfig.BRIDGE_CONTRACT.ADDRESS:', this.config.contractConfig.contractAddress);
                } else {
                    console.error('TokenExchange.loadFallbackConfig: Bridge contract address (contractAddress) could not be loaded from Web3Config or GameConfig.BRIDGE_CONTRACT.ADDRESS.');
                    // this.config.contractConfig.contractAddress 保持 undefined 或可以显式设置为 null
                    this.config.contractConfig.contractAddress = null; 
                }
            }
            let inverseModeFound = false;
            if (typeof Web3Config !== 'undefined' && Web3Config.EXCHANGE && typeof Web3Config.EXCHANGE.INVERSE_MODE === 'boolean') {
                this.config.contractConfig.inverseMode = Web3Config.EXCHANGE.INVERSE_MODE;
                inverseModeFound = true;
            }

            if (!inverseModeFound &&
                typeof GameConfig !== 'undefined' && GameConfig.TOKEN_EXCHANGE &&
                GameConfig.TOKEN_EXCHANGE.contractConfig &&
                typeof GameConfig.TOKEN_EXCHANGE.contractConfig.inverseMode === 'boolean') {
                this.config.contractConfig.inverseMode = GameConfig.TOKEN_EXCHANGE.contractConfig.inverseMode;
                inverseModeFound = true;
            }

            if (!inverseModeFound) {
                console.warn('loadFallbackConfig: inverseMode not found or not a boolean in Web3Config/GameConfig. Defaulting to false (Coin -> Token).');
                this.config.contractConfig.inverseMode = false; // Default to Coin -> Token
            }
            console.log('TokenExchange.loadFallbackConfig: 从Web3Config加载的配置 (或GameConfig/defaulted inverseMode):', this.config);
        } else if (typeof GameConfig !== 'undefined' && GameConfig.TOKEN_EXCHANGE) { // Web3Config was undefined, try GameConfig for everything
            Object.assign(this.config, GameConfig.TOKEN_EXCHANGE); // Simple merge for GameConfig
            // Ensure contractConfig and its inverseMode after GameConfig merge
            this.config.contractConfig = this.config.contractConfig || {};
            if (typeof this.config.contractConfig.inverseMode !== 'boolean') {
                 // If GameConfig provided contractConfig but not a boolean inverseMode, or no contractConfig at all
                console.warn('loadFallbackConfig: inverseMode not found or not a boolean after GameConfig. Defaulting to false (Coin -> Token).');
                this.config.contractConfig.inverseMode = false;
            }
            console.log('TokenExchange.loadFallbackConfig: 从GameConfig加载的配置:', this.config);
        } else {
            // Neither Web3Config nor GameConfig defined, ensure contractConfig and default inverseMode
            this.config.contractConfig = this.config.contractConfig || {};
            if (typeof this.config.contractConfig.inverseMode !== 'boolean') {
                console.warn('loadFallbackConfig: inverseMode not found (no Web3Config/GameConfig). Defaulting to false (Coin -> Token).');
                this.config.contractConfig.inverseMode = false;
            }
        }

        // After any potential merge, ensure critical contractConfig fields are present (excluding inverseMode, handled above)
        if (this.config.contractConfig) {
            // Ensure tokenDecimals in contractConfig has a valid fallback, respecting this.config.TOKEN_DECIMALS if set
            if (typeof this.config.contractConfig.tokenDecimals !== 'number' || isNaN(this.config.contractConfig.tokenDecimals)) {
                this.config.contractConfig.tokenDecimals = (typeof this.config.TOKEN_DECIMALS === 'number' && !isNaN(this.config.TOKEN_DECIMALS))
                    ? this.config.TOKEN_DECIMALS
                    : 18; // Absolute default
                console.warn(`loadFallbackConfig: contractConfig.tokenDecimals was invalid, set to: ${this.config.contractConfig.tokenDecimals}`);
            }
            // Ensure tokenSymbol in contractConfig has a valid fallback, respecting this.config.TOKEN_NAME if set
            if (typeof this.config.contractConfig.tokenSymbol !== 'string' || this.config.contractConfig.tokenSymbol.trim() === '') {
                this.config.contractConfig.tokenSymbol = (typeof this.config.TOKEN_NAME === 'string' && this.config.TOKEN_NAME.trim() !== '')
                    ? this.config.TOKEN_NAME
                    : "TWB"; // Absolute default
                console.warn(`loadFallbackConfig: contractConfig.tokenSymbol was invalid, set to: ${this.config.contractConfig.tokenSymbol}`);
            }
        } else {
            // If contractConfig itself is missing, re-initialize with defaults, trying to use global config values if available
            console.warn('loadFallbackConfig: this.config.contractConfig is missing, re-initializing.');
            this.config.contractConfig = {
                // inverseMode is now handled comprehensively above, so it should be set before this block if contractConfig was missing
                // exchangeRate, exchangeTokenTaxRateBPS, rechargeTokenTaxRateBPS, minExchangeAmountWei, maxExchangeAmountWei are not strictly part of this fallback logic's primary goal
                // but keeping them as null if not otherwise defined is fine.
                exchangeRate: null,
                exchangeTokenTaxRateBPS: null,
                rechargeTokenTaxRateBPS: null,
                minExchangeAmountWei: null,
                maxExchangeAmountWei: null,
                tokenDecimals: (typeof this.config.TOKEN_DECIMALS === 'number' && !isNaN(this.config.TOKEN_DECIMALS)) ? this.config.TOKEN_DECIMALS : 18,
                tokenSymbol: (typeof this.config.TOKEN_NAME === 'string' && this.config.TOKEN_NAME.trim() !== '') ? this.config.TOKEN_NAME : "TWB"
            };
             // GameConfig fallback for inverseMode was already incorporated into the main inverseMode logic block above.
        }

        // Update UI elements that depend on these fallback configs
        // Prioritize TOKEN_NAME, then contractConfig.tokenSymbol, then a generic fallback.
        const finalTokenNameToDisplay = (typeof this.config.TOKEN_NAME === 'string' && this.config.TOKEN_NAME.trim() !== '')
            ? this.config.TOKEN_NAME
            : (this.config.contractConfig && typeof this.config.contractConfig.tokenSymbol === 'string' && this.config.contractConfig.tokenSymbol.trim() !== '')
                ? this.config.contractConfig.tokenSymbol
                : "代币"; // Generic fallback for UI
        this.updateTokenNameInUI(finalTokenNameToDisplay);
        console.log('TokenExchange.loadFallbackConfig: Final token name for UI:', finalTokenNameToDisplay);
    },

    loadAndApplyContractConfig: async function() {
        // 此函数在回滚后不再需要，因为配置将完全依赖 Web3Config (通过 loadFallbackConfig 加载)
        // 保留函数结构以防万一，但其内容被注释掉。
        /*
        console.log('TokenExchange.loadAndApplyContractConfig: 尝试从合约加载动态配置...');
        const contractCfg = await Web3TokenContract.getContractExchangeConfig();
        if (contractCfg) {
            console.log('TokenExchange.loadAndApplyContractConfig: 从合约获取的配置:', contractCfg);
            this.config.contractConfig.inverseMode = contractCfg.inverseMode;
            this.config.contractConfig.exchangeRate = contractCfg.exchangeRate; // raw BigInt
            this.config.contractConfig.exchangeTokenTaxRateBPS = contractCfg.exchangeTokenTaxRateBPS; // raw BigInt BPS
            this.config.contractConfig.rechargeTokenTaxRateBPS = contractCfg.rechargeTokenTaxRateBPS; // raw BigInt BPS
            this.config.contractConfig.minExchangeAmountWei = contractCfg.minExchangeAmount; // raw BigInt wei
            this.config.contractConfig.maxExchangeAmountWei = contractCfg.maxExchangeAmount; // raw BigInt wei

            // 更新 this.config 中的值，用于UI显示和计算 (需要进行单位转换)
            // 汇率: COINS_PER_TOKEN (X金币 = 1代币单位)
            // 合约 exchangeRate: 1 token WEI = Y game coins (or other interpretation, needs clarity from contract)
            // 假设合约 exchangeRate 是 1 个完整代币单位 = X 金币 (即 contractCfg.exchangeRate 是一个表示金币数量的数字)
            // 那么 this.config.COINS_PER_TOKEN = parseFloat(contractCfg.exchangeRate.toString());
            // 这是一个复杂点，取决于合约 exchangeRate 的确切含义。暂时保留旧的 COINS_PER_TOKEN 更新方式，
            // 并在 updateCalculation 中直接使用 contractConfig.exchangeRate 进行精确计算。
            // For now, let's assume Web3TokenContract.web3.utils.fromWei can be used if exchangeRate means "coins per 1 ETH equiv of token"
            // This needs careful handling in updateCalculation.

            // 税率
            const currentTaxBPS = contractCfg.inverseMode ? contractCfg.exchangeTokenTaxRateBPS : contractCfg.rechargeTokenTaxRateBPS;
            this.config.TOKEN_TAX_PERCENT = parseFloat(currentTaxBPS.toString()) / 100; // BPS to %

            // 最小/最大兑换量 (转换为代币单位)
            const decimals = this.config.contractConfig.tokenDecimals || 18;
            if (contractCfg.minExchangeAmountWei) {
                this.config.MIN_EXCHANGE_AMOUNT = parseFloat(Web3TokenContract.web3.utils.fromWei(contractCfg.minExchangeAmountWei.toString(), this.getUnitForDecimals(decimals)));
            }
            if (contractCfg.maxExchangeAmountWei) {
                this.config.MAX_EXCHANGE_AMOUNT = parseFloat(Web3TokenContract.web3.utils.fromWei(contractCfg.maxExchangeAmountWei.toString(), this.getUnitForDecimals(decimals)));
            }
            console.log('TokenExchange.loadAndApplyContractConfig: 应用到 this.config后的值:', this.config);
        } else {
            console.warn('TokenExchange.loadAndApplyContractConfig: 从合约获取配置失败，将使用回退配置。');
            this.loadFallbackConfig();
        }
        */
        console.log('TokenExchange.loadAndApplyContractConfig: 此函数已废弃，配置通过 loadFallbackConfig 从 Web3Config 加载。');
    },

    getUnitForDecimals(decimals) {
        if (decimals === 18) return 'ether';
        if (decimals === 6) return 'mwei'; // For USDC, USDT often
        // Add other common decimal units if needed
        console.warn(`getUnitForDecimals: Unsupported decimals ${decimals}, defaulting to ether-like behavior for fromWei/toWei.`);
        return 'ether'; // Fallback, though toWei/fromWei might behave unexpectedly for non-standard decimals if not 'ether'
    },

    // 辅助函数：将Wei转换为带正确小数的显示字符串
    _formatWeiToDisplay: function(weiBigInt, decimals) {
        if (typeof Web3TokenContract === 'undefined' || !Web3TokenContract.web3 || typeof weiBigInt === 'undefined' || typeof decimals === 'undefined') {
            return weiBigInt ? weiBigInt.toString() : '0'; // Fallback
        }
        try {
            const balanceBN = Web3TokenContract.web3.utils.toBN(weiBigInt.toString()); // BN can handle BigInt string
            const divisor = Web3TokenContract.web3.utils.toBN(10).pow(Web3TokenContract.web3.utils.toBN(decimals));
            
            const integerPart = balanceBN.div(divisor);
            const fractionalPart = balanceBN.mod(divisor);

            if (fractionalPart.isZero()) {
                return integerPart.toString();
            } else {
                // Ensure fractionalPart is padded correctly and trailing zeros are handled for display
                const fractionalString = fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, "");
                // If fractionalString becomes empty (e.g. "00" -> ""), don't add "."
                return `${integerPart.toString()}${fractionalString.length > 0 ? "." + fractionalString : ""}`;
            }
        } catch (e) {
            console.error("TokenExchange._formatWeiToDisplay: Error formatting wei value", weiBigInt, decimals, e);
            return weiBigInt ? weiBigInt.toString() : '0'; // Fallback on error
        }
    },
    
    updateInputLabelsAndPlaceholders: function() {
        if (!this.config || !this.config.contractConfig) {
            console.warn("updateInputLabelsAndPlaceholders: contractConfig not ready.");
            return;
        }
        const tokenSymbol = this.config.contractConfig.externalTokenSymbol || '代币';
        const gameCoinSymbol = '金币';
        const amountInput = document.getElementById('token-exchange-amount');
        const inputLabel = document.getElementById('token-exchange-input-label'); // Assuming this ID exists for the label
        const unitLabel = document.getElementById('token-exchange-input-unit'); // Assuming this ID exists for the unit span

        if (this.config.contractConfig.inverseMode) { // 金币兑换代币 (用户输入金币)
            if (inputLabel) inputLabel.textContent = `兑换${gameCoinSymbol}:`;
            if (amountInput) amountInput.placeholder = `输入支付的 ${gameCoinSymbol} 数量`;
            if (unitLabel) unitLabel.textContent = gameCoinSymbol; // Unit next to input becomes gameCoinSymbol
            // Balance display should already be correct via updateAllDynamicUI -> updateBalances
        } else { // 代币兑换金币 (用户输入代币)
            if (inputLabel) inputLabel.textContent = `支付 ${tokenSymbol}:`;
            if (amountInput) amountInput.placeholder = `输入支付的 ${tokenSymbol} 数量`;
            if (unitLabel) unitLabel.textContent = tokenSymbol; // Unit next to input becomes tokenSymbol
        }
    },

    updateAllDynamicUI: function() {
        console.log("TokenExchange.updateAllDynamicUI: 更新所有动态UI元素");
        this.updateInputLabelsAndPlaceholders();
        this.updateRateUI();
        this.updateTaxRateUI();
        this.updateMinExchangeAmountUI(); // MIN_EXCHANGE_AMOUNT is now in wei, handled by this func
        this.updateCalculation();
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
        title.textContent = '代币管理';
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
        coinsBalance.innerHTML = '余额: <span>0</span>';
        coinsBalance.style.cssText = `
            margin: 5px 0;
            font-size: 16px;
        `;

        // 创建代币余额
        const tokensBalance = document.createElement('p');
        tokensBalance.id = 'token-exchange-tokens-balance';
        // tokensBalance.innerHTML = `${this.config.TOKEN_NAME} 余额: <span>0</span>`; // Token name updated later
        tokensBalance.innerHTML = `<span class="token-unit-label">${this.config.TOKEN_NAME}</span> 余额: <span>0</span>`;
        tokensBalance.style.cssText = `
            margin: 5px 0;
            font-size: 16px;
        `;

        // 添加余额信息
        balanceInfo.appendChild(coinsBalance);
        balanceInfo.appendChild(tokensBalance);

        // 创建选项卡容器
        const tabsContainer = document.createElement('div');
        tabsContainer.style.cssText = `
            display: flex;
            justify-content: center;
            margin: 15px 0 5px;
            border-bottom: 1px solid #ddd;
        `;

        // 创建兑换选项卡
        const exchangeTab = document.createElement('div');
        exchangeTab.textContent = '兑换代币';
        exchangeTab.className = 'token-tab active';
        exchangeTab.style.cssText = `
            padding: 8px 15px;
            cursor: pointer;
            border-bottom: 2px solid #4CAF50;
            color: #4CAF50;
            font-weight: bold;
            margin: 0 5px;
        `;

        // 创建奖励池选项卡
        const rewardPoolTab = document.createElement('div');
        rewardPoolTab.textContent = '奖励池';
        rewardPoolTab.className = 'token-tab';
        rewardPoolTab.style.cssText = `
            padding: 8px 15px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            color: #777;
            margin: 0 5px;
        `;

        // 创建资金池选项卡
        const fundingPoolTab = document.createElement('div');
        fundingPoolTab.textContent = '资金池';
        fundingPoolTab.className = 'token-tab';
        fundingPoolTab.style.cssText = `
            padding: 8px 15px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            color: #777;
            margin: 0 5px;
        `;

        // 添加选项卡到容器
        tabsContainer.appendChild(exchangeTab);
        tabsContainer.appendChild(rewardPoolTab);
        tabsContainer.appendChild(fundingPoolTab);

        // 创建内容区域容器
        const contentContainer = document.createElement('div');
        contentContainer.style.cssText = `
            margin: 15px 0;
        `;

        // 创建兑换表单
        const exchangeForm = document.createElement('div');
        exchangeForm.id = 'exchange-form';
        exchangeForm.style.cssText = `
            margin: 0;
            display: block;
        `;

        // 创建兑换比例信息
        const rateInfo = document.createElement('p');
        rateInfo.id = 'token-exchange-rate-info';
        // rateInfo.innerHTML = `兑换比例: <strong>${this.config.COINS_PER_TOKEN}</strong> 金币 = <strong>1</strong> ${this.config.TOKEN_NAME}`; // Updated by updateRateUI
        rateInfo.style.cssText = `
            margin: 10px 0;
            font-size: 14px;
            color: #666;
        `;

        // 创建代币税信息
        const taxInfo = document.createElement('p');
        taxInfo.id = 'token-exchange-tax-info';
        // taxInfo.innerHTML = `代币税: <strong>${this.config.TOKEN_TAX_PERCENT}%</strong>`; // Updated by updateTaxRateUI
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

        // 创建输入标签 - 内容会动态更新
        const inputLabel = document.createElement('label');
        inputLabel.id = 'token-exchange-input-label';
        // inputLabel.textContent = '兑换数量:'; // Updated by updateInputLabelsAndPlaceholders
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
            TokenExchange.handleInputChange(); // Changed from updateCalculation
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

        // 创建单位标签 - 内容会动态更新
        const unitLabel = document.createElement('span');
        unitLabel.id = 'token-exchange-input-unit';
        unitLabel.classList.add('token-unit-label'); // Class for easy update
        // unitLabel.textContent = this.config.TOKEN_NAME; // Updated by updateTokenNameInUI
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

        // 组装兑换表单
        exchangeForm.appendChild(rateInfo);
        exchangeForm.appendChild(taxInfo);
        exchangeForm.appendChild(inputGroup);
        exchangeForm.appendChild(calculationResult);
        exchangeForm.appendChild(exchangeButton);
        exchangeForm.appendChild(resultMessage);

        // 创建奖励池内容
        const rewardPoolContent = document.createElement('div');
        rewardPoolContent.id = 'reward-pool-content';
        rewardPoolContent.style.cssText = `
            margin: 0;
            display: none;
            text-align: center;
        `;

        // 奖励池加载提示
        const rewardPoolLoading = document.createElement('p');
        rewardPoolLoading.id = 'reward-pool-loading';
        rewardPoolLoading.textContent = '加载中...';
        rewardPoolLoading.style.cssText = 'color: #f0ad4e;';

        // 奖励池错误提示
        const rewardPoolError = document.createElement('p');
        rewardPoolError.id = 'reward-pool-error';
        rewardPoolError.style.cssText = 'color: #d9534f; display: none;';

        // 奖励池余额显示
        const rewardPoolBalance = document.createElement('p');
        rewardPoolBalance.id = 'reward-pool-balance';
        rewardPoolBalance.style.cssText = 'font-size: 22px; color: #5cb85c; margin: 20px 0; font-weight: bold;';

        // 奖励池说明
        const rewardPoolDesc = document.createElement('p');
        rewardPoolDesc.textContent = '奖励池中的代币来自所有交易的税收，将用于游戏激励和社区建设。';
        rewardPoolDesc.style.cssText = 'font-size: 14px; color: #666; margin-top: 15px;';

        // 组装奖励池内容
        rewardPoolContent.appendChild(rewardPoolLoading);
        rewardPoolContent.appendChild(rewardPoolError);
        rewardPoolContent.appendChild(rewardPoolBalance);
        rewardPoolContent.appendChild(rewardPoolDesc);

        // 创建资金池内容
        const fundingPoolContent = document.createElement('div');
        fundingPoolContent.id = 'funding-pool-content';
        fundingPoolContent.style.cssText = `
            margin: 0;
            display: none;
            text-align: center;
        `;

        // 资金池加载提示
        const fundingPoolLoading = document.createElement('p');
        fundingPoolLoading.id = 'funding-pool-loading';
        fundingPoolLoading.textContent = '加载中...';
        fundingPoolLoading.style.cssText = 'color: #f0ad4e;';

        // 资金池错误提示
        const fundingPoolError = document.createElement('p');
        fundingPoolError.id = 'funding-pool-error';
        fundingPoolError.style.cssText = 'color: #d9534f; display: none;';

        // 资金池余额显示
        const fundingPoolBalance = document.createElement('p');
        fundingPoolBalance.id = 'funding-pool-balance';
        fundingPoolBalance.style.cssText = 'font-size: 22px; color: #5cb85c; margin: 20px 0; font-weight: bold;';

        // 资金池说明
        const fundingPoolDesc = document.createElement('p');
        fundingPoolDesc.textContent = '资金池中的代币用于游戏开发和运营，确保游戏的长期可持续发展。';
        fundingPoolDesc.style.cssText = 'font-size: 14px; color: #666; margin-top: 15px;';

        // 组装资金池内容
        fundingPoolContent.appendChild(fundingPoolLoading);
        fundingPoolContent.appendChild(fundingPoolError);
        fundingPoolContent.appendChild(fundingPoolBalance);
        fundingPoolContent.appendChild(fundingPoolDesc);

        // 将所有内容添加到内容容器
        contentContainer.appendChild(exchangeForm);
        contentContainer.appendChild(rewardPoolContent);
        contentContainer.appendChild(fundingPoolContent);

        // 添加选项卡切换事件
        exchangeTab.addEventListener('click', () => {
            // 更新选项卡样式
            exchangeTab.className = 'token-tab active';
            exchangeTab.style.borderBottom = '2px solid #4CAF50';
            exchangeTab.style.color = '#4CAF50';
            exchangeTab.style.fontWeight = 'bold';

            rewardPoolTab.className = 'token-tab';
            rewardPoolTab.style.borderBottom = '2px solid transparent';
            rewardPoolTab.style.color = '#777';
            rewardPoolTab.style.fontWeight = 'normal';

            fundingPoolTab.className = 'token-tab';
            fundingPoolTab.style.borderBottom = '2px solid transparent';
            fundingPoolTab.style.color = '#777';
            fundingPoolTab.style.fontWeight = 'normal';

            // 显示对应内容
            exchangeForm.style.display = 'block';
            rewardPoolContent.style.display = 'none';
            fundingPoolContent.style.display = 'none';
        });

        rewardPoolTab.addEventListener('click', () => {
            // 更新选项卡样式
            exchangeTab.className = 'token-tab';
            exchangeTab.style.borderBottom = '2px solid transparent';
            exchangeTab.style.color = '#777';
            exchangeTab.style.fontWeight = 'normal';

            rewardPoolTab.className = 'token-tab active';
            rewardPoolTab.style.borderBottom = '2px solid #f0ad4e';
            rewardPoolTab.style.color = '#f0ad4e';
            rewardPoolTab.style.fontWeight = 'bold';

            fundingPoolTab.className = 'token-tab';
            fundingPoolTab.style.borderBottom = '2px solid transparent';
            fundingPoolTab.style.color = '#777';
            fundingPoolTab.style.fontWeight = 'normal';

            // 显示对应内容
            exchangeForm.style.display = 'none';
            rewardPoolContent.style.display = 'block';
            fundingPoolContent.style.display = 'none';

            // 加载奖励池数据
            this.loadRewardPoolBalance();
        });

        fundingPoolTab.addEventListener('click', () => {
            // 更新选项卡样式
            exchangeTab.className = 'token-tab';
            exchangeTab.style.borderBottom = '2px solid transparent';
            exchangeTab.style.color = '#777';
            exchangeTab.style.fontWeight = 'normal';

            rewardPoolTab.className = 'token-tab';
            rewardPoolTab.style.borderBottom = '2px solid transparent';
            rewardPoolTab.style.color = '#777';
            rewardPoolTab.style.fontWeight = 'normal';

            fundingPoolTab.className = 'token-tab active';
            fundingPoolTab.style.borderBottom = '2px solid #5bc0de';
            fundingPoolTab.style.color = '#5bc0de';
            fundingPoolTab.style.fontWeight = 'bold';

            // 显示对应内容
            exchangeForm.style.display = 'none';
            rewardPoolContent.style.display = 'none';
            fundingPoolContent.style.display = 'block';

            // 加载资金池数据
            this.loadFundingPoolBalance();
        });

        // 组装面板
        panel.appendChild(title);
        panel.appendChild(balanceInfo);
        panel.appendChild(tabsContainer);
        panel.appendChild(contentContainer);

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
            await this.init(); // Make sure init completes
        } else {
            // 如果已初始化，可能需要刷新合约配置，以防在UI打开时发生变化
            if (Web3TokenContract && Web3TokenContract.tokenContract) {
                console.log("TokenExchange.show: UI已初始化，尝试刷新配置 (从Web3Config)...");
                this.loadFallbackConfig(); // 改为调用 loadFallbackConfig
            }
        }


        // 获取当前钱包地址
        if (typeof WalletManager !== 'undefined') {
            this.walletAddress = WalletManager.getAccount();
        }

        if (!this.walletAddress) {
            // 尝试主动连接钱包
            if (typeof Web3TokenContract !== 'undefined' && Web3TokenContract.initWeb3) {
                const connected = await Web3TokenContract.initWeb3(); // This requests accounts
                if (connected && Web3TokenContract.userAddress) {
                    this.walletAddress = Web3TokenContract.userAddress;
                    console.log("TokenExchange.show: 钱包连接成功:", this.walletAddress);
                } else {
                    alert('请先连接钱包');
                    return;
                }
            } else {
                alert('请先连接钱包 (Web3TokenContract not available)');
                return;
            }
        }

        // 显示加载中状态
        this.showLoading(true, "加载配置和余额...");

        // 更新余额信息
        await this.updateBalances();

        // 更新所有动态UI元素，包括计算结果
        this.updateAllDynamicUI();


        // 检查localStorage中是否有测试页面保存的值 (保留此功能)
        const testValue = localStorage.getItem('inputTestValue');
        if (testValue) {
            const input = document.getElementById('token-exchange-amount');
            if (input) {
                input.value = testValue;
                localStorage.removeItem('inputTestValue');
                console.log('从测试页面应用值:', testValue);
                this.updateCalculation(); // Re-calculate if value is set from test
            }
        }
        
        // 移除旧的强制从Web3Config更新税率的逻辑
        // if (typeof Web3Config !== 'undefined' && Web3Config.EXCHANGE && Web3Config.EXCHANGE.TAX_RATE !== undefined) { ... }

        // UI更新已通过 updateAllDynamicUI() 处理

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
        console.log('TokenExchange.updateCalculation: 更新计算结果 (回滚后逻辑)');
        const amountInput = document.getElementById('token-exchange-amount');
        const calculationElement = document.getElementById('token-exchange-calculation');
        const exchangeButton = document.getElementById('token-exchange-button');

        // Clear previous calculated values
        this.calculatedGameCoinsInvolved = null;
        this.calculatedNetTokensWei = null;
        this.calculatedGrossTokensWei = null;
        this.calculatedTaxAmountWei = null;
        this.calculatedIsEnoughResources = false;
        this.calculatedIsBelowMin = false;
        this.calculatedIsAboveMax = false;

        if (!amountInput || !calculationElement || !exchangeButton || !Web3TokenContract || !Web3TokenContract.web3 || !this.config) {
            console.error('TokenExchange.updateCalculation: 必要的UI元素、Web3TokenContract或配置未初始化。');
            if (calculationElement) calculationElement.innerHTML = '<p style="color: red;">计算组件错误，请刷新。</p>';
            if (exchangeButton) exchangeButton.disabled = true;
            return;
        }
        
        // 使用 this.config 中的配置 (来自 Web3Config)
        const inverseMode = this.config.contractConfig && typeof this.config.contractConfig.inverseMode === 'boolean' ? this.config.contractConfig.inverseMode : true; // 默认为金币换代币
        const coinsPerToken = parseFloat(this.config.COINS_PER_TOKEN);
        const tokenTaxPercent = parseFloat(this.config.TOKEN_TAX_PERCENT);
        const tokenDecimals = parseInt(this.config.TOKEN_DECIMALS);
        const minExchangeTokenUnit = parseFloat(this.config.MIN_EXCHANGE_AMOUNT); // 以代币单位
        const maxExchangeTokenUnit = parseFloat(this.config.MAX_EXCHANGE_AMOUNT); // 以代币单位
        const tokenSymbol = this.config.TOKEN_NAME || '代币';

        if (isNaN(coinsPerToken) || isNaN(tokenTaxPercent) || isNaN(tokenDecimals) || isNaN(minExchangeTokenUnit) || isNaN(maxExchangeTokenUnit)) {
            console.warn('TokenExchange.updateCalculation: 配置不完整 (汇率/税率/小数/最小最大值)，无法计算。');
            calculationElement.innerHTML = '<p>兑换配置不完整...</p>';
            exchangeButton.disabled = true;
            return;
        }

        let inputValueString = amountInput.value.replace(/[^0-9.]/g, ''); // 允许小数点
        if (inputValueString === '' || parseFloat(inputValueString) <= 0) {
            calculationElement.innerHTML = '<p>请输入有效的数量。</p>';
            exchangeButton.disabled = true;
            return;
        }
        const userInputValue = parseFloat(inputValueString);

        const tokenUnitName = this.getUnitForDecimals(tokenDecimals); // 'ether', 'mwei', etc.
        const multiplierForWei_BI = BigInt(10) ** BigInt(tokenDecimals);
        const tenThousand_BI = BigInt(10000);
        const taxRateBPS_BI = BigInt(Math.round(tokenTaxPercent * 100)); // TOKEN_TAX_PERCENT is %, convert to BPS

        let calculatedGameCoinsInvolved_BI;
        let calculatedNetTokensWei_BI;
        let calculatedGrossTokensWei_BI;
        let calculatedTaxAmountWei_BI;
        let htmlOutput = '';
        let isEnoughResources = false;
        let isBelowMin = false;
        let isAboveMax = false;
        
        let userInputTokensWei_BI; // 用户输入的代币数量 (Wei) - 可能是期望获得的净额或支付的毛额

        if (inverseMode) { // 金币兑换代币: 用户输入的是希望支付的【游戏金币】数量
            // userInputValue is gameCoinAmount (e.g., 10 game coins)
            const gameCoinAmount_input = userInputValue;
            const tokensPerGC_config = parseFloat(this.config.COINS_PER_TOKEN); // e.g., 100 (Tokens per GC from EXCHANGE.RATE)

            // 1. Calculate Gross Tokens user will receive (in token units)
            const grossTokensUnit = gameCoinAmount_input * tokensPerGC_config; // e.g., 10 GC * 100 Tokens/GC = 1000 Tokens

            // 2. Convert Gross Tokens to Wei. This is the amount for the transaction.
            // this.calculatedNetTokensWei is used by performExchange. For this flow, it should hold GROSS tokens
            // as server tax is an off-chain concept for this part, contract receives gross.
            console.log('TokenExchange.updateCalculation (inverse): Attempting to set this.calculatedNetTokensWei. grossTokensUnit:', grossTokensUnit, 'tokenUnitName:', tokenUnitName, 'Web3TokenContract.web3 available:', !!(Web3TokenContract && Web3TokenContract.web3 && Web3TokenContract.web3.utils));
            try {
                this.calculatedNetTokensWei = BigInt(Web3TokenContract.web3.utils.toWei(grossTokensUnit.toString(), tokenUnitName));
                console.log('TokenExchange.updateCalculation (inverse): this.calculatedNetTokensWei set to:', this.calculatedNetTokensWei ? this.calculatedNetTokensWei.toString() : 'undefined');
            } catch (e) {
                console.error('TokenExchange.updateCalculation (inverse): Error setting this.calculatedNetTokensWei:', e);
                this.calculatedNetTokensWei = undefined; // Explicitly set to undefined on error
                // Consider disabling exchange button or showing an error in calculationResult here
            }
            
            // For internal consistency in this function's calculations and display logic:
            // Ensure calculatedGrossTokensWei_BI uses the potentially updated this.calculatedNetTokensWei
            calculatedGrossTokensWei_BI = this.calculatedNetTokensWei || BigInt(0); // Default to 0 if undefined to prevent further errors

            // 3. Game Coins involved is what user typed
            this.calculatedGameCoinsInvolved = BigInt(Math.round(gameCoinAmount_input)); // Assign to instance property
            console.log('TokenExchange.updateCalculation (inverse): this.calculatedGameCoinsInvolved set to:', this.calculatedGameCoinsInvolved ? this.calculatedGameCoinsInvolved.toString() : 'undefined');
            // Keep local var for now if used later in this scope, or remove if this.calculatedGameCoinsInvolved is used directly
            calculatedGameCoinsInvolved_BI = this.calculatedGameCoinsInvolved;
calculatedNetTokensWei_BI = this.calculatedNetTokensWei; // Ensure local var gets value from instance property

            // 4. For UI Display: Calculate server tax (based on config) and net tokens
            // taxRateBPS_BI is already defined from this.config.TOKEN_TAX_PERCENT (e.g. 10% -> 1000 BPS)
            // const tenThousand_BI = BigInt(10000); // Already defined above
            // const taxRateBPS_BI = BigInt(Math.round(parseFloat(this.config.TOKEN_TAX_PERCENT) * 100)); // Already defined above

            const displayedTaxAmountWei_for_UI_BI = (calculatedGrossTokensWei_BI * taxRateBPS_BI) / tenThousand_BI;
            const displayedNetTokensWei_for_UI_BI = calculatedGrossTokensWei_BI - displayedTaxAmountWei_for_UI_BI;
            
            const grossTokens_Formatted = parseFloat(this._formatWeiToDisplay(calculatedGrossTokensWei_BI, tokenDecimals)).toLocaleString();
            const serverTaxAmount_Formatted = parseFloat(this._formatWeiToDisplay(displayedTaxAmountWei_for_UI_BI, tokenDecimals)).toLocaleString();
            const netTokens_Formatted = parseFloat(this._formatWeiToDisplay(displayedNetTokensWei_for_UI_BI, tokenDecimals)).toLocaleString();
            const serverTaxPercent_Display = parseFloat(this.config.TOKEN_TAX_PERCENT) || 0;

            htmlOutput = `
                <p>您支付: <strong>${gameCoinAmount_input.toLocaleString()}</strong> 金币</p>
                <p>可兑换 ${tokenSymbol} (毛额): <strong>${grossTokens_Formatted}</strong></p>
                <p>服务器税 (${serverTaxPercent_Display.toFixed(2)}%): <strong>${serverTaxAmount_Formatted}</strong> ${tokenSymbol}</p>
                <p>您将获得 ${tokenSymbol} (净额, 参考): <strong>${netTokens_Formatted}</strong></p>
            `;
            
            isEnoughResources = BigInt(this.currentCoins.toString()) >= calculatedGameCoinsInvolved_BI;
            if (!isEnoughResources) {
                 const neededMoreCoins = calculatedGameCoinsInvolved_BI - BigInt(this.currentCoins.toString());
                 htmlOutput += `<p style="color: red; margin-top: 10px;">金币不足，还需要 ${neededMoreCoins.toLocaleString()} 金币</p>`;
            }
            
            // Min/Max check (userInputValue is game coins, min/max in config are token units)
            const minTokensConfig = minExchangeTokenUnit; // Min tokens (unit) from config
            const maxTokensConfig = maxExchangeTokenUnit; // Max tokens (unit) from config

            if (grossTokensUnit < minTokensConfig && minTokensConfig > 0 && tokensPerGC_config > 0) {
                isBelowMin = true;
                const minGameCoinsRequired = minTokensConfig / tokensPerGC_config;
                htmlOutput += `<p style="color: orange; margin-top: 10px;">至少需要兑换 ${minTokensConfig.toLocaleString()} ${tokenSymbol} (即支付 ${minGameCoinsRequired.toLocaleString()} 金币)。</p>`;
            }
            if (grossTokensUnit > maxTokensConfig && maxTokensConfig > 0 && tokensPerGC_config > 0) {
                isAboveMax = true;
                const maxGameCoinsAllowed = maxTokensConfig / tokensPerGC_config;
                htmlOutput += `<p style="color: orange; margin-top: 10px;">最多只能兑换 ${maxTokensConfig.toLocaleString()} ${tokenSymbol} (即支付 ${maxGameCoinsAllowed.toLocaleString()} 金币)。</p>`;
            }
        } else { // 代币兑换金币: 用户输入的是期望获得的【净代币】数量
            userInputTokensWei_BI = BigInt(Web3TokenContract.web3.utils.toWei(userInputValue.toString(), tokenUnitName));
            calculatedNetTokensWei_BI = userInputTokensWei_BI; // 用户输入的是净额

            if (taxRateBPS_BI < BigInt(0) || taxRateBPS_BI >= tenThousand_BI) { // Tax rate must be < 100% for this calculation
                 calculationElement.innerHTML = '<p style="color: red;">错误：税率配置不正确 (代币兑换金币时，税率必须小于100%)。</p>';
                 this.disableExchangeButtonOnError(); return;
            }
            // Gross = Net / (1 - TaxRate) = Net * 10000 / (10000 - TaxBPS)
            calculatedGrossTokensWei_BI = (calculatedNetTokensWei_BI * tenThousand_BI) / (tenThousand_BI - taxRateBPS_BI);
            calculatedTaxAmountWei_BI = calculatedGrossTokensWei_BI - calculatedNetTokensWei_BI;
            
            // GameCoinsToReceive = GrossTokens (in unit) * CoinsPerToken
            // (Here, grossTokensInUnit is the total tokens the user effectively "pays" or "forgoes" from their balance)
            const grossTokensInUnit_forCoinCalc = parseFloat(Web3TokenContract.web3.utils.fromWei(calculatedGrossTokensWei_BI.toString(), tokenUnitName));
            calculatedGameCoinsInvolved_BI = BigInt(Math.ceil(grossTokensInUnit_forCoinCalc * coinsPerToken)); // 金币获得

            htmlOutput = `
                <p>您希望获得 (净): <strong>${userInputValue.toLocaleString()}</strong> ${tokenSymbol}</p>
                <p>代币税 (${tokenTaxPercent.toFixed(2)}%): <strong>${parseFloat(this._formatWeiToDisplay(calculatedTaxAmountWei_BI, tokenDecimals)).toLocaleString()}</strong> ${tokenSymbol}</p>
                <p>总计支付代币 (税前): <strong>${parseFloat(this._formatWeiToDisplay(calculatedGrossTokensWei_BI, tokenDecimals)).toLocaleString()}</strong> ${tokenSymbol}</p>
                <p>您将获得: <strong>${calculatedGameCoinsInvolved_BI.toLocaleString()}</strong> 金币</p>
            `;
            // 资源检查: 用户需要足够的代币 (gross amount)
            isEnoughResources = BigInt(Web3TokenContract.web3.utils.toWei(this.currentTokens.toString(), tokenUnitName)) >= calculatedGrossTokensWei_BI;
            if (!isEnoughResources) {
                 const neededMoreTokensWei = calculatedGrossTokensWei_BI - BigInt(Web3TokenContract.web3.utils.toWei(this.currentTokens.toString(), tokenUnitName));
                 htmlOutput += `<p style="color: red; margin-top: 10px;">${tokenSymbol} 不足，还需要 ${parseFloat(this._formatWeiToDisplay(neededMoreTokensWei, tokenDecimals)).toLocaleString()} ${tokenSymbol}</p>`;
            }
        }

        // Min/Max checks (against user input token unit, or gross token unit involved)
        // The amount being checked (userInputTokensWei_BI or calculatedGrossTokensWei_BI) should be compared against min/max in Wei.
        const minExchangeAmountWei_BI = BigInt(Web3TokenContract.web3.utils.toWei(minExchangeTokenUnit.toString(), tokenUnitName));
        const maxExchangeAmountWei_BI = BigInt(Web3TokenContract.web3.utils.toWei(maxExchangeTokenUnit.toString(), tokenUnitName));
        
        // Check against the gross amount of tokens involved in the transaction from the user's perspective of input.
        // If coin->token, user inputs desired net tokens, we check this net amount.
        // If token->coin, user inputs gross tokens to pay, we check this gross amount.
        // Min/Max 检查应始终基于合约处理的总代币量 (税前)
        const amountToCheckAgainstMinMaxWei_BI = calculatedGrossTokensWei_BI;


        if (amountToCheckAgainstMinMaxWei_BI <= BigInt(0) && userInputValue > 0) {
             htmlOutput += `<p style="color: red; margin-top: 10px;">计算得到的有效 ${tokenSymbol} 数量为零或无效。</p>`;
        } else if (userInputValue > 0) {
            if (amountToCheckAgainstMinMaxWei_BI < minExchangeAmountWei_BI) {
                isBelowMin = true;
                htmlOutput += `<p style="color: red; margin-top: 10px;">兑换数量低于最小限制 ${minExchangeTokenUnit.toLocaleString()} ${tokenSymbol}。</p>`;
            }
            if (amountToCheckAgainstMinMaxWei_BI > maxExchangeAmountWei_BI) {
                isAboveMax = true;
                htmlOutput += `<p style="color: red; margin-top: 10px;">兑换数量高于最大限制 ${maxExchangeTokenUnit.toLocaleString()} ${tokenSymbol}。</p>`;
            }
        }
        
        calculationElement.innerHTML = htmlOutput;
        this.calculatedGameCoinsInvolved = calculatedGameCoinsInvolved_BI;
        this.calculatedNetTokensWei = calculatedNetTokensWei_BI;
        this.calculatedGrossTokensWei = calculatedGrossTokensWei_BI;
        this.calculatedTaxAmountWei = calculatedTaxAmountWei_BI;
        this.calculatedIsEnoughResources = isEnoughResources;
        this.calculatedIsBelowMin = isBelowMin;
        this.calculatedIsAboveMax = isAboveMax;
        
console.log(`[DEBUG] TokenExchange.updateCalculation END: GI=${this.calculatedGameCoinsInvolved ? this.calculatedGameCoinsInvolved.toString() : 'undef'}, NTW=${this.calculatedNetTokensWei ? this.calculatedNetTokensWei.toString() : 'undef'}`);
        const isInputEffectivelyZero = userInputValue <= 0; // Check against parsed float
        exchangeButton.disabled = isInputEffectivelyZero || !isEnoughResources || isBelowMin || isAboveMax || !this.calculatedGrossTokensWei || this.calculatedGrossTokensWei <= BigInt(0);
        exchangeButton.style.opacity = exchangeButton.disabled ? '0.5' : '1';
        exchangeButton.style.cursor = exchangeButton.disabled ? 'not-allowed' : 'pointer';
    },

    handleInputChange: function() {
        this.updateCalculation();
    },

    disableExchangeButtonOnError: function() {
        const exchangeButton = document.getElementById('token-exchange-button');
        if (exchangeButton) {
            exchangeButton.disabled = true;
            exchangeButton.style.opacity = '0.5';
            exchangeButton.style.cursor = 'not-allowed';
        }
    },

    // 执行兑换
    performExchange: async function() {
        console.log('TokenExchange.performExchange: 执行代币兑换/充值');
        const amountInput = document.getElementById('token-exchange-amount');
        const inputValueString = amountInput ? amountInput.value.replace(/[^0-9]/g, '') : '0';

        if (!this.walletAddress) {
            this.showResultMessage('请先连接钱包', 'error');
            // Attempt to auto-connect if not connected
            if (typeof Web3TokenContract !== 'undefined' && Web3TokenContract.initWeb3) {
                const connected = await Web3TokenContract.initWeb3(); // Ensure this updates this.walletAddress
                if (connected && Web3TokenContract.userAddress) {
                    this.walletAddress = Web3TokenContract.userAddress; // Explicitly update
                    this.showResultMessage('钱包已连接，请重试操作。', 'info');
                } else {
                    this.showResultMessage('钱包连接失败，请手动连接后重试。', 'error');
                    return;
                }
            } else {
                return;
            }
        }
        
        // Use calculated values for checks from this.updateCalculation()
        if (parseFloat(inputValueString) <= 0 || !this.calculatedGrossTokensWei || this.calculatedGrossTokensWei <= BigInt(0)) {
            this.showResultMessage('请输入有效的兑换数量。', 'error');
            return;
        }
        if (!this.calculatedIsEnoughResources) {
            this.showResultMessage('资源不足 (金币或代币)，无法完成兑换。', 'error');
            return;
        }
        if (this.calculatedIsBelowMin) {
            const minAmountInUnit = parseFloat(Web3TokenContract.web3.utils.fromWei(this.config.contractConfig.minExchangeAmountWei.toString(), this.getUnitForDecimals(this.config.contractConfig.tokenDecimals)));
            this.showResultMessage(`兑换数量低于最小兑换量 ${minAmountInUnit.toLocaleString()} ${this.config.contractConfig.tokenSymbol || '代币'} (税前)。`, 'error');
            return;
        }
        if (this.calculatedIsAboveMax) {
            const maxAmountInUnit = parseFloat(Web3TokenContract.web3.utils.fromWei(this.config.contractConfig.maxExchangeAmountWei.toString(), this.getUnitForDecimals(this.config.contractConfig.tokenDecimals)));
            this.showResultMessage(`兑换数量高于最大兑换量 ${maxAmountInUnit.toLocaleString()} ${this.config.contractConfig.tokenSymbol || '代币'} (税前)。`, 'error');
            return;
        }

        const exchangeButton = document.getElementById('token-exchange-button');
        if (exchangeButton) exchangeButton.disabled = true; // Disable button early
        
        const authoritativeContractMode = this.config.contractConfig.inverseMode;
        this.showLoading(true, authoritativeContractMode ? "处理兑换..." : "处理充值...");

        try {
            console.log('[DEBUG] TokenExchange.performExchange: Entry - this.calculatedGameCoinsInvolved:', this.calculatedGameCoinsInvolved ? this.calculatedGameCoinsInvolved.toString() : 'undefined');
            console.log('[DEBUG] TokenExchange.performExchange: Entry - this.calculatedNetTokensWei:', this.calculatedNetTokensWei ? this.calculatedNetTokensWei.toString() : 'undefined');
            const nonce = generateNonce(); // Ensure this function is globally available or defined within TokenExchange
            let signatureData;
            let exchangeResult;
            
            // These are the values that will be sent to the server for signing
            // AND to the smart contract. They are derived from the `this.calculated...` properties.
            let gameCoins_str;
            let tokensWei_str; // This will be NET for coin->token, GROSS for token->coin

            if (authoritativeContractMode) { // 金币兑换代币 (user inputs game coins, receives net tokens)
                gameCoins_str = this.calculatedGameCoinsInvolved.toString();
                tokensWei_str = this.calculatedNetTokensWei.toString(); // Server expects NET, contract's exchangeFromGame expects NET
            } else { // 代币兑换金币 (user inputs gross tokens, receives game coins)
                tokensWei_str = this.calculatedGrossTokensWei.toString(); // Server expects GROSS, contract's rechargeToGame expects GROSS
                gameCoins_str = this.calculatedGameCoinsInvolved.toString();
            }
            
            console.log('TokenExchange.performExchange: 准备请求签名参数:', {
                playerAddress: this.walletAddress,
                tokenAmountForSignOrContract: tokensWei_str, 
                gameCoinsForSignOrContract: gameCoins_str,    
                nonce: nonce,
                isInverseForSign: authoritativeContractMode 
            });

            const contractAddr = this.config.contractConfig.contractAddress;
            if (!contractAddr || (typeof Web3TokenContract !== 'undefined' && Web3TokenContract.web3 && Web3TokenContract.web3.utils && !Web3TokenContract.web3.utils.isAddress(contractAddr))) {
                console.error("TokenExchange.performExchange: Invalid or missing contract address from config:", contractAddr);
                this.showResultMessage('配置错误：合约地址无效或缺失', 'error');
                this.showLoading(false);
                if (exchangeButton) exchangeButton.disabled = false;
                return;
            }
            signatureData = await ApiService.getExchangeSignature(
                this.walletAddress,
                tokensWei_str, // Pass the wei string directly
                gameCoins_str, // Pass the coin string directly
                contractAddr,  // Pass the correct contract address
                authoritativeContractMode
            );

            if (!signatureData || !signatureData.signature) { 
                throw new Error(signatureData?.error || "获取服务器签名失败。");
            }
            console.log('TokenExchange.performExchange: 获取到交易签名:', signatureData);
            
            if (authoritativeContractMode) { // 金币兑换代币
                 console.log('TokenExchange.performExchange: 调用 exchangeCoinsForTokensWithSignature with:', {
                    gameCoins: gameCoins_str,
                    tokenAmountNetWei: tokensWei_str, // NET
                    nonce: signatureData.nonce, // Use nonce from server response
                    signature: signatureData.signature
                });
                exchangeResult = await Web3TokenContract.exchangeCoinsForTokensWithSignature(
                    gameCoins_str,
                    tokensWei_str,
                    signatureData.nonce,
                    authoritativeContractMode, // Pass the isInverse mode
                    signatureData.signature
                );
            } else { // 代币兑换金币
                console.log('TokenExchange.performExchange: 调用 rechargeTokensForCoinsWithSignature with:', {
                    tokenAmountGrossWei: tokensWei_str, // GROSS
                    gameCoinsToReceive: gameCoins_str,
                    nonce: signatureData.nonce, // Use nonce from server response
                    signature: signatureData.signature
                });
                exchangeResult = await Web3TokenContract.rechargeTokensForCoinsWithSignature(
                    tokensWei_str,     
                    gameCoins_str,       
                    signatureData.nonce,            
                    signatureData.signature
                );
            }

            if (!exchangeResult || !exchangeResult.success) {
                throw new Error(exchangeResult?.error || (authoritativeContractMode ? '兑换失败' : '充值失败'));
            }

            const tx = exchangeResult.data; 
            console.log('TokenExchange.performExchange: 交易已提交:', tx.transactionHash);

            if (tx && tx.transactionHash) {
                // For confirmation, use the same amounts that were signed
                const confirmApiResult = await ApiService.confirmExchangeOnServer(
                    this.walletAddress,
                    tokensWei_str, 
                    gameCoins_str, 
                    signatureData.nonce, 
                    tx.transactionHash, 
                    authoritativeContractMode 
                );

                if (confirmApiResult && confirmApiResult.success) {
                    this.showResultMessage(confirmApiResult.message || `${authoritativeContractMode ? '兑换' : '充值'}成功 (已确认)`, 'success');
                } else {
                    let confirmErrorMsg = `交易已在链上提交，但服务器确认失败。请检查您的余额。`;
                    if (confirmApiResult?.error) confirmErrorMsg += ` 服务器错误: ${confirmApiResult.error}`;
                    if (confirmApiResult?.failureReason) confirmErrorMsg += ` 失败原因: ${confirmApiResult.failureReason}`;
                    if (confirmApiResult?.coinsRefunded > 0) confirmErrorMsg += ` 已退还金币: ${confirmApiResult.coinsRefunded}`;
                    this.showResultMessage(confirmErrorMsg, 'warning');
                }
            } else {
                 this.showResultMessage('交易已在链上提交，但无法获取交易详情以供服务器确认。请检查余额。', 'warning');
            }

            await this.updateBalances(); 
            this.updateCalculation(); // Recalculate to reflect new balances and potentially clear input or show new state    

        } catch (error) {
            console.error(`TokenExchange.performExchange: ${authoritativeContractMode ? '兑换' : '充值'}过程中出错:`, error);
            let errorMessage = error.message || `${authoritativeContractMode ? '兑换' : '充值'}失败，请稍后重试`;
            if (error.code === 4001 || (error.message && (error.message.toLowerCase().includes('user rejected transaction') || error.message.toLowerCase().includes('user denied transaction')))) { 
                errorMessage = '您已取消交易。';
                 // Attempt to cancel/refund with backend if signature was obtained
                if (signatureData && signatureData.nonce && ApiService && ApiService.cancelExchange) {
                    try {
                        console.log("User cancelled, attempting to inform backend to cancel/refund...");
                        await ApiService.cancelExchange(
                            this.walletAddress, tokensWei_str, gameCoins_str, // Use the same amounts
                            signatureData.nonce, authoritativeContractMode
                        );
                        errorMessage += ' 已通知服务器尝试取消。';
                        await this.updateBalances(); 
                        this.updateCalculation();
                    } catch (cancelError) {
                        console.error('TokenExchange.performExchange: 调用cancelExchange失败:', cancelError);
                        errorMessage += ' 通知服务器取消失败。';
                    }
                }
            } else if (error.message && error.message.toLowerCase().includes('insufficient funds')) {
                errorMessage = '您的钱包余额不足以支付交易费用 (Gas)。';
            }
            this.showResultMessage(errorMessage, 'error');
        } finally {
            this.showLoading(false);
            if (exchangeButton) exchangeButton.disabled = false; // Re-enable button
            // It's good practice to call updateCalculation here to ensure UI is consistent
            // especially if the input field might need to be reset or re-validated based on new balances.
            this.updateCalculation(); 
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
        console.log('TokenExchange.updateTaxRateUI: 更新代币税率UI (回滚后)');
        const taxInfo = document.getElementById('token-exchange-tax-info');
        if (taxInfo) {
            // TOKEN_TAX_PERCENT 是从 Web3Config.EXCHANGE.TAX_RATE (BPS) / 100 计算得到的百分比
            // Display a 10% tax for UI purposes, actual server tax is 0%.
            const nominalTaxPercent = parseFloat(this.config.TOKEN_TAX_PERCENT) || 0;
            taxInfo.innerHTML = `代币税: <strong>${nominalTaxPercent.toFixed(2)}%</strong>`;
        } else {
            console.warn('TokenExchange.updateTaxRateUI: 找不到代币税率UI元素');
        }
    },

    // 更新兑换比例UI
    updateRateUI: function() {
        console.log('TokenExchange.updateRateUI: 更新兑换比例UI (回滚后)');
        const rateInfo = document.getElementById('token-exchange-rate-info');
        if (rateInfo) {
            const inverseMode = this.config.contractConfig && typeof this.config.contractConfig.inverseMode === 'boolean'
                                ? this.config.contractConfig.inverseMode
                                : null; // Default to null if not set, to show loading

            const coinsPerToken = parseFloat(this.config.COINS_PER_TOKEN);
            const tokenSymbol = this.config.TOKEN_NAME || (this.config.contractConfig && this.config.contractConfig.tokenSymbol) || '代币';

            if (inverseMode === null || isNaN(coinsPerToken)) {
                rateInfo.innerHTML = `兑换比例: <strong>加载中...</strong>`;
                return;
            }
            
            const rateDisplayValue = coinsPerToken; // COINS_PER_TOKEN is X金币 = 1代币单位

            if (inverseMode) { // 金币兑换代币 (inverseMode=true in contract, user wants tokens)
                               // User wants "1 Game Coin = X Tokens"
                const tokensPerCoin = rateDisplayValue;
                rateInfo.innerHTML = `兑换比例: <strong>1</strong> 游戏金币 = <strong>${tokensPerCoin.toLocaleString()}</strong> ${tokenSymbol}`;
            } else { // 代币兑换金币 (inverseMode=false in contract, user wants game coins)
                     // We display the rate as "1 TOKEN = X 金币" (This part remains as is, as it's already 1 TOKEN = X GC)
                rateInfo.innerHTML = `兑换比例: <strong>1</strong> ${tokenSymbol} = <strong>${rateDisplayValue.toLocaleString()}</strong> 金币`;
            }
        } else {
            console.warn('TokenExchange.updateRateUI: 找不到兑换比例UI元素');
        }
    },
    
    updateInputLabelsAndPlaceholders: function() {
        console.log('TokenExchange.updateInputLabelsAndPlaceholders: 更新输入框标签和占位符');
        const inputLabel = document.getElementById('token-exchange-input-label');
        const amountInput = document.getElementById('token-exchange-amount');
        const unitLabel = document.getElementById('token-exchange-input-unit');
        const exchangeButton = document.getElementById('token-exchange-button');
        const titleElement = document.querySelector('#token-exchange-panel h2');


        if (!inputLabel || !amountInput || !unitLabel || !exchangeButton || !titleElement) {
            console.warn("TokenExchange.updateInputLabelsAndPlaceholders: 部分UI元素未找到。");
            return;
        }

        const contractMode = this.config.contractConfig.inverseMode;
        const tokenSymbol = this.config.contractConfig.tokenSymbol || this.config.TOKEN_NAME;
        const minAmountDisplay = this.config.MIN_EXCHANGE_AMOUNT || 1;


        if (contractMode === null) {
            inputLabel.textContent = '数量:';
            amountInput.placeholder = `最小: ${minAmountDisplay}`;
            unitLabel.textContent = '...';
            exchangeButton.textContent = '加载中';
            titleElement.textContent = '代币管理';
            return;
        }

        if (contractMode) { // coin->token (inverseMode=true in contract)
            titleElement.textContent = '金币兑换代币';
            inputLabel.textContent = `兑换金币:`;
            unitLabel.textContent = "个";
            amountInput.placeholder = `最少 ${minAmountDisplay} ${tokenSymbol}`;
            exchangeButton.textContent = '兑换';
        } else { // token->coin (inverseMode=false in contract)
            titleElement.textContent = '代币充值金币';
            inputLabel.textContent = `支付 ${tokenSymbol}:`;
            unitLabel.textContent = tokenSymbol;
            amountInput.placeholder = `最少 ${minAmountDisplay} ${tokenSymbol}`;
            exchangeButton.textContent = '充值';
        }
    },

    updateTokenNameInUI: function(tokenName) {
        console.log(`TokenExchange.updateTokenNameInUI: 更新UI中的代币名称为 ${tokenName}`);
        const unitLabels = document.querySelectorAll('.token-unit-label');
        unitLabels.forEach(label => {
            label.textContent = tokenName;
        });
        // Also update the main token balance label if it's separate
        const tokensBalanceLabel = document.querySelector('#token-exchange-tokens-balance');
        if (tokensBalanceLabel && tokensBalanceLabel.firstChild && tokensBalanceLabel.firstChild.nodeType === Node.TEXT_NODE) {
            // This is a bit fragile, assumes "TOKEN_NAME 余额:" structure
            // A better way would be to have a dedicated span for the token name part of the balance label.
            // For now, if the structure is `<p>TOKEN_NAME 余额: <span>0</span></p>`, we update the first part.
            // The current HTML is `<span class="token-unit-label">TWB</span> 余额: <span>0</span>` which is handled by .token-unit-label
        }
    },

    // 显示/隐藏加载中状态
    showLoading: function(show, message = '处理中...') {
        const exchangeButton = document.getElementById('token-exchange-button');
        if (exchangeButton) {
            if (show) {
                exchangeButton.textContent = message;
                exchangeButton.disabled = true;
                exchangeButton.style.opacity = '0.7';
                exchangeButton.style.cursor = 'not-allowed';
            } else {
                // Text content will be reset by updateInputLabelsAndPlaceholders or updateCalculation
                // exchangeButton.textContent = '兑换'; // Or '充值' based on mode
                exchangeButton.disabled = false; // Will be re-evaluated by updateCalculation
                exchangeButton.style.opacity = '1';
                exchangeButton.style.cursor = 'pointer';
                this.updateCalculation(); // Recalculate to set correct button state and text
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
        const exchangeForm = document.getElementById('exchange-form'); // Target the form
        if (exchangeForm) { // Check if the form exists
            let minAmountTip = document.getElementById('min-exchange-amount-tip');
            if (!minAmountTip) {
                minAmountTip = document.createElement('div');
                minAmountTip.id = 'min-exchange-amount-tip';

                const taxInfoElement = document.getElementById('token-exchange-tax-info');
                if (taxInfoElement && taxInfoElement.parentNode === exchangeForm) {
                    // Insert after taxInfoElement if it exists and is a child of exchangeForm
                    exchangeForm.insertBefore(minAmountTip, taxInfoElement.nextSibling);
                } else {
                    // Fallback: if taxInfoElement is not found or has a different parent,
                    // try to insert it after rateInfoElement, or append to the form.
                    const rateInfoElement = document.getElementById('token-exchange-rate-info');
                    if (rateInfoElement && rateInfoElement.parentNode === exchangeForm) {
                         exchangeForm.insertBefore(minAmountTip, rateInfoElement.nextSibling);
                    } else {
                        // As a last resort, append to the form.
                        console.warn('TokenExchange.updateMinExchangeAmountUI: Could not find optimal insertion point for minAmountTip, appending to form.');
                        exchangeForm.appendChild(minAmountTip);
                    }
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
    },

    // 加载奖励池余额
    loadRewardPoolBalance: async function() {
        console.log('加载奖励池余额...');
        const loadingElement = document.getElementById('reward-pool-loading');
        const errorElement = document.getElementById('reward-pool-error');
        const balanceElement = document.getElementById('reward-pool-balance');

        if (loadingElement) loadingElement.style.display = 'block';
        if (errorElement) errorElement.style.display = 'none';
        if (balanceElement) balanceElement.textContent = '';

        try {
            if (!WalletManager || !WalletManager.web3) {
                throw new Error('钱包管理器或Web3未初始化。');
            }
            if (!Web3TokenContract || !Web3TokenContract.tokenContract) {
                // 尝试初始化Web3TokenContract
                const initialized = await Web3TokenContract.init();
                if (!initialized || !Web3TokenContract.tokenContract) {
                    throw new Error('Web3TokenContract初始化失败或桥接合约实例未创建。');
                }
            }

            const bridgeContract = Web3TokenContract.tokenContract;

            // 获取税收钱包地址
            const taxWalletAddress = await bridgeContract.methods.taxWallet().call();
            console.log('奖励池 (税收钱包) 地址:', taxWalletAddress);

            if (!taxWalletAddress || taxWalletAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error('获取到的税收钱包地址无效。');
            }

            // 获取该地址的代币余额
            const balanceData = await Web3TokenContract.getBalance(taxWalletAddress);

            if (balanceData && typeof balanceData.balanceInEther !== 'undefined') {
                // 获取代币符号
                let tokenSymbol = this.config.TOKEN_NAME;
                try {
                    const externalTokenAddr = await bridgeContract.methods.externalToken().call();
                    const tempTokenContract = new WalletManager.web3.eth.Contract(
                        [{ "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "type": "function" }],
                        externalTokenAddr
                    );
                    tokenSymbol = await tempTokenContract.methods.symbol().call() || tokenSymbol;
                } catch (symbolError) {
                    console.warn('获取代币符号失败:', symbolError);
                }

                const formattedBalance = parseFloat(balanceData.balanceInEther).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
                if (balanceElement) balanceElement.textContent = `${formattedBalance} ${tokenSymbol}`;
                if (loadingElement) loadingElement.style.display = 'none';
            } else {
                throw new Error('未能获取奖励池余额数据。');
            }
        } catch (error) {
            console.error('加载奖励池余额失败:', error);
            if (balanceElement) balanceElement.textContent = '';
            if (errorElement) {
                errorElement.textContent = `错误: ${error.message || '加载余额失败'}`;
                errorElement.style.display = 'block';
            }
            if (loadingElement) loadingElement.style.display = 'none';
        }
    },

    // 加载资金池余额
    loadFundingPoolBalance: async function() {
        console.log('加载资金池余额...');
        const loadingElement = document.getElementById('funding-pool-loading');
        const errorElement = document.getElementById('funding-pool-error');
        const balanceElement = document.getElementById('funding-pool-balance');

        if (loadingElement) loadingElement.style.display = 'block';
        if (errorElement) errorElement.style.display = 'none';
        if (balanceElement) balanceElement.textContent = '';

        try {
            if (!WalletManager || !WalletManager.web3) {
                throw new Error('钱包管理器或Web3未初始化。');
            }
            if (!Web3TokenContract || !Web3TokenContract.tokenContract) {
                const initialized = await Web3TokenContract.init();
                if (!initialized || !Web3TokenContract.tokenContract) {
                    throw new Error('Web3TokenContract初始化失败或桥接合约实例未创建。');
                }
            }

            const bridgeContract = Web3TokenContract.tokenContract;

            // 获取合约拥有者地址
            const ownerAddress = await bridgeContract.methods.owner().call();
            console.log('资金池 (合约拥有者) 地址:', ownerAddress);

            if (!ownerAddress || ownerAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error('获取到的合约拥有者地址无效。');
            }

            // 获取该地址的代币余额
            const balanceData = await Web3TokenContract.getBalance(ownerAddress);

            if (balanceData && typeof balanceData.balanceInEther !== 'undefined') {
                // 获取代币符号
                let tokenSymbol = this.config.TOKEN_NAME;
                try {
                    const externalTokenAddr = await bridgeContract.methods.externalToken().call();
                    const tempTokenContract = new WalletManager.web3.eth.Contract(
                        [{ "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "type": "function" }],
                        externalTokenAddr
                    );
                    tokenSymbol = await tempTokenContract.methods.symbol().call() || tokenSymbol;
                } catch (symbolError) {
                    console.warn('获取代币符号失败:', symbolError);
                }

                const formattedBalance = parseFloat(balanceData.balanceInEther).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
                if (balanceElement) balanceElement.textContent = `${formattedBalance} ${tokenSymbol}`;
                if (loadingElement) loadingElement.style.display = 'none';
            } else {
                throw new Error('未能获取资金池余额数据。');
            }
        } catch (error) {
            console.error('加载资金池余额失败:', error);
            if (balanceElement) balanceElement.textContent = '';
            if (errorElement) {
                errorElement.textContent = `错误: ${error.message || '加载余额失败'}`;
                errorElement.style.display = 'block';
            }
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }
};
