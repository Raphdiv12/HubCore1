/*
 * HubCore — Signature Effect
 * ──────────────────────────────────────────────────────────────
 * Core motion signature: controlled stepped displacement, subtle positional
 * jitter, and precise snap-back to the original state.
 *
 * The motion engine is decoupled from the visual treatment. Treatments are
 * modular objects that build layers, apply per-pose transforms, and clean up.
 * The engine handles timing, scroll activation, reduced-motion, and state.
 *
 * Built-in treatments:
 *   graphite   — Tactile pencil-tracing displacement (2 muted offset layers).
 *                Natural HubCore aesthetic (paper + graphite + ink). Works on
 *                any background; zero compositing constraints.
 *   contour    — Fine offset outlines (2 stroke-only copies). Architectural
 *                registration-mark feel. Typography only. Preserved exactly.
 *   tonal      — Restrained warm terracotta / cool slate duotone separation.
 *                Editorial, fine-art printing feel. Works on any background.
 *   chromatic  — RGB/CMY channel separation (the original prototype effect).
 *                Screen-blended over black for images, multiply-blended with
 *                CMY tints for type, per-channel SVG recolouring for forms.
 *
 * Plain JS, zero external dependencies.
 *
 *   import { createSignature, treatments } from './signature/signature.js';
 *   // Convenience shortcuts:
 *   import { initImageSignature, initTypeSignature, initFormSignature } from '…';
 */

// ─────────────────────────────────────────────────────────────
// Default engine config — override per instance
// ─────────────────────────────────────────────────────────────
const DEFAULTS = {
  split:    8,    // px  – max layer separation
  jitter:   3,    // px  – max positional jitter of the whole element
  duration: 520,  // ms  – total displaced state (perceptible, intentional hold)
  step:     58,   // ms  – hold time per pose (stepped, not tweened)
  zone: {
    top:    '-10%',   // IO rootMargin: excludes top 10 %
    bottom: '-15%',   // excludes bottom 15 %; natural reading engagement zone
  },
};

// ─────────────────────────────────────────────────────────────
// Shared utilities
// ─────────────────────────────────────────────────────────────
const rand  = (lo, hi) => lo + Math.random() * (hi - lo);
const cssPx = (x, y) => `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
const css3d = (x, y) => `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
const svgTr = (x, y, k) =>
  `translate(${(Math.round(x) * k).toFixed(3)} ${(Math.round(y) * k).toFixed(3)})`;

// ─────────────────────────────────────────────────────────────
// Pose generation — the core motion model
// ─────────────────────────────────────────────────────────────
// Envelope: quick shift in → full displacement → slightly eased final
// pose → hard snap back (handled by reset). Direction occasionally flips.
// `count` controls how many layer offsets the treatment needs (2 or 3).
function buildPoses(cfg, count) {
  const n = Math.max(2, Math.round(cfg.duration / cfg.step));
  let dir = Math.random() < 0.5 ? -1 : 1;
  const poses = [];
  for (let i = 0; i < n; i++) {
    const env = i === 0 ? 0.65 : i === n - 1 ? 0.5 : 1;
    if (i > 0 && Math.random() < 0.3) dir = -dir;
    const a  = Math.max(1.5, cfg.split * env * rand(0.7, 1));
    const dy = a * rand(-0.25, 0.25);
    const j  = cfg.jitter * env;

    // Build per-layer offsets as raw {x,y} pairs.
    // 2 layers: opposed pair (-dir, +dir).
    // 3 layers: classic 3-way spread.
    const offsets =
      count === 2
        ? [
            { x: -dir * a,               y: -dy },
            { x:  dir * a,               y:  dy },
          ]
        : [
            { x: -dir * a,               y: -dy },
            { x: rand(-0.25, 0.25) * a, y: rand(-0.2, 0.2) * a },
            { x:  dir * a,               y:  dy },
          ];

    poses.push({
      offsets,
      jitter: { x: rand(-j, j), y: rand(-j * 0.5, j * 0.5) },
    });
  }
  return poses;
}

// ─────────────────────────────────────────────────────────────
// SVG channel-isolation filters (injected once, only if chromatic is used)
// ─────────────────────────────────────────────────────────────
let _filtersInjected = false;

