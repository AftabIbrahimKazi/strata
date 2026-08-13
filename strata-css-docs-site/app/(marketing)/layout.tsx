import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <main className="flex-fill">{children}</main>
      <Footer />
    </div>
  );
}
