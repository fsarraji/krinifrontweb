// Thème Astryx de Kricar (porté depuis krini-web/src/theme/krini.theme.ts).
import { defineTheme } from '@astryxdesign/core/theme';

export const kriniTheme = defineTheme({
  name: 'krini',
  tokens: {
    // ── Typographie : Inter (latin) ; Tajawal prend le relais pour l'arabe ──
    '--font-family-body':    "Inter, Tajawal, system-ui, sans-serif",
    '--font-family-heading': "Inter, Tajawal, system-ui, sans-serif",

    // ── Brand accent ──
    '--color-accent':          ['#004783', '#7DB1E0'],
    '--color-on-accent':       '#FFFFFF',
    '--color-text-accent':     ['#0F5FA8', '#A4C9FF'],
    '--color-icon-accent':     ['#0F5FA8', '#7DB1E0'],
    '--color-accent-muted':    ['#EBF3FB', '#012A4A33'],

    // ── Surfaces ──
    '--color-background-body':      ['#F7F8FA', '#111112'],
    '--color-background-surface':   ['#FFFFFF', '#1F1F22'],
    '--color-background-card':      ['#FFFFFF', '#1F1F22'],
    '--color-background-muted':     ['#F1F3F6', '#1111127F'],
    '--color-background-popover':   ['#FFFFFF', '#28292C'],
    '--color-background-inverted':  ['#121C28', '#FFFFFF'],
    '--color-background-error-inverted': ['#8B1A1A', '#E3193B'],

    // ── Text ──
    '--color-text-primary':     ['#121C28', '#DFE2E5'],
    '--color-text-secondary':   ['#414751', '#AAAFB5'],
    '--color-text-disabled':    ['#9AA3AD', '#6F747C'],

    // ── Icons ──
    '--color-icon-primary':     ['#121C28', '#DFE2E5'],
    '--color-icon-secondary':   ['#414751', '#AAAFB5'],
    '--color-icon-disabled':    ['#9AA3AD', '#6F747C'],

    // ── Borders ──
    '--color-border':               ['#E2E6EC', '#F2F4F619'],
    '--color-border-emphasized':    ['#C7CFDA', '#494D53'],

    // ── Status: success (véhicule disponible, contrat terminé, abonnement actif) ──
    '--color-success':          '#2E9E5B',
    '--color-on-success':       '#FFFFFF',
    '--color-success-muted':    ['#EAF7F0', '#0B991F3F'],

    // ── Status: warning (maintenance, caution, échéance proche) ──
    '--color-warning':          ['#E0A800', '#F2C00B'],
    '--color-on-warning':       '#121C28',
    '--color-warning-muted':    ['#FEF8E7', '#E2A4003F'],

    // ── Status: error/danger (liste noire, annulation, erreur) ──
    '--color-error':            '#D64545',
    '--color-on-error':         '#FFFFFF',
    '--color-error-muted':      ['#FBEAEA', '#F5394F3F'],

    // ── Neutral (badge neutre, réservé) ──
    '--color-neutral':          ['#EBF3FB', '#F2F4F61F'],

    // ── Feedback layers ──
    '--color-skeleton':         ['#C7CFDA', '#5A5E66'],
    '--color-track':            ['#C7CFDA', '#5A5E66'],
    '--color-shadow':           ['rgba(18,28,40,0.08)', 'rgba(0,0,0,0.3)'],
    '--color-overlay':          ['#11182659', '#11111299'],
    '--color-overlay-hover':    ['#0047830A', '#FFFFFF0C'],
    '--color-overlay-pressed':  ['#00478314', '#FFFFFF19'],
    '--color-tint-hover':       ['rgba(18,28,40,0.06)', 'white'],
    '--color-on-dark':          '#FFFFFF',
    '--color-on-light':         '#121C28',
  },
  radius: {
    base: 6,
    multiplier: 1,
  },
  motion: {
    fast: 120,
    medium: 250,
    ratio: 0.75,
  },
  components: {
    card: {
      base: { borderRadius: '12px' },
    },
    button: {
      base: { borderRadius: '8px', fontWeight: '600' },
    },
    badge: {
      base: { borderRadius: '6px', fontWeight: '600' },
    },
    table: {
      base: { borderRadius: '8px' },
    },
  },
});
