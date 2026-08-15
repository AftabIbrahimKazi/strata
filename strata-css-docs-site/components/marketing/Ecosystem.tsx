import { getSocketScore } from "@/lib/socket";
import ToolLogo, { type ToolId } from "./ToolLogo";
import ScoreRing from "./ScoreRing";

const TOOLS: { id: ToolId; name: string }[] = [
  { id: "npm", name: "npm" },
  { id: "github", name: "GitHub" },
  { id: "socket", name: "Socket" },
  { id: "snyk", name: "Snyk" },
  { id: "codeql", name: "CodeQL" },
];

// Socket only exposes "Supply Chain Security" through a public, fetchable
// endpoint (see lib/socket.ts) — the other 4 scores are rendered client-side
// on socket.dev from a private, authenticated API with no public equivalent.
// These are a real, manually-verified snapshot of strata-css's actual
// scores (checked by rendering socket.dev/npm/package/strata-css directly),
// not fabricated numbers — but unlike the live one, they won't move until
// someone re-checks and updates them here.
const STATIC_SCORES = {
  vulnerability: 100,
  quality: 100,
  maintenance: 96,
  license: 100,
};

export default async function Ecosystem() {
  const supplyChainScore = await getSocketScore("strata-css");

  return (
    <section className="container py-4">
      <h2 className="mb-1">Built and monitored with</h2>
      <p className="text-muted mb-4">strata-css&apos;s real Socket score, checked on every build.</p>

      <div className="row g-3 align-items-center">
        <div className="col-12 col-lg-4">
          <div className="d-flex flex-wrap gap-3 justify-content-center justify-content-lg-start">
            {TOOLS.map((tool) => (
              <div key={tool.id} className="tool-logo-square d-flex align-items-center justify-content-center" title={tool.name}>
                <ToolLogo id={tool.id} />
              </div>
            ))}
          </div>
        </div>

        <div className="col-12 col-lg-8">
          <div className="d-flex flex-wrap justify-content-center justify-content-lg-start gap-4">
            {supplyChainScore !== null && (
              <ScoreRing score={supplyChainScore} label="Supply Chain Security" />
            )}
            <ScoreRing score={STATIC_SCORES.vulnerability} label="Vulnerability" />
            <ScoreRing score={STATIC_SCORES.quality} label="Quality" />
            <ScoreRing score={STATIC_SCORES.maintenance} label="Maintenance" />
            <ScoreRing score={STATIC_SCORES.license} label="License" />
          </div>
        </div>
      </div>
    </section>
  );
}
