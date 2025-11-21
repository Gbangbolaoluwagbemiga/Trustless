// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./EscrowCore.sol";

abstract contract RefundSystem is EscrowCore {
    function refundEscrow(uint256 escrowId) 
        external 
        onlyDepositor(escrowId) 
        validEscrow(escrowId) 
        nonReentrant 
        whenNotPaused 
    {
        EscrowData storage e = escrows[escrowId];
        require(e.status == EscrowStatus.Pending, "Invalid status");
        require(!e.workStarted, "Work started");
        require(block.timestamp < e.deadline, "Deadline passed");

        uint256 refundAmount = e.totalAmount - e.paidAmount;
        require(refundAmount > 0, "Nothing to refund");

        e.status = EscrowStatus.Refunded;

        escrowedAmount[e.token] -= refundAmount;
        _transferOut(e.token, e.depositor, refundAmount);

        emit FundsRefunded(escrowId, msg.sender, refundAmount);
        emit EscrowUpdated(escrowId, EscrowStatus.Refunded, block.timestamp);
    }

    function emergencyRefundAfterDeadline(uint256 escrowId) 
        external 
        onlyDepositor(escrowId) 
        validEscrow(escrowId) 
        nonReentrant 
        whenNotPaused 
    {
        EscrowData storage e = escrows[escrowId];
        require(
            block.timestamp > e.deadline + EMERGENCY_REFUND_DELAY, 
            "Emergency period not reached"
        );
        require(
            e.status != EscrowStatus.Released && e.status != EscrowStatus.Refunded, 
            "Cannot refund"
        );

        uint256 refundAmount = e.totalAmount - e.paidAmount;
        require(refundAmount > 0, "Nothing to refund");

        e.status = EscrowStatus.Expired;

        escrowedAmount[e.token] -= refundAmount;
        _transferOut(e.token, e.depositor, refundAmount);

        emit EmergencyRefundExecuted(escrowId, e.depositor, refundAmount);
        emit EscrowUpdated(escrowId, EscrowStatus.Expired, block.timestamp);
    }

    function extendDeadline(
        uint256 escrowId,
        uint256 extraSeconds
    ) external onlyDepositor(escrowId) validEscrow(escrowId) nonReentrant whenNotPaused {
        require(extraSeconds > 0 && extraSeconds <= 30 days, "Invalid extension");
        EscrowData storage e = escrows[escrowId];
        require(
            e.status == EscrowStatus.InProgress || e.status == EscrowStatus.Pending, 
            "Cannot extend"
        );
        e.deadline += extraSeconds;
        emit DeadlineExtended(escrowId, e.deadline);
    }
}
