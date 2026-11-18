const PageHeader = ({ eyebrow, title, description, actions, className = '' }) => (
    <div className={`flex justify-between items-end mb-6 gap-4 flex-wrap ${className}`}>
        <div className="min-w-0">
            {eyebrow && (
                <span className="text-label-sm uppercase tracking-wider text-text-muted mb-1 block">
                    {eyebrow}
                </span>
            )}
            <h2 className="text-2xl sm:text-[28px] font-bold text-on-surface tracking-tight">{title}</h2>
            {description && <p className="text-sm text-on-surface-variant mt-1.5 max-w-3xl">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
);

export default PageHeader;