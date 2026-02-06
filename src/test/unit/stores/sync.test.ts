import { describe, expect, it } from 'vitest';
import { setupStoreSyncSubscriptions } from '../../../stores/sync';

describe('store sync setup', () => {
  it('should setup and cleanup without errors', () => {
    const cleanup = setupStoreSyncSubscriptions();
    expect(() => cleanup()).not.toThrow();
  });
});
