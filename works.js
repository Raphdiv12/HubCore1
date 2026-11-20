/* ============================================================
   HUBCORE — Works Page Controller (works.js)
   Self-contained script for /works/. Mirrors the Atelier nav
   behaviour without touching main.js or atelier.js.
   ============================================================ */

import { createSignature } from './signature/signature.js';

document.documentElement.classList.add('js');

function onReady(fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
}

onReady(() => {
  requestAnimationFrame(() => document.documentElement.classList.add('is-loaded'));
  initNav();
  initReveals();
  initPlateVideos();
  initContourSignature();
});

/* ─── NAVIGATION ─────────────────────────────────────────── */
function initNav() {
  const nav = document.getElementById('nav');
  const hamburger = document.getElementById('nav-hamburger');
  const overlay = document.getElementById('nav-overlay');
  if (!nav) return;

  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    if (y > 100) {
      if (y > lastY && y - lastY > 6) nav.classList.add('is-hidden-up');
      else if (y < lastY && lastY - y > 6) nav.classList.remove('is-hidden-up');
    } else {
      nav.classList.remove('is-hidden-up');
    }
    lastY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  // Keep the nav reachable for keyboard users
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden-up'));

  if (!hamburger || !overlay) return;

  let isOpen = false;
  const toggle = () => {
    isOpen = !isOpen;
    hamburger.classList.toggle('is-open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    overlay.classList.toggle('is-open', isOpen);
    nav.classList.toggle('menu-open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (!isOpen) hamburger.focus();
  };

  hamburger.addEventListener('click', toggle);
  overlay.querySelectorAll('.overlay-link').forEach((link) => {
    link.addEventListener('click', () => { if (isOpen) toggle(); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) toggle();
  });
}

/* ─── REVEALS (plates unveil once) ───────────────────────── */
function initReveals() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  els.forEach((el) => io.observe(el));

  // Index jumps: reveal the destination immediately
  document.querySelectorAll('.works-index-link').forEach((link) => {
    link.addEventListener('click', () => {
      const target = document.querySelector(link.getAttribute('href'));
      target?.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
    });
  });
}

/* ─── FUTURE ASSETS: play plate videos only while in view ── */
function initPlateVideos() {
  const videos = document.querySelectorAll('video.plate-asset');
  if (!videos.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.play().catch(() => {});
      else entry.target.pause();
    });
  }, { threshold: 0.25 });

  videos.forEach((v) => io.observe(v));
}

/* ─── CONTOUR TYPOGRAPHY SIGNATURE ───────────────────────── */
function initContourSignature() {
  const el = document.querySelector('#becoming-title[data-signature-type]');
  if (!el) return;

  // The signature's IntersectionObserver can fire while the parent
  // plate-label is still invisible (opacity: 0) from the scroll-reveal
  // animation.  Destroy the built-in observer and defer playback until
  // the reveal transition has finished so the contour effect is visible.
  const sig = createSignature('type', el, {
    treatment: 'contour',
    split: 9,
    duration: 620,
    step: 70,
    zone: { top: '999%', bottom: '999%' },   // effectively disable auto-trigger
  });
  if (!sig) return;

  // Wait for the parent plate-label reveal to complete, then play once.
  const label = el.closest('[data-reveal]');
  if (label) {
    const playOnce = () => {
      if (!label.classList.contains('is-revealed')) return;
      label.removeEventListener('transitionend', playOnce);
      clearTimeout(fallback);
      // Small extra pause so the label is fully opaque before displacement
      setTimeout(() => { if (sig.state === 'idle') sig.play(); }, 60);
    };
    label.addEventListener('transitionend', playOnce);
    // Fallback: if already revealed (e.g. rapid scroll, no-JS fallback)
    const fallback = setTimeout(() => {
      if (label.classList.contains('is-revealed') && sig.state === 'idle') sig.play();
    }, 1800);
  }

  el.style.cursor = 'pointer';
  el.title = 'Click or hover to replay alignment signature';
  el.addEventListener('mouseenter', () => {
    if (sig.state === 'idle') sig.play();
  });
  el.addEventListener('click', () => {
    if (sig.state === 'idle') sig.play();
  });

  el.__signature = sig;
}
