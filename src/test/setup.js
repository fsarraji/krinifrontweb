import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach } from 'vitest';

// Composants historiques écrits sans import React (JSX classique) : on l'expose pour les tests.
globalThis.React = React;

// jsdom n'implémente pas <dialog>.showModal()/close() (utilisés par le Dialog Astryx).
// Le piège de focus, Échap et le clic sur le fond relèvent du navigateur : à vérifier en réel.
if (typeof HTMLDialogElement !== 'undefined') {
    HTMLDialogElement.prototype.showModal ||= function showModal() { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.show ||= function show() { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close ||= function close() {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
    };
}
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
    localStorage.clear();
});
