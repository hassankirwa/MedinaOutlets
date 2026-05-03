import * as React from "react";

type ButtonVariant = "default" | "outline";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  className = "",
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:pointer-events-none disabled:opacity-60";
  const variantClasses =
    variant === "outline"
      ? "border border-gray-300 bg-transparent hover:bg-gray-100"
      : "bg-emerald-600 text-white hover:bg-emerald-700";

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses} ${className}`.trim()}
      {...props}
    />
  );
}
