export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.7}
      viewBox="0 0 28 20"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="0" width="24" height="6" rx="3" fill="var(--st-primary)" />
      <rect x="5.5" y="7" width="17" height="6" rx="3" fill="var(--st-primary)" opacity="0.75" />
      <rect x="9" y="14" width="10" height="6" rx="3" fill="var(--st-primary)" opacity="0.5" />
    </svg>
  );
}
