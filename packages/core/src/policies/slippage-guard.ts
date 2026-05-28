import type { Transaction, TransactionResult } from '@mysten/sui/transactions';

/** Helpers for `core::policies::slippage_guard_policy`. */

export interface SlippageGuardConfig {
  /** Max acceptable slippage in basis points (1 bp = 0.01%). */
  maxSlippageBps: number;
}

export function buildAttach(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  agent: string;
  config: SlippageGuardConfig;
  marketplaceId?: Uint8Array;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::slippage_guard_policy::attach`,
    arguments: [
      args.tx.object(args.poolId),
      args.tx.pure.address(args.agent),
      args.tx.pure.u64(args.config.maxSlippageBps),
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
    target: `${args.packageId}::slippage_guard_policy::prove`,
    arguments: [args.tx.object(args.poolId), args.request],
  });
  return args.tx;
}
