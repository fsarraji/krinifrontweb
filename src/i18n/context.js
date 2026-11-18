import { createContext, useContext } from 'react';
import { translate } from './translations';

// Valeur par défaut (hors provider, ex. tests isolés) : français, sans changement de langue.
export const I18nContext = createContext({
    lang: 'fr',
    dir: 'ltr',
    setLang: () => {},
    t: (key, vars) => translate('fr', key, vars),
});

export const useI18n = () => useContext(I18nContext);
