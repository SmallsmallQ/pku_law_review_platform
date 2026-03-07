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
        journal: {
          DEFAULT: "#8B1538",
          dark: "#70122e",
          light: "#faf8f8",
        },
      },
      fontSize: {
        xs: ["13px", { lineHeight: "1.5" }],
        sm: ["15px", { lineHeight: "1.5" }],
        base: ["16px", { lineHeight: "1.6" }],
        lg: ["18px", { lineHeight: "1.5" }],
        xl: ["20px", { lineHeight: "1.4" }],
      },
    },
  },
  plugins: [],
};
export default config;
