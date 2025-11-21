// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./EscrowCore.sol";

abstract contract EscrowManagement is EscrowCore {
    using SafeERC20 for IERC20;
    // ===== Escrow creation =====
    function createEscrow(
        address beneficiary,
        address[] calldata arbiters,
        uint8 requiredConfirmations,
        uint256[] calldata milestoneAmounts,
        string[] calldata milestoneDescriptions,
        address token,
        uint256 duration,
        string calldata projectTitle,
        string calldata projectDescription
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        whenJobCreationNotPaused 
        onlyWhitelistedToken(token) 
        returns (uint256) 
    {
        require(arbiters.length > 0, "Need at least 1 arbiter");
        require(arbiters.length <= MAX_ARBITERS, "Too many arbiters");
        require(
            requiredConfirmations >= 1 && requiredConfirmations <= arbiters.length, 
            "Invalid quorum"
        );
        for (uint256 i = 0; i < arbiters.length; ++i) {
            require(authorizedArbiters[arbiters[i]], "Arbiter not authorized");
        }
        return _createEscrowInternal(
            msg.sender, 
            beneficiary, 
            arbiters, 
            requiredConfirmations, 
            milestoneAmounts, 
            milestoneDescriptions, 
            token, 
            duration, 
            projectTitle, 
            projectDescription, 
            false
        );
    }

    function createEscrowNative(
        address beneficiary,
        address[] calldata arbiters,
        uint8 requiredConfirmations,
        uint256[] calldata milestoneAmounts,
        string[] calldata milestoneDescriptions,
        uint256 duration,
        string calldata projectTitle,
        string calldata projectDescription
    ) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        whenJobCreationNotPaused 
        returns (uint256) 
    {
        require(arbiters.length > 0, "Need at least 1 arbiter");
        require(arbiters.length <= MAX_ARBITERS, "Too many arbiters");
        require(
            requiredConfirmations >= 1 && requiredConfirmations <= arbiters.length, 
            "Invalid quorum"
        );
        for (uint256 i = 0; i < arbiters.length; ++i) {
            require(authorizedArbiters[arbiters[i]], "Arbiter not authorized");
        }
        return _createEscrowInternal(
            msg.sender, 
            beneficiary, 
            arbiters, 
            requiredConfirmations, 
            milestoneAmounts, 
            milestoneDescriptions, 
            address(0), 
            duration, 
            projectTitle, 
            projectDescription, 
            true
        );
    }

    function _createEscrowInternal(
        address depositor,
        address beneficiary,
        address[] calldata arbiters,
        uint8 requiredConfirmationsParam,
        uint256[] calldata milestoneAmounts,
        string[] calldata milestoneDescriptions,
        address token,
        uint256 duration,
        string calldata projectTitle,
        string calldata projectDescription,
        bool isNative
    ) internal returns (uint256) {
        require(arbiters.length > 0, "No arbiters");
        require(
            requiredConfirmationsParam >= 1 && requiredConfirmationsParam <= arbiters.length, 
            "Invalid quorum"
        );
        require(beneficiary != depositor, "Cannot escrow to self");
        require(
            duration >= MIN_DURATION && duration <= MAX_DURATION, 
            "Invalid duration"
        );
        require(milestoneAmounts.length > 0, "No milestones");
        require(milestoneAmounts.length <= MAX_MILESTONES, "Too many milestones");
        require(
            milestoneAmounts.length == milestoneDescriptions.length, 
            "Mismatched arrays"
        );
        require(bytes(projectTitle).length > 0, "Project title required");

        bool isOpenJob = (beneficiary == address(0));
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; ++i) {
            require(milestoneAmounts[i] > 0, "Invalid milestone amount");
            totalAmount += milestoneAmounts[i];
        }

        uint256 platformFee = _calculateFee(totalAmount);
        uint256 totalWithFee = totalAmount + platformFee;

        if (isNative) {
            require(msg.value == totalWithFee, "Incorrect native amount");
            escrowedAmount[address(0)] += totalAmount;
        } else {
            IERC20(token).safeTransferFrom(
                depositor, 
                address(this), 
                totalWithFee
            );
            escrowedAmount[token] += totalAmount;
        }

        uint256 escrowId = nextEscrowId++;
        uint256 deadline = block.timestamp + duration;

        address[] memory arbArr = new address[](arbiters.length);
        for (uint256 i = 0; i < arbiters.length; ++i) {
            arbArr[i] = arbiters[i];
        }

        EscrowData storage e = escrows[escrowId];
        e.depositor = depositor;
        e.beneficiary = beneficiary;
        e.arbiters = arbArr;
        e.requiredConfirmations = requiredConfirmationsParam;
        e.token = token;
        e.totalAmount = totalAmount;
        e.paidAmount = 0;
        e.platformFee = platformFee;
        e.deadline = deadline;
        e.status = EscrowStatus.Pending;
        e.workStarted = false;
        e.createdAt = block.timestamp;
        e.milestoneCount = milestoneAmounts.length;
        e.isOpenJob = isOpenJob;
        e.projectTitle = projectTitle;
        e.projectDescription = projectDescription;

        for (uint256 i = 0; i < milestoneAmounts.length; ++i) {
            milestones[escrowId][i] = Milestone({
                description: milestoneDescriptions[i],
                amount: milestoneAmounts[i],
                status: MilestoneStatus.NotStarted,
                submittedAt: 0,
                approvedAt: 0,
                disputedAt: 0,
                disputedBy: address(0),
                disputeReason: ""
            });
        }

        userEscrows[depositor].push(escrowId);
        if (!isOpenJob) userEscrows[beneficiary].push(escrowId);

        emit EscrowCreated(
            escrowId,
            depositor, 
            beneficiary,
            arbArr, 
            totalAmount,
            platformFee, 
            token,
            deadline, 
            isOpenJob
        );
        emit EscrowUpdated(escrowId, EscrowStatus.Pending, block.timestamp);
        return escrowId;
    }
}
