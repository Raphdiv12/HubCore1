/* ============================================================
   HUBCORE CMS — Projects & Works View
   CRUD for projects, homepage slots, and works page plates.
   ============================================================ */

import { supabase } from '../../../src/lib/supabase.js';
import { showToast } from '../components/toast.js';
import { confirmModal } from '../components/modal.js';

export async function renderProjects(container, topbarActions, userProfile) {
  topbarActions.innerHTML = `
    <button class="btn" id="btn-new-project" type="button">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      New Project
    </button>
  `;

  document.getElementById('btn-new-project').addEventListener('click', () => {
    openProjectEditor(null, container, topbarActions, userProfile);
  });

  await loadProjectsTable(container, topbarActions, userProfile);
}

async function loadProjectsTable(container, topbarActions, userProfile) {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('home_sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!projects || projects.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-state-title">No projects found.</p>
          <p class="empty-state-text">Create your first project or run seed data in Supabase.</p>
          <button class="btn" id="btn-create-empty" style="margin-top:1rem;" type="button">Create Project</button>
        </div>
      `;
      document.getElementById('btn-create-empty')?.addEventListener('click', () => {
        openProjectEditor(null, container, topbarActions, userProfile);
      });
      return;
    }

    container.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">All Projects (${projects.length})</h2>
          <p class="form-hint">Controls items rendered in the Homepage Work Grid and /works/ Exhibition Plates.</p>
        </div>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Home Slot</th>
              <th>Works Slot</th>
              <th>Layout</th>
              <th>Status</th>
              <th>Year</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${projects.map((p) => `
              <tr data-id="${p.id}">
                <td>
                  <strong>${escapeHtml(p.title)}</strong>
                  <div class="form-hint">${escapeHtml(p.slug)}</div>
                </td>
                <td>${escapeHtml(p.category || '—')}</td>
                <td>
                  ${p.is_featured_home
                    ? `<span class="badge" style="background:#ede8e0; color:var(--ink);">Slot ${p.home_slot_index || p.home_sort_order}</span>`
                    : '<span style="color:var(--ink-ghost);">Off</span>'}
                </td>
                <td>
                  ${p.asset_slot_id
                    ? `<span class="badge" style="background:#e3edf7; color:#1d4ed8;">${escapeHtml(p.asset_slot_id)}</span>`
                    : '<span style="color:var(--ink-ghost);">—</span>'}
                </td>
                <td><code style="font-size:0.75rem;">${escapeHtml(p.grid_layout_variant)}</code></td>
                <td><span class="badge badge-${p.status}">${p.status}</span></td>
                <td>${escapeHtml(p.year || '—')}</td>
                <td style="text-align:right; white-space:nowrap;">
                  <button class="btn btn-secondary btn-sm btn-edit" data-id="${p.id}" type="button">Edit</button>
                  <button class="btn btn-danger btn-sm btn-del" data-id="${p.id}" data-title="${escapeHtml(p.title)}" type="button">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Bind edit buttons
    container.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const project = projects.find((p) => p.id === id);
        openProjectEditor(project, container, topbarActions, userProfile);
      });
    });

    // Bind delete buttons
    container.querySelectorAll('.btn-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const title = btn.dataset.title;
        const project = projects.find((p) => p.id === id);

        const ok = await confirmModal('Delete Project', `Are you sure you want to delete "${title}"? This cannot be undone.`);
        if (!ok) return;

        try {
          // Log deletion before removing
          await supabase.from('activity_logs').insert({
            user_id: userProfile?.id || null,
            user_email: userProfile?.email || 'admin',
            action: 'delete',
            entity_type: 'projects',
            entity_id: id,
            previous_value: project,
          });

          const { error: delErr } = await supabase.from('projects').delete().eq('id', id);
          if (delErr) throw delErr;

          showToast(`Deleted "${title}"`, 'success');
          loadProjectsTable(container, topbarActions, userProfile);
        } catch (err) {
          showToast(`Error deleting: ${err.message}`, 'error');
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p class="empty-state-title">Error loading projects.</p><p class="empty-state-text">${escapeHtml(err.message)}</p></div>`;
  }
}

function openProjectEditor(project, container, topbarActions, userProfile) {
  const isEditing = Boolean(project);

  container.innerHTML = `
    <div class="edit-panel">
      <div class="edit-panel-header">
        <h3 class="edit-panel-title">${isEditing ? `Edit: ${escapeHtml(project.title)}` : 'Create New Project'}</h3>
        <div class="edit-panel-actions">
          <button class="btn btn-secondary btn-sm" id="btn-cancel-edit" type="button">Cancel</button>
        </div>
      </div>

      <form id="project-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="proj-title">Project Title *</label>
            <input class="form-input" type="text" id="proj-title" required value="${escapeHtml(project?.title || '')}" placeholder="e.g. Meridian Identity">
          </div>
          <div class="form-group">
            <label class="form-label" for="proj-slug">Slug (URL Key) *</label>
            <input class="form-input" type="text" id="proj-slug" required value="${escapeHtml(project?.slug || '')}" placeholder="e.g. meridian-identity">
            <p class="form-hint">Used for identification and asset binding.</p>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="proj-category">Category</label>
            <input class="form-input" type="text" id="proj-category" value="${escapeHtml(project?.category || '')}" placeholder="e.g. Brand Identity">
          </div>
          <div class="form-group">
            <label class="form-label" for="proj-discipline">Discipline (Subtitle)</label>
            <input class="form-input" type="text" id="proj-discipline" value="${escapeHtml(project?.discipline || '')}" placeholder="e.g. Branding · Graphic design · Digital product">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="proj-summary">Summary Line</label>
          <input class="form-input" type="text" id="proj-summary" value="${escapeHtml(project?.summary || '')}" placeholder="A short description for exhibition plates or cards">
        </div>

        <div class="form-group">
          <label class="form-label" for="proj-desc">Detailed Practice Note</label>
          <textarea class="form-textarea" id="proj-desc" rows="3" placeholder="Deep architectural / design practice note">${escapeHtml(project?.description || '')}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="proj-thumb">Thumbnail URL (Image)</label>
            <input class="form-input" type="text" id="proj-thumb" value="${escapeHtml(project?.thumbnail_url || '')}" placeholder="https://... or /works/hamza-01.webp">
            <p class="form-hint">Shown in homepage grid or media slot.</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="proj-hero-vid">Hero Video URL (Optional)</label>
            <input class="form-input" type="text" id="proj-hero-vid" value="${escapeHtml(project?.hero_video_url || '')}" placeholder="https://... or /Maker_kneeling_refine.mp4">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="proj-layout">Homepage Grid Layout Variant</label>
            <select class="form-select" id="proj-layout">
              <option value="large" ${project?.grid_layout_variant === 'large' ? 'selected' : ''}>large (Col 1-7, 4:3 ratio)</option>
              <option value="portrait" ${project?.grid_layout_variant === 'portrait' ? 'selected' : ''}>portrait (Col 9-12, 3:4 ratio)</option>
              <option value="medium" ${project?.grid_layout_variant === 'medium' ? 'selected' : ''}>medium (Col 5-10, 4:3 ratio)</option>
              <option value="small" ${project?.grid_layout_variant === 'small' ? 'selected' : ''}>small (Col 1-3, 1:1 ratio)</option>
              <option value="wide" ${project?.grid_layout_variant === 'wide' ? 'selected' : ''}>wide (Col 2-8, 16:9 ratio)</option>
              <option value="tall" ${project?.grid_layout_variant === 'tall' ? 'selected' : ''}>tall (Col 10-12, 4:5 ratio)</option>
              <option value="compact" ${project?.grid_layout_variant === 'compact' ? 'selected' : ''}>compact (Col 5-7, 1:1 ratio)</option>
              <option value="landscape" ${project?.grid_layout_variant === 'landscape' ? 'selected' : ''}>landscape (Col 8-12, 3:2 ratio)</option>
            </select>
            <p class="form-hint">Matches HubCore's exact 12-column CSS grid rules.</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="proj-slot-id">Works Page Asset Slot ID</label>
            <select class="form-select" id="proj-slot-id">
              <option value="" ${!project?.asset_slot_id ? 'selected' : ''}>None (Not an exhibition plate)</option>
              <option value="hamza" ${project?.asset_slot_id === 'hamza' ? 'selected' : ''}>hamza (Plate 01)</option>
              <option value="kukuchow" ${project?.asset_slot_id === 'kukuchow' ? 'selected' : ''}>kukuchow (Plate 02)</option>
              <option value="rttc" ${project?.asset_slot_id === 'rttc' ? 'selected' : ''}>rttc (Plate 03)</option>
              <option value="becoming" ${project?.asset_slot_id === 'becoming' ? 'selected' : ''}>becoming (Plate 04)</option>
              <option value="noric" ${project?.asset_slot_id === 'noric' ? 'selected' : ''}>noric (Plate 05)</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="proj-home-slot">Homepage Grid Slot (1 to 8)</label>
            <select class="form-select" id="proj-home-slot">
              <option value="" ${!project?.home_slot_index ? 'selected' : ''}>None</option>
              <option value="1" ${project?.home_slot_index === 1 ? 'selected' : ''}>Slot 1 (Meridian Identity default)</option>
              <option value="2" ${project?.home_slot_index === 2 ? 'selected' : ''}>Slot 2 (Arcana Digital default)</option>
              <option value="3" ${project?.home_slot_index === 3 ? 'selected' : ''}>Slot 3 (Lumen Editorial default)</option>
              <option value="4" ${project?.home_slot_index === 4 ? 'selected' : ''}>Slot 4 (Forma Spatial default)</option>
              <option value="5" ${project?.home_slot_index === 5 ? 'selected' : ''}>Slot 5 (Vow Campaign default)</option>
              <option value="6" ${project?.home_slot_index === 6 ? 'selected' : ''}>Slot 6 (Halden Studio default)</option>
              <option value="7" ${project?.home_slot_index === 7 ? 'selected' : ''}>Slot 7 (Oro default)</option>
              <option value="8" ${project?.home_slot_index === 8 ? 'selected' : ''}>Slot 8 (Field Notes default)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="proj-year">Year</label>
            <input class="form-input" type="text" id="proj-year" value="${escapeHtml(project?.year || '2026')}" placeholder="2026">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <div class="form-checkbox-wrap" style="margin-top:1.5rem;">
              <input type="checkbox" id="proj-featured-home" ${project?.is_featured_home ? 'checked' : ''}>
              <label class="form-checkbox-label" for="proj-featured-home">Feature in Homepage Selected Work</label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="proj-status">Publication Status</label>
            <select class="form-select" id="proj-status">
              <option value="draft" ${project?.status === 'draft' ? 'selected' : ''}>Draft (Not visible on public site)</option>
              <option value="published" ${project?.status === 'published' ? 'selected' : ''}>Published (Authoritative on live site)</option>
              <option value="archived" ${project?.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
        </div>

        <div style="display:flex; gap:0.75rem; margin-top:2rem;">
          <button class="btn" type="submit" id="btn-save-project">
            ${isEditing ? 'Save Changes' : 'Create Project'}
          </button>
          <button class="btn btn-secondary" type="button" id="btn-cancel-bottom">Cancel</button>
        </div>
      </form>
    </div>
  `;

  // Auto-slug generator on new title
  const titleInput = document.getElementById('proj-title');
  const slugInput = document.getElementById('proj-slug');
  if (!isEditing && titleInput && slugInput) {
    titleInput.addEventListener('input', () => {
      slugInput.value = titleInput.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    });
  }

  // Cancel handlers
  const cancel = () => loadProjectsTable(container, topbarActions, userProfile);
  document.getElementById('btn-cancel-edit')?.addEventListener('click', cancel);
  document.getElementById('btn-cancel-bottom')?.addEventListener('click', cancel);

  // Form submission
  document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('btn-save-project');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    const homeSlotVal = document.getElementById('proj-home-slot').value;
    const homeSlotIndex = homeSlotVal ? parseInt(homeSlotVal, 10) : null;

    const payload = {
      title: titleInput.value.trim(),
      slug: slugInput.value.trim(),
      category: document.getElementById('proj-category').value.trim(),
      discipline: document.getElementById('proj-discipline').value.trim(),
      summary: document.getElementById('proj-summary').value.trim(),
      description: document.getElementById('proj-desc').value.trim(),
      thumbnail_url: document.getElementById('proj-thumb').value.trim(),
      hero_video_url: document.getElementById('proj-hero-vid').value.trim(),
      grid_layout_variant: document.getElementById('proj-layout').value,
      asset_slot_id: document.getElementById('proj-slot-id').value || null,
      home_slot_index: homeSlotIndex,
      is_featured_home: document.getElementById('proj-featured-home').checked,
      year: document.getElementById('proj-year').value.trim() || '2026',
      status: document.getElementById('proj-status').value,
      published_at: document.getElementById('proj-status').value === 'published' ? new Date().toISOString() : null,
    };

    try {
      if (isEditing) {
        // Record activity log with snapshot
        await supabase.from('activity_logs').insert({
          user_id: userProfile?.id || null,
          user_email: userProfile?.email || 'admin',
          action: 'update',
          entity_type: 'projects',
          entity_id: project.id,
          details: { title: payload.title, status: payload.status },
          previous_value: project,
        });

        const { error: updateErr } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', project.id);

        if (updateErr) throw updateErr;
        showToast(`Saved "${payload.title}"`, 'success');
      } else {
        const { data: newRow, error: insertErr } = await supabase
          .from('projects')
          .insert(payload)
          .select('id')
          .single();

        if (insertErr) throw insertErr;

        // Record activity log
        await supabase.from('activity_logs').insert({
          user_id: userProfile?.id || null,
          user_email: userProfile?.email || 'admin',
          action: 'create',
          entity_type: 'projects',
          entity_id: newRow?.id || payload.slug,
          details: { title: payload.title, status: payload.status },
        });

        showToast(`Created "${payload.title}"`, 'success');
      }

      loadProjectsTable(container, topbarActions, userProfile);
    } catch (err) {
      showToast(`Error saving project: ${err.message}`, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = isEditing ? 'Save Changes' : 'Create Project';
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
