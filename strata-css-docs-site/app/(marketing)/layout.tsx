import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MarketingCursorFx from "@/components/MarketingCursorFx";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Reveal is hero-only markup, so it costs nothing on the other
          marketing pages that never mark a target for it. Which presets mount
          is route-dependent — see MarketingCursorFx. */}
      <MarketingCursorFx />
      <Header />
      <main className="flex-fill">{children}</main>
      <Footer />
    </div>
  );
}
