import { forwardRef } from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode;
  rounded?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", icon, rounded = false, ...props },
  ref
) {
  return (
    <div className={["relative", className].join(" ")}>
      {icon ? (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
      ) : null}
      <input
        ref={ref}
        className={[
          "w-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-gladly-green focus:border-transparent",
          rounded ? "rounded-full" : "rounded-md",
          icon ? "pl-10" : "",
        ].join(" ")}
        {...props}
      />
    </div>
  );
});
