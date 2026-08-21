/**
 * Strata Base Layer
 * CSS custom properties, normalize, reset and theme system
 * Light / Dark / Dim themes out of the box
 * System preference respected via prefers-color-scheme
 */

'use strict'

const BASE_CSS = `
/* ─── Strata Layer Declaration ─────────────────────────────────────── */
/* Each breakpoint gets its own named layer declared in ascending order. */
/* This means st-components-md always beats st-components regardless    */
/* of where classes appear in HTML — source order never matters.        */
@layer
  st-base,

  /* Component layers — xs first, xxl last so higher breakpoints always win */
  st-components,
  st-components-xs,
  st-components-sm,
  st-components-md,
  st-components-lg,
  st-components-xl,
  st-components-xxl,

  /* Utility layers — same pattern */
  st-utilities,
  st-utilities-xs,
  st-utilities-sm,
  st-utilities-md,
  st-utilities-lg,
  st-utilities-xl,
  st-utilities-xxl,

  /* Skeleton always on top */
  st-skeleton;

/* ─── CSS Custom Properties — Light Theme (default) ────────────────── */
@layer st-base {
  :root {
    /* Brand colors */
    --st-primary:          #0d6efd;
    --st-primary-hover:    #0b5ed7;
    --st-secondary:        #6c757d;
    --st-secondary-hover:  #5c636a;
    --st-success:          #198754;
    --st-success-hover:    #157347;
    --st-danger:           #dc3545;
    --st-danger-hover:     #bb2d3b;
    --st-warning:          #ffc107;
    --st-warning-hover:    #ffca2c;
    --st-info:             #0dcaf0;
    --st-info-hover:       #31d2f2;
    --st-light:            #f8f9fa;
    --st-dark:             #212529;

    /* Base */
    --st-bg:               #ffffff;
    --st-bg-secondary:     #f8f9fa;
    --st-text:             #212529;
    --st-text-muted:       #6c757d;
    --st-border:           #dee2e6;
    --st-border-radius:    0.375rem;
    --st-border-width:     1px;

    /* Typography */
    --st-font-family:      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --st-font-size-base:   1rem;
    --st-line-height-base: 1.5;
    --st-font-weight-base: 400;
    --st-heading-weight:   600;

    /* Spacing */
    --st-gutter-x:         1.5rem;
    --st-gutter-y:         0;

    /* Shadows */
    --st-shadow-sm:        0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    --st-shadow:           0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    --st-shadow-lg:        0 1rem 3rem rgba(0, 0, 0, 0.175);

    /* Transitions — shorthand helpers (use --st-duration / --st-easing for granular control) */
    --st-transition:       all var(--st-duration) var(--st-easing);
    --st-transition-fast:  all var(--st-duration-fast) var(--st-easing);

    /* Z-index scale */
    --st-z-dropdown:       1000;
    --st-z-sticky:         1020;
    --st-z-fixed:          1030;
    --st-z-modal-backdrop: 1040;
    --st-z-modal:          1050;
    --st-z-tooltip:        1060;
    --st-z-toast:          1070;

    /* Focus ring */
    --st-focus-ring:       0 0 0 0.25rem rgba(13, 110, 253, 0.25);

    /* Skeleton loader */
    --st-skeleton-base:     #e2e8f0;
    --st-skeleton-shine:    #f8fafc;
    --st-skeleton-duration: 1.5s;
    --st-skeleton-radius:   4px;
  }

  /* ─── Dark Theme ──────────────────────────────────────────────────── */
  [data-st-theme="dark"] {
    --st-primary:          #6ea8fe;
    --st-primary-hover:    #8bb9fe;
    --st-secondary:        #a0a7ae;
    --st-secondary-hover:  #b4bac0;
    --st-success:          #75b798;
    --st-success-hover:    #8ecbaf;
    --st-danger:           #ea868f;
    --st-danger-hover:     #f1a1a8;
    --st-warning:          #ffda6a;
    --st-warning-hover:    #ffe083;
    --st-info:             #6edff6;
    --st-info-hover:       #88e5f7;
    --st-light:            #f8f9fa;
    --st-dark:             #adb5bd;

    --st-bg:               #212529;
    --st-bg-secondary:     #2b3035;
    --st-text:             #dee2e6;
    --st-text-muted:       #8c959e;
    --st-border:           #495057;

    --st-shadow-sm:        0 0.125rem 0.25rem rgba(0, 0, 0, 0.3);
    --st-shadow:           0 0.5rem 1rem rgba(0, 0, 0, 0.5);
    --st-shadow-lg:        0 1rem 3rem rgba(0, 0, 0, 0.6);

    --st-focus-ring:       0 0 0 0.25rem rgba(110, 168, 254, 0.25);

    /* Skeleton loader */
    --st-skeleton-base:    #2d3748;
    --st-skeleton-shine:   #4a5568;
  }
  [data-st-theme="dim"] {
    --st-primary:          #90cdf4;
    --st-primary-hover:    #a8d8f6;
    --st-secondary:        #9ca3af;
    --st-secondary-hover:  #b0b7be;
    --st-success:          #86efac;
    --st-success-hover:    #9af2bc;
    --st-danger:           #fca5a5;
    --st-danger-hover:     #fdb7b7;
    --st-warning:          #fcd34d;
    --st-warning-hover:    #fdda65;
    --st-info:             #67e8f9;
    --st-info-hover:       #80ecfa;
    --st-light:            #374151;
    --st-dark:             #d1d5db;

    --st-bg:               #2d3748;
    --st-bg-secondary:     #374151;
    --st-text:             #e2e8f0;
    --st-text-muted:       #9ca3af;
    --st-border:           #4a5568;

    --st-shadow-sm:        0 0.125rem 0.25rem rgba(0, 0, 0, 0.25);
    --st-shadow:           0 0.5rem 1rem rgba(0, 0, 0, 0.4);
    --st-shadow-lg:        0 1rem 3rem rgba(0, 0, 0, 0.5);

    --st-focus-ring:       0 0 0 0.25rem rgba(144, 205, 244, 0.25);

    /* Skeleton loader */
    --st-skeleton-base:    #374151;
    --st-skeleton-shine:   #4b5563;
  }

  /* ─── System Preference — no data-st-theme set ────────────────────── */
  @media (prefers-color-scheme: dark) {
    :root:not([data-st-theme="light"]):not([data-st-theme="dim"]):not([data-st-theme="dark"]) {
      --st-primary:          #6ea8fe;
      --st-primary-hover:    #8bb9fe;
      --st-bg:               #212529;
      --st-bg-secondary:     #2b3035;
      --st-text:             #dee2e6;
      --st-text-muted:       #8c959e;
      --st-border:           #495057;
      --st-shadow:           0 0.5rem 1rem rgba(0, 0, 0, 0.5);
      --st-focus-ring:       0 0 0 0.25rem rgba(110, 168, 254, 0.25);
      --st-skeleton-base:    #2d3748;
      --st-skeleton-shine:   #4a5568;
    }
  }

  /* ─── Normalize & Reset ───────────────────────────────────────────── */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
    scroll-behavior: smooth;
  }

  body {
    margin: 0;
    font-family: var(--st-font-family);
    font-size: var(--st-font-size-base);
    font-weight: var(--st-font-weight-base);
    line-height: var(--st-line-height-base);
    color: var(--st-text);
    background-color: var(--st-bg);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  h1, h2, h3, h4, h5, h6 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    font-weight: var(--st-heading-weight);
    line-height: 1.2;
    color: var(--st-text);
  }

  h1 { font-size: 2.5rem; }
  h2 { font-size: 2rem; }
  h3 { font-size: 1.75rem; }
  h4 { font-size: 1.5rem; }
  h5 { font-size: 1.25rem; }
  h6 { font-size: 1rem; }

  p {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  a {
    color: var(--st-primary);
    text-decoration: underline;
  }

  a:hover {
    color: var(--st-primary-hover);
  }

  img, svg {
    vertical-align: middle;
    max-width: 100%;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
    color: inherit;
  }

  label {
    display: inline-block;
  }

  input, button, select, textarea {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  table {
    caption-side: bottom;
    border-collapse: collapse;
  }

  ul, ol {
    padding-left: 2rem;
    margin-top: 0;
    margin-bottom: 1rem;
  }

  hr {
    margin: 1rem 0;
    color: var(--st-border);
    border: 0;
    border-top: var(--st-border-width) solid var(--st-border);
    opacity: 1;
  }

  code {
    font-size: 0.875em;
    color: var(--st-danger);
    word-wrap: break-word;
  }

  pre {
    display: block;
    margin-top: 0;
    margin-bottom: 1rem;
    overflow: auto;
    font-size: 0.875em;
    color: var(--st-text);
    background-color: var(--st-bg-secondary);
    border-radius: var(--st-border-radius);
    padding: 1rem;
  }

  blockquote {
    margin: 0 0 1rem;
    padding: 0.5rem 1rem;
    border-left: 4px solid var(--st-border);
    color: var(--st-text-muted);
  }

  small {
    font-size: 0.875em;
  }

  mark {
    padding: 0.1875em;
    background-color: var(--st-warning);
    color: var(--st-dark);
  }

  /* ─── Focus visible ───────────────────────────────────────────────── */
  :focus-visible {
    outline: none;
    box-shadow: var(--st-focus-ring);
  }

  /* ─── Transition Variables ───────────────────────────────────────── */
  :root {
    --st-duration:        200ms;
    --st-duration-fast:   100ms;
    --st-duration-slow:   400ms;
    --st-duration-theme:  150ms;
    --st-easing:          cubic-bezier(0.4, 0, 0.2, 1);
    --st-easing-in:       cubic-bezier(0.4, 0, 1, 1);
    --st-easing-out:      cubic-bezier(0, 0, 0.2, 1);
    --st-easing-theme:    cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* ─── Global Interactive Transitions ─────────────────────────────── */
  /* Applied to all interactive elements for buttery smooth state changes */

  a,
  button,
  input,
  select,
  textarea,
  label,
  summary {
    transition-property: color, background-color, border-color, box-shadow, opacity, transform;
    transition-duration: var(--st-duration);
    transition-timing-function: var(--st-easing);
  }

  /* ─── Theme Transition ────────────────────────────────────────────── */
  *,
  *::before,
  *::after {
    transition-property: background-color, border-color, color, box-shadow;
    transition-duration: var(--st-duration-theme);
    transition-timing-function: var(--st-easing-theme);
  }

  /* Prevent theme transition on page load — only on user-triggered changes */
  .st-no-transition,
  .st-no-transition * {
    transition: none !important;
  }

  /* ─── Data Attribute State Transitions ───────────────────────────── */
  /* Smooth transitions for JS-controlled states via data-st-* attributes */

  /* Visibility — fade in/out instead of instant show/hide */
  [data-st-visible] {
    transition-property: opacity, visibility, transform;
    transition-duration: var(--st-duration);
    transition-timing-function: var(--st-easing);
  }

  [data-st-visible="true"] {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
    pointer-events: auto;
  }

  [data-st-visible="false"] {
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px);
    pointer-events: none;
  }

  /* Active state — subtle scale for tactile feel */
  [data-st-active] {
    transition-property: color, background-color, border-color, box-shadow, transform;
    transition-duration: var(--st-duration-theme);
    transition-timing-function: var(--st-easing);
  }

  /* Collapsed state — for accordions, drawers etc */
  [data-st-collapsed] {
    transition-property: max-height, opacity, transform;
    transition-duration: var(--st-duration-slow);
    transition-timing-function: var(--st-easing);
    overflow: hidden;
  }

  [data-st-collapsed="false"] {
    max-height: 2000px;
    opacity: 1;
  }

  [data-st-collapsed="true"] {
    max-height: 0;
    opacity: 0;
  }

  /* Loading state */
  [data-st-loading="true"] {
    opacity: 0.7;
    pointer-events: none;
    cursor: wait;
    transition: opacity var(--st-duration) var(--st-easing);
  }

  /* Disabled state */
  [data-st-disabled="true"] {
    opacity: 0.5;
    pointer-events: none;
    cursor: not-allowed;
    transition: opacity var(--st-duration) var(--st-easing);
  }

  /* ─── Reduced Motion Accessibility ──────────────────────────────── */
  /* Covers every element including future ones — no manual list needed */

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition: none;
      animation: none;
    }
  }
}

/* ─── Skeleton Shimmer Keyframe ───────────────────────────────────────── */

@keyframes st-shimmer {
  0%   { background-position:  200% 0; }
  100% { background-position: -200% 0; }
}

/* ─── Skeleton Loader Layer ───────────────────────────────────────────── */

@layer st-skeleton {

  /* ── Skeleton variables ───────────────────────────────────────────── */
  /* --st-skeleton-radius controls shimmer bar corner rounding           */
  /* Separate from --st-border-radius so developer controls both        */
  /* independently. Default 4px — subtle like YouTube.                  */
  :root {
    --st-skeleton-radius: 4px;
  }

  /* ── Parent or individual skeleton element ────────────────────────── */
  [data-st-skeleton="true"] {
    position:       relative;
    overflow:       hidden;
    pointer-events: none;
    user-select:    none;
    cursor:         wait;
    border-radius:  var(--st-skeleton-radius);
  }

  /* ── Inline elements — force block context ────────────────────────── */
  /* a, span, button, label etc. are inline or inline-flex by default.  */
  /* overflow:hidden and the ::before overlay only work correctly on     */
  /* block or inline-block elements. Force them here.                   */
  [data-st-skeleton="true"]:is(a, span, label, strong, em, small, abbr) {
    display:        inline-block;
  }

  /* ── Buttons — force block context and reset padding ─────────────── */
  /* button is inline-flex or inline-block. Make it block so the        */
  /* overlay covers it fully. Preserve its width with fit-content.      */
  [data-st-skeleton="true"]:is(button, input[type="button"], input[type="submit"], input[type="reset"]) {
    display:        block;
    width:          fit-content;
  }

  /* ── The shimmer overlay ──────────────────────────────────────────── */
  /* ::before sits on top of all child content via z-index: 9999.       */
  /* border-radius: inherit picks up --st-skeleton-radius from parent.  */
  [data-st-skeleton="true"]::before {
    content:         '';
    position:        absolute;
    inset:           0;
    z-index:         9999;
    border-radius:   inherit;
    background:      linear-gradient(
                       90deg,
                       var(--st-skeleton-base)  25%,
                       var(--st-skeleton-shine) 50%,
                       var(--st-skeleton-base)  75%
                     );
    background-size: 200% 100%;
    animation:       st-shimmer var(--st-skeleton-duration, 1.5s) infinite linear;
  }

  /* ── JS managed parent — null state ──────────────────────────────── */
  /* JS sets parent to "null" when smart detection takes over.          */
  /* Parent becomes a neutral container — no overlay, no shimmer.       */
  /* Children are marked individually with "true" and shimmer on their  */
  /* own. Parent stays completely out of the way visually.              */
  [data-st-skeleton="null"] {
    position:       relative;
    pointer-events: none;
    user-select:    none;
    cursor:         wait;
    /* No ::before — no shimmer on parent itself */
    /* No overflow:hidden — children manage their own clipping */
  }

  /* ── Opt-out works from both true and null parents ───────────────── */
  [data-st-skeleton="true"] [data-st-skeleton="false"],
  [data-st-skeleton="null"]  [data-st-skeleton="false"] {
    position:       relative;
    z-index:        10000;
    pointer-events: auto;
    cursor:         auto;
  }

  /* ── Replaced elements fallback ──────────────────────────────────── */
  /* img, video, canvas cannot have ::before pseudo-elements.           */
  /* JS smart detection marks their wrapper instead.                   */
  /* This CSS handles the edge case where developer manually sets       */
  /* data-st-skeleton="true" directly on an img or video element.      */
  /* Uses background shimmer + object-position to hide loaded content. */
  [data-st-skeleton="true"]:is(img, video, canvas) {
    background:      linear-gradient(
                       90deg,
                       var(--st-skeleton-base)  25%,
                       var(--st-skeleton-shine) 50%,
                       var(--st-skeleton-base)  75%
                     );
    background-size: 200% 100%;
    animation:       st-shimmer var(--st-skeleton-duration, 1.5s) infinite linear;
    /* Push loaded media content outside element bounds */
    object-fit:      none;
    object-position: 9999px 9999px;
    /* Override any existing border-radius */
    border-radius:   var(--st-skeleton-radius);
  }

  /* ── Circle variant — for avatars and round elements ─────────────── */
  /* border-radius: inherit on ::before picks up 50% automatically.    */
  /* Nothing extra needed.                                              */

  /* ── Opt-out — child pops above the overlay via z-index ─────────── */
  [data-st-skeleton="true"] [data-st-skeleton="false"] {
    position:       relative;
    z-index:        10000;
    pointer-events: auto;
    cursor:         auto;
  }

  /* ── Reduced motion — static placeholder, no animation ───────────── */
  @media (prefers-reduced-motion: reduce) {
    [data-st-skeleton="true"]::before {
      animation:  none;
      background: var(--st-skeleton-base);
    }
  }
}
`

module.exports = BASE_CSS
