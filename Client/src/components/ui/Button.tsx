import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn-orange-primary",
  secondary: "btn-secondary-white",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

export default function Button({ variant = "primary", icon, className = "", children, ...rest }: ButtonProps) {
  return (
    <button className={`${VARIANT_CLASS[variant]} ${className}`.trim()} {...rest}>
      {icon}
      {children}
    </button>
  );
}
