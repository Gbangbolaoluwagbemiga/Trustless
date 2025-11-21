// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Paymaster
 * @dev A simple paymaster contract that sponsors gas fees for SecureFlow transactions
 * This contract holds funds and can be used to sponsor gas fees for users
 */
contract Paymaster is Ownable, ReentrancyGuard {
    // Events
    event GasSponsored(address indexed user, uint256 amount, string reason);
    event FundsDeposited(address indexed depositor, uint256 amount);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    // State variables
    mapping(address => bool) public authorizedContracts;
    mapping(address => uint256) public userGasSponsored;
    uint256 public totalGasSponsored;
    
    // Constructor
    constructor() {
        // The deployer becomes the owner
    }

    /**
     * @dev Authorize a contract to use this paymaster
     * @param contractAddress The address of the contract to authorize
     */
    function authorizeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = true;
    }

    /**
     * @dev Revoke authorization for a contract
     * @param contractAddress The address of the contract to revoke
     */
    function revokeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = false;
    }

    /**
     * @dev Deposit funds to the paymaster
     */
    function deposit() external payable {
        require(msg.value > 0, "Paymaster: Must deposit some ETH");
        emit FundsDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw funds from the paymaster (owner only)
     * @param amount The amount to withdraw
     */
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= address(this).balance, "Paymaster: Insufficient balance");
        require(amount > 0, "Paymaster: Amount must be greater than 0");
        
        payable(owner()).transfer(amount);
        emit FundsWithdrawn(owner(), amount);
    }

    /**
     * @dev Sponsor gas fees for a user (can be called by authorized contracts)
     * @param user The user whose gas fees are being sponsored
     * @param amount The amount of gas being sponsored
     * @param reason The reason for sponsorship
     */
    function sponsorGas(
        address user,
        uint256 amount,
        string memory reason
    ) external {
        require(authorizedContracts[msg.sender], "Paymaster: Unauthorized contract");
        require(address(this).balance >= amount, "Paymaster: Insufficient balance");
        
        userGasSponsored[user] += amount;
        totalGasSponsored += amount;
        
        emit GasSponsored(user, amount, reason);
    }

    /**
     * @dev Get the balance of the paymaster
     * @return The current balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get the total gas sponsored for a user
     * @param user The user address
     * @return The total gas sponsored for the user
     */
    function getUserGasSponsored(address user) external view returns (uint256) {
        return userGasSponsored[user];
    }

    /**
     * @dev Check if a contract is authorized
     * @param contractAddress The contract address to check
     * @return True if authorized, false otherwise
     */
    function isAuthorized(address contractAddress) external view returns (bool) {
        return authorizedContracts[contractAddress];
    }

    // Fallback function to receive ETH
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
}



