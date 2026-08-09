// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TokentaCompliancePool {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // Single-Contract Mode compliance target.
    // Cleanverse validator will query `owner()` to verify API signatures.
}
