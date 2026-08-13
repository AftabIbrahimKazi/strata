import Hero from "@/components/marketing/Hero";
import Introduction from "@/components/marketing/Introduction";
import PackagesGrid from "@/components/marketing/PackagesGrid";
import Roadmap from "@/components/marketing/Roadmap";
import Ecosystem from "@/components/marketing/Ecosystem";
import LiveStats from "@/components/marketing/LiveStats";

export default function Landing() {
  return (
    <div>
      <Hero />
      <Introduction />
      <PackagesGrid />
      <Roadmap />
      <Ecosystem />
      <LiveStats />
    </div>
  );
}
