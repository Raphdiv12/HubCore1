/* ============================================================
   HUBCORE CMS — Controlled Homepage Content View
   Full Draft, Preview, and Controlled Publication Workflow.
   ============================================================ */

import { supabase } from '../../../src/lib/supabase.js';
import { showToast } from '../components/toast.js';
import { confirmModal } from '../components/modal.js';

const CONFIG_FIELDS = [
  { section: 'Hero', key: 'hero_tagline_line1', label: 'Tagline Line 1', type: 'text', default: 'Your Vision,' },
  { section: 'Hero', key: 'hero_tagline_line2', label: 'Tagline Line 2', type: 'text', default: 'Our Design' },
  { section: 'Hero', key: 'hero_body', label: 'Body Paragraph', type: 'textarea', default: 'Independent digital atelier crafting considered experiences for those who value intention over noise.' },

  { section: 'Philosophy', key: 'philosophy_heading', label: 'Section Subheading', type: 'text', default: 'Craft in Motion' },
  { section: 'Philosophy', key: 'philosophy_description', label: 'Description', type: 'textarea', default: 'Things don\'t simply appear as finished products. They become through observation, planning, making, refining, and the clarity of stepping back.' },

  { section: 'Process Stage 01', key: 'process_stage_1_name', label: 'Stage 01 Name', type: 'text', default: 'Observe' },
  { section: 'Process Stage 01', key: 'process_stage_1_description', label: 'Stage 01 Description', type: 'textarea', default: 'Understanding before action. We listen, research, and absorb the context of every brief before making a single mark.' },

  { section: 'Process Stage 02', key: 'process_stage_2_name', label: 'Stage 02 Name', type: 'text', default: 'Plan' },
  { section: 'Process Stage 02', key: 'process_stage_2_description', label: 'Stage 02 Description', type: 'textarea', default: 'Structure emerges from clarity. We map the architecture before we build, so nothing is arbitrary.' },

  { section: 'Process Stage 03', key: 'process_stage_3_name', label: 'Stage 03 Name', type: 'text', default: 'Make' },
  { section: 'Process Stage 03', key: 'process_stage_3_description', label: 'Stage 03 Description', type: 'textarea', default: 'Hands meet surface. The work takes form through material decisions, iterative craft, and focused execution.' },

  { section: 'Process Stage 04', key: 'process_stage_4_name', label: 'Stage 04 Name', type: 'text', default: 'Refine' },
  { section: 'Process Stage 04', key: 'process_stage_4_description', label: 'Stage 04 Description', type: 'textarea', default: 'Details matter at every scale. We polish until the work communicates with precision and without excess.' },

  { section: 'Process Stage 05', key: 'process_stage_5_name', label: 'Stage 05 Name', type: 'text', default: 'Step Back' },
  { section: 'Process Stage 05', key: 'process_stage_5_description', label: 'Stage 05 Description', type: 'textarea', default: 'Distance reveals what proximity conceals. We evaluate the whole before declaring the work complete.' },

  { section: 'Footer', key: 'footer_email', label: 'Studio Contact Email', type: 'text', default: 'hello@hubcore.design' },
  { section: 'Footer', key: 'footer_tagline', label: 'Footer Tagline', type: 'text', default: 'Your Vision, Our Design' },
];

