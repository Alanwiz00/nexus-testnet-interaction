"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { AddressInput, IntegerInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useWatchBalance } from "~~/hooks/scaffold-eth/useWatchBalance";
import { getTokenPrice, multiplyTo1e18 } from "~~/utils/scaffold-eth/priceInWei";

const TokenVendor: NextPage = () => {
  const [toAddress, setToAddress] = useState("");
  const [tokensToSend, setTokensToSend] = useState("");
  const [tokensToBuy, setTokensToBuy] = useState<string | bigint>("");
  const [isApproved, setIsApproved] = useState(false);
  const [tokensToSell, setTokensToSell] = useState<string>("");

  const { address } = useAccount();
  const { data: yourTokenSymbol } = useScaffoldReadContract({
    contractName: "Gold",
    functionName: "symbol",
  });

  const { data: yourTokenBalance } = useScaffoldReadContract({
    contractName: "Gold",
    functionName: "balanceOf",
    args: [address],
  });

  const { data: vendorContractData } = useDeployedContractInfo("Vendor");
  const { data: goldContractData } = useDeployedContractInfo("Gold");
  const { writeContractAsync: writeVendorAsync } = useScaffoldWriteContract("Vendor");
  const { writeContractAsync: writeYourTokenAsync } = useScaffoldWriteContract("Gold");

  const { data: vendorTokenBalance } = useScaffoldReadContract({
    contractName: "Gold",
    functionName: "balanceOf",
    args: [vendorContractData?.address],
  });

  const { data: vendorEthBalance } = useWatchBalance({ address: vendorContractData?.address });

  const { data: tokensPerEth } = useScaffoldReadContract({
    contractName: "Vendor",
    functionName: "tokensPerEth",
  });

  const addTokenToMetaMask = async () => {
    if (window.ethereum && goldContractData) {
      try {
        await window.ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: goldContractData.address,
              symbol: yourTokenSymbol,
              decimals: 18,
            },
          },
        });
      } catch (error) {
        console.error("Error adding token to MetaMask", error);
      }
    }
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="flex flex-col items-center bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-24 w-full max-w-lg">
          <div className="text-xl">
            Your $GOLD balance:{" "}
            <div className="inline-flex items-center justify-center">
              {parseFloat(formatEther(yourTokenBalance || 0n)).toFixed(4)}
              <span className="font-bold ml-1">{yourTokenSymbol}</span>
            </div>
          </div>
          {/* Vendor Balances */}
          <hr className="w-full border-secondary my-3" />
          <div>
            Vendor $GOLD balance:{" "}
            <div className="inline-flex items-center justify-center">
              {Number(formatEther(vendorTokenBalance || 0n)).toFixed(4)}
              <span className="font-bold ml-1">{yourTokenSymbol}</span>
            </div>
          </div>
          <div>
            Vendor $NEX balance: {Number(formatEther(vendorEthBalance?.value || 0n)).toFixed(4)}
            <span className="font-bold ml-1">NEX</span>
          </div>
          <hr className="w-full border-secondary my-3" />
          {/* Display Gold Contract Address */}
          <div className="text-sm">{goldContractData?.address}</div>
          <button className="btn btn-secondary mt-2" onClick={addTokenToMetaMask}>
            Add $GOLD to MetaMask
          </button>
        </div>

        {/* Buy Tokens */}
        <div className="flex flex-col items-center space-y-4 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-8 w-full max-w-lg">
          <div className="text-xl">Buy $GOLD</div>
          <div>{tokensPerEth?.toString() || 0} $GOLD per NEX</div>

          <div className="w-full flex flex-col space-y-2">
            <IntegerInput
              placeholder="amount of tokens to buy"
              value={tokensToBuy.toString()}
              onChange={value => setTokensToBuy(value)}
              disableMultiplyBy1e18
            />
          </div>

          <button
            className="btn btn-secondary mt-2"
            onClick={async () => {
              try {
                await writeVendorAsync({ functionName: "buyTokens", value: getTokenPrice(tokensToBuy, tokensPerEth) });
              } catch (err) {
                console.error("Error calling buyTokens function");
              }
            }}
          >
            Buy Tokens
          </button>
        </div>

        {!!yourTokenBalance && (
          <div className="flex flex-col items-center space-y-4 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-8 w-full max-w-lg">
            <div className="text-xl">Transfer $GOLD</div>
            <div className="w-full flex flex-col space-y-2">
              <AddressInput placeholder="to address" value={toAddress} onChange={value => setToAddress(value)} />
              <IntegerInput
                placeholder="amount of tokens to send"
                value={tokensToSend}
                onChange={value => setTokensToSend(value as string)}
                disableMultiplyBy1e18
              />
            </div>

            <button
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  await writeYourTokenAsync({
                    functionName: "transfer",
                    args: [toAddress, multiplyTo1e18(tokensToSend)],
                  });
                } catch (err) {
                  console.error("Error calling transfer function");
                }
              }}
            >
              Send $GOLD
            </button>
          </div>
        )}

        {/* Sell Tokens */}
        {!!yourTokenBalance && (
          <div className="flex flex-col items-center space-y-4 bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl p-6 mt-8 w-full max-w-lg">
            <div className="text-xl">Sell $GOLD</div>
            <div>{tokensPerEth?.toString() || 0} $GOLD per NEX</div>

            <div className="w-full flex flex-col space-y-2">
              <IntegerInput
                placeholder="amount of tokens to sell"
                value={tokensToSell}
                onChange={value => setTokensToSell(value as string)}
                disabled={isApproved}
                disableMultiplyBy1e18
              />
            </div>

            <div className="flex gap-4">
              <button
                className={`btn ${isApproved ? "btn-disabled" : "btn-secondary"}`}
                onClick={async () => {
                  try {
                    await writeYourTokenAsync({
                      functionName: "approve",
                      args: [vendorContractData?.address, multiplyTo1e18(tokensToSell)],
                    });
                    setIsApproved(true);
                  } catch (err) {
                    console.error("Error calling approve function");
                  }
                }}
              >
                Approve $GOLD
              </button>

              <button
                className={`btn ${isApproved ? "btn-secondary" : "btn-disabled"}`}
                onClick={async () => {
                  try {
                    await writeVendorAsync({ functionName: "sellTokens", args: [multiplyTo1e18(tokensToSell)] });
                    setIsApproved(false);
                  } catch (err) {
                    console.error("Error calling sellTokens function");
                  }
                }}
              >
                Sell $GOLD
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TokenVendor;
