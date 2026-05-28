import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { Transaction } from '@mysten/sui/transactions';
import { ActionKind, buildProposeAction, buildSettleAction, PinaceClient } from '@pinace/core';
import * as policies from '@pinace/core/policies';

export type PolicyName = 'spendingLimit' | 'tokenWhitelist' | 'slippageGuard' | 'timeWindow';

export interface PinaceAgentConfig {
  suiClient: SuiClient;
  signer: Signer;
  packageId: string;
  poolId: string;
}

export interface ProposeAndSettleArgs {
  kind: 'swap' | 'withdraw' | 'generic';
  coinIn: string;
  coinOut: string;
  amountIn: bigint;
  quotedAmountOut: bigint;
  minAmountOut: bigint;
  deadlineMs: bigint;
  routeHash?: Uint8Array;
  memo?: string;
  /** Names of policies to call `prove` on inside the PTB. Order matters only if policies have side effects. */
  policies: PolicyName[];
}

/**
 * High-level entry point for an AI agent runtime.
 *
 * Wraps the hot-potato `propose_action → policy proves → settle_action` PTB so callers
 * don't have to assemble it by hand.
 */
export class PinaceAgent {
  readonly suiClient: SuiClient;
  readonly signer: Signer;
  readonly packageId: string;
  readonly poolId: string;
  readonly read: PinaceClient;

  constructor(config: PinaceAgentConfig) {
    this.suiClient = config.suiClient;
    this.signer = config.signer;
    this.packageId = config.packageId;
    this.poolId = config.poolId;
    this.read = new PinaceClient({
      suiClient: config.suiClient,
      packageId: config.packageId,
    });
  }

  /**
   * Build, sign, and submit a single PTB that opens the hot-potato Request, calls every
   * configured policy `prove` to attach receipts, then settles.
   */
  async proposeAndSettle(args: ProposeAndSettleArgs) {
    const tx = new Transaction();

    const kind = mapKind(args.kind);
    const request = buildProposeAction({
      tx,
      packageId: this.packageId,
      poolId: this.poolId,
      coinInType: args.coinIn,
      coinOutType: args.coinOut,
      kind,
      amountIn: args.amountIn,
      quotedAmountOut: args.quotedAmountOut,
      minAmountOut: args.minAmountOut,
      deadlineMs: args.deadlineMs,
      routeHash: args.routeHash ?? new Uint8Array(),
      memo: args.memo ?? '',
    });

    for (const policyName of args.policies) {
      attachPolicyProve(tx, policyName, this.packageId, this.poolId, request);
    }

    buildSettleAction({ tx, packageId: this.packageId, poolId: this.poolId, request });

    return this.suiClient.signAndExecuteTransaction({
      signer: this.signer,
      transaction: tx,
      options: { showEffects: true, showEvents: true, showObjectChanges: true },
    });
  }
}

function mapKind(kind: ProposeAndSettleArgs['kind']): ActionKind {
  switch (kind) {
    case 'swap':
      return ActionKind.Swap;
    case 'withdraw':
      return ActionKind.Withdraw;
    case 'generic':
      return ActionKind.Generic;
  }
}

function attachPolicyProve(
  tx: Transaction,
  policyName: PolicyName,
  packageId: string,
  poolId: string,
  request: ReturnType<typeof buildProposeAction>,
): void {
  switch (policyName) {
    case 'spendingLimit':
      policies.spendingLimit.buildProve({ tx, packageId, poolId, request });
      return;
    case 'tokenWhitelist':
      policies.tokenWhitelist.buildProve({ tx, packageId, poolId, request });
      return;
    case 'slippageGuard':
      policies.slippageGuard.buildProve({ tx, packageId, poolId, request });
      return;
    case 'timeWindow':
      policies.timeWindow.buildProve({ tx, packageId, poolId, request });
      return;
  }
}
