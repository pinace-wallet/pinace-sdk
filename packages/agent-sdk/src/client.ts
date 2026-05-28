import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { Transaction } from '@mysten/sui/transactions';
import { type ActionKind, buildProposeAction, buildSettleAction } from '@pinace/core';

/**
 * Low-level helper for callers who want full control over which policy `prove` calls
 * to insert (e.g. to interleave with a custom DEX adapter). Most callers should use
 * {@link PinaceAgent} instead.
 */
export async function executeAtomicAction(args: {
  suiClient: SuiClient;
  signer: Signer;
  packageId: string;
  poolId: string;
  coinIn: string;
  coinOut: string;
  kind: ActionKind;
  amountIn: bigint;
  quotedAmountOut: bigint;
  minAmountOut: bigint;
  deadlineMs: bigint;
  routeHash?: Uint8Array;
  memo?: string;
  /** Hook to insert custom policy proves + protocol calls between propose and settle. */
  buildMiddle: (ctx: {
    tx: Transaction;
    request: ReturnType<typeof buildProposeAction>;
  }) => void;
}) {
  const tx = new Transaction();

  const request = buildProposeAction({
    tx,
    packageId: args.packageId,
    poolId: args.poolId,
    coinInType: args.coinIn,
    coinOutType: args.coinOut,
    kind: args.kind,
    amountIn: args.amountIn,
    quotedAmountOut: args.quotedAmountOut,
    minAmountOut: args.minAmountOut,
    deadlineMs: args.deadlineMs,
    routeHash: args.routeHash ?? new Uint8Array(),
    memo: args.memo ?? '',
  });

  args.buildMiddle({ tx, request });

  buildSettleAction({ tx, packageId: args.packageId, poolId: args.poolId, request });

  return args.suiClient.signAndExecuteTransaction({
    signer: args.signer,
    transaction: tx,
    options: { showEffects: true, showEvents: true, showObjectChanges: true },
  });
}
