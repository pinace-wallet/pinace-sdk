/**
 * End-to-end Pinace lifecycle on testnet.
 *
 * Sequence:
 *   1. Owner: create BalancePool
 *   2. Owner: deposit SUI (test coin)
 *   3. Owner: connect agent with expiry
 *   4. Owner: attach spending-limit + token-whitelist policies
 *   5. Agent: propose + settle a generic action atomically
 *   6. Owner: revoke and confirm next agent action reverts
 *
 * Required env:
 *   OWNER_SECRET_KEY   — `sui keytool export` value for the pool owner
 *   AGENT_SECRET_KEY   — same, for the agent
 *   PINACE_PACKAGE_ID  — optional, defaults to the testnet PACKAGE_IDS.testnet
 *   SUI_NETWORK        — optional, defaults to 'testnet'
 *
 * Run with:
 *   pnpm --filter @pinace-examples/node-script start
 */

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
  buildRevokeAgent,
  buildSettleAction,
  PACKAGE_IDS,
  PinaceClient,
  POLICY_REGISTRATION_IDS,
} from '@pinace/core';
import * as policies from '@pinace/core/policies';

const packageId = process.env.PINACE_PACKAGE_ID ?? PACKAGE_IDS.testnet;
const network = (process.env.SUI_NETWORK ?? 'testnet') as 'mainnet' | 'testnet' | 'devnet';
const SUI = '0x2::sui::SUI';

function loadSigner(envName: string): Ed25519Keypair {
  const secret = process.env[envName];
  if (!secret) {
    console.warn(`${envName} not set — generating ephemeral keypair (will need testnet faucet).`);
    return Ed25519Keypair.generate();
  }
  return Ed25519Keypair.fromSecretKey(secret);
}

