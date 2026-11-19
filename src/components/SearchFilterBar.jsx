import React from 'react';
import { Selector, TextInput } from '@astryxdesign/core';
import { useI18n } from '../i18n/context';

// Barre de recherche + filtre déroulant (TextInput et Selector Astryx).
// options : [{ value, label, dot? }] ; la valeur sélectionnée est toujours renvoyée telle quelle.
const SearchFilterBar = ({ placeholder, search, onSearchChange, options, filter, onFilterChange }) => {
    const { t } = useI18n();
    const items = (options || []).map((o) => ({ value: String(o.value), label: String(o.label) }));
    const byString = new Map((options || []).map((o) => [String(o.value), o.value]));

    return (
        <section className="flex flex-wrap items-center gap-3 w-full">
            <div className="flex-1 min-w-[200px]">
                <TextInput
                    label={placeholder || t('common.search')}
                    isLabelHidden
                    placeholder={placeholder}
                    value={search ?? ''}
                    onChange={(v) => onSearchChange(v)}
                    hasClear
                />
            </div>
            {items.length > 0 && (
                <div className="shrink-0 min-w-[10rem]">
                    <Selector
                        label={t('common.all')}
                        isLabelHidden
                        options={items}
                        value={String(filter ?? '')}
                        onChange={(v) => onFilterChange(byString.has(v) ? byString.get(v) : v)}
                    />
                </div>
            )}
        </section>
    );
};

export default SearchFilterBar;
