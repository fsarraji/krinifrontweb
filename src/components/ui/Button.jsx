import { Button as AstryxButton } from '@astryxdesign/core';

// Adaptateur : garde l'API historique (variant/size/icon/iconOnly/loading/disabled/children) et
// s'appuie sur le Button du design system Astryx.
const VARIANTS = {
    primary: 'primary',
    success: 'primary', // pas de variante « succès » dans Astryx : action principale
    secondary: 'secondary',
    outline: 'secondary',
    ghost: 'ghost',
    danger: 'destructive',
};

const SIZES = { sm: 'sm', md: 'md', lg: 'lg' };

const textOf = (node) => {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(textOf).join('').trim();
    return '';
};

const Button = ({
    variant = 'primary',
    size = 'md',
    icon,
    iconOnly = false,
    loading = false,
    disabled = false,
    type = 'button',
    className = '',
    onClick,
    children,
    title,
    ...rest
}) => {
    // Astryx exige un libellé (nom accessible) ; pour un bouton icône seul, on reprend aria-label/title.
    const label = textOf(children) || rest['aria-label'] || title || '';
    const hasLabel = Boolean(textOf(children)) && !iconOnly;
    const complexChildren = !textOf(children) && children ? children : null;

    return (
        <AstryxButton
            type={type}
            label={label}
            variant={VARIANTS[variant] || 'secondary'}
            size={SIZES[size] || 'md'}
            isLoading={loading}
            isDisabled={disabled}
            isIconOnly={iconOnly || (!hasLabel && !complexChildren && Boolean(icon))}
            icon={icon ? <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>{icon}</span> : undefined}
            tooltip={iconOnly ? title : undefined}
            className={className}
            onClick={onClick}
            {...rest}
        >
            {complexChildren}
        </AstryxButton>
    );
};

export default Button;
