import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import type { PolicyInstance } from './instance.js';

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
  allowedInputs: string[];
  allowedOutputs: string[];
}

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

export function policyInstance(packageId: string): PolicyInstance {
  return { packageId, module: moduleName };
}