export function ensureFilters() {
  if (_filtersInjected) return;
  if (document.getElementById('hc-r')) { _filtersInjected = true; return; }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML =
    '<filter id="hc-r" color-interpolation-filters="sRGB">' +
      '<feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>' +
    '</filter>' +
    '<filter id="hc-g" color-interpolation-filters="sRGB">' +
      '<feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"/>' +
    '</filter>' +
    '<filter id="hc-b" color-interpolation-filters="sRGB">' +
      '<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"/>' +
    '</filter>';
  document.body.prepend(svg);
  _filtersInjected = true;
}

// ─────────────────────────────────────────────────────────────
// Vector tinting helper for SVG graphic forms
// ─────────────────────────────────────────────────────────────
function _makeMonochromeGroup(art, tint, name) {
  const copy = art.cloneNode(true);
  copy.setAttribute('class', name);
  [copy, ...copy.querySelectorAll('*')].forEach((el) => {
    // Hide large background bounding rects so shifted echo layers only
    // displace foreground architectural line geometry and shapes.
    if (el.tagName.toLowerCase() === 'rect') {
      const w = parseFloat(el.getAttribute('width') || '0');
      const x = parseFloat(el.getAttribute('x') || '0');
      if (w > 800 || x < 0) {
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke', 'none');
        return;
      }
    }
    ['fill', 'stroke'].forEach((attr) => {
      if (el.hasAttribute(attr)) {
        const val = el.getAttribute(attr);
        if (val && val !== 'none' && !val.startsWith('url(')) {
          el.setAttribute(attr, tint);
        }
      }
    });
  });
  return copy;
}


// ═════════════════════════════════════════════════════════════
//  TREATMENTS
// ═════════════════════════════════════════════════════════════
export const treatments = {};

// ───────────────────────────────────────────────────────────
//  1. GRAPHITE  — Tactile displacement (HubCore Default)
// ───────────────────────────────────────────────────────────
// Two offset layers inspired by architectural graphite drafting.
// Reads like a pencil tracing or registration line that briefly slips.
// Zero compositing constraints: works on light paper, warm stone, or dark.
treatments.graphite = {
  layerCount: 2,

  setup(mode, root, contentEl, cfg) {
    if (mode === 'image') return this._setupImage(root, contentEl, cfg);
    if (mode === 'type')  return this._setupType(root, contentEl, cfg);
    if (mode === 'form')  return this._setupForm(root, contentEl, cfg);
    return null;
  },

  _setupImage(root, frame, cfg) {
    const img = root.querySelector('.sig__img');
    if (!img) return null;
    const container = document.createElement('div');
    container.className = 'sig__channels sig__channels--graphite';
    container.setAttribute('aria-hidden', 'true');
    const layers = [0, 1].map((i) => {
      const el = document.createElement('img');
      el.className = `sig__echo sig__echo--${i}`;
      el.src = img.currentSrc || img.src;
      el.alt = '';
      el.draggable = false;
      el.decoding = 'sync';
      container.appendChild(el);
      return el;
    });
    frame.appendChild(container);
    return { container, layers, jitterEl: frame, shiftFn: css3d };
  },

  _setupType(root, _contentEl, _cfg) {
    const container = document.createElement('span');
    container.className = 'type__channels type__channels--graphite';
    container.setAttribute('aria-hidden', 'true');
    const source = root.innerHTML;
    const layers = [0, 1].map((i) => {
      const el = document.createElement('span');
      el.className = `type__echo type__echo--${i}`;
      el.innerHTML = source;
      container.appendChild(el);
      return el;
    });
    root.appendChild(container);
    return { container, layers, jitterEl: container, shiftFn: cssPx };
  },

  _setupForm(root, _contentEl, cfg) {
    const svg = root.querySelector('.form__svg');
    const art = svg && svg.querySelector('.form__art');
    if (!svg || !art) return null;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const vbW = svg.viewBox.baseVal.width;
    const uppx = () => vbW / (svg.getBoundingClientRect().width || vbW);

    const container = document.createElementNS(SVG_NS, 'g');
    container.setAttribute('class', 'form__channels form__channels--graphite');
    container.setAttribute('aria-hidden', 'true');
    const layers = [
      _makeMonochromeGroup(art, '#3d3d3d', 'form__echo form__echo--0'),
      _makeMonochromeGroup(art, '#5a5a5a', 'form__echo form__echo--1'),
    ];
    layers.forEach((l) => container.appendChild(l));
    svg.appendChild(container);
    return { container, layers, jitterEl: svg, shiftFn: (x, y) => svgTr(x, y, uppx()), svgMode: true };
  },

  applyPose(pose, layers, jitterEl, shiftFn, setup) {
    const o = pose.offsets;
    if (setup.svgMode) {
      layers[0].setAttribute('transform', shiftFn(o[0].x, o[0].y));
      layers[1].setAttribute('transform', shiftFn(o[1].x, o[1].y));
    } else {
      layers[0].style.transform = shiftFn(o[0].x, o[0].y);
      layers[1].style.transform = shiftFn(o[1].x, o[1].y);
    }
    jitterEl.style.transform = cssPx(pose.jitter.x, pose.jitter.y);
  },

  applyReduced(layers, cfg, shiftFn, setup) {
    const a = Math.max(1.5, cfg.split * 0.4);
    if (setup.svgMode) {
      layers[0].setAttribute('transform', shiftFn(-a, 0));
      layers[1].setAttribute('transform', shiftFn(a, 0));
    } else {
      layers[0].style.transform = shiftFn(-a, 0);
      layers[1].style.transform = shiftFn(a, 0);
    }
  },

  clear(layers, jitterEl, container, setup) {
    jitterEl.style.removeProperty('transform');
    container.style.removeProperty('opacity');
    if (setup.svgMode) {
      layers.forEach((l) => l.removeAttribute('transform'));
    } else {
      layers.forEach((l) => l.style.removeProperty('transform'));
    }
  },

  cssClass: 'sig--graphite',
};

