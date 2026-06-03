# Frontend integration — Wallet UI

Hướng dẫn integrate `@pinace/core` vào Pinace browser extension (WXT + React, Hulk's team). Cover toàn bộ owner-side flows (UC01-UC07). Agent-side execution (UC08/UC09) đang block vì Dex Agent POC — xem section [Pending](#pending).

## ✅ Sẵn sàng integrate ngay

| Use case | Spec ref | Status |
|---|---|---|
| Create pool + connect agent (1 PTB) | UC01 | ✅ |
| Deposit assets vào pool | setup | ✅ |
| Withdraw assets ra wallet | — | ✅ |
| Attach policy (spending limit / whitelist / slippage / time window) | UC03 | ✅ |
| Update policy config | UC07 | ✅ |
| Remove policy | UC04 | ✅ |
| Revoke agent (UC02 / UC06) | UC02, UC06 | ✅ |
| Generate ephemeral agent keypair | UC01 | ✅ (browser-side) |

## ❌ Pending — chưa integrate được

| Cần | Block bởi | Owner |
|---|---|---|
| Agent execute swap/withdraw (UC08, UC09) | `@pinace/agent-sdk` chưa publish — đợi Dex Agent POC định nghĩa final API | John (sau khi Wyner/Hulk wire Dex Agent) |
| Milestone timeline (UC05) | Indexer chưa expose API | Wyner |
| List pools của user (`listPoolsByOwner`) | Indexer required | Wyner |
| Active policies cho 1 agent (`getPolicies`) | Indexer required | Wyner |
| Pool balance / status real-time | `PinaceClient.getPool` hiện return stub (owner='', status=0, empty maps) — đợi indexer | Wyner |
| Policy Marketplace listing | Offchain registry chưa build | TBD |

## Install

```bash
pnpm add @pinace/core @mysten/sui @mysten/dapp-kit
```

`@mysten/sui` peerDep. Browser dùng `SuiClient` (JSON-RPC) hoặc `SuiGrpcClient` (recommended, JSON-RPC sunset 2026-07-31).

## Setup

```ts
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { PACKAGE_IDS, PinaceClient } from '@pinace/core';

const network = 'testnet';
const suiClient = new SuiGrpcClient({
  network,
  baseUrl: `https://fullnode.${network}.sui.io:443`,
});
const packageId = PACKAGE_IDS.testnet; // 0x48fe6e0...
const read = new PinaceClient({ suiClient, packageId });
```

## Wallet flows (owner-side)

Owner signer = browser wallet (Suiet / Sui Wallet via `@mysten/dapp-kit`) hoặc zkLogin via Enoki. Tất cả `build*` functions return PTB → submit qua `useSignAndExecuteTransaction()` từ dapp-kit.

### UC01 — Connect Agent (1 PTB: create pool + connect + attach guards)

```ts
import { Transaction } from '@mysten/sui/transactions';
import {
  buildCreatePool, buildConnectAgent, buildAttachPolicy, buildDeposit,
} from '@pinace/core';
import * as policies from '@pinace/core/policies';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// 1. Generate agent keypair (lưu encrypted trong extension storage)
const agentKeypair = Ed25519Keypair.generate();
const agentAddress = agentKeypair.toSuiAddress();
// → persist `agentKeypair.getSecretKey()` vào secure storage

// 2. Build setup PTB
const tx = new Transaction();
buildCreatePool({ tx, packageId });
// Note: poolId chỉ available SAU khi tx executed (parse từ PoolCreatedEvent).
// Để kết nối agent + attach policy trong CÙNG PTB, dùng 2-tx flow:
//   tx1: createPool → parse event → poolId
//   tx2: deposit + connectAgent + attachPolicy

