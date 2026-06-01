import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { PolicyInstance } from './instance.js';

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
  startMs: bigint | number | string;
  endMs: bigint | number | string;
}

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

export function policyInstance(packageId: string): PolicyInstance {
  return { packageId, module: moduleName, needsClock: true };
}
