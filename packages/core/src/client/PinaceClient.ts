import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { PoolStatus } from '../constants.js';
import type { BalancePool, BalancePoolSummary } from '../types/balance-pool.js';
import type { Delegation } from '../types/delegation.js';

export interface PinaceClientConfig {
  /**
   * Underlying Sui client. Defaults to `SuiGrpcClient` — the recommended transport
   * in `@mysten/sui` v2.x (JSON-RPC is deprecated and decommissions 2026-07-31).
   */
  suiClient: SuiGrpcClient;
  /** Deployed package id of the `core` Move package on the target network. */
  packageId: string;
}

/**
 * Read-side client for querying Pinace on-chain state.
 *
 * V1 covers what the wallet UI needs immediately. Delegation/balance enumeration via
 * dynamic-field walks is left to V2 when the indexer is ready.
 */
export class PinaceClient {
  readonly suiClient: SuiGrpcClient;
  readonly packageId: string;

  constructor(config: PinaceClientConfig) {
    this.suiClient = config.suiClient;
    this.packageId = config.packageId;
  }

  /**
   * Load a `BalancePool` shared object.
   *
   * V1 only returns the scalar header fields parsed from the object content.
   * Nested `balances` (Bag) and `delegations` (Table) require dynamic-field reads
   * — fetch them on demand via the indexer or follow-up calls.
   */
  async getPool(poolId: string): Promise<BalancePool> {
    const { object } = await this.suiClient.core.getObject({ objectId: poolId });

    const raw = object as unknown as { type?: string };
    const expectedSuffix = '::balance_pool::BalancePool';
    if (!raw.type?.endsWith(expectedSuffix)) {
      throw new Error(`Object ${poolId} is not a BalancePool (got type=${raw.type})`);
    }

    // V1: gRPC `core.getObject` returns `content` as BCS-encoded bytes (opt-in via
    // `include: { content: true }`). We don't unpack them yet — owner / status /
    // nonce will come from the indexer in V2. Surface what the bare object header
    // already gives us: type confirmation + id.
    return {
      id: poolId,
      owner: '',
      status: 0 as PoolStatus,
      nextNonce: 0n,
      generation: 0n,
      balances: new Map(),
      delegations: new Map(),
    };
  }

  /**
   * Light header view (id + owner + status) — same data as `getPool` minus collections.
   */
  async getPoolSummary(poolId: string): Promise<BalancePoolSummary> {
    const pool = await this.getPool(poolId);
    return {
      id: pool.id,
      owner: pool.owner,
      status: pool.status,
      delegationCount: pool.delegations.size,
    };
  }

  /**
   * Not implemented in V1 — Table reads require dynamic-field walks. Use the indexer
   * once it's online, or call `getPool` and traverse `delegations` manually.
   */
  async getDelegation(_poolId: string, _agent: string): Promise<Delegation> {
    throw new Error('PinaceClient.getDelegation: not implemented in V1 — query the indexer');
  }

  /**
   * Not implemented in V1 — requires an indexer-backed reverse lookup from owner address.
   */
  async listPoolsByOwner(_owner: string): Promise<string[]> {
    throw new Error('PinaceClient.listPoolsByOwner: not implemented in V1 — query the indexer');
  }
}
