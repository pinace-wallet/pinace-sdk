/**
 * Pinace pool wired for Wyner's custom DeepBook market — WSUI / WUSDC pair.
 * Lot size 0.1 WSUI on testnet (vs 1 SUI on the standard SUI_DBUSDC pool), so
 * we can demo realistic swap sizes that still fit a tight spending guard.
 *
 * Market source: market-2026-05-09T04-33-45-158.json (Wyner)
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  buildAttachPolicy,
  buildConnectAgent,
  buildCreatePool,
  buildDeposit,
  PACKAGE_IDS,
} from '@pinace/core';
import * as policies from '@pinace/core/policies';

const network = 'testnet' as const;
const packageId = process.env.PINACE_PACKAGE_ID ?? PACKAGE_IDS.testnet;
const WSUI = '0x62fa04886de9e6c0d9c69568ad9c0b88552193d9e67a4b99cdabca3f8e2f37e2::wsui::WSUI';
const WUSDC = '0x62fa04886de9e6c0d9c69568ad9c0b88552193d9e67a4b99cdabca3f8e2f37e2::wusdc::WUSDC';

function loadSigner(env: string) {
  const v = process.env[env];
  if (!v) throw new Error(`${env} not set`);
  return Ed25519Keypair.fromSecretKey(v);
}

function findCreatedPoolId(result: unknown): string {
  type Event = { eventType: string; json: { pool_id?: string } | null };
  const r = result as {
    $kind?: string;
    Transaction?: { events?: Event[]; objectTypes?: Record<string, string> };
  };
  const event = (r.Transaction?.events ?? []).find((e) =>
    e.eventType.endsWith('::events::PoolCreatedEvent'),
  );
  const fromEvent = event?.json?.pool_id;
  if (fromEvent) return fromEvent;
  for (const [id, type] of Object.entries(r.Transaction?.objectTypes ?? {})) {
    if (type.endsWith('::balance_pool::BalancePool')) return id;
  }
  throw new Error('PoolCreatedEvent not found');
}

async function getCoin(sui: SuiGrpcClient, owner: string, coinType: string) {
  const wrapped = `0x2::coin::Coin<${coinType}>`;
  const objs = await sui.core.listOwnedObjects({ owner, type: wrapped });
  const ids: string[] = [];
  for (const o of objs.objects as Array<{ objectId: string }>) {
    if (o.objectId) ids.push(o.objectId);
    if (ids.length >= 5) break;
  }
  if (ids.length === 0) throw new Error(`No ${coinType} coins owned by ${owner}`);
  return { ids };
}

async function main() {
  const sui = new SuiGrpcClient({
    network,
    baseUrl: `https://fullnode.${network}.sui.io:443`,
  });
  const owner = loadSigner('OWNER_SECRET_KEY');
  const agent = loadSigner('AGENT_SECRET_KEY');
  const agentAddr = agent.toSuiAddress();
  const ownerAddr = owner.toSuiAddress();

  console.log(`Network : ${network}`);
  console.log(`Package : ${packageId}`);
  console.log(`Owner   : ${ownerAddr}`);
  console.log(`Agent   : ${agentAddr}\n`);

  // 1. Create pool
  console.log('[1] Create pool');
  const createTx = new Transaction();
  buildCreatePool({ tx: createTx, packageId });
  const createRes = await sui.signAndExecuteTransaction({
    signer: owner,
    transaction: createTx,
    include: { effects: true, events: true, objectTypes: true },
  });
  await sui.waitForTransaction({
    digest: createRes.$kind === 'Transaction' ? createRes.Transaction.digest : '',
  });
  const poolId = findCreatedPoolId(createRes);
  console.log(`    pool = ${poolId}`);

  // 2. Deposit 10 WSUI + connect agent + attach 3 guards (one PTB)
  console.log('[2-5] Deposit 10 WSUI + connect agent + attach guards');
  const wsuiInfo = await getCoin(sui, ownerAddr, WSUI);
  const setupTx = new Transaction();

  // Merge all WSUI coins into one, then split 10 WSUI for deposit
  const [primary, ...rest] = wsuiInfo.ids;
  if (!primary) throw new Error('No primary WSUI coin found');
  if (rest.length > 0) setupTx.mergeCoins(primary, rest);
  const [depositCoin] = setupTx.splitCoins(primary, [
    setupTx.pure.u64(10_000_000_000n), // 10 WSUI
  ]);

  buildDeposit({ tx: setupTx, packageId, poolId, coinType: WSUI, coinArg: depositCoin });
  buildConnectAgent({
    tx: setupTx,
    packageId,
    poolId,
    agent: agentAddr,
    expiresMs: BigInt(Date.now() + 24 * 60 * 60 * 1000),
  });

  // spending_limit: 5 WSUI / tx, 10 WSUI / 5-min window
  const slCfg = policies.spendingLimit.buildNewConfig({
    tx: setupTx,
    packageId,
    config: {
      maxPerTx: 5_000_000_000n,
      maxPerWindow: 10_000_000_000n,
      windowMs: 300_000n,
    },
  });
  buildAttachPolicy({
    tx: setupTx,
    packageId,
    poolId,
    agent: agentAddr,
    witnessType: policies.spendingLimit.witnessType(packageId),
    configType: policies.spendingLimit.configType(packageId),
    configArg: slCfg,
  });

  // token_whitelist: WSUI → WUSDC (one-direction)
  const twCfg = policies.tokenWhitelist.buildNewPairConfig({
    tx: setupTx,
    packageId,
    coinInType: WSUI,
    coinOutType: WUSDC,
  });
  buildAttachPolicy({
    tx: setupTx,
    packageId,
    poolId,
    agent: agentAddr,
    witnessType: policies.tokenWhitelist.witnessType(packageId),
    configType: policies.tokenWhitelist.configType(packageId),
    configArg: twCfg,
  });

  // slippage_guard: 1% = 100 bps
  const sgCfg = policies.slippageGuard.buildNewConfig({
    tx: setupTx,
    packageId,
    config: { maxSlippageBps: 100n },
  });
  buildAttachPolicy({
    tx: setupTx,
    packageId,
    poolId,
    agent: agentAddr,
    witnessType: policies.slippageGuard.witnessType(packageId),
    configType: policies.slippageGuard.configType(packageId),
    configArg: sgCfg,
  });

  const setupRes = await sui.signAndExecuteTransaction({
    signer: owner,
    transaction: setupTx,
    include: { effects: true },
  });
  await sui.waitForTransaction({
    digest: setupRes.$kind === 'Transaction' ? setupRes.Transaction.digest : '',
  });
  console.log('    setup ok');

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`  PINACE_POOL_ID=${poolId}`);
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('\nGuards attached:');
  console.log('  - spending_limit: 5 WSUI/tx · 10 WSUI/5min');
  console.log('  - token_whitelist: WSUI → WUSDC (Wyner market)');
  console.log('  - slippage_guard: 1% (100 bps)');
  console.log(`\nPool: https://suiscan.xyz/testnet/object/${poolId}`);
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
