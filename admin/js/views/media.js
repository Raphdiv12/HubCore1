/* ============================================================
   HUBCORE CMS — Media Library View
   Storage Bucket integration (hubcore-media), drag-and-drop
   uploader, asset grid, and clipboard CDN copying.
   ============================================================ */

import { supabase } from '../../../src/lib/supabase.js';
import { showToast } from '../components/toast.js';
import { confirmModal } from '../components/modal.js';

const BUCKET_NAME = 'hubcore-media';

export async function renderMedia(container, topbarActions, userProfile) {
  topbarActions.innerHTML = `
    <button class="btn" id="btn-upload-trigger" type="button">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      Upload Asset
    </button>
  `;

  document.getElementById('btn-upload-trigger').addEventListener('click', () => {
    document.getElementById('media-file-input')?.click();
  });

  await loadMediaView(container, topbarActions, userProfile);
}

async function loadMediaView(container, topbarActions, userProfile) {
  try {
    const { data: assets, error } = await supabase
      .from('media_assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    container.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Media Library (${assets ? assets.length : 0})</h2>
          <p class="form-hint">Images and videos hosted on Supabase Storage. Click "Copy URL" to use assets in projects, articles, or plates.</p>
        </div>
      </div>

      <!-- Hidden file input for header trigger -->
      <input type="file" id="media-file-input" style="display:none;" accept="image/*,video/mp4,video/webm">

      <!-- Drag & Drop Zone -->
      <div class="upload-zone" id="drop-zone">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:0.5rem; opacity:0.6;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <p class="upload-zone-text"><strong>Drag and drop files here</strong> or click to browse</p>
        <p class="upload-zone-hint">Supports PNG, JPG, WebP, SVG, and MP4 videos</p>
      </div>

      <!-- Media Grid -->
      ${!assets || assets.length === 0 ? `
        <div class="empty-state">
          <p class="empty-state-title">No assets uploaded yet.</p>
          <p class="empty-state-text">Drag an image or video above to upload to Supabase Storage.</p>
        </div>
      ` : `
        <div class="media-grid">
          ${assets.map((asset) => {
            const isVideo = asset.mime_type.startsWith('video');
            return `
              <div class="media-card" data-id="${asset.id}">
                ${isVideo ? `
                  <div class="media-card-thumb" style="display:flex; align-items:center; justify-content:center; background:#1a1a1a; color:#fff;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                ` : `
                  <img src="${escapeHtml(asset.public_url)}" alt="${escapeHtml(asset.alt_text || asset.filename)}" class="media-card-thumb" loading="lazy">
                `}
                <div class="media-card-info">
                  <p class="media-card-name" title="${escapeHtml(asset.filename)}">${escapeHtml(asset.filename)}</p>
                  <p class="media-card-meta">${formatBytes(asset.file_size_bytes)} · ${asset.mime_type.split('/')[1] || 'file'}</p>
                </div>
                <div class="media-card-actions">
                  <button class="btn btn-secondary btn-sm btn-copy-url" data-url="${escapeHtml(asset.public_url)}" type="button" style="flex:1;">Copy URL</button>
                  <button class="btn btn-danger btn-sm btn-del-asset" data-id="${asset.id}" data-path="${escapeHtml(asset.storage_path)}" data-name="${escapeHtml(asset.filename)}" type="button" title="Delete">✕</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;

    // Bind file input change
    const fileInput = document.getElementById('media-file-input');
    fileInput?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) handleFileUploads(files, container, topbarActions, userProfile);
    });

    // Bind drag-and-drop
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
      dropZone.addEventListener('click', () => fileInput?.click());
      ['dragenter', 'dragover'].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropZone.classList.add('is-dragover');
        });
      });
      ['dragleave', 'drop'].forEach((eventName) => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          dropZone.classList.remove('is-dragover');
        });
      });
      dropZone.addEventListener('drop', (e) => {
        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length > 0) handleFileUploads(files, container, topbarActions, userProfile);
      });
    }

    // Bind copy URL buttons
    container.querySelectorAll('.btn-copy-url').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const url = btn.dataset.url;
        try {
          await navigator.clipboard.writeText(url);
          showToast('URL copied to clipboard!', 'info');
        } catch {
          showToast('Could not copy automatically. URL: ' + url, 'info');
        }
      });
    });

    // Bind delete buttons
    container.querySelectorAll('.btn-del-asset').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const path = btn.dataset.path;
        const name = btn.dataset.name;

        const ok = await confirmModal('Delete Media Asset', `Delete "${name}"? Any project or plate using this asset will lose its media link.`);
        if (!ok) return;

        try {
          // 1. Delete from storage
          await supabase.storage.from(BUCKET_NAME).remove([path]);

          // 2. Delete from database
          const { error: dbErr } = await supabase.from('media_assets').delete().eq('id', id);
          if (dbErr) throw dbErr;

          // 3. Log
          await supabase.from('activity_logs').insert({
            user_id: userProfile?.id || null,
            user_email: userProfile?.email || 'admin',
            action: 'delete',
            entity_type: 'media',
            entity_id: name,
          });

          showToast(`Deleted "${name}"`, 'success');
          loadMediaView(container, topbarActions, userProfile);
        } catch (err) {
          showToast(`Error deleting asset: ${err.message}`, 'error');
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p class="empty-state-title">Error loading media library.</p><p class="empty-state-text">${escapeHtml(err.message)}</p></div>`;
  }
}

async function handleFileUploads(files, container, topbarActions, userProfile) {
  showToast(`Uploading ${files.length} file(s)…`, 'info');

  for (const file of files) {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const storagePath = `uploads/${new Date().getFullYear()}/${timestamp}_${cleanName}`;

    try {
      // 1. Upload directly to Supabase storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });

      if (uploadErr) throw uploadErr;

      // 2. Obtain public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // 3. Insert record into media_assets table
      const { error: dbErr } = await supabase.from('media_assets').insert({
        filename: file.name,
        storage_path: storagePath,
        public_url: publicUrl,
        mime_type: file.type || 'application/octet-stream',
        file_size_bytes: file.size,
        uploaded_by: userProfile?.id || null,
      });

      if (dbErr) throw dbErr;

      // 4. Log
      await supabase.from('activity_logs').insert({
        user_id: userProfile?.id || null,
        user_email: userProfile?.email || 'admin',
        action: 'create',
        entity_type: 'media',
        entity_id: cleanName,
      });

      showToast(`Uploaded "${file.name}"`, 'success');
    } catch (err) {
      showToast(`Upload failed for "${file.name}": ${err.message}`, 'error');
    }
  }

  loadMediaView(container, topbarActions, userProfile);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
