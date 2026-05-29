import type { Transaction, TransactionArgument, TransactionResult } from '@mysten/sui/transactions';

/**
 * Helpers for `core::spending_limit_policy`.
 *
 * Module path: `${packageId}::spending_limit_policy`
 * Witness type: `${packageId}::spending_limit_policy::Witness`
 * Config type:  `${packageId}::spending_limit_policy::Config`
 *
 * Owner flow:
 *   1. `buildNewConfig(...)` to construct the Config value
 *   2. Pass that result + the type names into `buildAttachPolicy({witnessType, configType, configArg})`
 *
 * Agent flow:
 *   - Call `buildProve(...)` between `propose_action` and `settle_action`.
 */

export const moduleName = 'spending_limit_policy';
export const witnessName = 'Witness';
export const configName = 'Config';

export function witnessType(packageId: string): string {
  return `${packageId}::${moduleName}::${witnessName}`;
}

export function configType(packageId: string): string {
  return `${packageId}::${moduleName}::${configName}`;
}

export interface SpendingLimitConfig {
  /** Max amount per single action (in coin's smallest unit). */
  maxPerTx: bigint | number | string;
  /** Max cumulative amount within `windowMs`. Use 0 to disable. */
  maxPerWindow: bigint | number | string;
  /** Rolling window length in milliseconds. */
  windowMs: bigint | number | string;
}

/**
 * Construct the `Config` struct via `spending_limit_policy::new_config(...)`.
 *
 * The returned argument is meant to be passed to `buildAttachPolicy({ configArg, ... })`.
 */
export function buildNewConfig(args: {
  tx: Transaction;
  packageId: string;
  config: SpendingLimitConfig;
}): TransactionResult {
  return args.tx.moveCall({
    target: `${args.packageId}::${moduleName}::new_config`,
    arguments: [
      args.tx.pure.u64(args.config.maxPerTx),
      args.tx.pure.u64(args.config.maxPerWindow),
      args.tx.pure.u64(args.config.windowMs),
    ],
  });
}

/**
 * `spending_limit_policy::prove(pool: &mut BalancePool, request: &mut Request, clock: &Clock)`.
 *
 * Call between propose_action and settle_action to attach this policy's receipt.
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
