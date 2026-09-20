import type { Metadata } from "next";
import Hero3D from "@/components/marketing-v2/Hero3D/Hero3D";
import {
  SurfaceIntro,
  CutawayDiagram,
  LayerSections,
  DescentView,
  CoreSection,
  ClosingCTA,
} from "@/components/marketing-v2/LandingSections";

// Work-in-progress landing page, built separately from the live one at "/".
// Not linked from navigation and excluded from indexing until it's ready to
// replace the current homepage.
export const metadata: Metadata = {
  title: "Redesign preview",
  robots: { index: false, follow: false },
};

export default function RedesignLanding() {
  return (
    <div>
      <Hero3D />
      <SurfaceIntro />
      <CutawayDiagram />
      <LayerSections />
      <DescentView />
      <CoreSection />
      <ClosingCTA />
    </div>
  );
}
