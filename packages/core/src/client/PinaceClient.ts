import type { SuiClient } from '@mysten/sui/client';
import type { BalancePool, BalancePoolSummary } from '../types/balance-pool.js';
import type { Delegation } from '../types/delegation.js';

export interface PinaceClientConfig {
  /** Underlying Sui RPC client. */
  suiClient: SuiClient;
  /** Deployed package id of the `core` Move package on the target network. */
  packageId: string;
}

/**
 * Read-side client for querying Pinace on-chain state.
 *
 * Stub implementation — fill in as the contracts stabilize. Methods here should
 * map roughly 1:1 to the view requirements of the wallet UI and indexer.
 */
export class PinaceClient {
  readonly suiClient: SuiClient;
  readonly packageId: string;

  constructor(config: PinaceClientConfig) {
    this.suiClient = config.suiClient;
    this.packageId = config.packageId;
  }

  /**
   * Load a full `BalancePool` shared object including delegations and balances.
   */
  async getPool(_poolId: string): Promise<BalancePool> {
    throw new Error('PinaceClient.getPool: not implemented yet');
  }

  /**
   * Load a lightweight summary for a pool (faster than `getPool`).
   */
  async getPoolSummary(_poolId: string): Promise<BalancePoolSummary> {
    throw new Error('PinaceClient.getPoolSummary: not implemented yet');
  }

  /**
   * Load the delegation record for a specific agent under a pool.
   */
  async getDelegation(_poolId: string, _agent: string): Promise<Delegation> {
    throw new Error('PinaceClient.getDelegation: not implemented yet');
  }

  /**
   * Return all pool ids owned by the given address.
   */
  async listPoolsByOwner(_owner: string): Promise<string[]> {
    throw new Error('PinaceClient.listPoolsByOwner: not implemented yet');
  }
}
