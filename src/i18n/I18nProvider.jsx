import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nContext } from './context';
import { setFormatLocale } from '../utils/formatters';
import { setRuntimeLang } from './runtime';
import { LANG_META, SUPPORTED_LANGS, translate } from './translations';

const STORAGE_KEY = 'lang';

const readStoredLang = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return SUPPORTED_LANGS.includes(stored) ? stored : 'fr';
    } catch {
        return 'fr';
    }
};

/**
 * Fournit la langue courante, t() et la direction du texte (ltr/rtl).
 * Met à jour <html lang dir> : les variantes Tailwind rtl: et les polices arabes s'y appuient.
 */
const I18nProvider = ({ children }) => {
    const [lang, setLangState] = useState(readStoredLang);
    const dir = LANG_META[lang].dir;
    // Avant le rendu des enfants : dates et nombres suivent la langue.
    setFormatLocale(lang);
    setRuntimeLang(lang);

    useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = dir;
    }, [lang, dir]);

    const setLang = useCallback((next) => {
        if (!SUPPORTED_LANGS.includes(next)) return;
        setLangState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* stockage indisponible : la langue ne sera pas mémorisée */
        }
    }, []);

    const value = useMemo(
        () => ({ lang, dir, setLang, t: (key, vars) => translate(lang, key, vars) }),
        [lang, dir, setLang],
    );

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export default I18nProvider;
