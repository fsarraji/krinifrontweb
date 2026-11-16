const PageHeader = ({ eyebrow, title, description, actions, className = '' }) => (
    <div className={`flex justify-between items-end mb-8 gap-4 flex-wrap ${className}`}>
        <div className="min-w-0">
            {eyebrow && (
                <span className="text-xs font-bold uppercase tracking-widest text-primary mb-1 block">
                    {eyebrow}
                </span>
            )}
            <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">{title}</h2>
            {description && <p className="text-sm text-on-surface-variant mt-2">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
);

export default PageHeader;