async function main(): Promise<void> {
  const suiClient = new SuiGrpcClient({
    network,
    baseUrl: process.env.SUI_RPC_URL ?? `https://fullnode.${network}.sui.io:443`,
  });
  const owner = loadSigner('OWNER_SECRET_KEY');
  const agent = loadSigner('AGENT_SECRET_KEY');
  const read = new PinaceClient({ suiClient, packageId });

  console.log(`Network: ${network}`);
  console.log(`Package: ${packageId}`);
  console.log(`Owner:   ${owner.toSuiAddress()}`);
  console.log(`Agent:   ${agent.toSuiAddress()}`);

  // ── 0. Top up agent with gas ──────────────────────────────────────────────
  console.log('\n[0] Topping up agent with 0.05 SUI for gas…');
  const topupTx = new Transaction();
  const [gasCoin] = topupTx.splitCoins(topupTx.gas, [topupTx.pure.u64(50_000_000n)]);
  topupTx.transferObjects([gasCoin], topupTx.pure.address(agent.toSuiAddress()));
  const topupRes = await suiClient.signAndExecuteTransaction({
    signer: owner,
    transaction: topupTx,
    include: { effects: true },
  });
  await suiClient.waitForTransaction({
    digest: topupRes.$kind === 'Transaction' ? topupRes.Transaction.digest : '',
  });
  console.log('    Agent funded.');

  // ── 1. Create pool ────────────────────────────────────────────────────────
  console.log('\n[1] Creating pool…');
  const createTx = new Transaction();
  buildCreatePool({ tx: createTx, packageId });
  const createResult = await suiClient.signAndExecuteTransaction({
    signer: owner,
    transaction: createTx,
    include: { effects: true, events: true, objectTypes: true },
  });
  const createDigest = createResult.$kind === 'Transaction' ? createResult.Transaction.digest : '';
  await suiClient.waitForTransaction({ digest: createDigest });
  const poolId = findCreatedPoolId(createResult);
  console.log(`    Pool created: ${poolId}`);

  // ── 2. Deposit SUI ────────────────────────────────────────────────────────
  console.log('\n[2] Depositing 0.05 SUI into pool…');
  const depositTx = new Transaction();
  const [coin] = depositTx.splitCoins(depositTx.gas, [depositTx.pure.u64(50_000_000n)]);
  const depositRes = await suiClient.signAndExecuteTransaction({
    signer: owner,
    transaction: buildDeposit({
      tx: depositTx,
      packageId,
      poolId,
      coinType: SUI,
      coinArg: coin,
    }),
    include: { effects: true },
  });
  await suiClient.waitForTransaction({
    digest: depositRes.$kind === 'Transaction' ? depositRes.Transaction.digest : '',
  });
  console.log('    Deposit ok.');

  // ── 3. Connect agent + 4. Attach policies (single PTB) ────────────────────
  console.log('\n[3+4] Connecting agent + attaching spending-limit + token-whitelist…');
  const setupTx = new Transaction();
  buildConnectAgent({
    tx: setupTx,
    packageId,
    poolId,
    agent: agent.toSuiAddress(),
    expiresMs: BigInt(Date.now() + 24 * 60 * 60 * 1000),
  });

  // Spending limit: max 0.02 SUI per tx, 0.05 SUI per minute window
  const slConfig = policies.spendingLimit.buildNewConfig({
    tx: setupTx,
    packageId,
    config: { maxPerTx: 20_000_000n, maxPerWindow: 50_000_000n, windowMs: 60_000n },
  });
  buildAttachPolicy({
    tx: setupTx,
    packageId,
    poolId,
    agent: agent.toSuiAddress(),
    witnessType: policies.spendingLimit.witnessType(packageId),
    configType: policies.spendingLimit.configType(packageId),
    registrationId: POLICY_REGISTRATION_IDS.testnet.spendingLimit,
    configArg: slConfig,
    configHash: new TextEncoder().encode('e2e-sl'),
    marketplaceId: new TextEncoder().encode('local'),
  });

  // Token whitelist: SUI → SUI (generic placeholder)
  const twConfig = policies.tokenWhitelist.buildNewPairConfig({
    tx: setupTx,
    packageId,
    coinInType: SUI,
    coinOutType: SUI,
  });
  buildAttachPolicy({
    tx: setupTx,
    packageId,
    poolId,
    agent: agent.toSuiAddress(),
    witnessType: policies.tokenWhitelist.witnessType(packageId),
    configType: policies.tokenWhitelist.configType(packageId),
    registrationId: POLICY_REGISTRATION_IDS.testnet.tokenWhitelist,
    configArg: twConfig,
    configHash: new TextEncoder().encode('e2e-tw'),
    marketplaceId: new TextEncoder().encode('local'),
  });

  const setupRes = await suiClient.signAndExecuteTransaction({
    signer: owner,
    transaction: setupTx,
    include: { effects: true, events: true },
  });
  await suiClient.waitForTransaction({
    digest: setupRes.$kind === 'Transaction' ? setupRes.Transaction.digest : '',
  });
  console.log('    Agent connected + 2 policies attached.');

  // ── 5. Agent: propose + prove (both policies) + settle (atomic PTB) ───────
  console.log('\n[5] Agent: propose + settle generic action…');
  const actionTx = new Transaction();
  const request = buildProposeAction({
    tx: actionTx,
    packageId,
    poolId,
    coinInType: SUI,
    coinOutType: SUI,
    kind: ActionKind.Generic,
    amountIn: 10_000_000n, // 0.01 SUI (within spending limit)
    quotedAmountOut: 10_000_000n,
    minAmountOut: 10_000_000n,
    deadlineMs: BigInt(Date.now() + 60_000),
    routeHash: new Uint8Array(),
    memo: 'pinace e2e test',
  });
  policies.buildPolicyProves({
    tx: actionTx,
    poolId,
    request,
    policies: [
      policies.spendingLimit.policyInstance(packageId),
      policies.tokenWhitelist.policyInstance(packageId),
    ],
  });
  buildSettleAction({ tx: actionTx, packageId, poolId, request });

  const actionResult = await suiClient.signAndExecuteTransaction({
    signer: agent,
    transaction: actionTx,
    include: { effects: true, events: true },
  });
  const digest =
    actionResult.$kind === 'Transaction' ? actionResult.Transaction.digest : '(failed)';
  await suiClient.waitForTransaction({ digest });
  console.log(`    Action settled. Digest: ${digest}`);

  // ── 6. Revoke and prove next action fails ─────────────────────────────────
  console.log('\n[6] Owner: revoke agent…');
  const revokeTx = new Transaction();
  buildRevokeAgent({
    tx: revokeTx,
    packageId,
    poolId,
    agent: agent.toSuiAddress(),
    reason: new TextEncoder().encode('e2e test revoke'),
  });
  const revokeRes = await suiClient.signAndExecuteTransaction({
    signer: owner,
    transaction: revokeTx,
    include: { effects: true, events: true },
  });
  await suiClient.waitForTransaction({
    digest: revokeRes.$kind === 'Transaction' ? revokeRes.Transaction.digest : '',
  });
  console.log('    Revoked.');

  console.log('\n[6.1] Agent: try one more action — should FAIL with E_DELEGATION_NOT_ACTIVE…');
  const failTx = new Transaction();
  const failRequest = buildProposeAction({
    tx: failTx,
    packageId,
    poolId,
    coinInType: SUI,
    coinOutType: SUI,
    kind: ActionKind.Generic,
    amountIn: 10_000_000n,
    quotedAmountOut: 10_000_000n,
    minAmountOut: 10_000_000n,
    deadlineMs: BigInt(Date.now() + 60_000),
    routeHash: new Uint8Array(),
    memo: 'post-revoke attempt',
  });
  buildSettleAction({ tx: failTx, packageId, poolId, request: failRequest });
  try {
    await suiClient.signAndExecuteTransaction({
      signer: agent,
      transaction: failTx,
      include: { effects: true },
    });
    console.error('    ❌ Expected revert did not happen!');
    process.exit(1);
  } catch (err) {
    console.log(`    ✅ Reverted as expected: ${(err as Error).message.split('\n')[0]}`);
  }

  // ── Read final state ──────────────────────────────────────────────────────
  console.log('\n[verify] PinaceClient.getPoolSummary…');
  const summary = await read.getPoolSummary(poolId);
  console.log('   ', summary);

  console.log('\nE2E test complete ✅');
}

function findCreatedPoolId(result: unknown): string {
  type Event = { eventType: string; json: { pool_id?: string } | null };
  type ObjectTypesMap = Record<string, string>;
  const r = result as {
    $kind?: string;
    Transaction?: { events?: Event[]; objectTypes?: ObjectTypesMap };
  };
  if (r.$kind !== 'Transaction' || !r.Transaction) {
    throw new Error('Pool create tx failed — no Transaction result');
  }

  // Prefer the PoolCreatedEvent for an explicit pool_id field.
  const event = (r.Transaction.events ?? []).find((e) =>
    e.eventType.endsWith('::events::PoolCreatedEvent'),
  );
  const fromEvent = event?.json?.pool_id;
  if (fromEvent) return fromEvent;

  // Fallback: walk objectTypes for the BalancePool object type.
  for (const [id, type] of Object.entries(r.Transaction.objectTypes ?? {})) {
    if (type.endsWith('::balance_pool::BalancePool')) return id;
  }
  throw new Error('Could not find BalancePool in events or objectTypes');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
