import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { PolicyInstance } from './instance.js';

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
  maxSlippageBps: bigint | number | string;
}

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

export function policyInstance(packageId: string): PolicyInstance {
  return { packageId, module: moduleName };
}
