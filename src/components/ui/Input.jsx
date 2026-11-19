import { forwardRef, useEffect, useRef } from 'react';
import { DateInput, DateTimeInput, NumberInput, Selector, TextArea, TextInput } from '@astryxdesign/core';

// Adaptateurs de contrôles de formulaire : API historique (événements natifs : onChange(e) avec
// e.target.value / e.target.name) au-dessus des composants Astryx (TextInput, NumberInput,
// DateInput, DateTimeInput, Selector, TextArea). Quand le composant Astryx ne fournit pas
// l'événement natif, on en fabrique un équivalent minimal.
//
// Props de libellé (label, description, status, isRequired) : fournies par <Field> ; sans <Field>,
// aria-label / placeholder servent de nom accessible (libellé masqué).
const synth = (name, value, type) => {
    const target = { name, value, type };
    return { target, currentTarget: target, preventDefault() {}, stopPropagation() {}, persist() {} };
};

const statusOf = (invalid, status) => status || (invalid ? { type: 'error' } : undefined);

const labelProps = ({ label, description, isRequired, required, 'aria-label': ariaLabel, placeholder }) => ({
    label: label || ariaLabel || placeholder || ' ',
    isLabelHidden: !label,
    description,
    isRequired: isRequired ?? required,
});


// Astryx n'ajoute que aria-required : on pose aussi l'attribut natif `required` sur le champ réel, pour
// conserver la validation native des formulaires (blocage de l'envoi d'un champ vide).
const useNativeRequired = (required) => {
    const wrapRef = useRef(null);
    useEffect(() => {
        wrapRef.current?.querySelectorAll('input:not([type="hidden"]), textarea').forEach((el) => {
            el.required = Boolean(required);
        });
    });
    return wrapRef;
};

// ── Champ de saisie ─────────────────────────────────────────────────────────────────────────────
export const Input = forwardRef(function Input({ type = 'text', ...props }, ref) {
    const wrapRef = useNativeRequired(props.required ?? props.isRequired);
    return (
        <div ref={wrapRef} className={props.className}>
            <InputControl type={type} {...props} ref={ref} />
        </div>
    );
});
Input.isAstryxControl = true;

const InputControl = forwardRef(function InputControl({ type = 'text', value, onChange, ...props }, ref) {
    const { invalid, status, name, disabled, readOnly, placeholder, min, max, step, onKeyDown, onBlur, onFocus } = props;
    const common = {
        ...labelProps(props),
        placeholder,
        isDisabled: disabled,
        isReadOnly: readOnly,
        status: statusOf(invalid, status),
        htmlName: name,
    };
    const edges = { onBlur, onFocus, onKeyDown };

    if (type === 'number') {
        const n = value === '' || value == null || Number.isNaN(Number(value)) ? null : Number(value);
        return (
            <NumberInput
                ref={ref}
                {...common}
                value={n}
                min={min != null ? Number(min) : undefined}
                max={max != null ? Number(max) : undefined}
                step={step != null ? Number(step) : undefined}
                onChange={(v) => onChange?.(synth(name, v == null || Number.isNaN(v) ? '' : String(v), 'number'))}
                {...edges}
            />
        );
    }
    if (type === 'date') {
        return (
            <DateInput
                {...common}
                value={value || undefined}
                min={min || undefined}
                max={max || undefined}
                hasClear
                onChange={(v) => onChange?.(synth(name, v || '', 'date'))}
            />
        );
    }
    if (type === 'datetime-local') {
        return (
            <DateTimeInput
                {...common}
                value={value || undefined}
                min={min || undefined}
                max={max || undefined}
                hasClear
                onChange={(v) => onChange?.(synth(name, (v || '').slice(0, 16), 'datetime-local'))}
            />
        );
    }
    const astryxType = ['password', 'email'].includes(type) ? type : 'text';
    return (
        <TextInput
            ref={ref}
            {...common}
            type={astryxType}
            value={String(value ?? '')}
            onChange={(_v, e) => onChange?.(e)}
            hasClear={type === 'search'}
            hasAutoFocus={props.autoFocus}
            {...edges}
        />
    );
});

// ── Liste déroulante : <Select><option value>texte</option>…</Select> ───────────────────────────
const optionsOf = (children) => {
    const out = [];
    let placeholder;
    const walk = (nodes) => {
        [].concat(nodes).flat(Infinity).forEach((node) => {
            if (!node || typeof node !== 'object') return;
            if (node.type === 'option') {
                const value = node.props.value ?? String(node.props.children ?? '');
                const label = [].concat(node.props.children ?? '').join('');
                if (String(value) === '') placeholder = label;
                else out.push({ value: String(value), label, isDisabled: node.props.disabled });
            } else if (node.props?.children) walk(node.props.children);
        });
    };
    walk(children);
    return { options: out, placeholder };
};

export const Select = forwardRef(function Select({ value, onChange, children, ...props }, ref) {
    const { invalid, status, className, name, disabled } = props;
    const { options, placeholder } = optionsOf(children);
    return (
        <Selector
            ref={ref}
            {...labelProps({ ...props, placeholder: undefined })}
            className={className}
            options={options}
            value={String(value ?? '')}
            placeholder={placeholder}
            isDisabled={disabled}
            status={statusOf(invalid, status)}
            htmlName={name}
            onChange={(v) => onChange?.(synth(name, v ?? '', 'select-one'))}
        />
    );
});
Select.isAstryxControl = true;

// ── Zone de texte ───────────────────────────────────────────────────────────────────────────────
export const Textarea = forwardRef(function Textarea({ value, onChange, rows = 3, ...props }, ref) {
    const { invalid, status, className, name, disabled, readOnly, placeholder, maxLength } = props;
    const wrapRef = useNativeRequired(props.required ?? props.isRequired);
    return (
        <div ref={wrapRef} className={className}>
        <TextArea
            ref={ref}
            {...labelProps(props)}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            value={String(value ?? '')}
            isDisabled={disabled}
            isReadOnly={readOnly}
            status={statusOf(invalid, status)}
            htmlName={name}
            onChange={(_v, e) => onChange?.(e)}
        />
        </div>
    );
});
Textarea.isAstryxControl = true;

export default Input;
