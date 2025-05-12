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
            if (typeof TempleRunTokenWithTaxABI_Updated !== 'undefined') {
                this.contractABI = TempleRunTokenWithTaxABI_Updated;
                console.log('已从全局变量加载合约ABI (TempleRunTokenWithTaxABI_Updated)');
            } else {
                console.error('未找到TempleRunTokenWithTaxABI_Updated，请确保已加载相应的ABI文件');
                return false;
            }

            // 检查钱包连接状态，但不主动请求连接
            if (!this.userAddress) {
                try {
                    // 尝试获取当前连接的账户（不请求连接）
                    const accounts = await this.web3.eth.getAccounts();
                    if (accounts && accounts.length > 0) {
                        this.userAddress = accounts[0];
                        console.log('检测到已连接的钱包地址:', this.userAddress);
                    } else {
                        console.log('未检测到已连接的钱包，但仍然创建合约实例');
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

            console.log('合约实例有效，初始化完成');
            return true;
        } catch (error) {
            console.error('初始化Web3代币合约失败:', error);
            return false;
        }
    },

    // 检查合约最小兑换金额
    checkMinExchangeAmount: async function() {
        if (!this.tokenContract) {
            console.error('检查最小兑换金额失败: 合约未初始化');
            return false;
        }

        try {
            // 从合约获取最小兑换金额
            const minExchangeAmount = await this.tokenContract.methods.minExchangeAmount().call();
            console.log('合约最小兑换金额:', this.web3.utils.fromWei(minExchangeAmount, 'ether'), '代币');

            // 从合约获取最大兑换金额
            const maxExchangeAmount = await this.tokenContract.methods.maxExchangeAmount().call();
            console.log('合约最大兑换金额:', this.web3.utils.fromWei(maxExchangeAmount, 'ether'), '代币');

            // 从合约获取兑换比例
            const exchangeRate = await this.tokenContract.methods.exchangeRate().call();
            console.log('合约兑换比例: 1代币 =', exchangeRate, '游戏金币');

            // 从合约获取兑换手续费率
            const exchangeFeeRate = await this.tokenContract.methods.exchangeFeeRate().call();
            console.log('合约兑换手续费率:', exchangeFeeRate / 100, '%');

            // 从合约获取兑换代币税率
            let exchangeTokenTaxRate = 200; // 默认2%
            try {
                exchangeTokenTaxRate = await this.tokenContract.methods.exchangeTokenTaxRate().call();
                console.log('合约兑换代币税率:', exchangeTokenTaxRate / 100, '%');
            } catch (taxError) {
                console.warn('获取兑换代币税率失败，使用默认值2%:', taxError);
            }

            // 从合约获取充值代币税率
            let rechargeTokenTaxRate = 100; // 默认1%
            try {
                rechargeTokenTaxRate = await this.tokenContract.methods.rechargeTokenTaxRate().call();
                console.log('合约充值代币税率:', rechargeTokenTaxRate / 100, '%');
            } catch (taxError) {
                console.warn('获取充值代币税率失败，使用默认值1%:', taxError);
            }

            return {
                minExchangeAmount: this.web3.utils.fromWei(minExchangeAmount, 'ether'),
                maxExchangeAmount: this.web3.utils.fromWei(maxExchangeAmount, 'ether'),
                exchangeRate: exchangeRate,
                exchangeFeeRate: exchangeFeeRate,
                exchangeTokenTaxRate: exchangeTokenTaxRate,
                rechargeTokenTaxRate: rechargeTokenTaxRate
            };
        } catch (error) {
            console.error('获取合约最小兑换金额失败:', error);
            return false;
        }
    },

    // 初始化Web3但不请求账户
    initWeb3WithoutConnect: function() {
        try {
            console.log('初始化Web3（不请求账户）...');

            // 检查是否已有Web3实例
            if (window.ethereum) {
                // 使用现代dapp浏览器
                this.web3 = new Web3(window.ethereum);
                console.log('使用window.ethereum初始化Web3（不请求账户）');

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

                return true;
            } else if (window.web3) {
                // 使用旧版Web3
                this.web3 = new Web3(window.web3.currentProvider);
                console.log('使用window.web3.currentProvider初始化Web3（不请求账户）');
                return true;
            } else {
                // 如果没有检测到Web3，使用远程节点
                console.warn('未检测到Web3，使用远程节点');

                // 使用BSC测试网节点
                const provider = new Web3.providers.HttpProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
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
        // 从GameConfig中获取合约地址
        if (typeof GameConfig !== 'undefined') {
            // 首先尝试从TOKEN_EXCHANGE获取
            if (GameConfig.TOKEN_EXCHANGE && GameConfig.TOKEN_EXCHANGE.CONTRACT_ADDRESS) {
                return GameConfig.TOKEN_EXCHANGE.CONTRACT_ADDRESS;
            }

            // 如果没有，尝试从TOKEN_RECHARGE获取
            if (GameConfig.TOKEN_RECHARGE && GameConfig.TOKEN_RECHARGE.CONTRACT_ADDRESS) {
                return GameConfig.TOKEN_RECHARGE.CONTRACT_ADDRESS;
            }
        }

        // 如果都没有配置，记录错误并返回空字符串
        console.error('未找到合约地址配置，请检查GameConfig');
        return '';
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
        return '0x599321e71a41bd2629034b0353b93cff56ebaeca';
    },

    // 获取代币信息
    getTokenInfo: async function() {
        if (!this.tokenContract) {
            console.error('获取代币信息失败: 合约未初始化');
            return null;
        }

        try {
            // 获取代币名称
            const name = await this.tokenContract.methods.name().call();

            // 获取代币符号
            const symbol = await this.tokenContract.methods.symbol().call();

            // 获取代币小数位数
            const decimals = await this.tokenContract.methods.decimals().call();

            // 获取代币总供应量
            const totalSupply = await this.tokenContract.methods.totalSupply().call();

            return {
                name: name,
                symbol: symbol,
                decimals: parseInt(decimals),
                totalSupply: this.web3.utils.fromWei(totalSupply, 'ether')
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

        // 如果未提供地址，使用当前连接的钱包地址
        const walletAddress = address || this.userAddress;

        if (!walletAddress) {
            console.error('获取余额失败: 未提供钱包地址且未连接钱包');
            return null;
        }

        try {
            // 获取代币余额
            const balance = await this.tokenContract.methods.balanceOf(walletAddress).call();

            // 获取代币小数位数
            const decimals = await this.tokenContract.methods.decimals().call();

            // 转换为可读格式
            const balanceInEther = this.web3.utils.fromWei(balance, 'ether');

            console.log(`钱包 ${walletAddress} 的代币余额:`, balanceInEther);

            return {
                balance: balance,
                balanceInEther: balanceInEther,
                decimals: parseInt(decimals)
            };
        } catch (error) {
            console.error('获取代币余额失败:', error);
            return null;
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

        try {
            console.log('使用签名验证兑换游戏金币为代币:');
            console.log('- 用户地址:', this.userAddress);
            console.log('- 代币数量:', tokenAmount);
            console.log('- 游戏金币数量:', gameCoinsToUse);
            console.log('- Nonce:', nonce);
            console.log('- 签名:', signature);
            console.log('- 合约地址:', this.contractAddress);

            // 将代币数量转换为wei单位
            const tokenAmountInWei = this.web3.utils.toWei(tokenAmount.toString(), 'ether');
            console.log('代币数量(wei):', tokenAmountInWei);

            // 确保所有参数都有效
            if (!this.userAddress || !gameCoinsToUse || !tokenAmountInWei || !nonce || !signature) {
                console.error('参数验证失败:');
                console.error('- 用户地址:', this.userAddress);
                console.error('- 游戏金币:', gameCoinsToUse);
                console.error('- 代币数量(wei):', tokenAmountInWei);
                console.error('- Nonce:', nonce);
                console.error('- 签名:', signature);
                return {
                    success: false,
                    error: '参数验证失败，请确保所有参数都有效'
                };
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
            console.log('- 函数名: exchangeFromGame');
            console.log('- 参数1 (player):', this.userAddress);
            console.log('- 参数2 (gameCoins):', gameCoinsToUse);
            console.log('- 参数3 (tokenAmount):', tokenAmountInWei);
            console.log('- 参数4 (nonce):', nonce);
            console.log('- 参数5 (signature):', signature);

            // 打印参数的十六进制表示
            console.log('参数的十六进制表示:');
            console.log('- player (hex):', this.web3.utils.toHex(this.userAddress));
            console.log('- gameCoins (hex):', this.web3.utils.toHex(gameCoinsToUse));
            console.log('- tokenAmount (hex):', this.web3.utils.toHex(tokenAmountInWei));
            console.log('- nonce (hex):', nonce);
            console.log('- signature (hex):', signature);

            // 打印ABI编码
            try {
                const encodedABI = this.tokenContract.methods.exchangeFromGame(
                    this.userAddress,
                    gameCoinsToUse,
                    tokenAmountInWei,
                    nonce,
                    signature
                ).encodeABI();
                console.log('完整的ABI编码:', encodedABI);
            } catch (e) {
                console.error('ABI编码失败:', e);
            }

            try {
                // 调用合约的exchangeFromGame函数
                console.log('调用合约exchangeFromGame方法...');

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
                console.error('错误详情:', JSON.stringify(error, null, 2));

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
                }

                // 输出更多签名调试信息
                console.error('签名验证失败，详细信息:');
                console.error('- 用户地址:', this.userAddress);
                console.error('- 游戏金币:', gameCoinsToUse);
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
                    console.error('- gameCoins (hex):', this.web3.utils.toHex(gameCoinsToUse));
                    console.error('- tokenAmount (hex):', this.web3.utils.toHex(tokenAmountInWei));
                    console.error('- nonce (hex):', nonce);
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
            console.log('- 参数1 (player):', this.userAddress);
            console.log('- 参数2 (gameCoins):', gameCoinsToGain);
            console.log('- 参数3 (tokenAmount):', tokenAmountInWei);
            console.log('- 参数4 (nonce):', nonce);
            console.log('- 参数5 (signature):', signature);

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
                    this.userAddress,
                    gameCoinsToGain,
                    tokenAmountInWei,
                    nonce,
                    signature
                ).encodeABI();
                console.log('完整的ABI编码:', encodedABI);
            } catch (e) {
                console.error('ABI编码失败:', e);
            }

            try {
                // 调用合约的rechargeToGame函数
                console.log('调用合约rechargeToGame方法...');

                const tx = await this.tokenContract.methods.rechargeToGame(
                    this.userAddress,
                    gameCoinsToGain,
                    tokenAmountInWei,
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

    // 获取代币税率
    getTokenTaxRates: async function() {
        if (!this.tokenContract) {
            console.error('获取代币税率失败: 合约未初始化');
            return {
                exchangeTokenTaxRate: 200, // 默认2%
                rechargeTokenTaxRate: 100  // 默认1%
            };
        }

        try {
            // 从合约获取兑换代币税率
            let exchangeTokenTaxRate = 200; // 默认2%
            try {
                exchangeTokenTaxRate = await this.tokenContract.methods.exchangeTokenTaxRate().call();
                console.log('合约兑换代币税率:', exchangeTokenTaxRate / 100, '%');
            } catch (taxError) {
                console.warn('获取兑换代币税率失败，使用默认值2%:', taxError);
            }

            // 从合约获取充值代币税率
            let rechargeTokenTaxRate = 100; // 默认1%
            try {
                rechargeTokenTaxRate = await this.tokenContract.methods.rechargeTokenTaxRate().call();
                console.log('合约充值代币税率:', rechargeTokenTaxRate / 100, '%');
            } catch (taxError) {
                console.warn('获取充值代币税率失败，使用默认值1%:', taxError);
            }

            return {
                exchangeTokenTaxRate: exchangeTokenTaxRate,
                rechargeTokenTaxRate: rechargeTokenTaxRate
            };
        } catch (error) {
            console.error('获取代币税率失败:', error);
            return {
                exchangeTokenTaxRate: 200, // 默认2%
                rechargeTokenTaxRate: 100  // 默认1%
            };
        }
    }
};
