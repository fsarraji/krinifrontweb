import Button from './Button';
import { useI18n } from '../../i18n/context';

/**
 * Pied de formulaire unique : [action destructive] … [Annuler] [Retour] [Enregistrer / Suivant].
 * - Annuler : toujours `outline`. Retour : `outline` avec chevron. Valider : primaire.
 * - Soumission : `type="submit"` (+ `form` pour un formulaire distant), sinon `onSubmit`.
 * - `loading` désactive et affiche le chargement ; le libellé ne change pas.
 */
const FormActions = ({
    onCancel,
    cancelLabel,
    onBack,
    backLabel,
    submitLabel,
    onSubmit,
    formId,
    loading = false,
    disabled = false,
    submitIcon,
    destructive = null,
    className = '',
}) => {
    const { t } = useI18n();
    return (
        <div className={`flex flex-wrap items-center gap-3 ${className}`}>
            {destructive && <div className="me-auto">{destructive}</div>}
            <div className={`flex flex-wrap items-center gap-3 ${destructive ? '' : 'ms-auto'}`}>
                {onCancel && (
                    <Button variant="outline" onClick={onCancel} disabled={loading}>
                        {cancelLabel || t('u.annuler')}
                    </Button>
                )}
                {onBack && (
                    <Button variant="outline" icon="chevron_left" onClick={onBack} disabled={loading}>
                        {backLabel || t('u.prcdent')}
                    </Button>
                )}
                {(onSubmit || formId || submitLabel) && (
                    <Button
                        type={onSubmit ? 'button' : 'submit'}
                        form={formId}
                        icon={submitIcon}
                        loading={loading}
                        disabled={disabled}
                        onClick={onSubmit}
                    >
                        {submitLabel || t('u.enregistrer')}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default FormActions;