// ───────────────────────────────────────────────────────────
//  2. CONTOUR  — Fine offset outlines (Typography Only)
// ───────────────────────────────────────────────────────────
// Two stroke-only outline layers around the typography.
// Evokes architectural registration marks and blueprint alignments.
// Zero background constraints. High-contrast drafting registration contours.
treatments.contour = {
  layerCount: 2,

  setup(mode, root, contentEl, cfg) {
    if (mode !== 'type') return null;  // Typography only
    // Clean up any existing channel container before building layers
    const existing = root.querySelector('.type__channels');
    if (existing) existing.remove();

    const container = document.createElement('span');
    container.className = 'type__channels type__channels--contour';
    container.setAttribute('aria-hidden', 'true');
    const source = (root.childNodes[0]?.nodeType === Node.TEXT_NODE
      ? root.childNodes[0].textContent
      : root.textContent).trim() || 'Becoming';
    const layers = [0, 1].map((i) => {
      const el = document.createElement('span');
      el.className = `type__contour type__contour--${i}`;
      el.innerHTML = source;
      container.appendChild(el);
      return el;
    });
    root.appendChild(container);
    return { container, layers, jitterEl: container, root, shiftFn: cssPx };
  },

  applyPose(pose, layers, jitterEl, shiftFn, setup) {
    // Self-healing: if container was detached by external DOM updates, reattach
    if (setup && setup.container && setup.root && !setup.root.contains(setup.container)) {
      setup.root.appendChild(setup.container);
    }
    const o = pose.offsets;
    layers[0].style.transform = shiftFn(o[0].x, o[0].y);
    layers[1].style.transform = shiftFn(o[1].x, o[1].y);
    if (setup && setup.root) {
      setup.root.style.transform = cssPx(pose.jitter.x, pose.jitter.y);
    } else {
      jitterEl.style.transform = cssPx(pose.jitter.x, pose.jitter.y);
    }
  },

  applyReduced(layers, cfg, shiftFn, setup) {
    if (setup && setup.container && setup.root && !setup.root.contains(setup.container)) {
      setup.root.appendChild(setup.container);
    }
    const a = Math.max(1.5, cfg.split * 0.4);
    layers[0].style.transform = shiftFn(-a, 0);
    layers[1].style.transform = shiftFn(a, 0);
  },

  clear(layers, jitterEl, container, setup) {
    if (setup && setup.root) {
      setup.root.style.removeProperty('transform');
    }
    jitterEl.style.removeProperty('transform');
    container.style.removeProperty('opacity');
    layers.forEach((l) => l.style.removeProperty('transform'));
  },

  cssClass: 'sig--contour',
};

