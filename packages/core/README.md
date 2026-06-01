# @pinace/core

Foundation SDK for the Pinace delegation protocol on Sui. TypeScript types mirroring Move structs, low-level PTB builders, on-chain read client, and helpers for the four bundled example policies.

This package is intentionally low-level. Most agent-side code should consume [`@pinace/agent-sdk`](../agent-sdk) instead. The Pinace browser extension consumes this package directly for fine-grained control over wallet flows.

## Install

```bash
pnpm add @pinace/core @mysten/sui
# or
npm install @pinace/core @mysten/sui
```

`@mysten/sui` is a peer dependency.

## Modules

| Subpath | Purpose |
|---|---|
| `@pinace/core` | Re-exports everything below |
| `@pinace/core/types` | TypeScript mirrors of on-chain Move structs (`Action`, `BalancePool`, `Delegation`, ...) and event payloads |
| `@pinace/core/ptb` | PTB builders for every owner + agent entry point (`createPool`, `deposit`, `connectAgent`, `attachPolicy`, `proposeAction`, `settleAction`, ...) |
| `@pinace/core/policies` | Helpers for the four bundled example policies (`spendingLimit`, `tokenWhitelist`, `slippageGuard`, `timeWindow`) |

## Quick start

### 1. Create a pool (owner)

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { buildCreatePool, PACKAGE_IDS } from '@pinace/core';

const suiClient = new SuiGrpcClient({
  network: 'testnet',
  baseUrl: 'https://fullnode.testnet.sui.io:443',
});
const owner = Ed25519Keypair.fromSecretKey(process.env.OWNER_SECRET_KEY!);

const tx = new Transaction();
buildCreatePool({ tx, packageId: PACKAGE_IDS.testnet });
const result = await suiClient.signAndExecuteTransaction({
  signer: owner,
  transaction: tx,
  include: { effects: true, events: true, objectTypes: true },
});
// Find the new BalancePool id by reading the PoolCreatedEvent from result.Transaction.events
```

### 2. Deposit funds + connect an agent + attach a policy

```ts
import {
  buildAttachPolicy,
  buildConnectAgent,
  buildDeposit,
  POLICY_REGISTRATION_IDS,
} from '@pinace/core';
import * as policies from '@pinace/core/policies';

const tx = new Transaction();
const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(50_000_000n)]); // 0.05 SUI

buildDeposit({
  tx,
  packageId: PACKAGE_IDS.testnet,
  poolId,
  coinType: '0x2::sui::SUI',
  coinArg: coin,
});

buildConnectAgent({
  tx,
  packageId: PACKAGE_IDS.testnet,
  poolId,
  agent: agentAddress,
  expiresMs: BigInt(Date.now() + 24 * 60 * 60 * 1000),
});

const slConfig = policies.spendingLimit.buildNewConfig({
  tx,
  packageId: PACKAGE_IDS.testnet,
  config: { maxPerTx: 20_000_000n, maxPerWindow: 50_000_000n, windowMs: 60_000n },
});

buildAttachPolicy({
  tx,
  packageId: PACKAGE_IDS.testnet,
  poolId,
  agent: agentAddress,
  witnessType: policies.spendingLimit.witnessType(PACKAGE_IDS.testnet),
  configType: policies.spendingLimit.configType(PACKAGE_IDS.testnet),
  registrationId: POLICY_REGISTRATION_IDS.testnet.spendingLimit,
  configArg: slConfig,
});

await suiClient.signAndExecuteTransaction({ signer: owner, transaction: tx });
```

### 3. Agent proposes + settles an action (atomic PTB)

```ts
import { ActionKind, buildProposeAction, buildSettleAction } from '@pinace/core';
import { buildPolicyProves, spendingLimit, tokenWhitelist } from '@pinace/core/policies';

const tx = new Transaction();
const request = buildProposeAction({
  tx,
  packageId: PACKAGE_IDS.testnet,
  poolId,
  coinInType: '0x2::sui::SUI',
  coinOutType: '0x2::sui::SUI',
  kind: ActionKind.Generic,
  amountIn: 10_000_000n,
  quotedAmountOut: 10_000_000n,
  minAmountOut: 10_000_000n,
  deadlineMs: BigInt(Date.now() + 60_000),
  routeHash: new Uint8Array(),
  memo: 'demo',
});

buildPolicyProves({
  tx,
  poolId,
  request,
  policies: [
    spendingLimit.policyInstance(PACKAGE_IDS.testnet),
    tokenWhitelist.policyInstance(PACKAGE_IDS.testnet),
  ],
});

buildSettleAction({ tx, packageId: PACKAGE_IDS.testnet, poolId, request });

await suiClient.signAndExecuteTransaction({ signer: agent, transaction: tx });
```

#### Plugging in a custom policy contract

Any policy module that exposes `public fun prove(pool, request, ...)` works with `buildPolicyProves` — just describe it as a `PolicyInstance`:

```ts
import { buildPolicyProves, type PolicyInstance } from '@pinace/core/policies';

const myWhitelistPolicy: PolicyInstance = {
  packageId: '0xMY_CUSTOM_POLICY_PKG',
  module: 'address_whitelist_policy',
  needsClock: false,
};

buildPolicyProves({
  tx,
  poolId,
  request,
  policies: [
    spendingLimit.policyInstance(PACKAGE_IDS.testnet),
    myWhitelistPolicy,
  ],
});
```

### 4. Revoke an agent (1-click hero demo)

```ts
import { buildRevokeAgent } from '@pinace/core';

const tx = new Transaction();
buildRevokeAgent({
  tx,
  packageId: PACKAGE_IDS.testnet,
  poolId,
  agent: agentAddress,
  reason: new TextEncoder().encode('emergency stop'),
});
await suiClient.signAndExecuteTransaction({ signer: owner, transaction: tx });
// Next agent action on this pool now reverts with MoveAbort in delegation::assert_active
```

### 5. Read pool state

```ts
import { PinaceClient } from '@pinace/core';

const read = new PinaceClient({
  suiClient,
  packageId: PACKAGE_IDS.testnet,
});

const summary = await read.getPoolSummary(poolId);
console.log(summary);
// { id: '0x…', owner: '…', status: 1, delegationCount: 0 }
```

## Constants

| Constant | Purpose |
|---|---|
| `PACKAGE_IDS.testnet` / `.mainnet` | Deployed `core` Move package ids per network |
| `POLICY_REGISTRATION_IDS.testnet.<policy>` | Shared `PolicyRegistration<Witness>` object ids for each bundled policy |
| `ActionKind.{Generic, Swap, Withdraw, Deposit}` | Mirror of `core::action` kind constants |
| `PoolStatus.{Active, Paused, Revoked}` | Mirror of `core::balance_pool` status constants |
| `DelegationStatus.{Active, Paused, Revoked}` | Mirror of `core::delegation` status constants |
| `EventTypes.{PoolCreated, AgentConnected, AgentRevoked, ...}` | Useful for indexer event filters |

## Full end-to-end example

See [`examples/node-script`](https://github.com/pinace-wallet/pinace-sdk/tree/main/examples/node-script) in the monorepo — runs the complete lifecycle (create → deposit → connect agent → attach policies → propose+settle → revoke → prove revert) against testnet in one command.

## Status

🚧 Active development — API stable for the V1 deployed contract surface. Will be marked `1.0.0` when contracts deploy to mainnet. See the [contracts repo](https://github.com/pinace-wallet/contracts) for protocol semantics.

## Versioning

Auto-published to npm on every push to `main`. Each release bumps the minor version (`0.X.0`). For deeper protocol changes a major bump is published manually.

## License

MIT
