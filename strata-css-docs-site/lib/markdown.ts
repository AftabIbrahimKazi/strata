import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

// Reads a file from the repo root at build time — these pages are fully
// static (prerendered once at `next build`, which has the full repo checked
// out), so the file never needs to exist in the deployed serverless output.
// turbopackIgnore stops Next's file tracer from bundling the whole monorepo
// into the function output just because it sees this call.
export function renderRepoMarkdown(filename: string): string {
  const filePath = path.join(/* turbopackIgnore: true */ process.cwd(), "..", filename);
  const raw = fs.readFileSync(filePath, "utf8");
  return marked.parse(raw, { async: false });
}

// Same as renderRepoMarkdown, but drops everything before the first "##"
// heading — for package README.md files, whose H1/tagline/npm-badges intro
// is already rendered by the page's own header (title, version, license),
// so rendering it again would just duplicate it.
export function renderRepoMarkdownFromFirstSection(filename: string): string {
  const filePath = path.join(/* turbopackIgnore: true */ process.cwd(), "..", filename);
  const raw = fs.readFileSync(filePath, "utf8");
  const sectionStart = raw.indexOf("\n## ");
  const body = sectionStart === -1 ? raw : raw.slice(sectionStart + 1);
  return marked.parse(body, { async: false });
}

// For plain-text repo files (e.g. LICENSE) — no markdown parsing, just
// HTML-escaped raw text safe to drop into a <pre>.
export function readRepoTextEscaped(filename: string): string {
  const filePath = path.join(/* turbopackIgnore: true */ process.cwd(), "..", filename);
  const raw = fs.readFileSync(filePath, "utf8");
  return raw.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}
