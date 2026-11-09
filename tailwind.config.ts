import type { Config } from "tailwindcss";

// Every color resolves to a CSS variable so light, dark and increased-contrast
// appearances come from one place (src/app/palette.css + globals.css).
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const HUES = ["stone", "indigo", "red", "emerald", "amber", "blue", "sky", "violet", "pink", "orange"];
const palette = Object.fromEntries(HUES.map((h) => [h, Object.fromEntries(SHADES.map((s) => [s, v(`${h}-${s}`)]))]));

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ...palette,
        canvas: v("canvas"),          // app background (grouped)
        surface: v("surface"),        // cards, sheets, inputs
        accent: { DEFAULT: v("accent"), hover: v("accent-hover") }, // prominent button fill
        link: v("link"),              // tinted text: links, selected tab
        signal: v("signal"),          // overdue / destructive text
      },
      fontFamily: {
        display: ["var(--font-display)"],
      },
      minHeight: { tap: "var(--tap)" },
      minWidth: { tap: "var(--tap)" },
      height: { tap: "var(--tap)" },
      width: { tap: "var(--tap)" },
    },
  },
  plugins: [],
};
export default config;
