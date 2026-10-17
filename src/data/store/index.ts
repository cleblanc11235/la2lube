import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createMemoryStore } from './memoryStore';
import { createSupabaseStore } from './supabaseStore';
import type { ShopStore } from './ShopStore';

export * from './ShopStore';
export { createMemoryStore } from './memoryStore';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** The Supabase client, or null when the env vars aren't set (local dev without a database). */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

let defaultStore: ShopStore | null = null;

/** Supabase when configured, otherwise an in-memory store that forgets everything on refresh. */
export function getDefaultStore(): ShopStore {
  if (!defaultStore) {
    defaultStore = supabase ? createSupabaseStore(supabase) : createMemoryStore();
  }
  return defaultStore;
}
