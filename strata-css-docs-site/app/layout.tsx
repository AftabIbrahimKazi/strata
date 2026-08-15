import type { Metadata } from "next";
import "../styles/strata.output.css";
import "../styles/variables.css";
import "../styles/main.css";
import "../styles/components/theme-toggle.css";
import "../styles/components/back-to-top.css";
import "../styles/components/icon-btn.css";
import "../styles/components/packages-carousel.css";
import "../styles/components/whats-new-chip.css";
import "../styles/components/ecosystem.css";
import "../styles/components/roadmap-status.css";
import "../styles/components/docs-eyebrow.css";
import BackToTop from "@/components/BackToTop";

const SITE_URL = "https://strata-css-docs-site.vercel.app";
const SITE_DESCRIPTION = "Documentation for Strata CSS — a JIT CSS framework.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Strata CSS",
    template: "%s — Strata CSS",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Strata CSS",
    title: "Strata CSS",
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Strata CSS",
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

const THEME_SCRIPT = `
  try {
    var t = localStorage.getItem('theme');
    if (t) document.documentElement.setAttribute('data-st-theme', t);
  } catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        <BackToTop />
      </body>
    </html>
  );
}
