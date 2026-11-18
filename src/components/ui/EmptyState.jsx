import { EmptyState as AstryxEmptyState } from '@astryxdesign/core';

// Adaptateur : API historique (icon par nom Material Symbols, action) -> EmptyState Astryx.
const EmptyState = ({ icon = 'inbox', title, description, action, className = '' }) => (
    <div className={className}>
        <AstryxEmptyState
            title={title}
            description={description}
            icon={<span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 32 }}>{icon}</span>}
            actions={action}
        />
    </div>
);

export default EmptyState;
