/**
 * 签名生成模块
 * 用于生成代币兑换签名
 */
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE_PATH = path.join(__dirname, 'data', 'web3-live-config.json');
const DEFAULT_GAME_SERVER_PRIVATE_KEY = '0xe367e745d9f63a268b668e4bc2d80319acb111cdb90fb37b45b23592aa443e68'; // Fallback

// 函数：获取游戏服务器凭证（私钥和地址）
function getGameServerCredentials() {
    let privateKey = DEFAULT_GAME_SERVER_PRIVATE_KEY;
    let address = new ethers.Wallet(privateKey).address; // Address from default key

    try {
        if (fs.existsSync(CONFIG_FILE_PATH)) {
            const rawConfig = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
            const liveConfig = JSON.parse(rawConfig);
            if (liveConfig && liveConfig.GAME_SERVER_PRIVATE_KEY && ethers.utils.isHexString(liveConfig.GAME_SERVER_PRIVATE_KEY, 32)) {
                privateKey = liveConfig.GAME_SERVER_PRIVATE_KEY;
                address = new ethers.Wallet(privateKey).address; // Address from live config key
                console.log('sign-exchange: Loaded GAME_SERVER_PRIVATE_KEY from web3-live-config.json');
            } else {
                console.log('sign-exchange: GAME_SERVER_PRIVATE_KEY not found or invalid in web3-live-config.json, using default.');
            }
        } else {
            console.log(`sign-exchange: ${CONFIG_FILE_PATH} not found, using default private key.`);
        }
    } catch (error) {
        console.error('sign-exchange: Error loading or parsing web3-live-config.json, using default private key:', error);
    }

    // console.log('sign-exchange: Using Game Server Address:', address); // Log address each time it's derived
    return { privateKey, address };
}

