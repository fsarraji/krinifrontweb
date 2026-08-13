/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Vantage Fleet tokens (strictly matching krini_vantage_fleet.html)
        surface: '#faf8ff',
        'surface-dim': '#d2d9f4',
        'surface-bright': '#faf8ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f3ff',
        'surface-container': '#eaedff',
        'surface-container-high': '#e2e7ff',
        'surface-container-highest': '#dae2fd',
        'on-surface': '#131b2e',
        'on-surface-variant': '#434655',

        // Backgrounds & Cards
        'slate-bg': '#F8FAFC',
        'app-bg': '#F8FAFC',
        'card-white': '#FFFFFF',
        stroke: '#E2E8F0',

        // Primary & Accent Colors
        primary: '#004ac6',
        'primary-container': '#2563eb',
        'on-primary': '#ffffff',
        'on-primary-container': '#eeefff',

        // Secondary
        secondary: '#505f76',
        'secondary-container': '#d0e1fb',
        'on-secondary-container': '#54647a',

        // Status system
        success: '#16A34A',
        'success-bg': '#DCFCE7',
        warning: '#D97706',
        'warning-bg': '#FEF3C7',
        info: '#2563EB',
        'info-bg': '#DBEAFE',
        danger: '#DC2626',
        'danger-bg': '#FEE2E2',
        'error-c': '#DC2626',
        'error-bg': '#FEE2E2',
        'on-error-container': '#93000a',

        outline: '#737686',
        'outline-variant': '#c3c6d7',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      borderRadius: {
        token: '8px',
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        full: '9999px',
      },
      boxShadow: {
        l1: '0px 1px 3px rgba(0,0,0,0.05), 0px 10px 15px -3px rgba(0,0,0,0.02)',
        l2: '0px 4px 6px -1px rgba(0,0,0,0.08), 0px 2px 4px -2px rgba(0,0,0,0.05)',
        soft: '0 1px 3px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.04)',
      },
    },
  },
  plugins: [],
}