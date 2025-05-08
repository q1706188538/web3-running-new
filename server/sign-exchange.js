/**
 * 签名生成模块
 * 用于生成代币兑换签名
 */
const ethers = require('ethers');

// 游戏服务器私钥
const GAME_SERVER_PRIVATE_KEY = 'e367e745d9f63a268b668e4bc2d80319acb111cdb90fb37b45b23592aa443e68';

// 游戏服务器地址（从私钥派生）
const gameServerWallet = new ethers.Wallet(GAME_SERVER_PRIVATE_KEY);
const GAME_SERVER_ADDRESS = gameServerWallet.address;

console.log('游戏服务器地址:', GAME_SERVER_ADDRESS);

// 生成随机nonce
function generateRandomNonce() {
    // 生成32字节的随机数据
    const randomBytes = ethers.utils.randomBytes(32);
    // 转换为bytes32格式
    return ethers.utils.hexlify(randomBytes);
}

// 生成兑换签名
async function generateExchangeSignature(playerAddress, tokenAmount, gameCoins, contractAddress) {
    try {
        // 生成随机nonce
        const nonce = generateRandomNonce();

        console.log('生成兑换签名...');
        console.log('玩家地址:', playerAddress);
        console.log('代币数量:', tokenAmount);
        console.log('游戏金币:', gameCoins);
        console.log('Nonce:', nonce);
        console.log('合约地址:', contractAddress);

        // 确保参数格式正确
        // 确保玩家地址格式正确
        if (!ethers.utils.isAddress(playerAddress)) {
            throw new Error(`无效的玩家地址: ${playerAddress}`);
        }

        // 确保合约地址格式正确
        if (!ethers.utils.isAddress(contractAddress)) {
            throw new Error(`无效的合约地址: ${contractAddress}`);
        }

        // 确保代币数量是有效的数字
        if (isNaN(tokenAmount) || tokenAmount <= 0) {
            throw new Error(`无效的代币数量: ${tokenAmount}`);
        }

        // 确保游戏金币是有效的数字
        if (isNaN(gameCoins) || gameCoins <= 0) {
            throw new Error(`无效的游戏金币数量: ${gameCoins}`);
        }

        // 将代币数量转换为wei单位
        const tokenAmountInWei = ethers.utils.parseEther(tokenAmount.toString());
        console.log('代币数量(wei):', tokenAmountInWei.toString());

        // 创建消息哈希 - 按照合约中的格式
        const messageHash = ethers.utils.solidityKeccak256(
            ['address', 'uint256', 'uint256', 'bytes32', 'address'],
            [playerAddress, gameCoins, tokenAmountInWei, nonce, contractAddress]
        );

        console.log('消息哈希:', messageHash);

        // 创建以太坊签名消息哈希
        const ethSignedMessageHash = ethers.utils.arrayify(messageHash);

        // 使用私钥签名消息
        const wallet = new ethers.Wallet(GAME_SERVER_PRIVATE_KEY);
        const signature = await wallet.signMessage(ethSignedMessageHash);

        console.log('生成的签名:', signature);

        // 验证签名是否正确
        const recoveredAddress = ethers.utils.verifyMessage(ethSignedMessageHash, signature);
        console.log('恢复的签名者地址:', recoveredAddress);
        console.log('游戏服务器地址:', GAME_SERVER_ADDRESS);

        if (recoveredAddress.toLowerCase() !== GAME_SERVER_ADDRESS.toLowerCase()) {
            throw new Error('签名验证失败，恢复的地址与游戏服务器地址不匹配');
        }

        return {
            success: true,
            signature: signature,
            nonce: nonce,
            signer: GAME_SERVER_ADDRESS
        };
    } catch (error) {
        console.error('生成签名出错:', error);
        return {
            success: false,
            error: error.message || '生成签名时发生错误'
        };
    }
}

// 验证签名
async function verifySignature(playerAddress, tokenAmount, gameCoins, nonce, contractAddress, signature) {
    try {
        console.log('验证签名...');
        console.log('玩家地址:', playerAddress);
        console.log('代币数量:', tokenAmount);
        console.log('游戏金币:', gameCoins);
        console.log('Nonce:', nonce);
        console.log('合约地址:', contractAddress);
        console.log('签名:', signature);

        // 将代币数量转换为wei单位
        const tokenAmountInWei = ethers.utils.parseEther(tokenAmount.toString());

        // 创建消息哈希 - 按照合约中的格式
        const messageHash = ethers.utils.solidityKeccak256(
            ['address', 'uint256', 'uint256', 'bytes32', 'address'],
            [playerAddress, gameCoins, tokenAmountInWei, nonce, contractAddress]
        );

        // 创建以太坊签名消息哈希
        const ethSignedMessageHash = ethers.utils.arrayify(messageHash);

        // 从签名恢复签名者地址
        const recoveredAddress = ethers.utils.verifyMessage(ethSignedMessageHash, signature);

        console.log('恢复的签名者地址:', recoveredAddress);
        console.log('游戏服务器地址:', GAME_SERVER_ADDRESS);

        // 验证签名者是否为游戏服务器
        const isValid = recoveredAddress.toLowerCase() === GAME_SERVER_ADDRESS.toLowerCase();

        return {
            success: isValid,
            recoveredAddress: recoveredAddress,
            isValid: isValid
        };
    } catch (error) {
        console.error('验证签名出错:', error);
        return {
            success: false,
            error: error.message || '验证签名时发生错误'
        };
    }
}

module.exports = {
    generateExchangeSignature,
    verifySignature,
    GAME_SERVER_ADDRESS
};
