import React from "react";
import clsx from "clsx";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

interface AlertProps {
  type?: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ type = "info", title, children, className }: AlertProps) {
  const styles = {
    info: {
      bg: "bg-steel-50/70 border-steel-200 text-steel-900",
      icon: <Info className="w-4 h-4 text-steel-700 shrink-0 mt-0.5" />,
    },
    success: {
      bg: "bg-status-availableBg border-status-availableBorder text-status-availableText",
      icon: <CheckCircle2 className="w-4 h-4 text-status-availableText shrink-0 mt-0.5" />,
    },
    warning: {
      bg: "bg-status-usedBg border-status-usedBorder text-status-usedText",
      icon: <AlertTriangle className="w-4 h-4 text-status-usedText shrink-0 mt-0.5" />,
    },
    error: {
      bg: "bg-status-rejectedBg border-status-rejectedBorder text-status-rejectedText",
      icon: <AlertCircle className="w-4 h-4 text-status-rejectedText shrink-0 mt-0.5" />,
    },
  };

  const current = styles[type];

  return (
    <div
      className={clsx(
        "flex gap-3 p-3.5 border rounded-lg text-xs leading-relaxed",
        current.bg,
        className
      )}
    >
      {current.icon}
      <div className="space-y-0.5 flex-1">
        {title && <h5 className="font-semibold text-xs tracking-tight">{title}</h5>}
        <div className="opacity-90">{children}</div>
      </div>
    </div>
  );
}
