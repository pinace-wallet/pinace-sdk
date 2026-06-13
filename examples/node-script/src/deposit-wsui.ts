/**
 * Top up an existing Pinace pool with WSUI from the owner's wallet.
 *
 * Env:
 *   OWNER_SECRET_KEY  — owner of the pool
 *   PINACE_POOL_ID    — pool to deposit into (default: WSUI demo pool)
 *   DEPOSIT_AMOUNT    — atomic units, default 10_000_000_000 (10 WSUI)
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { buildDeposit, PACKAGE_IDS } from '@pinace/core';

const network = 'testnet' as const;
const packageId = process.env.PINACE_PACKAGE_ID ?? PACKAGE_IDS.testnet;
const poolId =
  process.env.PINACE_POOL_ID ??
  '0x79efc497d3e59a31e4ce52e35cb2b9cab34127842427ddb45fa59fe4913e51c5';
const amount = BigInt(process.env.DEPOSIT_AMOUNT ?? '10000000000');
const WSUI =
  '0x62fa04886de9e6c0d9c69568ad9c0b88552193d9e67a4b99cdabca3f8e2f37e2::wsui::WSUI';

function loadSigner() {
  const v = process.env.OWNER_SECRET_KEY;
  if (!v) throw new Error('OWNER_SECRET_KEY not set');
  return Ed25519Keypair.fromSecretKey(v);
}

async function main() {
  const sui = new SuiGrpcClient({
    network,
    baseUrl: `https://fullnode.${network}.sui.io:443`,
  });
  const owner = loadSigner();
  const ownerAddr = owner.toSuiAddress();

  console.log(`Network : ${network}`);
  console.log(`Package : ${packageId}`);
  console.log(`Pool    : ${poolId}`);
  console.log(`Owner   : ${ownerAddr}`);
  console.log(`Amount  : ${amount} (${Number(amount) / 1e9} WSUI)\n`);

  // Find an owner WSUI coin to deposit from
  const wrapped = `0x2::coin::Coin<${WSUI}>`;
  const objs = await sui.core.listOwnedObjects({ owner: ownerAddr, type: wrapped });
  const ids = (objs.objects as Array<{ objectId: string }>)
    .map((o) => o.objectId)
    .filter(Boolean)
    .slice(0, 5);
  if (ids.length === 0) throw new Error(`No WSUI coins owned by ${ownerAddr}`);

  const tx = new Transaction();
  const [primary, ...rest] = ids;
  if (!primary) throw new Error('No primary WSUI coin found');
  if (rest.length > 0) tx.mergeCoins(primary, rest);
  const [depositCoin] = tx.splitCoins(primary, [tx.pure.u64(amount)]);
  buildDeposit({ tx, packageId, poolId, coinType: WSUI, coinArg: depositCoin });

  const res = await sui.signAndExecuteTransaction({
    signer: owner,
    transaction: tx,
    include: { effects: true },
  });
  const digest = res.$kind === 'Transaction' ? res.Transaction.digest : '';
  await sui.waitForTransaction({ digest });
  const status = res.$kind === 'Transaction' ? res.Transaction.effects?.status?.status : 'failed';
  console.log(`Status  : ${status}`);
  console.log(`Digest  : ${digest}`);
  console.log(`Suiscan : https://suiscan.xyz/${network}/tx/${digest}`);
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
