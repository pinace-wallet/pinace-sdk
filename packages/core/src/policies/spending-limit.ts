import type { Transaction, TransactionResult } from '@mysten/sui/transactions';

/**
 * Helpers for `core::policies::spending_limit_policy`.
 *
 * Two responsibilities:
 *   1. **Owner side** — `attach` to bind the policy with a max per-tx + per-window amount.
 *   2. **Agent side** — `prove` inside the same PTB that calls `propose_action`, so the
 *      hot-potato `Request` carries the spending-limit receipt before `settle_action`.
 */

export interface SpendingLimitConfig {
  /** Max amount per single action (in coin's smallest unit). */
  maxPerTx: bigint | number | string;
  /** Max cumulative amount within `windowMs`. Use 0 to disable. */
  maxPerWindow: bigint | number | string;
  /** Rolling window length in milliseconds. */
  windowMs: bigint | number | string;
}

export function buildAttach(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  agent: string;
  config: SpendingLimitConfig;
  marketplaceId?: Uint8Array;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::spending_limit_policy::attach`,
    arguments: [
      args.tx.object(args.poolId),
      args.tx.pure.address(args.agent),
      args.tx.pure.u64(args.config.maxPerTx),
      args.tx.pure.u64(args.config.maxPerWindow),
      args.tx.pure.u64(args.config.windowMs),
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
  clockId?: string;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::spending_limit_policy::prove`,
    arguments: [args.tx.object(args.poolId), args.request, args.tx.object(args.clockId ?? '0x6')],
  });
  return args.tx;
}
