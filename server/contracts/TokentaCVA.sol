// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IATokenPolicy {
    error TransferNotAllowed();
    struct RuleV2 {
        bytes2  allowedGroup;
        bytes2  allowedSubGroup;
        uint8   minTier;
        uint8   minSubTier;
        bool    isBlackList;
        uint256 countryBitmap;
    }
    function canTransfer(address token, address from, address to, uint256 amount) external view returns (bool);
    function addRuleV2FromToken(RuleV2 calldata rule) external;
}

contract TokentaCVA {
    string public name;
    string public symbol;
    uint8 public decimals = 6;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    IATokenPolicy public policy;
    address public owner;

    error TransferNotAllowed();

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_, address policy_) {
        name = name_;
        symbol = symbol_;
        policy = IATokenPolicy(policy_);
        owner = msg.sender;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (!policy.canTransfer(address(this), msg.sender, to, amount)) {
            revert TransferNotAllowed();
        }
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (!policy.canTransfer(address(this), from, to, amount)) {
            revert TransferNotAllowed();
        }
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function addRule(bytes2 allowedGroup, bytes2 allowedSubGroup, uint8 minTier, uint8 minSubTier, uint256 poolCountryBitmap) external {
        require(msg.sender == owner, "Only owner");
        policy.addRuleV2FromToken(IATokenPolicy.RuleV2({
            allowedGroup: allowedGroup,
            allowedSubGroup: allowedSubGroup,
            minTier: minTier,
            minSubTier: minSubTier,
            isBlackList: false, // Default value based on API logic
            countryBitmap: poolCountryBitmap
        }));
    }
}
