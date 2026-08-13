import Callout from "@/components/Callout";

export default function VersioningPage() {
  return (
    <div>
      <h1 className="fw-bold mb-3">Versioning & Contributing</h1>
      <p className="mb-4">
        Strata follows <code>MAJOR.FEATURE.BUGFIX</code> — FEATURE and BUGFIX never reset
        mid-era, only on a MAJOR bump.
      </p>
      <ul className="mb-4">
        <li className="mb-2">
          A <code>feat:</code> commit increments FEATURE.
        </li>
        <li className="mb-2">
          A <code>fix:</code> commit increments BUGFIX.
        </li>
        <li>
          A <code>BREAKING:</code> commit resets to a new MAJOR era (FEATURE/BUGFIX reset to 0
          only here).
        </li>
      </ul>
      <Callout variant="tip">
        Full versioning rules, the branch pipeline, commit format, and the publishing checklist
        live in <code>CONTRIBUTING.md</code> at the repo root.
      </Callout>
    </div>
  );
}
