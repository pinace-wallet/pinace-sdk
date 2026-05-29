import type { Transaction, TransactionArgument, TransactionResult } from '@mysten/sui/transactions';

/** Helpers for `core::token_whitelist_policy`. */

export const moduleName = 'token_whitelist_policy';
export const witnessName = 'Witness';
export const configName = 'Config';

export function witnessType(packageId: string): string {
  return `${packageId}::${moduleName}::${witnessName}`;
}

export function configType(packageId: string): string {
  return `${packageId}::${moduleName}::${configName}`;
}

export interface TokenWhitelistConfig {
  /** Fully-qualified TypeNames the agent may use as `coin_in`. */
  allowedInputs: string[];
  /** Fully-qualified TypeNames the agent may use as `coin_out`. */
  allowedOutputs: string[];
}

/**
 * `token_whitelist_policy::new_config(allowed_inputs, allowed_outputs)`.
 *
 * Type-name vectors must be the fully-qualified module path of each coin,
 * e.g. `'0x2::sui::SUI'`.
 */
export function buildNewConfig(args: {
  tx: Transaction;
  packageId: string;
  config: TokenWhitelistConfig;
}): TransactionResult {
  return args.tx.moveCall({
    target: `${args.packageId}::${moduleName}::new_config`,
    arguments: [
      args.tx.pure.vector('string', args.config.allowedInputs),
      args.tx.pure.vector('string', args.config.allowedOutputs),
    ],
  });
}

/**
 * Convenience helper for the common case: whitelist a single (TIn, TOut) pair via
 * `token_whitelist_policy::new_pair_config<TIn, TOut>()`.
 */
export function buildNewPairConfig(args: {
  tx: Transaction;
  packageId: string;
  coinInType: string;
  coinOutType: string;
}): TransactionResult {
  return args.tx.moveCall({
    target: `${args.packageId}::${moduleName}::new_pair_config`,
    typeArguments: [args.coinInType, args.coinOutType],
    arguments: [],
  });
}

/**
 * `token_whitelist_policy::prove(pool: &BalancePool, request: &mut Request)`.
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
