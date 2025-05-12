// 部署脚本 - 可以在Remix中使用，或者使用Truffle/Hardhat部署

/**
 * 部署TempleRunToken合约
 * 
 * 参数说明：
 * name: 代币名称，例如 "Temple Run Token"
 * symbol: 代币符号，例如 "TRT"
 * initialSupply: 初始供应量，单位为wei，例如 "1000000000000000000000000"（1,000,000个代币，假设18位小数）
 * gameServerAddress: 游戏服务器地址，用于签名验证
 */
async function deployTempleRunToken() {
    try {
        // 获取部署账户
        const accounts = await web3.eth.getAccounts();
        const deployer = accounts[0];
        
        console.log('使用账户部署合约:', deployer);
        
        // 合约参数
        const name = "Temple Run Token";
        const symbol = "TRT";
        const initialSupply = web3.utils.toWei('1000000', 'ether'); // 1,000,000个代币
        const gameServerAddress = "0x599321e71a41bd2629034b0353b93cff56ebaeca"; // 替换为您的游戏服务器地址
        
        // 编译合约
        const TempleRunToken = await ethers.getContractFactory("TempleRunToken");
        
        // 部署合约
        console.log('开始部署TempleRunToken合约...');
        console.log('参数:');
        console.log('- 名称:', name);
        console.log('- 符号:', symbol);
        console.log('- 初始供应量:', initialSupply);
        console.log('- 游戏服务器地址:', gameServerAddress);
        
        const token = await TempleRunToken.deploy(name, symbol, initialSupply, gameServerAddress);
        
        // 等待部署完成
        await token.deployed();
        
        console.log('TempleRunToken合约已部署:');
        console.log('- 合约地址:', token.address);
        console.log('- 交易哈希:', token.deployTransaction.hash);
        
        // 设置初始参数
        console.log('设置初始参数...');
        
        // 设置兑换比例：1个代币 = 100个游戏金币
        await token.setExchangeRate(100);
        console.log('- 兑换比例已设置: 1个代币 = 100个游戏金币');
        
        // 设置兑换手续费率：2%
        await token.setExchangeFeeRate(200);
        console.log('- 兑换手续费率已设置: 2%');
        
        // 设置兑换限额：最小1个代币，最大1000个代币
        await token.setExchangeLimits(
            web3.utils.toWei('1', 'ether'),
            web3.utils.toWei('1000', 'ether')
        );
        console.log('- 兑换限额已设置: 最小1个代币，最大1000个代币');
        
        console.log('合约部署和初始化完成!');
        
        return {
            address: token.address,
            deployer: deployer,
            token: token
        };
    } catch (error) {
        console.error('部署合约时出错:', error);
        throw error;
    }
}

// 如果直接运行此脚本，则执行部署
if (require.main === module) {
    deployTempleRunToken()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = deployTempleRunToken;
