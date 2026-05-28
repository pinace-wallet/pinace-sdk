import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { ActionKind } from '../constants.js';
import { PinaceModules } from '../constants.js';

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
  amountIn: bigint | number | string;
  quotedAmountOut: bigint | number | string;
  minAmountOut: bigint | number | string;
  deadlineMs: bigint | number | string;
  routeHash: Uint8Array;
  memo: string;
  clockId?: string;
}): TransactionResult {
  return args.tx.moveCall({
    target: `${args.packageId}::${PinaceModules.BalancePool}::propose_action`,
    typeArguments: [args.coinInType, args.coinOutType],
    arguments: [
      args.tx.object(args.poolId),
      args.tx.pure.u8(args.kind),
      args.tx.pure.u64(args.amountIn),
      args.tx.pure.u64(args.quotedAmountOut),
      args.tx.pure.u64(args.minAmountOut),
      args.tx.pure.u64(args.deadlineMs),
      args.tx.pure.vector('u8', Array.from(args.routeHash)),
      args.tx.pure.string(args.memo),
      args.tx.object(args.clockId ?? '0x6'),
    ],
  });
}

/**
 * Close the hot-potato flow. The `request` argument must be the result of
 * `buildProposeAction` (post any policy `prove` calls that added receipts).
 */
export function buildSettleAction(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  request: TransactionResult;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::${PinaceModules.BalancePool}::settle_action`,
    arguments: [args.tx.object(args.poolId), args.request],
  });
  return args.tx;
}
