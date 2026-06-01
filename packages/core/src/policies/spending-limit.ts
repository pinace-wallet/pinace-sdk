import { spendingLimitPolicy } from '@pinace/contracts-sdk';
import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { PolicyInstance } from './instance.js';

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
  maxPerTx: bigint | number;
  maxPerWindow: bigint | number;
  windowMs: bigint | number;
}

export function buildNewConfig(args: {
  tx: Transaction;
  packageId: string;
  config: SpendingLimitConfig;
}): TransactionResult {
  return args.tx.add(
    spendingLimitPolicy.newConfig({
      package: args.packageId,
      arguments: [args.config.maxPerTx, args.config.maxPerWindow, args.config.windowMs],
    }),
  );
}

export function policyInstance(packageId: string): PolicyInstance {
  return { packageId, module: moduleName, needsClock: true };
}
