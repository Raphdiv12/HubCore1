/* ============================================================
   HUBCORE CMS — Authentication Handler
   Handles login form submission on /admin/login.html and
   redirects authenticated users to the dashboard.
   ============================================================ */

import { supabase, isConfigured } from '../../src/lib/supabase.js';

// If already on the dashboard and authenticated, stay there.
// If on the login page, handle the form.

async function init() {
  if (!isConfigured) {
    showError('Supabase is not configured. Check .env file.');
    return;
  }

  // Check if user is already logged in
  const { data: { session } } = await supabase.auth.getSession();

  // If on login page and already authenticated, redirect to dashboard
  if (session && window.location.pathname.includes('login')) {
    window.location.href = '/admin/';
    return;
  }

  // Bind the login form
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', handleLogin);
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showError('Please enter both email and password.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Signing in…';
  errorEl.textContent = '';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message === 'Invalid login credentials'
        ? 'Invalid email or password.'
        : error.message);
      btn.disabled = false;
      btn.textContent = 'Sign in';
      return;
    }

    // Verify the user has an admin profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      await supabase.auth.signOut();
      showError('You do not have administrator access.');
      btn.disabled = false;
      btn.textContent = 'Sign in';
      return;
    }

    // Success — redirect to dashboard
    window.location.href = '/admin/';
  } catch (err) {
    showError('An unexpected error occurred. Please try again.');
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
}

function showError(msg) {
  const el = document.getElementById('login-error');
  if (el) el.textContent = msg;
}

init();
