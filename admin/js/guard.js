/* ============================================================
   HUBCORE CMS — Route Guard
   Verifies authentication and admin role before rendering
   the dashboard. Redirects to login if unauthorized.
   ============================================================ */

import { supabase, isConfigured } from '../../src/lib/supabase.js';

/**
 * Verifies the current session and admin role.
 * Returns the user profile on success, or redirects to login.
 * @returns {Promise<{user: object, profile: object}>}
 */
export async function requireAdmin() {
  if (!isConfigured) {
    window.location.href = '/admin/login.html';
    throw new Error('Not configured');
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    window.location.href = '/admin/login.html';
    throw new Error('No session');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    await supabase.auth.signOut();
    window.location.href = '/admin/login.html';
    throw new Error('Not admin');
  }

  return { user: session.user, profile };
}

/**
 * Signs the user out and redirects to login.
 */
export async function signOut() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  window.location.href = '/admin/login.html';
}
