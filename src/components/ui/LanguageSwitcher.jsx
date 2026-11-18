import React from 'react';
import { useI18n } from '../../i18n/context';
import { LANG_META, SUPPORTED_LANGS } from '../../i18n/translations';

/** Sélecteur de langue (FR / العربية). `compact` n'affiche que les initiales. */
const LanguageSwitcher = ({ compact = false, className = '' }) => {
    const { lang, setLang, t } = useI18n();

    return (
        <div role="group" aria-label={t('lang.switch')} className={`inline-flex rounded-token border border-stroke bg-white p-0.5 ${className}`}>
            {SUPPORTED_LANGS.map((code) => {
                const active = lang === code;
                return (
                    <button
                        key={code}
                        type="button"
                        lang={code}
                        aria-pressed={active}
                        onClick={() => setLang(code)}
                        className={`px-2.5 py-1 rounded-[6px] text-label-md font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                            active ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-hover'
                        }`}
                    >
                        {compact ? LANG_META[code].short : LANG_META[code].label}
                    </button>
                );
            })}
        </div>
    );
};

export default LanguageSwitcher;
