import Button from './Button';
import { exportToCSV } from '../../utils/exportUtils';
import { useI18n } from '../../i18n/context';

/**
 * Bouton d'export CSV standard.
 *
 * Props:
 * - data: array d'objets à exporter
 * - filename: nom du fichier (sans extension)
 * - columns: mapping optionnel [{ key, label }]
 * - label: texte du bouton (défaut 'Exporter')
 */
const ExportButton = ({
    data,
    filename = 'export',
    columns = null,
    label,
    variant = 'secondary',
    size = 'md',
    icon = 'download',
    disabled = false,
    className = '',
}) => {
    const { t } = useI18n();
    return (
    <Button
        variant={variant}
        size={size}
        icon={icon}
        onClick={() => exportToCSV(data, filename, columns)}
        disabled={disabled}
        className={className}
    >
        {label ?? t('common.export')}
    </Button>
    );
};

export default ExportButton;