// 初始打印一次（可能使用默认值）
const initialCredentials = getGameServerCredentials();
console.log('sign-exchange: Initial Game Server Address (may use default):', initialCredentials.address);


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
async function generateExchangeSignature(playerAddress, tokenAmount, gameCoins, contractAddress, isInverse) { // 添加 isInverse 参数
    const { privateKey: currentGameServerPrivateKey, address: currentGameServerAddress } = getGameServerCredentials();
    if (!currentGameServerPrivateKey || !currentGameServerAddress) {
        console.error('sign-exchange: Critical error - could not determine game server credentials.');
        return { success: false, error: 'Server configuration error for signing credentials.' };
    }
    // console.log(`sign-exchange: Using dynamic address for exchange sig: ${currentGameServerAddress}`);

    try {
        // 生成随机nonce
        const nonce = generateRandomNonce();

        console.log('生成兑换签名...');
        console.log('玩家地址:', playerAddress);
        console.log('代币数量:', tokenAmount);
        console.log('游戏金币:', gameCoins);
        console.log('Nonce:', nonce);
        console.log('合约地址:', contractAddress);
        console.log('isInverse:', isInverse); // 记录 isInverse

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
        // tokenAmount 参数已经是从 server.js 传递过来的 wei 单位的 BigNumber
        // 无需再次使用 parseEther，直接使用即可
        const tokenAmountInWei = tokenAmount;
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
        console.log('- isInverse:', isInverse, '(类型:', typeof isInverse, ')'); // 记录 isInverse

        // 确保gameCoins是数字类型
        const gameCoinsNumber = Number(gameCoins);

        // 确保所有参数都是正确的格式
        // 1. 地址使用原始大小写形式 (通常是校验和地址)
        // const playerAddressLower = playerAddress.toLowerCase(); // 不再转换为小写
        // const contractAddressLower = contractAddress.toLowerCase(); // 不再转换为小写

        // 2. 确保nonce是正确的格式（bytes32）
        // 如果nonce不是0x开头，添加0x前缀
        let nonceFormatted = nonce;
        if (!nonceFormatted.startsWith('0x')) {
            nonceFormatted = '0x' + nonceFormatted;
        }

        // 3. 确保tokenAmountInWei是BigNumber
        // 已经在前面转换为BigNumber了

        console.log('用于打包的参数:');
        console.log('- playerAddress:', playerAddress); // 使用原始 playerAddress
        console.log('- gameCoinsNumber:', gameCoinsNumber);
        console.log('- tokenAmountInWei:', tokenAmountInWei.toString());
        console.log('- nonceFormatted:', nonceFormatted);
        console.log('- contractAddress:', contractAddress); // 使用原始 contractAddress
        console.log('- isInverse (for packing):', isInverse); // isInverse 已经是布尔值

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
        console.log('参数的十六进制表示 (用于调试，非直接打包内容):');
        console.log('- playerAddress (raw):', playerAddress); // ethers.utils.hexlify(ethers.utils.arrayify(playerAddress))
        console.log('- gameCoins (raw):', gameCoinsNumber); // ethers.utils.hexlify(ethers.utils.arrayify(ethers.utils.hexZeroPad(ethers.utils.hexlify(gameCoinsNumber), 32)))
        console.log('- tokenAmount (raw):', tokenAmountInWei.toString()); // ethers.utils.hexlify(ethers.utils.arrayify(tokenAmountInWei))
        console.log('- nonce (raw):', nonceFormatted); // ethers.utils.hexlify(ethers.utils.arrayify(nonceFormatted))
        console.log('- contractAddress (raw):', contractAddress); // ethers.utils.hexlify(ethers.utils.arrayify(contractAddress))

        // 确保所有参数都是正确的格式
        // const gameCoinsBigNum = ethers.BigNumber.from(gameCoinsNumber); // 将 gameCoins 也转为 BigNumber
        // console.log('BigNumber gameCoins:', gameCoinsBigNum.toString()); // 调试日志
        // 为了与 generateRechargeSignature 行为一致，直接使用 gameCoinsNumber (或原始 gameCoins)
        // ethers.js solidityPack 应该能处理数字类型的 uint256

        const messageHash = ethers.utils.keccak256(
            ethers.utils.solidityPack(
                // 合约: keccak256(abi.encodePacked(player, gameCoins, tokenAmount, nonce, address(this)))
                ['address', 'uint256', 'uint256', 'bytes32', 'address'], // 移除了 'bool' for isInverse
                [playerAddress, gameCoinsNumber, tokenAmountInWei, nonceFormatted, contractAddress] // 移除了 isInverse, 调整了 gameCoins 和 tokenAmount 的顺序
            )
        );

        console.log('--- Parameters for solidityPack (Corrected for Exchange) ---');
        console.log('playerAddress (packed):', playerAddress, '(type:', typeof playerAddress, ')');
        console.log('gameCoins (packed as number):', gameCoinsNumber, '(type:', typeof gameCoinsNumber, ')');
        console.log('tokenAmountInWei (packed):', tokenAmountInWei.toString(), '(type: BigNumber)');
        console.log('nonceFormatted (packed):', nonceFormatted, '(type:', typeof nonceFormatted, ')');
        console.log('contractAddress (packed):', contractAddress, '(type:', typeof contractAddress, ')');
        // console.log('isInverse (NOT packed):', isInverse); // isInverse 不再参与哈希
        console.log('--- End Parameters for solidityPack ---');
        console.log('消息哈希:', messageHash);

        // 2. 添加以太坊签名前缀 - 与合约的toEthSignedMessageHash等效
        const ethSignedMessageHash = toEthSignedMessageHash(messageHash);
        console.log('以太坊签名消息哈希:', ethSignedMessageHash);

        // 3. 使用私钥直接签名ethSignedMessageHash
        const wallet = new ethers.Wallet(currentGameServerPrivateKey);

        // 签名时不要使用signMessage（它会再次添加前缀），而是使用signDigest直接签名
        // 注意：signDigest不是异步函数，不需要await
        const signature = wallet._signingKey().signDigest(ethSignedMessageHash);

        // 将签名各部分组合为单一字符串
        const signatureString = ethers.utils.joinSignature(signature);
        console.log('生成的签名:', signatureString);

        // 验证签名是否正确
        const recoveredAddress = ethers.utils.recoverAddress(ethSignedMessageHash, signatureString);
        console.log('恢复的签名者地址:', recoveredAddress);
        console.log('当前游戏服务器地址:', currentGameServerAddress);

        if (recoveredAddress.toLowerCase() !== currentGameServerAddress.toLowerCase()) {
            throw new Error('签名验证失败，恢复的地址与当前游戏服务器地址不匹配');
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
            signer: currentGameServerAddress
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
async function generateRechargeSignature(playerAddress, tokenAmount, gameCoins, contractAddress, isInverse) {
    const { privateKey: currentGameServerPrivateKey, address: currentGameServerAddress } = getGameServerCredentials();
    if (!currentGameServerPrivateKey || !currentGameServerAddress) {
        console.error('sign-exchange: Critical error - could not determine game server credentials for recharge.');
        return { success: false, error: 'Server configuration error for signing credentials.' };
    }
    // console.log(`sign-exchange: Using dynamic address for recharge sig: ${currentGameServerAddress}`);

    try {
        // 生成随机nonce
        const nonce = generateRandomNonce();

        console.log('生成充值签名...');
        console.log('玩家地址:', playerAddress);
        console.log('代币数量:', tokenAmount);
        console.log('游戏金币:', gameCoins);
        console.log('Nonce:', nonce);
        console.log('合约地址:', contractAddress);
        console.log('isInverse:', isInverse); // 记录 isInverse 参数

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

        const gameCoinsNumber = Number(gameCoins);
        if (isNaN(gameCoinsNumber) || gameCoinsNumber <= 0) { // 确保转换后仍然有效
            throw new Error(`无效的游戏金币数量 (转换后或值无效): ${gameCoins}`);
        }

        // 将代币数量转换为wei单位
        const tokenAmountInWei = ethers.utils.parseEther(tokenAmount.toString());
        console.log('代币数量(wei):', tokenAmountInWei.toString());

        // 创建消息哈希 - 按照合约中_verifyRechargeSignature函数的格式
        // 合约中的代码是:
        // bytes32 messageHash = keccak256(abi.encodePacked(player, tokenAmount, gameCoins, nonce, address(this), "recharge"));

        // 创建消息哈希 - 按照合约中_verifyRechargeSignature函数的格式
        // 合约中的代码是:
        // bytes32 messageHash = keccak256(abi.encodePacked(player, tokenAmount, gameCoins, nonce, address(this), "recharge"));

        // 打印所有参数，以便调试
        console.log('生成签名的参数:');
        console.log('- player:', playerAddress);
        console.log('- tokenAmount:', tokenAmountInWei.toString());
        console.log('- gameCoins:', gameCoinsNumber);
        console.log('- nonce:', nonce);
        console.log('- contractAddress:', contractAddress);
        console.log('- "recharge"');

        const packedDataForRecharge = ethers.utils.solidityPack(
            ['address', 'uint256', 'uint256', 'bytes32', 'address', 'string'],
            [playerAddress, tokenAmountInWei, gameCoinsNumber, nonce, contractAddress, "recharge"]
        );
        console.log('Packed data for recharge (server-side, before keccak256):', packedDataForRecharge);
        const messageHash = ethers.utils.keccak256(packedDataForRecharge);
        console.log('消息哈希:', messageHash);

        // 添加以太坊签名前缀
        const ethSignedMessageHash = toEthSignedMessageHash(messageHash);
        console.log('以太坊签名消息哈希:', ethSignedMessageHash);

        // 使用私钥直接签名ethSignedMessageHash
        const wallet = new ethers.Wallet(currentGameServerPrivateKey);
        console.log('当前游戏服务器地址:', currentGameServerAddress);
        console.log('当前游戏服务器私钥(前10位):', currentGameServerPrivateKey.substring(0, 10) + '...');

        // 签名时不要使用signMessage（它会再次添加前缀），而是使用signDigest直接签名
        // 注意：signDigest不是异步函数，不需要await
        const signature = wallet._signingKey().signDigest(ethSignedMessageHash);
        console.log('签名对象:', {
            r: signature.r,
            s: signature.s,
            v: signature.v
        });

        // 将签名各部分组合为单一字符串
        const signatureString = ethers.utils.joinSignature(signature);
        console.log('生成的充值签名:', signatureString);
        console.log('签名长度:', signatureString.length);
        console.log('签名r:', signatureString.slice(2, 66));
        console.log('签名s:', signatureString.slice(66, 130));
        console.log('签名v:', signatureString.slice(130, 132));

        // 验证签名是否正确
        const recoveredAddress = ethers.utils.recoverAddress(ethSignedMessageHash, signatureString);
        console.log('恢复的签名者地址:', recoveredAddress);
        console.log('当前游戏服务器地址:', currentGameServerAddress);

        if (recoveredAddress.toLowerCase() !== currentGameServerAddress.toLowerCase()) {
            throw new Error('签名验证失败，恢复的地址与当前游戏服务器地址不匹配');
        }

        // 添加调试日志，打印出合约验证签名所需的所有参数
        console.log('合约验证签名所需的参数:');
        console.log('- player:', playerAddress);
        console.log('- tokenAmount (wei):', tokenAmountInWei.toString());
        console.log('- gameCoins:', gameCoinsNumber);
        console.log('- nonce:', nonce);
        console.log('- contractAddress:', contractAddress);
        console.log('- isInverse:', !!isInverse);
        console.log('- signature:', signatureString);

        // 在服务器端验证签名是否能被合约接受
        console.log('验证签名是否能被合约接受...');
        const verifyResult = await verifySignature(
            playerAddress,
            tokenAmount,
            gameCoins,
            nonce,
            contractAddress,
            signatureString,
            isInverse
        );

        if (!verifyResult.success) {
            console.error('服务器端验证签名失败:', verifyResult);
            throw new Error('服务器端验证签名失败: ' + (verifyResult.error || '未知错误'));
        }

        console.log('服务器端验证签名成功');

        return {
            success: true,
            signature: signatureString,
            nonce: nonce,
            signer: currentGameServerAddress,
            isInverse: !!isInverse // 返回 isInverse 参数
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
async function verifySignature(playerAddress, tokenAmount, gameCoins, nonce, contractAddress, signature, isInverse) { // 添加 isInverse
    const { address: currentGameServerAddress } = getGameServerCredentials(); // Only need address for verification
    if (!currentGameServerAddress) {
        console.error('sign-exchange: Critical error - could not determine game server address for verification.');
        return { success: false, error: 'Server configuration error for signing credentials.', isValid: false };
    }

    try {
        console.log('验证签名...');
        console.log('玩家地址:', playerAddress);
        console.log('代币数量:', tokenAmount);
        console.log('游戏金币:', gameCoins);
        console.log('Nonce:', nonce);
        console.log('合约地址:', contractAddress);
        console.log('签名:', signature);
        console.log('isInverse (for verify):', isInverse); // 记录 isInverse

        // 将代币数量转换为wei单位
        const tokenAmountInWei = ethers.utils.parseEther(tokenAmount.toString());
        const gameCoinsNumber = Number(gameCoins);

        // 创建消息哈希 - 确保与生成签名时使用相同的格式
        // 对于充值签名验证，使用与 generateRechargeSignature 相同的格式
        // 合约中的代码是:
        // bytes32 messageHash = keccak256(abi.encodePacked(player, tokenAmount, gameCoins, nonce, address(this), "recharge"));

        // 打印所有参数，以便调试
        console.log('验证签名的参数:');
        console.log('- player:', playerAddress);
        console.log('- tokenAmount:', tokenAmountInWei.toString());
        console.log('- gameCoins:', gameCoinsNumber);
        console.log('- nonce:', nonce);
        console.log('- contractAddress:', contractAddress);
        console.log('- "recharge"');

        const packedData = ethers.utils.solidityPack(
            ['address', 'uint256', 'uint256', 'bytes32', 'address', 'string'],
            [playerAddress, tokenAmountInWei, gameCoinsNumber, nonce, contractAddress, "recharge"]
        );
        console.log('Packed data for verification:', packedData);

        const messageHash = ethers.utils.keccak256(packedData);
        console.log('验证用消息哈希:', messageHash);

        // 添加以太坊签名前缀
        const ethSignedMessageHash = toEthSignedMessageHash(messageHash);
        console.log('验证用以太坊签名消息哈希:', ethSignedMessageHash);

        // 从签名恢复签名者地址
        console.log('签名长度:', signature.length);
        console.log('签名r:', signature.slice(2, 66));
        console.log('签名s:', signature.slice(66, 130));
        console.log('签名v:', signature.slice(130, 132));

        const recoveredAddress = ethers.utils.recoverAddress(ethSignedMessageHash, signature);

        console.log('恢复的签名者地址:', recoveredAddress);
        console.log('当前游戏服务器地址:', currentGameServerAddress);

        // 验证签名者是否为游戏服务器
        const isValid = recoveredAddress.toLowerCase() === currentGameServerAddress.toLowerCase();

        // 如果验证失败，尝试使用相反的 isInverse 值再次验证
        if (!isValid) {
            console.log('使用相反的 isInverse 值尝试验证...');
            const oppositeIsInverse = !isInverse;
            console.log('尝试使用 isInverse:', oppositeIsInverse);

            const packedDataOpposite = ethers.utils.solidityPack(
                ['address', 'uint256', 'uint256', 'bytes32', 'address', 'string', 'bool'],
                [playerAddress, tokenAmountInWei, gameCoinsNumber, nonce, contractAddress, "recharge", oppositeIsInverse]
            );

            const messageHashOpposite = ethers.utils.keccak256(packedDataOpposite);
            const ethSignedMessageHashOpposite = toEthSignedMessageHash(messageHashOpposite);
            const recoveredAddressOpposite = ethers.utils.recoverAddress(ethSignedMessageHashOpposite, signature);

            console.log('使用相反 isInverse 恢复的签名者地址:', recoveredAddressOpposite);

            const isValidOpposite = recoveredAddressOpposite.toLowerCase() === currentGameServerAddress.toLowerCase();

            if (isValidOpposite) {
                console.log('使用相反的 isInverse 值验证成功!');
                return {
                    success: true,
                    recoveredAddress: recoveredAddressOpposite,
                    isValid: true,
                    correctIsInverse: oppositeIsInverse
                };
            }
        }

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
    verifySignature
    // GAME_SERVER_ADDRESS is no longer static, so not exporting it directly.
    // If needed externally, a function to get the current address could be exposed.
};
