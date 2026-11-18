import React from 'react';

/**
 * Carte de métrique : libellé + icône discrète, valeur en chiffres tabulaires, tendance optionnelle.
 *
 * <MetricCard icon="payments" value="128 400" unit="DH" label="Revenu du mois"
 *   trend={{ value: '+8,2%', positive: true, caption: 'vs mois dernier' }} />
 *
 * tone : 'default' | 'primary' | 'danger'. iconBg / iconColor sont acceptés pour compatibilité.
 */
export default function MetricCard({ icon, iconBg = 'bg-info-bg', iconColor = 'text-info', value, unit, label, trend, tone = 'default', children, className = '' }) {
  const isDanger = tone === 'danger';
  const isPrimary = tone === 'primary';
  const muted = isPrimary ? 'text-white/75' : isDanger ? 'text-danger-dark/80' : 'text-text-muted';
  const trendColor = (positive) => (isPrimary ? 'text-white' : positive ? 'text-success-dark' : 'text-danger-dark');

  return (
    <div className={`rounded-xl p-5 border ${
      isDanger ? 'bg-danger-bg border-danger-border'
      : isPrimary ? 'bg-primary border-transparent'
      : 'bg-surface-bright border-stroke'
    } ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-label-md font-medium ${muted}`}>{label}</p>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isDanger ? 'bg-surface-bright text-danger' : isPrimary ? 'bg-white/15 text-white' : `${iconBg} ${iconColor}`
        }`}>
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{icon}</span>
        </span>
      </div>
      <p className={`mt-2 text-[28px] leading-9 font-semibold tracking-tight tabular-nums ${
        isDanger ? 'text-danger-dark' : isPrimary ? 'text-white' : 'text-on-surface'
      }`}>
        {value}
        {unit && <>{' '}<span className={`text-sm font-medium ${muted}`}>{unit}</span></>}
      </p>

      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend.positive !== undefined && (
            <span className={`material-symbols-outlined text-[16px] ${trendColor(trend.positive)}`} aria-hidden="true">
              {trend.positive ? 'trending_up' : 'trending_down'}
            </span>
          )}
          <span className={`text-label-md font-semibold ${trendColor(trend.positive)}`}>{trend.value}</span>
          {trend.caption && <span className={`text-label-md ${muted}`}>{trend.caption}</span>}
        </div>
      )}

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
