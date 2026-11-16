const EmptyState = ({ icon = 'inbox', title, description, action, className = '' }) => (
    <div className={`py-10 flex flex-col items-center text-center gap-1.5 ${className}`}>
        <span className="material-symbols-outlined text-on-surface-variant/30" style={{ fontSize: 40 }}>
            {icon}
        </span>
        <p className="text-sm font-semibold text-on-surface-variant mt-1">{title}</p>
        {description && <p className="text-xs text-on-surface-variant/70 max-w-sm">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
    </div>
);

export default EmptyState;