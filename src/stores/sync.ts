export function setupStoreSyncSubscriptions(): () => void {
  const cleanups: Array<() => void> = [];

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
