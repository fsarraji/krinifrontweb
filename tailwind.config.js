/** @type {import('tailwindcss').Config} */

// Palette = jetons Astryx (variables CSS posées par <Theme theme={kriniTheme}>, voir src/theme).
// Les noms historiques (primary, stroke, on-surface, slate-*, indigo-*…) sont conservés pour que
// les pages existantes changent de rendu sans être modifiées ; ils suivent le thème (clair/sombre).
//
// Les valeurs sont des fonctions pour que les modificateurs d'opacité (bg-primary/30, ring-danger/20)
// continuent de fonctionner avec des couleurs `var(...)`.
// opacityValue : undefined, 'var(--tw-*-opacity)' (utilitaire sans modificateur) ou un nombre ('0.3').
const c = (expr) => ({ opacityValue }) => {
  const alpha = Number(opacityValue);
  return opacityValue === undefined || Number.isNaN(alpha) ? expr : `color-mix(in srgb, ${expr} ${alpha * 100}%, transparent)`;
};
const mix = (a, pct, b) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

const T = {
  accent: 'var(--color-accent)',
  onAccent: 'var(--color-on-accent)',
  accentMuted: 'var(--color-accent-muted)',
  body: 'var(--color-background-body)',
  surface: 'var(--color-background-surface)',
  card: 'var(--color-background-card)',
  muted: 'var(--color-background-muted)',
  border: 'var(--color-border)',
  borderStrong: 'var(--color-border-emphasized)',
  text: 'var(--color-text-primary)',
  text2: 'var(--color-text-secondary)',
  textOff: 'var(--color-text-disabled)',
  hover: 'var(--color-tint-hover)',
  success: 'var(--color-success)',
  successMuted: 'var(--color-success-muted)',
  warning: 'var(--color-warning)',
  warningMuted: 'var(--color-warning-muted)',
  error: 'var(--color-error)',
  errorMuted: 'var(--color-error-muted)',
};
const textMuted = mix(T.text2, 62, T.textOff); // métadonnées (ex-#64748B)
const accentDeep = mix(T.accent, 86, 'black');
const accentBorder = mix(T.accent, 32, T.surface);
const dark = (color) => mix(color, 72, 'black');
const soft = (color) => mix(color, 30, T.surface);

// Échelle neutre : slate-50…900 (utilisée ~500 fois dans les pages)
const neutral = {
  50: c(T.body),
  100: c(T.muted),
  200: c(T.border),
  300: c(T.borderStrong),
  400: c(T.textOff),
  500: c(textMuted),
  600: c(T.text2),
  700: c(mix(T.text2, 70, T.text)),
  800: c(mix(T.text2, 30, T.text)),
  900: c(T.text),
  950: c(T.text),
};

// Teintes historiques redirigées vers les rôles du design system
const ramp = (base, muted) => ({
  50: c(muted), 100: c(muted), 200: c(soft(base)), 300: c(mix(base, 55, T.surface)), 400: c(mix(base, 80, T.surface)),
  500: c(base), 600: c(base), 700: c(dark(base)), 800: c(mix(base, 56, 'black')), 900: c(mix(base, 42, 'black')),
});

