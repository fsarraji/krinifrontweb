import { apiErrorText } from '../utils/apiErrorText';
import FormActions from './ui/FormActions';
import ErrorBanner from './ui/ErrorBanner';
import Field from './ui/Field';
import FileField from './ui/FileField';
import Card from './ui/Card';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core';
import { Input, Select, Textarea } from './ui/Input';
import { translateOr } from '../i18n/helpers';
import React, { useState } from 'react';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import Button from './ui/Button';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from './Toast';
import { SEXE_OPTIONS, NATIONALITES, cinLabelFor } from '../utils/clientConstants';
import { UNIQUE_FIELDS, UNIQUE_MSG, checkUnique as apiCheckUnique } from '../utils/clientUniqueness';
import { optimizeImageFile } from '../utils/imageUtils';
import Stepper from './ui/Stepper';
import { useI18n } from '../i18n/context';

const AddClient = () => {
    const { t } = useI18n();
    const { formProps, markClean } = useUnsavedChanges();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        prenom: '',
        nom: '',
        cin_passport: '',
        date_expiration_cin: '',
        email: '',
        telephone: '',
        adresse: '',
        ville: '',
        pays: '',
        sexe: '',
        nationalite: '',
        permis_conduite: '',
        date_delivrance_permis: '',
        remarques: ''
    });
    const [files, setFiles] = useState({
        scan_cin: null,
        scan_permis: null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [fieldErrors, setFieldErrors] = useState({});
    const [uniqueErrors, setUniqueErrors] = useState({});

    const checkUnique = async (field, value) => {
        const available = await apiCheckUnique({ field, value });
        setUniqueErrors(prev => ({ ...prev, [field]: available ? false : UNIQUE_MSG(field) }));
    };

    const handleBlurUnique = (field) => (e) => {
        checkUnique(field, e.target.value);
    };

    const steps = [
        { num: 1, label: t('u.informations'), icon: 'person', subtitle: t('u.identit_contact') },
        { num: 2, label: t('u.adresse'), icon: 'home', subtitle: t('u.localisation') },
        { num: 3, label: t('u.pices_d_identit'), icon: 'badge', subtitle: t('u.cin_permis_de_conduire') },
        { num: 4, label: t('u.documents'), icon: 'folder_open', subtitle: t('u.pices_justificatives') },
    ];

    const requiredFields = {
        1: [
            { key: 'prenom', label: t('u.prnom'), check: () => !formData.prenom },
            { key: 'nom', label: t('u.nom'), check: () => !formData.nom },
            { key: 'telephone', label: t('u.tlphone'), check: () => !formData.telephone },
        ],
        2: [
            { key: 'adresse', label: t('u.adresse'), check: () => !formData.adresse },
        ],
        3: [
            { key: 'cin_passport', label: t('u.cin_passeport'), check: () => !formData.cin_passport },
            { key: 'permis_conduite', label: t('u.n_de_permis'), check: () => !formData.permis_conduite },
        ],
        4: [],
    };

    const validateStep = (step) => (requiredFields[step] || []).filter((f) => f.check());

    const markErrors = (fields) => {
        const keys = fields.map((f) => f.key);
        setFieldErrors((prev) => {
            const next = { ...prev };
            keys.forEach((k) => { next[k] = true; });
            return next;
        });
    };

    const handleNext = () => {
        const missing = validateStep(currentStep);
        if (missing.length > 0) {
            markErrors(missing);
            toast.error(t('u.champs_requis_manquants', { fields: missing.map((m) => m.label).join(', ') }));
            return;
        }
        const uniqueFieldsOnStep = (requiredFields[currentStep] || [])
            .map(f => f.key)
            .filter(k => UNIQUE_FIELDS[k] && uniqueErrors[k]);
        if (uniqueFieldsOnStep.length > 0) {
            toast.error(t('u.corrigez_d_abord_les_champs_en_d', { fields: uniqueFieldsOnStep.map(k => UNIQUE_FIELDS[k]).join(', ') }));
            return;
        }
        setCurrentStep((prev) => Math.min(prev + 1, 4));
    };

    const handlePrev = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const hasError = (name) => Boolean(fieldErrors[name]) || Boolean(uniqueErrors[name]);

    const fieldErrorMsg = (name) => uniqueErrors[name] || (fieldErrors[name] ? t('u.champ_requis') : '');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: false }));
        }
        if (uniqueErrors[name]) {
            setUniqueErrors(prev => ({ ...prev, [name]: false }));
        }
    };

    const setFile = async (name, file) => {
        const next = file ? await optimizeImageFile(file) : null;
        setFiles(prev => ({ ...prev, [name]: next }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const missing = validateStep(currentStep);
        if (currentStep < 4) {
            handleNext();
            return;
        }
        if (missing.length > 0) {
            markErrors(missing);
            toast.error(t('u.champs_requis_manquants', { fields: missing.map((m) => m.label).join(', ') }));
            return;
        }
        const uniqueFieldsOnStep = (requiredFields[currentStep] || [])
            .map(f => f.key)
            .filter(k => UNIQUE_FIELDS[k] && uniqueErrors[k]);
        if (uniqueFieldsOnStep.length > 0) {
            toast.error(t('u.corrigez_d_abord_les_champs_en_d', { fields: uniqueFieldsOnStep.map(k => UNIQUE_FIELDS[k]).join(', ') }));
            return;
        }
        // Vérifier une dernière fois les champs uniques avant enregistrement
        for (const field of Object.keys(UNIQUE_FIELDS)) {
            const val = formData[field];
            if (val && val.trim()) {
                const available = await apiCheckUnique({ field, value: val });
                if (!available) {
                    setUniqueErrors(prev => ({ ...prev, [field]: UNIQUE_MSG(field) }));
                    toast.error(UNIQUE_MSG(field));
                    return;
                }
            }
        }
        setLoading(true);
        setError(null);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
                    data.append(key, formData[key]);
                }
            });
            if (files.scan_cin) data.append('scan_cin', files.scan_cin);
            if (files.scan_permis) data.append('scan_permis', files.scan_permis);

            await api.post('clients/', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(t('u.client_cr_avec_succs'));
            markClean();
            navigate('/clients');
        } catch (err) {
            console.error("Error creating client:", err);
            setError(apiErrorText(err, t('u.une_erreur_est_survenue_lors_de__2')));
            setLoading(false);
        }
    };


    return (
        <div className="w-full px-4 py-6">
            {/* Breadcrumb + header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                        <span className="cursor-pointer hover:underline" onClick={() => navigate('/clients')}>{t('u.clients')}</span> / Nouveau client
                    </p>
                    <h1 className="font-bold text-[28px] tracking-tight" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>
                        {t('u.ajouter_un_client')}
                    </h1>
                </div>
            </div>

            <ErrorBanner message={error} className="mb-5" />

            <form {...formProps} onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
                {/* Stepper */}
                <Stepper steps={steps} currentStep={currentStep} />

                {/* Barre de progression */}
                <div className="px-6 pt-5">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('u.progression')}</span>
                        <span className="text-[11px] font-bold text-blue-600">{t('u.tape_sur', { step: currentStep, total: steps.length })}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-500"
                            style={{ width: `${(currentStep / steps.length) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="space-y-5 bg-slate-50/50 p-5">
                    <div className="space-y-5">
                {currentStep === 1 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field label={t('u.prnom')} required error={fieldErrorMsg('prenom')}>
                                    <Input invalid={hasError('prenom')}
                                        name="prenom"
                                        value={formData.prenom}
                                        onChange={handleChange}
                                        required
                                       
                                        placeholder="ex. Jonathan"
                                        type="text"
                                    />
                                </Field>
                                <Field label={t('u.nom')} required error={fieldErrorMsg('nom')}>
                                    <Input invalid={hasError('nom')}
                                        name="nom"
                                        value={formData.nom}
                                        onChange={handleChange}
                                        required
                                       
                                        placeholder="ex. Wick"
                                        type="text"
                                    />
                                </Field>
                                <div>
                                    <div className="w-fit">
                                        <SegmentedControl label={t('u.sexe')} value={formData.sexe} onChange={(value) => handleChange({ target: { name: 'sexe', value } })}>
                                            {SEXE_OPTIONS.map((opt) => (
                                                <SegmentedControlItem key={opt.value} value={opt.value} label={translateOr(t, `sexe.${opt.value}`, opt.label)} />
                                            ))}
                                        </SegmentedControl>
                                    </div>
                                </div>
                                <Field label={t('u.nationalit')}>
                                    <Select invalid={hasError('nationalite')}
                                        name="nationalite"
                                        value={formData.nationalite}
                                        onChange={handleChange}
                                       
                                    >
                                        <option value="">{t('u.slectionner_2')}</option>
                                        {NATIONALITES.map(n => (
                                            <option key={n} value={n}>{translateOr(t, `nat.${n}`, n)}</option>
                                        ))}
                                    </Select>
                                </Field>
                                <Field label={t('u.tlphone')} required error={fieldErrorMsg('telephone')}>
                                    <Input invalid={hasError('telephone')}
                                        name="telephone"
                                        value={formData.telephone}
                                        onChange={handleChange}
                                        onBlur={handleBlurUnique('telephone')}
                                        required
                                       
                                        placeholder="ex. +212 6 12 34 56 78"
                                        type="tel"
                                    />
                                </Field>
                                <Field label={t('u.adresse_email')} error={fieldErrorMsg('email')} className="sm:col-span-2">
                                    <Input invalid={hasError('email')}
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        onBlur={handleBlurUnique('email')}
                                       
                                        placeholder={t('u.ex_jonathan_wick_example_com')}
                                        type="email"
                                    />
                                </Field>
                            </div>
                    )}

                    {currentStep === 2 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <Field label={t('u.adresse_rsidentielle')} required error={fieldErrorMsg('adresse')} className="sm:col-span-2">
                                <Textarea invalid={hasError('adresse')}
                                    name="adresse"
                                    value={formData.adresse}
                                    onChange={handleChange}
                                    required
                                       
                                    placeholder={t('u.rue_numro_ville_code_postal')}
                                    rows="3"
                                ></Textarea>
                            </Field>
                                <Field label={t('u.ville')}>
                                    <Input invalid={hasError('ville')}
                                        name="ville"
                                        value={formData.ville}
                                        onChange={handleChange}
                                       
                                        placeholder="ex. Casablanca"
                                        type="text"
                                    />
                                </Field>
                                <Field label={t('u.pays')}>
                                    <Input invalid={hasError('pays')}
                                        name="pays"
                                        value={formData.pays}
                                        onChange={handleChange}
                                       
                                        placeholder="ex. Maroc"
                                        type="text"
                                    />
                                </Field>
                            </div>
                    )}

                    {currentStep === 3 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field label={cinLabelFor(formData.nationalite)} required error={fieldErrorMsg('cin_passport')}>
                                    <Input invalid={hasError('cin_passport')}
                                        name="cin_passport"
                                        value={formData.cin_passport}
                                        onChange={handleChange}
                                        onBlur={handleBlurUnique('cin_passport')}
                                        required
                                       
                                        placeholder="ex. AB123456"
                                        type="text"
                                    />
                                </Field>
                                <Field label="Expiration {cinLabelFor(formData.nationalite)}">
                                    <Input invalid={hasError('date_expiration_cin')}
                                        name="date_expiration_cin"
                                        value={formData.date_expiration_cin}
                                        onChange={handleChange}
                                       
                                        type="date"
                                    />
                                </Field>
                                <Field label={t('u.n_de_permis')} required error={fieldErrorMsg('permis_conduite')}>
                                    <Input invalid={hasError('permis_conduite')}
                                        name="permis_conduite"
                                        value={formData.permis_conduite}
                                        onChange={handleChange}
                                        onBlur={handleBlurUnique('permis_conduite')}
                                        required
                                       
                                        placeholder="ex. AB12345678"
                                        type="text"
                                    />
                                </Field>
                                <Field label={t('u.date_de_dlivrance')}>
                                    <Input invalid={hasError('date_delivrance_permis')}
                                        name="date_delivrance_permis"
                                        value={formData.date_delivrance_permis}
                                        onChange={handleChange}
                                       
                                        type="date"
                                    />
                                </Field>
                                <Field label={t('u.remarques')} className="sm:col-span-2">
                                    <Textarea invalid={hasError('remarques')}
                                        name="remarques"
                                        value={formData.remarques}
                                        onChange={handleChange}
                                       
                                        rows="3"
                                        placeholder={t('u.notes_internes_sur_ce_client_opt')}
                                    ></Textarea>
                                </Field>
                            </div>
                    )}

                    {currentStep === 4 && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <FileField label={`Scan ${cinLabelFor(formData.nationalite)}`} value={files.scan_cin} onChange={(file) => setFile('scan_cin', file)} accept="image/*,.pdf" placeholder={t('u.glisser_un_fichier_ou_parcourir')} />
                                    </div>
                                    <div>
                                        <FileField label={t('u.scan_permis_de_conduire')} value={files.scan_permis} onChange={(file) => setFile('scan_permis', file)} accept="image/*,.pdf" placeholder={t('u.glisser_un_fichier_ou_parcourir')} />
                                    </div>
                                </div>

                            <Card padding={5} variant="blue">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-[18px] mt-0.5 text-blue-600">info</span>
                                    <p className="text-[12.5px] font-medium text-blue-700">
                                        {t('u.le_dossier_client_sera_automatiq')}
                                    </p>
                                </div>
                            </Card>
                        </>
                    )}
                    </div>
                </div>
            </form>

            {/* Bottom security + actions */}
            <Card padding={4} variant="default" className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <span className="material-symbols-outlined">shield</span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-700">{t('u.vos_donnes_sont_scurises')}</p>
                        <p className="text-xs text-slate-400">{t('u.nous_protgeons_vos_informations_')}</p>
                    </div>
                </div>
                <FormActions
                    onCancel={() => navigate('/clients')}
                    onBack={currentStep > 1 ? handlePrev : undefined}
                    onSubmit={currentStep < 4 ? handleNext : handleSubmit}
                    submitLabel={currentStep < 4 ? t('u.suivant') : t('u.enregistrer')}
                    submitIcon={currentStep < 4 ? undefined : 'check'}
                    loading={loading}
                />
            </Card>
        </div>
    );
};

export default AddClient;
