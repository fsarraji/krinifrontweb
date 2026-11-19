import { FileInput } from '@astryxdesign/core';

// Adaptateur de champ fichier (Astryx FileInput en zone de dépôt).
// value : File | null ; onChange(file | null) reçoit toujours un fichier unique (ou null).
// Le calcul du texte (placeholder/description) reste à l'appelant.
const FileField = ({ label, isLabelHidden = false, value, onChange, accept, description, placeholder, disabled = false, loading = false, ...rest }) => (
    <FileInput
        label={label}
        isLabelHidden={isLabelHidden}
        value={value || null}
        onChange={(next) => onChange?.(Array.isArray(next) ? next[0] || null : next)}
        accept={accept}
        description={description}
        placeholder={placeholder}
        isDisabled={disabled}
        isLoading={loading}
        mode="dropzone"
        {...rest}
    />
);

export default FileField;
