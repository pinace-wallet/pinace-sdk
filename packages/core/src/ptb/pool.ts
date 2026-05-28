import type { Transaction } from '@mysten/sui/transactions';
import { PinaceModules } from '../constants.js';

/**
 * Build the `balance_pool::create` call into an existing transaction.
 *
 * Returns the same transaction for chaining. The shared `BalancePool` object's
 * id is not available synchronously — extract it from the on-chain effects
 * after submission, or subscribe to `PoolCreatedEvent`.
 */
export function buildCreatePool(args: {
  tx: Transaction;
  packageId: string;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::${PinaceModules.BalancePool}::create`,
    arguments: [],
  });
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
  coinArg: ReturnType<Transaction['object']> | ReturnType<Transaction['splitCoins']>;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::${PinaceModules.BalancePool}::deposit`,
    typeArguments: [args.coinType],
    arguments: [args.tx.object(args.poolId), args.coinArg as never],
  });
  return args.tx;
}

/**
 * Build a `balance_pool::owner_withdraw<T>` call — only callable by the pool owner.
 */
export function buildOwnerWithdraw(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  coinType: string;
  amount: bigint | number | string;
  recipient: string;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::${PinaceModules.BalancePool}::owner_withdraw`,
    typeArguments: [args.coinType],
    arguments: [
      args.tx.object(args.poolId),
      args.tx.pure.u64(args.amount),
      args.tx.pure.address(args.recipient),
    ],
  });
  return args.tx;
}
