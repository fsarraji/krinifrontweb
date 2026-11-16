import Spinner from './Spinner';

const VARIANTS = {
    primary: 'bg-primary text-white hover:bg-primary-deep active:bg-primary-deep',
    secondary: 'bg-secondary-container text-on-secondary-container hover:bg-surface-dim',
    danger: 'bg-danger text-white hover:bg-danger-dark active:bg-danger-dark',
    success: 'bg-success text-white hover:bg-success-dark active:bg-success-dark',
    ghost: 'bg-transparent text-secondary hover:bg-surface-hover',
};

const SIZES = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-[15px] gap-2',
};

const Button = ({
    variant = 'primary',
    size = 'md',
    icon,
    iconOnly = false,
    loading = false,
    disabled = false,
    type = 'button',
    className = '',
    onClick,
    children,
    ...rest
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center rounded-token font-semibold transition-all
            disabled:opacity-60 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
            ${VARIANTS[variant]} ${SIZES[size]} ${iconOnly ? '!p-2' : ''} ${className}`}
        {...rest}
    >
        {loading
            ? <Spinner size={18} />
            : icon && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>}
        {children}
    </button>
);

export default Button;