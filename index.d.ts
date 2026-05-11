/**
 * Strata CSS — TypeScript Declarations
 * https://github.com/AftabIbrahimKazi/strata
 */

export interface StrataThemeConfig {
  /** Add or override breakpoints. Key is the breakpoint name, value is the min-width (e.g. "1600px"). */
  breakpoints?: Record<string, string>
  /** Override semantic color values. Key is the color name (e.g. "primary"), value is a CSS color string. */
  colors?: Record<string, string>
}

export interface StrataComponentsConfig {
  /** Component names to exclude from the generated CSS. */
  exclude?: string[]
  /** Component names to explicitly include (when using an allowlist approach). */
  include?: string[]
}

/** Configuration object for strata.config.js */
export interface StrataConfig {
  /**
   * Glob patterns pointing to files Strata should scan for class names.
   * @example ["./src/**\/*.{html,jsx,tsx,vue,astro,svelte}"]
   */
  content: string[]

  /**
   * Path to the entry CSS file containing @strata directives.
   * @default "./strata.css"
   */
  input?: string

  /**
   * Path where Strata writes the generated CSS output.
   * @default "./dist/strata.output.css"
   */
  output?: string

  /** Theme overrides — extend breakpoints or override color values. */
  theme?: StrataThemeConfig

  /** Include or exclude specific components from the generated output. */
  components?: StrataComponentsConfig
}

/** Options passed to the build function. */
export interface StrataBuildOptions {
  /** Working directory used to resolve config and content paths. Defaults to process.cwd(). */
  cwd?: string
}

/**
 * Run a full Strata build — scans content files, generates CSS, writes to output path.
 * Equivalent to `strata --build` from the CLI.
 */
export function build(
  input: string,
  output: string,
  options?: StrataBuildOptions
): Promise<void>

/**
 * Invalidate the internal build cache, forcing a full cold rebuild on the next build() call.
 * Call this when content files change programmatically.
 */
export function invalidate(): void

/** Marks this module as a PostCSS plugin (required by PostCSS plugin discovery). */
export const postcss: true
