/**
 * ERC20代币合约交互模块
 * 用于神庙逃亡游戏与标准ERC20代币合约的交互
 */
const ERC20TokenContract = {
    // Web3实例
    web3: null,
    
    // 代币合约实例
    tokenContract: null,
    
    // 代币合约地址
    contractAddress: null,
    
    // 当前用户钱包地址
    userAddress: null,
    
    // 标准ERC20合约ABI
    contractABI: [
        // 标准ERC20函数
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
        },
        {
            "constant": true,
            "inputs": [],
            "name": "decimals",
            "outputs": [{"name": "", "type": "uint8"}],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [],
            "name": "totalSupply",
            "outputs": [{"name": "", "type": "uint256"}],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {"name": "_to", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "transfer",
            "outputs": [{"name": "", "type": "bool"}],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {"name": "_spender", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "constant": true,
            "inputs": [
                {"name": "_owner", "type": "address"},
                {"name": "_spender", "type": "address"}
            ],
            "name": "allowance",
            "outputs": [{"name": "", "type": "uint256"}],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        },
        {
            "constant": false,
            "inputs": [
                {"name": "_from", "type": "address"},
                {"name": "_to", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "transferFrom",
            "outputs": [{"name": "", "type": "bool"}],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
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
                {"indexed": true, "name": "from", "type": "address"},
                {"indexed": true, "name": "to", "type": "address"},
                {"indexed": false, "name": "value", "type": "uint256"}
            ],
            "name": "Transfer",
            "type": "event"
        }
    ],
    
    // 初始化
    init: async function(contractAddress) {
        console.log('初始化ERC20代币合约交互模块...');
        
        // 保存合约地址
        this.contractAddress = contractAddress || this.getContractAddressFromConfig();
        
        if (!this.contractAddress) {
            console.error('初始化失败: 未提供合约地址');
            return false;
        }
        
        try {
            // 检查是否已安装MetaMask
            if (typeof window.ethereum === 'undefined') {
                console.error('初始化失败: 未检测到MetaMask');
                return false;
            }
            
            // 初始化Web3
            this.web3 = new Web3(window.ethereum);
            console.log('Web3初始化成功');
            
            // 获取当前连接的账户
            const accounts = await this.web3.eth.getAccounts();
            if (accounts.length > 0) {
                this.userAddress = accounts[0];
                console.log('当前用户地址:', this.userAddress);
            } else {
                console.warn('未检测到连接的账户');
            }
            
            // 初始化合约实例
            this.tokenContract = new this.web3.eth.Contract(
                this.contractABI,
                this.contractAddress
            );
            
            console.log('ERC20代币合约初始化成功:', this.contractAddress);
            
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
            console.error('初始化ERC20代币合约失败:', error);
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
        return '0x0E777CD3a052c223e7ACFD38E6033BE85903A050';
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
            
            // 获取原始余额
            const rawBalance = await this.tokenContract.methods.balanceOf(targetAddress).call();
            console.log('获取到的原始余额:', rawBalance);
            
            // 获取代币精度
            const decimals = await this.tokenContract.methods.decimals().call();
            console.log('代币精度:', decimals);
            
            // 转换为带小数点的余额
            const divisor = new this.web3.utils.BN(10).pow(new this.web3.utils.BN(decimals));
            const balanceBN = new this.web3.utils.BN(rawBalance);
            const formattedBalance = balanceBN.div(divisor).toString() + '.' + 
                                    balanceBN.mod(divisor).toString().padStart(decimals, '0');
            
            console.log(`地址 ${targetAddress} 的代币余额:`, formattedBalance);
            
            return {
                raw: rawBalance,
                formatted: formattedBalance,
                decimals: parseInt(decimals)
            };
        } catch (error) {
            console.error('获取代币余额失败:', error);
            return null;
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
            this.tokenContract.events.Transfer({
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
    }
};
