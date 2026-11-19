/* ============================================================
   HUBCORE — Page 01 Interactions
   Craft in Motion — quiet at rest, alive when explored
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initIntro();
  initScrollReveal();
  initPhilosophyWords();
  initDualVideoReveal();
  initLazyVideos();
  initNavBehavior();
  initMobileNav();
  initGraphiteAssets();
  initTransitionLine();
  initWorkHoverEffects();
  initProcessStages();
  initSmoothAnchors();
});

/* ─── INTRO ─────────────────────────────────────────────── */
function initIntro() {
  const intro = document.getElementById('intro');
  const hero = document.getElementById('hero');
  const nav = document.getElementById('nav');
  if (!intro || !hero) return;

  const video = intro.querySelector('.intro-maker');

  // Check saved state before displaying or starting animation
  let isCompleted = false;
  try {
    isCompleted = sessionStorage.getItem('hubcore_intro_completed') === 'true';
  } catch {
    isCompleted = false;
  }

  if (isCompleted) {
    intro.classList.remove('is-active');
    intro.classList.add('is-hidden');
    if (video) {
      video.pause();
    }
    hero.classList.add('is-revealed');
    if (nav) nav.classList.add('is-visible');
    const heroMaker = hero.querySelector('.hero-maker');
    if (heroMaker) {
      heroMaker.play().catch(() => {});
    }
    const construction = hero.querySelector('.graphite-construction');
    if (construction) {
      construction.classList.add('is-visible');
    }
    return;
  }

  // First homepage visit in tab session: start intro animation
  intro.classList.add('is-active');
  if (video) {
    video.play().catch(() => {});
  }

  let dismissed = false;

  // Fade intro after video plays or timeout
  const dismissIntro = () => {
    if (dismissed) return;
    dismissed = true;

    intro.classList.remove('is-active');
    intro.classList.add('is-hidden');
    
    // Reveal hero after intro fades
    setTimeout(() => {
      hero.classList.add('is-revealed');
      if (nav) nav.classList.add('is-visible');
      const heroMaker = hero.querySelector('.hero-maker');
      if (heroMaker) {
        heroMaker.play().catch(() => {});
      }
      const construction = hero.querySelector('.graphite-construction');
      if (construction) {
        construction.classList.add('is-visible');
      }

      // Record completion only after the animation finishes successfully
      try {
        sessionStorage.setItem('hubcore_intro_completed', 'true');
        document.documentElement.classList.add('intro-completed');
      } catch {}
    }, 400);
  };

  // Listen for video end or set a timeout
  if (video) {
    video.addEventListener('ended', dismissIntro, { once: true });
  }

  // Fallback timeout — intro should not last forever
  setTimeout(dismissIntro, 4500);

  // Allow click/tap to skip intro
  intro.addEventListener('click', dismissIntro, { once: true });
  intro.addEventListener('touchstart', dismissIntro, { once: true, passive: true });
}

/* ─── SCROLL REVEAL (IntersectionObserver) ──────────────── */
function initScrollReveal() {
  const elements = document.querySelectorAll('[data-reveal]');
  
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px',
    }
  );

  elements.forEach((el) => observer.observe(el));
}

