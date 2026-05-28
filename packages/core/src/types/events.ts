/**
 * TypeScript mirrors of `core::events` payloads. These match exactly the on-chain
 * event structs so an indexer can deserialize directly.
 */

export interface PoolCreatedEvent {
  poolId: string;
  owner: string;
  version: bigint;
}

export interface DepositEvent {
  poolId: string;
  owner: string;
  coinType: string;
  amount: bigint;
}

export interface WithdrawEvent {
  poolId: string;
  owner: string;
  coinType: string;
  amount: bigint;
  recipient: string;
}

export interface AgentConnectedEvent {
  poolId: string;
  owner: string;
  agent: string;
  expiresMs: bigint;
}

export interface AgentRevokedEvent {
  poolId: string;
  owner: string;
  agent: string;
  reason: Uint8Array;
}

export interface PolicyAttachedEvent {
  poolId: string;
  owner: string;
  agent: string;
  policyType: string;
  configHash: Uint8Array;
  marketplaceId: Uint8Array;
}

export interface PolicyUpdatedEvent {
  poolId: string;
  owner: string;
  agent: string;
  policyType: string;
  configHash: Uint8Array;
  marketplaceId: Uint8Array;
}

export interface PolicyRemovedEvent {
  poolId: string;
  owner: string;
  agent: string;
  policyType: string;
}

export interface ActionProposedEvent {
  poolId: string;
  agent: string;
  nonce: bigint;
  kind: number;
  amountIn: bigint;
  minAmountOut: bigint;
}

export interface ActionSettledEvent {
  poolId: string;
  agent: string;
  nonce: bigint;
  kind: number;
  status: number;
}
