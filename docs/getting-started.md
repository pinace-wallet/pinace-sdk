# Getting started with Pinace SDK

Walkthrough end-to-end Pinace flow: create pool → attach agent + policies → agent executes bounded action.

> **Frontend / Wallet UI integrators**: see [`frontend-integration.md`](./frontend-integration.md) for browser-side patterns (zkLogin, dapp-kit, ephemeral agent keys, pending blockers).

## Mental model

Pinace là **delegation protocol** — user cho AI agent execute on-chain actions thay user, nhưng mọi action bounded bởi on-chain policies. KHÔNG share private key.

3 roles:

- **User** owns `BalancePool` (escrow), decides agents + policies active.
- **Agent** giữ keypair riêng, gọi `propose_action` → attach policy receipts cùng PTB → `settle_action`.
- **Developer** publish policy contracts + integrate SDK vào wallets/agent runtimes.

3 on-chain primitives:

- `BalancePool` — shared escrow object chứa user-deposited assets.
- `Delegation` — per-agent record chứa policy bindings.
- `Request` (hot-potato) — created bởi `propose_action`, consumed bởi `settle_action`, không drop được giữa PTB.

## Install

```bash
pnpm add @pinace/core @mysten/sui
```

`@mysten/sui` là peer dependency. `@pinace/agent-sdk` chưa publish — đợi Dex Agent POC finalize API.

## End-to-end snippet (Node — owner + agent same machine)

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  ActionKind,
  buildAttachPolicy,
  buildConnectAgent,
  buildCreatePool,
  buildDeposit,
  buildProposeAction,
  buildSettleAction,
  PACKAGE_IDS,
} from '@pinace/core';
import * as policies from '@pinace/core/policies';
import { buildPolicyProves } from '@pinace/core/policies';

const suiClient = new SuiGrpcClient({
  network: 'testnet',
  baseUrl: 'https://fullnode.testnet.sui.io:443',
});
const packageId = PACKAGE_IDS.testnet;
const owner = Ed25519Keypair.fromSecretKey(process.env.OWNER_SECRET_KEY!);
const agent = Ed25519Keypair.fromSecretKey(process.env.AGENT_SECRET_KEY!);

// 1. Create pool (poolId parsed from PoolCreatedEvent in tx response)
const createTx = new Transaction();
buildCreatePool({ tx: createTx, packageId });
const createRes = await suiClient.signAndExecuteTransaction({
  signer: owner, transaction: createTx,
  include: { effects: true, events: true, objectTypes: true },
});
const poolId = parsePoolIdFromEvents(createRes); // helper — see examples/node-script

// 2. Owner: deposit + connect agent + attach spending-limit policy (atomic)
const setupTx = new Transaction();
const [coin] = setupTx.splitCoins(setupTx.gas, [setupTx.pure.u64(50_000_000n)]);
buildDeposit({ tx: setupTx, packageId, poolId, coinType: '0x2::sui::SUI', coinArg: coin });
buildConnectAgent({
  tx: setupTx, packageId, poolId,
  agent: agent.toSuiAddress(),
  expiresMs: BigInt(Date.now() + 24 * 60 * 60 * 1000),
});

const slConfig = policies.spendingLimit.buildNewConfig({
  tx: setupTx, packageId,
  config: { maxPerTx: 20_000_000n, maxPerWindow: 50_000_000n, windowMs: 60_000n },
});
buildAttachPolicy({
  tx: setupTx, packageId, poolId,
  agent: agent.toSuiAddress(),
  witnessType: policies.spendingLimit.witnessType(packageId),
  configType: policies.spendingLimit.configType(packageId),
  configArg: slConfig,
});

await suiClient.signAndExecuteTransaction({ signer: owner, transaction: setupTx });

// 3. Agent: propose + prove + settle (atomic PTB)
const actionTx = new Transaction();
const request = buildProposeAction({
  tx: actionTx, packageId, poolId,
  coinInType: '0x2::sui::SUI',
  coinOutType: '0x2::sui::SUI',
  kind: ActionKind.Generic,
  amountIn: 10_000_000n,
  quotedAmountOut: 10_000_000n,
  minAmountOut: 9_500_000n,
  deadlineMs: BigInt(Date.now() + 60_000),
  routeHash: new Uint8Array(),
  memo: 'demo',
});
buildPolicyProves({
  tx: actionTx, poolId, request,
  policies: [policies.spendingLimit.policyInstance(packageId)],
});
buildSettleAction({ tx: actionTx, packageId, poolId, request });

await suiClient.signAndExecuteTransaction({ signer: agent, transaction: actionTx });
```

## Built-in policies

| Module | Helper | Constraint |
|---|---|---|
| `spending_limit_policy` | `policies.spendingLimit` | max per tx + max per rolling window |
| `token_whitelist_policy` | `policies.tokenWhitelist` | allowed coin in/out types |
| `slippage_guard_policy` | `policies.slippageGuard` | max slippage bps |
| `time_window_policy` | `policies.timeWindow` | active time range |

Mỗi policy expose `buildNewConfig({ config })`, `witnessType(packageId)`, `configType(packageId)`, `policyInstance(packageId)`. `buildPolicyProves` dispatch tất cả `prove` calls dựa trên `PolicyInstance[]`.

## Where to go next

- [`frontend-integration.md`](./frontend-integration.md) — Wallet UI / browser extension patterns + pending blockers.
- [`@pinace/core` README](../packages/core/README.md) — full PTB builder catalog.
- [`examples/node-script`](../examples/node-script) — runnable lifecycle script (verified on testnet).
- [Contracts repo](https://github.com/pinace-wallet/contracts) — Move protocol semantics, invariants.
- [`@pinace/contracts-sdk`](https://www.npmjs.com/package/@pinace/contracts-sdk) — auto-gen Move bindings (consumed internally bởi `@pinace/core`).
