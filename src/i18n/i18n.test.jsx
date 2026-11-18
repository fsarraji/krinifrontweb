import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import I18nProvider from './I18nProvider';
import { useI18n } from './context';
import { translate, translations } from './translations';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import Login from '../components/Login';

afterEach(() => {
    document.documentElement.removeAttribute('dir');
    document.documentElement.removeAttribute('lang');
});

describe('translate', () => {
    it('returns the French text by default and substitutes variables', () => {
        expect(translate('fr', 'dashboard.eyebrow', { agency: 'Cherifi' })).toBe('Aperçu temps réel — Cherifi');
        expect(translate('ar', 'dashboard.days', { n: 3 })).toBe('3 أيام');
    });

    it('falls back to French, then to the key itself', () => {
        expect(translate('ar', 'unknown.key')).toBe('unknown.key');
        const original = translations.ar['nav.dashboard'];
        delete translations.ar['nav.dashboard'];
        expect(translate('ar', 'nav.dashboard')).toBe('Tableau de bord');
        translations.ar['nav.dashboard'] = original;
    });

    it('keeps an unknown {variable} untouched', () => {
        expect(translate('fr', 'dashboard.days', {})).toBe('{n} Jours');
    });

    it('has an Arabic translation for every French key (no silent gaps)', () => {
        const missing = Object.keys(translations.fr).filter((k) => !(k in translations.ar));
        expect(missing).toEqual([]);
    });

    it('uses the same {variables} in both languages', () => {
        const vars = (text) => (text.match(/\{\w+\}/g) || []).sort().join(',');
        Object.keys(translations.fr).forEach((key) => {
            expect(vars(translations.ar[key]), key).toBe(vars(translations.fr[key]));
        });
    });
});

describe('I18nProvider', () => {
    const Probe = () => {
        const { t, lang, dir } = useI18n();
        return <p data-testid="probe">{`${lang}|${dir}|${t('nav.contracts')}`}</p>;
    };

    it('defaults to French / ltr', () => {
        render(<I18nProvider><Probe /></I18nProvider>);
        expect(screen.getByTestId('probe')).toHaveTextContent('fr|ltr|Contrats');
        expect(document.documentElement.dir).toBe('ltr');
    });

    it('switches to Arabic, sets <html dir="rtl"> and remembers the choice', () => {
        const { unmount } = render(<I18nProvider><LanguageSwitcher /><Probe /></I18nProvider>);
        fireEvent.click(screen.getByRole('button', { name: 'العربية' }));
        expect(screen.getByTestId('probe')).toHaveTextContent('ar|rtl|العقود');
        expect(document.documentElement.dir).toBe('rtl');
        expect(document.documentElement.lang).toBe('ar');
        expect(localStorage.getItem('lang')).toBe('ar');
        unmount();

        // Nouvelle « session » : la langue mémorisée est restaurée
        render(<I18nProvider><Probe /></I18nProvider>);
        expect(screen.getByTestId('probe')).toHaveTextContent('ar|rtl|العقود');
    });

    it('ignores an unsupported stored language', () => {
        localStorage.setItem('lang', 'xx');
        render(<I18nProvider><Probe /></I18nProvider>);
        expect(screen.getByTestId('probe')).toHaveTextContent('fr|ltr');
    });
});

describe('Login in Arabic', () => {
    it('renders translated labels after switching language', () => {
        render(
            <MemoryRouter>
                <I18nProvider>
                    <Login />
                </I18nProvider>
            </MemoryRouter>,
        );
        expect(screen.getAllByText('Bienvenue').length).toBeGreaterThan(0);
        fireEvent.click(screen.getAllByRole('button', { name: 'ع' })[0]);
        expect(screen.getAllByText('مرحباً').length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: 'تسجيل الدخول' })).toBeInTheDocument();
    });
});
