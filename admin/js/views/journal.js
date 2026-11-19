/* ============================================================
   HUBCORE CMS — Journal Management View
   CRUD for studio essays, observations, and case studies.
   ============================================================ */

import { supabase } from '../../../src/lib/supabase.js';
import { showToast } from '../components/toast.js';
import { confirmModal } from '../components/modal.js';

export async function renderJournal(container, topbarActions, userProfile) {
  topbarActions.innerHTML = `
    <button class="btn" id="btn-new-post" type="button">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      New Journal Entry
    </button>
  `;

  document.getElementById('btn-new-post').addEventListener('click', () => {
    openJournalEditor(null, container, topbarActions, userProfile);
  });

  await loadJournalTable(container, topbarActions, userProfile);
}

async function loadJournalTable(container, topbarActions, userProfile) {
  try {
    const { data: posts, error } = await supabase
      .from('journal_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!posts || posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-state-title">No journal entries yet.</p>
          <p class="empty-state-text">Publish thoughts, essays, or architectural observations.</p>
          <button class="btn" id="btn-create-first-post" style="margin-top:1rem;" type="button">Write First Entry</button>
        </div>
      `;
      document.getElementById('btn-create-first-post')?.addEventListener('click', () => {
        openJournalEditor(null, container, topbarActions, userProfile);
      });
      return;
    }

    container.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Journal & Essays (${posts.length})</h2>
          <p class="form-hint">Articles and practice notes available through the HubCore API.</p>
        </div>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Reading Time</th>
              <th>Status</th>
              <th>Date</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${posts.map((p) => `
              <tr data-id="${p.id}">
                <td>
                  <strong>${escapeHtml(p.title)}</strong>
                  <div class="form-hint">${escapeHtml(p.slug)}</div>
                </td>
                <td><span class="badge" style="background:#ede8e0; color:var(--ink);">${escapeHtml(p.category)}</span></td>
                <td>${p.reading_time_minutes || 4} min</td>
                <td><span class="badge badge-${p.status}">${p.status}</span></td>
                <td>${formatDate(p.published_at || p.created_at)}</td>
                <td style="text-align:right; white-space:nowrap;">
                  <button class="btn btn-secondary btn-sm btn-edit-post" data-id="${p.id}" type="button">Edit</button>
                  <button class="btn btn-danger btn-sm btn-del-post" data-id="${p.id}" data-title="${escapeHtml(p.title)}" type="button">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Bind edit
    container.querySelectorAll('.btn-edit-post').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const post = posts.find((p) => p.id === id);
        openJournalEditor(post, container, topbarActions, userProfile);
      });
    });

    // Bind delete
    container.querySelectorAll('.btn-del-post').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const title = btn.dataset.title;
        const post = posts.find((p) => p.id === id);

        const ok = await confirmModal('Delete Journal Entry', `Delete "${title}"? This cannot be undone.`);
        if (!ok) return;

        try {
          await supabase.from('activity_logs').insert({
            user_id: userProfile?.id || null,
            user_email: userProfile?.email || 'admin',
            action: 'delete',
            entity_type: 'journal',
            entity_id: id,
            previous_value: post,
          });

          const { error: delErr } = await supabase.from('journal_posts').delete().eq('id', id);
          if (delErr) throw delErr;

          showToast(`Deleted "${title}"`, 'success');
          loadJournalTable(container, topbarActions, userProfile);
        } catch (err) {
          showToast(`Error deleting: ${err.message}`, 'error');
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p class="empty-state-title">Error loading journal.</p><p class="empty-state-text">${escapeHtml(err.message)}</p></div>`;
  }
}

function openJournalEditor(post, container, topbarActions, userProfile) {
  const isEditing = Boolean(post);

  container.innerHTML = `
    <div class="edit-panel">
      <div class="edit-panel-header">
        <h3 class="edit-panel-title">${isEditing ? `Edit: ${escapeHtml(post.title)}` : 'Write Journal Entry'}</h3>
        <div class="edit-panel-actions">
          <button class="btn btn-secondary btn-sm" id="btn-cancel-post-top" type="button">Cancel</button>
        </div>
      </div>

      <form id="journal-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="post-title">Article Title *</label>
            <input class="form-input" type="text" id="post-title" required value="${escapeHtml(post?.title || '')}" placeholder="e.g. On Graphite and Code">
          </div>
          <div class="form-group">
            <label class="form-label" for="post-slug">Slug *</label>
            <input class="form-input" type="text" id="post-slug" required value="${escapeHtml(post?.slug || '')}" placeholder="on-graphite-and-code">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="post-category">Category</label>
            <select class="form-select" id="post-category">
              <option value="Practice" ${post?.category === 'Practice' ? 'selected' : ''}>Practice</option>
              <option value="Essay" ${post?.category === 'Essay' ? 'selected' : ''}>Essay</option>
              <option value="Observation" ${post?.category === 'Observation' ? 'selected' : ''}>Observation</option>
              <option value="Case Study" ${post?.category === 'Case Study' ? 'selected' : ''}>Case Study</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="post-reading-time">Reading Time (Minutes)</label>
            <input class="form-input" type="number" id="post-reading-time" value="${post?.reading_time_minutes || 4}" min="1">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="post-excerpt">Excerpt / Subheading</label>
          <input class="form-input" type="text" id="post-excerpt" value="${escapeHtml(post?.excerpt || '')}" placeholder="A short lead-in for index cards">
        </div>

        <div class="form-group">
          <label class="form-label" for="post-cover">Cover Image URL</label>
          <input class="form-input" type="text" id="post-cover" value="${escapeHtml(post?.cover_image_url || '')}" placeholder="https://... or /assets/...">
        </div>

        <div class="form-group">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <label class="form-label" for="post-content" style="margin-bottom:0;">Content (HTML / Markdown) *</label>
            <button class="btn btn-secondary btn-sm" id="btn-toggle-preview" type="button">Toggle Preview</button>
          </div>
          <textarea class="form-textarea" id="post-content" rows="12" required placeholder="Write your article here...">${escapeHtml(post?.content_html || '')}</textarea>
        </div>

        <div id="post-preview-pane" class="preview-pane" style="display:none;">
          <div class="preview-label">Live Content Preview</div>
          <div id="post-preview-body"></div>
        </div>

        <div class="form-row" style="margin-top:1.5rem;">
          <div class="form-group">
            <label class="form-label" for="post-status">Publication Status</label>
            <select class="form-select" id="post-status">
              <option value="draft" ${post?.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="published" ${post?.status === 'published' ? 'selected' : ''}>Published</option>
              <option value="archived" ${post?.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
        </div>

        <div style="display:flex; gap:0.75rem; margin-top:2rem;">
          <button class="btn" type="submit" id="btn-save-post">
            ${isEditing ? 'Save Entry' : 'Create Entry'}
          </button>
          <button class="btn btn-secondary" type="button" id="btn-cancel-post-bottom">Cancel</button>
        </div>
      </form>
    </div>
  `;

  const titleInput = document.getElementById('post-title');
  const slugInput = document.getElementById('post-slug');
  const contentInput = document.getElementById('post-content');
  const readingTimeInput = document.getElementById('post-reading-time');
  const previewPane = document.getElementById('post-preview-pane');
  const previewBody = document.getElementById('post-preview-body');

  // Auto-slug
  if (!isEditing && titleInput && slugInput) {
    titleInput.addEventListener('input', () => {
      slugInput.value = titleInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    });
  }

  // Auto-calculate reading time from word count
  contentInput.addEventListener('input', () => {
    const text = contentInput.value.replace(/<[^>]*>/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const est = Math.max(1, Math.round(words / 200));
    readingTimeInput.value = est;
    if (previewPane.style.display !== 'none') {
      previewBody.innerHTML = contentInput.value;
    }
  });

  // Toggle preview
  document.getElementById('btn-toggle-preview').addEventListener('click', () => {
    const isHidden = previewPane.style.display === 'none';
    previewPane.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      previewBody.innerHTML = contentInput.value || '<p style="color:var(--ink-ghost);">No content written yet.</p>';
    }
  });

  const cancel = () => loadJournalTable(container, topbarActions, userProfile);
  document.getElementById('btn-cancel-post-top')?.addEventListener('click', cancel);
  document.getElementById('btn-cancel-post-bottom')?.addEventListener('click', cancel);

  document.getElementById('journal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('btn-save-post');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    const payload = {
      title: titleInput.value.trim(),
      slug: slugInput.value.trim(),
      category: document.getElementById('post-category').value,
      reading_time_minutes: parseInt(readingTimeInput.value, 10) || 4,
      excerpt: document.getElementById('post-excerpt').value.trim(),
      cover_image_url: document.getElementById('post-cover').value.trim(),
      content_html: contentInput.value,
      status: document.getElementById('post-status').value,
      author_id: userProfile?.id || null,
      published_at: document.getElementById('post-status').value === 'published' ? new Date().toISOString() : null,
    };

    try {
      if (isEditing) {
        await supabase.from('activity_logs').insert({
          user_id: userProfile?.id || null,
          user_email: userProfile?.email || 'admin',
          action: 'update',
          entity_type: 'journal',
          entity_id: post.id,
          details: { title: payload.title, status: payload.status },
          previous_value: post,
        });

        const { error: updateErr } = await supabase
          .from('journal_posts')
          .update(payload)
          .eq('id', post.id);

        if (updateErr) throw updateErr;
        showToast(`Saved "${payload.title}"`, 'success');
      } else {
        const { data: newRow, error: insertErr } = await supabase
          .from('journal_posts')
          .insert(payload)
          .select('id')
          .single();

        if (insertErr) throw insertErr;

        await supabase.from('activity_logs').insert({
          user_id: userProfile?.id || null,
          user_email: userProfile?.email || 'admin',
          action: 'create',
          entity_type: 'journal',
          entity_id: newRow?.id || payload.slug,
          details: { title: payload.title, status: payload.status },
        });

        showToast(`Created "${payload.title}"`, 'success');
      }

      loadJournalTable(container, topbarActions, userProfile);
    } catch (err) {
      showToast(`Error saving: ${err.message}`, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = isEditing ? 'Save Entry' : 'Create Entry';
    }
  });
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
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
