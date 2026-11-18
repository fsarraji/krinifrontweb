import { Badge, StatusDot } from '@astryxdesign/core';
import STATUS_MAP from './statusMap';
import { useI18n } from '../../i18n/context';

// Adaptateur : statut métier -> Badge Astryx (ou StatusDot pour appearance="dot").
// Tonalités métier -> variantes Astryx. La table des statuts reste dans statusMap.js.
const BADGE_VARIANT = { success: 'success', info: 'info', warning: 'warning', danger: 'error', neutral: 'neutral' };
const DOT_VARIANT = { success: 'success', info: 'accent', warning: 'warning', danger: 'error', neutral: 'neutral' };

export default function StatusBadge({ status, label, variant, appearance = 'solid', icon, count, className = '' }) {
  const { t: tr } = useI18n();

  // Recherche insensible à la casse : 'AVAILABLE'/'available' -> STATUS_MAP['Available'].
  const key = String(status ?? '').trim();
  const mapKey = key && (STATUS_MAP[key] ? key : Object.keys(STATUS_MAP).find((k) => k.toLowerCase() === key.toLowerCase()));
  const resolved = mapKey ? STATUS_MAP[mapKey] : undefined;
  const tone = variant || resolved?.variant || 'neutral';
  const finalLabel = label || (mapKey ? tr(`status.${mapKey}`) : '') || key || (count ? String(count) : '—');

  if (appearance === 'dot') {
    return <StatusDot variant={DOT_VARIANT[tone] || 'neutral'} label={String(finalLabel)} />;
  }

  return (
    <span className={`inline-flex ${className}`}>
      <Badge
        variant={BADGE_VARIANT[tone] || 'neutral'}
        label={finalLabel}
        icon={icon ? <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 14 }}>{icon}</span> : undefined}
      />
    </span>
  );
}
