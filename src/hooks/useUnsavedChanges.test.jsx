import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import useUnsavedChanges from './useUnsavedChanges';

const Form = ({ onReady }) => {
    const { formProps, markClean } = useUnsavedChanges();
    onReady?.(markClean);
    return <form {...formProps}><input aria-label="champ" /></form>;
};

const fireUnload = () => {
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    return e.defaultPrevented;
};

describe('useUnsavedChanges', () => {
    it('ne bloque pas la fermeture tant que rien n\'a été modifié', () => {
        render(<Form />);
        expect(fireUnload()).toBe(false);
    });

    it('bloque la fermeture après une saisie puis se réarme avec markClean', () => {
        let clean;
        const { getByLabelText } = render(<Form onReady={(c) => { clean = c; }} />);
        fireEvent.input(getByLabelText('champ'), { target: { value: 'x' } });
        expect(fireUnload()).toBe(true);
        clean();
        expect(fireUnload()).toBe(false);
    });
});
