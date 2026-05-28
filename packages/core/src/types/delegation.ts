import type { DelegationStatus } from '../constants.js';

/**
 * TypeScript mirror of `core::delegation::PolicyInfo`.
 */
export interface PolicyInfo {
  policyType: string;
  status: number;
  createdMs: bigint;
  updatedMs: bigint;
  configHash: Uint8Array;
  marketplaceId: Uint8Array;
}

/**
 * TypeScript mirror of `core::delegation::Delegation`.
 *
 * `configs` holds opaque policy-specific configuration bytes — decode using the
 * helpers in `@pinace/core/policies`.
 */
export interface Delegation {
  agent: string;
  status: DelegationStatus;
  createdMs: bigint;
  updatedMs: bigint;
  revokedMs: bigint;
  expiresMs: bigint;
  generation: bigint;
  actionCount: bigint;
  policyTypes: string[];
  policies: Map<string, PolicyInfo>;
}
