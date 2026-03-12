import { invoke } from '@tauri-apps/api/core';

export async function safeInvoke<T>(cmd: string, args?: any): Promise<T | null> {
  try {
    // @ts-ignore
    if (window.__TAURI_INTERNALS__) return await invoke<T>(cmd, args);
    return null;
  } catch (err) {
    console.error(`[safeInvoke Error] ${cmd}:`, err);
    return null;
  }
}
