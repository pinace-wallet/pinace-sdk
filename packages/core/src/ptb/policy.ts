import { balancePool } from '@pinace/contracts-sdk';
import type { Transaction, TransactionArgument } from '@mysten/sui/transactions';
import { bcs, type BcsType } from '@mysten/sui/bcs';

const ANY_CONFIG: BcsType<unknown> = bcs.bytes(0) as unknown as BcsType<unknown>;

/**
 * Generic `attach_policy<Witness, Config>` PTB builder.
 *
 * Each policy module exposes its own `Witness` type + `Config` type. To attach a
 * policy you:
 *   1. Build a `Config` value (typically via `<policy>::new_config(...)` Move call).
 *   2. Call this helper with the witness type-arg, config type-arg, and the config
 *      `TransactionArgument` produced by step 1.
 *
 * `configHash` and `marketplaceId` are off-chain metadata stored verbatim; pass empty
 * vectors when you don't have a marketplace listing yet.
 */
export function buildAttachPolicy(args: {
  tx: Transaction;
  packageId: string;
  poolId: string;
  agent: string;
  witnessType: string;
  configType: string;
  configArg: TransactionArgument;
  configHash?: Uint8Array;
  marketplaceId?: Uint8Array;
}): Transaction {
  args.tx.add(
    balancePool.attachPolicy<typeof ANY_CONFIG>({
      package: args.packageId,
      arguments: [
        args.poolId,
        args.agent,
        args.configArg,
        Array.from(args.configHash ?? new Uint8Array()),
        Array.from(args.marketplaceId ?? new Uint8Array()),
      ],
      typeArguments: [args.witnessType, args.configType],
    }),
  );
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
}): Transaction {
  args.tx.add(
    balancePool.updatePolicy<typeof ANY_CONFIG>({
      package: args.packageId,
      arguments: [
        args.poolId,
        args.agent,
        args.configArg,
        Array.from(args.configHash ?? new Uint8Array()),
        Array.from(args.marketplaceId ?? new Uint8Array()),
      ],
      typeArguments: [args.witnessType, args.configType],
    }),
  );
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
}): Transaction {
  args.tx.add(
    balancePool.removePolicy({
      package: args.packageId,
      arguments: [args.poolId, args.agent],
      typeArguments: [args.witnessType, args.configType],
    }),
  );
  return args.tx;
}