// ───────────────────────────────────────────────────────────
//  3. TONAL  — Restrained warm terracotta / cool slate duotone
// ───────────────────────────────────────────────────────────
// Two offset copies along HubCore's atelier palette (warm terracotta
// and cool graphite slate). Editorial, tactile, and quiet.
// Works on any background.
treatments.tonal = {
  layerCount: 2,

  setup(mode, root, contentEl, cfg) {
    if (mode === 'image') return this._setupImage(root, contentEl, cfg);
    if (mode === 'type')  return this._setupType(root, contentEl, cfg);
    if (mode === 'form')  return this._setupForm(root, contentEl, cfg);
    return null;
  },

  _setupImage(root, frame, cfg) {
    const img = root.querySelector('.sig__img');
    if (!img) return null;
    const container = document.createElement('div');
    container.className = 'sig__channels sig__channels--tonal';
    container.setAttribute('aria-hidden', 'true');
    const layers = [0, 1].map((i) => {
      const el = document.createElement('img');
      el.className = `sig__tonal sig__tonal--${i}`;
      el.src = img.currentSrc || img.src;
      el.alt = '';
      el.draggable = false;
      el.decoding = 'sync';
      container.appendChild(el);
      return el;
    });
    frame.appendChild(container);
    return { container, layers, jitterEl: frame, shiftFn: css3d };
  },

  _setupType(root, _contentEl, _cfg) {
    const container = document.createElement('span');
    container.className = 'type__channels type__channels--tonal';
    container.setAttribute('aria-hidden', 'true');
    const source = root.innerHTML;
    const layers = [0, 1].map((i) => {
      const el = document.createElement('span');
      el.className = `type__tonal type__tonal--${i}`;
      el.innerHTML = source;
      container.appendChild(el);
      return el;
    });
    root.appendChild(container);
    return { container, layers, jitterEl: container, shiftFn: cssPx };
  },

  _setupForm(root, _contentEl, cfg) {
    const svg = root.querySelector('.form__svg');
    const art = svg && svg.querySelector('.form__art');
    if (!svg || !art) return null;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const vbW = svg.viewBox.baseVal.width;
    const uppx = () => vbW / (svg.getBoundingClientRect().width || vbW);

    const container = document.createElementNS(SVG_NS, 'g');
    container.setAttribute('class', 'form__channels form__channels--tonal');
    container.setAttribute('aria-hidden', 'true');
    const layers = [
      _makeMonochromeGroup(art, '#b5532f', 'form__tonal form__tonal--0'), // warm terracotta
      _makeMonochromeGroup(art, '#3b5870', 'form__tonal form__tonal--1'), // cool slate
    ];
    layers.forEach((l) => container.appendChild(l));
    svg.appendChild(container);
    return { container, layers, jitterEl: svg, shiftFn: (x, y) => svgTr(x, y, uppx()), svgMode: true };
  },

  applyPose(pose, layers, jitterEl, shiftFn, setup) {
    const o = pose.offsets;
    if (setup.svgMode) {
      layers[0].setAttribute('transform', shiftFn(o[0].x, o[0].y));
      layers[1].setAttribute('transform', shiftFn(o[1].x, o[1].y));
    } else {
      layers[0].style.transform = shiftFn(o[0].x, o[0].y);
      layers[1].style.transform = shiftFn(o[1].x, o[1].y);
    }
    jitterEl.style.transform = cssPx(pose.jitter.x, pose.jitter.y);
  },

  applyReduced(layers, cfg, shiftFn, setup) {
    const a = Math.max(1.5, cfg.split * 0.4);
    if (setup.svgMode) {
      layers[0].setAttribute('transform', shiftFn(-a, 0));
      layers[1].setAttribute('transform', shiftFn(a, 0));
    } else {
      layers[0].style.transform = shiftFn(-a, 0);
      layers[1].style.transform = shiftFn(a, 0);
    }
  },

  clear(layers, jitterEl, container, setup) {
    jitterEl.style.removeProperty('transform');
    container.style.removeProperty('opacity');
    if (setup.svgMode) {
      layers.forEach((l) => l.removeAttribute('transform'));
    } else {
      layers.forEach((l) => l.style.removeProperty('transform'));
    }
  },

  cssClass: 'sig--tonal',
};

