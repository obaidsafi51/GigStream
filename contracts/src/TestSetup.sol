// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/utils/ReentrancyGuard.sol";
import "@openzeppelin/access/Ownable.sol";

/**
 * @title TestSetup
 * @notice Simple contract to verify Foundry + OpenZeppelin setup
 * @dev This is a test contract to ensure compilation works
 */
contract TestSetup is ReentrancyGuard, Ownable {
    uint256 public value;

    event ValueUpdated(uint256 newValue);

    constructor() Ownable(msg.sender) {
        value = 0;
    }

    function setValue(uint256 _value) external onlyOwner nonReentrant {
        value = _value;
        emit ValueUpdated(_value);
    }

    function getValue() external view returns (uint256) {
        return value;
    }
}
