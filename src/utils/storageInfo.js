export async function getStorageInfo() {
  if (!navigator.storage || !navigator.storage.estimate) {
    return {
      supported: false,
      usage: null,
      quota: null,
      usagePercent: null,
      persisted: null,
    };
  }

  const estimate = await navigator.storage.estimate();
  const persisted = navigator.storage.persisted
    ? await navigator.storage.persisted()
    : null;

  const usage = estimate.usage ?? null;
  const quota = estimate.quota ?? null;

  return {
    supported: true,
    usage,
    quota,
    usagePercent:
      usage != null && quota ? Math.round((usage / quota) * 100) : null,
    persisted,
  };
}

export async function requestPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) {
    return {
      supported: false,
      granted: false,
    };
  }

  const granted = await navigator.storage.persist();
  return {
    supported: true,
    granted,
  };
}

export function formatBytes(bytes) {
  if (bytes == null) return 'Unknown';

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}