// Tx2 example:
const setupTx = new Transaction();
const [coin] = setupTx.splitCoins(setupTx.gas, [setupTx.pure.u64(1_000_000_000n)]);
buildDeposit({ tx: setupTx, packageId, poolId, coinType: '0x2::sui::SUI', coinArg: coin });
buildConnectAgent({
  tx: setupTx, packageId, poolId, agent: agentAddress,
  expiresMs: BigInt(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
});

const slConfig = policies.spendingLimit.buildNewConfig({
  tx: setupTx, packageId,
  config: { maxPerTx: 100_000_000n, maxPerWindow: 500_000_000n, windowMs: 86_400_000n },
});
buildAttachPolicy({
  tx: setupTx, packageId, poolId, agent: agentAddress,
  witnessType: policies.spendingLimit.witnessType(packageId),
  configType: policies.spendingLimit.configType(packageId),
  configArg: slConfig,
});
```

### UC02 / UC06 — Disconnect / Revoke Agent

```ts
import { buildRevokeAgent } from '@pinace/core';

const tx = new Transaction();
buildRevokeAgent({
  tx, packageId, poolId, agent: agentAddress,
  reason: new TextEncoder().encode('user-revoked-via-ui'),
});
// → execute. Sau khi confirm, mọi tx từ agent reverts với MoveAbort code 5 (delegation::assert_active).
```

### UC03 — Add Policy

```ts
import { buildAttachPolicy } from '@pinace/core';
import * as policies from '@pinace/core/policies';

const tx = new Transaction();

// Token whitelist: chỉ cho phép swap SUI ↔ USDC
const twConfig = policies.tokenWhitelist.buildNewConfig({
  tx, packageId,
  config: {
    allowedInputs: ['0x2::sui::SUI', '0x...::usdc::USDC'],
    allowedOutputs: ['0x2::sui::SUI', '0x...::usdc::USDC'],
  },
});
buildAttachPolicy({
  tx, packageId, poolId, agent: agentAddress,
  witnessType: policies.tokenWhitelist.witnessType(packageId),
  configType: policies.tokenWhitelist.configType(packageId),
  configArg: twConfig,
});
```

Built-in policies: `spendingLimit`, `tokenWhitelist`, `slippageGuard`, `timeWindow`. Mỗi cái có `buildNewConfig({ config })` + `witnessType()` + `configType()`.

### UC04 — Remove Policy

```ts
import { buildRemovePolicy } from '@pinace/core';
import * as policies from '@pinace/core/policies';

buildRemovePolicy({
  tx, packageId, poolId, agent: agentAddress,
  witnessType: policies.tokenWhitelist.witnessType(packageId),
  configType: policies.tokenWhitelist.configType(packageId),
});
```

### UC07 — Update Policy

```ts
import { buildUpdatePolicy } from '@pinace/core';

const newConfig = policies.spendingLimit.buildNewConfig({
  tx, packageId,
  config: { maxPerTx: 200_000_000n, maxPerWindow: 1_000_000_000n, windowMs: 86_400_000n },
});
buildUpdatePolicy({
  tx, packageId, poolId, agent: agentAddress,
  witnessType: policies.spendingLimit.witnessType(packageId),
  configType: policies.spendingLimit.configType(packageId),
  configArg: newConfig,
});
```

### Deposit / Withdraw

```ts
import { buildDeposit, buildOwnerWithdraw } from '@pinace/core';

// Deposit
const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(100_000_000n)]);
buildDeposit({ tx, packageId, poolId, coinType: '0x2::sui::SUI', coinArg: coin });

// Withdraw (Coin<T> auto-transferred to recipient trong cùng PTB)
buildOwnerWithdraw({
  tx, packageId, poolId, coinType: '0x2::sui::SUI',
  amount: 50_000_000n,
  recipient: ownerAddress,
});
```

## Read state

`PinaceClient` V1 chỉ confirm object exists + return type. **KHÔNG** parse owner / status / balances / delegations vì gRPC content unpacking deferred sang indexer.

```ts
const summary = await read.getPoolSummary(poolId);
// → { id, owner: '', status: 0, delegationCount: 0 }  ← stub values
```

→ Để hiển thị balance/status thật trong Wallet UI: **đợi indexer API** (Wyner). Tạm thời extension có thể parse events trực tiếp từ `signAndExecuteTransaction({ include: { events: true } })` để cập nhật optimistic.

## Event parsing (workaround tạm)

Sau mỗi successful tx, parse events từ response:

```ts
import { EventTypes } from '@pinace/core';

const result = await suiClient.signAndExecuteTransaction({
  signer, transaction: tx,
  include: { effects: true, events: true, objectTypes: true },
});

const poolCreated = result.Transaction?.events?.find(
  (e) => e.type.endsWith(`::events::${EventTypes.PoolCreated}`),
);
// poolCreated.parsedJson.pool_id → use cho subsequent calls
```

Event types có sẵn: `PoolCreated, Deposit, Withdraw, AgentConnected, AgentRevoked, PolicyAttached, PolicyUpdated, PolicyRemoved, ActionProposed, ActionSettled`.

## Reference

- **E2E test script**: `examples/node-script/src/index.ts` — đã verify full lifecycle trên testnet (commit 64a6749).
- **Contracts source of truth**: https://github.com/pinace-wallet/contracts
- **Auto-gen Move bindings**: `@pinace/contracts-sdk@0.1.0` — used internally bởi `@pinace/core`, không cần consume trực tiếp từ frontend.

