# Pinace SDK

TypeScript SDK for the Pinace agent delegation protocol on Sui.

## Packages

| Package | Description |
|---|---|
| [`@pinace/core`](./packages/core) | Foundation — TypeScript types mirroring Move structs, PTB builders, read client, policy helpers |
| [`@pinace/agent-sdk`](./packages/agent-sdk) | Developer surface for building AI agents that execute bounded actions through Pinace |

## Examples

| Example | Description |
|---|---|
| [`examples/node-script`](./examples/node-script) | Minimal Node script: create pool → attach agent → propose action → settle |

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
# Run all packages in watch mode
pnpm dev

# Lint + format
pnpm lint
pnpm format

# Manual version bump (only needed if you want a major/patch instead of the default minor)
pnpm changeset
```

## Architecture

Pinace SDK wraps the on-chain delegation protocol defined in [`pinace-wallet/contracts`](https://github.com/pinace-wallet/contracts). Refer to that repository for the Move contract design.

## License

[MIT](./LICENSE)
