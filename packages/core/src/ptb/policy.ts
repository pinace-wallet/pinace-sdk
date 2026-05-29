import type { Transaction, TransactionArgument } from '@mysten/sui/transactions';
import { PinaceModules } from '../constants.js';

/**
 * Generic `attach_policy<Witness, Config>` PTB builder.
 *
 * Each policy module exposes its own `Witness` type + `Config` type. To attach a
 * policy you:
 *   1. Build a `Config` value (typically via `<policy>::new_config(...)` Move call).
 *   2. Call this helper with the witness type-arg, config type-arg, the matching
 *      `PolicyRegistration<Witness>` shared object id (gating which policies the
 *      protocol trusts), and the config `TransactionArgument` produced by step 1.
 *
 * `configHash` and `marketplaceId` are off-chain metadata stored verbatim; pass empty
 * vectors when you don't have a marketplace listing yet.
 */
export function buildAttachPolicy(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  registrationId: string;
  agent: string;
  witnessType: string;
  configType: string;
  configArg: TransactionArgument;
  configHash?: Uint8Array;
  marketplaceId?: Uint8Array;
  clockId?: string;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::${PinaceModules.BalancePool}::attach_policy`,
    typeArguments: [args.witnessType, args.configType],
    arguments: [
      args.tx.object(args.poolId),
      args.tx.object(args.registrationId),
      args.tx.pure.address(args.agent),
      args.configArg,
      args.tx.pure.vector('u8', Array.from(args.configHash ?? new Uint8Array())),
      args.tx.pure.vector('u8', Array.from(args.marketplaceId ?? new Uint8Array())),
      args.tx.object(args.clockId ?? '0x6'),
    ],
  });
  return args.tx;
}

/**
 * Update an existing policy's config.
 */
export function buildUpdatePolicy(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  agent: string;
  witnessType: string;
  configType: string;
  configArg: TransactionArgument;
  configHash?: Uint8Array;
  marketplaceId?: Uint8Array;
  clockId?: string;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::${PinaceModules.BalancePool}::update_policy`,
    typeArguments: [args.witnessType, args.configType],
    arguments: [
      args.tx.object(args.poolId),
      args.tx.pure.address(args.agent),
      args.configArg,
      args.tx.pure.vector('u8', Array.from(args.configHash ?? new Uint8Array())),
      args.tx.pure.vector('u8', Array.from(args.marketplaceId ?? new Uint8Array())),
      args.tx.object(args.clockId ?? '0x6'),
    ],
  });
  return args.tx;
}

/**
 * Remove a previously-attached policy.
 */
export function buildRemovePolicy(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  agent: string;
  witnessType: string;
  configType: string;
  clockId?: string;
}): Transaction {
  args.tx.moveCall({
    target: `${args.packageId}::${PinaceModules.BalancePool}::remove_policy`,
    typeArguments: [args.witnessType, args.configType],
    arguments: [
      args.tx.object(args.poolId),
      args.tx.pure.address(args.agent),
      args.tx.object(args.clockId ?? '0x6'),
    ],
  });
  return args.tx;
}
