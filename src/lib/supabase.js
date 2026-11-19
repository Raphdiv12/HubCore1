/* ============================================================
   HUBCORE CMS — Supabase Client Singleton
   Shared between admin dashboard and public frontend hydration.
   Fails gracefully when env vars are missing.
   ============================================================ */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** @type {boolean} */
export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
