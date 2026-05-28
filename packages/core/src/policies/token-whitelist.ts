import type { Transaction, TransactionResult } from '@mysten/sui/transactions';

/** Helpers for `core::policies::token_whitelist_policy`. */

export interface TokenWhitelistConfig {
  /** Fully-qualified coin type names allowed for the agent (input + output). */
  allowedCoinTypes: string[];
}

export function buildAttach(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  agent: string;
  config: TokenWhitelistConfig;
  marketplaceId?: Uint8Array;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::token_whitelist_policy::attach`,
    arguments: [
      args.tx.object(args.poolId),
      args.tx.pure.address(args.agent),
      args.tx.pure.vector('string', args.config.allowedCoinTypes),
      args.tx.pure.vector('u8', Array.from(args.marketplaceId ?? new Uint8Array())),
    ],
  });
  return args.tx;
}

export function buildProve(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  request: TransactionResult;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::token_whitelist_policy::prove`,
    arguments: [args.tx.object(args.poolId), args.request],
  });
  return args.tx;
}
