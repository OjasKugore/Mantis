import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary-container": "#87a96b",
        "surface-container-lowest": "#ffffff",
        "surface-dim": "#d9d0d4",
        "on-tertiary": "#ffffff",
        "surface-bright": "#fff7fa",
        "surface-container-high": "#ebe3e7",
        "surface-container-low": "#fbf1f5",
        "on-primary-fixed": "#0b2000",
        "on-background": "#1e1a1d",
        "on-secondary-container": "#4a686b",
        "on-primary": "#ffffff",
        "on-tertiary-fixed": "#281900",
        "on-surface": "#1b1c17",
        "on-primary-container": "#213d0b",
        "error": "#ba1a1a",
        "tertiary": "#735a31",
        "secondary": "#456367",
        "error-container": "#ffdad6",
        "on-primary-fixed-variant": "#314e1b",
        "on-surface-variant": "#43483d",
        "secondary-fixed-dim": "#acccd0",
        "surface": "#e3dade",
        "secondary-fixed": "#c8e8ec",
        "surface-variant": "#e9e0e4",
        "inverse-primary": "#aed18f",
        "on-error-container": "#93000a",
        "surface-container-highest": "#e5dde1",
        "tertiary-fixed-dim": "#e3c290",
        "on-error": "#ffffff",
        "on-tertiary-fixed-variant": "#59431c",
        "inverse-surface": "#342f32",
        "background": "#fff7fa",
        "surface-container": "#f1e9ed",
        "surface-tint": "#486730",
        "tertiary-container": "#b89a6b",
        "primary": "#486730",
        "outline": "#74796d",
        "outline-variant": "#c4c8ba",
        "on-secondary": "#ffffff",
        "inverse-on-surface": "#f8eef2",
        "on-secondary-fixed-variant": "#2e4c4f",
        "secondary-container": "#c5e6ea",
        "on-tertiary-container": "#47320d",
        "primary-fixed-dim": "#aed18f",
        "primary-fixed": "#c9eea9",
        "tertiary-fixed": "#ffdeac",
        "on-secondary-fixed": "#001f23",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        "margin-sm": "16px",
        "base": "4px",
        "gutter": "24px",
        "max-width": "1280px",
        "margin-lg": "40px",
      },
      fontFamily: {
        "body-sm": ["Hanken Grotesk", "sans-serif"],
        "display-lg": ["Manrope", "sans-serif"],
        "headline-sm": ["Manrope", "sans-serif"],
        "label-code": ["JetBrains Mono", "monospace"],
        "headline-md": ["Manrope", "sans-serif"],
        "body-lg": ["Hanken Grotesk", "sans-serif"],
        "headline-md-mobile": ["Manrope", "sans-serif"],
        "label-caps": ["Hanken Grotesk", "sans-serif"],
        "body-md": ["Hanken Grotesk", "sans-serif"],
      },
      fontSize: {
        "body-sm": [
          "13px",
          {
            lineHeight: "20px",
            fontWeight: "400",
          },
        ],
        "display-lg": [
          "48px",
          {
            lineHeight: "56px",
            letterSpacing: "-0.02em",
            fontWeight: "700",
          },
        ],
        "headline-sm": [
          "24px",
          {
            lineHeight: "32px",
            fontWeight: "600",
          },
        ],
        "label-code": [
          "12px",
          {
            lineHeight: "16px",
            letterSpacing: "0.02em",
            fontWeight: "500",
          },
        ],
        "headline-md": [
          "32px",
          {
            lineHeight: "40px",
            letterSpacing: "-0.01em",
            fontWeight: "600",
          },
        ],
        "body-lg": [
          "18px",
          {
            lineHeight: "28px",
            fontWeight: "400",
          },
        ],
        "headline-md-mobile": [
          "28px",
          {
            lineHeight: "36px",
            fontWeight: "600",
          },
        ],
        "label-caps": [
          "11px",
          {
            lineHeight: "16px",
            letterSpacing: "0.06em",
            fontWeight: "600",
          },
        ],
        "body-md": [
          "15px",
          {
            lineHeight: "24px",
            fontWeight: "400",
          },
        ],
      },
    },
  },
  plugins: [],
};
export default config;

