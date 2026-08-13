import type { Metadata } from "next";
import "../styles/strata.output.css";
import "../styles/variables.css";
import "../styles/main.css";

export const metadata: Metadata = {
  title: "Strata CSS",
  description: "Documentation for Strata CSS — a JIT CSS framework.",
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
      <body>{children}</body>
    </html>
  );
}
