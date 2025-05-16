/**
 * Web3代币合约交互模块
 * 用于神庙逃亡游戏与区块链代币合约的交互
 */
const Web3TokenContract = {
    // Web3实例
    web3: null,

    // 代币合约实例
    tokenContract: null,

    // 外部代币合约实例
    externalTokenContract: null,

    // 代币合约地址
    contractAddress: null,

    // 当前用户钱包地址
    userAddress: null,

    // 合约ABI (Application Binary Interface)
    contractABI: null, // 将在初始化时从TempleRunTokenWithTaxABI_Updated.js加载

    // 初始化
    init: async function(contractAddress) {
        console.log('初始化Web3代币合约交互模块...');

        // 保存合约地址
        this.contractAddress = contractAddress || this.getContractAddressFromConfig();

        if (!this.contractAddress) {
            console.error('初始化失败: 未提供合约地址');
            return false;
        }

        // 确保合约地址格式正确
        if (!this.contractAddress.startsWith('0x')) {
            this.contractAddress = '0x' + this.contractAddress;
        }

        console.log('使用合约地址:', this.contractAddress);

        try {
            // 初始化Web3，但不主动连接钱包
            if (!this.web3) {
                // 如果Web3尚未初始化，则初始化Web3但不请求账户
                const web3Initialized = this.initWeb3WithoutConnect();
                if (!web3Initialized) {
                    console.error('初始化Web3代币合约失败: Web3初始化失败');
                    return false;
                }
            }

            // 加载ABI
            if (typeof GameTokenBridgeInverseABI !== 'undefined') {
                this.contractABI = GameTokenBridgeInverseABI;
                console.log('已从全局变量加载合约ABI (GameTokenBridgeInverseABI)');
            } else {
                console.error('未找到GameTokenBridgeInverseABI，请确保已加载相应的ABI文件');
                return false;
            }

            // 检查钱包连接状态，但不主动请求连接
            if (!this.userAddress) {
                try {
                    // 尝试获取当前连接的账户（不请求连接）
                    const accounts = await this.web3.eth.getAccounts();
                    if (accounts && accounts.length > 0) {
                        this.userAddress = accounts[0];
                        console.log('Web3TokenContract.init: 通过 getAccounts() 检测到已连接的钱包地址:', this.userAddress);
                    } else if (this.web3 && this.web3.currentProvider && typeof this.web3.currentProvider.isMetaMask !== 'undefined' && this.web3.currentProvider.selectedAddress) {
                        // 备用方案：针对 MetaMask DApp 环境，selectedAddress 可能更直接可用
                        this.userAddress = this.web3.currentProvider.selectedAddress;
                        console.log('Web3TokenContract.init: 通过 currentProvider.selectedAddress (MetaMask) 获取到钱包地址:', this.userAddress);
                    } else if (this.web3 && this.web3.currentProvider && this.web3.currentProvider.accounts && this.web3.currentProvider.accounts.length > 0) {
                        // 另一个备用方案：某些 provider 可能直接暴露 accounts 数组
                        this.userAddress = this.web3.currentProvider.accounts[0];
                        console.log('Web3TokenContract.init: 通过 currentProvider.accounts 获取到钱包地址:', this.userAddress);
                    } else if (window.ethereum && window.ethereum.selectedAddress) {
                        // dapp浏览器特殊处理：直接从window.ethereum获取
                        this.userAddress = window.ethereum.selectedAddress;
                        console.log('Web3TokenContract.init: 通过 window.ethereum.selectedAddress 获取到钱包地址:', this.userAddress);
                    } else {
                        console.log('Web3TokenContract.init: 未能通过常规方法检测到已连接的钱包。尝试其他方法...');
                        
                        // 对于某些dapp浏览器，可能需要尝试请求账户
                        try {
                            if (window.ethereum) {
                                // 静默请求账户（不弹出钱包选择对话框）
                                const silentAccounts = await window.ethereum.request({ 
                                    method: 'eth_accounts' // 使用eth_accounts而不是eth_requestAccounts
                                });
                                
                                if (silentAccounts && silentAccounts.length > 0) {
                                    this.userAddress = silentAccounts[0];
                                    console.log('Web3TokenContract.init: 通过 eth_accounts 静默获取到钱包地址:', this.userAddress);
                                } else {
                                    console.log('Web3TokenContract.init: eth_accounts 未返回任何地址');
                                }
                            }
                        } catch (silentError) {
                            console.warn('尝试静默获取账户失败:', silentError);
                        }
                    }
                } catch (accountError) {
                    console.warn('获取账户失败，但仍然创建合约实例:', accountError);
                }
            }

            // 创建合约实例
            this.tokenContract = new this.web3.eth.Contract(
                this.contractABI,
                this.contractAddress
            );

            console.log('合约实例已创建');

            // 检查合约实例是否有效
            if (!this.tokenContract) {
                console.error('合约实例创建失败');
                return false;
            }

            // 尝试获取外部代币地址并创建外部代币合约实例
            try {
                // 获取外部代币地址
                const externalTokenAddress = await this.tokenContract.methods.externalToken().call();
                console.log('从桥接合约获取到外部代币地址:', externalTokenAddress);

                if (externalTokenAddress) {
                    // 创建外部代币合约实例
                    const tokenABI = [
                        // ERC20标准方法
                        {
                            "constant": true,
                            "inputs": [{"name": "_owner", "type": "address"}],
                            "name": "balanceOf",
                            "outputs": [{"name": "balance", "type": "uint256"}],
                            "type": "function"
                        },
                        {
                            "constant": true,
                            "inputs": [],
                            "name": "decimals",
                            "outputs": [{"name": "", "type": "uint8"}],
                            "type": "function"
                        },
                        {
                            "constant": false,
                            "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}],
                            "name": "approve",
                            "outputs": [{"name": "", "type": "bool"}],
                            "type": "function"
                        },
                        {
                            "constant": true,
                            "inputs": [{"name": "_owner", "type": "address"}, {"name": "_spender", "type": "address"}],
                            "name": "allowance",
                            "outputs": [{"name": "", "type": "uint256"}],
                            "type": "function"
                        },
                        {
                            "constant": true,
                            "inputs": [],
                            "name": "name",
                            "outputs": [{"name": "", "type": "string"}],
                            "payable": false,
                            "stateMutability": "view",
                            "type": "function"
                        },
                        {
                            "constant": true,
                            "inputs": [],
                            "name": "symbol",
                            "outputs": [{"name": "", "type": "string"}],
                            "payable": false,
                            "stateMutability": "view",
                            "type": "function"
                        }
                    ];

                    this.externalTokenContract = new this.web3.eth.Contract(tokenABI, externalTokenAddress);
                    console.log('外部代币合约实例已创建');
                }
            } catch (error) {
                console.warn('获取外部代币地址或创建外部代币合约实例失败:', error);
                console.warn('这可能会影响某些功能，但不会阻止初始化');
            }

            console.log('合约实例有效，初始化完成');
            return true;
        } catch (error) {
            console.error('初始化Web3代币合约失败:', error);
            return false;
        }
    },

    // 从合约获取当前兑换模式 (inverseExchangeMode) - 已废弃，从 Web3Config 获取
    /*
    getInverseExchangeModeState: async function() {
        if (!this.tokenContract) {
            console.error('获取兑换模式失败: 合约未初始化');
            return null; // 或者根据需要返回一个默认值或抛出错误
        }
        try {
            const mode = await this.tokenContract.methods.inverseExchangeMode().call();
            console.log('从合约获取的 inverseExchangeMode:', mode);
            return mode; // boolean
        } catch (error) {
            console.error('获取 inverseExchangeMode 失败:', error);
            return null; // 或其他错误指示
        }
    },
    */

    // 获取合约的兑换配置信息 - 已废弃，从 Web3Config 获取
    /*
    getContractExchangeConfig: async function() {
        if (!this.tokenContract) {
            console.error('获取合约配置失败: 合约未初始化');
            return null;
        }

        try {
            const minExchangeAmount = await this.tokenContract.methods.minExchangeAmount().call();
            const maxExchangeAmount = await this.tokenContract.methods.maxExchangeAmount().call();
            const exchangeRate = await this.tokenContract.methods.exchangeRate().call(); // uint256: 1 token = X game coins (or vice-versa depending on interpretation)
            const exchangeTokenTaxRate = await this.tokenContract.methods.exchangeTokenTaxRate().call(); // BPS
            const rechargeTokenTaxRate = await this.tokenContract.methods.rechargeTokenTaxRate().call(); // BPS
            const inverseMode = await this.tokenContract.methods.inverseExchangeMode().call(); // boolean

            console.log('合约配置获取成功:');
            console.log('- minExchangeAmount (wei):', minExchangeAmount.toString());
            console.log('- maxExchangeAmount (wei):', maxExchangeAmount.toString());
            console.log('- exchangeRate (raw):', exchangeRate.toString());
            console.log('- exchangeTokenTaxRate (BPS):', exchangeTokenTaxRate.toString());
            console.log('- rechargeTokenTaxRate (BPS):', rechargeTokenTaxRate.toString());
            console.log('- inverseExchangeMode:', inverseMode);

            return {
                minExchangeAmount: minExchangeAmount, // wei
                maxExchangeAmount: maxExchangeAmount, // wei
                exchangeRate: exchangeRate, // raw uint256 from contract
                exchangeTokenTaxRateBPS: exchangeTokenTaxRate, // BPS
                rechargeTokenTaxRateBPS: rechargeTokenTaxRate, // BPS
                inverseMode: inverseMode // boolean
            };
        } catch (error) {
            console.error('获取合约配置失败:', error);
            return null;
        }
    },
    */

    // 初始化Web3但不请求账户
    initWeb3WithoutConnect: function() {
        try {
            console.log('初始化Web3（不请求账户）...');

            // 检查是否已有Web3实例
            if (window.ethereum) {
                // 使用现代dapp浏览器
                this.web3 = new Web3(window.ethereum);
                console.log('使用window.ethereum初始化Web3（不请求账户）');

                // 获取目标网络ID
                const targetNetworkId = this.getNetworkIdFromConfig();
                console.log('目标网络ID:', targetNetworkId);

                // 检查当前网络ID
                this.web3.eth.net.getId()
                    .then(async (currentNetworkId) => {
                        console.log('当前网络ID:', currentNetworkId);
                        
                        // 如果网络ID不匹配，尝试切换网络
                        if (currentNetworkId !== targetNetworkId) {
                            console.warn(`当前网络ID(${currentNetworkId})与目标网络ID(${targetNetworkId})不匹配，尝试切换网络...`);
                            
                            try {
                                // 尝试切换到目标网络
                                await window.ethereum.request({
                                    method: 'wallet_switchEthereumChain',
                                    params: [{ chainId: '0x' + targetNetworkId.toString(16) }]
                                });
                                console.log('成功切换到目标网络');
                            } catch (switchError) {
                                // 如果用户拒绝切换或网络未添加，显示错误
                                if (switchError.code === 4902 || switchError.message.includes('wallet_addEthereumChain')) {
                                    // 网络未添加，尝试添加BSC主网
                                    try {
                                        await window.ethereum.request({
                                            method: 'wallet_addEthereumChain',
                                            params: [{
                                                chainId: '0x' + targetNetworkId.toString(16),
                                                chainName: 'Binance Smart Chain Mainnet',
                                                nativeCurrency: {
                                                    name: 'BNB',
                                                    symbol: 'BNB',
                                                    decimals: 18
                                                },
                                                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                                                blockExplorerUrls: ['https://bscscan.com/']
                                            }]
                                        });
                                        console.log('成功添加并切换到BSC主网');
                                    } catch (addError) {
                                        console.error('添加BSC主网失败:', addError);
                                        alert('请手动将钱包切换到BSC主网');
                                    }
                                } else {
                                    console.error('切换网络失败:', switchError);
                                    alert('请手动将钱包切换到BSC主网');
                                }
                            }
                        }
                    })
                    .catch(error => {
                        console.error('获取当前网络ID失败:', error);
                    });

                // 监听账户变化
                window.ethereum.on('accountsChanged', (accounts) => {
                    if (accounts.length > 0) {
                        console.log('钱包账户已更改:', accounts[0]);
                        this.userAddress = accounts[0];

                        // 触发自定义事件，通知其他模块钱包地址已更改
                        const walletChangeEvent = new CustomEvent('walletChanged', {
                            detail: { address: accounts[0] }
                        });
                        document.dispatchEvent(walletChangeEvent);
                    } else {
                        console.log('钱包已断开连接');
                        this.userAddress = null;

                        // 触发自定义事件，通知其他模块钱包已断开连接
                        const walletChangeEvent = new CustomEvent('walletChanged', {
                            detail: { address: null }
                        });
                        document.dispatchEvent(walletChangeEvent);
                    }
                });

                // 监听链ID变化
                window.ethereum.on('chainChanged', (chainId) => {
                    console.log('钱包网络已更改:', chainId);
                    // 将十六进制的chainId转换为十进制
                    const networkId = parseInt(chainId, 16);
                    
                    // 获取目标网络ID
                    const targetNetworkId = this.getNetworkIdFromConfig();
                    
                    if (networkId !== targetNetworkId) {
                        console.warn(`当前网络ID(${networkId})与目标网络ID(${targetNetworkId})不匹配`);
                        alert(`请将钱包切换到BSC主网(ID: ${targetNetworkId})`);
                    } else {
                        console.log('已切换到正确的网络');
                        // 刷新页面以重新加载合约
                        window.location.reload();
                    }
                });

                return true;
            } else if (window.web3) {
                // 使用旧版Web3
                this.web3 = new Web3(window.web3.currentProvider);
                console.log('使用window.web3.currentProvider初始化Web3（不请求账户）');
                return true;
            } else {
                // 如果没有检测到Web3，使用远程节点
                console.warn('未检测到Web3，使用远程节点');

                // 从配置中获取RPC URL
                const rpcUrl = this.getRpcUrlFromConfig();
                console.log('使用配置的RPC URL:', rpcUrl);

                // 使用配置的RPC URL
                const provider = new Web3.providers.HttpProvider(rpcUrl);
                this.web3 = new Web3(provider);

                console.log('使用远程节点初始化Web3');
                return true;
            }
        } catch (error) {
            console.error('初始化Web3失败:', error);
            return false;
        }
    },

    // 初始化Web3并请求账户
    initWeb3: async function() {
        try {
            console.log('初始化Web3并请求账户...');

            // 先初始化Web3但不请求账户
            const initialized = this.initWeb3WithoutConnect();
            if (!initialized) {
                return false;
            }

            // 检查是否已有Web3实例
            if (window.ethereum) {
                try {
                    // 请求用户授权
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    console.log('用户已授权访问钱包');

                    // 获取当前连接的账户
                    const accounts = await this.web3.eth.getAccounts();
                    this.userAddress = accounts[0];
                    console.log('当前连接的钱包地址:', this.userAddress);

                    return true;
                } catch (error) {
                    console.error('用户拒绝授权或获取账户失败:', error);
                    return false;
                }
            } else if (window.web3) {
                // 获取当前连接的账户
                const accounts = await this.web3.eth.getAccounts();
                if (accounts.length > 0) {
                    this.userAddress = accounts[0];
                    console.log('当前连接的钱包地址:', this.userAddress);
                    return true;
                } else {
                    console.error('未找到连接的钱包账户');
                    return false;
                }
            } else {
                console.warn('未检测到Web3，无法请求账户');
                return false;
            }
        } catch (error) {
            console.error('初始化Web3并请求账户失败:', error);
            return false;
        }
    },

    // 从配置中获取合约地址
    getContractAddressFromConfig: function() {
        // 首先尝试从Web3Config中获取
        if (typeof Web3Config !== 'undefined') {
            if (Web3Config.BRIDGE_CONTRACT && Web3Config.BRIDGE_CONTRACT.ADDRESS) {
                console.log('从Web3Config获取合约地址:', Web3Config.BRIDGE_CONTRACT.ADDRESS);
                return Web3Config.BRIDGE_CONTRACT.ADDRESS;
            }
        }

        // 如果Web3Config不存在或没有配置，尝试从GameConfig中获取
        if (typeof GameConfig !== 'undefined') {
            // 首先尝试从TOKEN_EXCHANGE获取
            if (GameConfig.TOKEN_EXCHANGE && GameConfig.TOKEN_EXCHANGE.CONTRACT_ADDRESS) {
                console.log('从GameConfig.TOKEN_EXCHANGE获取合约地址:', GameConfig.TOKEN_EXCHANGE.CONTRACT_ADDRESS);
                return GameConfig.TOKEN_EXCHANGE.CONTRACT_ADDRESS;
            }

            // 如果没有，尝试从TOKEN_RECHARGE获取
            if (GameConfig.TOKEN_RECHARGE && GameConfig.TOKEN_RECHARGE.CONTRACT_ADDRESS) {
                console.log('从GameConfig.TOKEN_RECHARGE获取合约地址:', GameConfig.TOKEN_RECHARGE.CONTRACT_ADDRESS);
                return GameConfig.TOKEN_RECHARGE.CONTRACT_ADDRESS;
            }
        }

        // 如果都没有配置，记录错误并返回空字符串
        console.error('未找到合约地址配置，请检查Web3Config或GameConfig');
        return '';
    },

    // 从配置中获取游戏服务器地址
    getGameServerAddressFromConfig: function() {
        // 首先尝试从Web3Config中获取
        if (typeof Web3Config !== 'undefined') {
            if (Web3Config.BRIDGE_CONTRACT && Web3Config.BRIDGE_CONTRACT.GAME_SERVER_ADDRESS) {
                console.log('从Web3Config获取游戏服务器地址:', Web3Config.BRIDGE_CONTRACT.GAME_SERVER_ADDRESS);
                return Web3Config.BRIDGE_CONTRACT.GAME_SERVER_ADDRESS;
            }
        }

        // 如果Web3Config不存在或没有配置，尝试从GameConfig中获取
        if (typeof GameConfig !== 'undefined' &&
            GameConfig.TOKEN_EXCHANGE &&
            GameConfig.TOKEN_EXCHANGE.GAME_SERVER_ADDRESS) {
            console.log('从GameConfig获取游戏服务器地址:', GameConfig.TOKEN_EXCHANGE.GAME_SERVER_ADDRESS);
            return GameConfig.TOKEN_EXCHANGE.GAME_SERVER_ADDRESS;
        }

        // 如果没有配置，返回默认游戏服务器地址
        console.warn('未找到游戏服务器地址配置，使用默认值');
        return '0x599321e71a41bd2629034b0353b93cff56ebaeca';
    },

    // 从配置中获取税收钱包地址
    getTaxWalletAddressFromConfig: function() {
        // 首先尝试从Web3Config中获取
        if (typeof Web3Config !== 'undefined') {
            if (Web3Config.BRIDGE_CONTRACT && Web3Config.BRIDGE_CONTRACT.TAX_WALLET_ADDRESS) {
                console.log('从Web3Config获取税收钱包地址:', Web3Config.BRIDGE_CONTRACT.TAX_WALLET_ADDRESS);
                return Web3Config.BRIDGE_CONTRACT.TAX_WALLET_ADDRESS;
            }
        }

        // 如果Web3Config不存在或没有配置，尝试从GameConfig中获取
        if (typeof GameConfig !== 'undefined') {
            // 首先尝试从TOKEN_EXCHANGE获取
            if (GameConfig.TOKEN_EXCHANGE && GameConfig.TOKEN_EXCHANGE.TAX_WALLET_ADDRESS) {
                console.log('从GameConfig.TOKEN_EXCHANGE获取税收钱包地址:', GameConfig.TOKEN_EXCHANGE.TAX_WALLET_ADDRESS);
                return GameConfig.TOKEN_EXCHANGE.TAX_WALLET_ADDRESS;
            }

            // 如果没有，尝试从TOKEN_RECHARGE获取
            if (GameConfig.TOKEN_RECHARGE && GameConfig.TOKEN_RECHARGE.TAX_WALLET_ADDRESS) {
                console.log('从GameConfig.TOKEN_RECHARGE获取税收钱包地址:', GameConfig.TOKEN_RECHARGE.TAX_WALLET_ADDRESS);
                return GameConfig.TOKEN_RECHARGE.TAX_WALLET_ADDRESS;
            }
        }

        // 如果都没有配置，返回默认值
        console.warn('未找到税收钱包地址配置，使用默认值');
        return '0x828E565E19572aE99c2aE9fa2833E72FB16F8946';
    },

    // 从配置中获取合约所有者地址
    getOwnerAddressFromConfig: function() {
        // 首先尝试从Web3Config中获取
        if (typeof Web3Config !== 'undefined') {
            if (Web3Config.BRIDGE_CONTRACT && Web3Config.BRIDGE_CONTRACT.OWNER_ADDRESS) {
                console.log('从Web3Config获取合约所有者地址:', Web3Config.BRIDGE_CONTRACT.OWNER_ADDRESS);
                return Web3Config.BRIDGE_CONTRACT.OWNER_ADDRESS;
            }
        }

        // 如果Web3Config不存在或没有配置，尝试从GameConfig中获取
        if (typeof GameConfig !== 'undefined') {
            // 首先尝试从TOKEN_EXCHANGE获取
            if (GameConfig.TOKEN_EXCHANGE && GameConfig.TOKEN_EXCHANGE.TOKEN_HOLDER_ADDRESS) {
                console.log('从GameConfig.TOKEN_EXCHANGE获取合约所有者地址:', GameConfig.TOKEN_EXCHANGE.TOKEN_HOLDER_ADDRESS);
                return GameConfig.TOKEN_EXCHANGE.TOKEN_HOLDER_ADDRESS;
            }

            // 如果没有，尝试从TOKEN_RECHARGE获取
            if (GameConfig.TOKEN_RECHARGE && GameConfig.TOKEN_RECHARGE.TOKEN_HOLDER_ADDRESS) {
                console.log('从GameConfig.TOKEN_RECHARGE获取合约所有者地址:', GameConfig.TOKEN_RECHARGE.TOKEN_HOLDER_ADDRESS);
                return GameConfig.TOKEN_RECHARGE.TOKEN_HOLDER_ADDRESS;
            }
        }

        // 如果都没有配置，返回默认值
        console.warn('未找到合约所有者地址配置，使用默认值');
        return '0xcf0d5de2ad5be4d1721fb77b99ac738d3f2a4444';
    },

    // 从配置中获取网络ID
    getNetworkIdFromConfig: function() {
        // 首先尝试从Web3Config中获取
        if (typeof Web3Config !== 'undefined') {
            if (Web3Config.NETWORK && Web3Config.NETWORK.ID) {
                console.log('从Web3Config获取网络ID:', Web3Config.NETWORK.ID);
                return Web3Config.NETWORK.ID;
            }
        }

        // 如果Web3Config不存在或没有配置，尝试从GameConfig中获取
        if (typeof GameConfig !== 'undefined') {
            // 首先尝试从TOKEN_EXCHANGE获取
            if (GameConfig.TOKEN_EXCHANGE && GameConfig.TOKEN_EXCHANGE.NETWORK_ID) {
                console.log('从GameConfig.TOKEN_EXCHANGE获取网络ID:', GameConfig.TOKEN_EXCHANGE.NETWORK_ID);
                return GameConfig.TOKEN_EXCHANGE.NETWORK_ID;
            }

            // 如果没有，尝试从TOKEN_RECHARGE获取
            if (GameConfig.TOKEN_RECHARGE && GameConfig.TOKEN_RECHARGE.NETWORK_ID) {
                console.log('从GameConfig.TOKEN_RECHARGE获取网络ID:', GameConfig.TOKEN_RECHARGE.NETWORK_ID);
                return GameConfig.TOKEN_RECHARGE.NETWORK_ID;
            }
        }

        // 如果都没有配置，返回默认值97（BSC测试网）
        console.warn('未找到网络ID配置，使用默认值97（BSC测试网）');
        return 97;
    },

    // 获取外部代币的名称、符号和小数位数
    getTokenInfo: async function() {
        if (!this.web3) {
            console.error("Web3TokenContract.getTokenInfo: Web3 is not initialized.");
            return null;
        }
        // 确保 externalTokenContract 已初始化
        if (!this.externalTokenContract) {
            console.warn("Web3TokenContract.getTokenInfo: External token contract (this.externalTokenContract) is not initialized. Attempting to initialize...");
            // 尝试按需初始化。这依赖于 this.tokenContract (桥接合约) 已经初始化
            // 并且能够提供 externalTokenAddress。
            // init() 方法中已经有获取 externalTokenAddress 并创建 externalTokenContract 的逻辑。
            // 这里我们假设如果 externalTokenContract 为空，可能是 init() 未成功完成该部分，
            // 或者 getTokenInfo 在 init() 完成前被调用。
            // 一个更健壮的方法是确保 init() 总是成功设置它，或者使 init() 返回一个 Promise 并在其解决后再调用 getTokenInfo。
            // 为了简单起见，如果 init() 中 externalTokenAddress 获取和实例创建的逻辑是可靠的，
            // 那么 externalTokenContract 应该在 init() 成功后被设置。
            // 如果仍然没有，可能是 init() 本身就有问题，或者调用时机不对。
            // 我们在这里可以尝试再次获取地址并创建实例，但这会重复 init() 中的逻辑。
            // 更优的做法是确保 init() 成功创建 this.externalTokenContract。
            // 此处简化处理：如果 init() 未能创建它，则 getTokenInfo 也无法工作。
            // 或者，可以从 this.tokenContract (桥接合约) 重新获取 externalTokenAddress 并创建。

            if (this.tokenContract && typeof this.tokenContract.methods.externalToken === 'function') {
                try {
                    const externalTokenAddress = await this.tokenContract.methods.externalToken().call();
                    if (externalTokenAddress && externalTokenAddress !== '0x0000000000000000000000000000000000000000') {
                        console.log("Web3TokenContract.getTokenInfo: Lazily initializing externalTokenContract with address:", externalTokenAddress);
                        // 使用与 init() 中相同的、已扩展的 ABI 来创建实例
                        // 注意：这里的 tokenABI 定义是局部的，如果 init 中的 ABI 定义更新，这里也需要同步
                        const tokenABI = [
                            {"constant": true, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"},
                            {"constant": true, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "type": "function"},
                            {"constant": false, "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
                            {"constant": true, "inputs": [{"name": "_owner", "type": "address"}, {"name": "_spender", "type": "address"}], "name": "allowance", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
                            {"constant": true, "inputs": [], "name": "name", "outputs": [{"name": "", "type": "string"}], "payable": false, "stateMutability": "view", "type": "function"},
                            {"constant": true, "inputs": [], "name": "symbol", "outputs": [{"name": "", "type": "string"}], "payable": false, "stateMutability": "view", "type": "function"}
                        ];
                        this.externalTokenContract = new this.web3.eth.Contract(tokenABI, externalTokenAddress);
                    } else {
                        console.error("Web3TokenContract.getTokenInfo: Could not retrieve a valid external token address from bridge contract for lazy init.");
                        return null;
                    }
                } catch (err) {
                    console.error("Web3TokenContract.getTokenInfo: Error during lazy initialization of externalTokenContract:", err);
                    return null;
                }
            } else {
                 console.error("Web3TokenContract.getTokenInfo: Bridge contract (this.tokenContract) not available for lazy initialization of external token contract.");
                 return null;
            }

            // 再次检查 externalTokenContract 是否成功创建
            if (!this.externalTokenContract) {
                console.error("Web3TokenContract.getTokenInfo: External token contract still not initialized after lazy attempt.");
                return null;
            }
        }

        try {
            console.log("Web3TokenContract.getTokenInfo: Fetching info from external token contract:", this.externalTokenContract.options.address);
            const name = await this.externalTokenContract.methods.name().call();
            const symbol = await this.externalTokenContract.methods.symbol().call();
            const decimalsResult = await this.externalTokenContract.methods.decimals().call();
            const decimals = parseInt(decimalsResult, 10);

            if (isNaN(decimals)) {
                console.error(`Web3TokenContract.getTokenInfo: Decimals call returned NaN. Name: ${name}, Symbol: ${symbol}, Raw Decimals: ${decimalsResult}`);
                return null;
            }

            console.log(`Web3TokenContract.getTokenInfo: Fetched - Name: ${name}, Symbol: ${symbol}, Decimals: ${decimals}`);
            return { name, symbol, decimals };
        } catch (error) {
            console.error("Web3TokenContract.getTokenInfo: Error fetching token info from contract:", error);
            if (this.externalTokenContract) {
                 console.error("Details - Contract Address:", this.externalTokenContract.options.address);
            }
            return null;
        }
    },

    // 从配置中获取RPC URL
    getRpcUrlFromConfig: function() {
        // 首先尝试从Web3Config中获取
        if (typeof Web3Config !== 'undefined') {
            if (Web3Config.NETWORK && Web3Config.NETWORK.RPC_URL) {
                console.log('从Web3Config获取RPC URL:', Web3Config.NETWORK.RPC_URL);
                return Web3Config.NETWORK.RPC_URL;
            }
        }

        // 如果没有配置，返回默认值
        return 'https://data-seed-prebsc-1-s1.binance.org:8545/';
    },

    // 获取代币信息 (旧方法，尝试从桥接合约获取，通常不正确，将被替换)
    // getTokenInfo: async function() { ... }

    // 获取外部代币的符号和小数位数 - 已废弃，从 Web3Config 获取
    /*
    getTokenInfoFromExternal: async function() {
        if (!this.tokenContract) {
            console.error('Web3TokenContract.getTokenInfoFromExternal: 桥接合约未初始化');
            return null;
        }
        if (!this.web3) {
            console.error('Web3TokenContract.getTokenInfoFromExternal: Web3 未初始化');
            return null;
        }

        try {
            const externalTokenAddress = await this.tokenContract.methods.externalToken().call();
            if (!externalTokenAddress || externalTokenAddress === '0x0000000000000000000000000000000000000000') {
                console.error('Web3TokenContract.getTokenInfoFromExternal: 无效的外部代币地址:', externalTokenAddress);
                return null;
            }

            // 使用与 getBalance 中类似的简化ABI，只包含 symbol 和 decimals
            const tokenABI = [
                { "constant": true, "inputs": [], "name": "symbol", "outputs": [{ "name": "", "type": "string" }], "type": "function" },
                { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "name": "", "type": "uint8" }], "type": "function" }
            ];

            const extTokenContract = new this.web3.eth.Contract(tokenABI, externalTokenAddress);

            const symbol = await extTokenContract.methods.symbol().call();
            const decimals = await extTokenContract.methods.decimals().call();

            console.log(`Web3TokenContract.getTokenInfoFromExternal: 外部代币信息 - Symbol: ${symbol}, Decimals: ${decimals}`);
            return {
                symbol: symbol,
                decimals: parseInt(decimals) //确保返回整数
            };

        } catch (error) {
            console.error('Web3TokenContract.getTokenInfoFromExternal: 获取外部代币信息失败:', error);
            return null;
        }
    },
    */

    // 获取用户代币余额
    getBalance: async function(address) {
        if (!this.tokenContract) {
            console.error('获取余额失败: 合约未初始化');
            return null;
        }

        // 如果未提供地址，使用当前连接的钱包地址
        let walletAddress = address || this.userAddress;

        // dapp浏览器特殊处理：如果walletAddress为空，尝试从多个可能的来源获取
        if (!walletAddress) {
            console.log('getBalance: 未提供钱包地址且this.userAddress为空，尝试从其他来源获取');
            
            // 尝试从window.ethereum获取
            if (window.ethereum && window.ethereum.selectedAddress) {
                walletAddress = window.ethereum.selectedAddress;
                console.log('getBalance: 从window.ethereum.selectedAddress获取到钱包地址:', walletAddress);
            }
            // 尝试从web3.currentProvider获取
            else if (this.web3 && this.web3.currentProvider) {
                if (this.web3.currentProvider.selectedAddress) {
                    walletAddress = this.web3.currentProvider.selectedAddress;
                    console.log('getBalance: 从web3.currentProvider.selectedAddress获取到钱包地址:', walletAddress);
                } 
                else if (this.web3.currentProvider.accounts && this.web3.currentProvider.accounts.length > 0) {
                    walletAddress = this.web3.currentProvider.accounts[0];
                    console.log('getBalance: 从web3.currentProvider.accounts获取到钱包地址:', walletAddress);
                }
            }
            
            // 如果找到了地址，更新this.userAddress
            if (walletAddress) {
                this.userAddress = walletAddress;
                console.log('getBalance: 更新this.userAddress为:', walletAddress);
            }
        }

        if (!walletAddress) {
            console.error('获取余额失败: 未提供钱包地址且未连接钱包');
            return null;
        }

        try {
            // 检查当前网络ID是否正确
            try {
                const currentNetworkId = await this.web3.eth.net.getId();
                const targetNetworkId = this.getNetworkIdFromConfig();
                
                if (currentNetworkId !== targetNetworkId) {
                    console.error(`获取余额失败: 当前网络ID(${currentNetworkId})与目标网络ID(${targetNetworkId})不匹配`);
                    throw new Error(`钱包连接到了错误的网络。请切换到BSC主网(ID: ${targetNetworkId})`);
                }
            } catch (networkError) {
                if (networkError.message.includes('钱包连接到了错误的网络')) {
                    throw networkError;
                }
                console.warn('检查网络ID时出错:', networkError);
                // 继续执行，因为这可能只是网络检查失败，而不是获取余额失败
            }

            // 从桥接合约获取外部代币地址
            let externalTokenAddress = null;
            try {
                // 只使用externalToken方法获取外部代币地址
                externalTokenAddress = await this.tokenContract.methods.externalToken().call();
                console.log('从桥接合约获取到外部代币地址:', externalTokenAddress);

                if (!externalTokenAddress) {
                    throw new Error('外部代币地址为空');
                }
            } catch (error) {
                console.error('从桥接合约获取外部代币地址失败:', error);
                throw new Error('无法获取外部代币地址，请确保合约已正确初始化');
            }

            // 创建外部代币合约实例
            const tokenABI = [
                // ERC20标准方法
                {
                    "constant": true,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function"
                },
                {
                    "constant": true,
                    "inputs": [],
                    "name": "decimals",
                    "outputs": [{"name": "", "type": "uint8"}],
                    "type": "function"
                }
            ];

            const externalTokenContract = new this.web3.eth.Contract(tokenABI, externalTokenAddress);
            console.log('已创建外部代币合约实例');

            // 获取代币余额
            const balance = await externalTokenContract.methods.balanceOf(walletAddress).call();
            console.log('获取到代币余额:', balance);

            // 获取代币小数位数 - 从 Web3Config 获取
            const configuredDecimals = (Web3Config && Web3Config.TOKEN && typeof Web3Config.TOKEN.DECIMALS !== 'undefined')
                                ? parseInt(Web3Config.TOKEN.DECIMALS)
                                : 18; // 如果未在 Web3Config 中配置，则默认为 18
            console.log('Web3TokenContract.getBalance: 使用的小数位数 (来自Web3Config或默认):', configuredDecimals);

            // 转换为可读格式
            let balanceFormatted;
            try {
                const balanceBN = this.web3.utils.toBN(balance); // 原始余额 (通常是字符串或BN对象)
                const divisor = this.web3.utils.toBN(10).pow(this.web3.utils.toBN(configuredDecimals));

                const integerPart = balanceBN.div(divisor);
                const fractionalPart = balanceBN.mod(divisor);

                if (fractionalPart.isZero()) {
                    balanceFormatted = integerPart.toString();
                } else {
                    // 确保小数部分被正确填充，并移除末尾多余的零
                    const fractionalString = fractionalPart.toString().padStart(configuredDecimals, '0').replace(/0+$/, "");
                    // 如果移除末尾零后小数部分为空字符串 (例如，原始小数为 ".000"), 则不添加小数点和空的小数部分
                    balanceFormatted = `${integerPart.toString()}${fractionalString.length > 0 ? "." + fractionalString : ""}`;
                }
            } catch (fmtError) {
                console.error("Web3TokenContract.getBalance: 余额格式化失败:", fmtError, "将使用原始余额字符串。");
                balanceFormatted = balance.toString(); // Fallback to raw balance string
            }

            console.log(`Web3TokenContract.getBalance: 钱包 ${walletAddress} 的代币余额: ${balanceFormatted} (原始: ${balance.toString()}, 小数: ${configuredDecimals})`);

            return {
                balance: balance.toString(), // 确保返回的是字符串格式的原始余额
                balanceInEther: balanceFormatted, // 使用新字段名 balanceFormatted，但为了兼容性暂时保留 balanceInEther
                decimals: configuredDecimals
            };
        } catch (error) {
            console.error('获取代币余额失败:', error);
            return null;
        }
    },

    // 使用签名验证兑换游戏金币为代币
    exchangeCoinsForTokensWithSignature: async function(actualGameCoins, actualTokenAmount, actualNonce, actualIsInverse, actualSignature) {
        if (!this.tokenContract || !this.userAddress) {
            console.error('兑换失败: 合约未初始化或用户未连接钱包');
            return {
                success: false,
                error: '合约未初始化或用户未连接钱包'
            };
        }

        // 使用 actualTokenAmount 进行校验
        if (!actualTokenAmount || actualTokenAmount <= 0) {
            console.error('兑换失败: 无效的代币数量');
            return {
                success: false,
                error: '无效的代币数量'
            };
        }

        // 使用传入的 actualIsInverse 参数进行日志记录和可能的条件判断（如果未来需要）
        // 但最终调用 exchangeFromGame 时不会传递此参数。
        console.log('执行 exchangeCoinsForTokensWithSignature，前端提供的 actualIsInverse:', actualIsInverse);

        try {
            console.log('准备使用签名验证兑换游戏金币为代币:');
            console.log('- 用户地址:', this.userAddress);
            console.log('- 代币数量 (来自参数):', actualTokenAmount);
            console.log('- 游戏金币数量 (来自参数):', actualGameCoins);
            console.log('- Nonce (来自参数):', actualNonce);
            console.log('- 签名 (来自参数):', actualSignature);
            console.log('- 合约地址:', this.contractAddress);

            // 将 actualTokenAmount 转换为wei单位
            // BUG: actualTokenAmount is already in Wei string format when passed from token-exchange.js
            // const tokenAmountInWei = this.web3.utils.toWei(actualTokenAmount.toString(), 'ether');
            const tokenAmountInWei = this.web3.utils.toBN(actualTokenAmount.toString()); // CORRECT: Convert Wei string to BN
            console.log('代币数量(wei) (after toBN):', tokenAmountInWei.toString());

            // 确保所有参数都有效，使用新的参数名
            if (!this.userAddress || !actualGameCoins || !tokenAmountInWei || !actualNonce || !actualSignature || typeof actualIsInverse === 'undefined') {
                console.error('参数验证失败:');
                console.error('- 用户地址:', this.userAddress);
                console.error('- 游戏金币:', actualGameCoins);
                console.error('- 代币数量(wei):', tokenAmountInWei);
                console.error('- Nonce:', actualNonce);
                console.error('- IsInverse:', actualIsInverse);
                console.error('- 签名:', actualSignature);
                return {
                    success: false,
                    error: '参数验证失败，请确保所有参数都有效'
                };
            }

            // 检查签名长度
            // 检查签名长度，使用 actualSignature
            if (!actualSignature || typeof actualSignature !== 'string' || actualSignature.length !== 132) {
                console.error('签名长度不正确:', actualSignature ? actualSignature.length : typeof actualSignature);
                console.error('签名应该是132个字符的字符串（包括0x前缀）');
                return {
                    success: false,
                    error: '签名格式不正确，请刷新页面后重试'
                };
            }

            // 打印完整的调用信息，使用正确的参数名
            // 合约 exchangeFromGame(_gameCoins, _tokenAmount, _nonce, _isInverse, _signature)
            // msg.sender 会是 player
            console.log('完整的合约调用信息 (准备传递给 exchangeFromGame):');
            console.log('- _gameCoins:', actualGameCoins);
            console.log('- _tokenAmount (wei):', tokenAmountInWei);
            console.log('- _nonce:', actualNonce);
            console.log('- _isInverse:', actualIsInverse);
            console.log('- _signature:', actualSignature);

            // 打印参数的十六进制表示
            console.log('参数的十六进制表示:');
            console.log('- actualGameCoins (hex):', this.web3.utils.toHex(actualGameCoins));
            console.log('- tokenAmountInWei (hex):', this.web3.utils.toHex(tokenAmountInWei));
            console.log('- actualNonce (hex):', actualNonce); // Nonce is already hex
            console.log('- actualIsInverse (bool):', actualIsInverse);
            // actualSignature is already hex, no need to toHex

            // 打印ABI编码 - 确保参数顺序和数量与合约方法一致
            try {
                // 合约 exchangeFromGame(address player, uint256 gameCoins, uint256 tokenAmount, bytes32 nonce, bytes memory signature)
                const encodedABI = this.tokenContract.methods.exchangeFromGame(
                    this.userAddress,            // player (address)
                    actualGameCoins.toString(), // gameCoins (uint256)
                    tokenAmountInWei,           // tokenAmount (uint256)
                    actualNonce,                // nonce (bytes32)
                    actualSignature             // signature (bytes)
                ).encodeABI();
                console.log('完整的ABI编码:', encodedABI);
            } catch (e) {
                console.error('ABI编码失败:', e);
            }

            try {
                // 调用合约的exchangeFromGame函数
                console.log('调用合约 exchangeFromGame 方法...');
                console.log('注意: actualIsInverse (值为:', actualIsInverse, ') 不会直接传递给 exchangeFromGame 合约方法.');
                console.log('传递给 exchangeFromGame 的参数:');
                console.log('- player (this.userAddress):', this.userAddress);
                console.log('- gameCoins (actualGameCoins):', actualGameCoins.toString());
                console.log('- tokenAmount (tokenAmountInWei):', tokenAmountInWei);
                console.log('- nonce (actualNonce):', actualNonce);
                console.log('- signature (actualSignature):', actualSignature);
                // console.log('- 玩家将获得代币数量 (actualTokenAmount):', actualTokenAmount); // This is pre-wei conversion
                console.log('- 玩家将支付游戏金币 (actualGameCoins):', actualGameCoins);
                console.log('- Nonce (actualNonce):', actualNonce);
                console.log('- 签名 (actualSignature):', actualSignature);


                // 合约 exchangeFromGame(address player, uint256 gameCoins, uint256 tokenAmount, bytes32 nonce, bytes memory signature)
                const tx = await this.tokenContract.methods.exchangeFromGame(
                    this.userAddress,            // player
                    actualGameCoins.toString(), // gameCoins
                    tokenAmountInWei,           // tokenAmount
                    actualNonce,                // nonce
                    actualSignature             // signature
                ).send({
                    from: this.userAddress,
                    gas: Web3Config.defaultGasLimit || 300000 // 设置适当的gas限制
                });

                console.log('兑换交易已提交:', tx);

                return {
                    success: true,
                    data: tx,
                    message: `成功兑换 ${actualTokenAmount} 个代币` // 使用 actualTokenAmount
                };
            } catch (error) {
                console.error('合约方法调用失败:', error);
                console.error('错误详情:', JSON.stringify(error, null, 2));

                let errorMessage = '兑换失败，请稍后重试';

                // 解析错误消息
                if (error.message && error.message.includes('user rejected transaction')) {
                    errorMessage = '用户取消了交易';
                } else if (error.message && error.message.includes('insufficient funds')) {
                    errorMessage = 'Gas费用不足，请确保您的钱包中有足够的BNB';
                } else if (error.message && error.message.includes('execution reverted')) {
                    // 尝试提取合约错误消息
                    const revertReasonMatch = error.message.match(/reason: string '([^']*)'/); // 更通用的匹配
                    if (revertReasonMatch && revertReasonMatch[1]) {
                        errorMessage = `合约执行失败: ${revertReasonMatch[1]}`;
                    } else {
                         const revertReasonMatch2 = error.message.match(/revert (.+)/);
                         if (revertReasonMatch2 && revertReasonMatch2[1]) {
                            errorMessage = `合约执行失败: ${revertReasonMatch2[1]}`;
                         } else if (error.data && error.data.message) { // MetaMask 移动端可能将 revert reason 放在 error.data.message
                            errorMessage = `合约执行失败: ${error.data.message}`;
                         }
                    }
                }


                // 输出更多签名调试信息，使用正确的参数名
                console.error('合约调用失败时的参数状态:');
                console.error('- 用户地址 (msg.sender):', this.userAddress);
                console.error('- 游戏金币 (actualGameCoins):', actualGameCoins);
                console.error('- 代币数量(wei) (tokenAmountInWei):', tokenAmountInWei);
                console.error('- Nonce (actualNonce):', actualNonce);
                console.error('- IsInverse (actualIsInverse):', actualIsInverse);
                console.error('- 签名 (actualSignature):', actualSignature);
                console.error('- 签名长度:', actualSignature ? actualSignature.length : 'undefined');
                console.error('- 合约地址:', this.contractAddress);

                // 尝试重新计算消息哈希和签名验证
                try {
                    // 获取游戏服务器地址
                    const gameServerAddress = this.getGameServerAddressFromConfig();
                    console.error('- 游戏服务器地址:', gameServerAddress);

                    // 打印十六进制表示
                    console.error('参数的十六进制表示:');
                    console.error('- player (hex):', this.web3.utils.toHex(this.userAddress));
                    console.error('- gameCoins (hex):', this.web3.utils.toHex(actualGameCoins)); // 使用 actualGameCoins
                    console.error('- tokenAmount (hex):', this.web3.utils.toHex(tokenAmountInWei));
                    console.error('- nonce (hex):', actualNonce); // 使用 actualNonce
                    console.error('- contractAddress (hex):', this.web3.utils.toHex(this.contractAddress));

                    // 尝试使用web3.js验证签名
                    console.error('尝试在前端验证签名...');

                    // 打印完整的错误对象
                    console.error('完整的错误对象:', JSON.stringify(error, null, 2));
                } catch (verifyError) {
                    console.error('前端验证签名时出错:', verifyError);
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

    // 使用签名验证将代币充值为游戏金币
    rechargeTokensForCoinsWithSignature: async function(tokenAmount, gameCoinsToGain, nonce, signature) {
        // 详细检查合约和钱包状态
        if (!this.web3) {
            console.error('充值失败: Web3未初始化');
            return {
                success: false,
                error: 'Web3未初始化，请刷新页面后重试'
            };
        }

        if (!this.tokenContract) {
            console.error('充值失败: 合约未初始化');
            console.error('- web3状态:', !!this.web3);
            console.error('- contractAddress:', this.contractAddress);
            console.error('- contractABI:', !!this.contractABI);

            // 尝试初始化合约
            try {
                const initResult = await this.init();
                if (!initResult) {
                    return {
                        success: false,
                        error: '合约初始化失败，请刷新页面后重试'
                    };
                }
                console.log('合约初始化成功');
            } catch (initError) {
                console.error('合约初始化失败:', initError);
                return {
                    success: false,
                    error: '合约初始化失败: ' + initError.message
                };
            }
        }

        // 游戏已经要求连接钱包，所以这里直接使用已连接的钱包
        if (!this.userAddress) {
            console.log('尝试获取已连接的钱包地址...');

            // 尝试从ethereum对象获取地址
            if (window.ethereum && window.ethereum.selectedAddress) {
                this.userAddress = window.ethereum.selectedAddress;
                console.log('从ethereum对象获取到钱包地址:', this.userAddress);
            } else {
                // 尝试从web3获取地址
                try {
                    const accounts = await this.web3.eth.getAccounts();
                    if (accounts && accounts.length > 0) {
                        this.userAddress = accounts[0];
                        console.log('从web3获取到钱包地址:', this.userAddress);
                    } else {
                        console.error('未检测到已连接的钱包');
                        return {
                            success: false,
                            error: '未检测到已连接的钱包，请刷新页面后重试'
                        };
                    }
                } catch (accountError) {
                    console.error('获取账户失败:', accountError);
                    return {
                        success: false,
                        error: '获取钱包账户失败: ' + accountError.message
                    };
                }
            }
        }

        if (!tokenAmount || tokenAmount <= 0) {
            console.error('充值失败: 无效的代币数量');
            return {
                success: false,
                error: '无效的代币数量'
            };
        }

        try {
            console.log('使用签名验证将代币充值为游戏金币:');
            console.log('- 用户地址:', this.userAddress);
            console.log('- 代币数量:', tokenAmount);
            console.log('- 游戏金币数量:', gameCoinsToGain);
            console.log('- Nonce:', nonce);
            console.log('- 签名:', signature);
            console.log('- 合约地址:', this.contractAddress);

            // 将代币数量转换为wei单位
            const tokenAmountInWei = this.web3.utils.toWei(tokenAmount.toString(), 'ether');
            console.log('代币数量(wei):', tokenAmountInWei);

            // 确保所有参数都有效
            if (!this.userAddress || !gameCoinsToGain || !tokenAmountInWei || !nonce || !signature) {
                console.error('参数验证失败:');
                console.error('- 用户地址:', this.userAddress);
                console.error('- 游戏金币:', gameCoinsToGain);
                console.error('- 代币数量(wei):', tokenAmountInWei);
                console.error('- Nonce:', nonce);
                console.error('- 签名:', signature);
                return {
                    success: false,
                    error: '参数验证失败，请确保所有参数都有效'
                };
            }

            // 检查玩家代币余额
            if (this.externalTokenContract) {
                try {
                    const playerBalance = await this.externalTokenContract.methods.balanceOf(this.userAddress).call();
                    console.log('玩家代币余额:', this.web3.utils.fromWei(playerBalance, 'ether'));

                    if (BigInt(playerBalance) < BigInt(tokenAmountInWei)) {
                        return { success: false, error: '代币余额不足' };
                    }

                    // 检查玩家授权额度
                    const allowance = await this.externalTokenContract.methods.allowance(this.userAddress, this.contractAddress).call();
                    console.log('授权额度:', this.web3.utils.fromWei(allowance, 'ether'));

                    if (BigInt(allowance) < BigInt(tokenAmountInWei)) {
                        // 如果授权额度不足，先进行授权
                        console.log('授权额度不足，正在授权...');
                        const approveResult = await this.approveTokens(tokenAmountInWei);
                        if (!approveResult.success) {
                            return { success: false, error: '授权失败: ' + approveResult.error };
                        }
                    }
                } catch (error) {
                    console.error('检查代币余额或授权失败:', error);
                    return { success: false, error: '检查代币余额或授权失败: ' + error.message };
                }
            } else {
                console.warn('外部代币合约未初始化，无法检查代币余额和授权');
            }

            // 检查签名长度
            if (signature.length !== 132) {
                console.error('签名长度不正确:', signature.length);
                console.error('签名应该是132个字符（包括0x前缀）');
                return {
                    success: false,
                    error: '签名格式不正确，请刷新页面后重试'
                };
            }

            // 打印完整的调用信息
            console.log('完整的合约调用信息:');
            console.log('- 函数名: rechargeToGame');
            console.log('- 参数1 (gameCoins):', gameCoinsToGain);
            console.log('- 参数2 (tokenAmount):', tokenAmountInWei);
            console.log('- 参数3 (nonce):', nonce);
            console.log('- 参数4 (signature):', signature);
            console.log('- 发送者 (msg.sender):', this.userAddress);

            // 打印参数的十六进制表示
            console.log('参数的十六进制表示:');
            console.log('- player (hex):', this.web3.utils.toHex(this.userAddress));
            console.log('- gameCoins (hex):', this.web3.utils.toHex(gameCoinsToGain));
            console.log('- tokenAmount (hex):', this.web3.utils.toHex(tokenAmountInWei));
            console.log('- nonce (hex):', nonce);
            console.log('- signature (hex):', signature);

            // 打印ABI编码
            try {
                const encodedABI = this.tokenContract.methods.rechargeToGame(
                    gameCoinsToGain,   // 正确顺序: gameCoins first
                    tokenAmountInWei,  // 正确顺序: tokenAmount second
                    nonce,
                    signature
                ).encodeABI();
                console.log('完整的ABI编码:', encodedABI);
            } catch (e) {
                console.error('ABI编码失败:', e);
            }

            try {
                // 获取合约的 inverseExchangeMode 值
                let inverseMode;
                try {
                    inverseMode = await this.tokenContract.methods.inverseExchangeMode().call();
                    console.log('合约的 inverseExchangeMode 值:', inverseMode);

                    // 打印签名生成时使用的 isInverse 值
                    console.log('签名生成时使用的 isInverse 值:', Web3Config.RECHARGE.INVERSE_MODE);

                    // 如果不一致，打印警告
                    if (inverseMode.toString() !== Web3Config.RECHARGE.INVERSE_MODE.toString()) {
                        console.warn('警告: 合约的 inverseExchangeMode 值与签名生成时使用的 isInverse 值不一致!');
                        console.warn('请确保服务器端使用的 isInverse 值与合约中的 inverseExchangeMode 值一致!');

                        // 更新 Web3Config 中的 INVERSE_MODE 值
                        console.log('更新 Web3Config.RECHARGE.INVERSE_MODE 值为:', inverseMode);
                        Web3Config.RECHARGE.INVERSE_MODE = (inverseMode === 'true' || inverseMode === true);
                    }
                } catch (error) {
                    console.error('获取合约 inverseExchangeMode 值失败:', error);
                    // 如果获取失败，使用配置中的值
                    inverseMode = Web3Config.RECHARGE.INVERSE_MODE;
                }

                // 调用合约的rechargeToGame函数
                console.log('调用合约rechargeToGame方法...');
                console.log('合约地址:', this.contractAddress);
                console.log('合约方法参数:');
                console.log('- tokenAmount (wei):', tokenAmountInWei.toString());
                console.log('- gameCoins:', gameCoinsToGain);
                console.log('- nonce:', nonce);
                console.log('- signature:', signature);
                console.log('- from:', this.userAddress);

                // 尝试获取合约的 gameServerAddress
                try {
                    const gameServerAddressFromContract = await this.tokenContract.methods.gameServerAddress().call();
                    console.log('合约中的 gameServerAddress:', gameServerAddressFromContract);

                    if (gameServerAddressFromContract.toLowerCase() !== this.getGameServerAddressFromConfig().toLowerCase()) {
                        console.warn('警告: 合约中的 gameServerAddress 与配置中的不一致!');
                    }
                } catch (error) {
                    console.error('获取合约 gameServerAddress 失败:', error);
                }

                // 注意：我们不能直接检查nonce是否已被使用，因为合约可能没有公开的usedNonces方法
                // 但我们可以通过交易失败的错误信息来判断
                console.log('无法直接检查Nonce是否已被使用，将在交易失败时通过错误信息判断');

                const tx = await this.tokenContract.methods.rechargeToGame(
                    gameCoinsToGain,   // 正确顺序: gameCoins first
                    tokenAmountInWei,  // 正确顺序: tokenAmount second
                    nonce,
                    signature
                ).send({
                    from: this.userAddress,
                    gas: 300000 // 设置适当的gas限制
                });

                console.log('充值交易已提交:', tx);

                return {
                    success: true,
                    data: tx,
                    message: `成功充值 ${gameCoinsToGain} 个游戏金币`
                };
            } catch (error) {
                console.error('合约方法调用失败:', error);
                console.error('错误详情:', JSON.stringify(error, null, 2));

                let errorMessage = '充值失败，请稍后重试';

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
                }

                // 输出更多签名调试信息
                console.error('签名验证失败，详细信息:');
                console.error('- 用户地址:', this.userAddress);
                console.error('- 游戏金币:', gameCoinsToGain);
                console.error('- 代币数量(wei):', tokenAmountInWei);
                console.error('- Nonce:', nonce);
                console.error('- 签名:', signature);
                console.error('- 签名长度:', signature.length);
                console.error('- 合约地址:', this.contractAddress);

                // 尝试重新计算消息哈希和签名验证
                try {
                    // 获取游戏服务器地址
                    const gameServerAddress = this.getGameServerAddressFromConfig();
                    console.error('- 游戏服务器地址:', gameServerAddress);

                    // 打印十六进制表示
                    console.error('参数的十六进制表示:');
                    console.error('- player (hex):', this.web3.utils.toHex(this.userAddress));
                    console.error('- gameCoins (hex):', this.web3.utils.toHex(gameCoinsToGain));
                    console.error('- tokenAmount (hex):', this.web3.utils.toHex(tokenAmountInWei));
                    console.error('- nonce (hex):', nonce);
                    console.error('- contractAddress (hex):', this.web3.utils.toHex(this.contractAddress));

                    // 尝试使用web3.js验证签名
                    console.error('尝试在前端验证签名...');

                    // 获取合约的 inverseExchangeMode 值
                    try {
                        const inverseMode = await this.tokenContract.methods.inverseExchangeMode().call();
                        console.error('合约的 inverseExchangeMode 值:', inverseMode);

                        // 使用 web3.js 重新创建消息哈希，确保与合约中的方式完全一致
                        // 合约中的代码是:
                        // bytes32 messageHash = keccak256(abi.encodePacked(player, tokenAmount, gameCoins, nonce, address(this), "recharge"));

                        // 使用 encodePacked 方式打包数据
                        console.log('使用 encodePacked 方式打包数据:');
                        console.log('- player:', this.userAddress);
                        console.log('- tokenAmount:', tokenAmountInWei.toString());
                        console.log('- gameCoins:', gameCoinsToGain.toString());
                        console.log('- nonce:', nonce);
                        console.log('- contractAddress:', this.contractAddress);
                        console.log('- "recharge"');

                        // 使用 soliditySha3 模拟 keccak256(abi.encodePacked(...))
                        const packedData = this.web3.utils.soliditySha3(
                            {type: 'address', value: this.userAddress},
                            {type: 'uint256', value: tokenAmountInWei.toString()},
                            {type: 'uint256', value: gameCoinsToGain.toString()},
                            {type: 'bytes32', value: nonce},
                            {type: 'address', value: this.contractAddress},
                            {type: 'string', value: 'recharge'}
                        );

                        console.error('前端重新计算的消息哈希:', packedData);

                        // 尝试使用 web3.js 恢复签名者地址
                        // 方法1: 使用 soliditySha3 + recover
                        const prefixedHash = this.web3.utils.soliditySha3(
                            {type: 'string', value: '\x19Ethereum Signed Message:\n32'},
                            {type: 'bytes32', value: packedData}
                        );

                        console.error('前端计算的前缀哈希:', prefixedHash);

                        // 尝试恢复签名者地址
                        try {
                            const recoveredAddress = this.web3.eth.accounts.recover(prefixedHash, signature);
                            console.error('方法1 - 前端恢复的签名者地址:', recoveredAddress);
                            console.error('期望的游戏服务器地址:', gameServerAddress);

                            if (recoveredAddress.toLowerCase() === gameServerAddress.toLowerCase()) {
                                console.error('方法1 - 前端验证签名成功!');
                            } else {
                                console.error('方法1 - 前端验证签名失败!');
                            }
                        } catch (recoverError) {
                            console.error('方法1 - 恢复签名者地址失败:', recoverError);
                        }

                        // 方法2: 直接使用 recover
                        try {
                            const recoveredAddress2 = this.web3.eth.accounts.recover(packedData, signature);
                            console.error('方法2 - 前端恢复的签名者地址:', recoveredAddress2);

                            if (recoveredAddress2.toLowerCase() === gameServerAddress.toLowerCase()) {
                                console.error('方法2 - 前端验证签名成功!');
                            } else {
                                console.error('方法2 - 前端验证签名失败!');
                            }
                        } catch (recoverError) {
                            console.error('方法2 - 恢复签名者地址失败:', recoverError);
                        }

                        // 方法3已移除，因为它总是失败
                        // 这是因为签名格式不兼容这种恢复方式
                    } catch (verifyError) {
                        console.error('前端验证签名时出错:', verifyError);
                    }

                    // 打印完整的错误对象
                    console.error('完整的错误对象:', JSON.stringify(error, null, 2));
                } catch (verifyError) {
                    console.error('前端验证签名时出错:', verifyError);
                }

                return {
                    success: false,
                    error: errorMessage,
                    originalError: error.message
                };
            }
        } catch (error) {
            console.error('充值代币失败:', error);
            return {
                success: false,
                error: error.message || '充值过程中发生错误'
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
            // 监听Transfer事件
            this.transferEventSubscription = this.tokenContract.events.Transfer({
                filter: {
                    to: this.userAddress // 只监听发送给当前用户的转账
                }
            })
            .on('data', function(event) {
                console.log('收到代币转账事件:', event);
                if (typeof callback === 'function') {
                    callback(event);
                }
            })
            .on('error', function(error) {
                console.error('代币转账事件监听出错:', error);
            });

            console.log('已开始监听代币转账事件');
            return true;
        } catch (error) {
            console.error('设置事件监听失败:', error);
            return false;
        }
    },

    // 停止监听代币转账事件
    stopListeningToTransferEvents: function() {
        if (this.transferEventSubscription) {
            try {
                this.transferEventSubscription.unsubscribe();
                console.log('已停止监听代币转账事件');
                this.transferEventSubscription = null;
                return true;
            } catch (error) {
                console.error('停止事件监听失败:', error);
                return false;
            }
        }
        return true; // 如果没有订阅，也返回成功
    },

    // 授权代币
    approveTokens: async function(amount) {
        if (!this.externalTokenContract) {
            console.error('授权代币失败: 外部代币合约未初始化');
            return { success: false, error: '外部代币合约未初始化' };
        }

        if (!this.userAddress) {
            console.error('授权代币失败: 未连接钱包');
            return { success: false, error: '未连接钱包' };
        }

        try {
            console.log('授权代币:', amount, '给合约地址:', this.contractAddress);

            // 调用外部代币合约的approve方法
            const tx = await this.externalTokenContract.methods.approve(
                this.contractAddress,
                amount
            ).send({
                from: this.userAddress,
                gas: 100000 // 设置适当的gas限制
            });

            console.log('授权交易已提交:', tx);
            return { success: true, txHash: tx.transactionHash };
        } catch (error) {
            console.error('授权代币失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 旧的 getTokenTaxRates 方法已被合并到 getContractExchangeConfig，可以移除
    // getTokenTaxRates: async function() { ... }
};
