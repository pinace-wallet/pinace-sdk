import { balancePool } from '@pinace/contracts-sdk';
import type { Transaction, TransactionArgument, TransactionResult } from '@mysten/sui/transactions';
import type { ActionKind } from '../constants.js';

/**
 * Begin the hot-potato flow: `balance_pool::propose_action` returns a `Request` object
 * that cannot be dropped. The same PTB MUST close the flow with either
 * `buildSettleAction` (Generic kind) or `buildAuthorizeAction` (Swap/Withdraw kinds).
 *
 * Pass the returned `TransactionResult` into the policy `prove` calls and the closer.
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
 * Close a `Generic` action by validating policy receipts and emitting `ActionSettled`.
 * Does NOT move coins. For Swap/Withdraw flows use `buildAuthorizeAction` instead.
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

/**
 * Close a Swap or Withdraw action — validates receipts and issues a `FlowTicket`
 * capability. The ticket is consumed by `buildTakeCoin` (swap) or
 * `buildReleaseCoin` (withdraw) inside the same PTB; otherwise the PTB aborts.
 */
export function buildAuthorizeAction(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  request: TransactionArgument;
}): TransactionResult {
  return args.tx.add(
    balancePool.authorizeAction({
      package: args.packageId,
      arguments: [args.poolId, args.request],
    }),
  );
}

/**
 * Consume a `FlowTicket` to pull `amount_in` of `coinInType` out of the pool, and
 * receive a `ReturnTicket` that MUST be consumed by `buildReturnCoin` in the same
 * PTB. Result is a tuple `[Coin<TIn>, ReturnTicket]`.
 */
export function buildTakeCoin(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  coinInType: string;
  ticket: TransactionArgument;
}): TransactionResult {
  return args.tx.add(
    balancePool.takeCoin({
      package: args.packageId,
      arguments: [args.poolId, args.ticket],
      typeArguments: [args.coinInType],
    }),
  );
}

/**
 * Deposit a `Coin<TOut>` back into the pool and consume a `ReturnTicket`. The Move
 * function asserts `coin::value(coin) >= ticket.min_amount_out`.
 */
export function buildReturnCoin(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  coinOutType: string;
  ticket: TransactionArgument;
  coin: TransactionArgument;
}): Transaction {
  args.tx.add(
    balancePool.returnCoin({
      package: args.packageId,
      arguments: [args.poolId, args.ticket, args.coin],
      typeArguments: [args.coinOutType],
    }),
  );
  return args.tx;
}

/**
 * Withdraw flow: consume a `FlowTicket` to transfer `amount_in` of the input coin
 * type directly to `recipient`. No `ReturnTicket` is produced.
 */
export function buildReleaseCoin(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  coinType: string;
  ticket: TransactionArgument;
  recipient: string;
}): Transaction {
  args.tx.add(
    balancePool.releaseCoin({
      package: args.packageId,
      arguments: [args.poolId, args.ticket, args.recipient],
      typeArguments: [args.coinType],
    }),
  );
  return args.tx;
}
