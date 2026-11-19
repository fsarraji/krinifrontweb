import { Banner } from '@astryxdesign/core';
import Button from './Button';
import { useI18n } from '../../i18n/context';

/**
 * Message d'erreur persistant (soumission, serveur, chargement) : un seul rendu pour toute l'application.
 * - <ErrorBanner message="…" /> pour une erreur de formulaire.
 * - <ErrorBanner message="…" onRetry={reload} /> pour l'échec de chargement d'une page (bouton « Réessayer »).
 */
const ErrorBanner = ({ title, message, onRetry, className = '' }) => {
    const { t } = useI18n();
    if (!message && !title) return null;
    return (
        <div className={className} role="alert">
            <Banner
                status="error"
                title={title || message}
                description={title ? message : undefined}
                endContent={onRetry ? <Button variant="outline" size="sm" icon="refresh" onClick={onRetry}>{t('common.retry')}</Button> : undefined}
            />
        </div>
    );
};

export default ErrorBanner;
