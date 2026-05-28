# @pinace/core

Foundation layer for the Pinace SDK — TypeScript types mirroring Move structs, low-level PTB builders, on-chain read client, and policy helpers.

This package is intentionally low-level. Most agent-side code should consume [`@pinace/agent-sdk`](../agent-sdk) instead. The Pinace browser extension consumes this package directly for fine-grained control over wallet flows.

## Install

```bash
pnpm add @pinace/core @mysten/sui
```

`@mysten/sui` is a peer dependency.

## Modules

| Subpath | Purpose |
|---|---|
| `@pinace/core` | Re-exports everything below |
| `@pinace/core/types` | TypeScript mirrors of on-chain Move structs (`Action`, `BalancePool`, `Delegation`, ...) and event payloads |
| `@pinace/core/ptb` | PTB builders for every owner + agent entry point (`createPool`, `deposit`, `attachAgent`, `proposeAction`, `settleAction`, ...) |
| `@pinace/core/policies` | Helpers for the four bundled example policies (`spendingLimit`, `tokenWhitelist`, `slippageGuard`, `timeWindow`) |

## Status

🚧 Pre-alpha — API will change as the V1 Move contracts stabilize. See the [contracts repo](https://github.com/pinace-wallet/contracts) for the source of truth on protocol semantics.

## License

MIT
