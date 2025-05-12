// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev ERC20接口定义
 */
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

/**
 * @dev ERC20元数据扩展接口
 */
interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

/**
 * @dev 提供Solidity中缺少的集合操作
 */
library Address {
    function isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}

/**
 * @dev ECDSA操作
 * 用于验证签名
 */
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
        } else {
            return (address(0), RecoverError.InvalidSignatureLength);
        }
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

    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        (address recovered, RecoverError error) = tryRecover(hash, signature);
        _throwError(error);
        return recovered;
    }

    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}

/**
 * @dev 上下文合约，提供有关当前执行上下文的信息
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

/**
 * @dev 所有权合约，提供基本的访问控制机制
 */
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

/**
 * @dev 重入保护合约
 */
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

/**
 * @dev ERC20代币标准实现
 */
contract ERC20 is Context, IERC20, IERC20Metadata {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }

        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(_msgSender(), spender, currentAllowance - subtractedValue);
        }

        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(sender, recipient, amount);

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            _balances[sender] = senderBalance - amount;
        }
        _balances[recipient] += amount;

        emit Transfer(sender, recipient, amount);

        _afterTokenTransfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);

        _afterTokenTransfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
        }
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);

        _afterTokenTransfer(account, address(0), amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual {}

    function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual {}
}

/**
 * @title TempleRunToken
 * @dev 神庙跑酷游戏代币合约，支持游戏金币与代币兑换，并收取代币税
 */
