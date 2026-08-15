import type { Metadata } from "next";
import CodeBlock from "@/components/CodeBlock";
import Callout from "@/components/Callout";

export const metadata: Metadata = {
  title: "Theme System Guide",
  description: "Strata CSS's light/dark/dim theme system, driven by a single data-st-theme attribute.",
  alternates: { canonical: "/guides/theme-system" },
};

function Swatch({ hex }: { hex: string }) {
  return (
    <span className="d-inline-flex align-items-center gap-1 text-nowrap">
      <span
        aria-hidden="true"
        className={`d-inline-block rounded-circle border flex-shrink-0 w-[10px] h-[10px] bg-[${hex}]`}
      />
      <code>{hex}</code>
    </span>
  );
}

export default function ThemeSystemPage() {
  return (
    <div className="prose-links">
      <h1 className="fw-bold mb-3">Theme System</h1>
      <p className="mb-4">
        Themes are set via <code>data-st-theme</code> on any ancestor element (usually{" "}
        <code>&lt;html&gt;</code>). Without it, <code>prefers-color-scheme</code> is respected
        automatically. Try the theme switcher in the header — it drives this exact attribute.
      </p>
      <CodeBlock
        lang="html"
        code={`<html data-st-theme="dark">   <!-- dark theme -->\n<html data-st-theme="dim">    <!-- dim theme -->\n<html data-st-theme="light">  <!-- explicit light -->`}
      />

      <Callout variant="warning" title="npx strata-css init locks you to light theme — on purpose, but easy to miss">
        The installer&apos;s layout injection adds <code>data-st-theme=&quot;light&quot;</code>{" "}
        to your <code>&lt;html&gt;</code> tag if the attribute isn&apos;t already present. That
        silently overrides the <code>prefers-color-scheme</code> auto-detection described above —
        dark-mode users won&apos;t get a dark theme until you either remove that attribute or
        wire up switching yourself, below. <code>init</code> has no concept of a theme toggle; it
        only sets a static starting value.
      </Callout>

      <h2 className="mt-5 mb-3">Switching themes in JS</h2>
      <CodeBlock
        lang="js"
        code={`document.documentElement.setAttribute('data-st-theme', 'dark')`}
      />

      <h2 className="mt-5 mb-3">Preventing flash on load</h2>
      <p className="mb-3">
        Read the stored preference before hydration so the theme attribute is set before first
        paint:
      </p>
      <CodeBlock
        lang="html"
        code={`<script>\n  const t = localStorage.getItem('theme')\n  if (t) document.documentElement.setAttribute('data-st-theme', t)\n</script>`}
      />
      <Callout variant="tip" title="This site's implementation">
        See <code>app/layout.tsx</code> — an inline script runs in <code>&lt;head&gt;</code>{" "}
        before the body renders, and <code>components/ThemeToggle.tsx</code> writes to{" "}
        <code>localStorage</code> and the attribute on click.
      </Callout>

      <h2 className="mt-5 mb-3">Tokens</h2>
      <p className="mb-3">
        Every value a theme could plausibly change lives in one place: a set of CSS custom
        properties (<code>--st-*</code>) declared under <code>@layer st-base</code>. Components
        never hardcode a color or a shadow — they read one of these variables instead. That's the
        entire trick behind theming: change what <code>--st-primary</code> points to, and every
        button, link and focus ring using it updates at once, with zero component-level code.
      </p>
      <p className="mb-4">
        Not every token changes between themes, though — some are genuinely theme-aware (a
        different value per <code>light</code>/<code>dark</code>/<code>dim</code>), and some are
        just shared constants that happen to live in the same block. Both kinds are listed below,
        grouped by what they&apos;re for, with which is which called out per group — plus the
        actual default value each one ships with, so you know what you&apos;re changing before
        you change it.
      </p>

      <h3 className="mt-4 mb-2">Brand colors — theme-aware</h3>
      <p className="mb-3">
        The core palette. Each has a plain and a <code>-hover</code> variant, and every one of
        them takes a different value in dark and dim mode — that&apos;s most of what &quot;dark
        mode&quot; actually is, under the hood.
      </p>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Token</th><th>Light (default)</th><th>Dark</th><th>Dim</th><th>Used for</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-nowrap"><code>--st-primary</code></td>
              <td><Swatch hex="#0d6efd" /></td>
              <td><Swatch hex="#6ea8fe" /></td>
              <td><Swatch hex="#90cdf4" /></td>
              <td rowSpan={2}>Your brand color — buttons, links, focus rings, active states.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-primary-hover</code></td>
              <td><Swatch hex="#0b5ed7" /></td>
              <td><Swatch hex="#8bb9fe" /></td>
              <td><Swatch hex="#a8d8f6" /></td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-secondary</code></td>
              <td><Swatch hex="#6c757d" /></td>
              <td><Swatch hex="#a0a7ae" /></td>
              <td><Swatch hex="#9ca3af" /></td>
              <td rowSpan={2}>The muted counterpart — outline buttons, less prominent actions.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-secondary-hover</code></td>
              <td><Swatch hex="#5c636a" /></td>
              <td><Swatch hex="#b4bac0" /></td>
              <td><Swatch hex="#b0b7be" /></td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-success</code></td>
              <td><Swatch hex="#198754" /></td>
              <td><Swatch hex="#75b798" /></td>
              <td><Swatch hex="#86efac" /></td>
              <td rowSpan={2}>Positive states — success alerts, valid form fields.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-success-hover</code></td>
              <td><Swatch hex="#157347" /></td>
              <td><Swatch hex="#8ecbaf" /></td>
              <td><Swatch hex="#9af2bc" /></td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-danger</code></td>
              <td><Swatch hex="#dc3545" /></td>
              <td><Swatch hex="#ea868f" /></td>
              <td><Swatch hex="#fca5a5" /></td>
              <td rowSpan={2}>Errors and destructive actions — delete buttons, invalid fields.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-danger-hover</code></td>
              <td><Swatch hex="#bb2d3b" /></td>
              <td><Swatch hex="#f1a1a8" /></td>
              <td><Swatch hex="#fdb7b7" /></td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-warning</code></td>
              <td><Swatch hex="#ffc107" /></td>
              <td><Swatch hex="#ffda6a" /></td>
              <td><Swatch hex="#fcd34d" /></td>
              <td rowSpan={2}>Caution states — warning alerts and badges.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-warning-hover</code></td>
              <td><Swatch hex="#ffca2c" /></td>
              <td><Swatch hex="#ffe083" /></td>
              <td><Swatch hex="#fdda65" /></td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-info</code></td>
              <td><Swatch hex="#0dcaf0" /></td>
              <td><Swatch hex="#6edff6" /></td>
              <td><Swatch hex="#67e8f9" /></td>
              <td rowSpan={2}>Neutral informational states — info alerts and badges.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-info-hover</code></td>
              <td><Swatch hex="#31d2f2" /></td>
              <td><Swatch hex="#88e5f7" /></td>
              <td><Swatch hex="#80ecfa" /></td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-light</code></td>
              <td><Swatch hex="#f8f9fa" /></td>
              <td><Swatch hex="#f8f9fa" /></td>
              <td><Swatch hex="#374151" /></td>
              <td>A light neutral — text/icons that need to stay light even in dark mode (e.g. on a colored badge).</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-dark</code></td>
              <td><Swatch hex="#212529" /></td>
              <td><Swatch hex="#adb5bd" /></td>
              <td><Swatch hex="#d1d5db" /></td>
              <td>The dark counterpart to <code>--st-light</code>.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="mt-4 mb-2">Surfaces &amp; text — theme-aware</h3>
      <p className="mb-3">
        The page&apos;s actual background and text colors — these are what make dark mode look
        dark, independent of the brand colors above.
      </p>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Token</th><th>Light (default)</th><th>Dark</th><th>Dim</th><th>Used for</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-nowrap"><code>--st-bg</code></td>
              <td><Swatch hex="#ffffff" /></td>
              <td><Swatch hex="#212529" /></td>
              <td><Swatch hex="#2d3748" /></td>
              <td>The page background — <code>&lt;body&gt;</code> reads this directly.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-bg-secondary</code></td>
              <td><Swatch hex="#f8f9fa" /></td>
              <td><Swatch hex="#2b3035" /></td>
              <td><Swatch hex="#374151" /></td>
              <td>A slightly offset surface — cards, code blocks, anything above the page background.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-text</code></td>
              <td><Swatch hex="#212529" /></td>
              <td><Swatch hex="#dee2e6" /></td>
              <td><Swatch hex="#e2e8f0" /></td>
              <td>The default body text color.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-text-muted</code></td>
              <td><Swatch hex="#6c757d" /></td>
              <td><Swatch hex="#8c959e" /></td>
              <td><Swatch hex="#9ca3af" /></td>
              <td>Dimmer text — captions, helper text, anything secondary.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-border</code></td>
              <td><Swatch hex="#dee2e6" /></td>
              <td><Swatch hex="#495057" /></td>
              <td><Swatch hex="#4a5568" /></td>
              <td>The default border color used across components.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mb-4">
        Two more live in this same group but <strong>don&apos;t</strong> change with theme —{" "}
        <code>--st-border-radius</code> (default <code>0.375rem</code>) and{" "}
        <code>--st-border-width</code> (default <code>1px</code>) control the shape of borders,
        not their color, so light/dark/dim all share the same value.
      </p>

      <h3 className="mt-4 mb-2">Typography — constant across all themes</h3>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Token</th><th>Default</th><th>Used for</th></tr>
          </thead>
          <tbody>
            <tr><td className="text-nowrap"><code>--st-font-family</code></td><td className="text-nowrap"><code>-apple-system, …, sans-serif</code></td><td>The default font stack for the whole page — the system font, not a webfont.</td></tr>
            <tr><td className="text-nowrap"><code>--st-font-size-base</code></td><td className="text-nowrap"><code>1rem</code></td><td>The base body text size everything else scales from.</td></tr>
            <tr><td className="text-nowrap"><code>--st-line-height-base</code></td><td className="text-nowrap"><code>1.5</code></td><td>The default line height for body text.</td></tr>
            <tr><td className="text-nowrap"><code>--st-font-weight-base</code></td><td className="text-nowrap"><code>400</code></td><td>The default weight for body text.</td></tr>
            <tr><td className="text-nowrap"><code>--st-heading-weight</code></td><td className="text-nowrap"><code>600</code></td><td>The weight used for <code>h1</code>–<code>h6</code>.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 className="mt-4 mb-2">Shadows — theme-aware</h3>
      <p className="mb-3">
        Same three shadow sizes in every theme, but dark and dim use a heavier, more opaque
        shadow — a shadow tuned for a white background barely reads against a dark one.
      </p>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Token</th><th>Light (default)</th><th>Dark</th><th>Dim</th><th>Used for</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-nowrap"><code>--st-shadow-sm</code></td>
              <td className="text-nowrap"><code>0 0.125rem 0.25rem rgba(0,0,0,.075)</code></td>
              <td className="text-nowrap"><code>rgba(0,0,0,.3)</code></td>
              <td className="text-nowrap"><code>rgba(0,0,0,.25)</code></td>
              <td>A subtle shadow — small elements, inputs.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-shadow</code></td>
              <td className="text-nowrap"><code>0 0.5rem 1rem rgba(0,0,0,.15)</code></td>
              <td className="text-nowrap"><code>rgba(0,0,0,.5)</code></td>
              <td className="text-nowrap"><code>rgba(0,0,0,.4)</code></td>
              <td>The default shadow — cards, dropdowns.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-shadow-lg</code></td>
              <td className="text-nowrap"><code>0 1rem 3rem rgba(0,0,0,.175)</code></td>
              <td className="text-nowrap"><code>rgba(0,0,0,.6)</code></td>
              <td className="text-nowrap"><code>rgba(0,0,0,.5)</code></td>
              <td>A pronounced shadow — modals, popovers, anything that should feel like it&apos;s floating.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mb-4 text-muted">
        The dark/dim columns above show only the opacity, not the full offset/blur — those stay
        identical to the light value in every theme; only how dark and opaque the shadow itself
        is changes.
      </p>

      <h3 className="mt-4 mb-2">Transitions — constant across all themes</h3>
      <p className="mb-3">
        Speeds and easing curves for animation. <code>-theme</code> variants exist specifically
        for the color/background swap when the theme itself changes, kept separate so you can
        tune &quot;how fast does the whole page fade to dark&quot; independently of every other
        transition on the site.
      </p>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Token</th><th>Default</th><th>Used for</th></tr>
          </thead>
          <tbody>
            <tr><td className="text-nowrap"><code>--st-duration</code></td><td className="text-nowrap"><code>200ms</code></td><td>The default transition duration.</td></tr>
            <tr><td className="text-nowrap"><code>--st-duration-fast</code></td><td className="text-nowrap"><code>100ms</code></td><td>Quicker alternative.</td></tr>
            <tr><td className="text-nowrap"><code>--st-duration-slow</code></td><td className="text-nowrap"><code>400ms</code></td><td>Slower alternative.</td></tr>
            <tr><td className="text-nowrap"><code>--st-duration-theme</code></td><td className="text-nowrap"><code>150ms</code></td><td>How long a theme switch itself takes to fade in.</td></tr>
            <tr><td className="text-nowrap"><code>--st-easing</code></td><td className="text-nowrap"><code>cubic-bezier(.4,0,.2,1)</code></td><td>The default easing curve.</td></tr>
            <tr><td className="text-nowrap"><code>--st-easing-in</code></td><td className="text-nowrap"><code>cubic-bezier(.4,0,1,1)</code></td><td>Ease-in variant.</td></tr>
            <tr><td className="text-nowrap"><code>--st-easing-out</code></td><td className="text-nowrap"><code>cubic-bezier(0,0,.2,1)</code></td><td>Ease-out variant.</td></tr>
            <tr><td className="text-nowrap"><code>--st-easing-theme</code></td><td className="text-nowrap"><code>cubic-bezier(.22,1,.36,1)</code></td><td>The easing curve used specifically for theme-switch transitions.</td></tr>
            <tr><td className="text-nowrap"><code>--st-transition</code></td><td className="text-nowrap"><code>all var(--st-duration) var(--st-easing)</code></td><td>Ready-made shorthand built from the tokens above.</td></tr>
            <tr><td className="text-nowrap"><code>--st-transition-fast</code></td><td className="text-nowrap"><code>all var(--st-duration-fast) var(--st-easing)</code></td><td>The quicker version of the same shorthand.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 className="mt-4 mb-2">Z-index scale — constant across all themes</h3>
      <p className="mb-3">
        A shared stacking order so a dropdown, a sticky header and a modal never fight for the
        same layer by accident.
      </p>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Token</th><th>Default</th></tr>
          </thead>
          <tbody>
            <tr><td className="text-nowrap"><code>--st-z-dropdown</code></td><td>1000</td></tr>
            <tr><td className="text-nowrap"><code>--st-z-sticky</code></td><td>1020</td></tr>
            <tr><td className="text-nowrap"><code>--st-z-fixed</code></td><td>1030</td></tr>
            <tr><td className="text-nowrap"><code>--st-z-modal-backdrop</code></td><td>1040</td></tr>
            <tr><td className="text-nowrap"><code>--st-z-modal</code></td><td>1050</td></tr>
            <tr><td className="text-nowrap"><code>--st-z-tooltip</code></td><td>1060</td></tr>
            <tr><td className="text-nowrap"><code>--st-z-toast</code></td><td>1070</td></tr>
          </tbody>
        </table>
      </div>

      <h3 className="mt-4 mb-2">Focus ring — theme-aware</h3>
      <div className="table-responsive mb-3">
        <table className="table table-sm">
          <thead>
            <tr><th>Token</th><th>Light (default)</th><th>Dark</th><th>Dim</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-nowrap"><code>--st-focus-ring</code></td>
              <td className="text-nowrap"><code>0 0 0 .25rem rgba(13,110,253,.25)</code></td>
              <td className="text-nowrap"><code>rgba(110,168,254,.25)</code></td>
              <td className="text-nowrap"><code>rgba(144,205,244,.25)</code></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mb-4">
        The <code>box-shadow</code> every interactive element gets on keyboard focus (
        <code>:focus-visible</code>). It&apos;s tinted to match <code>--st-primary</code> in each
        theme, so it stays visible without ever clashing.
      </p>

      <h3 className="mt-4 mb-2">Skeleton loader</h3>
      <p className="mb-3">
        Used by the shimmer loading placeholder (<code>data-st-skeleton</code>). The colors are
        theme-aware, timing and shape aren&apos;t:
      </p>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <tbody>
            <tr>
              <td className="text-nowrap"><code>--st-skeleton-base</code></td>
              <td className="text-nowrap">theme-aware</td>
              <td><Swatch hex="#e2e8f0" /> <span className="text-muted">light</span> · <Swatch hex="#2d3748" /> <span className="text-muted">dark</span> · <Swatch hex="#374151" /> <span className="text-muted">dim</span></td>
              <td>The shimmer&apos;s resting background color.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-skeleton-shine</code></td>
              <td className="text-nowrap">theme-aware</td>
              <td><Swatch hex="#f8fafc" /> <span className="text-muted">light</span> · <Swatch hex="#4a5568" /> <span className="text-muted">dark</span> · <Swatch hex="#4b5563" /> <span className="text-muted">dim</span></td>
              <td>The lighter color the shine sweep animates through.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-skeleton-duration</code></td>
              <td className="text-nowrap">constant</td>
              <td className="text-nowrap"><code>1.5s</code></td>
              <td>How long one shimmer sweep takes.</td>
            </tr>
            <tr>
              <td className="text-nowrap"><code>--st-skeleton-radius</code></td>
              <td className="text-nowrap">constant</td>
              <td className="text-nowrap"><code>4px</code></td>
              <td>Corner rounding for skeleton bars — separate from <code>--st-border-radius</code> so you can tune it independently.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="mt-4 mb-2">Spacing — constant across all themes</h3>
      <div className="table-responsive mb-4">
        <table className="table table-sm">
          <thead>
            <tr><th>Token</th><th>Default</th><th>Used for</th></tr>
          </thead>
          <tbody>
            <tr><td className="text-nowrap"><code>--st-gutter-x</code></td><td className="text-nowrap"><code>1.5rem</code></td><td>The default column gutter width for the grid system.</td></tr>
            <tr><td className="text-nowrap"><code>--st-gutter-y</code></td><td className="text-nowrap"><code>0</code></td><td>The default column gutter height (row gap) for the grid system.</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mb-4">
        See the <a href="/utilities/spacing">spacing utilities</a> for the rest of the spacing
        scale, which is applied directly as utility values rather than through tokens.
      </p>

      <Callout variant="tip" title="Not covered here: per-component override tokens">
        Every token above lives under <code>@layer st-base</code> and is what actually changes
        when the theme switches. A separate set — <code>--st-btn-color</code>,{" "}
        <code>--st-badge-color</code>, <code>--st-table-dark-bg</code>,{" "}
        <code>--st-tooltip-bg</code>, <code>--st-nav-pills-active-color</code>, and about a dozen
        more — lives inside individual component rules instead. Those don&apos;t vary by theme;
        they&apos;re customization hooks for one button, one card, one instance (
        <code>{'.btn-primary { --st-btn-bg: gold; }'}</code>), not part of the theme system
        itself.
      </Callout>
    </div>
  );
}