// ───────────────────────────────────────────────────────────
//  4. CHROMATIC  — RGB / CMY channel separation
// ───────────────────────────────────────────────────────────
// High-contrast full channel separation (the prototype effect).
// Image requires a black frame for screen-blend recombination.
// Type uses multiply-blended CMY tints. Form recolours SVG hex values.
treatments.chromatic = {
  layerCount: 3,
  requiresFilters: true,

  setup(mode, root, contentEl, cfg) {
    if (mode === 'image') return this._setupImage(root, contentEl, cfg);
    if (mode === 'type')  return this._setupType(root, contentEl, cfg);
    if (mode === 'form')  return this._setupForm(root, contentEl, cfg);
    return null;
  },

  _setupImage(root, frame, cfg) {
    ensureFilters();
    const img = root.querySelector('.sig__img');
    if (!img) return null;
    const container = document.createElement('div');
    container.className = 'sig__channels sig__channels--chromatic';
    container.setAttribute('aria-hidden', 'true');
    const layers = ['r', 'g', 'b'].map((c) => {
      const el = document.createElement('img');
      el.className = `sig__ch sig__ch--${c}`;
      el.src = img.currentSrc || img.src;
      el.alt = '';
      el.draggable = false;
      el.decoding = 'sync';
      container.appendChild(el);
      return el;
    });
    frame.appendChild(container);
    return { container, layers, jitterEl: frame, shiftFn: css3d };
  },

  _setupType(root, _contentEl, _cfg) {
    const container = document.createElement('span');
    container.className = 'type__channels type__channels--chromatic';
    container.setAttribute('aria-hidden', 'true');
    const source = root.innerHTML;
    const layers = ['r', 'g', 'b'].map((c) => {
      const el = document.createElement('span');
      el.className = `type__ch type__ch--${c}`;
      el.innerHTML = source;
      container.appendChild(el);
      return el;
    });
    root.appendChild(container);
    return { container, layers, jitterEl: container, shiftFn: cssPx };
  },

  _setupForm(root, _contentEl, cfg) {
    const svg = root.querySelector('.form__svg');
    const art = svg && svg.querySelector('.form__art');
    if (!svg || !art) return null;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const vbW = svg.viewBox.baseVal.width;
    const uppx = () => vbW / (svg.getBoundingClientRect().width || vbW);

    const container = document.createElementNS(SVG_NS, 'g');
    container.setAttribute('class', 'form__channels form__channels--chromatic');
    container.setAttribute('aria-hidden', 'true');
    const layers = [
      _makeChannelGroup(art, 0, 'r'),
      _makeChannelGroup(art, 1, 'g'),
      _makeChannelGroup(art, 2, 'b'),
    ];
    layers.forEach((l) => container.appendChild(l));
    svg.appendChild(container);
    return { container, layers, jitterEl: svg, shiftFn: (x, y) => svgTr(x, y, uppx()), svgMode: true };
  },

  applyPose(pose, layers, jitterEl, shiftFn, setup) {
    const o = pose.offsets;
    if (setup.svgMode) {
      layers[0].setAttribute('transform', shiftFn(o[0].x, o[0].y));
      layers[1].setAttribute('transform', shiftFn(o[1].x, o[1].y));
      layers[2].setAttribute('transform', shiftFn(o[2].x, o[2].y));
    } else {
      layers[0].style.transform = shiftFn(o[0].x, o[0].y);
      layers[1].style.transform = shiftFn(o[1].x, o[1].y);
      layers[2].style.transform = shiftFn(o[2].x, o[2].y);
    }
    jitterEl.style.transform = cssPx(pose.jitter.x, pose.jitter.y);
  },

  applyReduced(layers, cfg, shiftFn, setup) {
    const a = Math.max(1.5, cfg.split * 0.4);
    if (setup.svgMode) {
      layers[0].setAttribute('transform', shiftFn(-a, 0));
      layers[2].setAttribute('transform', shiftFn(a, 0));
    } else {
      layers[0].style.transform = shiftFn(-a, 0);
      layers[2].style.transform = shiftFn(a, 0);
    }
  },

  clear(layers, jitterEl, container, setup) {
    jitterEl.style.removeProperty('transform');
    container.style.removeProperty('opacity');
    if (setup.svgMode) {
      layers.forEach((l) => l.removeAttribute('transform'));
    } else {
      layers.forEach((l) => l.style.removeProperty('transform'));
    }
  },

  cssClass: 'sig--chromatic',
};


