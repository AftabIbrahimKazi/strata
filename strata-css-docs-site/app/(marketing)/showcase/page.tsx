import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Showcase",
  description: "Sites built with Strata CSS — coming soon.",
  alternates: { canonical: "/showcase" },
};

export default function ShowcasePage() {
  return (
    <div className="container py-5 text-center">
      <h1 className="fw-bold mb-3">Showcase</h1>
      <p className="text-muted mb-0">Coming soon.</p>
    </div>
  );
}
