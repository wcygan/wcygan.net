import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{html,js,jsx,tsx,ts,md,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        body: [
          '"Atkinson Hyperlegible"',
          "system",
          "-apple-system",
          "system-ui",
          '"Helvetica Neue"',
          '"Lucida Grande"',
          "sans-serif",
        ],
        sans: [
          '"Atkinson Hyperlegible"',
          "system",
          "-apple-system",
          "system-ui",
          '"Helvetica Neue"',
          '"Lucida Grande"',
          "sans-serif",
        ],
        ui: [
          '"Inter"',
          "system",
          "-apple-system",
          "system-ui",
          '"Helvetica Neue"',
          '"Lucida Grande"',
          "sans-serif",
        ],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            "code::before": { content: '""' },
            "code::after": { content: '""' },
          },
        },
      },
    },
  },
  plugins: [typography],
} satisfies Config;
