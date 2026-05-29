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
 * Deployed `core` package IDs per network. Pass into `PinaceClient` config.
 */
export const PACKAGE_IDS = {
  testnet: '0x8f7acde213fb19211b0dcd3a6527a4847d2f3631d90267880dd198291ab70fdf',
  mainnet: '0x0', // not deployed yet
} as const;

/** Convenience default. Use `PACKAGE_IDS.testnet` or `PACKAGE_IDS.mainnet` explicitly in production code. */
export const DEFAULT_PACKAGE_ID = PACKAGE_IDS.testnet;

/**
 * Shared `PolicyRegistration<Witness>` object IDs created when the package was
 * published. Each entry gates whether the policy is trusted by the protocol —
 * `attach_policy` requires the registration object that matches the witness type.
 */
export const POLICY_REGISTRATION_IDS = {
  testnet: {
    spendingLimit: '0x463fa83bb908fcdf989cdc648cfb0448dbe46828d50718dbbfae9c73edcd55c4',
    tokenWhitelist: '0xc667b1d21ae62373074b4d291db78b2a078c5e39d683bb9e7f389831084ec16b',
    slippageGuard: '0x1b9deed2739f6e7c0a00ff9911d09521adbe2c5d4d8f49a71ed486004dcad12e',
    timeWindow: '0x2c7435c67fd0760424606e15c3faa79a2b4740e000ad2c5ae3619974581be4fb',
  },
  mainnet: {
    spendingLimit: '0x0',
    tokenWhitelist: '0x0',
    slippageGuard: '0x0',
    timeWindow: '0x0',
  },
} as const;

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
