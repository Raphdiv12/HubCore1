/* ============================================================
   HUBCORE CMS — Admin View Router
   Handles tab/hash navigation between CMS modules.
   ============================================================ */

import { renderOverview } from './views/overview.js';
import { renderProjects } from './views/projects.js';
import { renderJournal } from './views/journal.js';
import { renderHomepage } from './views/homepage.js';
import { renderMedia } from './views/media.js';

const routes = {
  overview: { title: 'Dashboard & Activity Overview', render: renderOverview },
  projects: { title: 'Projects & Works Management', render: renderProjects },
  journal: { title: 'Journal Management', render: renderJournal },
  homepage: { title: 'Controlled Homepage Content', render: renderHomepage },
  media: { title: 'Media Library & Assets', render: renderMedia },
};

export function initRouter(userProfile) {
  const container = document.getElementById('view-container');
  const viewTitle = document.getElementById('view-title');
  const topbarActions = document.getElementById('topbar-actions');
  const navLinks = document.querySelectorAll('.sidebar-link[data-view]');

  function navigate(viewName) {
    const route = routes[viewName] || routes.overview;
    const targetKey = routes[viewName] ? viewName : 'overview';

    // Update URL hash without scroll
    window.location.hash = targetKey;

    // Update active sidebar state
    navLinks.forEach((link) => {
      link.classList.toggle('is-active', link.dataset.view === targetKey);
    });

    // Update topbar title
    if (viewTitle) viewTitle.textContent = route.title;

    // Clear topbar actions
    if (topbarActions) topbarActions.innerHTML = '';

    // Render view
    container.innerHTML = '<div class="admin-loading">Loading content…</div>';
    route.render(container, topbarActions, userProfile);

    // Close mobile sidebar if open
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) sidebar.classList.remove('is-open');
  }

  // Sidebar link clicks
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      navigate(link.dataset.view);
    });
  });

  // Handle browser back/forward or initial hash
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && routes[hash]) {
      navigate(hash);
    }
  });

  const initialHash = window.location.hash.replace('#', '');
  navigate(initialHash || 'overview');
}
