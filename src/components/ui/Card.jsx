import { Card as AstryxCard } from '@astryxdesign/core';

// Adaptateur de carte : surface Astryx (fond, bordure, rayon, ombre issus du thème).
// Props : padding (pas Astryx 0–10), variant ('default' | 'muted' | 'blue' | 'red' | 'green'…),
// className pour la mise en page uniquement (flex, gap, marges…), reste transmis à Astryx.
const Card = ({ padding = 4, variant = 'default', className, children, ...rest }) => (
    <AstryxCard padding={padding} variant={variant} className={className} {...rest}>
        {children}
    </AstryxCard>
);

export default Card;
