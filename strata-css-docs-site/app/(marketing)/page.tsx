import Hero from "@/components/marketing/Hero";
import Introduction from "@/components/marketing/Introduction";
import PackagesGrid from "@/components/marketing/PackagesGrid";
import WhatsNew from "@/components/marketing/WhatsNew";
import Roadmap from "@/components/marketing/Roadmap";
import Ecosystem from "@/components/marketing/Ecosystem";
import LiveStats from "@/components/marketing/LiveStats";
import Faq from "@/components/marketing/Faq";
import { FAQS } from "@/content/faq";
import { getLatestVersionInfo } from "@/lib/npm";
import { getLatestFeatures } from "@/lib/whatsNew";

const AUTHOR = {
  "@type": "Person",
  name: "Aftab Ibrahim Kazi",
  url: "https://github.com/AftabIbrahimKazi",
  sameAs: [
    "https://github.com/AftabIbrahimKazi",
    "https://www.npmjs.com/~aftabibrahimkazi",
  ],
};

export default async function Landing() {
  const versionInfo = await getLatestVersionInfo("strata-css");
  const latestFeatures = getLatestFeatures();

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Strata CSS",
    description: "A JIT CSS framework that combines component-first classes with utility-first, JIT-scanned styling.",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    url: "https://strata-css-docs-site.vercel.app",
    author: AUTHOR,
    creator: AUTHOR,
    sameAs: [
      "https://www.npmjs.com/package/strata-css",
      "https://github.com/AftabIbrahimKazi/strata",
      "https://socket.dev/npm/package/strata-css",
    ],
    ...(versionInfo ? { softwareVersion: versionInfo.version } : {}),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Hero />
      <Introduction />
      <PackagesGrid />
      <WhatsNew items={latestFeatures} />
      <Roadmap />
      <Ecosystem />
      <LiveStats />
      <Faq />
    </div>
  );
}
