import { describe, expect, it } from 'vitest';
import { resolveAvatar, AVATAR_LIBRARY } from './avatar';

describe('resolveAvatar', () => {
  it('prefers the uploaded photo over everything else', () => {
    const result = resolveAvatar({ photoUrl: 'https://example.com/me.jpg', avatarKey: 'curly', displayName: 'Amara' });
    expect(result).toEqual({ tier: 'photo', url: 'https://example.com/me.jpg' });
  });

  it('falls back to the picked illustrated avatar when there is no photo', () => {
    const result = resolveAvatar({ photoUrl: null, avatarKey: 'bob', displayName: 'Amara' });
    expect(result.tier).toBe('illustrated');
    expect(result.tier === 'illustrated' && result.entry.key).toBe('bob');
  });

  it('ignores an unknown avatarKey and falls through to initials', () => {
    const result = resolveAvatar({ photoUrl: null, avatarKey: 'not-a-real-key', displayName: 'Daniel' });
    expect(result).toEqual({ tier: 'initials', letter: 'D' });
  });

  it('falls back to initials when there is no photo and no avatar pick', () => {
    const result = resolveAvatar({ displayName: 'Daniel K.' });
    expect(result).toEqual({ tier: 'initials', letter: 'D' });
  });

  it('falls back to the brand mark when there is no name to draw an initial from', () => {
    const result = resolveAvatar({});
    expect(result).toEqual({ tier: 'brand' });
  });

  it('falls back to the brand mark for a blank display name', () => {
    const result = resolveAvatar({ displayName: '   ' });
    expect(result).toEqual({ tier: 'brand' });
  });

  it('exposes a stable, non-empty avatar library', () => {
    expect(AVATAR_LIBRARY.length).toBeGreaterThan(0);
    const keys = new Set(AVATAR_LIBRARY.map((entry) => entry.key));
    expect(keys.size).toBe(AVATAR_LIBRARY.length);
  });
});
