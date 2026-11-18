import React from 'react';
import Select from 'react-select';
import { useI18n } from '../i18n/context';

const Dropdown = ({
    options,
    value,
    onChange,
    placeholder,
    isSearchable = false,
    isClearable = false,
    isDisabled = false,
    className,
    classNamePrefix = 'react-select',
    styles,
    ...rest
}) => {
    const { t } = useI18n();
    const selected = Array.isArray(options) && value !== undefined && value !== null && value !== ''
        ? options.find(o => String(o.value) === String(value)) || null
        : null;

    return (
        <Select
            options={options || []}
            value={selected}
            onChange={(opt) => { if (onChange) onChange(opt ? opt.value : ''); }}
            placeholder={placeholder ?? t('u.slectionner')}
            noOptionsMessage={() => t('u.aucune_option')}
            isSearchable={isSearchable}
            isClearable={isClearable}
            isDisabled={isDisabled}
            className={className}
            classNamePrefix={classNamePrefix}
            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
            menuPosition="fixed"
            styles={{
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                control: (base, state) => ({
                    ...base,
                    backgroundColor: 'var(--card-white)',
                    border: '1px solid var(--stroke)',
                    boxShadow: state.isFocused ? '0 0 0 2px color-mix(in srgb, var(--color-accent) 20%, transparent)' : 'none',
                    borderColor: state.isFocused ? 'var(--color-accent)' : 'var(--stroke)',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    padding: '0 4px',
                    cursor: 'pointer',
                    minHeight: '42px',
                    '&:hover': { borderColor: 'var(--text-disabled)' }
                }),
                menu: (base) => ({
                    ...base,
                    borderRadius: '0.5rem',
                    boxShadow: 'var(--shadow-med)',
                    border: '1px solid var(--stroke)',
                    backgroundColor: 'var(--card-white)',
                    overflow: 'hidden'
                }),
                option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? 'var(--surface-active)' : 'var(--card-white)',
                    color: state.isSelected ? 'var(--primary)' : 'var(--on-surface)',
                    fontWeight: state.isSelected || state.isFocused ? '600' : '400',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    padding: '10px 14px'
                }),
                placeholder: (base) => ({
                    ...base,
                    color: 'var(--text-disabled)'
                }),
                singleValue: (base) => ({
                    ...base,
                    fontWeight: '600',
                    color: 'var(--on-surface)'
                }),
                indicatorSeparator: (base) => ({
                    ...base,
                    backgroundColor: 'var(--stroke)'
                }),
                dropdownIndicator: (base) => ({
                    ...base,
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                }),
                clearIndicator: (base) => ({
                    ...base,
                    cursor: 'pointer'
                }),
                ...styles
            }}
            {...rest}
        />
    );
};

export default Dropdown;