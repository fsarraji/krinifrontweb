/**
 * Mapping des statuts backend -> libellé FR + tonalité sémantique.
 * Source unique pour StatusBadge et les vues.
 * Étends cet objet plutôt que d'en recréer un dans chaque fichier.
 */
export const STATUS_MAP = {
    // Véhicules
    Available: { label: 'Disponible', variant: 'success' },
    Rented: { label: 'Louée', variant: 'info' },
    Maintenance: { label: 'Maintenance', variant: 'warning' },
    // Contrats / réservations
    RESERVE: { label: 'Réservé', variant: 'info' },
    EN_COURS: { label: 'En cours', variant: 'success' },
    TERMINE: { label: 'Terminé', variant: 'neutral' },
    ANNULE: { label: 'Annulé', variant: 'danger' },
    PENDING: { label: 'En attente', variant: 'warning' },
};

export default STATUS_MAP;