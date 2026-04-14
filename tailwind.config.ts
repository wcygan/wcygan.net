import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{html,js,jsx,tsx,ts,md,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
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
