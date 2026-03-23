"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:pointer-events-none",
          {
            "bg-primary text-white hover:bg-primary-dark shadow-md hover:shadow-lg hover:shadow-primary/20":
              variant === "primary",
            "bg-secondary text-white hover:bg-secondary-dark shadow-md":
              variant === "secondary",
            "border-2 border-primary text-primary-dark hover:bg-primary hover:text-white":
              variant === "outline",
            "text-warm-gray hover:text-primary hover:bg-primary-light/20":
              variant === "ghost",
            "bg-red-500 text-white hover:bg-red-600 shadow-md": variant === "danger",
          },
          {
            "text-xs px-4 py-1.5": size === "sm",
            "text-sm px-6 py-2.5": size === "md",
            "text-sm px-8 py-3.5": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
