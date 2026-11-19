/* ============================================================
   HUBCORE CMS — Dashboard Overview View
   ============================================================ */

import { supabase } from '../../../src/lib/supabase.js';

export async function renderOverview(container, topbarActions) {
  try {
    // Parallel metric queries
    const [projectsRes, journalRes, mediaRes, draftConfigRes, logsRes] = await Promise.all([
      supabase.from('projects').select('id, status, is_featured_home'),
      supabase.from('journal_posts').select('id, status'),
      supabase.from('media_assets').select('id', { count: 'exact', head: true }),
      supabase.from('site_config').select('key').not('draft_value', 'is', null),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(10),
    ]);

    const projects = projectsRes.data || [];
    const publishedProjects = projects.filter((p) => p.status === 'published').length;
    const homeFeaturedProjects = projects.filter((p) => p.is_featured_home && p.status === 'published').length;
    const draftProjects = projects.filter((p) => p.status === 'draft').length;

    const posts = journalRes.data || [];
    const publishedPosts = posts.filter((p) => p.status === 'published').length;
    const draftPosts = posts.filter((p) => p.status === 'draft').length;

    const mediaCount = mediaRes.count || 0;
    const pendingDraftsCount = (draftConfigRes.data || []).length;
    const logs = logsRes.data || [];

    container.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value">${publishedProjects}</div>
          <div class="stat-label">Published Projects</div>
          <p class="form-hint" style="margin-top:0.4rem;">${homeFeaturedProjects} featured on Homepage · ${draftProjects} drafts</p>
        </div>
        <div class="stat-card">
          <div class="stat-value">${publishedPosts}</div>
          <div class="stat-label">Journal Posts</div>
          <p class="form-hint" style="margin-top:0.4rem;">${draftPosts} draft articles</p>
        </div>
        <div class="stat-card">
          <div class="stat-value">${mediaCount}</div>
          <div class="stat-label">Media Assets</div>
          <p class="form-hint" style="margin-top:0.4rem;">Stored in Supabase Storage</p>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: ${pendingDraftsCount > 0 ? 'var(--warning)' : 'var(--ink)'};">${pendingDraftsCount}</div>
          <div class="stat-label">Pending Homepage Drafts</div>
          <p class="form-hint" style="margin-top:0.4rem;">${pendingDraftsCount > 0 ? 'Review & publish in Homepage' : 'All live'}</p>
        </div>
      </div>

      <div class="form-row" style="margin-bottom: 2rem;">
        <div class="edit-panel" style="margin-bottom:0;">
          <h3 class="edit-panel-title" style="margin-bottom: 1rem;">Quick Actions</h3>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            <a href="#projects" class="btn btn-secondary" style="justify-content:flex-start;">
              + Create New Project
            </a>
            <a href="#journal" class="btn btn-secondary" style="justify-content:flex-start;">
              + Write Journal Entry
            </a>
            <a href="#homepage" class="btn btn-secondary" style="justify-content:flex-start;">
              ✎ Edit Homepage Copy
            </a>
            <a href="#media" class="btn btn-secondary" style="justify-content:flex-start;">
              ↑ Upload Media to Library
            </a>
          </div>
        </div>

        <div class="edit-panel" style="margin-bottom:0;">
          <h3 class="edit-panel-title" style="margin-bottom: 1rem;">Recent Activity</h3>
          ${logs.length === 0 ? '<p class="form-hint">No activity recorded yet.</p>' : `
            <ul class="activity-list">
              ${logs.map((log) => `
                <li class="activity-item">
                  <span class="activity-dot ${log.action}"></span>
                  <div class="activity-text">
                    <strong>${escapeHtml(log.action.toUpperCase())}</strong> ${escapeHtml(log.entity_type)}: ${escapeHtml(log.entity_id || '')}
                    <div class="form-hint">${escapeHtml(log.user_email || 'System')}</div>
                  </div>
                  <span class="activity-time">${formatDate(log.created_at)}</span>
                </li>
              `).join('')}
            </ul>
          `}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p class="empty-state-title">Unable to load dashboard metrics.</p><p class="empty-state-text">${escapeHtml(err.message)}</p></div>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
