# @pinace/agent-sdk

High-level TypeScript SDK for **AI agents** that execute bounded actions through the Pinace delegation protocol on Sui.

Built on top of [`@pinace/core`](../core) — handles the hot-potato PTB ergonomics, policy receipt chaining, and signer plumbing so agent authors can focus on strategy.

## Install

```bash
pnpm add @pinace/agent-sdk @mysten/sui
```

## Quick example

```ts
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { PinaceAgent } from '@pinace/agent-sdk';

const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
const agentSigner = Ed25519Keypair.fromSecretKey(process.env.AGENT_SECRET_KEY!);

const agent = new PinaceAgent({
  suiClient,
  signer: agentSigner,
  packageId: '0x...',
  poolId: '0x...',
});

const result = await agent.proposeAndSettle({
  kind: 'swap',
  coinIn: '0x2::sui::SUI',
  coinOut: '0x...::usdc::USDC',
  amountIn: 100_000_000_000n, // 100 SUI
  quotedAmountOut: 285_000_000n,
  minAmountOut: 280_000_000n,
  deadlineMs: BigInt(Date.now() + 60_000),
  policies: ['spendingLimit', 'tokenWhitelist'],
});

console.log('Tx digest:', result.digest);
```

## Status

🚧 Pre-alpha. The agent-side adapter for DeepBook execution is intentionally out of scope for V1 of the core protocol — see the design doc in the [contracts repo](https://github.com/pinace-wallet/contracts).

## License

MIT
