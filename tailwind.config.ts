import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F8FAFC",
        surface: "#FFFFFF",
        border: "#E2E8F0",
        slate: {
          950: "#020617",
          900: "#0F172A", // Architectural Deep Slate
          800: "#1E293B",
          700: "#334155",
          600: "#475569",
          500: "#64748B",
          400: "#94A3B8",
          300: "#CBD5E1",
          200: "#E2E8F0",
          100: "#F1F5F9",
          50: "#F8FAFC",
        },
        steel: {
          900: "#0C4A6E",
          800: "#075985",
          700: "#0369A1", // Restrained Steel Blue
          600: "#0284C7",
          500: "#0EA5E9",
          100: "#E0F2FE",
          50: "#F0F9FF",
        },
        status: {
          availableBg: "#ECFDF5",
          availableText: "#065F46",
          availableBorder: "#A7F3D0",
          usedBg: "#FFFBEB",
          usedText: "#92400E",
          usedBorder: "#FDE68A",
          rejectedBg: "#FEF2F2",
          rejectedText: "#991B1B",
          rejectedBorder: "#FECACA",
        },
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        hairline: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        card: "0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)",
        modal: "0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
