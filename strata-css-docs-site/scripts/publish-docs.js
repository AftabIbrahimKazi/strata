// Copies the static export (`out/`) into the repo-root `/docs` folder that
// GitHub Pages already serves from ("Deploy from a branch" -> main / /docs).
// Intentionally does NOT touch Pages settings — only the folder contents.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'out');
const DEST = path.join(__dirname, '..', '..', 'docs');

if (!fs.existsSync(SRC)) {
  console.error('[publish-docs] out/ not found — run `next build` first.');
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, { recursive: true });

// GitHub Pages' legacy "Deploy from a branch" mode runs Jekyll, which
// silently ignores any file/folder starting with `_` (e.g. Next's
// `_next/`) unless this marker is present.
fs.writeFileSync(path.join(DEST, '.nojekyll'), '');

console.log(`[publish-docs] Copied ${SRC} -> ${DEST} (+ .nojekyll)`);
