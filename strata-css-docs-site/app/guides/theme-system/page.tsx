import CodeBlock from "@/components/CodeBlock";
import Callout from "@/components/Callout";

export default function ThemeSystemPage() {
  return (
    <div>
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
      <p>
        All theme-aware values are CSS custom properties under <code>@layer st-base</code> (
        <code>--st-primary</code>, <code>--st-bg</code>, <code>--st-text</code>,{" "}
        <code>--st-border</code>, <code>--st-shadow-*</code>, and more) — components read these
        automatically, so switching themes requires no component-level code.
      </p>
    </div>
  );
}