export async function renderHomepage(container, topbarActions, userProfile) {
  try {
    const { data: configRows, error } = await supabase
      .from('site_config')
      .select('*');

    if (error) throw error;

    const configMap = new Map();
    (configRows || []).forEach((row) => {
      configMap.set(row.key, row);
    });

    const pendingDraftsCount = (configRows || []).filter((r) => r.draft_value !== null).length;

    topbarActions.innerHTML = `
      <button class="btn btn-secondary btn-sm" id="btn-toggle-home-preview" type="button">Preview Drafts</button>
      ${pendingDraftsCount > 0 ? `
        <button class="btn btn-secondary btn-sm" id="btn-discard-drafts" type="button" style="color:var(--error);">Discard Drafts (${pendingDraftsCount})</button>
        <button class="btn btn-sm" id="btn-publish-drafts" type="button" style="background:var(--success); border-color:var(--success);">Publish Changes (${pendingDraftsCount})</button>
      ` : ''}
    `;

    // Group fields by section
    const sections = {};
    CONFIG_FIELDS.forEach((f) => {
      if (!sections[f.section]) sections[f.section] = [];
      sections[f.section].push(f);
    });

    container.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Controlled Homepage Content</h2>
          <p class="form-hint">Edit copy for Hero, Philosophy, Process, and Footer without modifying frontend code. Supports drafts, previewing, and controlled publishing.</p>
        </div>
      </div>

      <div id="home-preview-pane" class="preview-pane" style="display:none; margin-bottom: 2rem;">
        <div class="preview-label">Live Draft Representation Preview</div>
        <div id="home-preview-content" style="background:#f5f2ed; padding:1.5rem; border:1px solid rgba(26,26,26,0.1);"></div>
      </div>

      <form id="homepage-form">
        ${Object.entries(sections).map(([sectionName, fields]) => `
          <div class="edit-panel">
            <h3 class="edit-panel-title" style="margin-bottom: 1rem;">${sectionName}</h3>
            ${fields.map((f) => {
              const row = configMap.get(f.key);
              const liveValue = row?.value || f.default;
              const hasDraft = row?.draft_value !== null && row?.draft_value !== undefined;
              const currentValue = hasDraft ? row.draft_value : liveValue;

              return `
                <div class="form-group" style="margin-bottom: 1.25rem;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
                    <label class="form-label" for="cfg-${f.key}" style="margin-bottom:0;">
                      ${f.label}
                      ${hasDraft ? '<span class="badge badge-draft" style="margin-left:0.5rem;">Draft Pending</span>' : ''}
                    </label>
                    <span class="form-hint" style="font-size:0.625rem;">Key: <code>${f.key}</code></span>
                  </div>

                  ${f.type === 'textarea' ? `
                    <textarea class="form-textarea cfg-input" id="cfg-${f.key}" data-key="${f.key}" rows="3">${escapeHtml(currentValue)}</textarea>
                  ` : `
                    <input class="form-input cfg-input" type="text" id="cfg-${f.key}" data-key="${f.key}" value="${escapeHtml(currentValue)}">
                  `}

                  <div style="display:flex; justify-content:space-between; margin-top:0.25rem;">
                    <span class="form-hint">Live published: <em>${escapeHtml(liveValue.slice(0, 60))}${liveValue.length > 60 ? '…' : ''}</em></span>
                    ${hasDraft ? `<span class="form-hint" style="color:var(--warning);">Draft differs from live</span>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `).join('')}

        <div style="display:flex; gap:0.75rem; margin-top:1.5rem; position:sticky; bottom:1rem; background:var(--white); padding:1rem; border:1px solid var(--rule); box-shadow:0 4px 12px rgba(0,0,0,0.05); z-index:5;">
          <button class="btn" type="submit" id="btn-save-drafts">Save as Draft</button>
          <button class="btn btn-secondary" type="button" id="btn-preview-bottom">Preview Drafts</button>
        </div>
      </form>
    `;

    // Preview builder
    const togglePreview = () => {
      const previewPane = document.getElementById('home-preview-pane');
      const previewContent = document.getElementById('home-preview-content');
      const isHidden = previewPane.style.display === 'none';
      previewPane.style.display = isHidden ? 'block' : 'none';

      if (isHidden) {
        const values = {};
        container.querySelectorAll('.cfg-input').forEach((input) => {
          values[input.dataset.key] = input.value;
        });

        previewContent.innerHTML = `
          <div style="margin-bottom:1.5rem; border-bottom:1px solid rgba(26,26,26,0.1); padding-bottom:1rem;">
            <p style="font-size:0.75rem; text-transform:uppercase; color:#7a7a7a; letter-spacing:0.08em;">Hero Preview</p>
            <h1 style="font-size:2rem; font-weight:300; line-height:1.1; margin:0.5rem 0;">
              ${escapeHtml(values['hero_tagline_line1'] || '')}<br>
              ${escapeHtml(values['hero_tagline_line2'] || '')}
            </h1>
            <p style="color:#4a4a4a; max-width:600px;">${escapeHtml(values['hero_body'] || '')}</p>
          </div>

          <div style="margin-bottom:1.5rem; border-bottom:1px solid rgba(26,26,26,0.1); padding-bottom:1rem;">
            <p style="font-size:0.75rem; text-transform:uppercase; color:#7a7a7a; letter-spacing:0.08em;">Philosophy Preview</p>
            <h2 style="font-size:1.25rem; font-weight:500; margin:0.4rem 0;">${escapeHtml(values['philosophy_heading'] || '')}</h2>
            <p style="color:#4a4a4a; max-width:600px;">${escapeHtml(values['philosophy_description'] || '')}</p>
          </div>

          <div>
            <p style="font-size:0.75rem; text-transform:uppercase; color:#7a7a7a; letter-spacing:0.08em; margin-bottom:0.5rem;">Process Stages Preview</p>
            <ol style="list-style:none; padding:0; display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1rem;">
              ${[1, 2, 3, 4, 5].map((num) => `
                <li style="border:1px solid rgba(26,26,26,0.1); padding:0.75rem; background:#fff;">
                  <span style="font-family:var(--font-mono); font-size:0.75rem; color:#7a7a7a;">0${num}</span>
                  <h4 style="font-size:0.875rem; margin:0.25rem 0;">${escapeHtml(values[`process_stage_${num}_name`] || '')}</h4>
                  <p style="font-size:0.75rem; color:#4a4a4a;">${escapeHtml(values[`process_stage_${num}_description`] || '')}</p>
                </li>
              `).join('')}
            </ol>
          </div>
        `;
        previewPane.scrollIntoView({ behavior: 'smooth' });
      }
    };

    document.getElementById('btn-toggle-home-preview')?.addEventListener('click', togglePreview);
    document.getElementById('btn-preview-bottom')?.addEventListener('click', togglePreview);

    // Save Drafts handler
    document.getElementById('homepage-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-drafts');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving drafts…';

      try {
        const updates = [];
        container.querySelectorAll('.cfg-input').forEach((input) => {
          const key = input.dataset.key;
          const draftVal = input.value;
          updates.push({
            key,
            draft_value: draftVal,
            updated_by: userProfile?.id || null,
          });
        });

        for (const item of updates) {
          const { error: upErr } = await supabase
            .from('site_config')
            .upsert(item, { onConflict: 'key' });
          if (upErr) throw upErr;
        }

        await supabase.from('activity_logs').insert({
          user_id: userProfile?.id || null,
          user_email: userProfile?.email || 'admin',
          action: 'update',
          entity_type: 'homepage_drafts',
          details: { updated_keys: updates.map((u) => u.key) },
        });

        showToast('Drafts saved. Click "Publish Changes" when ready for live site.', 'success');
        renderHomepage(container, topbarActions, userProfile);
      } catch (err) {
        showToast(`Error saving drafts: ${err.message}`, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save as Draft';
      }
    });

    // Publish Drafts handler
    document.getElementById('btn-publish-drafts')?.addEventListener('click', async () => {
      const ok = await confirmModal('Publish Homepage Content', `Publish all ${pendingDraftsCount} pending draft changes to the live website?`);
      if (!ok) return;

      try {
        // Query current drafts
        const { data: rows, error: qErr } = await supabase
          .from('site_config')
          .select('*')
          .not('draft_value', 'is', null);

        if (qErr) throw qErr;

        for (const row of (rows || [])) {
          const { error: pErr } = await supabase
            .from('site_config')
            .update({
              value: row.draft_value,
              draft_value: null,
              updated_by: userProfile?.id || null,
            })
            .eq('key', row.key);
          if (pErr) throw pErr;
        }

        await supabase.from('activity_logs').insert({
          user_id: userProfile?.id || null,
          user_email: userProfile?.email || 'admin',
          action: 'publish',
          entity_type: 'homepage_content',
          details: { published_keys: (rows || []).map((r) => r.key) },
        });

        showToast('All homepage drafts are now LIVE on the public website!', 'success');
        renderHomepage(container, topbarActions, userProfile);
      } catch (err) {
        showToast(`Error publishing: ${err.message}`, 'error');
      }
    });

    // Discard Drafts handler
    document.getElementById('btn-discard-drafts')?.addEventListener('click', async () => {
      const ok = await confirmModal('Discard Drafts', 'Discard all pending drafts? This will revert the editor to currently published live content.');
      if (!ok) return;

      try {
        const { error: discErr } = await supabase
          .from('site_config')
          .update({ draft_value: null })
          .not('draft_value', 'is', null);

        if (discErr) throw discErr;

        showToast('Drafts discarded. Restored live content.', 'info');
        renderHomepage(container, topbarActions, userProfile);
      } catch (err) {
        showToast(`Error discarding: ${err.message}`, 'error');
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p class="empty-state-title">Error loading homepage content.</p><p class="empty-state-text">${escapeHtml(err.message)}</p></div>`;
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
