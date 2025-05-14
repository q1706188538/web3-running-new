// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// OpenZeppelin Contracts v4.4.1 (utils/Context.sol)
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

// OpenZeppelin Contracts (last updated v4.6.0) (access/Ownable.sol)
abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(_msgSender());
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// OpenZeppelin Contracts (last updated v4.8.0) (security/ReentrancyGuard.sol)
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
    }

    function _nonReentrantAfter() private {
        _status = _NOT_ENTERED;
    }
}

// OpenZeppelin Contracts (last updated v4.9.0) (utils/cryptography/ECDSA.sol)
library ECDSA {
    enum RecoverError {
        NoError,
        InvalidSignature,
        InvalidSignatureLength,
        InvalidSignatureS,
        InvalidSignatureV
    }

    function _throwError(RecoverError error) private pure {
        if (error == RecoverError.NoError) {
            return;
        } else if (error == RecoverError.InvalidSignature) {
            revert("ECDSA: invalid signature");
        } else if (error == RecoverError.InvalidSignatureLength) {
            revert("ECDSA: invalid signature length");
        } else if (error == RecoverError.InvalidSignatureS) {
            revert("ECDSA: invalid signature 's' value");
        } else if (error == RecoverError.InvalidSignatureV) {
            revert("ECDSA: invalid signature 'v' value");
        }
    }

    function tryRecover(bytes32 hash, bytes memory signature) internal pure returns (address, RecoverError) {
        if (signature.length == 65) {
            bytes32 r;
            bytes32 s;
            uint8 v;
            assembly {
                r := mload(add(signature, 0x20))
                s := mload(add(signature, 0x40))
                v := byte(0, mload(add(signature, 0x60)))
            }
            return tryRecover(hash, v, r, s);
        } else if (signature.length == 64) {
            bytes32 r;
            bytes32 vs;
            assembly {
                r := mload(add(signature, 0x20))
                vs := mload(add(signature, 0x40))
            }
            return tryRecover(hash, r, vs);
        } else {
            return (address(0), RecoverError.InvalidSignatureLength);
        }
    }

    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        (address recovered, RecoverError error) = tryRecover(hash, signature);
        _throwError(error);
        return recovered;
    }

    function tryRecover(bytes32 hash, bytes32 r, bytes32 vs) internal pure returns (address, RecoverError) {
        bytes32 s = vs & bytes32(0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
        uint8 v = uint8((uint256(vs) >> 255) + 27);
        return tryRecover(hash, v, r, s);
    }

    function recover(bytes32 hash, bytes32 r, bytes32 vs) internal pure returns (address) {
        (address recovered, RecoverError error) = tryRecover(hash, r, vs);
        _throwError(error);
        return recovered;
    }

    function tryRecover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) internal pure returns (address, RecoverError) {
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            return (address(0), RecoverError.InvalidSignatureS);
        }
        if (v != 27 && v != 28) {
            return (address(0), RecoverError.InvalidSignatureV);
        }

        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0)) {
            return (address(0), RecoverError.InvalidSignature);
        }

        return (signer, RecoverError.NoError);
    }

    function recover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) internal pure returns (address) {
        (address recovered, RecoverError error) = tryRecover(hash, v, r, s);
        _throwError(error);
        return recovered;
    }

    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function toEthSignedMessageHash(bytes memory s) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n", Strings.toString(s.length), s));
    }

    function toTypedDataHash(bytes32 domainSeparator, bytes32 structHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }
}

