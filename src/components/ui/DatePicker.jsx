import { DateInput, DateTimeInput } from '@astryxdesign/core';

// Sélecteur de date (et heure) : DateTimeInput / DateInput Astryx, avec l'API historique.
//   value 'YYYY-MM-DDTHH:mm' (ou 'YYYY-MM-DD' si withTime = false), onChange(valeur),
//   min 'YYYY-MM-DD', disabledRanges [{ start, end }] : périodes indisponibles (jours grisés).
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export default function DatePicker({
  value,
  onChange,
  disabledRanges = [],
  min = null,
  withTime = true,
  className = '',
  disabled = false,
  placeholder,
  label,
  description,
  status,
  isRequired,
  id,
}) {
  const constraints = [
    (date) => {
      const t = startOfDay(date);
      return !disabledRanges.some((r) => t >= startOfDay(new Date(r.start)) && t <= startOfDay(new Date(r.end)));
    },
  ];
  const common = {
    label: label || placeholder || ' ',
    isLabelHidden: !label,
    description,
    status,
    isRequired,
    isDisabled: disabled,
    placeholder,
    className,
    dateConstraints: constraints,
    hasClear: true,
  };

  if (!withTime) {
    return (
      <DateInput
        {...common}
        id={id}
        value={value ? String(value).slice(0, 10) : undefined}
        min={min || undefined}
        onChange={(v) => onChange?.(v || '')}
      />
    );
  }
  return (
    <DateTimeInput
      {...common}
      id={id}
      value={value || undefined}
      min={min ? `${min}T00:00` : undefined}
      onChange={(v) => onChange?.((v || '').slice(0, 16))}
    />
  );
}
DatePicker.isAstryxControl = true;
