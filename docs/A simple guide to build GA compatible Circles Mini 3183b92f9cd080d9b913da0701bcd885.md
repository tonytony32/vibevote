# A simple guide to build GA compatible Circles MiniApps

> MiniApps are simple iframe apps which enables you to use existing Gnosis App passkeys.
> 

User journey flow is as follows:

- User lands at https://circles.gnosis.io/miniapps
- Opens an app already listed or loads a locally hosted app using the advanced tab
- Logs in and signs transactions using their Gnosis App passkey for the respective apps’ logic

Tools you require:

- A Gnosis App account with a registered circles v2 human avatar
- Circles MiniApp SDK ([https://www.npmjs.com/package/@aboutcircles/miniapp-sdk](https://www.npmjs.com/package/@aboutcircles/miniapp-sdk))
    
    This sdk acts a postMessage bridge between you Miniapp(running in an iframe) and the host( the environment where your miniapps run)
    
    This sdk gives you 4 things:
    
    - detect whether you’re inside the host (isMiniappMode)
    - receive host-provided data (onAppData)
    - react to wallet connect/disconnect (onWalletChange)
    - ask the host to **send tx(s)** (sendTransactions) or **sign a message** (signMessage)
    
    You don’t “build/signed/send” like a normal wallet library.
    
    You just give the host a list of **instructions**:
    
    ```
    type Transaction = {
      to: string;      // where to send (contract or wallet)
      data?: string;   // optional calldata for contract calls (0x...)
      value?: string;  // optional native token amount (wei as a string)
    }
    ```
    
    Then call:
    
    ```
    sendTransactions([tx1, tx2, ...]) -> Promise<string[]> // tx hashes
    ```
    
    ---
    
    ## **1) Native token transfer example**
    
    Send xDAI/ETH to an address:
    
    ```
    import { sendTransactions } from "@aboutcircles/miniapp-sdk";
    
    const hashes = await sendTransactions([
      {
        to: "0xRecipientAddress",
        value: "10000000000000000", // 0.01 ETH/xDAI in wei
        // no data
      },
    ]);
    
    console.log(hashes);
    ```
    
    ---
    
    ## **2) Contract call example**
    
    If you’re calling a contract, you put the encoded calldata in data.
    
    Example: ERC20 transfer(to, amount) using **viem**:
    
    ```
    import { sendTransactions } from "@aboutcircles/miniapp-sdk";
    import { encodeFunctionData, parseUnits } from "viem";
    
    const erc20Abi = [
      {
        type: "function",
        name: "transfer",
        stateMutability: "nonpayable",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
      },
    ] as const;
    
    const token = "0xTokenAddress";
    const recipient = "0xRecipientAddress";
    const amount = parseUnits("10", 18); // 10 tokens (18 decimals)
    
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient, amount],
    });
    
    const hashes = await sendTransactions([
      { to: token, data, value: "0" }, // value usually "0" for ERC20 calls
    ]);
    
    console.log(hashes);
    ```
    
    ---
    
    ## **3) Batch multiple transactions**
    
    Just pass more than one entry:
    
    ```
    import { sendTransactions } from "@aboutcircles/miniapp-sdk";
    
    const hashes = await sendTransactions([
      { to: "0xContractA", data: "0xabc...", value: "0" },
      { to: "0xContractB", data: "0xdef...", value: "0" },
    ]);
    
    console.log(hashes); // array of hashes
    ```
    
    ---
    
    ## **4) Handling success / rejection**
    
    ```
    try {
      const hashes = await sendTransactions(txs);
      // success
    } catch (e: any) {
      // user rejected or host rejected
      console.log(e.message); // "Rejected" or reason
    }
    ```
    
    ---
    
- Circles Org Account (highly recommended for accepting payments and payouts)

## MiniApp Architecture

A miniApp generally has the following 5 systems:

1. Client UI (state, status, actions)
2. Wallet transaction execution (`@aboutcircles/miniapp-sdk`)
3. Backend API (validation + state machine) - This can also be replaced by on-chain smart-contracts
4. Persistent storage (Supabase, IPFS, etc.)
5. Verification + On-chain Payouts (Org Driven)

Any miniApps which wants to implement automated payouts, should use its own unique Circles org account which can be created and managed using this - [https://circles.gnosis.io/miniapps/miniapps-org-manager](https://circles.gnosis.io/miniapps/miniapps-org-manager)

For automated payouts, using the above MiniApp, you can add and fund EOA which you can use it in your backend to sign those transactions. 

## MiniApp Practical Example (Heads or Tails App)

Example - [https://circles.gnosis.io/miniapps/coinflip-game](https://circles.gnosis.io/miniapps/coinflip-game)

Code - [https://github.com/aboutcircles/circles-gnosisApp-starter-kit/tree/coinflip-miniapp](https://github.com/aboutcircles/circles-gnosisApp-starter-kit/tree/coinflip-miniapp)

Example miniApp flow:

1. Start with one clear loop: connect wallet -> start round -> pay -> resolve -> show result.
2. Define a strict state machine first (awaiting_payment, resolving, completed) and enforce transitions on backend/contract only.
3. Keep payment logic server-side (or contract-side), not UI-side; client should only execute returned transactions.
4. Validate Miniapp SDK payloads before sending: to address, data hex, value hex (0x...).
5. Make settlement idempotent so retries cannot create duplicate payouts.
6. Treat timeouts as “unknown,” not failure; poll and reconcile with chain events/history.
7. Store full round audit data (roundId, player, txHash, status changes, timestamps) for debugging and support.
8. Add DB constraints early (for example, one active round per player) to prevent race-condition bugs.
9. Show economics clearly in UI (entry fee, reward, and outcome rules) before users tap.
10. Design failure UX carefully: rejected signature, delayed confirmation, and retry/resume flows.
11. Keep secrets off client completely; private keys only in secure server env or remove keys via contract escrow model.
12. Ship in phases: UI mock -> API + DB -> tx send -> verification -> payout -> monitoring.
- App lifecycle
    
    ```mermaid
    flowchart TD
      A[User picks heads/tails] --> B[POST create round]
      B --> C[Backend returns payment payload]
      C --> D[Client calls sendTransactions]
      D --> E[Client reports tx hash]
      E --> F[Backend resolves round]
      F --> G[If win, backend executes payout]
      G --> H[Round stored as completed]
    ```
    

## VibeCoding steps (for non-technical people)

- Figure out why you want to build (It’s often a good idea to map out the tech stack and logic flow in a structured output before beginning your vibe-coding session. Then you can use that output to begin your vibe-coding session).
- Use this repo as your base - [https://github.com/aboutcircles/circles-gnosisApp-starter-kit/tree/coinflip-miniapp](https://github.com/aboutcircles/circles-gnosisApp-starter-kit/tree/coinflip-miniapp)
- If you require automated payouts dedicated address/org for your app, create an org using the [org manager app](https://circles.gnosis.io/miniapps/miniapps-org-manager)
- if you require automated payouts, Create a new EOA (using a wallet) and connect it to your org as a signer and fund it from that app
- Update the private key in your fork of the repo/settings
- Copy this guide (you can export as markdown) into the context of your favourite tool