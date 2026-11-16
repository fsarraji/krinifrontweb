import { forwardRef } from 'react';

// Contrôles de formulaire alignés sur DESIGN.md : bordure 1px, rayon 8px, focus primaire.
const BASE =
    'w-full rounded-token border bg-white px-3 py-2.5 text-sm text-on-surface placeholder:text-text-disabled ' +
    'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ' +
    'disabled:bg-surface-container disabled:text-text-muted disabled:cursor-not-allowed';

const border = (invalid) => (invalid ? 'border-danger' : 'border-stroke hover:border-stroke-strong');

export const Input = forwardRef(function Input({ invalid = false, className = '', ...rest }, ref) {
    return <input ref={ref} className={`${BASE} ${border(invalid)} ${className}`} aria-invalid={invalid || undefined} {...rest} />;
});

export const Select = forwardRef(function Select({ invalid = false, className = '', children, ...rest }, ref) {
    return (
        <select ref={ref} className={`${BASE} ${border(invalid)} pr-8 ${className}`} aria-invalid={invalid || undefined} {...rest}>
            {children}
        </select>
    );
});

export const Textarea = forwardRef(function Textarea({ invalid = false, className = '', rows = 3, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={`${BASE} ${border(invalid)} resize-y ${className}`} aria-invalid={invalid || undefined} {...rest} />;
});

export default Input;
