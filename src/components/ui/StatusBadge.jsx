import React from 'react';

// Mappe un statut métier (peu importe la vue : véhicule, contrat, réservation...)
// vers une variante visuelle du badge. Ajoute simplement une entrée par nouveau statut.
const VARIANTS = {
  success: { dot: 'bg-success', bg: 'bg-success-bg', text: 'text-[#166534]' },
  info: { dot: 'bg-info', bg: 'bg-info-bg', text: 'text-[#1e40af]' },
  warning: { dot: 'bg-warning', bg: 'bg-warning-bg', text: 'text-[#92400e]' },
  danger: { dot: 'bg-danger', bg: 'bg-danger-bg', text: 'text-[#991b1b]' },
  neutral: { dot: 'bg-secondary', bg: 'bg-surface-container', text: 'text-on-surface-variant' },
};

// Un seul endroit pour mapper les valeurs backend -> libellé FR + variante.
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

export default function StatusBadge({ status, label, variant }) {
  // Lookup insensible à la casse : 'AVAILABLE'/'available' -> STATUS_MAP['Available'].
  const key = String(status ?? '').trim();
  const resolved = key && (STATUS_MAP[key] || Object.entries(STATUS_MAP).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1]);
  const finalVariant = variant || resolved?.variant || 'neutral';
  const finalLabel = label || resolved?.label || key || '—';
  const v = VARIANTS[finalVariant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm font-semibold ${v.bg} ${v.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${v.dot}`} />
      {finalLabel}
    </span>
  );
}
