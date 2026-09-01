const ICONS: Record<string, string> = {
  forms:
    "M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm2 4h6M6 13h4m8-3-2 2 2 2",
  picker:
    "M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm3 7h2m4 0h2m-8 4h2m4 0h2",
  modal:
    "M4 4h13a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3 15h9m6-13v9a1 1 0 0 1-1 1h-2",
  "skeleton-loader":
    "M4 6h9M4 11h16M4 16h12M4 21h7",
  chart: "M4 20V10m6 10V4m6 16v-7m6 7V8",
  offcanvas:
    "M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm12 0v16",
  flipbook:
    "M12 6C10 4.5 6.5 4 3 4v14c3.5 0 7 .5 9 2 2-1.5 5.5-2 9-2V4c-3.5 0-7 .5-9 2Zm0 0v14",
  // Pointer plus its trail — the only icon here that had no entry, so the
  // cursorfx card rendered an empty <svg>.
  cursorfx:
    "M5 3l14 7-6 2.5L10 19Zm-1 9h0m-2 4h0",
  shopmap:
    "M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
};

export default function PackageIcon({ slug, size = 40 }: { slug: string; size?: number }) {
  const d = ICONS[slug];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d && <path d={d} />}
    </svg>
  );
}
