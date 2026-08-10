export const SEXE_OPTIONS = [
    { value: 'HOMME', label: 'Homme' },
    { value: 'FEMME', label: 'Femme' },
];

export const NATIONALITES = [
    'Marocaine',
    'Française',
    'Algérienne',
    'Tunisienne',
    'Sénégalaise',
    'Ivoirienne',
    'Malienne',
    'Égyptienne',
    'Libanaise',
    'Émiratie',
    'Saoudienne',
    'Espagnole',
    'Italienne',
    'Allemande',
    'Belge',
    'Britannique',
    'Américaine',
    'Canadienne',
    'Portugaise',
    'Néerlandaise',
    'Suisse',
    'Russe',
    'Turque',
    'Chinoise',
    'Indienne',
    'Japonaise',
    'Autre',
];

export const cinLabelFor = (nationalite) => {
    if (nationalite && nationalite.toLowerCase() !== 'marocaine') {
        return 'Passport';
    }
    return 'CIN / Passeport';
};
