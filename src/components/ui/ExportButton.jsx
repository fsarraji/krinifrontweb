import Button from './Button';
import { exportToCSV } from '../../utils/exportUtils';

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
    label = 'Exporter',
    variant = 'secondary',
    size = 'md',
    icon = 'download',
    disabled = false,
    className = '',
}) => (
    <Button
        variant={variant}
        size={size}
        icon={icon}
        onClick={() => exportToCSV(data, filename, columns)}
        disabled={disabled}
        className={className}
    >
        {label}
    </Button>
);

export default ExportButton;