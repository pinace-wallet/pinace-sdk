import type { PoolStatus } from '../constants.js';
import type { Delegation } from './delegation.js';

/**
 * TypeScript mirror of `core::balance_pool::BalancePool` — the shared escrow object
 * holding user-deposited assets and per-agent delegations.
 *
 * Note: `balances` and `delegations` are decoded lazily by the read client; the raw
 * on-chain representation uses `Bag` and `Table` which require dynamic field lookups.
 */
export interface BalancePool {
  id: string;
  owner: string;
  status: PoolStatus;
  nextNonce: bigint;
  generation: bigint;
  /** Coin type-name → balance amount. Materialized on demand by the read client. */
  balances: Map<string, bigint>;
  /** Agent address → Delegation. Materialized on demand by the read client. */
  delegations: Map<string, Delegation>;
}

/**
 * Lightweight summary returned by indexer endpoints when the full pool isn't needed.
 */
export interface BalancePoolSummary {
  id: string;
  owner: string;
  status: PoolStatus;
  delegationCount: number;
  totalValueUsd?: number;
}
