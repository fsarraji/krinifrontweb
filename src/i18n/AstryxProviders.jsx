import React from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import frFR from '@astryxdesign/core/locales/fr-FR.json';
import arSA from '@astryxdesign/core/locales/ar-SA.json';
import { kriniTheme } from '../theme/krini.theme';
import { useI18n } from './context';

const LOCALES = { fr: 'fr-FR', ar: 'ar-SA' };
const MESSAGES = { 'fr-FR': frFR, 'ar-SA': arSA };

/**
 * Thème Astryx + langue des composants Astryx, synchronisés avec la langue de l'application.
 * Le sens d'écriture (<html dir>) reste posé par I18nProvider.
 * mode="light" : le mode sombre est une option ultérieure (le thème le prévoit déjà).
 */
const AstryxProviders = ({ children }) => {
    const { lang, dir } = useI18n();
    const locale = LOCALES[lang] || 'fr-FR';
    return (
        <Theme theme={kriniTheme} mode="light">
            <InternationalizationProvider locale={locale} dir={dir} messages={MESSAGES}>
                {children}
            </InternationalizationProvider>
        </Theme>
    );
};

export default AstryxProviders;
