/**
 * 奖励池面板
 * 显示税收钱包中的代币余额
 */
const RewardPoolPanel = {
    panelElement: null,
    balanceElement: null,
    loadingElement: null,
    errorElement: null,
    tokenSymbol: 'Token', // 默认值，会被实际值替换

    init: function() {
        console.log('初始化奖励池面板...');

        // 创建面板容器
        this.panelElement = document.createElement('div');
        this.panelElement.id = 'reward-pool-panel';
        this.panelElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 380px;
            max-width: 90%;
            background-color: rgba(40, 40, 60, 0.95);
            border: 1px solid #4a4a6a;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
            z-index: 2002; /* 比登录和钱包UI高 */
            color: #e0e0e0;
            font-family: Arial, sans-serif;
            padding: 20px;
            display: none; /* 默认隐藏 */
            flex-direction: column;
            gap: 15px;
        `;

        // 标题
        const titleElement = document.createElement('h2');
        titleElement.textContent = '奖励池余额';
        titleElement.style.cssText = 'margin: 0; text-align: center; color: #61dafb; font-size: 20px;';

        // 加载提示
        this.loadingElement = document.createElement('p');
        this.loadingElement.textContent = '加载中...';
        this.loadingElement.style.cssText = 'text-align: center; color: #f0ad4e; display: none;';

        // 错误提示
        this.errorElement = document.createElement('p');
        this.errorElement.style.cssText = 'text-align: center; color: #d9534f; display: none;';
        
        // 余额显示区域
        this.balanceElement = document.createElement('p');
        this.balanceElement.id = 'reward-pool-balance';
        this.balanceElement.style.cssText = 'font-size: 22px; text-align: center; color: #5cb85c; margin: 10px 0; font-weight: bold;';

        // 关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = `
            background-color: #555;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            align-self: center;
            margin-top: 10px;
            transition: background-color 0.2s ease;
        `;
        closeButton.addEventListener('mouseover', function() { this.style.backgroundColor = '#666'; });
        closeButton.addEventListener('mouseout', function() { this.style.backgroundColor = '#555'; });
        closeButton.addEventListener('click', this.hide.bind(this));

        // 组装面板
        this.panelElement.appendChild(titleElement);
        this.panelElement.appendChild(this.loadingElement);
        this.panelElement.appendChild(this.errorElement);
        this.panelElement.appendChild(this.balanceElement);
        this.panelElement.appendChild(closeButton);

        document.body.appendChild(this.panelElement);
        console.log('奖励池面板UI创建完成。');
    },

    show: async function() {
        if (!this.panelElement) {
            this.init();
        }
        this.panelElement.style.display = 'flex';
        this.balanceElement.textContent = '';
        this.loadingElement.style.display = 'block';
        this.errorElement.style.display = 'none';
        
        await this.loadAndDisplayBalance();
    },

    hide: function() {
        if (this.panelElement) {
            this.panelElement.style.display = 'none';
        }
    },

    loadAndDisplayBalance: async function() {
        this.loadingElement.style.display = 'block';
        this.errorElement.style.display = 'none';
        this.balanceElement.textContent = '';

        try {
            if (!WalletManager || !WalletManager.web3) {
                throw new Error('钱包管理器或Web3未初始化。');
            }
            if (!Web3TokenContract || !Web3TokenContract.tokenContract) {
                // 尝试初始化Web3TokenContract，如果它还没有合约地址，会从GameConfig获取
                const initialized = await Web3TokenContract.init();
                if (!initialized || !Web3TokenContract.tokenContract) {
                    throw new Error('Web3TokenContract初始化失败或桥接合约实例未创建。');
                }
            }

            const bridgeContract = Web3TokenContract.tokenContract;

            // 1. 从桥接合约获取税收钱包地址
            const taxWalletAddress = await bridgeContract.methods.taxWallet().call();
            console.log('奖励池 (税收钱包) 地址:', taxWalletAddress);

            if (!taxWalletAddress || taxWalletAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error('获取到的税收钱包地址无效。');
            }

            // 2. 使用Web3TokenContract.getBalance()获取该地址的外部代币余额
            const balanceData = await Web3TokenContract.getBalance(taxWalletAddress);

            if (balanceData && typeof balanceData.balanceInEther !== 'undefined') {
                // 尝试获取代币符号
                try {
                    const externalTokenAddr = await bridgeContract.methods.externalToken().call();
                    const tempTokenContract = new WalletManager.web3.eth.Contract(
                        [{ "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "type": "function" }],
                        externalTokenAddr
                    );
                    this.tokenSymbol = await tempTokenContract.methods.symbol().call() || this.tokenSymbol;
                } catch (symbolError) {
                    console.warn('获取代币符号失败:', symbolError);
                    // 使用GameConfig中的TOKEN_NAME作为备用
                    if (typeof GameConfig !== 'undefined' && GameConfig.TOKEN_EXCHANGE && GameConfig.TOKEN_EXCHANGE.TOKEN_NAME) {
                        this.tokenSymbol = GameConfig.TOKEN_EXCHANGE.TOKEN_NAME;
                    }
                }
                
                const formattedBalance = parseFloat(balanceData.balanceInEther).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
                this.balanceElement.textContent = `${formattedBalance} ${this.tokenSymbol}`;
                this.loadingElement.style.display = 'none';
            } else {
                throw new Error('未能获取奖励池余额数据。');
            }

        } catch (error) {
            console.error('加载奖励池余额失败:', error);
            this.balanceElement.textContent = '';
            this.errorElement.textContent = `错误: ${error.message || '加载余额失败'}`;
            this.errorElement.style.display = 'block';
            this.loadingElement.style.display = 'none';
        }
    }
};

// 确保在DOM加载完成后初始化，或者由其他模块按需初始化
// window.addEventListener('DOMContentLoaded', () => RewardPoolPanel.init());