import React from 'react';
import { Switch } from '@astryxdesign/core';
import Field from './ui/Field';
import { Input, Select } from './ui/Input';
import { useI18n } from '../i18n/context';

const DOC_TYPES = [
    { value: 'CIN', labelKey: 'narsa.doc_cin' },
    { value: 'SEJOUR', labelKey: 'narsa.doc_sejour' },
    { value: 'PASSEPORT', labelKey: 'narsa.doc_passeport' },
];

/** Format exact proposé par le portail : « Ville - BUREAU POSTAL (20001) ». */
export const LOCALITE_RE = /\(\d{5}\)\s*$/;

/**
 * Données exigées par le portail NARSA pour déclarer un conducteur (noms/adresse en arabe,
 * type de document, localité). Facultatives à la création, requises au moment de déclarer.
 */
const ClientNarsaFields = ({ formData, onChange }) => {
    const { t } = useI18n();
    const set = (name, value) => onChange({ target: { name, value } });
    const localite = formData.localite_narsa || '';
    const localiteBad = localite && !LOCALITE_RE.test(localite);

    return (
        <section aria-labelledby="client-narsa-title" className="space-y-4">
            <div>
                <h3 id="client-narsa-title" className="text-[13px] font-bold" style={{ color: 'var(--on-surface)' }}>
                    {t('narsa.section_title')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{t('narsa.section_hint')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label={t('narsa.prenom_ar')}>
                    <Input name="prenom_ar" dir="rtl" lang="ar" value={formData.prenom_ar || ''} onChange={onChange} type="text" />
                </Field>
                <Field label={t('narsa.nom_ar')}>
                    <Input name="nom_ar" dir="rtl" lang="ar" value={formData.nom_ar || ''} onChange={onChange} type="text" />
                </Field>
                <Field label={t('narsa.adresse_ar')} className="sm:col-span-2">
                    <Input name="adresse_ar" dir="rtl" lang="ar" value={formData.adresse_ar || ''} onChange={onChange} type="text" />
                </Field>
                <Field label={t('narsa.type_document')}>
                    <Select name="type_document" value={formData.type_document || ''} onChange={onChange}>
                        <option value="">{t('u.slectionner_2')}</option>
                        {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{t(d.labelKey)}</option>)}
                    </Select>
                </Field>
                <Field
                    label={t('narsa.localite')}
                    hint={t('narsa.localite_hint')}
                    error={localiteBad ? t('narsa.localite_invalid') : ''}
                >
                    <Input name="localite_narsa" value={localite} onChange={onChange} type="text" placeholder="Casablanca - CASABLANCA PRINCIPAL (20001)" />
                </Field>
                <div className="flex items-center justify-between sm:col-span-1">
                    <span className="text-sm">{t('narsa.permis_etranger')}</span>
                    <Switch label={t('narsa.permis_etranger')} isLabelHidden value={Boolean(formData.permis_etranger)} onChange={(v) => set('permis_etranger', v)} />
                </div>
                <div className="flex items-center justify-between sm:col-span-1">
                    <span className="text-sm">{t('narsa.adresse_etrangere')}</span>
                    <Switch label={t('narsa.adresse_etrangere')} isLabelHidden value={Boolean(formData.adresse_etrangere)} onChange={(v) => set('adresse_etrangere', v)} />
                </div>
            </div>
        </section>
    );
};

export default ClientNarsaFields;
