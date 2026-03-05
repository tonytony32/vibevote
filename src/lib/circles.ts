import { encodeFunctionData } from "viem";

const HUB_V2 = "0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8";
const ESCROW = "0x0E90a90a5C1C1CE838f6C4B62eBFA38186BABc28";

const ERC1155_ABI = [
  {
    type: "function",
    name: "safeTransferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export function buildVoteTx(fromAddress: string) {
  const tokenId = BigInt(fromAddress);
  const data = encodeFunctionData({
    abi: ERC1155_ABI,
    functionName: "safeTransferFrom",
    args: [
      fromAddress as `0x${string}`,
      ESCROW,
      tokenId,
      BigInt(1),
      "0x",
    ],
  });
  return { to: HUB_V2, data, value: "0" };
}

export { ESCROW };
