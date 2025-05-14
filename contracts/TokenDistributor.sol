// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TokenDistributor
 * @dev 这个合约用于分发指定的ERC20代币。
 * 合约所有者先将代币转入此合约地址，然后用户可以调用claimTokens函数免费领取一次。
 */
contract TokenDistributor is Ownable, ReentrancyGuard {
    IERC20 public immutable token; // 要分发的代币合约地址
    uint256 public claimAmount; // 每次允许领取的代币数量
    mapping(address => bool) public hasClaimed; // 记录地址是否已领取

    event TokensClaimed(address indexed recipient, uint256 amount);
    event ClaimAmountUpdated(uint256 newAmount);
    event TokensWithdrawn(address indexed owner, uint256 amount);
    event EtherWithdrawn(address indexed owner, uint256 amount);

    /**
     * @dev 构造函数
     * @param _tokenAddress 要分发的ERC20代币的地址
     * @param _initialClaimAmount 初始设置的每次领取数量
     */
    constructor(address _tokenAddress, uint256 _initialClaimAmount) {
        require(_tokenAddress != address(0), "TokenDistributor: Invalid token address");
        require(_initialClaimAmount > 0, "TokenDistributor: Claim amount must be positive");
        token = IERC20(_tokenAddress);
        claimAmount = _initialClaimAmount;
        emit ClaimAmountUpdated(_initialClaimAmount);
    }

    /**
     * @dev 允许用户领取一次代币
     */
    function claimTokens() external nonReentrant {
        address recipient = msg.sender;
        require(!hasClaimed[recipient], "TokenDistributor: Address has already claimed");

        uint256 currentBalance = token.balanceOf(address(this));
        require(currentBalance >= claimAmount, "TokenDistributor: Not enough tokens left in contract");

        hasClaimed[recipient] = true;
        bool success = token.transfer(recipient, claimAmount);
        require(success, "TokenDistributor: Token transfer failed");

        emit TokensClaimed(recipient, claimAmount);
    }

    /**
     * @dev 更新每次允许领取的代币数量（仅限所有者）
     * @param _newClaimAmount 新的领取数量
     */
    function setClaimAmount(uint256 _newClaimAmount) external onlyOwner {
        require(_newClaimAmount > 0, "TokenDistributor: Claim amount must be positive");
        claimAmount = _newClaimAmount;
        emit ClaimAmountUpdated(_newClaimAmount);
    }

    /**
     * @dev 提取合约中剩余的所有目标代币（仅限所有者）
     */
    function withdrawRemainingTokens() external onlyOwner {
        uint256 remainingBalance = token.balanceOf(address(this));
        require(remainingBalance > 0, "TokenDistributor: No tokens to withdraw");

        bool success = token.transfer(owner(), remainingBalance);
        require(success, "TokenDistributor: Token transfer failed");

        emit TokensWithdrawn(owner(), remainingBalance);
    }

    /**
     * @dev 提取意外发送到合约的ETH（仅限所有者）
     */
    function withdrawAccidentalEther() external onlyOwner {
        uint256 ethBalance = address(this).balance;
        require(ethBalance > 0, "TokenDistributor: No Ether to withdraw");
        (bool success, ) = owner().call{value: ethBalance}("");
        require(success, "TokenDistributor: Ether transfer failed");
        emit EtherWithdrawn(owner(), ethBalance);
    }

    /**
     * @dev 允许所有者查看合约当前的代币余额
     */
    function getContractTokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @dev 允许所有者查看某个地址是否已领取
     */
    function checkClaimStatus(address _user) external view returns (bool) {
        return hasClaimed[_user];
    }
}