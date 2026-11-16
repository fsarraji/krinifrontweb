const Field = ({ label, required = false, hint, error, className = '', children }) => (
    <div className={`space-y-1.5 ${className}`}>
        <label className="label">
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
        </label>
        {children}
        {hint && <p className="text-[11px] text-on-surface-variant">{hint}</p>}
        {error && (
            <p className="text-[11px] font-semibold flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                <span className="material-symbols-outlined text-[13px]">error</span>
                {error}
            </p>
        )}
    </div>
);

export default Field;