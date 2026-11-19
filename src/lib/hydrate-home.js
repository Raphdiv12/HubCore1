/* ============================================================
   HUBCORE — Homepage Dynamic Hydration (src/lib/hydrate-home.js)
   Non-destructive progressive enhancement.
   Authoritative when Supabase is available: updates content and
   safely handles empty/unpublished slots without breaking CSS grid.
   Preserves 100% of the pristine static site when Supabase is offline.
   ============================================================ */

import { supabase, isConfigured } from './supabase.js';

export async function hydrateHomepage() {
  if (!isConfigured || !supabase) {
    // Offline or unconfigured: preserve static HTML entirely
    return;
  }

  try {
    // Run content and projects fetch in parallel
    const [configRes, projectsRes] = await Promise.all([
      supabase.from('site_config').select('key, value'),
      supabase.from('projects').select('*').eq('status', 'published').eq('is_featured_home', true).order('home_sort_order', { ascending: true }),
    ]);

    // If both failed with network errors, exit cleanly without touching DOM
    if (configRes.error && projectsRes.error) return;

    // 1. HYDRATE HOMEPAGE COPY (if available)
    if (!configRes.error && configRes.data) {
      const config = new Map();
      configRes.data.forEach((r) => config.set(r.key, r.value));

      // Hero
      const hLine1 = config.get('hero_tagline_line1');
      const hLine2 = config.get('hero_tagline_line2');
      const hBody = config.get('hero_body');

      const elLine1 = document.querySelector('#hero .hero-tagline .line:nth-child(1) .line-inner');
      const elLine2 = document.querySelector('#hero .hero-tagline .line:nth-child(2) .line-inner');
      const elBody = document.querySelector('#hero .hero-sub .text-body-wide');

      if (hLine1 && elLine1) elLine1.textContent = hLine1;
      if (hLine2 && elLine2) elLine2.textContent = hLine2;
      if (hBody && elBody) elBody.textContent = hBody;

      // Philosophy (subheading and description — body text excluded for animation stability)
      const pHeading = config.get('philosophy_heading');
      const pDesc = config.get('philosophy_description');
      const elPHeading = document.querySelector('#philosophy .philosophy-heading-col .text-heading');
      const elPDesc = document.querySelector('#philosophy .philosophy-desc-col .text-body-wide');

      if (pHeading && elPHeading) elPHeading.textContent = pHeading;
      if (pDesc && elPDesc) elPDesc.textContent = pDesc;

      // Process Stages
      const stages = document.querySelectorAll('.process-stage');
      stages.forEach((stage, idx) => {
        const num = idx + 1;
        const nameVal = config.get(`process_stage_${num}_name`);
        const descVal = config.get(`process_stage_${num}_description`);
        const nameEl = stage.querySelector('.stage-name');
        const descEl = stage.querySelector('.stage-description');

        if (nameVal && nameEl) nameEl.textContent = nameVal;
        if (descVal && descEl) descEl.textContent = descVal;
      });

      // Footer
      const emailVal = config.get('footer_email');
      const taglineVal = config.get('footer_tagline');
      const elEmail = document.getElementById('footer-email');
      const elTagline = document.querySelector('.footer-tagline');

      if (emailVal && elEmail) {
        elEmail.textContent = emailVal;
        elEmail.href = `mailto:${emailVal}`;
      }
      if (taglineVal && elTagline) elTagline.textContent = taglineVal;
    }

    // 2. HYDRATE HOMEPAGE WORK GRID (Authoritative)
    if (!projectsRes.error && projectsRes.data) {
      const publishedProjects = projectsRes.data;

      // Map projects by home_slot_index (1 through 8)
      const slotMap = new Map();
      publishedProjects.forEach((p, index) => {
        // If slot index is explicitly set (1-8), use it; otherwise assign in sequence
        const slotIdx = p.home_slot_index || (index + 1);
        if (slotIdx >= 1 && slotIdx <= 8 && !slotMap.has(slotIdx)) {
          slotMap.set(slotIdx, p);
        }
      });

      let visibleCount = 0;

      for (let slot = 1; slot <= 8; slot++) {
        const itemEl = document.getElementById(`work-${slot}`);
        if (!itemEl) continue;

        const project = slotMap.get(slot);

        if (project) {
          // Slot has authoritative published content
          visibleCount++;
          itemEl.style.display = '';

          const img = itemEl.querySelector('.work-image');
          const title = itemEl.querySelector('.work-title');
          const cat = itemEl.querySelector('.work-category');

          if (img) {
            if (project.thumbnail_url || project.hero_image_url) {
              img.src = project.thumbnail_url || project.hero_image_url;
            }
            img.alt = project.title || '';
          }
          if (title) title.textContent = project.title;
          if (cat) cat.textContent = project.category || '';
        } else {
          // Slot is empty / unpublished in CMS: hide stale static placeholder
          itemEl.style.display = 'none';
        }
      }

      // Update caption count to match authoritative published count
      const captionEl = document.querySelector('.work-index-col .text-caption');
      if (captionEl) {
        const formattedCount = String(visibleCount).padStart(2, '0');
        captionEl.innerHTML = `${formattedCount} projects<br>2023 / 2026`;
      }
    }
  } catch (err) {
    // Non-destructive: on error, static HTML remains untouched
    console.warn('Hydration skipped (fallback active):', err.message);
  }
}

// Auto-run when DOM is interactive
if (document.readyState !== 'loading') {
  hydrateHomepage();
} else {
  document.addEventListener('DOMContentLoaded', hydrateHomepage);
}
