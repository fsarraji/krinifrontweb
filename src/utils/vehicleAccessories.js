/**
 * Liste des accessoires de véhicule (partagée entre departure/return inspection).
 * Utilisée dans ContractForm, ActivateReservationModal et CloseContractModal.
 */
export const VEHICLE_ACCESSORIES = [
    { id: 'roue_secours', label: 'Roue secours', icon: 'tire_repair' },
    { id: 'cric', label: 'Cric', icon: 'build' },
    { id: 'manivelle', label: 'Manivelle', icon: 'settings' },
    { id: 'gilet', label: 'Gilet', icon: 'accessibility_new' },
    { id: 'triangle', label: 'Triangle', icon: 'warning' },
    { id: 'extincteur', label: 'Extincteur', icon: 'fire_extinguisher' },
    { id: 'papiers', label: 'Papiers', icon: 'description' },
    { id: 'cles', label: 'Clés', icon: 'key' },
];

/**
 * Labels complets avec labels étendus pour CloseContractModal.
 */
export const ACCESSORY_LABELS = Object.fromEntries(
    VEHICLE_ACCESSORIES.map(a => [a.id, { label: a.label, icon: a.icon }])
);
