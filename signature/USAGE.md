# HubCore Signature Interaction System

> **Aesthetic Principle**: Controlled, stepped jitter, temporary displacement, and precise realignment.
> The effect is an architectural punctuation mark—tactile, intentional, and restrained. It must never feel like a broken screen, generic glitch animation, or video game effect.

---

## Frequency & Editorial Restraint

- **Ceiling**: **Two or three appearances across an entire website is the absolute ceiling**, not a target. A single, perfectly placed activation is often superior.
- **Placement**: Reserve for moments of deliberate tension or transition (e.g., a primary atelier hero title, an anchor case study image, or an architectural master graphic).
- **Never ambient**: Do not use as hover decoration, repeating loops, or list item accents.

---

## Architecture: Engine vs. Treatments

The signature system decouples the **motion engine** (pose generation, stepped timing, scroll thresholds, state transitions, crisp restoration) from the **visual treatment** (how layers are constructed, tinted, blended, and rendered).

```
┌─────────────────────────────────────────────────────────────────┐
│                       CORE MOTION ENGINE                        │
│   Stepped timing (48ms) · Positional jitter · IntersectionObserver │
│   Reduced-motion safety · Crisp un-eased return to rest state    │
└────────────────┬───────────────────────────────┬────────────────┘
                 │                               │
        ┌────────▼────────┐             ┌────────▼────────┐
        │  Visual Layers  │             │   DOM Mount     │
        │  (Treatment)    │             │ (Image/Type/SVG)│
        └─────────────────┘             └─────────────────┘
```

---

## Available Visual Treatments

| Treatment | Best Suited For | Visual Expression | Background Requirement | Modes Supported |
|---|---|---|---|---|
| `graphite` *(Default)* | Editorial, tactile, architectural ateliers | Two muted offset layers inspired by hand-drafted pencil tracings slipping momentarily. | **None** (works on paper, warm stone, white, or dark) | Image, Typography, Graphic Form |
| `contour` | Large display headings, architectural hero titles | Two 1px stroke-only outlines shifting around solid letterforms like drafting registration marks. | **None** (works on any background) | **Typography only** |
| `tonal` | Gallery, fine-art printing, warm editorial portfolios | Restrained dual-tone separation along HubCore's warm terracotta (`#b5532f`) and cool slate (`#5c6e7e`) axis. | **None** (works on any background) | Image, Typography, Graphic Form |
| `chromatic` | Technical, experimental, or dark-room showcases | High-contrast RGB / CMY channel separation (original prototype behavior). | **Black frame required for images** (screen-blend) | Image, Typography, Graphic Form |

---

## Quick Start

### 1. Import module and styles

```js
import { createSignature } from './signature/signature.js';
```

```css
@import './signature/signature.css';
```

### 2. Implementation by Mode

#### Typography Mode

```html
<h1 class="hero-title" data-signature-title>Between<br>states.</h1>
```

```css
/* Ensure the target has relative positioning */
.hero-title {
  position: relative;
  display: inline-block;
  font-family: var(--font-primary);
  font-weight: 700;
  color: var(--ink);
}
```

```js
// Architectural graphite pencil slip (HubCore natural):
createSignature('type', '[data-signature-title]', {
  treatment: 'graphite',
});

// Or fine registration contour marks:
createSignature('type', '[data-signature-title]', {
  treatment: 'contour',
});

// Or warm terracotta / cool slate duotone:
createSignature('type', '[data-signature-title]', {
  treatment: 'tonal',
});
```

#### Image Mode

```html
<figure class="sig" data-signature-image>
  <div class="sig__frame" style="aspect-ratio: 16 / 10;">
    <img class="sig__img" src="/works/editorial-cover.jpg" alt="Atelier Study">
  </div>
</figure>
```

```js
// Tactile graphite displacement (works over light paper background):
createSignature('image', '[data-signature-image]', {
  treatment: 'graphite',
});

// Full chromatic separation (strictly requires a black frame):
createSignature('image', '[data-signature-image]', {
  treatment: 'chromatic',
});
```

#### Graphic Form Mode (Inline SVG)

```html
<figure class="form" data-signature-form>
  <svg class="form__svg" viewBox="0 0 1200 800" role="img" aria-label="Elevation plan">
    <g class="form__art">
      <rect x="100" y="200" width="400" height="300" fill="#d6d1c7" stroke="#1a1a1a" stroke-width="2" />
      <circle cx="700" cy="350" r="120" fill="#b5532f" />
    </g>
  </svg>
</figure>
```

```js
createSignature('form', '[data-signature-form]', {
  treatment: 'graphite', // or 'tonal', or 'chromatic'
});
```

---

## Configuration & Tuning Parameters

Override default timing or displacement per instance:

```js
createSignature('type', '.hero-title', {
  treatment: 'graphite',
  split: 6,         // px — maximum displacement of offset layers
  jitter: 2.5,      // px — whole-element micro-jitter
  duration: 380,    // ms — total active window
  step: 48,         // ms — stepped hold per pose (~"on twos", never eased)
  zone: {
    top: '-30%',    // excludes top 30% of viewport
    bottom: '-30%', // excludes bottom 30% of viewport (active zone is middle 40%)
  },
});
```

---

## Programmatic Control Surface

The `createSignature` factory returns a comprehensive control handle (or `null` if the selector is not found):

```js
const sig = createSignature('type', '.hero-title');

sig.play();           // Trigger programmatically
sig.reset();          // Immediately cancel and restore pristine rest state
sig.destroy();        // Disconnect IntersectionObserver and listeners
sig.state;            // 'idle' | 'running'
sig.activations;      // Number of completed runs
sig.eligible;         // Whether scroll re-entry will trigger
sig.updateObserver(); // Recompute IntersectionObserver bounds
```

---

## How to Select a Treatment for Future Client Projects

1. **Light Editorial / Publishing / Architecture Sites (e.g., HubCore)**:
   - Use `treatment: 'graphite'` on an anchor heading or hero image.
   - Or use `treatment: 'contour'` on primary bold typography.
   - *Why*: Complements paper tones (`#f5f2ed`, `#ede8e0`) and graphite marks without harsh digital artifacts.

2. **Fine Art / Gallery / Material Craft Sites**:
   - Use `treatment: 'tonal'` on an architectural drawing or sculpture photo.
   - *Why*: Resonant warm terracotta and cool slate duotone echoes fine-art printmaking.

3. **Technical / Digital Studio / Dark-Mode Sites**:
   - Use `treatment: 'chromatic'` with dark or black backgrounds.
   - *Why*: High-contrast optical separation gives an authentic photographic aberration feel.

---

## Verification Harness

The interactive and automated verification harness is available at:
`http://localhost:3030/signature/test.html`

It executes checks across all 4 treatments, confirms zero lingering inline transforms, validates reduced-motion handling, and checks background independence.