/* ─── PHILOSOPHY TEXT — Word-by-word reveal on scroll ───── */
function initPhilosophyWords() {
  const textEl = document.getElementById('philosophy-text');
  if (!textEl) return;

  // Split text into individual words wrapped in spans
  const text = textEl.textContent.trim();
  const words = text.split(/\s+/);
  textEl.innerHTML = words
    .map((word) => `<span class="word">${word}</span>`)
    .join(' ');

  const wordEls = textEl.querySelectorAll('.word');
  let scrollHandler = null;
  let animating = false;

  // Use IntersectionObserver with scroll position tracking
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startWordReveal();
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );

  observer.observe(textEl);

  function startWordReveal() {
    animating = true;

    const updateWords = () => {
      const rect = textEl.getBoundingClientRect();
      const viewportH = window.innerHeight;
      
      // Calculate progress: 0 when section enters, 1 when it's at center
      const progress = Math.max(0, Math.min(1, 
        1 - (rect.top / (viewportH * 0.5))
      ));

      const activeCount = Math.floor(progress * wordEls.length);
      
      wordEls.forEach((word, i) => {
        if (i < activeCount) {
          word.classList.add('is-active');
        } else {
          word.classList.remove('is-active');
        }
      });

      if (progress >= 1) {
        // Make all words visible once fully revealed
        wordEls.forEach((w) => w.classList.add('is-active'));
        // Clean up
        if (scrollHandler) {
          window.removeEventListener('scroll', scrollHandler);
          scrollHandler = null;
        }
        animating = false;
      }
    };

    requestAnimationFrame(updateWords);
    
    // Continue tracking on scroll
    scrollHandler = () => {
      if (animating) {
        requestAnimationFrame(updateWords);
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
  }
}

/* ─── DUAL VIDEO REVEAL (Cursor & Touch Masked Field) ── */
function initDualVideoReveal() {
  const container = document.getElementById('dual-video');
  if (!container) return;

  const baseVideo = container.querySelector('.dv-base');
  const revealVideo = container.querySelector('.dv-reveal');
  if (!baseVideo || !revealVideo) return;

  // Viewport-based playback & synchronization
  let isIntersecting = false;

  const startVideos = () => {
    baseVideo.play().catch(() => {});
    revealVideo.play().catch(() => {});
  };

  const pauseVideos = () => {
    baseVideo.pause();
    revealVideo.pause();
  };

  const syncVideos = () => {
    if (Math.abs(baseVideo.currentTime - revealVideo.currentTime) > 0.3) {
      revealVideo.currentTime = baseVideo.currentTime;
    }
  };

  baseVideo.addEventListener('timeupdate', syncVideos);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        isIntersecting = entry.isIntersecting;
        if (isIntersecting) {
          startVideos();
        } else {
          pauseVideos();
        }
      });
    },
    { threshold: 0.15 }
  );

  observer.observe(container);

  // Smooth cursor and touch tracking via lerp physics
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  let targetR = 0;
  let currentR = 0;

  let targetRing = 0;
  let currentRing = 0;

  let isPointerOver = false;
  let rafId = null;

  const getMaxRadius = () => {
    const rect = container.getBoundingClientRect();
    const minDim = Math.min(rect.width, rect.height);
    return Math.max(130, Math.min(260, minDim * 0.42));
  };

  const updatePointer = (clientX, clientY) => {
    const rect = container.getBoundingClientRect();
    targetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    targetY = Math.max(0, Math.min(rect.height, clientY - rect.top));
  };

  const animate = () => {
    // Smooth exponential approach
    const easePos = 0.18;
    const easeRadius = isPointerOver ? 0.14 : 0.1;

    currentX += (targetX - currentX) * easePos;
    currentY += (targetY - currentY) * easePos;
    currentR += (targetR - currentR) * easeRadius;
    currentRing += (targetRing - currentRing) * easeRadius;

    // Apply CSS variables to container
    container.style.setProperty('--x', `${currentX.toFixed(1)}px`);
    container.style.setProperty('--y', `${currentY.toFixed(1)}px`);
    container.style.setProperty('--r', `${currentR.toFixed(1)}px`);
    container.style.setProperty('--ring', currentRing.toFixed(2));

    // Keep running while active or while settling to zero
    if (isPointerOver || currentR > 0.5) {
      rafId = requestAnimationFrame(animate);
    } else {
      currentR = 0;
      currentRing = 0;
      container.style.setProperty('--r', '0px');
      container.style.setProperty('--ring', '0');
      rafId = null;
    }
  };

  const ensureAnimation = () => {
    if (!rafId) {
      rafId = requestAnimationFrame(animate);
    }
  };

  // Pointer / Mouse events (Desktop)
  container.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    isPointerOver = true;
    updatePointer(e.clientX, e.clientY);
    currentX = targetX;
    currentY = targetY;
    targetR = getMaxRadius();
    targetRing = 1;
    ensureAnimation();
  });

  container.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    isPointerOver = true;
    updatePointer(e.clientX, e.clientY);
    targetR = getMaxRadius();
    targetRing = 1;
    ensureAnimation();
  });

  container.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    isPointerOver = false;
    targetR = 0;
    targetRing = 0;
    ensureAnimation();
  });

  // Touch Events (Mobile intentional press & drag)
  let touchDismissTimer = null;

  container.addEventListener(
    'touchstart',
    (e) => {
      if (touchDismissTimer) clearTimeout(touchDismissTimer);
      const touch = e.touches[0];
      if (!touch) return;
      isPointerOver = true;
      updatePointer(touch.clientX, touch.clientY);
      currentX = targetX;
      currentY = targetY;
      targetR = getMaxRadius();
      targetRing = 1;
      ensureAnimation();
    },
    { passive: true }
  );

  container.addEventListener(
    'touchmove',
    (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      isPointerOver = true;
      updatePointer(touch.clientX, touch.clientY);
      targetR = getMaxRadius();
      targetRing = 1;
      ensureAnimation();
    },
    { passive: true }
  );

  const endTouch = () => {
    touchDismissTimer = setTimeout(() => {
      isPointerOver = false;
      targetR = 0;
      targetRing = 0;
      ensureAnimation();
    }, 400);
  };

  container.addEventListener('touchend', endTouch, { passive: true });
  container.addEventListener('touchcancel', endTouch, { passive: true });
}

