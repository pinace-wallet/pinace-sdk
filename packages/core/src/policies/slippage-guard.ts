import type { Transaction, TransactionArgument, TransactionResult } from '@mysten/sui/transactions';

/** Helpers for `core::slippage_guard_policy`. */

export const moduleName = 'slippage_guard_policy';
export const witnessName = 'Witness';
export const configName = 'Config';

export function witnessType(packageId: string): string {
  return `${packageId}::${moduleName}::${witnessName}`;
}

export function configType(packageId: string): string {
  return `${packageId}::${moduleName}::${configName}`;
}

export interface SlippageGuardConfig {
  /** Max acceptable slippage in basis points (1 bp = 0.01%). */
  maxSlippageBps: bigint | number | string;
}

/**
 * `slippage_guard_policy::new_config(max_slippage_bps)`.
 */
export function buildNewConfig(args: {
  tx: Transaction;
  packageId: string;
  config: SlippageGuardConfig;
}): TransactionResult {
  return args.tx.moveCall({
    target: `${args.packageId}::${moduleName}::new_config`,
    arguments: [args.tx.pure.u64(args.config.maxSlippageBps)],
  });
}

/**
 * `slippage_guard_policy::prove(pool: &BalancePool, request: &mut Request)`.
 */
export function buildProve(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  request: TransactionArgument | TransactionResult;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::${moduleName}::prove`,
    arguments: [args.tx.object(args.poolId), args.request],
  });
  return args.tx;
}
