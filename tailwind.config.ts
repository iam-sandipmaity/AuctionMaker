import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        accent: "var(--accent)",
        border: "var(--border)",
      },
      fontFamily: {
        grotesk: ['var(--font-grotesk)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderWidth: {
        '3': '3px',
        '5': '5px',
      },
      animation: {
        'bid-flash': 'bidFlash 0.5s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        bidFlash: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'var(--accent)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
