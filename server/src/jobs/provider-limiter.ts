/**
 * Engine §6 — cap concurrent provider HTTP probes across workers (in-process).
 */

let active = 0;
const waiters: Array<() => void> = [];

function maxConcurrent(): number {
  return Number(process.env.PROVIDER_MAX_CONCURRENT ?? 4);
}

function release(): void {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

function acquire(): Promise<void> {
  const limit = maxConcurrent();
  if (active < limit) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      active++;
      resolve();
    });
  });
}

export async function withProviderSlot<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}

export function providerLimiterStats(): { active: number; max: number; queued: number } {
  return { active, max: maxConcurrent(), queued: waiters.length };
}

export function resetProviderLimiterForTest(): void {
  active = 0;
  waiters.length = 0;
}
