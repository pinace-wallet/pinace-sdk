/**
 * Pinace pool setup for Dex Agent E2E. Creates a fresh pool wired for SUI ↔ DBUSDC
 * swaps via DeepBook v3 testnet, attaches realistic guards, and prints the poolId.
 *
 * Env:
 *   OWNER_SECRET_KEY  — sui keytool format
 *   AGENT_SECRET_KEY  — Dex Agent server's persistent agent key (only address used)
 *
 * Output (parse from stdout):
 *   PINACE_POOL_ID=0x…   ← paste into dex-agent/.env.local
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
const SUI = '0x2::sui::SUI';
// DeepBook testnet DBUSDC coin type (from @mysten/deepbook-v3 testnetCoins).
const DBUSDC = '0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC';

function loadSigner(env: string) {
  const v = process.env[env];
  if (!v) throw new Error(`${env} not set`);
  return Ed25519Keypair.fromSecretKey(v);
}

function findCreatedPoolId(result: unknown): string {
  type Event = { eventType: string; json: { pool_id?: string } | null };
  type ObjectTypesMap = Record<string, string>;
  const r = result as {
    $kind?: string;
    Transaction?: { events?: Event[]; objectTypes?: ObjectTypesMap };
  };
  const event = (r.Transaction?.events ?? []).find((e) =>
    e.eventType.endsWith('::events::PoolCreatedEvent'),
  );
  const fromEvent = event?.json?.pool_id;
  if (fromEvent) return fromEvent;
  for (const [id, type] of Object.entries(r.Transaction?.objectTypes ?? {})) {
    if (type.endsWith('::balance_pool::BalancePool')) return id;
  }
  throw new Error('Could not find pool id');
}

async function main() {
  const sui = new SuiGrpcClient({ network, baseUrl: `https://fullnode.${network}.sui.io:443` });
  const owner = loadSigner('OWNER_SECRET_KEY');
  const agent = loadSigner('AGENT_SECRET_KEY');
  const agentAddr = agent.toSuiAddress();

  console.log(`Network : ${network}`);
  console.log(`Package : ${packageId}`);
  console.log(`Owner   : ${owner.toSuiAddress()}`);
  console.log(`Agent   : ${agentAddr}\n`);

  // 0. Top up agent gas
  console.log('[0] Top up agent 0.05 SUI');
  const topupTx = new Transaction();
  const [g] = topupTx.splitCoins(topupTx.gas, [topupTx.pure.u64(50_000_000n)]);
  topupTx.transferObjects([g], topupTx.pure.address(agentAddr));
  const topupRes = await sui.signAndExecuteTransaction({
    signer: owner, transaction: topupTx, include: { effects: true },
  });
  await sui.waitForTransaction({ digest: topupRes.$kind === 'Transaction' ? topupRes.Transaction.digest : '' });

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

  // 2-5. Deposit + connect agent + attach 3 guards (in one PTB)
  console.log('[2-5] Deposit 5 SUI + connect agent + attach spending_limit + token_whitelist + slippage_guard');
  const setupTx = new Transaction();
  const [coin] = setupTx.splitCoins(setupTx.gas, [setupTx.pure.u64(5_000_000_000n)]);
  buildDeposit({ tx: setupTx, packageId, poolId, coinType: SUI, coinArg: coin });

  buildConnectAgent({
    tx: setupTx, packageId, poolId,
    agent: agentAddr,
    expiresMs: BigInt(Date.now() + 24 * 60 * 60 * 1000),
  });

  // spending_limit: max 2 SUI / tx, max 5 SUI / 5-min window (lot_size on
  // SUI_DBUSDC DeepBook pool is 1 SUI so per-tx must allow > 1)
  const slCfg = policies.spendingLimit.buildNewConfig({
    tx: setupTx, packageId,
    config: { maxPerTx: 2_000_000_000n, maxPerWindow: 5_000_000_000n, windowMs: 300_000n },
  });
  buildAttachPolicy({
    tx: setupTx, packageId, poolId, agent: agentAddr,
    witnessType: policies.spendingLimit.witnessType(packageId),
    configType: policies.spendingLimit.configType(packageId),
    configArg: slCfg,
  });

  // token_whitelist: allow SUI base → DBUSDC quote (demo path).
  // Multi-pair vector<TypeName> can't be passed as pure args; use the codegen
  // pair helper instead which constructs the TypeName values via Move calls.
  const twCfg = policies.tokenWhitelist.buildNewPairConfig({
    tx: setupTx, packageId,
    coinInType: SUI,
    coinOutType: DBUSDC,
  });
  buildAttachPolicy({
    tx: setupTx, packageId, poolId, agent: agentAddr,
    witnessType: policies.tokenWhitelist.witnessType(packageId),
    configType: policies.tokenWhitelist.configType(packageId),
    configArg: twCfg,
  });

  // slippage_guard: 1% = 100 bps
  const sgCfg = policies.slippageGuard.buildNewConfig({
    tx: setupTx, packageId,
    config: { maxSlippageBps: 100n },
  });
  buildAttachPolicy({
    tx: setupTx, packageId, poolId, agent: agentAddr,
    witnessType: policies.slippageGuard.witnessType(packageId),
    configType: policies.slippageGuard.configType(packageId),
    configArg: sgCfg,
  });

  const setupRes = await sui.signAndExecuteTransaction({
    signer: owner, transaction: setupTx, include: { effects: true },
  });
  await sui.waitForTransaction({ digest: setupRes.$kind === 'Transaction' ? setupRes.Transaction.digest : '' });
  console.log('    setup ok');

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`  PINACE_POOL_ID=${poolId}`);
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('\nGuards attached:');
  console.log('  - spending_limit: 0.05 SUI/tx · 0.5 SUI/5min');
  console.log('  - token_whitelist: SUI ↔ DBUSDC');
  console.log('  - slippage_guard: 1% (100 bps)');
  console.log(`\nPool: https://suiscan.xyz/testnet/object/${poolId}`);
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
