import { timeWindowPolicy } from '@pinace/contracts-sdk';
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
  startMs: bigint | number;
  endMs: bigint | number;
}

export function buildNewConfig(args: {
  tx: Transaction;
  packageId: string;
  config: TimeWindowConfig;
}): TransactionResult {
  return args.tx.add(
    timeWindowPolicy.newConfig({
      package: args.packageId,
      arguments: [args.config.startMs, args.config.endMs],
    }),
  );
}

export function policyInstance(packageId: string): PolicyInstance {
  return { packageId, module: moduleName, needsClock: true };
}
