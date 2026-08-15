import Hero from "@/components/marketing/Hero";
import Introduction from "@/components/marketing/Introduction";
import PackagesGrid from "@/components/marketing/PackagesGrid";
import Roadmap from "@/components/marketing/Roadmap";
import Ecosystem from "@/components/marketing/Ecosystem";
import LiveStats from "@/components/marketing/LiveStats";
import Faq from "@/components/marketing/Faq";
import { getLatestVersionInfo } from "@/lib/npm";

export default async function Landing() {
  const versionInfo = await getLatestVersionInfo("strata-css");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Strata CSS",
    description: "A JIT CSS framework that combines component-first classes with utility-first, JIT-scanned styling.",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    url: "https://strata-css-docs-site.vercel.app",
    ...(versionInfo ? { softwareVersion: versionInfo.version } : {}),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <Introduction />
      <PackagesGrid />
      <Roadmap />
      <Ecosystem />
      <LiveStats />
      <Faq />
    </div>
  );
}
