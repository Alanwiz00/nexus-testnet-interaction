pragma solidity 0.8.20; //Do not change the solidity version as it negatively impacts submission grading
// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "./YourToken.sol";

contract Vendor is Ownable{
    Gold public yourToken;
    uint256 public constant tokensPerEth = 100;
    event BuyTokens(address buyer, uint256 amountOfETH, uint256 amountOfTokens);
    event SellTokens(address seller, uint256 amountOfTokens, uint256 amountOfETH);

    constructor(address tokenAddress) Ownable(msg.sender) {
        yourToken = Gold(tokenAddress);
    }

    function buyTokens() public payable {
        require(msg.value > 0, "Send ETH to buy some tokens");
        uint256 amountToBuy = msg.value * tokensPerEth;
        uint256 vendorBalance = yourToken.balanceOf(address(this));
        require(vendorBalance >= amountToBuy, "Vendor contract has not enough tokens in its balance");
        yourToken.transfer(msg.sender, amountToBuy);
        emit BuyTokens(msg.sender, msg.value, amountToBuy);
    }

    function sellTokens(uint256 _amount) public {
        require(_amount > 0, "Specify an amount of token greater than zero");
        uint256 userBalance = yourToken.balanceOf(msg.sender);
        require(userBalance >= _amount, "Your balance is lower than the amount of tokens you want to sell");

        uint256 allowance = yourToken.allowance(msg.sender, address(this));
        require(allowance >= _amount, "Check the token allowance");

        uint256 amountOfETHToTransfer = _amount / tokensPerEth;
        uint256 ownerETHBalance = address(this).balance;
        require(ownerETHBalance >= amountOfETHToTransfer, "Vendor has not enough funds to accept the sell request");

        yourToken.transferFrom(msg.sender, address(this), _amount);
        payable(msg.sender).transfer(amountOfETHToTransfer);
        emit SellTokens(msg.sender, _amount, amountOfETHToTransfer);
    }

}
