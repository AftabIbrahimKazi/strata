import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // GitHub Pages serves this repo at aftabibrahimkazi.github.io/strata/,
  // a subpath, not the domain root — assets need the /strata prefix.
  basePath: "/strata",
};

export default nextConfig;
