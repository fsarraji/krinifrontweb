import { createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';
import { useI18n } from '../../i18n/context';

/**
 * En-tête de page unique.
 * - as : niveau du titre ('h2' par défaut ; 'h1' pour les pages formulaire/détail).
 * - back : true (retour historique) ou chemin → bouton « Retour » au-dessus du titre.
 */
const PageHeader = ({ eyebrow, title, description, actions, as: level = 'h2', back, className = '' }) => {
    const navigate = useNavigate();
    const { t } = useI18n();
    return (
        <div className={`mb-6 ${className}`}>
            {back && (
                <div className="mb-2">
                    <Button variant="ghost" size="sm" icon="arrow_back" onClick={() => (back === true ? navigate(-1) : navigate(back))}>
                        {t('u.retour')}
                    </Button>
                </div>
            )}
            <div className="flex justify-between items-end gap-4 flex-wrap">
                <div className="min-w-0">
                    {eyebrow && (
                        <span className="text-label-sm uppercase tracking-wider text-text-muted mb-1 block">
                            {eyebrow}
                        </span>
                    )}
                    {createElement(level, { className: 'text-2xl sm:text-[28px] font-bold text-on-surface tracking-tight' }, title)}
                    {description && <p className="text-sm text-on-surface-variant mt-1.5 max-w-3xl">{description}</p>}
                </div>
                {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
            </div>
        </div>
    );
};

export default PageHeader;
