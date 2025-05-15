/**
 * 签名生成模块
 * 用于生成代币兑换签名
 */
const ethers = require('ethers');

// 游戏服务器私钥
const GAME_SERVER_PRIVATE_KEY = '0x5c8b9227cd5065c7e3f6b73826b8b42e198c4497f6688e3085d5ab3a6d520e74';

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

// 生成以太坊签名消息哈希（与合约内toEthSignedMessageHash等效）
function toEthSignedMessageHash(hash) {
    // 添加前缀: "\x19Ethereum Signed Message:\n32"
    return ethers.utils.keccak256(
        ethers.utils.concat([
            ethers.utils.toUtf8Bytes("\x19Ethereum Signed Message:\n32"),
            ethers.utils.arrayify(hash)
        ])
    );
}

// 生成兑换签名 - 与合约完全匹配版
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

        // 1. 创建与合约完全匹配的消息哈希
        // 注意：这里必须与合约中的abi.encodePacked完全匹配
        // 合约中的代码是:
        // bytes32 messageHash = keccak256(abi.encodePacked(
        //     player,
        //     gameCoins,
        //     tokenAmount,
        //     nonce,
        //     address(this)
        // ));

        // 打印详细的参数信息，用于调试
        console.log('签名参数详情:');
        console.log('- playerAddress:', playerAddress, '(类型:', typeof playerAddress, ')');
        console.log('- gameCoins:', gameCoins, '(类型:', typeof gameCoins, ')');
        console.log('- tokenAmountInWei:', tokenAmountInWei.toString(), '(类型: BigNumber)');
        console.log('- nonce:', nonce, '(类型:', typeof nonce, ')');
        console.log('- contractAddress:', contractAddress, '(类型:', typeof contractAddress, ')');

        // 确保gameCoins是数字类型
        const gameCoinsNumber = Number(gameCoins);

        // 确保所有参数都是正确的格式
        // 1. 地址必须是小写的
        const playerAddressLower = playerAddress.toLowerCase();
        const contractAddressLower = contractAddress.toLowerCase();

        // 2. 确保nonce是正确的格式（bytes32）
        // 如果nonce不是0x开头，添加0x前缀
        let nonceFormatted = nonce;
        if (!nonceFormatted.startsWith('0x')) {
            nonceFormatted = '0x' + nonceFormatted;
        }

        // 3. 确保tokenAmountInWei是BigNumber
        // 已经在前面转换为BigNumber了

        console.log('格式化后的参数:');
        console.log('- playerAddressLower:', playerAddressLower);
        console.log('- gameCoinsNumber:', gameCoinsNumber);
        console.log('- tokenAmountInWei:', tokenAmountInWei.toString());
        console.log('- nonceFormatted:', nonceFormatted);
        console.log('- contractAddressLower:', contractAddressLower);

        // 使用与合约完全相同的方式创建消息哈希
        // 合约中的代码是:
        // bytes32 messageHash = keccak256(abi.encodePacked(
        //     player,
        //     gameCoins,
        //     tokenAmount,
        //     nonce,
        //     address(this)
        // ));

        // 打印原始参数的十六进制表示
        console.log('参数的十六进制表示:');
        console.log('- playerAddress:', ethers.utils.hexlify(ethers.utils.arrayify(playerAddressLower)));
        console.log('- gameCoins:', ethers.utils.hexlify(ethers.utils.arrayify(ethers.utils.hexZeroPad(ethers.utils.hexlify(gameCoinsNumber), 32))));
        console.log('- tokenAmount:', ethers.utils.hexlify(ethers.utils.arrayify(tokenAmountInWei)));
        console.log('- nonce:', ethers.utils.hexlify(ethers.utils.arrayify(nonceFormatted)));
        console.log('- contractAddress:', ethers.utils.hexlify(ethers.utils.arrayify(contractAddressLower)));

        // 确保所有参数都是正确的格式
        const gameCoinsBigNum = ethers.BigNumber.from(gameCoinsNumber); // 将 gameCoins 也转为 BigNumber
        console.log('BigNumber gameCoins:', gameCoinsBigNum.toString()); // 调试日志

        const messageHash = ethers.utils.keccak256(
            ethers.utils.solidityPack(
                ['address', 'uint256', 'uint256', 'bytes32', 'address'],
                [playerAddressLower, gameCoinsBigNum, tokenAmountInWei, nonceFormatted, contractAddressLower]
            )
        );

        console.log('--- Parameters for solidityPack ---');
        console.log('playerAddressLower:', playerAddressLower, '(type:', typeof playerAddressLower, ')');
        console.log('gameCoinsBigNum:', gameCoinsBigNum.toString(), '(type: BigNumber)');
        console.log('tokenAmountInWei:', tokenAmountInWei.toString(), '(type: BigNumber)');
        console.log('nonceFormatted:', nonceFormatted, '(type:', typeof nonceFormatted, ')');
        console.log('contractAddressLower:', contractAddressLower, '(type:', typeof contractAddressLower, ')');
        console.log('--- End Parameters for solidityPack ---');
        console.log('消息哈希:', messageHash);

        // 2. 添加以太坊签名前缀 - 与合约的toEthSignedMessageHash等效
        const ethSignedMessageHash = toEthSignedMessageHash(messageHash);
        console.log('以太坊签名消息哈希:', ethSignedMessageHash);

        // 3. 使用私钥直接签名ethSignedMessageHash
        const wallet = new ethers.Wallet(GAME_SERVER_PRIVATE_KEY);

        // 签名时不要使用signMessage（它会再次添加前缀），而是使用signDigest直接签名
        // 注意：signDigest不是异步函数，不需要await
        const signature = wallet._signingKey().signDigest(ethSignedMessageHash);

        // 将签名各部分组合为单一字符串
        const signatureString = ethers.utils.joinSignature(signature);
        console.log('生成的签名:', signatureString);

        // 验证签名是否正确
        const recoveredAddress = ethers.utils.recoverAddress(ethSignedMessageHash, signatureString);
        console.log('恢复的签名者地址:', recoveredAddress);
        console.log('游戏服务器地址:', GAME_SERVER_ADDRESS);

        if (recoveredAddress.toLowerCase() !== GAME_SERVER_ADDRESS.toLowerCase()) {
            throw new Error('签名验证失败，恢复的地址与游戏服务器地址不匹配');
        }

        // 在服务器端验证签名是否能被合约接受
        console.log('验证签名是否能被合约接受...');
        console.log('- 玩家地址:', playerAddress);
        console.log('- 游戏金币:', gameCoins);
        console.log('- 代币数量(wei):', tokenAmountInWei.toString());
        console.log('- Nonce:', nonce);
        console.log('- 合约地址:', contractAddress);
        console.log('- 签名:', signatureString);
        console.log('- 签名长度:', signatureString.length);
        console.log('- 签名者:', recoveredAddress);

        return {
            success: true,
            signature: signatureString,
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

// 生成充值签名 - 与合约完全匹配版
async function generateRechargeSignature(playerAddress, tokenAmount, gameCoins, contractAddress) {
    try {
        // 生成随机nonce
        const nonce = generateRandomNonce();

        console.log('生成充值签名...');
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

        // 创建消息哈希 - 按照合约中_verifyRechargeSignature函数的格式
        // 合约中的代码是:
        // bytes32 messageHash = keccak256(abi.encodePacked(player, tokenAmount, gameCoins, nonce, address(this), "recharge"));
        const messageHash = ethers.utils.keccak256(
            ethers.utils.solidityPack(
                ['address', 'uint256', 'uint256', 'bytes32', 'address', 'string'],
                [playerAddress, tokenAmountInWei, gameCoins, nonce, contractAddress, "recharge"]
            )
        );
        console.log('消息哈希:', messageHash);

        // 添加以太坊签名前缀
        const ethSignedMessageHash = toEthSignedMessageHash(messageHash);
        console.log('以太坊签名消息哈希:', ethSignedMessageHash);

        // 使用私钥直接签名ethSignedMessageHash
        const wallet = new ethers.Wallet(GAME_SERVER_PRIVATE_KEY);

        // 签名时不要使用signMessage（它会再次添加前缀），而是使用signDigest直接签名
        // 注意：signDigest不是异步函数，不需要await
        const signature = wallet._signingKey().signDigest(ethSignedMessageHash);

        // 将签名各部分组合为单一字符串
        const signatureString = ethers.utils.joinSignature(signature);
        console.log('生成的充值签名:', signatureString);

        // 验证签名是否正确
        const recoveredAddress = ethers.utils.recoverAddress(ethSignedMessageHash, signatureString);
        console.log('恢复的签名者地址:', recoveredAddress);
        console.log('游戏服务器地址:', GAME_SERVER_ADDRESS);

        if (recoveredAddress.toLowerCase() !== GAME_SERVER_ADDRESS.toLowerCase()) {
            throw new Error('签名验证失败，恢复的地址与游戏服务器地址不匹配');
        }

        return {
            success: true,
            signature: signatureString,
            nonce: nonce,
            signer: GAME_SERVER_ADDRESS
        };
    } catch (error) {
        console.error('生成充值签名出错:', error);
        return {
            success: false,
            error: error.message || '生成充值签名时发生错误'
        };
    }
}

// 验证签名 - 修复版
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

        // 创建消息哈希
        const messageHash = ethers.utils.keccak256(
            ethers.utils.solidityPack(
                ['address', 'uint256', 'uint256', 'bytes32', 'address'],
                [playerAddress, gameCoins, tokenAmountInWei, nonce, contractAddress]
            )
        );

        // 添加以太坊签名前缀
        const ethSignedMessageHash = toEthSignedMessageHash(messageHash);

        // 从签名恢复签名者地址
        const recoveredAddress = ethers.utils.recoverAddress(ethSignedMessageHash, signature);

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
    generateRechargeSignature,
    verifySignature,
    GAME_SERVER_ADDRESS
};
