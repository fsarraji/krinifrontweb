import React from 'react';

// Système de badges Krincar Agency (code.html / DESIGN.md).
// Tonalité = couleur sémantique ; appearance = forme.
// Ajoute simplement une entrée par nouveau statut ou tonalité.

const TONES = {
  success: {
    text: 'text-badge-success-text',
    bg: 'bg-badge-success-bg',
    border: 'border-badge-success-border',
    dot: 'bg-badge-success-text',
    icon: 'check_circle',
    fill: true,
  },
  info: {
    text: 'text-badge-info-text',
    bg: 'bg-badge-info-bg',
    border: 'border-badge-info-border',
    dot: 'bg-badge-info-text',
    icon: 'info',
    fill: false,
  },
  warning: {
    text: 'text-badge-warning-text',
    bg: 'bg-badge-warning-bg',
    border: 'border-badge-warning-border',
    dot: 'bg-badge-warning-text',
    icon: 'schedule',
    fill: false,
  },
  danger: {
    text: 'text-badge-danger-text',
    bg: 'bg-badge-danger-bg',
    border: 'border-badge-danger-border',
    dot: 'bg-badge-danger-text',
    icon: 'cancel',
    fill: true,
  },
  neutral: {
    text: 'text-badge-neutral-text',
    bg: 'bg-badge-neutral-bg',
    border: 'border-badge-neutral-border',
    dot: 'bg-badge-neutral-text',
    icon: 'pause_circle',
    fill: false,
  },
};

// Catégories métier pour les variantes soft / outline-icône.
const CATEGORIES = {
  vehicule: { bg: 'bg-cat-vehicule-bg', text: 'text-cat-vehicule-text', border: 'border-cat-vehicule-text', icon: 'directions_car' },
  resa: { bg: 'bg-cat-resa-bg', text: 'text-cat-resa-text', border: 'border-cat-resa-text', icon: 'calendar_today' },
  client: { bg: 'bg-cat-client-bg', text: 'text-cat-client-text', border: 'border-cat-client-text', icon: 'person' },
  contrat: { bg: 'bg-cat-contrat-bg', text: 'text-cat-contrat-text', border: 'border-cat-contrat-text', icon: 'description' },
  agence: { bg: 'bg-cat-agence-bg', text: 'text-cat-agence-text', border: 'border-cat-agence-text', icon: 'storefront' },
};

// Un seul endroit pour mapper les valeurs backend -> libellé FR + tonalité.
// Étends cet objet plutôt que d'en recréer un dans chaque vue.
export const STATUS_MAP = {
  // Véhicules
  Available: { label: 'Disponible', variant: 'success' },
  Rented: { label: 'Louée', variant: 'info' },
  Maintenance: { label: 'Maintenance', variant: 'warning' },
  // Contrats / réservations
  RESERVE: { label: 'Réservé', variant: 'info' },
  EN_COURS: { label: 'En cours', variant: 'success' },
  TERMINE: { label: 'Terminé', variant: 'neutral' },
  ANNULE: { label: 'Annulé', variant: 'danger' },
  PENDING: { label: 'En attente', variant: 'warning' },
};

const BASE = 'inline-flex items-center w-fit rounded-lg px-3 py-1.5 text-label-md gap-2';

export default function StatusBadge({
  status,
  label,
  variant,
  appearance = 'solid',
  category,
  icon,
  count,
  className = '',
}) {
  // Lookup insensible à la casse : 'AVAILABLE'/'available' -> STATUS_MAP['Available'].
  const key = String(status ?? '').trim();
  const resolved = key && (STATUS_MAP[key] || Object.entries(STATUS_MAP).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1]);
  const tone = variant || resolved?.variant || 'neutral';
  const finalLabel = label || resolved?.label || key || (count ? String(count) : '—');
  const t = TONES[tone] || TONES.neutral;
  const cat = category && CATEGORIES[category];
  const iconName = icon || (cat ? cat.icon : t.icon);
  const iconFilled = t.fill;
  const iconEl = iconName && (
    <span className={`material-symbols-outlined text-[20px] ${iconFilled ? 'fill' : ''}`}>{iconName}</span>
  );

  // 3. Dot badge : conteneur neutre + point coloré (compact).
  if (appearance === 'dot') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-label-md bg-transparent border border-outline-variant text-on-surface ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.dot}`} />
        {finalLabel}
      </span>
    );
  }

  // 6. Badge numérique : carré 40x40 (contours primary / soft / neutre).
  if (appearance === 'number') {
    const styles = {
      primary: 'bg-primary text-white border border-transparent',
      outline: 'bg-transparent border border-primary text-primary',
      soft: 'bg-primary-container/20 text-primary border border-transparent',
      neutral: 'bg-surface-container text-on-surface border border-outline-variant',
    };
    const num = count ?? finalLabel;
    return (
      <span className={`w-10 h-10 flex items-center justify-center rounded-lg text-label-md font-bold ${styles[icon] || styles.primary} ${className}`}>
        {num}
      </span>
    );
  }

  // 7. Icône seule : cercle avec fond teinté.
  if (appearance === 'icon') {
    return (
      <span className={`w-10 h-10 rounded-full flex items-center justify-center ${t.bg} ${t.text} border ${t.border} ${className}`}>
        {iconEl}
      </span>
    );
  }

  // 4/5. Soft & outline-icône : basés sur la catégorie métier.
  if (cat && (appearance === 'soft' || appearance === 'outline-icon')) {
    const cls = appearance === 'outline-icon'
      ? `bg-transparent border ${cat.border} ${cat.text}`
      : `border-none ${cat.bg} ${cat.text}`;
    return (
      <span className={`${BASE} ${cls} ${className}`}>
        <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
        {finalLabel}
      </span>
    );
  }

  // 1. Solid (défaut) : fond teinté + bordure + icône.
  if (appearance === 'solid') {
    return (
      <span className={`${BASE} ${t.bg} ${t.text} border ${t.border} ${className}`}>
        {iconEl}
        {finalLabel}
      </span>
    );
  }

  // 2. Outline : fond transparent + bordure/texte tonaux.
  if (appearance === 'outline') {
    const border = `border-${t.text.slice(5)}`;
    return (
      <span className={`${BASE} bg-transparent border ${border} ${t.text} ${className}`}>
        {iconEl}
        {finalLabel}
      </span>
    );
  }

  // 8. Pastille : arrondie, fond teinté léger.
  return (
    <span className={`inline-flex items-center w-fit rounded-full px-4 py-1.5 text-label-sm ${t.bg} ${t.text} border ${t.border}/50 ${className}`}>
      {finalLabel}
    </span>
  );
}