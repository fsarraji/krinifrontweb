import React from 'react';

/**
 * Carte de métrique standard : icône circulaire + valeur + label + tendance.
 * Remplace les KPI codés en dur dans Dashboard.jsx / Vehicles.jsx / etc.
 *
 * Exemple :
 * <MetricCard
 *   icon="payments"
 *   iconBg="bg-info-bg" iconColor="text-info"
 *   value="128 400" unit="DH"
 *   label="Revenu du mois"
 *   trend={{ value: '+8,2%', positive: true, caption: 'vs mois dernier' }}
 * />
 */
export default function MetricCard({ icon, iconBg = 'bg-info-bg', iconColor = 'text-info', value, unit, label, trend, tone = 'default', children, className = '' }) {
  const isDanger = tone === 'danger';
  const isPrimary = tone === 'primary';

  return (
    <div className={`rounded-lg p-card-padding border shadow-l1 ${
      isDanger ? 'bg-danger-bg border-danger-border'
      : isPrimary ? 'bg-primary-container border-transparent'
      : 'bg-card-white border-stroke'
    } ${className}`}>
      <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${
        isDanger ? 'bg-white' : isPrimary ? 'bg-white/20' : iconBg
      }`}>
        <span className={`material-symbols-outlined text-[20px] ${
          isDanger ? 'text-danger' : isPrimary ? 'text-white' : iconColor
        }`}>{icon}</span>
      </div>
      <p className={`text-headline-lg leading-8 ${
        isDanger ? 'text-danger-dark' : isPrimary ? 'text-white' : 'text-on-surface'
      }`}>
        {value}
        {unit && <span className={`text-body-sm font-medium ml-1 ${isPrimary ? 'text-white/70' : 'text-on-surface-variant/60'}`}>{unit}</span>}
      </p>
      <p className={`text-body-sm mt-1 ${isDanger ? 'text-danger/80' : isPrimary ? 'text-white/70' : 'text-on-surface-variant/60'}`}>{label}</p>

      {trend && (
        <div className="flex items-center gap-1 mt-3">
          {trend.positive !== undefined && (
            <span className={`material-symbols-outlined text-[14px] ${
              trend.positive ? (isPrimary ? 'text-white' : 'text-success') : (isPrimary ? 'text-white' : 'text-danger')
            }`}>
              {trend.positive ? 'trending_up' : 'trending_down'}
            </span>
          )}
          <span className={`text-body-sm font-semibold ${trend.positive ? (isPrimary ? 'text-white' : 'text-success') : (isPrimary ? 'text-white' : 'text-danger')}`}>{trend.value}</span>
          {trend.caption && <span className={`text-body-sm ${isPrimary ? 'text-white/70' : 'text-on-surface-variant/50'}`}>{trend.caption}</span>}
        </div>
      )}

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
