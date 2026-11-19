import React from 'react';
import { Button } from '@astryxdesign/core';
import { tNow } from '../i18n/runtime';

// Filet de sécurité : une erreur de rendu n'affiche plus un écran blanc.
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('Erreur de rendu', error, info);
    }

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <div role="alert" className="min-h-screen flex items-center justify-center p-6 text-center">
                <div className="max-w-md space-y-4">
                    <h1 className="text-xl font-extrabold text-slate-900">{tNow('u.une_erreur_est_survenue')}</h1>
                    <p className="text-sm text-slate-500">{tNow('u.la_page_n_a_pas_pu_s_afficher_re')}</p>
                    <Button label={tNow('u.recharger')} variant="primary" onClick={() => window.location.reload()} />
                </div>
            </div>
        );
    }
}