export default {
  // Le reset est fourni par Astryx (@astryxdesign/core/reset.css, en couche) : le preflight de
  // Tailwind n'est pas en couche et écraserait les styles des composants Astryx.
  corePlugins: { preflight: false },
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Marque
        primary: c(T.accent),
        'primary-deep': c(accentDeep),
        'primary-hover': c(accentDeep),
        'primary-light': c(T.accentMuted),
        'primary-border': c(accentBorder),
        'on-primary': c(T.onAccent),
        'primary-container': c(T.accent),
        'on-primary-container': c(T.onAccent),

        // Fonds
        'app-bg': c(T.body),
        'slate-bg': c(T.body),
        'card-white': c(T.card),
        surface: c(T.body),
        'surface-dim': c(T.border),
        'surface-bright': c(T.surface),
        'surface-container-lowest': c(T.surface),
        'surface-container-low': c(T.body),
        'surface-container': c(T.muted),
        'surface-container-high': c(T.accentMuted),
        'surface-container-highest': c(accentBorder),
        'surface-hover': c(T.hover),
        'surface-active': c(T.accentMuted),

        // Bordures
        stroke: c(T.border),
        'stroke-strong': c(T.borderStrong),
        outline: c(T.borderStrong),
        'outline-variant': c(T.border),

        // Texte
        'on-surface': c(T.text),
        'on-surface-variant': c(T.text2),
        'text-primary': c(T.text),
        'text-secondary': c(T.text2),
        'text-muted': c(textMuted),
        'text-disabled': c(T.textOff),

        // Secondaire
        secondary: c(T.text2),
        'secondary-container': c(T.muted),
        'on-secondary-container': c(T.text2),

        // Sémantique
        success: c(T.success),
        'success-bg': c(T.successMuted),
        'success-dark': c(dark(T.success)),
        'success-border': c(soft(T.success)),
        warning: c(T.warning),
        'warning-bg': c(T.warningMuted),
        'warning-dark': c(mix(T.warning, 60, 'black')),
        'warning-border': c(soft(T.warning)),
        danger: c(T.error),
        'danger-bg': c(T.errorMuted),
        'danger-dark': c(dark(T.error)),
        'danger-border': c(soft(T.error)),
        'error-c': c(T.error),
        'error-bg': c(T.errorMuted),
        'on-error-container': c(dark(T.error)),
        info: c('var(--color-text-blue)'),
        'info-bg': c('var(--color-background-blue)'),
        'info-dark': c(mix('var(--color-text-blue)', 80, 'black')),
        'info-border': c('var(--color-border-blue)'),

        // Badges (mêmes tons que le reste : une seule définition)
        'badge-success-bg': c(T.successMuted),
        'badge-success-text': c(dark(T.success)),
        'badge-success-border': c(soft(T.success)),
        'badge-warning-bg': c(T.warningMuted),
        'badge-warning-text': c(mix(T.warning, 60, 'black')),
        'badge-warning-border': c(soft(T.warning)),
        'badge-danger-bg': c(T.errorMuted),
        'badge-danger-text': c(dark(T.error)),
        'badge-danger-border': c(soft(T.error)),
        'badge-info-bg': c('var(--color-background-blue)'),
        'badge-info-text': c('var(--color-text-blue)'),
        'badge-info-border': c('var(--color-border-blue)'),
        'badge-neutral-bg': c(T.muted),
        'badge-neutral-text': c(T.text2),
        'badge-neutral-border': c(T.border),

        // Catégories métier
        'cat-vehicule-bg': c('var(--color-background-green)'), 'cat-vehicule-text': c('var(--color-text-green)'),
        'cat-resa-bg': c('var(--color-background-yellow)'), 'cat-resa-text': c('var(--color-text-yellow)'),
        'cat-client-bg': c('var(--color-background-blue)'), 'cat-client-text': c('var(--color-text-blue)'),
        'cat-contrat-bg': c('var(--color-background-purple)'), 'cat-contrat-text': c('var(--color-text-purple)'),
        'cat-agence-bg': c('var(--color-background-gray)'), 'cat-agence-text': c('var(--color-text-gray)'),

        // Anciennes échelles Tailwind
        slate: neutral,
        gray: neutral,
        indigo: ramp(T.accent, T.accentMuted),
        blue: ramp(T.accent, T.accentMuted),
        emerald: ramp(T.success, T.successMuted),
        green: ramp(T.success, T.successMuted),
        amber: ramp(T.warning, T.warningMuted),
        orange: ramp(T.warning, T.warningMuted),
        rose: ramp(T.error, T.errorMuted),
        red: ramp(T.error, T.errorMuted),
      },
      backgroundColor: { white: c(T.surface) },
      fontFamily: {
        // Inter pour le latin ; Tajawal prend le relais pour l'arabe (Inter n'a pas ces glyphes).
        sans: ['Inter', 'Tajawal', 'system-ui', 'sans-serif'],
        manrope: ['Inter', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'headline-lg': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'headline-md': ['22px', { lineHeight: '30px', fontWeight: '600' }],
        'body-md': ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'label-md': ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '600' }],
      },
      borderRadius: {
        token: '8px',
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '12px',
        '3xl': '16px',
        full: '9999px',
      },
      boxShadow: {
        l1: 'var(--shadow-low)',
        l2: 'var(--shadow-med)',
        soft: 'var(--shadow-low)',
      },
    },
  },
  plugins: [],
}
