import { Children, cloneElement, isValidElement, useId } from 'react';

// Étiquette + contrôle + aide/erreur. Relie automatiquement label, aide et erreur au contrôle
// (id, aria-invalid, aria-describedby, aria-required) quand `children` est un unique élément.
const Field = ({ label, required = false, hint, error, className = '', children }) => {
    const autoId = useId();
    const only = Children.count(children) === 1 && isValidElement(children) ? children : null;
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
