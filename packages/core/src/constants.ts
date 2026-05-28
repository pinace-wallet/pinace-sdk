/**
 * Action kind constants — mirror `core::action` Move module.
 */
export const ActionKind = {
  Generic: 0,
  Swap: 1,
  Withdraw: 2,
  Deposit: 3,
} as const;
export type ActionKind = (typeof ActionKind)[keyof typeof ActionKind];

/**
 * Pool status — mirror `core::balance_pool` constants.
 */
export const PoolStatus = {
  Active: 1,
  Paused: 2,
  Revoked: 3,
} as const;
export type PoolStatus = (typeof PoolStatus)[keyof typeof PoolStatus];

/**
 * Delegation status — mirror `core::delegation` constants.
 */
export const DelegationStatus = {
  Active: 1,
  Paused: 2,
  Revoked: 3,
} as const;
export type DelegationStatus = (typeof DelegationStatus)[keyof typeof DelegationStatus];

/**
 * Settlement result codes — mirror `core::balance_pool` settle constants.
 */
export const SettleResult = {
  Ok: 1,
} as const;
export type SettleResult = (typeof SettleResult)[keyof typeof SettleResult];

/**
 * Bounds enforced on-chain by `core::action`.
 */
export const ActionLimits = {
  MaxMemoBytes: 256,
  MaxRouteHashBytes: 64,
} as const;

/**
 * Placeholder package ID — replace with the actual deployed package ID per network.
 *
 * Override at runtime via `PinaceClient` config or `setPackageId()`.
 */
export const DEFAULT_PACKAGE_ID = '0x0';

/**
 * Move module fully-qualified names for common targets.
 *
 * @example `${packageId}::${PinaceModules.BalancePool}::create`
 */
export const PinaceModules = {
  Action: 'action',
  BalancePool: 'balance_pool',
  Delegation: 'delegation',
  Request: 'request',
  Events: 'events',
  Version: 'version',
} as const;

/**
 * On-chain event type tags emitted by `core::events`. Useful for indexer filters.
 */
export const EventTypes = {
  PoolCreated: 'PoolCreatedEvent',
  Deposit: 'DepositEvent',
  Withdraw: 'WithdrawEvent',
  AgentConnected: 'AgentConnectedEvent',
  AgentRevoked: 'AgentRevokedEvent',
  PolicyAttached: 'PolicyAttachedEvent',
  PolicyUpdated: 'PolicyUpdatedEvent',
  PolicyRemoved: 'PolicyRemovedEvent',
  ActionProposed: 'ActionProposedEvent',
  ActionSettled: 'ActionSettledEvent',
} as const;
