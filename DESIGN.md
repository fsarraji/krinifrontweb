---
name: Administrative Precision
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#3755c3'
  on-secondary: '#ffffff'
  secondary-container: '#708cfd'
  on-secondary-container: '#00217a'
  tertiary: '#7f2500'
  on-tertiary: '#ffffff'
  tertiary-container: '#a73400'
  on-tertiary-container: '#ffc9b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c4ff'
  on-secondary-fixed: '#001453'
  on-secondary-fixed-variant: '#173bab'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832700'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style

This design system is engineered for administrative excellence, prioritizing clarity, efficiency, and professional trust. It is designed for SaaS platforms, dashboards, and agency management tools where data density must coexist with ease of use.

The aesthetic follows a **Corporate Modern** style, characterized by a refined balance of generous whitespace, a structured grid, and a high-contrast functional palette. It avoids unnecessary decoration, opting instead for subtle depth through tonal layering and crisp borders to define information hierarchy. The emotional response is one of reliability, order, and systemic intelligence.

## Colors

The palette is anchored by a deep professional blue, used strategically to draw attention to primary actions and brand presence. 

- **Primary & Secondary:** Used for active states, primary buttons, and key data points.
- **Surface & Background:** A clean `#FFFFFF` surface sits atop a subtle `#F8FAFC` background to create soft contrast without the need for heavy shadows.
- **Semantic Colors:** Statuses (Success, Warning, Danger, Info) use high-visibility hues that are also paired with tinted background washes for alert components.
- **Neutrals:** Text uses `#0F172A` for maximum legibility, while `#64748B` is reserved for secondary metadata and disabled states.

## Typography

The design system utilizes **Manrope** across all levels to maintain a cohesive, modern, and highly legible interface. 

- **Hierarchy:** Use Bold (700) for primary headers and Semi-Bold (600) for section titles. Regular (400) is the standard for all body copy to ensure breathability in data-heavy views.
- **Labels:** Small labels and table headers should use Medium (500) weight with slight letter spacing to improve scannability at small sizes.
- **Responsive Scaling:** On mobile, large headlines scale down to 20px to prevent awkward line breaks while maintaining visual impact.

## Layout & Spacing

The system employs a **Fluid Grid** model with a standard 12-column structure for desktop and a single-column layout for mobile.

- **Rhythm:** An 8px base unit governs all spatial relationships. 
- **Margins & Gutters:** Dashboards use 24px outer margins and 16px gutters between cards.
- **Table Layouts:** Horizontal padding in tables should be 16px, while vertical padding remains 12px for a "compact but clear" feel. 
- **Breakpoints:** Mobile (<768px), Tablet (768px - 1024px), Desktop (>1024px).

## Elevation & Depth

This design system uses **Tonal Layers** and **Low-contrast Outlines** rather than aggressive shadows.

- **Level 0 (Background):** `#F8FAFC` - The canvas.
- **Level 1 (Cards/Surfaces):** `#FFFFFF` with a 1px solid border of `#E2E8F0`. No shadow.
- **Level 2 (Modals/Popovers):** `#FFFFFF` with a 1px border and a soft, diffused shadow (`0 10px 15px -3px rgba(0, 0, 0, 0.05)`).
- **Interactive States:** Hovering over a clickable card or list item should trigger a subtle shift in background color to `#F1F5F9` or a primary-tinted border.

## Shapes

The geometry is defined by a consistent 8px (0.5rem) radius.

- **Standard Elements:** Input fields, buttons, and cards all utilize the base 8px radius.
- **Inner Elements:** Small tags or chips inside cards may use a 4px (0.25rem) radius to maintain visual nesting logic.
- **Circular Elements:** Icons and pagination "active" states may use full pill-rounding (999px) where appropriate for specific emphasis.

## Components

### Buttons & Inputs
- **Primary Button:** Solid `#1D4ED8` background with white text. 8px radius.
- **Ghost/Secondary:** White background with `#E2E8F0` border and `#0F172A` text.
- **Inputs:** 1px `#E2E8F0` border, `#F8FAFC` fill or white fill, 8px radius. Active state uses a 1px `#1D4ED8` stroke.

### Table Footer & Pagination
- **Footer:** A single-line container with a top border. Includes "Items per page" dropdown and record counts.
- **Pagination:** Square buttons (32x32px) with 8px radius. Active state is solid primary blue; inactive is ghost-style. Compact versions use only arrows and current page.

### Message Boxes (Alerts)
- **Structure:** 1px border, light-tinted background, and a left-aligned status icon.
- **Success:** `#10BB81` text/icon on light green background.
- **Danger:** `#EF4444` text/icon on light red background.

### Modals
- **Standard:** Centered layout, max-width 500px, 1px border, 8px radius. 
- **Confirmation:** Features a clear warning icon, descriptive text, and "Cancel" (Ghost) vs "Confirm" (Primary) button pair.

### Charts
- **Commonality:** Use `#E2E8F0` for grid lines and `#64748B` for axis labels.
- **Line/Area:** 2px stroke width with circular data points. Area charts use a 10% opacity fill.
- **Bar:** Solid `#1D4ED8` bars with 4px top radius.
- **Donut:** Multi-colored segments utilizing the semantic palette + secondary blues. Center text displays the total aggregate value.