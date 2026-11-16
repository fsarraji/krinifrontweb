import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach } from 'vitest';

// Composants historiques écrits sans import React (JSX classique) : on l'expose pour les tests.
globalThis.React = React;
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
    localStorage.clear();
});