contract TempleRunToken is ERC20, Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // 游戏服务器地址
    address public gameServerAddress;

    // 兑换比例：1个代币 = exchangeRate个游戏金币
    uint256 public exchangeRate = 100;

    // 兑换手续费率（基点，10000 = 100%）- 已废弃，保留变量以兼容旧代码
    uint256 public exchangeFeeRate = 0; // 0% - 不再使用金币税

    // 兑换功能的代币税率（基点，10000 = 100%）
    uint256 public exchangeTokenTaxRate = 200; // 2%

    // 充值功能的代币税率（基点，10000 = 100%）
    uint256 public rechargeTokenTaxRate = 100; // 1%

    // 代币税收钱包地址
    address public taxWallet;

    // 最小兑换金额（代币数量）
    uint256 public minExchangeAmount = 1 * 10**18; // 1个代币

    // 最大兑换金额（代币数量）
    uint256 public maxExchangeAmount = 1000 * 10**18; // 1000个代币

    // 操作员映射
    mapping(address => bool) public operators;

    // 已使用的nonce映射
    mapping(bytes32 => bool) public usedNonces;

    // 事件
    event ExchangeFromGame(address indexed player, uint256 gameCoins, uint256 tokenAmount, uint256 taxAmount);
    event RechargeToGame(address indexed player, uint256 tokenAmount, uint256 gameCoins, uint256 taxAmount);
    event OperatorSet(address indexed operator, bool status);
    event ExchangeRateUpdated(uint256 newRate);
    event ExchangeFeeRateUpdated(uint256 newFeeRate);
    event ExchangeTokenTaxRateUpdated(uint256 newTaxRate);
    event RechargeTokenTaxRateUpdated(uint256 newTaxRate);
    event TaxWalletUpdated(address newTaxWallet);
    event ExchangeLimitsUpdated(uint256 minAmount, uint256 maxAmount);
    event GameServerAddressUpdated(address newAddress);

    /**
     * @dev 构造函数
     * @param name 代币名称
     * @param symbol 代币符号
     * @param initialSupply 初始供应量
     * @param _gameServerAddress 游戏服务器地址
     * @param _taxWallet 代币税收钱包地址
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address _gameServerAddress,
        address _taxWallet
    ) ERC20(name, symbol) {
        require(_gameServerAddress != address(0), "TempleRunToken: invalid game server address");
        require(_taxWallet != address(0), "TempleRunToken: invalid tax wallet address");

        gameServerAddress = _gameServerAddress;
        taxWallet = _taxWallet;
        operators[_gameServerAddress] = true;

        // 铸造初始代币给合约部署者
        _mint(msg.sender, initialSupply);

        emit GameServerAddressUpdated(_gameServerAddress);
        emit TaxWalletUpdated(_taxWallet);
        emit OperatorSet(_gameServerAddress, true);
        emit ExchangeTokenTaxRateUpdated(exchangeTokenTaxRate);
        emit RechargeTokenTaxRateUpdated(rechargeTokenTaxRate);
    }

    /**
     * @dev 设置游戏服务器地址
     * @param _gameServerAddress 新的游戏服务器地址
     */
    function setGameServerAddress(address _gameServerAddress) external onlyOwner {
        require(_gameServerAddress != address(0), "TempleRunToken: invalid game server address");
        gameServerAddress = _gameServerAddress;
        emit GameServerAddressUpdated(_gameServerAddress);
    }

    /**
     * @dev 设置代币税收钱包地址
     * @param _taxWallet 新的税收钱包地址
     */
    function setTaxWallet(address _taxWallet) external onlyOwner {
        require(_taxWallet != address(0), "TempleRunToken: invalid tax wallet address");
        taxWallet = _taxWallet;
        emit TaxWalletUpdated(_taxWallet);
    }

    /**
     * @dev 设置兑换功能的代币税率
     * @param newTaxRate 新的税率（基点，10000 = 100%）
     */
    function setExchangeTokenTaxRate(uint256 newTaxRate) external onlyOwner {
        require(newTaxRate <= 500, "TempleRunToken: tax rate too high"); // 最高5%
        exchangeTokenTaxRate = newTaxRate;
        emit ExchangeTokenTaxRateUpdated(newTaxRate);
    }

    /**
     * @dev 设置充值功能的代币税率
     * @param newTaxRate 新的税率（基点，10000 = 100%）
     */
    function setRechargeTokenTaxRate(uint256 newTaxRate) external onlyOwner {
        require(newTaxRate <= 500, "TempleRunToken: tax rate too high"); // 最高5%
        rechargeTokenTaxRate = newTaxRate;
        emit RechargeTokenTaxRateUpdated(newTaxRate);
    }

    /**
     * @dev 设置操作员状态
     * @param operator 操作员地址
     * @param status 状态（true为启用，false为禁用）
     */
    function setOperator(address operator, bool status) external onlyOwner {
        require(operator != address(0), "TempleRunToken: invalid operator address");
        operators[operator] = status;
        emit OperatorSet(operator, status);
    }

    /**
     * @dev 检查地址是否为操作员
     * @param operator 要检查的地址
     * @return 是否为操作员
     */
    function isOperator(address operator) external view returns (bool) {
        return operators[operator];
    }

    /**
     * @dev 设置兑换比例
     * @param newRate 新的兑换比例
     */
    function setExchangeRate(uint256 newRate) external onlyOwner {
        require(newRate > 0, "TempleRunToken: exchange rate must be positive");
        exchangeRate = newRate;
        emit ExchangeRateUpdated(newRate);
    }

    /**
     * @dev 设置兑换手续费率（已废弃，保留以兼容旧代码）
     * @param newFeeRate 新的手续费率（基点，10000 = 100%）
     */
    function setExchangeFeeRate(uint256 newFeeRate) external onlyOwner {
        // 已废弃，但保留函数以兼容旧代码
        exchangeFeeRate = newFeeRate;
        emit ExchangeFeeRateUpdated(newFeeRate);
    }

    /**
     * @dev 设置兑换限额
     * @param minAmount 最小兑换金额
     * @param maxAmount 最大兑换金额
     */
    function setExchangeLimits(uint256 minAmount, uint256 maxAmount) external onlyOwner {
        require(minAmount > 0, "TempleRunToken: min amount must be positive");
        require(maxAmount >= minAmount, "TempleRunToken: max amount must be >= min amount");
        minExchangeAmount = minAmount;
        maxExchangeAmount = maxAmount;
        emit ExchangeLimitsUpdated(minAmount, maxAmount);
    }

    /**
     * @dev 检查nonce是否已使用
     * @param nonce 要检查的nonce
     * @return 是否已使用
     */
    function isNonceUsed(bytes32 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }

    /**
     * @dev 使用签名验证兑换游戏金币为代币
     * @param player 玩家地址
     * @param gameCoins 游戏金币数量（不再收取金币税，直接使用等值兑换）
     * @param tokenAmount 代币数量（应得代币数量，实际获得会扣除代币税，税率由exchangeTokenTaxRate决定）
     * @param nonce 随机数（防重放）
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
        // 验证参数
        require(player != address(0), "TempleRunToken: invalid player address");
        require(tokenAmount >= minExchangeAmount, "TempleRunToken: amount below minimum");
        require(tokenAmount <= maxExchangeAmount, "TempleRunToken: amount exceeds maximum");
        require(!usedNonces[nonce], "TempleRunToken: nonce already used");

        // 计算预期游戏金币（不再计算金币税）
        uint256 expectedGameCoins = tokenAmount * exchangeRate / (10**decimals());

        // 验证游戏金币数量
        require(gameCoins >= expectedGameCoins, "TempleRunToken: insufficient game coins");

        // 验证签名
        bytes32 messageHash = keccak256(abi.encodePacked(
            player,
            gameCoins,
            tokenAmount,
            nonce,
            address(this)
        ));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);

        require(signer == gameServerAddress, "TempleRunToken: invalid signature");

        // 标记nonce为已使用
        usedNonces[nonce] = true;

        // 计算代币税（使用兑换功能的代币税率）
        uint256 taxAmount = tokenAmount * exchangeTokenTaxRate / 10000;
        uint256 playerAmount = tokenAmount - taxAmount;

        // 从合约所有者转移代币给玩家
        _transfer(owner(), player, playerAmount);

        // 如果有代币税，转移到税收钱包
        if (taxAmount > 0) {
            _transfer(owner(), taxWallet, taxAmount);
        }

        emit ExchangeFromGame(player, gameCoins, playerAmount, taxAmount);

        return true;
    }

    /**
     * @dev 使用签名验证将代币充值为游戏金币
     * @param player 玩家地址
     * @param gameCoins 游戏金币数量（实际获得的金币数量）
     * @param tokenAmount 代币数量（用户支付的总代币数量，其中一部分会作为代币税转入税收钱包，税率由rechargeTokenTaxRate决定）
     * @param nonce 随机数（防重放）
     * @param signature 游戏服务器签名
     * @return 是否成功
     */
    function rechargeToGame(
        address player,
        uint256 gameCoins,
        uint256 tokenAmount,
        bytes32 nonce,
        bytes memory signature
    ) public nonReentrant returns (bool) {
        // 验证参数
        require(player != address(0), "TempleRunToken: invalid player address");
        require(tokenAmount > 0, "TempleRunToken: token amount must be positive");
        require(!usedNonces[nonce], "TempleRunToken: nonce already used");

        // 验证签名
        bytes32 messageHash = keccak256(abi.encodePacked(
            player,
            tokenAmount,
            gameCoins,
            nonce,
            address(this),
            "recharge"
        ));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);

        require(signer == gameServerAddress, "TempleRunToken: invalid signature");

        // 标记nonce为已使用
        usedNonces[nonce] = true;

        // 计算代币税（使用充值功能的代币税率）
        uint256 taxAmount = tokenAmount * rechargeTokenTaxRate / 10000;
        uint256 ownerAmount = tokenAmount - taxAmount;

        // 从玩家转移代币给合约所有者
        _transfer(player, owner(), ownerAmount);

        // 如果有代币税，转移到税收钱包
        if (taxAmount > 0) {
            _transfer(player, taxWallet, taxAmount);
        }

        emit RechargeToGame(player, tokenAmount, gameCoins, taxAmount);

        return true;
    }

    /**
     * @dev 紧急提取合约中的代币（仅合约所有者可调用）
     * @param amount 提取金额
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "TempleRunToken: amount must be positive");
        require(amount <= balanceOf(address(this)), "TempleRunToken: insufficient balance");

        _transfer(address(this), owner(), amount);
    }
}
