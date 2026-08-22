import type { SupabaseClient } from '@supabase/supabase-js';
import type { CloudDriver } from './driver';
import { normalizeState } from '../../lib/migrate';

/** Original strategy: the whole state as one jsonb blob in `planner_data` (one row per user). */
export function createBlobDriver(sb: SupabaseClient): CloudDriver {
  return {
    async load(userId) {
      const res = await sb.from('planner_data').select('data,updated_at').eq('user_id', userId).maybeSingle();
      if (res.error) throw new Error(res.error.message);
      const row = res.data as { data?: unknown; updated_at?: string } | null;
      if (!row || !row.data) return null;
      return { state: normalizeState(row.data), updatedAt: row.updated_at ?? null };
    },
    async save(userId, state) {
      const res = await sb.from('planner_data').upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() });
      if (res.error) throw new Error(res.error.message);
    },
  };
}
