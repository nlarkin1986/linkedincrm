type BadgeVariant = "active" | "neutral" | "danger";

export function Badge({
  children,
  className = "",
  variant = "neutral"
}: {
  children: React.ReactNode;
  className?: string;
  variant?: BadgeVariant;
}) {
  const variants: Record<BadgeVariant, string> = {
    active: "bg-gladly-park-light text-gladly-green border-gladly-green",
    neutral: "bg-gray-100 text-gray-700 border-transparent",
    danger: "bg-red-50 text-red-700 border-red-200"
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      ].join(" ")}
    >
      {children}
    </span>
  );
}
