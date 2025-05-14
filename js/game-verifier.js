/**
 * 游戏数据校验算法
 * 使用玩家钱包地址、游戏金币数量、当前时间戳和硬编码字符串生成校验码
 */
const GameVerifier = {
    // 硬编码的密钥字符串
    SECRET_KEY: 'e367e745d9f63a268b668e4bc2d800082421412412412',
    
    // 计算字符串的SHA-256哈希
    async sha256(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    // 计算HMAC
    async hmac(key, message) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(key);
        const messageData = encoder.encode(message);
        
        // 导入密钥
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        // 计算HMAC
        const signature = await crypto.subtle.sign(
            'HMAC',
            cryptoKey,
            messageData
        );
        
        // 转换为十六进制字符串
        const hashArray = Array.from(new Uint8Array(signature));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    // 混淆数据
    obfuscateData(data, seed) {
        // 简单的混淆算法
        let result = '';
        for (let i = 0; i < data.length; i++) {
            const charCode = data.charCodeAt(i);
            const seedChar = seed.charCodeAt(i % seed.length);
            result += String.fromCharCode(charCode ^ seedChar);
        }
        return btoa(result); // Base64编码
    },
    
    // 生成游戏数据校验码
    async generateVerificationCode(walletAddress, gameCoins) {
        try {
            // 1. 获取当前时间戳
            const timestamp = Date.now();
            
            // 2. 准备输入数据
            const inputData = {
                wallet: walletAddress.toLowerCase(),
                coins: gameCoins,
                time: timestamp
            };
            
            // 3. 创建数据摘要
            const dataDigest = JSON.stringify(inputData);
            
            // 4. 计算初始哈希
            const initialHash = await this.sha256(dataDigest);
            
            // 5. 添加时间因素
            const timeFactor = Math.floor(timestamp / 1000) % 10000;
            
            // 6. 添加金币因素
            const coinFactor = (gameCoins * 17) % 10000;
            
            // 7. 添加钱包因素 - 使用钱包地址的前8个字符
            const walletFactor = walletAddress.toLowerCase().substring(2, 10);
            
            // 8. 组合所有因素
            const combinedFactors = `${initialHash}:${timeFactor}:${coinFactor}:${walletFactor}`;
            
            // 9. 计算HMAC
            const hmacResult = await this.hmac(this.SECRET_KEY, combinedFactors);
            
            // 10. 混淆结果
            const obfuscatedResult = this.obfuscateData(hmacResult, this.SECRET_KEY);
            
            // 11. 添加校验和
            const checksum = await this.sha256(obfuscatedResult);
            const checksumPrefix = checksum.substring(0, 8);
            
            // 12. 构建最终校验码
            const verificationCode = `${checksumPrefix}:${obfuscatedResult}`;
            
            console.log('生成的校验码:', verificationCode);
            
            // 13. 构建完整的验证数据
            const verificationData = {
                code: verificationCode,
                wallet: walletAddress.toLowerCase(),
                coins: gameCoins,
                timestamp: timestamp
            };
            
            return verificationData;
        } catch (error) {
            console.error('生成校验码失败:', error);
            return null;
        }
    },
    
    // 验证游戏数据校验码
    async verifyCode(verificationData) {
        try {
            const { code, wallet, coins, timestamp } = verificationData;
            
            // 1. 分离校验和和混淆结果
            const [checksumPrefix, obfuscatedResult] = code.split(':');
            
            // 2. 计算校验和
            const checksum = await this.sha256(obfuscatedResult);
            const calculatedChecksumPrefix = checksum.substring(0, 8);
            
            // 3. 验证校验和
            if (checksumPrefix !== calculatedChecksumPrefix) {
                console.error('校验和验证失败');
                return false;
            }
            
            // 4. 解混淆结果
            const deobfuscatedResult = atob(obfuscatedResult);
            let hmacResult = '';
            for (let i = 0; i < deobfuscatedResult.length; i++) {
                const charCode = deobfuscatedResult.charCodeAt(i);
                const seedChar = this.SECRET_KEY.charCodeAt(i % this.SECRET_KEY.length);
                hmacResult += String.fromCharCode(charCode ^ seedChar);
            }
            
            // 5. 重新计算HMAC
            const timeFactor = Math.floor(timestamp / 1000) % 10000;
            const coinFactor = (coins * 17) % 10000;
            const walletFactor = wallet.toLowerCase().substring(2, 10);
            
            const inputData = {
                wallet: wallet.toLowerCase(),
                coins: coins,
                time: timestamp
            };
            
            const dataDigest = JSON.stringify(inputData);
            const initialHash = await this.sha256(dataDigest);
            
            const combinedFactors = `${initialHash}:${timeFactor}:${coinFactor}:${walletFactor}`;
            const calculatedHmac = await this.hmac(this.SECRET_KEY, combinedFactors);
            
            // 6. 验证HMAC
            if (hmacResult !== calculatedHmac) {
                console.error('HMAC验证失败');
                return false;
            }
            
            console.log('校验码验证成功');
            return true;
        } catch (error) {
            console.error('验证校验码失败:', error);
            return false;
        }
    }
};
