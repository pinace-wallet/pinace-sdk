import type { Transaction, TransactionArgument, TransactionResult } from '@mysten/sui/transactions';

/** Helpers for `core::time_window_policy`. */

export const moduleName = 'time_window_policy';
export const witnessName = 'Witness';
export const configName = 'Config';

export function witnessType(packageId: string): string {
  return `${packageId}::${moduleName}::${witnessName}`;
}

export function configType(packageId: string): string {
  return `${packageId}::${moduleName}::${configName}`;
}

export interface TimeWindowConfig {
  /** Window start (Unix ms). */
  startMs: bigint | number | string;
  /** Window end (Unix ms, exclusive). */
  endMs: bigint | number | string;
}

/**
 * `time_window_policy::new_config(start_ms, end_ms)`.
 */
export function buildNewConfig(args: {
  tx: Transaction;
  packageId: string;
  config: TimeWindowConfig;
}): TransactionResult {
  return args.tx.moveCall({
    target: `${args.packageId}::${moduleName}::new_config`,
    arguments: [args.tx.pure.u64(args.config.startMs), args.tx.pure.u64(args.config.endMs)],
  });
}

/**
 * `time_window_policy::prove(pool: &BalancePool, request: &mut Request, clock: &Clock)`.
 */
export function buildProve(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  request: TransactionArgument | TransactionResult;
  clockId?: string;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::${moduleName}::prove`,
    arguments: [args.tx.object(args.poolId), args.request, args.tx.object(args.clockId ?? '0x6')],
  });
  return args.tx;
}
