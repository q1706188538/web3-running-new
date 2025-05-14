/**
 * 游戏数据校验算法 - 后端实现
 * 使用玩家钱包地址、游戏金币数量、当前时间戳和硬编码字符串生成校验码
 */
const crypto = require('crypto');

const GameVerifier = {
    // 硬编码的密钥字符串 - 必须与前端保持一致
    SECRET_KEY: 'e367e745d9f63a268b668e4bc2d800082421412412412',
    
    // 计算字符串的SHA-256哈希
    sha256: function(str) {
        return crypto.createHash('sha256').update(str).digest('hex');
    },
    
    // 计算HMAC
    hmac: function(key, message) {
        return crypto.createHmac('sha256', key).update(message).digest('hex');
    },
    
    // 混淆数据
    obfuscateData: function(data, seed) {
        // 简单的混淆算法
        let result = '';
        for (let i = 0; i < data.length; i++) {
            const charCode = data.charCodeAt(i);
            const seedChar = seed.charCodeAt(i % seed.length);
            result += String.fromCharCode(charCode ^ seedChar);
        }
        return Buffer.from(result).toString('base64'); // Base64编码
    },
    
    // 解混淆数据
    deobfuscateData: function(obfuscatedData, seed) {
        const data = Buffer.from(obfuscatedData, 'base64').toString();
        let result = '';
        for (let i = 0; i < data.length; i++) {
            const charCode = data.charCodeAt(i);
            const seedChar = seed.charCodeAt(i % seed.length);
            result += String.fromCharCode(charCode ^ seedChar);
        }
        return result;
    },
    
    // 验证游戏数据校验码
    verifyCode: function(verificationData) {
        try {
            const { code, wallet, coins, timestamp } = verificationData;
            
            // 1. 分离校验和和混淆结果
            const [checksumPrefix, obfuscatedResult] = code.split(':');
            
            // 2. 计算校验和
            const checksum = this.sha256(obfuscatedResult);
            const calculatedChecksumPrefix = checksum.substring(0, 8);
            
            // 3. 验证校验和
            if (checksumPrefix !== calculatedChecksumPrefix) {
                console.error('校验和验证失败');
                return false;
            }
            
            // 4. 解混淆结果
            const hmacResult = this.deobfuscateData(obfuscatedResult, this.SECRET_KEY);
            
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
            const initialHash = this.sha256(dataDigest);
            
            const combinedFactors = `${initialHash}:${timeFactor}:${coinFactor}:${walletFactor}`;
            const calculatedHmac = this.hmac(this.SECRET_KEY, combinedFactors);
            
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

module.exports = GameVerifier;
