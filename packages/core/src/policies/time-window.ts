import type { Transaction, TransactionResult } from '@mysten/sui/transactions';

/** Helpers for `core::policies::time_window_policy`. */

export interface TimeWindowConfig {
  /** Allowed start hour (0-23, UTC). */
  startHourUtc: number;
  /** Allowed end hour (0-23, UTC, exclusive). */
  endHourUtc: number;
}

export function buildAttach(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  agent: string;
  config: TimeWindowConfig;
  marketplaceId?: Uint8Array;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::time_window_policy::attach`,
    arguments: [
      args.tx.object(args.poolId),
      args.tx.pure.address(args.agent),
      args.tx.pure.u8(args.config.startHourUtc),
      args.tx.pure.u8(args.config.endHourUtc),
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
    target: `${args.packageId}::time_window_policy::prove`,
    arguments: [args.tx.object(args.poolId), args.request, args.tx.object(args.clockId ?? '0x6')],
  });
  return args.tx;
}
