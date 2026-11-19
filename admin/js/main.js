/* ============================================================
   HUBCORE CMS — Admin Entry Point
   Enforces authorization guard, binds chrome interactions,
   and boots the view router.
   ============================================================ */

import { requireAdmin, signOut } from './guard.js';
import { initRouter } from './router.js';

async function bootstrap() {
  try {
    const { user, profile } = await requireAdmin();

    // Display user identity in sidebar
    const emailEl = document.getElementById('current-user-email');
    if (emailEl) {
      emailEl.textContent = profile.email || user.email;
    }

    // Bind logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await signOut();
      });
    }

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('admin-sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('is-open');
      });
    }

    // Launch router
    initRouter(profile);
  } catch (err) {
    // requireAdmin handled the redirect to login.html
    console.warn('Authentication check failed:', err.message);
  }
}

bootstrap();
