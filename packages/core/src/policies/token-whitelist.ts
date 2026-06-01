import { tokenWhitelistPolicy } from '@pinace/contracts-sdk';
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
  // Move signature is `vector<TypeName>`; TypeName BCS == ASCII string BCS, so we
  // pre-serialize as vector<string> and pass as TransactionArgument.
  const inputs = args.tx.pure.vector('string', args.config.allowedInputs);
  const outputs = args.tx.pure.vector('string', args.config.allowedOutputs);
  return args.tx.add(
    tokenWhitelistPolicy.newConfig({
      package: args.packageId,
      arguments: [inputs, outputs],
    }),
  );
}

export function buildNewPairConfig(args: {
  tx: Transaction;
  packageId: string;
  coinInType: string;
  coinOutType: string;
}): TransactionResult {
  return args.tx.add(
    tokenWhitelistPolicy.newPairConfig({
      package: args.packageId,
      typeArguments: [args.coinInType, args.coinOutType],
    }),
  );
}

export function policyInstance(packageId: string): PolicyInstance {
  return { packageId, module: moduleName };
}