/* ─── LAZY VIDEO LOADING ────────────────────────────────── */
function initLazyVideos() {
  const videos = document.querySelectorAll('[data-lazy-video]');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const video = entry.target;
          video.load();
          video.play().catch(() => {});
          observer.unobserve(video);
        }
      });
    },
    {
      rootMargin: '200px 0px',
      threshold: 0,
    }
  );

  videos.forEach((video) => observer.observe(video));
}

/* ─── NAV BEHAVIOR ──────────────────────────────────────── */
function initNavBehavior() {
  const nav = document.getElementById('nav');
  let lastScrollY = 0;
  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > 100) {
          if (currentScrollY > lastScrollY && currentScrollY > 300) {
            // Scrolling down — hide nav
            nav.classList.add('is-hidden-up');
          } else {
            // Scrolling up — show nav
            nav.classList.remove('is-hidden-up');
          }
        }

        lastScrollY = currentScrollY;
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
}

/* ─── MOBILE NAV ────────────────────────────────────────── */
function initMobileNav() {
  const hamburger = document.getElementById('nav-hamburger');
  const overlay = document.getElementById('nav-overlay');
  const nav = document.getElementById('nav');
  
  if (!hamburger || !overlay) return;

  const overlayLinks = overlay.querySelectorAll('.overlay-link');
  let isOpen = false;

  const toggleMenu = () => {
    isOpen = !isOpen;
    hamburger.classList.toggle('is-open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
    overlay.classList.toggle('is-open', isOpen);
    nav.classList.toggle('menu-open', isOpen);
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  hamburger.addEventListener('click', toggleMenu);

  // Close menu when overlay link is clicked
  overlayLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (isOpen) {
        toggleMenu();
      }
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      toggleMenu();
    }
  });
}

/* ─── GRAPHITE ASSETS ───────────────────────────────────── */
function initGraphiteAssets() {
  // Graphite construction mark
  const construction = document.querySelector('.graphite-construction');
  if (construction) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            construction.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(construction);
  }

  // Measurement annotation
  const measurement = document.querySelector('.measurement-annotation');
  if (measurement) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            measurement.classList.add('is-visible');
          } else {
            measurement.classList.remove('is-visible');
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(measurement);
  }

  // Still refining text
  const stillRefining = document.querySelector('.still-refining');
  if (stillRefining) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            stillRefining.classList.add('is-visible');
          } else {
            stillRefining.classList.remove('is-visible');
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(stillRefining);
  }

  // Subtle parallax on graphite assets during scroll
  if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    const parallaxElements = [construction, measurement, stillRefining].filter(Boolean);
    
    let rafId;
    const handleParallax = () => {
      parallaxElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const viewportCenter = window.innerHeight / 2;
        const offset = (centerY - viewportCenter) * 0.03;
        
        // Use a clean transform without accumulation
        el.style.setProperty('--parallax-y', `${offset}px`);
        el.style.transform = `translateY(var(--parallax-y, 0px))`;
      });
    };

    window.addEventListener('scroll', () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleParallax);
    }, { passive: true });
  }
}

/* ─── TRANSITION LINE ───────────────────────────────────── */
function initTransitionLine() {
  const section = document.getElementById('transition-section');
  if (!section) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          section.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  observer.observe(section);
}

/* ─── WORK HOVER EFFECTS ────────────────────────────────── */
function initWorkHoverEffects() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const workItems = document.querySelectorAll('.work-item');

  workItems.forEach((item) => {
    item.addEventListener('mouseenter', () => {
      // Dim other work items
      workItems.forEach((other) => {
        if (other !== item) {
          other.style.opacity = '0.4';
          other.style.transition = `opacity var(--duration-base) var(--ease-smooth)`;
        }
      });
    });

    item.addEventListener('mouseleave', () => {
      workItems.forEach((other) => {
        other.style.opacity = '1';
      });
    });
  });
}

/* ─── PROCESS STAGES ────────────────────────────────────── */
function initProcessStages() {
  const stages = document.querySelectorAll('.process-stage');
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          
          // Play the maker video when stage enters
          const video = entry.target.querySelector('.stage-maker');
          if (video) {
            video.load();
            video.play().catch(() => {});
          }
        }
      });
    },
    { threshold: 0.3 }
  );

  stages.forEach((stage) => observer.observe(stage));
}

/* ─── SMOOTH ANCHOR SCROLLING ───────────────────────────── */
function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  });

  // Active nav link tracking
  const sections = ['hero', 'work', 'philosophy', 'footer'];
  const navLinks = document.querySelectorAll('.nav-link');
  
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach((link) => {
            const href = link.getAttribute('href').replace('#', '');
            if (href === id) {
              link.classList.add('is-active');
            } else {
              link.classList.remove('is-active');
            }
          });
        }
      });
    },
    { threshold: 0.3 }
  );

  sections.forEach((id) => {
    const section = document.getElementById(id);
    if (section) sectionObserver.observe(section);
  });
}
