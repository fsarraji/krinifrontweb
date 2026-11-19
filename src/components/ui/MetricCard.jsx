import React from 'react';
import { Card, Text } from '@astryxdesign/core';

/**
 * Carte de métrique (Card + Text Astryx) : libellé + icône, valeur en chiffres tabulaires, tendance.
 * tone : 'default' | 'primary' (carte bleue) | 'danger' (carte rouge). iconBg / iconColor : compatibilité.
 */
const VARIANTS = { default: 'default', primary: 'blue', danger: 'red' };

export default function MetricCard({ icon, iconBg = 'bg-info-bg', iconColor = 'text-info', value, unit, label, trend, tone = 'default', children, className = '' }) {
  const trendColor = (positive) => (positive ? 'text-success-dark' : 'text-danger-dark');

  return (
    <div className={className}>
      <Card variant={VARIANTS[tone] || 'default'} padding={5}>
        <div className="flex items-start justify-between gap-3">
          <Text type="label" color="secondary">{label}</Text>
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tone === 'default' ? `${iconBg} ${iconColor}` : 'bg-surface-bright text-primary'}`}>
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{icon}</span>
          </span>
        </div>
        <p className="mt-2 text-[28px] leading-9 font-semibold tracking-tight tabular-nums">
          {value}
          {unit && <>{' '}<span className="text-sm font-medium opacity-70">{unit}</span></>}
        </p>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.positive !== undefined && (
              <span className={`material-symbols-outlined text-[16px] ${trendColor(trend.positive)}`} aria-hidden="true">
                {trend.positive ? 'trending_up' : 'trending_down'}
              </span>
            )}
            <span className={`text-label-md font-semibold ${trendColor(trend.positive)}`}>{trend.value}</span>
            {trend.caption && <span className="text-label-md opacity-70">{trend.caption}</span>}
          </div>
        )}
        {children && <div className="mt-3">{children}</div>}
      </Card>
    </div>
  );
}
