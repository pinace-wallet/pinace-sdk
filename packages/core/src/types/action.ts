import type { ActionKind } from '../constants.js';

/**
 * TypeScript mirror of `core::action::Action`.
 *
 * Numeric fields (`amount_in`, `nonce`, `deadline_ms`, etc.) come back from the chain
 * as `string` to preserve `u64` precision in JSON. Helpers in `@pinace/core/ptb` accept
 * `bigint | number | string` and normalize internally.
 */
export interface Action {
  kind: ActionKind;
  agent: string;
  poolId: string;
  nonce: bigint;
  generation: bigint;
  coinIn: string;
  coinOut: string;
  amountIn: bigint;
  quotedAmountOut: bigint;
  minAmountOut: bigint;
  deadlineMs: bigint;
  routeHash: Uint8Array;
  memo: string;
}

/**
 * Quote object the SDK passes into `proposeAction` so the policy modules can validate
 * a swap before it executes.
 */
export interface ActionQuote {
  amountIn: bigint;
  quotedAmountOut: bigint;
  minAmountOut: bigint;
  deadlineMs: bigint;
  routeHash: Uint8Array;
}
