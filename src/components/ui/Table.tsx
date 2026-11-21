import React from "react";
import clsx from "clsx";

export function Table({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="w-full overflow-x-auto border border-slate-200 rounded-lg">
      <table className={clsx("w-full text-left text-xs text-slate-700 tabular-nums border-collapse", className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <thead
      className={clsx(
        "bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 select-none",
        className
      )}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tbody className={clsx("divide-y divide-slate-100 bg-white", className)}>{children}</tbody>;
}

export function TableRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={clsx(
        "hover:bg-slate-50/75 transition-colors duration-100",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={clsx("px-4 py-3 font-semibold", className)}>{children}</th>;
}

export function TableCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={clsx("px-4 py-3 text-slate-700 whitespace-nowrap", className)}>{children}</td>;
}
