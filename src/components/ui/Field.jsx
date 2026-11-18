import { Children, cloneElement, isValidElement, useId } from 'react';

// Étiquette + contrôle + aide/erreur.
// • Enfant = contrôle Astryx adapté (Input, Select, Textarea, Dropdown, DatePicker…) : on lui passe
//   label / description / status / isRequired, et Astryx rend libellé, aide et erreur.
// • Autre enfant (champ natif, groupe de cases…) : repli sur l'ancien balisage, avec liaison ARIA.
const Field = ({ label, required = false, hint, error, className = '', children }) => {
    const autoId = useId();
    const only = Children.count(children) === 1 && isValidElement(children) ? children : null;

    if (only && only.type?.isAstryxControl) {
        return (
            <div className={className}>
                {cloneElement(only, {
                    label,
                    description: hint,
                    status: error ? { type: 'error', message: error } : only.props.status,
                    isRequired: required || undefined,
                })}
            </div>
        );
    }

    const controlId = only?.props?.id || `field-${autoId}`;
    const describedBy = [hint && `${controlId}-hint`, error && `${controlId}-error`].filter(Boolean).join(' ') || undefined;
    const control = only
        ? cloneElement(only, {
            id: controlId,
            'aria-invalid': error ? true : only.props['aria-invalid'],
            'aria-describedby': describedBy,
            'aria-required': required || undefined,
        })
        : children;

    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="label" htmlFor={only ? controlId : undefined}>
                {label}
                {required && <span className="text-danger ms-0.5" aria-hidden="true">*</span>}
            </label>
            {control}
            {hint && <p id={`${controlId}-hint`} className="text-label-sm font-normal text-on-surface-variant">{hint}</p>}
            {error && (
                <p id={`${controlId}-error`} role="alert" className="text-label-sm flex items-center gap-1 text-danger-dark">
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">error</span>
                    {error}
                </p>
            )}
        </div>
    );
};

export default Field;
