import { useEffect, useRef, useState } from 'react';
import { formatDate } from '../../utils/formatters';
import { useI18n } from '../../i18n/context';


const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const mondayIndex = (d) => (d.getDay() + 6) % 7;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function isDisabledDay(date, min, ranges) {
  const key = toKey(date);
  if (min && key < min) return true;
  const t = startOfDay(date).getTime();
  return (ranges || []).some((r) => {
    const s = startOfDay(new Date(r.start)).getTime();
    const e = startOfDay(new Date(r.end)).getTime();
    return t >= s && t <= e;
  });
}

function formatDisplay(value) {
  const [datePart, timePart] = String(value).split('T');
  if (!datePart) return value || '';
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return value || '';
  const date = new Date(y, m - 1, d);
  const dateStr = formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' });
  return timePart ? `${dateStr} · ${timePart.slice(0, 5)}` : dateStr;
}

export default function DatePicker({
  value,
  onChange,
  disabledRanges = [],
  min = null,
  withTime = true,
  className = '',
  disabled = false,
  placeholder,
  id = undefined,
}) {
  const { t, dir } = useI18n();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = value ? new Date(value) : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const rootRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const time = value && value.includes('T') ? value.slice(11, 16) : '';

  const selectDay = (date) => {
    const key = toKey(date);
    onChange(withTime ? `${key}T${time || '09:00'}` : key);
    setOpen(false);
  };

  const changeTime = (t) => {
    const key = value ? value.slice(0, 10) : toKey(new Date());
    onChange(`${key}T${t}`);
  };

  const prevMonth = () => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const nextMonth = () => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));

  const first = new Date(view.year, view.month, 1);
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < mondayIndex(first); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.year, view.month, d));

  // Lundi = 2024-01-01 : libellés des jours et du mois dans la langue courante
  const weekdays = Array.from({ length: 7 }, (_, i) => formatDate(new Date(2024, 0, 1 + i), { weekday: 'short' }).replace('.', ''));
  const monthLabel = formatDate(new Date(view.year, view.month, 1), { month: 'long' });
  const selectedKey = value ? value.slice(0, 10) : '';
  const todayKey = toKey(new Date());

  return (
    <div ref={rootRef} className="relative">
      <div className="flex gap-2">
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={`${className} text-start disabled:cursor-not-allowed`}
        >
          {value ? formatDisplay(value) : <span className="opacity-60">{placeholder ?? t('u.slectionner_une_date')}</span>}
        </button>
        {withTime && (
          <input
            type="time"
            disabled={disabled}
            value={time}
            onChange={(e) => changeTime(e.target.value)}
            className={className}
          />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 p-3 w-72">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" aria-label={t('u.mois_prcdent')}>{dir === 'rtl' ? '›' : '‹'}</button>
            <div className="font-bold text-sm text-slate-800">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} {view.year}</div>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" aria-label={t('u.mois_suivant')}>{dir === 'rtl' ? '‹' : '›'}</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map((w) => (
              <div key={w} className="text-[10px] font-bold text-slate-400 uppercase py-1">{w}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const key = toKey(d);
              const unavailable = isDisabledDay(d, min, disabledRanges);
              const selected = key === selectedKey;
              const today = key === todayKey;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={unavailable}
                  onClick={() => selectDay(d)}
                  title={unavailable ? t('u.date_indisponible') : undefined}
                  className={`text-[13px] h-8 rounded-lg transition-colors ${
                    selected
                      ? 'bg-primary text-white font-bold'
                      : unavailable
                        ? 'text-red-300 line-through cursor-not-allowed'
                        : 'text-slate-700 hover:bg-slate-100'
                  } ${today && !selected ? 'ring-1 ring-primary/50' : ''}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-slate-400 text-center">{t('u.les_dates_barres_en_rouge_sont_i')}</p>
        </div>
      )}
    </div>
  );
}
