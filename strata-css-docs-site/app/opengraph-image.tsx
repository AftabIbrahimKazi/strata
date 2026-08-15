import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// next/og's renderer doesn't support CSS custom properties, so the brand
// orange is inlined directly — same value as --st-primary in
// styles/variables.css (light theme). The three tapered bars mirror
// components/Logo.tsx's funnel mark, redrawn at a larger scale.
const PRIMARY = "#ff8a3d";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1109",
          gap: 32,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ width: 220, height: 40, borderRadius: 20, background: PRIMARY }} />
          <div
            style={{
              width: 156,
              height: 40,
              borderRadius: 20,
              background: PRIMARY,
              opacity: 0.75,
              marginLeft: 32,
            }}
          />
          <div
            style={{
              width: 92,
              height: 40,
              borderRadius: 20,
              background: PRIMARY,
              opacity: 0.5,
              marginLeft: 64,
            }}
          />
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#fff" }}>Strata CSS</div>
        <div style={{ display: "flex", fontSize: 32, color: "#c9beb2" }}>The JIT CSS Framework</div>
      </div>
    ),
    { ...size }
  );
}
