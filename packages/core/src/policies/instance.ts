import type { Transaction, TransactionArgument, TransactionResult } from '@mysten/sui/transactions';

export interface PolicyInstance {
  packageId: string;
  module: string;
  proveFn?: string;
  needsClock?: boolean;
  extraArgs?: TransactionArgument[];
}

export function buildPolicyProve(args: {
  tx: Transaction;
  poolId: string;
  request: TransactionArgument | TransactionResult;
  policy: PolicyInstance;
  clockId?: string;
}): Transaction {
  const { tx, poolId, request, policy } = args;
  const target = `${policy.packageId}::${policy.module}::${policy.proveFn ?? 'prove'}`;
  const callArgs: (TransactionArgument | TransactionResult)[] = [tx.object(poolId), request];
  if (policy.needsClock) callArgs.push(tx.object(args.clockId ?? '0x6'));
  if (policy.extraArgs) callArgs.push(...policy.extraArgs);
  tx.moveCall({ target, arguments: callArgs });
  return tx;
}

export function buildPolicyProves(args: {
  tx: Transaction;
  poolId: string;
  request: TransactionArgument | TransactionResult;
  policies: PolicyInstance[];
  clockId?: string;
}): Transaction {
  for (const policy of args.policies) {
    buildPolicyProve({
      tx: args.tx,
      poolId: args.poolId,
      request: args.request,
      policy,
      ...(args.clockId !== undefined ? { clockId: args.clockId } : {}),
    });
  }
  return args.tx;
}
