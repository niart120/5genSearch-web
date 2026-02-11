import { describe, it, expect } from 'vitest';
import { normalizeLocationKey } from '@/data/encounters/loader';

describe('normalizeLocationKey', () => {
  it('removes spaces', () => {
    expect(normalizeLocationKey('1番 道路')).toBe('1番道路');
  });

  it('removes full-width spaces', () => {
    expect(normalizeLocationKey('1番\u3000道路')).toBe('1番道路');
  });

  it('removes hyphens and dashes', () => {
    expect(normalizeLocationKey('B2F-B6F')).toBe('B2FB6F');
    expect(normalizeLocationKey('B2F–B6F')).toBe('B2FB6F');
    expect(normalizeLocationKey('B2F—B6F')).toBe('B2FB6F');
  });

  it('preserves underscores', () => {
    expect(normalizeLocationKey('route_6_spring')).toBe('route_6_spring');
  });

  it('removes dots', () => {
    expect(normalizeLocationKey('route.1')).toBe('route1');
  });

  it('trims whitespace', () => {
    expect(normalizeLocationKey('  1番道路  ')).toBe('1番道路');
  });

  it('handles empty string', () => {
    expect(normalizeLocationKey('')).toBe('');
  });

  it('preserves parentheses', () => {
    expect(normalizeLocationKey('ネジ山(春)')).toBe('ネジ山(春)');
  });
});
