import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Signer } from '@mysten/sui/cryptography';
import { Transaction } from '@mysten/sui/transactions';
import { ActionKind, buildProposeAction, buildSettleAction, PinaceClient } from '@pinace/core';
import { buildPolicyProves, type PolicyInstance } from '@pinace/core/policies';

export interface PinaceAgentConfig {
  suiClient: SuiGrpcClient;
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
  policies: PolicyInstance[];
}

export class PinaceAgent {
  readonly suiClient: SuiGrpcClient;
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

  async proposeAndSettle(args: ProposeAndSettleArgs) {
    const tx = new Transaction();

    const request = buildProposeAction({
      tx,
      packageId: this.packageId,
      poolId: this.poolId,
      coinInType: args.coinIn,
      coinOutType: args.coinOut,
      kind: mapKind(args.kind),
      amountIn: args.amountIn,
      quotedAmountOut: args.quotedAmountOut,
      minAmountOut: args.minAmountOut,
      deadlineMs: args.deadlineMs,
      routeHash: args.routeHash ?? new Uint8Array(),
      memo: args.memo ?? '',
    });

    buildPolicyProves({
      tx,
      poolId: this.poolId,
      request,
      policies: args.policies,
    });

    buildSettleAction({ tx, packageId: this.packageId, poolId: this.poolId, request });

    return this.suiClient.signAndExecuteTransaction({
      signer: this.signer,
      transaction: tx,
      include: { effects: true, events: true, objectTypes: true },
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
