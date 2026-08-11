const VARIANTS: Record<string, string> = {
  tip: "alert-info",
  warning: "alert-warning",
  danger: "alert-danger",
};

export default function Callout({
  variant = "tip",
  title,
  children,
}: {
  variant?: "tip" | "warning" | "danger";
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`alert ${VARIANTS[variant]} mb-4`}>
      {title && <p className="fw-bold mb-1">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
