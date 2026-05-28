import { describe, expect, it } from 'vitest';
import { PinaceAgent, type PolicyName } from '../src/index.js';

describe('@pinace/agent-sdk smoke', () => {
  it('PolicyName accepts the four bundled policies', () => {
    const names: PolicyName[] = ['spendingLimit', 'tokenWhitelist', 'slippageGuard', 'timeWindow'];
    expect(names).toHaveLength(4);
  });

  it('PinaceAgent is exported as a value', () => {
    expect(typeof PinaceAgent).toBe('function');
  });
});
