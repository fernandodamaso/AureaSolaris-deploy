import { invoke } from '@tauri-apps/api/core';

// Check if running in Tauri or browser
const isTauri = () => {
  // @ts-expect-error - Tauri internal API not typed
  return !!(window.__TAURI_INTERNALS__);
};

import { ipcLogger } from './logger';

export async function safeInvoke<T>(cmd: string, args?: any): Promise<T | null> {
  const stopTimer = ipcLogger.startTimer();
  try {
    let result: T;
    if (isTauri()) {
      result = await invoke<T>(cmd, args);
      ipcLogger.metricIPC(cmd, stopTimer(), true);
      return result;
    } else {
      // Browser dev mode: no Tauri bridge available.
      // Return null so callers fall back to real local computation
      // (e.g. calculateFallback in useAstrologyData.ts) instead of stale mock data.
      console.warn(`[Aurea] Command '${cmd}' not available outside Tauri — returning null to trigger real fallback.`);
      ipcLogger.metricIPC(cmd, stopTimer(), false);
      return null;
    }
  } catch (err: any) {
    ipcLogger.metricIPC(cmd, stopTimer(), false);
    ipcLogger.error(`Command ${cmd} failed:`, err);
    return null;
  }
}