// OpenZeppelin Contracts (last updated v4.9.0) (utils/Strings.sol)
library Strings {
    bytes16 private constant _SYMBOLS = "0123456789abcdef";
    uint8 private constant _ADDRESS_LENGTH = 20;

    function toString(uint256 value) internal pure returns (string memory) {
        unchecked {
            uint256 length = Math.log10(value) + 1;
            string memory buffer = new string(length);
            uint256 ptr;
            assembly {
                ptr := add(buffer, add(32, length))
            }
            while (true) {
                ptr--;
                assembly {
                    mstore8(ptr, byte(mod(value, 10), _SYMBOLS))
                }
                value /= 10;
                if (value == 0) break;
            }
            return buffer;
        }
    }

    function toHexString(uint256 value) internal pure returns (string memory) {
        unchecked {
            return toHexString(value, Math.log256(value) + 1);
        }
    }

    function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * length + 2);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 2 * length + 1; i > 1; --i) {
            buffer[i] = _SYMBOLS[value & 0xf];
            value >>= 4;
        }
        require(value == 0, "Strings: hex length insufficient");
        return string(buffer);
    }

    function toHexString(address addr) internal pure returns (string memory) {
        return toHexString(uint256(uint160(addr)), _ADDRESS_LENGTH);
    }
}

// OpenZeppelin Contracts (last updated v4.9.0) (utils/math/Math.sol)
library Math {
    enum Rounding {
        Down, // Toward negative infinity
        Up, // Toward infinity
        Zero // Toward zero
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function average(uint256 a, uint256 b) internal pure returns (uint256) {
        // (a + b) / 2 can overflow.
        return (a & b) + (a ^ b) / 2;
    }

    function ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        // (a + b - 1) / b can overflow on addition, so we distribute.
        return a == 0 ? 0 : (a - 1) / b + 1;
    }

    function mulDiv(uint256 x, uint256 y, uint256 denominator) internal pure returns (uint256 result) {
        unchecked {
            uint256 prod0;
            uint256 prod1;
            assembly {
                let mm := mulmod(x, y, not(0))
                prod0 := mul(x, y)
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }

            if (prod1 == 0) {
                return prod0 / denominator;
            }

            require(denominator > prod1, "Math: mulDiv overflow");

            uint256 remainder;
            assembly {
                remainder := mulmod(x, y, denominator)
            }
            return prod0 / denominator;
        }
    }

    function mulDiv(uint256 x, uint256 y, uint256 denominator, Rounding rounding) internal pure returns (uint256) {
        uint256 result = mulDiv(x, y, denominator);
        if (rounding == Rounding.Up && mulmod(x, y, denominator) > 0) {
            result += 1;
        }
        return result;
    }

    function log10(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            if (value >= 10 ** 64) {
                value /= 10 ** 64;
                result += 64;
            }
            if (value >= 10 ** 32) {
                value /= 10 ** 32;
                result += 32;
            }
            if (value >= 10 ** 16) {
                value /= 10 ** 16;
                result += 16;
            }
            if (value >= 10 ** 8) {
                value /= 10 ** 8;
                result += 8;
            }
            if (value >= 10 ** 4) {
                value /= 10 ** 4;
                result += 4;
            }
            if (value >= 10 ** 2) {
                value /= 10 ** 2;
                result += 2;
            }
            if (value >= 10 ** 1) {
                result += 1;
            }
        }
        return result;
    }

    function log256(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            if (value >> 128 > 0) {
                value >>= 128;
                result += 16;
            }
            if (value >> 64 > 0) {
                value >>= 64;
                result += 8;
            }
            if (value >> 32 > 0) {
                value >>= 32;
                result += 4;
            }
            if (value >> 16 > 0) {
                value >>= 16;
                result += 2;
            }
            if (value >> 8 > 0) {
                value >>= 8;
                result += 1;
            }
        }
        return result;
    }
}

// OpenZeppelin Contracts (last updated v4.9.0) (token/ERC20/IERC20.sol)
interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

/**
 * @title GameTokenBridge
 * @dev 此合约作为外部ERC20代币与游戏金币之间的桥梁，支持税收和签名验证。
 *
 * 工作流程:
 * 1. 合约所有者(部署者)需要持有足够的外部代币用于兑换功能
 * 2. 合约所有者需要授权此合约使用其代币(approve)
 * 3. 玩家可以用游戏金币兑换代币(exchangeFromGame)
 * 4. 玩家可以用代币充值游戏金币(rechargeToGame)
 */
