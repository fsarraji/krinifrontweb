const EmptyState = ({ icon = 'inbox', title, description, action, className = '' }) => (
    <div className={`py-12 px-4 flex flex-col items-center text-center gap-1.5 ${className}`}>
        <span className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-1" aria-hidden="true">
            <span className="material-symbols-outlined text-text-disabled" style={{ fontSize: 24 }}>{icon}</span>
        </span>
        <p className="text-sm font-semibold text-on-surface">{title}</p>
        {description && <p className="text-label-md text-text-muted max-w-sm">{description}</p>}
        {action && <div className="mt-3">{action}</div>}
    </div>
);

export default EmptyState;
