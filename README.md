# Pinace SDK

TypeScript SDK for the [Pinace](https://pinace.xyz) agent-delegation protocol on Sui.

- **Move package** (testnet): `0x5be5ab02…2a751a23b`
- **npm**: [`@pinace/core`](https://www.npmjs.com/package/@pinace/core) v0.5

## Packages

| Package | What it gives you |
|---|---|
| [`@pinace/core`](./packages/core) | TypeScript types mirroring Move structs · PTB builders · read client · policy helpers |
| [`@pinace/agent-sdk`](./packages/agent-sdk) | Higher-level surface for AI agents that execute bounded actions through Pinace |

## Examples

| Example | What it does |
|---|---|
| [`examples/node-script`](./examples/node-script) | Minimal Node script: create pool → attach agent → propose action → settle |

## Hot-potato PTB shape

Every action is one atomic PTB; the `Request` must be consumed in the same tx or the whole thing reverts.

```
propose_action → policy.prove → take_coin → venue::call → return_coin → settle
```

`@pinace/core` exposes builders for each leg — see [`packages/core/README.md`](./packages/core/README.md) for the full surface.

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Sui CLI (for local contract testing)

## Quick start

```bash
pnpm install
pnpm build
pnpm test
```

## Development

```bash
pnpm dev         # watch mode, all packages
pnpm lint
pnpm format
pnpm changeset   # only when overriding the default minor bump
```

## Architecture

Wraps the on-chain delegation protocol defined in [`pinace-wallet/contracts`](https://github.com/pinace-wallet/contracts). See that repo for the Move design.

## License

[MIT](./LICENSE)
