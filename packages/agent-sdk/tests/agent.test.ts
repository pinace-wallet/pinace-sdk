import { describe, expect, it } from 'vitest';
import * as policies from '@pinace/core/policies';
import { PinaceAgent } from '../src/index.js';

describe('@pinace/agent-sdk smoke', () => {
  it('exposes PinaceAgent as a value', () => {
    expect(typeof PinaceAgent).toBe('function');
  });

  it('builds policy instances for the four bundled defaults', () => {
    const packageId = '0xpkg';
    const built = [
      policies.spendingLimit.policyInstance(packageId),
      policies.tokenWhitelist.policyInstance(packageId),
      policies.slippageGuard.policyInstance(packageId),
      policies.timeWindow.policyInstance(packageId),
    ];
    expect(built).toHaveLength(4);
    expect(built.every((p) => p.packageId === packageId)).toBe(true);
    expect(built.filter((p) => p.needsClock)).toHaveLength(2);
  });
});
