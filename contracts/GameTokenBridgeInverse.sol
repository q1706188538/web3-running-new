// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// --- 接口和库定义 ---

// IERC20接口
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// IERC20Metadata接口
interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

// ECDSA库
library ECDSA {
    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) {
            revert("ECDSA: invalid signature length");
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert("ECDSA: invalid signature 's' value");
        }

        if (v != 27 && v != 28) {
            revert("ECDSA: invalid signature 'v' value");
        }

        address signer = ecrecover(hash, v, r, s);
        require(signer != address(0), "ECDSA: invalid signature");

        return signer;
    }

    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}

/**
 * @title GameTokenBridgeInverse
 * @dev 此合约作为外部ERC20代币与游戏金币之间的桥梁，支持税收和签名验证。
 * 此版本支持反向兑换比例：100个代币兑换1个金币。
 */
contract GameTokenBridgeInverse {
    // --- 合约状态变量 ---
    address private _owner;
    bool private _reentrant;

    IERC20 public externalToken; // 外部ERC20代币合约地址
    uint8 public externalTokenDecimals; // 外部ERC20代币的小数位数
    string public externalTokenSymbol; // 外部ERC20代币的符号

    address public gameServerAddress;

    // 兑换比例相关参数
    uint256 public exchangeRate = 1; // 1个游戏金币 = exchangeRate个外部代币 (需要根据外部代币的decimals调整)
    bool public inverseExchangeMode = true; // 是否使用反向兑换模式 (true: 代币兑换金币, false: 金币兑换代币)

    uint256 public exchangeTokenTaxRate = 200; // 金币兑换代币的税率 (基点, 200 = 2%)
    uint256 public rechargeTokenTaxRate = 100; // 代币充值金币的税率 (基点, 100 = 1%)
    address public taxWallet;

    uint256 public minExchangeAmount; // 最小兑换金额 (以外部代币的最小单位表示)
    uint256 public maxExchangeAmount; // 最大兑换金额 (以外部代币的最小单位表示)

    mapping(address => bool) public operators;
    mapping(bytes32 => bool) public usedNonces;

    // --- 结构体定义 ---
    struct ExchangeData {
        address player;
        uint256 gameCoins;
        uint256 tokenAmount;
        uint256 tax;
        uint256 amountToPlayer;
    }

    struct RechargeData {
        address player;
        uint256 gameCoins;
        uint256 tokenAmount;
        uint256 tax;
        uint256 amountToOwner;
    }

    // --- 事件 ---
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ExchangeFromGame(address indexed player, uint256 gameCoins, uint256 tokenAmount, uint256 taxAmount);
    event RechargeToGame(address indexed player, uint256 tokenAmount, uint256 gameCoins, uint256 taxAmount);
    event OperatorSet(address indexed operator, bool status);
    event ExchangeRateUpdated(uint256 newRate);
    event InverseExchangeModeUpdated(bool newMode);
    event ExchangeTokenTaxRateUpdated(uint256 newTaxRate);
    event RechargeTokenTaxRateUpdated(uint256 newTaxRate);
    event TaxWalletUpdated(address newTaxWallet);
    event ExchangeLimitsUpdated(uint256 minAmount, uint256 maxAmount);
    event GameServerAddressUpdated(address newAddress);
    event ExternalTokenSet(address indexed tokenAddress, uint8 decimals, string symbol);
    event EmergencyWithdrawal(address indexed token, address indexed to, uint256 amount);

    // --- 修饰符 ---
    modifier onlyOwner() {
        require(msg.sender == _owner, "Ownable: caller is not the owner");
        _;
    }

    modifier nonReentrant() {
        require(!_reentrant, "ReentrancyGuard: reentrant call");
        _reentrant = true;
        _;
        _reentrant = false;
    }

    /**
     * @dev 构造函数
     * @param _externalTokenAddress 外部ERC20代币合约地址
     * @param _gameServerAddress 游戏服务器地址
     * @param _taxWallet 税收钱包地址
     * @param _initialExchangeRate 初始兑换比例
     * @param _initialMinExchange 最小兑换金额 (以外部代币的最小单位表示)
     * @param _initialMaxExchange 最大兑换金额 (以外部代币的最小单位表示)
     * @param _inverseMode 是否使用反向兑换模式
     */
    constructor(
        address _externalTokenAddress,
        address _gameServerAddress,
        address _taxWallet,
        uint256 _initialExchangeRate,
        uint256 _initialMinExchange,
        uint256 _initialMaxExchange,
        bool _inverseMode
    ) {
        require(_externalTokenAddress != address(0), "GameTokenBridge: invalid external token address");
        require(_gameServerAddress != address(0), "GameTokenBridge: invalid game server address");
        require(_taxWallet != address(0), "GameTokenBridge: invalid tax wallet address");
        require(_initialExchangeRate > 0, "GameTokenBridge: exchange rate must be positive");
        require(_initialMinExchange > 0, "GameTokenBridge: min exchange must be positive");
        require(_initialMaxExchange >= _initialMinExchange, "GameTokenBridge: max must be >= min");

        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);

        // 初始化外部代币
        _setExternalToken(_externalTokenAddress);

        gameServerAddress = _gameServerAddress;
        taxWallet = _taxWallet;
        exchangeRate = _initialExchangeRate;
        inverseExchangeMode = _inverseMode;
        minExchangeAmount = _initialMinExchange;
        maxExchangeAmount = _initialMaxExchange;

        operators[_gameServerAddress] = true; // 默认游戏服务器为操作员

        emit GameServerAddressUpdated(_gameServerAddress);
        emit TaxWalletUpdated(_taxWallet);
        emit ExchangeRateUpdated(_initialExchangeRate);
        emit InverseExchangeModeUpdated(_inverseMode);
        emit ExchangeLimitsUpdated(_initialMinExchange, _initialMaxExchange);
        emit OperatorSet(_gameServerAddress, true);
        emit ExchangeTokenTaxRateUpdated(exchangeTokenTaxRate);
        emit RechargeTokenTaxRateUpdated(rechargeTokenTaxRate);
    }

    // --- 所有权管理 ---
    function owner() public view returns (address) {
        return _owner;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    function _msgSender() internal view returns (address) {
        return msg.sender;
    }

    // --- 管理函数 ---

    /**
     * @dev 设置外部代币地址
     * @param _newExternalTokenAddress 新的外部ERC20代币合约地址
     */
    function setExternalToken(address _newExternalTokenAddress) external onlyOwner {
        _setExternalToken(_newExternalTokenAddress);
    }

    /**
     * @dev 内部函数：设置外部代币地址
     * @param _tokenAddress 外部ERC20代币合约地址
     */
    function _setExternalToken(address _tokenAddress) internal {
        require(_tokenAddress != address(0), "GameTokenBridge: invalid external token address");

        externalToken = IERC20(_tokenAddress);
        externalTokenDecimals = IERC20Metadata(_tokenAddress).decimals();
        externalTokenSymbol = IERC20Metadata(_tokenAddress).symbol();

        emit ExternalTokenSet(_tokenAddress, externalTokenDecimals, externalTokenSymbol);
    }

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
        require(_newRate <= 9000, "GameTokenBridge: tax rate too high (max 90%)"); // Max 90%
        exchangeTokenTaxRate = _newRate;
        emit ExchangeTokenTaxRateUpdated(_newRate);
    }

    /**
     * @dev 设置代币充值金币的税率
     * @param _newRate 新的税率 (基点, 100 = 1%)
     */
    function setRechargeTokenTaxRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= 9000, "GameTokenBridge: tax rate too high (max 90%)"); // Max 90%
        rechargeTokenTaxRate = _newRate;
        emit RechargeTokenTaxRateUpdated(_newRate);
    }

    /**
     * @dev 设置兑换比例
     * @param _newRate 新的兑换比例
     * 如果inverseExchangeMode为true: 1个游戏金币 = _newRate个外部代币
     * 如果inverseExchangeMode为false: 1个外部代币 = _newRate个游戏金币
     */
    function setExchangeRate(uint256 _newRate) external onlyOwner {
        require(_newRate > 0, "GameTokenBridge: exchange rate must be positive");
        exchangeRate = _newRate;
        emit ExchangeRateUpdated(_newRate);
    }

    /**
     * @dev 设置兑换模式
     * @param _inverseMode 是否使用反向兑换模式
     * true: 代币兑换金币 (100代币=1金币)
     * false: 金币兑换代币 (1000金币=1代币)
     */
    function setInverseExchangeMode(bool _inverseMode) external onlyOwner {
        inverseExchangeMode = _inverseMode;
        emit InverseExchangeModeUpdated(_inverseMode);
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

    // --- 辅助函数 ---

    /**
     * @dev 验证兑换签名
     * @param player 玩家地址
     * @param gameCoins 游戏金币数量
     * @param tokenAmount 代币数量
     * @param nonce 随机数
     * @param signature 签名
     */
    function _verifyExchangeSignature(
        address player,
        uint256 gameCoins,
        uint256 tokenAmount,
        bytes32 nonce,
        bytes memory signature
    ) internal view {
        bytes32 messageHash = keccak256(abi.encodePacked(player, gameCoins, tokenAmount, nonce, address(this)));
        bytes32 ethSignedMessageHash = ECDSA.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        require(signer == gameServerAddress, "GameTokenBridge: invalid signature");
    }

    /**
     * @dev 验证充值签名
     * @param player 玩家地址
     * @param tokenAmount 代币数量
     * @param gameCoins 游戏金币数量
     * @param nonce 随机数
     * @param signature 签名
     */
    function _verifyRechargeSignature(
        address player,
        uint256 tokenAmount,
        uint256 gameCoins,
        bytes32 nonce,
        bytes memory signature
    ) internal view {
        bytes32 messageHash = keccak256(abi.encodePacked(player, tokenAmount, gameCoins, nonce, address(this), "recharge"));
        bytes32 ethSignedMessageHash = ECDSA.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        require(signer == gameServerAddress, "GameTokenBridge: invalid signature");
    }

    /**
     * @dev 执行代币转账
     * @param from 发送方地址
     * @param to 接收方地址
     * @param amount 转账金额
     * @param taxAddress 税收钱包地址
     * @param taxAmount 税收金额
     */
    function _transferTokens(
        address from,
        address to,
        uint256 amount,
        address taxAddress,
        uint256 taxAmount
    ) internal {
        // 转账给接收方
        externalToken.transferFrom(from, to, amount);

        // 如果有税收，转账给税收钱包
        if (taxAmount > 0) {
            externalToken.transferFrom(from, taxAddress, taxAmount);
        }
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
    function exchangeFromGame(
        address player,
        uint256 gameCoins,
        uint256 tokenAmount,
        bytes32 nonce,
        bytes memory signature
    ) public nonReentrant returns (bool) {
        // 基本验证
        require(player != address(0), "GameTokenBridge: invalid player address");
        require(tokenAmount >= minExchangeAmount, "GameTokenBridge: amount below minimum");
        require(tokenAmount <= maxExchangeAmount, "GameTokenBridge: amount exceeds maximum");
        require(!usedNonces[nonce], "GameTokenBridge: nonce already used");

        // 创建数据结构
        ExchangeData memory data;
        data.player = player;
        data.gameCoins = gameCoins;
        data.tokenAmount = tokenAmount;

        // 验证签名
        _verifyExchangeSignature(data.player, data.gameCoins, data.tokenAmount, nonce, signature);

        // 根据兑换模式计算预期的游戏金币或代币
        if (inverseExchangeMode) {
            // 反向模式: 100代币=1金币
            // 计算预期的代币数量: 金币数量 * 兑换比例 * 10^decimals
            uint256 expectedTokenAmount = data.gameCoins * exchangeRate * (10**uint256(externalTokenDecimals)) / 1e18;
            require(data.tokenAmount >= expectedTokenAmount, "GameTokenBridge: insufficient token amount for requested game coins");
        } else {
            // 正常模式: 1000金币=1代币
            // 计算预期的游戏金币: 代币数量 * 兑换比例 / 10^decimals
            uint256 expectedGameCoins = data.tokenAmount * exchangeRate / (10**uint256(externalTokenDecimals));
            require(data.gameCoins >= expectedGameCoins, "GameTokenBridge: insufficient game coins for requested token amount");
        }

        // 检查合约所有者的代币余额和授权
        uint256 ownerBalance = externalToken.balanceOf(owner());
        uint256 ownerAllowance = externalToken.allowance(owner(), address(this));
        require(ownerBalance >= data.tokenAmount, "GameTokenBridge: insufficient owner token balance");
        require(ownerAllowance >= data.tokenAmount, "GameTokenBridge: insufficient owner token allowance");

        usedNonces[nonce] = true;

        // 计算税收和玩家实际获得的金额
        data.tax = data.tokenAmount * exchangeTokenTaxRate / 10000;
        data.amountToPlayer = data.tokenAmount - data.tax;

        // 转账操作
        _transferTokens(owner(), data.player, data.amountToPlayer, taxWallet, data.tax);

        emit ExchangeFromGame(data.player, data.gameCoins, data.amountToPlayer, data.tax);
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
    function rechargeToGame(
        uint256 gameCoins,
        uint256 tokenAmount,
        bytes32 nonce,
        bytes memory signature
    ) public nonReentrant returns (bool) {
        // 基本验证
        address player = _msgSender(); // msg.sender is the player
        require(tokenAmount > 0, "GameTokenBridge: token amount must be positive");
        require(!usedNonces[nonce], "GameTokenBridge: nonce already used");

        // 创建数据结构
        RechargeData memory data;
        data.player = player;
        data.gameCoins = gameCoins;
        data.tokenAmount = tokenAmount;

        // 检查玩家的代币余额和授权
        uint256 playerBalance = externalToken.balanceOf(data.player);
        uint256 playerAllowance = externalToken.allowance(data.player, address(this));
        require(playerBalance >= data.tokenAmount, "GameTokenBridge: insufficient player token balance");
        require(playerAllowance >= data.tokenAmount, "GameTokenBridge: insufficient player token allowance");

        // 验证签名
        _verifyRechargeSignature(data.player, data.tokenAmount, data.gameCoins, nonce, signature);

        // 根据兑换模式验证游戏金币和代币的关系
        if (inverseExchangeMode) {
            // 反向模式: 100代币=1金币
            // 计算预期的游戏金币: 代币数量 / 兑换比例 / 10^decimals * 1e18
            uint256 expectedGameCoins = data.tokenAmount * 1e18 / exchangeRate / (10**uint256(externalTokenDecimals));
            require(data.gameCoins <= expectedGameCoins, "GameTokenBridge: game coins exceed expected amount");
        } else {
            // 正常模式: 1000金币=1代币
            // 计算预期的代币数量: 游戏金币 / 兑换比例 * 10^decimals
            uint256 expectedTokenAmount = data.gameCoins * (10**uint256(externalTokenDecimals)) / exchangeRate;
            require(data.tokenAmount >= expectedTokenAmount, "GameTokenBridge: token amount below expected amount");
        }

        usedNonces[nonce] = true;

        // 计算税收和所有者实际获得的金额
        data.tax = data.tokenAmount * rechargeTokenTaxRate / 10000;
        data.amountToOwner = data.tokenAmount - data.tax;

        // 转账操作
        _transferTokens(data.player, owner(), data.amountToOwner, taxWallet, data.tax);

        emit RechargeToGame(data.player, data.tokenAmount, data.gameCoins, data.tax);
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
     * @dev 提取意外发送到合约的任何ERC20代币（非当前桥接代币，仅限所有者）
     * @param _tokenContractAddress 代币合约地址
     * @param _to 接收代币的地址
     * @param _amount 提取金额
     */
    function withdrawAccidentalERC20(address _tokenContractAddress, address _to, uint256 _amount) external onlyOwner {
        require(_tokenContractAddress != address(externalToken), "GameTokenBridge: Cannot withdraw current bridge token");
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