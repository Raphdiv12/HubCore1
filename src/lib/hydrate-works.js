/* ============================================================
   HUBCORE — Works Page Dynamic Hydration (src/lib/hydrate-works.js)
   Non-destructive progressive enhancement.
   Authoritative when Supabase is available: updates exhibition
   plates, injects .plate-asset images/videos into prepared slots,
   and hides unpublished plates while preserving CSS plate art.
   Preserves 100% of the static exhibition when Supabase is offline.
   ============================================================ */

import { supabase, isConfigured } from './supabase.js';

const KNOWN_SLOTS = ['hamza', 'kukuchow', 'rttc', 'becoming', 'noric'];

export async function hydrateWorks() {
  if (!isConfigured || !supabase) {
    // Offline or unconfigured: preserve static HTML entirely
    return;
  }

  try {
    const { data: publishedProjects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'published')
      .not('asset_slot_id', 'is', null)
      .order('works_sort_order', { ascending: true });

    if (error || !publishedProjects) return;

    const slotMap = new Map();
    publishedProjects.forEach((p) => {
      if (p.asset_slot_id) {
        slotMap.set(p.asset_slot_id.toLowerCase().trim(), p);
      }
    });

    KNOWN_SLOTS.forEach((slotId) => {
      const plate = document.getElementById(`work-${slotId}`);
      const indexLink = document.querySelector(`.works-index-link[href="#work-${slotId}"]`);
      const project = slotMap.get(slotId);

      if (project) {
        // Authoritative published plate: ensure visible
        if (plate) plate.style.display = '';
        if (indexLink && indexLink.parentElement) indexLink.parentElement.style.display = '';

        // Inject real asset into prepared slot if available
        const assetUrl = project.hero_image_url || project.thumbnail_url;
        const mediaSlot = plate?.querySelector(`[data-asset-slot="${slotId}"]`);

        if (assetUrl && mediaSlot) {
          let assetEl = mediaSlot.querySelector('.plate-asset');
          if (!assetEl) {
            assetEl = document.createElement('img');
            assetEl.className = 'plate-asset';
            assetEl.loading = 'lazy';
            mediaSlot.appendChild(assetEl);
          }
          assetEl.src = assetUrl;
          assetEl.alt = project.title;
        }

        // Update labels if provided
        const titleEl = plate?.querySelector('.plate-title');
        const lineEl = plate?.querySelector('.plate-line');
        const noteEl = plate?.querySelector('.plate-note');
        const discEl = plate?.querySelector('.plate-discipline');

        if (titleEl && project.title) titleEl.textContent = project.title;
        if (lineEl && project.summary) lineEl.textContent = project.summary;
        if (noteEl && project.description) noteEl.textContent = project.description;
        if (discEl && (project.discipline || project.category)) {
          discEl.textContent = project.discipline || project.category;
        }
      } else {
        // Plate is unpublished in Supabase: hide stale static plate
        if (plate) plate.style.display = 'none';
        if (indexLink && indexLink.parentElement) indexLink.parentElement.style.display = 'none';
      }
    });
  } catch (err) {
    console.warn('Works hydration skipped (fallback active):', err.message);
  }
}

if (document.readyState !== 'loading') {
  hydrateWorks();
} else {
  document.addEventListener('DOMContentLoaded', hydrateWorks);
}
