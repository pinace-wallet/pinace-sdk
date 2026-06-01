import { balancePool } from '@pinace/contracts-sdk';
import type { Transaction } from '@mysten/sui/transactions';

/**
 * Connect an agent to a pool with an optional expiry (Unix ms; 0 = no expiry).
 *
 * Wraps `core::balance_pool::connect_agent`.
 */
export function buildConnectAgent(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  agent: string;
  expiresMs: bigint | number;
}): Transaction {
  args.tx.add(
    balancePool.connectAgent({
      package: args.packageId,
      arguments: [args.poolId, args.agent, args.expiresMs],
    }),
  );
  return args.tx;
}

/**
 * Revoke the agent's delegation. Subsequent `propose_action` calls from the agent abort.
 *
 * Wraps `core::balance_pool::revoke_agent`.
 */
export function buildRevokeAgent(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  agent: string;
  reason?: Uint8Array;
}): Transaction {
  args.tx.add(
    balancePool.revokeAgent({
      package: args.packageId,
      arguments: [args.poolId, args.agent, Array.from(args.reason ?? new Uint8Array())],
    }),
  );
  return args.tx;
}
