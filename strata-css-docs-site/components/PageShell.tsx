import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <div className="d-flex flex-fill">
        <Sidebar />
        <main className="flex-fill p-4 max-w-[840px]">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
