import type { Metadata } from "next";
import { readRepoTextEscaped } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "License",
  description: "Strata CSS is MIT licensed — read the full license text.",
  alternates: { canonical: "/policies/license" },
};

export default function LicensePage() {
  const text = readRepoTextEscaped("LICENSE");
  return (
    <div className="container py-5 max-w-[720px]">
      <h1 className="mb-4">License</h1>
      <pre
        className="p-3 border rounded bg-[var(--st-bg-secondary)] overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </div>
  );
}
