import { describe, expect, it } from 'vitest';
import { stepOnlineUsers } from './onlineUserSimulator';

describe('stepOnlineUsers', () => {
  it('never goes below the configured minimum', () => {
    let value = 800;
    for (let i = 0; i < 200; i += 1) {
      value = stepOnlineUsers(value, 800, 1500, () => 0);
    }
    expect(value).toBeGreaterThanOrEqual(800);
  });

  it('never exceeds the configured maximum', () => {
    let value = 1500;
    for (let i = 0; i < 200; i += 1) {
      value = stepOnlineUsers(value, 800, 1500, () => 1);
    }
    expect(value).toBeLessThanOrEqual(1500);
  });

  it('moves up when the RNG favors the upper half', () => {
    const next = stepOnlineUsers(1000, 800, 1500, () => 1);
    expect(next).toBeGreaterThan(1000);
  });

  it('moves down when the RNG favors the lower half', () => {
    const next = stepOnlineUsers(1000, 800, 1500, () => 0);
    expect(next).toBeLessThan(1000);
  });
});
