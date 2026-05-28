# Getting started with Pinace SDK

This guide walks through the core Pinace flow from a TypeScript app: create a pool, attach an agent with bounded policies, and have the agent execute an action atomically.

## Mental model

Pinace is a **delegation protocol** — a user lets an AI agent execute on-chain actions on their behalf, but every action is bounded by on-chain policies. There is no private key sharing.

The three roles:

- **User** owns the `BalancePool` (escrow) and decides which agents and policies are active.
- **Agent** holds its own keypair, calls `propose_action`, attaches policy receipts in the same PTB, then calls `settle_action`.
- **Developer** publishes policy contracts and integrates the SDK into wallets or agent runtimes.

The three on-chain primitives:

- `BalancePool` — shared escrow object holding user-deposited assets.
- `Delegation` — per-agent record holding policy bindings.
- `Request` (hot-potato) — created by `propose_action`, consumed by `settle_action`, cannot be dropped mid-PTB.

## Install

```bash
pnpm add @pinace/core @pinace/agent-sdk @mysten/sui
```

## End-to-end snippet

```ts
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  buildAttachAgent,
  buildCreatePool,
  buildDeposit,
  policies,
} from '@pinace/core';
import { PinaceAgent } from '@pinace/agent-sdk';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
const owner = Ed25519Keypair.generate();
const agent = Ed25519Keypair.generate();

// Step 1 — create pool
const createTx = new Transaction();
buildCreatePool({ tx: createTx, packageId: PINACE_PACKAGE_ID });
const createResult = await suiClient.signAndExecuteTransaction({
  signer: owner,
  transaction: createTx,
  options: { showEffects: true, showEvents: true },
});
const poolId = poolIdFrom(createResult); // parse from PoolCreatedEvent

// Step 2 — deposit + attach agent + attach policies
const setupTx = new Transaction();
buildDeposit({ tx: setupTx, packageId, poolId, coinType, coinArg });
buildAttachAgent({ tx: setupTx, packageId, poolId, agent: agent.toSuiAddress(), expiresMs });
policies.spendingLimit.buildAttach({ tx: setupTx, packageId, poolId, agent: agent.toSuiAddress(), config });
await suiClient.signAndExecuteTransaction({ signer: owner, transaction: setupTx });

// Step 3 — agent executes
const runtime = new PinaceAgent({ suiClient, signer: agent, packageId, poolId });
const result = await runtime.proposeAndSettle({
  kind: 'swap',
  coinIn: '0x...::usdc::USDC',
  coinOut: '0x2::sui::SUI',
  amountIn: 10_000_000n,
  quotedAmountOut: 3_500_000_000n,
  minAmountOut: 3_400_000_000n,
  deadlineMs: BigInt(Date.now() + 60_000),
  policies: ['spendingLimit'],
});
```

## Where to go next

- [`@pinace/core` README](../packages/core/README.md) for the full PTB builder catalog.
- [`@pinace/agent-sdk` README](../packages/agent-sdk/README.md) for higher-level agent ergonomics.
- [`examples/node-script`](../examples/node-script) for the runnable lifecycle script.
- [`examples/mcp-server`](../examples/mcp-server) for LLM tool integration via MCP.
- [Contracts repo](https://github.com/pinace-wallet/contracts) for protocol semantics, invariants, and audit checklist.
