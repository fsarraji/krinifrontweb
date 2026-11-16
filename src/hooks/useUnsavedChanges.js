import { useCallback, useEffect, useRef } from 'react';

// Avertit l'utilisateur avant de fermer/recharger l'onglet s'il a modifié un formulaire.
//
//   const { formProps, markClean } = useUnsavedChanges();
//   <form {...formProps} onSubmit={...}>
//   // après un enregistrement réussi, avant navigate(...) : markClean();
//
// Le formulaire est considéré « modifié » dès qu'un champ émet un événement input/change
// (pas de comparaison d'état : fonctionne aussi pour les formulaires chargés de façon asynchrone).
export default function useUnsavedChanges() {
    const dirty = useRef(false);

    useEffect(() => {
        const handler = (e) => {
            if (!dirty.current) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, []);

    const markDirty = useCallback(() => {
        dirty.current = true;
    }, []);
    const markClean = useCallback(() => {
        dirty.current = false;
    }, []);

    return { formProps: { onInput: markDirty, onChange: markDirty }, markDirty, markClean };
}
