import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/whatsNew.ts and lib/roadmap.ts read ../CHANGELOG.md / ../ROADMAP.md
  // (plus their in-project backup copies) via fs.readFileSync with a path
  // built from process.cwd() at runtime. Next's build-time file tracer can't
  // follow that — it only reliably follows static import/require calls — so
  // none of the four files were ever included in the homepage's deployed
  // serverless function bundle. That's the actual root cause of the "What's
  // New"/"Roadmap" sections vanishing after ISR regenerates the page: the
  // fs reads always fail at request time on Vercel, even though everything
  // works locally and in `next build`, since both always have the full repo
  // on disk. This forces those four files into the trace explicitly instead
  // of depending on the tracer to find them itself.
  outputFileTracingIncludes: {
    "/": [
      "../CHANGELOG.md",
      "../ROADMAP.md",
      "./content/CHANGELOG.backup.md",
      "./content/ROADMAP.backup.md",
    ],
  },
};

export default nextConfig;
