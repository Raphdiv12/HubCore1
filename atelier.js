/* ============================================================
   HUBCORE — Atelier Page Controller (atelier.js)
   Self-contained script for /atelier/.
   Mirrors necessary nav/overlay logic without touching main.js.
   ============================================================ */

import { createSignature } from './signature/signature.js';

document.documentElement.classList.add('js');

function onReady(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

onReady(() => {
  initOpeningReveal();
  initAtelierNav();
  initSignatureInteraction();
  initLazyVideo();
  initScrollReveals();
  initContourSignature();
});

/* ─── NAVIGATION (Mirrors Home nav behavior) ────────────── */
function initAtelierNav() {
  const nav = document.getElementById('nav');
  const hamburger = document.getElementById('nav-hamburger');
  const overlay = document.getElementById('nav-overlay');
  
  if (!nav) return;

  // Nav hide on scroll down, show on scroll up
  let lastScrollY = window.scrollY;
  let ticking = false;

  const updateNav = () => {
    const currentScrollY = window.scrollY;
    
    if (currentScrollY > 100) {
      if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 6) {
        nav.classList.add('is-hidden-up');
      } else if (currentScrollY < lastScrollY && lastScrollY - currentScrollY > 6) {
        nav.classList.remove('is-hidden-up');
      }
    } else {
      nav.classList.remove('is-hidden-up');
    }
    
    lastScrollY = currentScrollY;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateNav);
      ticking = true;
    }
  }, { passive: true });

  // Mobile menu toggle
  if (hamburger && overlay) {
    const overlayLinks = overlay.querySelectorAll('.overlay-link');
    let isOpen = false;

    const toggleMenu = () => {
      isOpen = !isOpen;
      hamburger.classList.toggle('is-open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      overlay.classList.toggle('is-open', isOpen);
      nav.classList.toggle('menu-open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (!isOpen) {
        hamburger.focus();
      }
    };

    hamburger.addEventListener('click', toggleMenu);

    overlayLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (isOpen) toggleMenu();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        toggleMenu();
      }
    });
  }
}

/* ─── OPENING REVEAL ────────────────────────────────────── */
function initOpeningReveal() {
  document.body.classList.add('is-loaded');
  document.documentElement.classList.add('is-loaded');
}

/* ─── THE REDRAWN LINE (SIGNATURE CONTROLLER) ────────────── */
function initSignatureInteraction() {
  const track = document.getElementById('signature-track');
  const sticky = document.querySelector('.atelier-signature-sticky');
  const layerA = document.getElementById('sig-layer-a');
  const layerB = document.getElementById('sig-layer-b');
  const caption = document.getElementById('sig-caption');
  const states = document.querySelectorAll('.signature-state');

  if (!track || !sticky || !layerA || !layerB) return;

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  let isActive = false;
  let rafId = null;

  const updateChoreography = () => {
    const trackRect = track.getBoundingClientRect();
    const stickyHeight = sticky.offsetHeight;
    const maxScroll = track.offsetHeight - stickyHeight;

    if (maxScroll <= 0) return;

    // Progress 0.0 to 1.0
    const scrollOffset = -trackRect.top;
    const progress = Math.max(0, Math.min(1, scrollOffset / maxScroll));

    // 1. Scheme A Opacity:
    // Beat 1 (0.00 - 0.25): 1.0 (Direct attempt)
    // Beat 2 (0.25 - 0.50): softens from 1.0 to 0.55 (Friction / reconsideration)
    // Beat 3 (0.50 - 0.75): fades from 0.55 to 0.18 (Pentimento under redraw)
    // Beat 4 (0.75 - 1.00): stable 0.18 (Historic pentimento in realization)
    let opacityA = 1.0;
    if (progress >= 0.50) {
      const factor = Math.min(1.0, (progress - 0.50) / 0.25);
      opacityA = 0.55 - factor * (0.55 - 0.18);
    } else if (progress >= 0.25) {
      const factor = (progress - 0.25) / 0.25;
      opacityA = 1.0 - factor * (1.0 - 0.55);
    }
    layerA.style.setProperty('--a-opacity', opacityA.toFixed(3));

    // 2. Scheme B Radial Mask Radius:
    // Beat 1 & 2 (0.00 - 0.45): 0% (Compass arc hidden)
    // Beat 3 (0.45 - 0.75): expands radially from 0% to 70% (Compass swing from obstacle pivot)
    // Beat 4 (0.75 - 1.00): expands from 70% to 130% (Full realization of arc)
    let radiusB = 0;
    if (progress >= 0.75) {
      const factor = Math.min(1.0, (progress - 0.75) / 0.25);
      radiusB = 70 + factor * 60;
    } else if (progress >= 0.45) {
      const factor = (progress - 0.45) / 0.30;
      radiusB = factor * 70;
    }
    layerB.style.setProperty('--b-radius', `${radiusB.toFixed(1)}%`);

    // 3. Four-Beat Narrative States:
    // 0: 01 / Attempt    [0.00 - 0.25)
    // 1: 02 / Reconsider [0.25 - 0.50)
    // 2: 03 / Redraw     [0.50 - 0.75)
    // 3: 04 / Realise    [0.75 - 1.00]
    let activeIndex = 0;
    if (progress >= 0.75) {
      activeIndex = 3;
    } else if (progress >= 0.50) {
      activeIndex = 2;
    } else if (progress >= 0.25) {
      activeIndex = 1;
    }

    states.forEach((state, i) => {
      state.classList.toggle('is-active', i === activeIndex);
    });

    // 4. Caption reveal at final beat
    if (caption) {
      caption.classList.toggle('is-visible', progress >= 0.78);
    }
  };

  const onScroll = () => {
    if (isActive && !rafId) {
      rafId = requestAnimationFrame(() => {
        updateChoreography();
        rafId = null;
      });
    }
  };

  // Turn scroll handler on only while track is intersecting viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isActive = entry.isIntersecting;
      if (isActive) {
        updateChoreography();
        window.addEventListener('scroll', onScroll, { passive: true });
      } else {
        window.removeEventListener('scroll', onScroll);
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    });
  }, { threshold: 0 });

  observer.observe(track);

  window.addEventListener('resize', () => {
    if (isActive) onScroll();
  }, { passive: true });
}

/* ─── LAZY VIDEO CLIP (Staying With It Maker) ────────────── */
function initLazyVideo() {
  const video = document.querySelector('.staying-maker-video');
  if (!video) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.2 });

  observer.observe(video);
}

/* ─── SCROLL REVEALS ─────────────────────────────────────── */
function initScrollReveals() {
  const elements = document.querySelectorAll('[data-reveal], .invitation-transition-line');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach((el) => observer.observe(el));
}

/* ─── CONTOUR TYPOGRAPHY SIGNATURE ───────────────────────── */
function initContourSignature() {
  const el = document.querySelector('.staying-h2[data-signature-type]');
  if (!el) return;
  const sig = createSignature('type', el, {
    treatment: 'contour',
    split: 10,
    duration: 620,
    step: 70,
  });
  if (!sig) return;

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
