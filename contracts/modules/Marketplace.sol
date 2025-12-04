// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./EscrowCore.sol";

abstract contract Marketplace is EscrowCore {
    // ===== Marketplace functions =====
    function applyToJob(
        uint256 escrowId, 
        string calldata coverLetter, 
        uint256 proposedTimeline
    ) 
        external 
        validEscrow(escrowId) 
        nonReentrant 
        whenNotPaused 
    {
        EscrowData storage e = escrows[escrowId];
        require(e.isOpenJob, "Not an open job");
        require(e.status == EscrowStatus.Pending, "Job closed");
        require(selfVerifiedUsers[msg.sender], "Identity verification required");
        require(!hasApplied[escrowId][msg.sender], "Already applied");
        require(
            escrowApplications[escrowId].length < MAX_APPLICATIONS, 
            "Too many applications"
        );
        require(msg.sender != e.depositor, "Cannot apply to own job");
        require(bytes(coverLetter).length > 0, "Cover letter required");

        // Get freelancer rating - will be 0 if no ratings yet
        uint256 avgRating = 0;
        uint256 totalRatings = 0;
        // Note: RatingSystem will be available through inheritance in SecureFlow
        // For now, we'll set defaults and RatingSystem will handle the actual rating logic
        
        escrowApplications[escrowId].push(Application({
            freelancer: msg.sender,
            coverLetter: coverLetter,
            proposedTimeline: proposedTimeline,
            appliedAt: block.timestamp,
            exists: true,
            averageRating: avgRating,
            totalRatings: totalRatings
        }));
        hasApplied[escrowId][msg.sender] = true;
        emit ApplicationSubmitted(
            escrowId, 
            msg.sender, 
            coverLetter, 
            proposedTimeline
        );
    }

    function acceptFreelancer(
        uint256 escrowId, 
        address freelancer
    ) 
        external 
        onlyDepositor(escrowId) 
        validEscrow(escrowId) 
        nonReentrant 
        whenNotPaused 
    {
        EscrowData storage e = escrows[escrowId];
        require(e.isOpenJob, "Not open");
        require(e.status == EscrowStatus.Pending, "Job closed");
        require(hasApplied[escrowId][freelancer], "Freelancer not applied");

        e.beneficiary = freelancer;
        e.isOpenJob = false;
        userEscrows[freelancer].push(escrowId);
        emit FreelancerAccepted(escrowId, freelancer);
        emit EscrowUpdated(escrowId, e.status, block.timestamp);
    }

    // ===== View functions =====
    function getApplicationsPage(
        uint256 escrowId, 
        uint256 offset, 
        uint256 limit
    ) external view validEscrow(escrowId) returns (Application[] memory) {
        require(limit > 0 && limit <= MAX_APPLICATIONS, "Invalid limit");
        Application[] storage allApplications = escrowApplications[escrowId];
        require(offset <= allApplications.length, "Offset out of bounds");
        
        uint256 endIndex = offset + limit;
        if (endIndex > allApplications.length) {
            endIndex = allApplications.length;
        }
        
        uint256 actualLimit = endIndex - offset;
        Application[] memory result = new Application[](actualLimit);
        
        for (uint256 i = 0; i < actualLimit; i++) {
            result[i] = allApplications[offset + i];
        }
        
        return result;
    }

    function getApplicationCount(uint256 escrowId) external view validEscrow(escrowId) returns (uint256) {
        return escrowApplications[escrowId].length;
    }

    function hasUserApplied(uint256 escrowId, address user) external view validEscrow(escrowId) returns (bool) {
        return hasApplied[escrowId][user];
    }
}
