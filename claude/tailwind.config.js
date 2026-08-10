/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
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

        // App background (Electric Blue system used in the prose spec)
        'app-bg': '#F8FAFC',
        'card-white': '#FFFFFF',
        stroke: '#E2E8F0',

        // Primary
        primary: '#2563EB',
        'primary-deep': '#004AC6',
        'on-primary': '#ffffff',
        'primary-container': '#eeefff',

        // Secondary / tertiary
        secondary: '#505f76',
        'secondary-container': '#d0e1fb',
        'on-secondary-container': '#54647a',

        // Status
        success: '#16A34A',
        'success-bg': '#DCFCE7',
        warning: '#D97706',
        'warning-bg': '#FEF3C7',
        info: '#2563EB',
        'info-bg': '#DBEAFE',
        danger: '#DC2626',
        'danger-bg': '#FEE2E2',

        outline: '#737686',
        'outline-variant': '#c3c6d7',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      fontSize: {
        display: ['32px', { lineHeight: '40px', fontWeight: '700', letterSpacing: '-0.02em' }],
        'headline-lg': ['24px', { lineHeight: '32px', fontWeight: '700', letterSpacing: '-0.01em' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'title-lg': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        l1: '0px 1px 3px rgba(0,0,0,0.05), 0px 10px 15px -3px rgba(0,0,0,0.02)',
        l2: '0px 4px 6px -1px rgba(0,0,0,0.08), 0px 2px 4px -2px rgba(0,0,0,0.05)',
      },
      spacing: {
        'container-margin': '2rem', // 32px desktop
        gutter: '1.5rem',
        'card-padding': '1.5rem',
        'stack-sm': '0.5rem',
        'stack-md': '1rem',
        'stack-lg': '2rem',
        sidebar: '280px',
      },
    },
  },
  plugins: [],
}
