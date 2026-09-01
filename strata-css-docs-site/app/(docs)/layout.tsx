import PageShell from "@/components/PageShell";
import CursorFx from "@/components/CursorFx";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Docs pages get LineWave only — Reveal restructures its container
          into a grid and is hero markup, which does not exist here. */}
      <CursorFx
        presets={{
          "line-wave": { thickness: 1 },
        }}
      />
      <PageShell>{children}</PageShell>
    </>
  );
}
