import React from 'react';
import Select from 'react-select';

const Dropdown = ({
    options,
    value,
    onChange,
    placeholder = 'Sélectionner...',
    isSearchable = false,
    isClearable = false,
    isDisabled = false,
    className,
    classNamePrefix = 'react-select',
    styles,
    ...rest
}) => {
    const selected = Array.isArray(options) && value !== undefined && value !== null && value !== ''
        ? options.find(o => String(o.value) === String(value)) || null
        : null;

    return (
        <Select
            options={options || []}
            value={selected}
            onChange={(opt) => { if (onChange) onChange(opt ? opt.value : ''); }}
            placeholder={placeholder}
            isSearchable={isSearchable}
            isClearable={isClearable}
            isDisabled={isDisabled}
            className={className}
            classNamePrefix={classNamePrefix}
            styles={{
                control: (base, state) => ({
                    ...base,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    boxShadow: state.isFocused ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    padding: '2px 4px',
                    cursor: 'pointer',
                    minHeight: '44px',
                    '&:hover': { borderColor: '#94a3b8' }
                }),
                menu: (base) => ({
                    ...base,
                    borderRadius: '0.5rem',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                }),
                option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? '#eff6ff' : 'white',
                    color: state.isSelected ? '#1d4ed8' : '#1e293b',
                    fontWeight: state.isSelected || state.isFocused ? '600' : '400',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    padding: '10px 14px'
                }),
                placeholder: (base) => ({
                    ...base,
                    color: '#94a3b8'
                }),
                singleValue: (base) => ({
                    ...base,
                    fontWeight: '600',
                    color: '#1e293b'
                }),
                indicatorSeparator: (base) => ({
                    ...base,
                    backgroundColor: '#e2e8f0'
                }),
                dropdownIndicator: (base) => ({
                    ...base,
                    color: '#64748b',
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