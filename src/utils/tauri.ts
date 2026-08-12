import { invoke } from '@tauri-apps/api/core';
import type { InvokeArgs } from '@tauri-apps/api/core';

// Check if running in Tauri or browser
export const isTauriRuntime = () => {
  // @ts-expect-error - Tauri internal API not typed
  return !!(window.__TAURI_INTERNALS__);
};

import { ipcLogger } from './logger';
import { LOCAL_API_URL } from './api';

let browserSessionToken: string | null = null;

export function getBrowserSessionHeaders(): Record<string, string> {
  return browserSessionToken
    ? { 'X-Aurea-Browser-Session': browserSessionToken }
    : {};
}

export async function safeInvoke<T>(cmd: string, args?: object): Promise<T | null> {
  const stopTimer = ipcLogger.startTimer();
  try {
    let result: T;
    if (isTauriRuntime()) {
      result = await invoke<T>(cmd, args as InvokeArgs);
      ipcLogger.metricIPC(cmd, stopTimer(), true);
      return result;
    } else {
      const response = await fetch(`${LOCAL_API_URL}/browser/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(browserSessionToken ? { 'X-Aurea-Browser-Session': browserSessionToken } : {}),
        },
        body: JSON.stringify({ command: cmd, args: args || {} }),
      });
      const payload = await response.json().catch(() => null) as {
        result?: T;
        browser_session_token?: string;
        detail?: unknown;
      } | null;
      if (!response.ok) {
        throw new Error(typeof payload?.detail === 'string' ? payload.detail : `Browser command failed: ${response.status}`);
      }
      if (payload?.browser_session_token) browserSessionToken = payload.browser_session_token;
      if (cmd === 'private_session_close') browserSessionToken = null;
      ipcLogger.metricIPC(cmd, stopTimer(), true);
      return payload?.result ?? null;
    }
  } catch (err: unknown) {
    ipcLogger.metricIPC(cmd, stopTimer(), false);
    ipcLogger.error(`Command ${cmd} failed:`, err);
    return null;
  }
}