contract GameTokenBridge is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    IERC20 public immutable externalToken; // 外部ERC20代币合约地址
    uint8 public immutable externalTokenDecimals; // 外部ERC20代币的小数位数
    string public externalTokenSymbol; // 外部ERC20代币的符号

    address public gameServerAddress;
    uint256 public exchangeRate = 100; // 1个外部代币 = exchangeRate个游戏金币 (需要根据外部代币的decimals调整)

    uint256 public exchangeTokenTaxRate = 200; // 金币兑换代币的税率 (基点, 200 = 2%)
    uint256 public rechargeTokenTaxRate = 100; // 代币充值金币的税率 (基点, 100 = 1%)
    address public taxWallet;

    uint256 public minExchangeAmount; // 最小金币兑换代币数量 (以外部代币的最小单位表示)
    uint256 public maxExchangeAmount; // 最大金币兑换代币数量 (以外部代币的最小单位表示)

    mapping(address => bool) public operators;
    mapping(bytes32 => bool) public usedNonces;

    // 事件
    event ExchangeFromGame(address indexed player, uint256 gameCoins, uint256 tokenAmount, uint256 taxAmount);
    event RechargeToGame(address indexed player, uint256 tokenAmount, uint256 gameCoins, uint256 taxAmount);
    event OperatorSet(address indexed operator, bool status);
    event ExchangeRateUpdated(uint256 newRate);
    event ExchangeTokenTaxRateUpdated(uint256 newTaxRate);
    event RechargeTokenTaxRateUpdated(uint256 newTaxRate);
    event TaxWalletUpdated(address newTaxWallet);
    event ExchangeLimitsUpdated(uint256 minAmount, uint256 maxAmount);
    event GameServerAddressUpdated(address newAddress);
    event ExternalTokenSet(address indexed tokenAddress, uint8 decimals, string symbol);
    event EmergencyWithdrawal(address indexed token, address indexed to, uint256 amount);

    /**
     * @dev 构造函数
     * @param _externalTokenAddress 外部ERC20代币合约地址
     * @param _gameServerAddress 游戏服务器地址
     * @param _taxWallet 税收钱包地址
     * @param _initialExchangeRate 初始兑换比例
     * @param _initialMinExchange 最小兑换金额 (以外部代币的最小单位表示)
     * @param _initialMaxExchange 最大兑换金额 (以外部代币的最小单位表示)
     */
    constructor(
        address _externalTokenAddress,
        address _gameServerAddress,
        address _taxWallet,
        uint256 _initialExchangeRate,
        uint256 _initialMinExchange,
        uint256 _initialMaxExchange
    ) {
        require(_externalTokenAddress != address(0), "GameTokenBridge: invalid external token address");
        require(_gameServerAddress != address(0), "GameTokenBridge: invalid game server address");
        require(_taxWallet != address(0), "GameTokenBridge: invalid tax wallet address");
        require(_initialExchangeRate > 0, "GameTokenBridge: exchange rate must be positive");
        require(_initialMinExchange > 0, "GameTokenBridge: min exchange must be positive");
        require(_initialMaxExchange >= _initialMinExchange, "GameTokenBridge: max must be >= min");

        externalToken = IERC20(_externalTokenAddress);
        externalTokenDecimals = IERC20Metadata(_externalTokenAddress).decimals();
        externalTokenSymbol = IERC20Metadata(_externalTokenAddress).symbol();

        gameServerAddress = _gameServerAddress;
        taxWallet = _taxWallet;
        exchangeRate = _initialExchangeRate;
        minExchangeAmount = _initialMinExchange;
        maxExchangeAmount = _initialMaxExchange;

        operators[_gameServerAddress] = true; // 默认游戏服务器为操作员

        emit ExternalTokenSet(_externalTokenAddress, externalTokenDecimals, externalTokenSymbol);
        emit GameServerAddressUpdated(_gameServerAddress);
        emit TaxWalletUpdated(_taxWallet);
        emit ExchangeRateUpdated(_initialExchangeRate);
        emit ExchangeLimitsUpdated(_initialMinExchange, _initialMaxExchange);
        emit OperatorSet(_gameServerAddress, true);
        emit ExchangeTokenTaxRateUpdated(exchangeTokenTaxRate);
        emit RechargeTokenTaxRateUpdated(rechargeTokenTaxRate);
    }

    // --- 管理函数 ---

    /**
     * @dev 设置游戏服务器地址
     * @param _newGameServerAddress 新的游戏服务器地址
     */
    function setGameServerAddress(address _newGameServerAddress) external onlyOwner {
        require(_newGameServerAddress != address(0), "GameTokenBridge: invalid game server address");
        gameServerAddress = _newGameServerAddress;
        emit GameServerAddressUpdated(_newGameServerAddress);
    }

    /**
     * @dev 设置税收钱包地址
     * @param _newTaxWallet 新的税收钱包地址
     */
    function setTaxWallet(address _newTaxWallet) external onlyOwner {
        require(_newTaxWallet != address(0), "GameTokenBridge: invalid tax wallet address");
        taxWallet = _newTaxWallet;
        emit TaxWalletUpdated(_newTaxWallet);
    }

    /**
     * @dev 设置金币兑换代币的税率
     * @param _newRate 新的税率 (基点, 100 = 1%)
     */
    function setExchangeTokenTaxRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= 500, "GameTokenBridge: tax rate too high (max 5%)"); // Max 5%
        exchangeTokenTaxRate = _newRate;
        emit ExchangeTokenTaxRateUpdated(_newRate);
    }

    /**
     * @dev 设置代币充值金币的税率
     * @param _newRate 新的税率 (基点, 100 = 1%)
     */
    function setRechargeTokenTaxRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= 500, "GameTokenBridge: tax rate too high (max 5%)"); // Max 5%
        rechargeTokenTaxRate = _newRate;
        emit RechargeTokenTaxRateUpdated(_newRate);
    }

    /**
     * @dev 设置兑换比例
     * @param _newRate 新的兑换比例 (1个外部代币 = _newRate个游戏金币)
     */
    function setExchangeRate(uint256 _newRate) external onlyOwner {
        require(_newRate > 0, "GameTokenBridge: exchange rate must be positive");
        exchangeRate = _newRate;
        emit ExchangeRateUpdated(_newRate);
    }

    /**
     * @dev 设置兑换限制
     * @param _min 最小兑换金额 (以外部代币的最小单位表示)
     * @param _max 最大兑换金额 (以外部代币的最小单位表示)
     */
    function setExchangeLimits(uint256 _min, uint256 _max) external onlyOwner {
        require(_min > 0, "GameTokenBridge: min amount must be positive");
        require(_max >= _min, "GameTokenBridge: max amount must be >= min amount");
        minExchangeAmount = _min;
        maxExchangeAmount = _max;
        emit ExchangeLimitsUpdated(_min, _max);
    }

    /**
     * @dev 设置操作员权限
     * @param _operator 操作员地址
     * @param _status 权限状态 (true = 授权, false = 撤销)
     */
    function setOperator(address _operator, bool _status) external onlyOwner {
        require(_operator != address(0), "GameTokenBridge: invalid operator address");
        operators[_operator] = _status;
        emit OperatorSet(_operator, _status);
    }

    /**
     * @dev 检查地址是否为操作员
     * @param _operator 要检查的地址
     * @return 是否为操作员
     */
    function isOperator(address _operator) public view returns (bool) {
        return operators[_operator];
    }

    /**
     * @dev 检查nonce是否已使用
     * @param _nonce 要检查的nonce
     * @return 是否已使用
     */
    function isNonceUsed(bytes32 _nonce) public view returns (bool) {
        return usedNonces[_nonce];
    }

    /**
     * @dev 获取合约所有者的代币余额
     * @return 合约所有者的代币余额
     */
    function getOwnerTokenBalance() public view returns (uint256) {
        return externalToken.balanceOf(owner());
    }

    /**
     * @dev 获取合约所有者对此合约的授权金额
     * @return 合约所有者对此合约的授权金额
     */
    function getOwnerAllowance() public view returns (uint256) {
        return externalToken.allowance(owner(), address(this));
    }

    /**
     * @dev 获取外部代币信息
     * @return tokenAddress 代币合约地址
     * @return tokenSymbol 代币符号
     * @return tokenDecimals 代币小数位数
     */
    function getExternalTokenInfo() public view returns (address tokenAddress, string memory tokenSymbol, uint8 tokenDecimals) {
        return (address(externalToken), externalTokenSymbol, externalTokenDecimals);
    }

    // --- 核心逻辑 ---

    /**
     * @dev 游戏金币兑换外部代币
     * 要求: 合约所有者(owner)已对此合约地址approve了足够的外部代币
     *
     * @param player 玩家地址
     * @param gameCoins 游戏金币数量
     * @param tokenAmount 期望获得的外部代币数量 (最小单位)
     * @param nonce 随机数 (防重放)
     * @param signature 游戏服务器签名
     * @return 是否成功
     */
    // 辅助函数：验证签名
    function _verifyExchangeSignature(
        address player,
        uint256 gameCoins,
        uint256 tokenAmount,
        bytes32 nonce,
        bytes memory signature
    ) private view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(player, gameCoins, tokenAmount, nonce, address(this)));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        return signer == gameServerAddress;
    }

    // 辅助函数：检查所有者余额和授权
    function _checkOwnerBalanceAndAllowance(uint256 amount) private view {
        uint256 ownerBalance = externalToken.balanceOf(owner());
        uint256 ownerAllowance = externalToken.allowance(owner(), address(this));
        require(ownerBalance >= amount, "GameTokenBridge: insufficient owner token balance");
        require(ownerAllowance >= amount, "GameTokenBridge: insufficient owner token allowance");
    }

    // 辅助函数：执行代币转账
    function _transferTokens(address from, address to, uint256 amount) private {
        externalToken.transferFrom(from, to, amount);
    }

    function exchangeFromGame(
        address player,
        uint256 gameCoins,
        uint256 tokenAmount,
        bytes32 nonce,
        bytes memory signature
    ) public nonReentrant returns (bool) {
        require(player != address(0), "GameTokenBridge: invalid player address");
        require(tokenAmount >= minExchangeAmount, "GameTokenBridge: amount below minimum");
        require(tokenAmount <= maxExchangeAmount, "GameTokenBridge: amount exceeds maximum");
        require(!usedNonces[nonce], "GameTokenBridge: nonce already used");

        // 根据外部代币的decimals计算预期的游戏金币
        uint256 expectedGameCoins = tokenAmount * exchangeRate / (10**uint256(externalTokenDecimals));
        require(gameCoins >= expectedGameCoins, "GameTokenBridge: insufficient game coins for requested token amount");

        // 验证签名
        require(_verifyExchangeSignature(player, gameCoins, tokenAmount, nonce, signature),
                "GameTokenBridge: invalid signature");

        // 检查合约所有者的代币余额和授权
        _checkOwnerBalanceAndAllowance(tokenAmount);

        usedNonces[nonce] = true;

        uint256 tax = tokenAmount * exchangeTokenTaxRate / 10000;
        uint256 amountToPlayer = tokenAmount - tax;

        // 合约所有者(owner)的外部代币 -> 玩家
        _transferTokens(owner(), player, amountToPlayer);

        if (tax > 0) {
            // 合约所有者(owner)的外部代币 -> 税收钱包
            _transferTokens(owner(), taxWallet, tax);
        }

        emit ExchangeFromGame(player, gameCoins, amountToPlayer, tax);
        return true;
    }

    /**
     * @dev 外部代币充值游戏金币
     * 要求: 玩家(msg.sender)已对此合约地址approve了足够的外部代币
     *
     * @param gameCoins 期望获得的游戏金币数量
     * @param tokenAmount 支付的外部代币数量 (最小单位)
     * @param nonce 随机数 (防重放)
     * @param signature 游戏服务器签名
     * @return 是否成功
     */
    // 辅助函数：验证充值签名
    function _verifyRechargeSignature(
        address player,
        uint256 tokenAmount,
        uint256 gameCoins,
        bytes32 nonce,
        bytes memory signature
    ) private view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(player, tokenAmount, gameCoins, nonce, address(this), "recharge"));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        return signer == gameServerAddress;
    }

    // 辅助函数：检查玩家余额和授权
    function _checkPlayerBalanceAndAllowance(address player, uint256 amount) private view {
        uint256 playerBalance = externalToken.balanceOf(player);
        uint256 playerAllowance = externalToken.allowance(player, address(this));
        require(playerBalance >= amount, "GameTokenBridge: insufficient player token balance");
        require(playerAllowance >= amount, "GameTokenBridge: insufficient player token allowance");
    }

    function rechargeToGame(
        uint256 gameCoins,
        uint256 tokenAmount,
        bytes32 nonce,
        bytes memory signature
    ) public nonReentrant returns (bool) {
        address player = _msgSender(); // msg.sender is the player
        require(tokenAmount > 0, "GameTokenBridge: token amount must be positive");
        require(!usedNonces[nonce], "GameTokenBridge: nonce already used");

        // 检查玩家的代币余额和授权
        _checkPlayerBalanceAndAllowance(player, tokenAmount);

        // 签名验证 (gameCoins是服务器确认要给玩家的数量)
        require(_verifyRechargeSignature(player, tokenAmount, gameCoins, nonce, signature),
                "GameTokenBridge: invalid signature");

        usedNonces[nonce] = true;

        uint256 tax = tokenAmount * rechargeTokenTaxRate / 10000;
        uint256 amountToOwner = tokenAmount - tax;

        // 玩家的外部代币 -> 合约所有者(owner)
        _transferTokens(player, owner(), amountToOwner);

        if (tax > 0) {
            // 玩家的外部代币 -> 税收钱包
            _transferTokens(player, taxWallet, tax);
        }

        emit RechargeToGame(player, tokenAmount, gameCoins, tax);
        return true;
    }

    /**
     * @dev 紧急提取合约所有者的代币
     * 此函数用于紧急情况下，将合约所有者的代币转移到指定地址
     * 注意：此函数不会转移合约自身持有的代币，因为合约通常不会持有代币
     *
     * @param _to 接收代币的地址
     * @param _amount 提取金额
     */
    function emergencyWithdrawOwnerTokens(address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "GameTokenBridge: invalid recipient address");
        require(_amount > 0, "GameTokenBridge: amount must be positive");

        // 检查合约所有者的代币余额
        uint256 ownerBalance = externalToken.balanceOf(owner());
        require(ownerBalance >= _amount, "GameTokenBridge: insufficient owner token balance");

        // 直接从合约所有者转移代币到指定地址
        // 注意：这需要合约所有者直接调用代币合约的transfer方法
        // 此函数只是为了提供一个便捷的接口
        bool success = externalToken.transferFrom(owner(), _to, _amount);
        require(success, "GameTokenBridge: token transfer failed");

        emit EmergencyWithdrawal(address(externalToken), _to, _amount);
    }

    /**
     * @dev 提取意外发送到合约的ETH（仅限所有者）
     */
    function withdrawAccidentalEther() external onlyOwner {
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            (bool success, ) = owner().call{value: ethBalance}("");
            require(success, "GameTokenBridge: Ether transfer failed");
        }
    }

    /**
     * @dev 提取意外发送到合约的任何ERC20代币（非桥接代币，仅限所有者）
     * @param _tokenContractAddress 代币合约地址
     * @param _to 接收代币的地址
     * @param _amount 提取金额
     */
    function withdrawAccidentalERC20(address _tokenContractAddress, address _to, uint256 _amount) external onlyOwner {
        require(_tokenContractAddress != address(externalToken), "GameTokenBridge: Cannot withdraw bridge token");
        require(_to != address(0), "GameTokenBridge: invalid recipient address");
        require(_amount > 0, "GameTokenBridge: amount must be positive");

        IERC20 token = IERC20(_tokenContractAddress);
        uint256 contractBalance = token.balanceOf(address(this));
        require(contractBalance >= _amount, "GameTokenBridge: insufficient token balance");

        bool success = token.transfer(_to, _amount);
        require(success, "GameTokenBridge: token transfer failed");

        emit EmergencyWithdrawal(_tokenContractAddress, _to, _amount);
    }
}
