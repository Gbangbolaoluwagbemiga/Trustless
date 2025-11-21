// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./EscrowCore.sol";

/**
 * @title RatingSystem - Freelancer rating and NFT badge system
 * @dev Handles freelancer ratings and NFT minting based on completed jobs
 */
abstract contract RatingSystem is EscrowCore {
    // ===== Constants =====
    uint256 public constant BEGINNER_THRESHOLD = 0;      // 0-4 completed jobs
    uint256 public constant INTERMEDIATE_THRESHOLD = 5;  // 5-19 completed jobs
    uint256 public constant PRO_THRESHOLD = 20;         // 20+ completed jobs
    
    // ===== Structs =====
    struct FreelancerRating {
        uint256 totalRatings;
        uint256 sumRatings; // Sum of all ratings (1-5 scale)
        uint256 averageRating; // Average rating * 100 (for precision)
    }
    
    struct EscrowRating {
        address rater; // Client who rated
        address freelancer; // Freelancer being rated
        uint256 rating; // 1-5
        uint256 escrowId;
        uint256 ratedAt;
        bool exists;
    }
    
    // ===== State =====
    mapping(address => FreelancerRating) public freelancerRatings;
    mapping(uint256 => EscrowRating) public escrowRatings; // escrowId => rating
    mapping(address => uint256[]) public freelancerRatedEscrows; // freelancer => escrowIds
    
    // ===== Events =====
    event FreelancerRated(
        uint256 indexed escrowId,
        address indexed freelancer,
        address indexed rater,
        uint256 rating,
        uint256 newAverageRating
    );
    event NFTBadgeMinted(
        address indexed freelancer,
        string badgeTier,
        uint256 completedJobs
    );
    
    // ===== Functions =====
    
    /**
     * @dev Rate a freelancer after escrow completion
     * @param escrowId The escrow ID
     * @param rating Rating from 1-5
     */
    function rateFreelancer(
        uint256 escrowId,
        uint256 rating
    ) external validEscrow(escrowId) nonReentrant whenNotPaused {
        EscrowData storage e = escrows[escrowId];
        require(e.status == EscrowStatus.Released, "Escrow not completed");
        require(msg.sender == e.depositor, "Only client can rate");
        require(e.beneficiary != address(0), "No freelancer assigned");
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");
        require(!escrowRatings[escrowId].exists, "Already rated");
        
        address freelancer = e.beneficiary;
        FreelancerRating storage fr = freelancerRatings[freelancer];
        
        // Update rating
        fr.totalRatings += 1;
        fr.sumRatings += rating;
        fr.averageRating = (fr.sumRatings * 100) / fr.totalRatings; // Store as percentage for precision
        
        // Store escrow rating
        escrowRatings[escrowId] = EscrowRating({
            rater: msg.sender,
            freelancer: freelancer,
            rating: rating,
            escrowId: escrowId,
            ratedAt: block.timestamp,
            exists: true
        });
        
        freelancerRatedEscrows[freelancer].push(escrowId);
        
        emit FreelancerRated(escrowId, freelancer, msg.sender, rating, fr.averageRating);
        
        // Check if freelancer should mint NFT badge
        _checkAndMintBadge(freelancer);
    }
    
    /**
     * @dev Get freelancer rating
     * @param freelancer The freelancer address
     * @return averageRating Average rating (0-500, divide by 100 for actual rating)
     * @return totalRatings Total number of ratings
     */
    function getFreelancerRating(address freelancer) external view returns (
        uint256 averageRating,
        uint256 totalRatings
    ) {
        FreelancerRating storage fr = freelancerRatings[freelancer];
        return (fr.averageRating, fr.totalRatings);
    }
    
    /**
     * @dev Internal helper to get freelancer rating for use in other modules
     * @param freelancer The freelancer address
     * @return averageRating Average rating (0-500, divide by 100 for actual rating)
     * @return totalRatings Total number of ratings
     */
    function _getFreelancerRating(address freelancer) internal view returns (
        uint256 averageRating,
        uint256 totalRatings
    ) {
        FreelancerRating storage fr = freelancerRatings[freelancer];
        return (fr.averageRating, fr.totalRatings);
    }
    
    /**
     * @dev Get rating for a specific escrow
     * @param escrowId The escrow ID
     * @return rater The address of the rater
     * @return freelancer The address of the freelancer being rated
     * @return rating The rating value (1-5)
     * @return ratedAt The timestamp when rated
     * @return exists Whether the rating exists
     */
    function getEscrowRating(uint256 escrowId) external view validEscrow(escrowId) returns (
        address rater,
        address freelancer,
        uint256 rating,
        uint256 ratedAt,
        bool exists
    ) {
        EscrowRating storage er = escrowRatings[escrowId];
        return (er.rater, er.freelancer, er.rating, er.ratedAt, er.exists);
    }
    
    /**
     * @dev Get badge tier for a freelancer based on completed jobs
     * @param freelancer The freelancer address
     * @return tier The badge tier (0=Beginner, 1=Intermediate, 2=Pro)
     */
    function getBadgeTier(address freelancer) external view returns (uint256 tier) {
        uint256 completed = completedEscrows[freelancer];
        if (completed >= PRO_THRESHOLD) {
            return 2; // Pro
        } else if (completed >= INTERMEDIATE_THRESHOLD) {
            return 1; // Intermediate
        } else {
            return 0; // Beginner
        }
    }
    
    /**
     * @dev Internal function to check and mint badge
     * @param freelancer The freelancer address
     */
    function _checkAndMintBadge(address freelancer) internal {
        uint256 completed = completedEscrows[freelancer];
        string memory tier;
        
        if (completed == PRO_THRESHOLD) {
            tier = "Pro";
            emit NFTBadgeMinted(freelancer, tier, completed);
        } else if (completed == INTERMEDIATE_THRESHOLD) {
            tier = "Intermediate";
            emit NFTBadgeMinted(freelancer, tier, completed);
        } else if (completed == 1) {
            tier = "Beginner";
            emit NFTBadgeMinted(freelancer, tier, completed);
        }
        // Note: In a full implementation, you would mint an actual NFT here
        // For now, we just emit an event that can be used by an off-chain service
    }
}