// ═════════════════════════════════════════════════════════════
//  ENGINE
// ═════════════════════════════════════════════════════════════
/**
 * Create a signature effect instance.
 *
 * @param {'image'|'type'|'form'} mode
 * @param {string|Element}        selector
 * @param {object}                [opts]
 *   treatment: 'graphite' | 'contour' | 'tonal' | 'chromatic' (or custom treatment object)
 *   split:     max separation in px (default 8 for image, 7.5 for type, 7 for form)
 *   jitter:    whole-element jitter in px (default 2 for type, 2.5 for form, 3 for image)
 *   duration:  total duration in ms (default 380)
 *   step:      hold time per pose in ms (default 48)
 *   zone:      { top: '-30%', bottom: '-30%' } for IntersectionObserver
 * @returns {object|null}
 */
export function createSignature(mode, selector, opts = {}) {
  const root = typeof selector === 'string'
    ? document.querySelector(selector) : selector;
  if (!root) return null;

  // Resolve treatment. Default: 'graphite' for HubCore's restrained identity,
  // or 'chromatic' if explicitly specified.
  const treatmentDefault = opts.treatment || (mode === 'image' ? 'chromatic' : 'graphite');
  const treatmentKey = opts.treatment || treatmentDefault;
  const treatment = typeof treatmentKey === 'string'
    ? treatments[treatmentKey] : treatmentKey;
  if (!treatment) {
    console.warn(`[hc-signature] Unknown treatment "${treatmentKey}"`);
    return null;
  }

  // Calibrate defaults: balanced displacement so offset layers are clearly
  // visible beyond glyph stems and line weights while keeping jitter subtle.
  const isContourType = mode === 'type' && treatmentKey === 'contour';
  const splitDefault = mode === 'image'
    ? DEFAULTS.split
    : (mode === 'type' ? (isContourType ? 10 : 7.5) : 7);
  const jitterDefault = mode === 'type' ? 2 : (mode === 'form' ? 2.5 : DEFAULTS.jitter);
  const durationDefault = isContourType ? 620 : DEFAULTS.duration;
  const stepDefault = isContourType ? 70 : DEFAULTS.step;
  const cfg = {
    ...DEFAULTS,
    duration: durationDefault,
    step: stepDefault,
    split: splitDefault,
    jitter: jitterDefault,
    zone: { ...DEFAULTS.zone },
    ...opts,
  };
  delete cfg.treatment;

  // Determine content element.
  let contentEl;
  if (mode === 'image') contentEl = root.querySelector('.sig__frame');
  else if (mode === 'form') contentEl = root;
  else contentEl = root;
  if (!contentEl) return null;

  // Build layers.
  const setup = treatment.setup(mode, root, contentEl, cfg);
  if (!setup) return null;

  const { container, layers, jitterEl, shiftFn } = setup;
  const layerCount = treatment.layerCount;

  if (treatment.cssClass) root.classList.add(treatment.cssClass);

  const reducedQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  let state       = 'idle';
  let inZone      = false;
  let eligible    = true;
  let rafId       = 0;
  let endTimers   = [];
  let activations = 0;
  let observer    = null;

  function setState(next) {
    state = next;
    root.dataset.signatureState = next;
  }

  // --- effect ---------------------------------------------------------------
  function play() {
    if (state === 'running') return false;
    activations++;
    setState('running');
    if (reducedQ.matches) playReduced(); else playFull();
    return true;
  }

  function playFull() {
    const poses = buildPoses(cfg, layerCount);
    let start = -1;
    let shown = -1;
    root.classList.add('is-active');

    // Safety fallback: guarantees finish() completes even if rAF is throttled in background/headless
    endTimers.push(setTimeout(finish, cfg.duration + 50));

    const tick = (now) => {
      if (start < 0) start = now;
      const elapsed = Math.max(0, now - start);
      if (elapsed >= cfg.duration) { finish(); return; }
      const idx = Math.min(poses.length - 1, Math.floor(elapsed / cfg.step));
      if (idx !== shown) {
        treatment.applyPose(poses[idx], layers, jitterEl, shiftFn, setup);
        shown = idx;
      }
      rafId = requestAnimationFrame(tick);
    };
    tick(performance.now());
  }

  function playReduced() {
    root.classList.add('is-reduced');
    treatment.applyReduced(layers, cfg, shiftFn, setup);
    container.style.opacity = '0';
    root.classList.add('is-active');
    void container.offsetWidth;
    container.style.opacity = '1';
    endTimers.push(setTimeout(() => {
      container.style.opacity = '0';
      endTimers.push(setTimeout(finish, 160));
    }, Math.max(240, cfg.duration)));
  }

  function reset() {
    cancelAnimationFrame(rafId);
    rafId = 0;
    endTimers.forEach(clearTimeout);
    endTimers = [];
    root.classList.remove('is-active', 'is-reduced');
    treatment.clear(layers, jitterEl, container, setup);
  }

  function finish() {
    reset();
    setState('idle');
  }

  // --- scroll trigger -------------------------------------------------------
  const observeEl = mode === 'image'
    ? (root.querySelector('.sig__frame') || root)
    : root;

  function updateObserver() {
    if (observer) observer.disconnect();
    const rootMargin = `${cfg.zone.top} 0px ${cfg.zone.bottom} 0px`;
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== observeEl && entry.target !== root) continue;
        const nowIn = entry.isIntersecting;
        if (nowIn) {
          inZone = true;
          if (eligible && state !== 'running') { eligible = false; play(); }
          else if (state === 'running') { eligible = false; }
        } else {
          inZone = false;
          eligible = true;
        }
      }
    }, { rootMargin, threshold: 0 });
    observer.observe(observeEl);
  }

  updateObserver();

  const onVisChange = () => { if (document.hidden && state === 'running') finish(); };
  document.addEventListener('visibilitychange', onVisChange);

  setState('idle');

  return {
    play,
    reset: finish,
    updateObserver,
    destroy() {
      finish();
      if (observer) observer.disconnect();
      document.removeEventListener('visibilitychange', onVisChange);
    },
    get state()       { return state; },
    get inZone()      { return inZone; },
    get eligible()    { return eligible; },
    get armed()       { return eligible; },
    get activations() { return activations; },
  };
}


// ═════════════════════════════════════════════════════════════
//  CONVENIENCE SHORTCUTS (backward-compatible API)
// ═════════════════════════════════════════════════════════════
export function initImageSignature(selector, config) {
  return createSignature('image', selector, config);
}
export function initTypeSignature(selector, config) {
  return createSignature('type', selector, config);
}
export function initFormSignature(selector, config) {
  return createSignature('form', selector, config);
}

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────
const HEX_RE = /^#([0-9a-f]{6})$/i;
function _channelColour(value, keep) {
  const m = HEX_RE.exec(value || '');
  if (!m) return value;
  const pairs = [m[1].slice(0, 2), m[1].slice(2, 4), m[1].slice(4, 6)];
  return '#' + pairs.map((p, i) => (i === keep ? p : 'ff')).join('');
}
function _makeChannelGroup(art, keep, name) {
  const copy = art.cloneNode(true);
  copy.setAttribute('class', `form__ch form__ch--${name}`);
  [copy, ...copy.querySelectorAll('*')].forEach((el) => {
    ['fill', 'stroke'].forEach((attr) => {
      if (el.hasAttribute(attr))
        el.setAttribute(attr, _channelColour(el.getAttribute(attr), keep));
    });
  });
  return copy;
}
