import { balancePool } from '@pinace/contracts-sdk';
import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';

/**
 * Build the `balance_pool::create` call into an existing transaction.
 *
 * Returns the same transaction for chaining. The shared `BalancePool` object's
 * id is not available synchronously — extract it from the on-chain effects
 * after submission, or subscribe to `PoolCreatedEvent`.
 */
export function buildCreatePool(args: { tx: Transaction; packageId: string }): Transaction {
  args.tx.add(balancePool.create({ package: args.packageId }));
  return args.tx;
}

/**
 * Build a `balance_pool::deposit<T>` call.
 *
 * @param coinType - Fully-qualified coin type, e.g. `"0x2::sui::SUI"`.
 * @param coinArg - Result of a `tx.splitCoins` or a coin object passed by the user.
 */
export function buildDeposit(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  coinType: string;
  /** Coin to escrow — either an object id string, an `object()` arg, or a `splitCoins()[i]` result. */
  coinArg: TransactionObjectArgument | string;
}): Transaction {
  args.tx.add(
    balancePool.deposit({
      package: args.packageId,
      arguments: [args.poolId, args.coinArg],
      typeArguments: [args.coinType],
    }),
  );
  return args.tx;
}

/**
 * Build a `balance_pool::owner_withdraw<T>` call — only callable by the pool owner.
 * Move returns a `Coin<T>` to the caller; this wrapper auto-transfers it to `recipient`
 * within the same PTB. Pass the owner's address (or any address you want to fund).
 */
export function buildOwnerWithdraw(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  coinType: string;
  amount: bigint | number;
  recipient: string;
}): Transaction {
  const coin = args.tx.add(
    balancePool.ownerWithdraw({
      package: args.packageId,
      arguments: [args.poolId, args.amount],
      typeArguments: [args.coinType],
    }),
  );
  args.tx.transferObjects([coin], args.tx.pure.address(args.recipient));
  return args.tx;
}
