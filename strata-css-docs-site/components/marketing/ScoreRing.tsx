// Mirrors Socket's own report-page ring style (dark surface, green
// circular progress, big centered number) since it's presenting Socket's
// real score under Socket's own visual identity — not a generic chart. The
// dark backdrop is scoped to just the ring itself (score-ring-chip), not a
// bordered card around the whole section.
const SIZE = 96;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScoreRing({ score, label }: { score: number; label: string }) {
  const offset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <div className="score-ring d-flex flex-column align-items-center gap-2">
      <div className="score-ring-chip">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${label}: ${score}`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#2f3336" strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#48bb78"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="24" fontWeight="700">
            {score}
          </text>
        </svg>
      </div>
      <span className="score-ring-label fw-semibold text-center">{label}</span>
    </div>
  );
}
