import { SkeletonCards, SkeletonTable } from '../Skeleton';

/**
 * État de chargement standard d'une page : squelettes (jamais de texte seul ni de Spinner plein écran).
 * variant : 'table' (liste) | 'cards' (grille de cartes).
 */
const PageLoading = ({ variant = 'table', cols = 5 }) => (
    <div role="status" aria-busy="true">
        {variant === 'cards' ? <SkeletonCards /> : <SkeletonTable cols={cols} />}
    </div>
);

export default PageLoading;
