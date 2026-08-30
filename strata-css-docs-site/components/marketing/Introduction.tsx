import Link from "next/link";
import Logo from "@/components/Logo";

export default function Introduction() {
  return (
    <section className="container py-4">
      <div className="card">
        <div className="card-body d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-4">
          <div className="d-flex align-items-center gap-4">
            <Logo size={40} />
            <div>
              <h2 className="mb-2">What is Strata CSS?</h2>
              <p className="text-muted mb-0">
                Strata CSS is a modern JIT CSS framework that combines the best of
                component-driven development and utility-first flexibility. It gives you a
                powerful, atomic toolkit with the simplicity of writing CSS.
              </p>
            </div>
          </div>
          <Link href="/docs" className="btn-primary flex-shrink-0">
            Visit the Docs →
          </Link>
        </div>
      </div>
    </section>
  );
}
