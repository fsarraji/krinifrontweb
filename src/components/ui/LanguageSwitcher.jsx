import React from 'react';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core';
import { useI18n } from '../../i18n/context';
import { LANG_META, SUPPORTED_LANGS } from '../../i18n/translations';

/** Sélecteur de langue (FR / العربية) : SegmentedControl Astryx. `compact` n'affiche que les initiales. */
const LanguageSwitcher = ({ compact = false, className = '' }) => {
    const { lang, setLang, t } = useI18n();

    return (
        <div className={className}>
            <SegmentedControl label={t('lang.switch')} value={lang} onChange={setLang} size="sm">
                {SUPPORTED_LANGS.map((code) => (
                    <SegmentedControlItem
                        key={code}
                        value={code}
                        label={compact ? LANG_META[code].short : LANG_META[code].label}
                    />
                ))}
            </SegmentedControl>
        </div>
    );
};

export default LanguageSwitcher;
