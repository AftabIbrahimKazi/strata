import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "This site collects no personal data and uses no tracking cookies or third-party analytics.",
  alternates: { canonical: "/policies/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="container py-5 max-w-[720px] prose-links">
      <h1 className="mb-4">Privacy Policy</h1>

      <p className="mb-3">
        This site does not require an account and does not collect personal information. It
        doesn&apos;t use tracking cookies or third-party analytics. The only thing stored is a
        theme preference (light/dim/dark), saved in your browser&apos;s local storage — this
        never leaves your device and isn&apos;t sent to us.
      </p>

      <p className="mb-3">
        Pages that display live project data (npm downloads, GitHub stars) fetch that data from
        those services&apos; public APIs at page-load time. No personal or visitor data is sent
        as part of those requests.
      </p>

      <p className="mb-0">
        Standard hosting infrastructure (Vercel) may log basic technical request data (IP
        address, user agent) for security and reliability purposes, per Vercel&apos;s own
        privacy policy — this site doesn&apos;t access or use those logs directly.
      </p>
    </div>
  );
}
