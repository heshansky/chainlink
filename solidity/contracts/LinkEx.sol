pragma solidity 0.4.24;

import "./interfaces/LinkExInterface.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title The LINK exchange contract
 */
contract LinkEx is LinkExInterface, Ownable {
  using SafeMath for uint256;

  struct Rate {
    uint256 blockNumber;
    uint256 rate;
  }

  uint256 public constant VALID_BLOCKS = 25;

  mapping(address => bool) public authorizedNodes;

  mapping(address => Rate) private rates;
  uint256 private historicRate;
  uint256 private rate;
  uint256 private rateHeight;
  address[] private oracles;

  function addOracle(address _oracle) external onlyOwner {
    setFulfillmentPermission(_oracle, true);
    oracles.push(_oracle);
  }

  function currentRate() external view returns (uint256) {
    if (isFutureBlock()) {
      return rate;
    }
    return historicRate;
  }

  function removeOracle(address _oracle) external onlyOwner {
    setFulfillmentPermission(_oracle, false);
    delete authorizedNodes[_oracle];
    for (uint i = 0; i < oracles.length; i++) {
      if (oracles[i] == _oracle) {
        delete oracles[i];
      }
    }
  }

  function update(uint256 _rate) external onlyAuthorizedNode {
    rates[msg.sender] = Rate(block.number, _rate);
    if (isFutureBlock()) {
      historicRate = rate;
      rateHeight = block.number;
    }

    uint256 tempRate;
    uint256 count;
    for (uint i = 0; i < oracles.length; i++) {
      if(rates[oracles[i]].blockNumber > block.number.sub(VALID_BLOCKS)) {
        tempRate = tempRate.add(rates[oracles[i]].rate);
        count++;
	    }
    }
    rate = tempRate.div(count);
  }

  function isFutureBlock() internal view returns (bool) {
    return block.number > rateHeight;
  }

  function setFulfillmentPermission(address _oracle, bool _status) private {
    authorizedNodes[_oracle] = _status;
  }

  modifier onlyAuthorizedNode() {
    require(authorizedNodes[msg.sender], "Only an authorized node may call this function");
    _;
  }
}