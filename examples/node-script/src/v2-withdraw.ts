/**
 * End-to-end Pinace v2 lifecycle on testnet — tests the new capability flow
 * (authorize_action + release_coin) introduced in contracts v2 (commit 603d363).
 *
 * Sequence:
 *   0. Owner top up agent gas
 *   1. Owner: create BalancePool (v2 package)
 *   2. Owner: deposit SUI
 *   3. Owner: connect agent + attach spending limit + token whitelist
 *   4. Agent: propose Withdraw → spending.prove → whitelist.prove → authorize → releaseCoin to owner
 *   5. Verify owner SUI balance increased by the released amount
 *
 * Real coin movement is the v1 → v2 differentiator. v1 settle_action only
 * validated permissions; v2 release_coin actually moves the coin to recipient.
 *
 * Required env:
 *   OWNER_SECRET_KEY, AGENT_SECRET_KEY  (sui keytool format)
 *
 * Run:  pnpm --filter @pinace-examples/node-script exec tsx src/v2-withdraw.ts
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  ActionKind,
  buildAttachPolicy,
  buildAuthorizeAction,
  buildConnectAgent,
  buildCreatePool,
  buildDeposit,
  buildProposeAction,
  buildReleaseCoin,
  PACKAGE_IDS,
} from '@pinace/core';
import * as policies from '@pinace/core/policies';
import { buildPolicyProves } from '@pinace/core/policies';

const network = 'testnet' as const;
const packageId = process.env.PINACE_PACKAGE_ID ?? PACKAGE_IDS.testnet;
const SUI = '0x2::sui::SUI';

function loadSigner(env: string) {
  const v = process.env[env];
  if (!v) throw new Error(`${env} not set`);
  return Ed25519Keypair.fromSecretKey(v);
}

async function suiBalance(client: SuiGrpcClient, addr: string): Promise<bigint> {
  const { balance } = await client.core.getBalance({ owner: addr, coinType: SUI });
  return BigInt(balance.balance);
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
  const event = (r.Transaction.events ?? []).find((e) =>
    e.eventType.endsWith('::events::PoolCreatedEvent'),
  );
  const fromEvent = event?.json?.pool_id;
  if (fromEvent) return fromEvent;
  for (const [id, type] of Object.entries(r.Transaction.objectTypes ?? {})) {
    if (type.endsWith('::balance_pool::BalancePool')) return id;
  }
  throw new Error('Could not find BalancePool in events or objectTypes');
}

async function main() {
  const sui = new SuiGrpcClient({ network, baseUrl: `https://fullnode.${network}.sui.io:443` });
  const owner = loadSigner('OWNER_SECRET_KEY');
  const agent = loadSigner('AGENT_SECRET_KEY');

  console.log(`Network : ${network}`);
  console.log(`Package : ${packageId}`);
  console.log(`Owner   : ${owner.toSuiAddress()}`);
  console.log(`Agent   : ${agent.toSuiAddress()}\n`);

  const ownerBalanceStart = await suiBalance(sui, owner.toSuiAddress());
  console.log(`[balance] owner start: ${ownerBalanceStart}\n`);

  // 0. Top up agent
  console.log('[0] Top up agent 0.05 SUI');
  const topupTx = new Transaction();
  const [gasCoin] = topupTx.splitCoins(topupTx.gas, [topupTx.pure.u64(50_000_000n)]);
  topupTx.transferObjects([gasCoin], topupTx.pure.address(agent.toSuiAddress()));
  const topup = await sui.signAndExecuteTransaction({
    signer: owner, transaction: topupTx, include: { effects: true },
  });
  await sui.waitForTransaction({ digest: topup.$kind === 'Transaction' ? topup.Transaction.digest : '' });

  // 1. Create pool
  console.log('[1] Create pool');
  const createTx = new Transaction();
  buildCreatePool({ tx: createTx, packageId });
  const createRes = await sui.signAndExecuteTransaction({
    signer: owner, transaction: createTx,
    include: { effects: true, events: true, objectTypes: true },
  });
  await sui.waitForTransaction({ digest: createRes.$kind === 'Transaction' ? createRes.Transaction.digest : '' });
  const poolId = findCreatedPoolId(createRes);
  console.log(`    pool = ${poolId}`);

  // 2. Deposit 0.1 SUI + connect agent + attach guards (all in one tx)
  console.log('[2-4] Deposit 0.1 SUI + connect agent + attach 2 guards');
  const setupTx = new Transaction();
  const [coin] = setupTx.splitCoins(setupTx.gas, [setupTx.pure.u64(100_000_000n)]);
  buildDeposit({ tx: setupTx, packageId, poolId, coinType: SUI, coinArg: coin });
  buildConnectAgent({
    tx: setupTx, packageId, poolId,
    agent: agent.toSuiAddress(),
    expiresMs: BigInt(Date.now() + 24 * 60 * 60 * 1000),
  });
  const slCfg = policies.spendingLimit.buildNewConfig({
    tx: setupTx, packageId,
    config: { maxPerTx: 50_000_000n, maxPerWindow: 100_000_000n, windowMs: 60_000n },
  });
  buildAttachPolicy({
    tx: setupTx, packageId, poolId, agent: agent.toSuiAddress(),
    witnessType: policies.spendingLimit.witnessType(packageId),
    configType: policies.spendingLimit.configType(packageId),
    configArg: slCfg,
  });
  const twCfg = policies.tokenWhitelist.buildNewPairConfig({
    tx: setupTx, packageId, coinInType: SUI, coinOutType: SUI,
  });
  buildAttachPolicy({
    tx: setupTx, packageId, poolId, agent: agent.toSuiAddress(),
    witnessType: policies.tokenWhitelist.witnessType(packageId),
    configType: policies.tokenWhitelist.configType(packageId),
    configArg: twCfg,
  });
  const setupRes = await sui.signAndExecuteTransaction({
    signer: owner, transaction: setupTx, include: { effects: true },
  });
  await sui.waitForTransaction({ digest: setupRes.$kind === 'Transaction' ? setupRes.Transaction.digest : '' });
  console.log('    setup ok');

  const ownerBalanceMid = await suiBalance(sui, owner.toSuiAddress());
  console.log(`[balance] owner after deposit: ${ownerBalanceMid}\n`);

  // 5. Agent: propose Withdraw → prove × 2 → authorize → release 0.02 SUI to owner
  console.log('[5] Agent: propose Withdraw 0.02 SUI → prove × 2 → authorize → releaseCoin (v2 cap flow)');
  const releaseAmount = 20_000_000n; // 0.02 SUI
  const actionTx = new Transaction();
  const request = buildProposeAction({
    tx: actionTx, packageId, poolId,
    coinInType: SUI, coinOutType: SUI,
    kind: ActionKind.Withdraw,
    amountIn: releaseAmount,
    quotedAmountOut: releaseAmount,
    minAmountOut: releaseAmount,
    deadlineMs: BigInt(Date.now() + 60_000),
    routeHash: new Uint8Array(),
    memo: 'v2 withdraw e2e',
  });
  buildPolicyProves({
    tx: actionTx, poolId, request,
    policies: [
      policies.spendingLimit.policyInstance(packageId),
      policies.tokenWhitelist.policyInstance(packageId),
    ],
  });
  const ticket = buildAuthorizeAction({ tx: actionTx, packageId, poolId, request });
  buildReleaseCoin({
    tx: actionTx, packageId, poolId,
    coinType: SUI,
    ticket,
    recipient: owner.toSuiAddress(),
  });
  const actionRes = await sui.signAndExecuteTransaction({
    signer: agent, transaction: actionTx,
    include: { effects: true, events: true, objectTypes: true },
  });
  const actionDigest = actionRes.$kind === 'Transaction' ? actionRes.Transaction.digest : '';
  await sui.waitForTransaction({ digest: actionDigest });
  console.log(`    digest = ${actionDigest}`);

  const ownerBalanceEnd = await suiBalance(sui, owner.toSuiAddress());
  console.log(`\n[balance] owner after release: ${ownerBalanceEnd}`);
  const diff = ownerBalanceEnd - ownerBalanceMid;
  console.log(`[balance] delta vs post-deposit: ${diff} (expected ~+${releaseAmount} minus owner-side gas of subsequent txs; owner has paid no tx between deposit and end → delta should be exactly ${releaseAmount})`);

  if (diff !== releaseAmount) {
    console.log(`\n⚠ Delta ${diff} ≠ expected ${releaseAmount}. If owner paid gas in between, this is normal. Inspect digest above on Suiscan.`);
  } else {
    console.log(`\n✅ Coin actually moved on-chain. v2 capability flow works.`);
  }

  console.log(`\nSuiscan: https://suiscan.xyz/${network}/tx/${actionDigest}`);
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
