import { translate } from './translations';

// Langue courante pour le code HORS composants React (messageBox, ErrorBoundary, utilitaires).
// I18nProvider la met à jour ; dans un composant, préférer le hook useI18n().
let current = 'fr';

export const setRuntimeLang = (lang) => {
    current = lang;
};

export const tNow = (key, vars) => translate(current, key, vars);
