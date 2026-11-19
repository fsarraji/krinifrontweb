import React, { forwardRef } from 'react';
import { MultiSelector, Selector } from '@astryxdesign/core';
import { useI18n } from '../i18n/context';

// Liste déroulante (Selector / MultiSelector Astryx). API historique, basée sur les valeurs :
//   options [{ value, label }], value (scalaire, ou tableau si isMulti), onChange(value, option),
//   placeholder, isSearchable, isClearable, isDisabled, isMulti.
// Les valeurs d'origine (nombres compris) sont conservées : Astryx manipule des chaînes, on retrouve
// l'option d'origine au changement. Props propres à react-select (styles, classNamePrefix…) ignorées.
const Dropdown = forwardRef(function Dropdown({
    options,
    value,
    onChange,
    placeholder,
    isSearchable = false,
    isClearable = false,
    isDisabled = false,
    isMulti = false,
    noOptionsMessage,
    className,
    name,
    label,
    description,
    status,
    isRequired,
    'aria-label': ariaLabel,
}, ref) {
    const { t } = useI18n();
    const list = Array.isArray(options) ? options : [];
    const items = list.map((o) => ({ value: String(o.value), label: String(o.label ?? o.value) }));
    const byString = new Map(list.map((o) => [String(o.value), o]));
    const common = {
        ref,
        label: label || ariaLabel || placeholder || ' ',
        isLabelHidden: !label,
        description,
        status,
        isRequired,
        isDisabled,
        className,
        htmlName: name,
        options: items,
        hasSearch: isSearchable,
        placeholder: placeholder ?? t('u.slectionner'),
        emptyText: noOptionsMessage ? noOptionsMessage() : t('u.aucune_option'),
    };

    if (isMulti) {
        return (
            <MultiSelector
                {...common}
                value={(Array.isArray(value) ? value : []).map(String)}
                onChange={(vals) => onChange?.(vals.map((v) => byString.get(v)?.value ?? v))}
            />
        );
    }
    const hasValue = value !== undefined && value !== null && value !== '';
    return (
        <Selector
            {...common}
            value={hasValue ? String(value) : ''}
            hasClear={isClearable}
            onChange={(v) => {
                const option = v ? byString.get(v) : undefined;
                onChange?.(option ? option.value : '', option);
            }}
        />
    );
});
Dropdown.isAstryxControl = true;

export default Dropdown;
