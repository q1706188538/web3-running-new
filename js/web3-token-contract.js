/**
 * Web3代币合约交互模块
 * 用于神庙逃亡游戏与区块链代币合约的交互
 */
const Web3TokenContract = {
    // Web3实例
    web3: null,

    // 代币合约实例
    tokenContract: null,

    // 代币合约地址
    contractAddress: null,

    // 当前用户钱包地址
    userAddress: null,

    // 合约ABI (Application Binary Interface)
    contractABI: [
        // TempleRunToken合约ABI
        {
            "inputs": [
                {"name": "name_", "type": "string"},
                {"name": "symbol_", "type": "string"},
                {"name": "decimals_", "type": "uint8"},
                {"name": "initialSupply_", "type": "uint256"},
                {"name": "owner_", "type": "address"},
                {"name": "_gameServerAddress", "type": "address"}
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "anonymous": false,
            "inputs": [
                {"indexed": true, "name": "owner", "type": "address"},
                {"indexed": true, "name": "spender", "type": "address"},
                {"indexed": false, "name": "value", "type": "uint256"}
            ],
            "name": "Approval",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {"indexed": true, "name": "previousOwner", "type": "address"},
                {"indexed": true, "name": "newOwner", "type": "address"}
            ],
            "name": "OwnershipTransferred",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {"indexed": true, "name": "user", "type": "address"},
                {"indexed": false, "name": "amount", "type": "uint256"},
                {"indexed": false, "name": "timestamp", "type": "uint256"},
                {"indexed": false, "name": "nonce", "type": "bytes32"}
            ],
            "name": "TokensExchanged",
            "type": "event"
        },
        {
            "anonymous": false,
            "inputs": [
                {"indexed": true, "name": "from", "type": "address"},
                {"indexed": true, "name": "to", "type": "address"},
                {"indexed": false, "name": "value", "type": "uint256"}
            ],
            "name": "Transfer",
            "type": "event"
        },
        {
            "inputs": [
                {"name": "owner", "type": "address"},
                {"name": "spender", "type": "address"}
            ],
            "name": "allowance",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "spender", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"name": "account", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "users", "type": "address[]"},
                {"name": "amounts", "type": "uint256[]"},
                {"name": "nonces", "type": "bytes32[]"},
                {"name": "signatures", "type": "bytes[]"}
            ],
            "name": "batchExchangeTokens",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "from", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "burn",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "dailyExchangeLimit",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"name": "", "type": "address"}],
            "name": "dailyResetTimestamp",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "decimals",
            "outputs": [{"name": "", "type": "uint8"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "spender", "type": "address"},
                {"name": "subtractedValue", "type": "uint256"}
            ],
            "name": "decreaseAllowance",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "exchangeCooldown",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "user", "type": "address"},
                {"name": "amount", "type": "uint256"},
                {"name": "nonce", "type": "bytes32"},
                {"name": "signature", "type": "bytes"}
            ],
            "name": "exchangeTokens",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "gameServerAddress",
            "outputs": [{"name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "spender", "type": "address"},
                {"name": "addedValue", "type": "uint256"}
            ],
            "name": "increaseAllowance",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"name": "", "type": "address"}],
            "name": "lastExchangeTime",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "maxExchangeAmount",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "minExchangeAmount",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "to", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "mint",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "name",
            "outputs": [{"name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [{"name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "renounceOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"name": "user", "type": "address"}],
            "name": "resetUserExchangeStatus",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"name": "_gameServerAddress", "type": "address"}],
            "name": "setGameServerAddress",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "symbol",
            "outputs": [{"name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"name": "", "type": "address"}],
            "name": "todayExchangedAmount",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "totalSupply",
            "outputs": [{"name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "to", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "transfer",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "from", "type": "address"},
                {"name": "to", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "transferFrom",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"name": "newOwner", "type": "address"}],
            "name": "transferOwnership",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "_dailyExchangeLimit", "type": "uint256"},
                {"name": "_minExchangeAmount", "type": "uint256"},
                {"name": "_maxExchangeAmount", "type": "uint256"},
                {"name": "_exchangeCooldown", "type": "uint256"}
            ],
            "name": "updateExchangeLimits",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"name": "", "type": "bytes32"}],
            "name": "usedNonces",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "player", "type": "address"},
                {"name": "gameCoins", "type": "uint256"},
                {"name": "tokenAmount", "type": "uint256"},
                {"name": "nonce", "type": "bytes32"},
                {"name": "signature", "type": "bytes"}
            ],
            "name": "exchangeFromGame",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "player", "type": "address"},
                {"name": "gameCoins", "type": "uint256"},
                {"name": "tokenAmount", "type": "uint256"}
            ],
            "name": "exchangeFromGame",
            "outputs": [{"name": "", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ],

    // 初始化
    init: async function(contractAddress) {
        console.log('初始化Web3代币合约交互模块...');

        // 保存合约地址
        this.contractAddress = contractAddress || this.getContractAddressFromConfig();

        if (!this.contractAddress) {
            console.error('初始化失败: 未提供合约地址');
            return false;
        }

        try {
            // 调用initWeb3方法初始化Web3
            const web3Initialized = await this.initWeb3();
            if (!web3Initialized) {
                console.error('初始化失败: Web3初始化失败');
                return false;
            }

            // 初始化合约实例
            this.tokenContract = new this.web3.eth.Contract(
                this.contractABI,
                this.contractAddress
            );

            console.log('代币合约初始化成功:', this.contractAddress);

            return true;
        } catch (error) {
            console.error('初始化Web3代币合约失败:', error);
            return false;
        }
    },

    // 初始化Web3
    initWeb3: async function() {
        try {
            console.log('初始化Web3...');

            // 检查是否已安装MetaMask
            if (typeof window.ethereum === 'undefined') {
                console.error('初始化Web3失败: 未检测到MetaMask');
                return false;
            }

            // 初始化Web3
            this.web3 = new Web3(window.ethereum);
            console.log('Web3初始化成功');

            // 请求用户授权
            try {
                console.log('请求用户授权...');
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                if (accounts.length > 0) {
                    this.userAddress = accounts[0];
                    console.log('当前用户地址:', this.userAddress);
                } else {
                    console.warn('用户未授权任何账户');
                    return false;
                }
            } catch (requestError) {
                console.error('请求用户授权失败:', requestError);

                // 尝试获取已授权的账户
                try {
                    const accounts = await this.web3.eth.getAccounts();
                    if (accounts.length > 0) {
                        this.userAddress = accounts[0];
                        console.log('当前用户地址:', this.userAddress);
                    } else {
                        console.warn('未检测到连接的账户');
                        return false;
                    }
                } catch (getAccountsError) {
                    console.error('获取账户失败:', getAccountsError);
                    return false;
                }
            }

            // 监听账户变化
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    this.userAddress = accounts[0];
                    console.log('用户地址已更新:', this.userAddress);
                } else {
                    this.userAddress = null;
                    console.log('用户已断开连接');
                }
            });

            return true;
        } catch (error) {
            console.error('初始化Web3失败:', error);
            return false;
        }
    },

    // 从配置中获取合约地址
    getContractAddressFromConfig: function() {
        // 从GameConfig中获取合约地址
        if (typeof GameConfig !== 'undefined' &&
            GameConfig.TOKEN_EXCHANGE &&
            GameConfig.TOKEN_EXCHANGE.CONTRACT_ADDRESS) {
            return GameConfig.TOKEN_EXCHANGE.CONTRACT_ADDRESS;
        }

        // 如果没有配置，返回默认BSC网络合约地址
        return '0x5632740202B942708c597Ae54963A55981466358';
    },

    // 从配置中获取游戏服务器地址
    getGameServerAddressFromConfig: function() {
        // 从GameConfig中获取游戏服务器地址
        if (typeof GameConfig !== 'undefined' &&
            GameConfig.TOKEN_EXCHANGE &&
            GameConfig.TOKEN_EXCHANGE.GAME_SERVER_ADDRESS) {
            return GameConfig.TOKEN_EXCHANGE.GAME_SERVER_ADDRESS;
        }

        // 如果没有配置，返回默认游戏服务器地址
        return '0xE628408B47918c17cf6B97dDfa2A27c9a1CF451d';
    },

    // 获取代币信息
    getTokenInfo: async function() {
        if (!this.tokenContract) {
            console.error('获取代币信息失败: 合约未初始化');
            return null;
        }

        try {
            // 并行获取代币信息
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                this.tokenContract.methods.name().call(),
                this.tokenContract.methods.symbol().call(),
                this.tokenContract.methods.decimals().call(),
                this.tokenContract.methods.totalSupply().call()
            ]);

            return {
                name,
                symbol,
                decimals: parseInt(decimals),
                totalSupply
            };
        } catch (error) {
            console.error('获取代币信息失败:', error);
            return null;
        }
    },

    // 获取用户代币余额
    getBalance: async function(address) {
        if (!this.tokenContract) {
            console.error('获取余额失败: 合约未初始化');
            return null;
        }

        const targetAddress = address || this.userAddress;

        if (!targetAddress) {
            console.error('获取余额失败: 未提供地址');
            return null;
        }

        try {
            console.log('正在获取地址的代币余额:', targetAddress);
            console.log('使用合约地址:', this.contractAddress);

            // 尝试使用简化的方式获取余额
            try {
                // 直接调用balanceOf方法
                const rawBalance = await this.tokenContract.methods.balanceOf(targetAddress).call();
                console.log('获取到的原始余额:', rawBalance);

                // 尝试获取代币精度
                let decimals = 18; // 默认精度
                try {
                    decimals = await this.tokenContract.methods.decimals().call();
                    console.log('代币精度:', decimals);
                } catch (decimalError) {
                    console.warn('获取代币精度失败，使用默认值18:', decimalError);
                }

                // 手动计算格式化余额
                const divisor = Math.pow(10, decimals);
                const formattedBalance = rawBalance / divisor;

                console.log(`地址 ${targetAddress} 的代币余额:`, formattedBalance);

                return {
                    raw: rawBalance,
                    formatted: formattedBalance.toString(),
                    decimals: parseInt(decimals)
                };
            } catch (balanceError) {
                console.error('获取余额失败，尝试替代方法:', balanceError);

                // 如果直接调用失败，尝试使用Web3的utils
                const rawBalance = await this.web3.eth.call({
                    to: this.contractAddress,
                    data: this.web3.eth.abi.encodeFunctionCall({
                        name: 'balanceOf',
                        type: 'function',
                        inputs: [{
                            type: 'address',
                            name: 'owner'
                        }]
                    }, [targetAddress])
                });

                const balance = this.web3.utils.hexToNumberString(rawBalance);
                const formattedBalance = this.web3.utils.fromWei(balance, 'ether');

                console.log(`地址 ${targetAddress} 的代币余额(替代方法):`, formattedBalance);

                return {
                    raw: balance,
                    formatted: formattedBalance,
                    decimals: 18
                };
            }
        } catch (error) {
            console.error('获取代币余额失败:', error);
            return null;
        }
    },

    // 兑换游戏金币为代币
    exchangeCoinsForTokens: async function(tokenAmount, gameCoinsToUse) {
        if (!this.tokenContract || !this.userAddress) {
            console.error('兑换失败: 合约未初始化或用户未连接钱包');
            return {
                success: false,
                error: '合约未初始化或用户未连接钱包'
            };
        }

        if (!tokenAmount || tokenAmount <= 0) {
            console.error('兑换失败: 无效的代币数量');
            return {
                success: false,
                error: '无效的代币数量'
            };
        }

        try {
            console.log('开始执行代币兑换...');
            console.log('- 用户地址:', this.userAddress);
            console.log('- 代币数量:', tokenAmount);
            console.log('- 游戏金币数量:', gameCoinsToUse);

            // 检查合约是否支持exchangeFromGame方法
            if (!this.tokenContract.methods.exchangeFromGame) {
                console.error('合约不支持exchangeFromGame方法');
                return {
                    success: false,
                    error: '合约不支持exchangeFromGame方法，请确认合约地址和ABI是否正确'
                };
            }

            // 将代币数量转换为wei单位
            const tokenAmountInWei = this.web3.utils.toWei(tokenAmount.toString(), 'ether');
            console.log('代币数量(wei):', tokenAmountInWei);

            try {
                // 调用合约的exchangeFromGame函数
                console.log('调用合约exchangeFromGame方法:');
                console.log('- 用户地址:', this.userAddress);
                console.log('- 游戏金币:', gameCoinsToUse);
                console.log('- 代币数量(wei):', tokenAmountInWei);

                const tx = await this.tokenContract.methods.exchangeFromGame(
                    this.userAddress,
                    gameCoinsToUse,
                    tokenAmountInWei
                ).send({
                    from: this.userAddress,
                    gas: 300000 // 设置适当的gas限制
                });

                console.log('兑换交易已提交:', tx);

                return {
                    success: true,
                    data: tx,
                    message: `成功兑换 ${tokenAmount} 个代币`
                };
            } catch (error) {
                console.error('合约方法调用失败:', error);

                let errorMessage = '兑换失败，请稍后重试';

                // 解析错误消息
                if (error.message.includes('user rejected transaction')) {
                    errorMessage = '用户取消了交易';
                } else if (error.message.includes('insufficient funds')) {
                    errorMessage = 'Gas费用不足，请确保您的钱包中有足够的BNB';
                } else if (error.message.includes('execution reverted')) {
                    // 尝试提取合约错误消息
                    const revertReason = error.message.match(/reason string: '(.+?)'/);
                    if (revertReason && revertReason[1]) {
                        errorMessage = `合约执行失败: ${revertReason[1]}`;
                    }
                } else if (error.message.includes('not a function') ||
                           error.message.includes('is not a function') ||
                           error.message.includes('Invalid JSON RPC response')) {
                    errorMessage = '合约方法不存在或ABI不匹配，请确认合约地址和ABI是否正确';
                }

                return {
                    success: false,
                    error: errorMessage,
                    originalError: error.message
                };
            }
        } catch (error) {
            console.error('兑换代币失败:', error);
            return {
                success: false,
                error: error.message || '兑换过程中发生错误'
            };
        }
    },

    // 监听代币转账事件
    listenToTransferEvents: function(callback) {
        if (!this.tokenContract) {
            console.error('监听转账事件失败: 合约未初始化');
            return false;
        }

        try {
            console.log('尝试设置代币转账事件监听...');

            // 使用更安全的方式监听事件
            // 不使用过滤器，而是在回调中处理
            const subscription = this.tokenContract.events.Transfer({
                fromBlock: 'latest'
            })
            .on('connected', (subscriptionId) => {
                console.log('事件监听已连接，订阅ID:', subscriptionId);
            })
            .on('data', (event) => {
                // 在回调中过滤事件
                if (this.userAddress &&
                    event.returnValues &&
                    event.returnValues.to &&
                    event.returnValues.to.toLowerCase() === this.userAddress.toLowerCase()) {

                    console.log('收到发送给当前用户的代币转账事件:', event);

                    if (typeof callback === 'function') {
                        callback(event);
                    }
                } else {
                    console.log('收到其他代币转账事件，忽略');
                }
            })
            .on('changed', (event) => {
                console.log('代币转账事件已改变（链重组）:', event);
            })
            .on('error', (error) => {
                console.error('代币转账事件监听出错:', error);

                // 尝试使用替代方法：轮询
                this.startTransferPolling(callback);
            });

            console.log('已开始监听代币转账事件');

            // 保存订阅以便稍后可以取消
            this.transferSubscription = subscription;

            return true;
        } catch (error) {
            console.error('设置事件监听失败:', error);

            // 尝试使用替代方法：轮询
            this.startTransferPolling(callback);

            return false;
        }
    },

    // 使用轮询方式监听转账（备用方案）
    startTransferPolling: function(callback) {
        console.log('启动代币转账轮询（备用监听方式）');

        // 保存最后检查的余额
        this.lastCheckedBalance = null;

        // 清除现有的轮询
        if (this.transferPollingInterval) {
            clearInterval(this.transferPollingInterval);
        }

        // 设置轮询间隔
        this.transferPollingInterval = setInterval(async () => {
            try {
                if (!this.userAddress || !this.tokenContract) {
                    return;
                }

                // 获取当前余额
                const balanceResult = await this.getBalance(this.userAddress);
                if (!balanceResult) {
                    return;
                }

                const currentBalance = balanceResult.raw;

                // 如果有上次检查的余额，并且当前余额大于上次余额，说明收到了转账
                if (this.lastCheckedBalance !== null &&
                    currentBalance > this.lastCheckedBalance) {

                    const difference = currentBalance - this.lastCheckedBalance;

                    console.log('检测到余额增加，可能收到了转账:', {
                        previous: this.lastCheckedBalance,
                        current: currentBalance,
                        difference: difference
                    });

                    // 创建一个模拟的事件对象
                    const simulatedEvent = {
                        type: 'transfer',
                        returnValues: {
                            to: this.userAddress,
                            value: difference.toString()
                        },
                        isSimulated: true
                    };

                    // 调用回调
                    if (typeof callback === 'function') {
                        callback(simulatedEvent);
                    }
                }

                // 更新最后检查的余额
                this.lastCheckedBalance = currentBalance;

            } catch (error) {
                console.error('代币转账轮询出错:', error);
            }
        }, 10000); // 每10秒检查一次

        console.log('代币转账轮询已启动');
    },

    // 停止监听转账事件
    stopListeningToTransferEvents: function() {
        // 停止事件订阅
        if (this.transferSubscription) {
            try {
                this.transferSubscription.unsubscribe();
                console.log('已取消代币转账事件订阅');
            } catch (error) {
                console.error('取消代币转账事件订阅出错:', error);
            }
            this.transferSubscription = null;
        }

        // 停止轮询
        if (this.transferPollingInterval) {
            clearInterval(this.transferPollingInterval);
            this.transferPollingInterval = null;
            console.log('已停止代币转账轮询');
        }
    },

    // 使用签名验证兑换游戏金币为代币
    exchangeCoinsForTokensWithSignature: async function(tokenAmount, gameCoinsToUse, nonce, signature) {
        if (!this.tokenContract || !this.userAddress) {
            console.error('兑换失败: 合约未初始化或用户未连接钱包');
            return {
                success: false,
                error: '合约未初始化或用户未连接钱包'
            };
        }

        if (!tokenAmount || tokenAmount <= 0) {
            console.error('兑换失败: 无效的代币数量');
            return {
                success: false,
                error: '无效的代币数量'
            };
        }

        if (!nonce) {
            console.error('兑换失败: 未提供nonce');
            return {
                success: false,
                error: '未提供nonce'
            };
        }

        if (!signature) {
            console.error('兑换失败: 未提供签名');
            return {
                success: false,
                error: '未提供签名'
            };
        }

        try {
            console.log('开始执行带签名验证的代币兑换...');
            console.log('- 用户地址:', this.userAddress);
            console.log('- 代币数量:', tokenAmount);
            console.log('- 游戏金币数量:', gameCoinsToUse);
            console.log('- Nonce:', nonce);
            console.log('- 签名长度:', signature.length);

            // 检查合约是否支持exchangeFromGame方法（带签名验证）
            if (!this.tokenContract.methods.exchangeFromGame) {
                console.error('合约不支持exchangeFromGame方法');
                return {
                    success: false,
                    error: '合约不支持exchangeFromGame方法，请确认合约地址和ABI是否正确'
                };
            }

            // 将代币数量转换为wei单位
            const tokenAmountInWei = this.web3.utils.toWei(tokenAmount.toString(), 'ether');
            console.log('代币数量(wei):', tokenAmountInWei);

            try {
                // 调用合约的exchangeFromGame函数（带签名验证）
                console.log('调用合约exchangeFromGame方法（带签名验证）:');
                console.log('- 用户地址:', this.userAddress);
                console.log('- 游戏金币:', gameCoinsToUse);
                console.log('- 代币数量(wei):', tokenAmountInWei);
                console.log('- Nonce:', nonce);

                const tx = await this.tokenContract.methods.exchangeFromGame(
                    this.userAddress,
                    gameCoinsToUse,
                    tokenAmountInWei,
                    nonce,
                    signature
                ).send({
                    from: this.userAddress,
                    gas: 300000 // 设置适当的gas限制
                });

                console.log('兑换交易已提交:', tx);

                return {
                    success: true,
                    data: tx,
                    message: `成功兑换 ${tokenAmount} 个代币`
                };
            } catch (error) {
                console.error('合约方法调用失败:', error);

                let errorMessage = '兑换失败，请稍后重试';

                // 解析错误消息
                if (error.message.includes('user rejected transaction')) {
                    errorMessage = '用户取消了交易';
                } else if (error.message.includes('insufficient funds')) {
                    errorMessage = 'Gas费用不足，请确保您的钱包中有足够的BNB';
                } else if (error.message.includes('execution reverted')) {
                    // 尝试提取合约错误消息
                    const revertReason = error.message.match(/reason string: '(.+?)'/);
                    if (revertReason && revertReason[1]) {
                        errorMessage = `合约执行失败: ${revertReason[1]}`;
                    }
                } else if (error.message.includes('not a function') ||
                           error.message.includes('is not a function') ||
                           error.message.includes('Invalid JSON RPC response')) {
                    errorMessage = '合约方法不存在或ABI不匹配，请确认合约地址和ABI是否正确';
                } else if (error.message.includes('nonce already used')) {
                    errorMessage = '交易已被处理，请刷新页面后重试';
                } else if (error.message.includes('invalid signature')) {
                    errorMessage = '签名验证失败，请刷新页面后重试';
                } else if (error.code === 4100 || error.message.includes('not been authorized') || error.message.includes('Not authorized')) {
                    errorMessage = '钱包授权失败，请确保已连接钱包并授权应用访问';

                    // 尝试重新连接钱包
                    console.log('尝试重新连接钱包...');
                    this.initWeb3().then(() => {
                        console.log('钱包重新连接成功');
                    }).catch(reconnectError => {
                        console.error('钱包重新连接失败:', reconnectError);
                    });
                }

                return {
                    success: false,
                    error: errorMessage,
                    originalError: error.message
                };
            }
        } catch (error) {
            console.error('兑换代币失败:', error);
            return {
                success: false,
                error: error.message || '兑换过程中发生错误'
            };
        }
    }
};
