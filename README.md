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
| [`examples/mcp-server`](./examples/mcp-server) | MCP server exposing Pinace agent actions as LLM tools |
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

## Publishing (auto)

`@pinace/core` is **auto-published to npm on every push to `main`**:

1. CI runs lint + typecheck + test + build
2. `packages/core/package.json` version bumps by **minor** (`0.X.0`)
3. `npm publish --access public`
4. Version bump committed back to `main` with tag `core-v0.X.0`

A commit message starting with `chore: release` is skipped (avoids the auto-bump loop).

### One-time setup (repo admin)

1. Create the `@pinace` org at [npmjs.com](https://www.npmjs.com/) (free for public packages)
2. Generate an automation token: npm → Access Tokens → Automation
3. Add it to repo secrets: `Settings → Secrets and variables → Actions → New repository secret`
   - Name: `NPM_TOKEN`
   - Value: paste the automation token

### Skipping auto-publish for a commit

Start the commit message with `chore: release` — used internally by the workflow's own version-bump commit.

## Architecture

Pinace SDK wraps the on-chain delegation protocol defined in [`pinace-wallet/contracts`](https://github.com/pinace-wallet/contracts). Refer to that repository for the Move contract design.

## License

[MIT](./LICENSE)
