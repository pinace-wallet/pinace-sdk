import { balancePool } from '@pinace/contracts-sdk';
import type { Transaction, TransactionArgument, TransactionResult } from '@mysten/sui/transactions';
import type { ActionKind } from '../constants.js';

/**
 * Begin the hot-potato flow: `balance_pool::propose_action` returns a `Request` object
 * that cannot be dropped — the same PTB MUST call `settle_action` before it ends.
 *
 * The returned `TransactionResult` is the `Request` handle; pass it into the policy
 * `prove` calls and finally into `buildSettleAction`.
 */
export function buildProposeAction(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  coinInType: string;
  coinOutType: string;
  kind: ActionKind;
  amountIn: bigint | number;
  quotedAmountOut: bigint | number;
  minAmountOut: bigint | number;
  deadlineMs: bigint | number;
  routeHash: Uint8Array;
  memo: string;
}): TransactionResult {
  return args.tx.add(
    balancePool.proposeAction({
      package: args.packageId,
      arguments: [
        args.poolId,
        args.kind,
        args.amountIn,
        args.quotedAmountOut,
        args.minAmountOut,
        args.deadlineMs,
        Array.from(args.routeHash),
        args.memo,
      ],
      typeArguments: [args.coinInType, args.coinOutType],
    }),
  );
}

/**
 * Close the hot-potato flow. The `request` argument must be the result of
 * `buildProposeAction` (post any policy `prove` calls that added receipts).
 *
 * Wraps `core::balance_pool::settle_action(pool, request, clock, ctx)`.
 */
export function buildSettleAction(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  request: TransactionArgument;
}): Transaction {
  args.tx.add(
    balancePool.settleAction({
      package: args.packageId,
      arguments: [args.poolId, args.request],
    }),
  );
  return args.tx;
}
