import type { Transaction } from '@mysten/sui/transactions';
import { PinaceModules } from '../constants.js';

/**
 * Attach an agent to a pool with an optional expiry (Unix ms; 0 = no expiry).
 */
export function buildAttachAgent(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  agent: string;
  expiresMs: bigint | number | string;
  clockId?: string;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::${PinaceModules.BalancePool}::attach_agent`,
    arguments: [
      args.tx.object(args.poolId),
      args.tx.pure.address(args.agent),
      args.tx.pure.u64(args.expiresMs),
      args.tx.object(args.clockId ?? '0x6'),
    ],
  });
  return args.tx;
}

/**
 * Revoke the agent's delegation. Subsequent `propose_action` calls from the agent abort.
 */
export function buildRevokeAgent(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  agent: string;
  reason?: Uint8Array;
  clockId?: string;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::${PinaceModules.BalancePool}::revoke_agent`,
    arguments: [
      args.tx.object(args.poolId),
      args.tx.pure.address(args.agent),
      args.tx.pure.vector('u8', Array.from(args.reason ?? new Uint8Array())),
      args.tx.object(args.clockId ?? '0x6'),
    ],
  });
  return args.tx;
}
