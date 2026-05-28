import { describe, expect, it } from 'vitest';
import { ActionKind, DelegationStatus, PoolStatus } from '../src/constants.js';

describe('@pinace/core constants', () => {
  it('exposes action kinds matching Move constants', () => {
    expect(ActionKind.Generic).toBe(0);
    expect(ActionKind.Swap).toBe(1);
    expect(ActionKind.Withdraw).toBe(2);
    expect(ActionKind.Deposit).toBe(3);
  });

  it('exposes pool status matching Move constants', () => {
    expect(PoolStatus.Active).toBe(1);
    expect(PoolStatus.Paused).toBe(2);
    expect(PoolStatus.Revoked).toBe(3);
  });

  it('exposes delegation status matching Move constants', () => {
    expect(DelegationStatus.Active).toBe(1);
    expect(DelegationStatus.Paused).toBe(2);
    expect(DelegationStatus.Revoked).toBe(3);
  });
});
