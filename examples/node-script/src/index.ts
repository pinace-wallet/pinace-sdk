/**
 * End-to-end Pinace lifecycle (stub).
 *
 * Sequence:
 *   1. Owner: create BalancePool
 *   2. Owner: deposit USDC
 *   3. Owner: attach agent with expiry
 *   4. Owner: attach spending-limit + token-whitelist policies
 *   5. Agent: propose + settle a swap action atomically
 *   6. Owner: revoke and confirm next agent action reverts
 */

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  buildAttachAgent,
  buildCreatePool,
  buildDeposit,
  PinaceClient,
  policies,
} from '@pinace/core';
import { PinaceAgent } from '@pinace/agent-sdk';

const packageId = process.env.PINACE_PACKAGE_ID ?? '0x0';
const network = (process.env.SUI_NETWORK ?? 'testnet') as 'mainnet' | 'testnet' | 'devnet';

async function main(): Promise<void> {
  const suiClient = new SuiClient({ url: getFullnodeUrl(network) });
  const owner = Ed25519Keypair.generate();
  const agent = Ed25519Keypair.generate();

  console.log('owner:', owner.toSuiAddress());
  console.log('agent:', agent.toSuiAddress());

  // 1. Create pool
  const createTx = new Transaction();
  buildCreatePool({ tx: createTx, packageId });
  // Submit createTx, parse PoolCreatedEvent for poolId — left to the integrator.
  console.log('Create pool PTB ready:', createTx.serialize());

  // 2-4. Deposit + attach agent + attach policies (sketch only)
  const setupTx = new Transaction();
  const poolId = '0xPOOL_ID_AFTER_CREATE';
  const usdcCoinId = '0xUSDC_COIN_ID';
  buildDeposit({
    tx: setupTx,
    packageId,
    poolId,
    coinType: '0x...::usdc::USDC',
    coinArg: setupTx.object(usdcCoinId),
  });
  buildAttachAgent({
    tx: setupTx,
    packageId,
    poolId,
    agent: agent.toSuiAddress(),
    expiresMs: BigInt(Date.now() + 24 * 60 * 60 * 1000),
  });
  policies.spendingLimit.buildAttach({
    tx: setupTx,
    packageId,
    poolId,
    agent: agent.toSuiAddress(),
    config: { maxPerTx: 100_000_000n, maxPerWindow: 1_000_000_000n, windowMs: 60_000n },
  });
  console.log('Setup PTB ready:', setupTx.serialize());

  // 5. Agent proposes + settles
  const runtimeAgent = new PinaceAgent({
    suiClient,
    signer: agent,
    packageId,
    poolId,
  });

  // Once contracts are deployed, uncomment:
  //
  // const result = await runtimeAgent.proposeAndSettle({
  //   kind: 'swap',
  //   coinIn: '0x...::usdc::USDC',
  //   coinOut: '0x2::sui::SUI',
  //   amountIn: 10_000_000n,
  //   quotedAmountOut: 3_500_000_000n,
  //   minAmountOut: 3_400_000_000n,
  //   deadlineMs: BigInt(Date.now() + 60_000),
  //   policies: ['spendingLimit', 'tokenWhitelist'],
  // });
  // console.log('Swap settled:', result.digest);

  const read = new PinaceClient({ suiClient, packageId });
  console.log('Read client ready:', read.packageId, '| agent ref:', runtimeAgent.poolId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
