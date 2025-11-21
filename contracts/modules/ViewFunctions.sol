// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./EscrowCore.sol";

abstract contract ViewFunctions is EscrowCore {
    // ===== View functions =====
    function getEscrowSummary(uint256 escrowId) external view validEscrow(escrowId) returns (
        address depositor,
        address beneficiary,
        address[] memory arbiters,
        EscrowStatus status,
        uint256 totalAmount,
        uint256 paidAmount,
        uint256 remaining,
        address token,
        uint256 deadline,
        bool workStarted,
        uint256 createdAt,
        uint256 milestoneCount,
        bool isOpenJob,
        string memory projectTitle,
        string memory projectDescription
    ) {
        EscrowData storage e = escrows[escrowId];
        depositor = e.depositor;
        beneficiary = e.beneficiary;
        arbiters = e.arbiters;
        status = e.status;
        totalAmount = e.totalAmount;
        paidAmount = e.paidAmount;
        remaining = e.totalAmount - e.paidAmount;
        token = e.token;
        deadline = e.deadline;
        workStarted = e.workStarted;
        createdAt = e.createdAt;
        milestoneCount = e.milestoneCount;
        isOpenJob = e.isOpenJob;
        projectTitle = e.projectTitle;
        projectDescription = e.projectDescription;
    }

    function getMilestones(uint256 escrowId) external view validEscrow(escrowId) returns (Milestone[] memory) {
        EscrowData storage e = escrows[escrowId];
        uint256 count = e.milestoneCount;
        Milestone[] memory list = new Milestone[](count);
        for (uint256 i = 0; i < count; ++i) {
            list[i] = milestones[escrowId][i];
        }
        return list;
    }

    function getUserEscrows(address user) external view returns (uint256[] memory) {
        return userEscrows[user];
    }

    function getReputation(address user) external view returns (uint256) {
        return reputation[user];
    }

    function getCompletedEscrows(address user) external view returns (uint256) {
        return completedEscrows[user];
    }

    function getWithdrawableFees(address token) external view returns (uint256) {
        return totalFeesByToken[token];
    }
}
