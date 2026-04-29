import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-gladly-green text-white hover:bg-gladly-green-hover border-transparent",
  secondary: "bg-white text-gray-700 hover:bg-gray-50 border-gray-300",
  ghost: "bg-transparent text-gladly-green hover:text-gladly-green-hover border-transparent"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = "", variant = "primary", size = "md", type = "button", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-gladly-green focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
});
