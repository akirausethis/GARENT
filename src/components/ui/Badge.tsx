import React from "react";
import clsx from "clsx";

export type BadgeVariant =
  | "available"
  | "used"
  | "rejected"
  | "pending"
  | "approved"
  | "neutral"
  | "steel"
  | "sepeda"
  | "mobil"
  | "mobil_listrik";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    available: "bg-status-availableBg text-status-availableText border-status-availableBorder",
    approved: "bg-status-availableBg text-status-availableText border-status-availableBorder",
    used: "bg-status-usedBg text-status-usedText border-status-usedBorder",
    pending: "bg-status-usedBg text-status-usedText border-status-usedBorder",
    rejected: "bg-status-rejectedBg text-status-rejectedText border-status-rejectedBorder",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    steel: "bg-steel-50 text-steel-700 border-steel-200",
    sepeda: "bg-emerald-50 text-emerald-800 border-emerald-200",
    mobil: "bg-blue-50 text-blue-800 border-blue-200",
    mobil_listrik: "bg-teal-50 text-teal-800 border-teal-200",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium border tabular-nums transition-colors",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
