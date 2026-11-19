import { tNow } from '../i18n/runtime';
import FileField from './ui/FileField';
import Card from './ui/Card';
import { SegmentedControl, SegmentedControlItem, Switch } from '@astryxdesign/core';
import { formatDate, formatMoney } from '../utils/formatters';
import StatusBadge from './ui/StatusBadge';
import Table from './ui/Table';
import { Input, Select, Textarea } from './ui/Input';
import { apiErrorText } from '../utils/apiErrorText';
import { translateOr } from '../i18n/helpers';
import React, { useState, useEffect } from 'react';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import AuditTimeline from './AuditTimeline';
import { SEXE_OPTIONS, NATIONALITES, cinLabelFor } from '../utils/clientConstants';
import { UNIQUE_FIELDS, UNIQUE_MSG, checkUnique as apiCheckUnique } from '../utils/clientUniqueness';
import { optimizeImageFile } from '../utils/imageUtils';
import { useI18n } from '../i18n/context';

const EditClient = () => {
    const { t } = useI18n();
    const { formProps, markClean } = useUnsavedChanges();
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        prenom: '',
        nom: '',
        cin_passport: '',
        email: '',
        telephone: '',
        adresse: '',
        ville: '',
        pays: '',
        sexe: '',
        nationalite: '',
        permis_conduite: '',
        date_delivrance_permis: '',
        remarques: '',
        liste_noire: false
    });
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [files, setFiles] = useState({ scan_cin: null, scan_permis: null });
    const [uniqueErrors, setUniqueErrors] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});

    const REQUIRED_FIELDS = [
        { key: 'prenom', label: t('u.prnom'), check: () => !formData.prenom },
        { key: 'nom', label: t('u.nom'), check: () => !formData.nom },
        { key: 'cin_passport', label: t('u.cin_passeport'), check: () => !formData.cin_passport },
        { key: 'telephone', label: t('u.tlphone'), check: () => !formData.telephone },
        { key: 'adresse', label: t('u.adresse'), check: () => !formData.adresse },
        { key: 'permis_conduite', label: t('u.n_de_permis'), check: () => !formData.permis_conduite },
    ];

    const hasError = (name) => Boolean(fieldErrors[name]) || Boolean(uniqueErrors[name]);

    const fieldErrorMsg = (name) => uniqueErrors[name] || (fieldErrors[name] ? t('u.champ_requis') : '');

    const checkUnique = async (field, value) => {
        const available = await apiCheckUnique({ field, value, excludeId: id });
        setUniqueErrors(prev => ({ ...prev, [field]: available ? false : UNIQUE_MSG(field) }));
    };

    const handleBlurUnique = (field) => (e) => {
        checkUnique(field, e.target.value);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [clientRes, contractsRes] = await Promise.all([
                    api.get(`clients/${id}/`),
                    api.get('contracts/')
                ]);
                
                setFormData(clientRes.data);
                
                // Filter contracts for this client
                const clientContracts = contractsRes.data.filter(c => c.client === parseInt(id));
                setContracts(clientContracts);
                
                setLoading(false);
            } catch (err) {
                console.error("Error fetching client data:", err);
                setError(tNow('u.une_erreur_est_survenue_lors_de__3'));
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (uniqueErrors[name]) {
            setUniqueErrors(prev => ({ ...prev, [name]: false }));
        }
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: false }));
        }
    };

    const setFile = async (name, file) => {
        const next = file ? await optimizeImageFile(file) : null;
        setFiles(prev => ({ ...prev, [name]: next }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const missing = REQUIRED_FIELDS.filter((f) => f.check());
        if (missing.length > 0) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                missing.forEach((f) => { next[f.key] = true; });
                return next;
            });
            toast.error(t('u.champs_requis_manquants', { fields: missing.map((m) => m.label).join(', ') }));
            return;
        }

        // Vérifier une dernière fois les champs uniques avant enregistrement
        for (const field of Object.keys(UNIQUE_FIELDS)) {
            const val = formData[field];
            if (val && val.trim()) {
                const available = await apiCheckUnique({ field, value: val, excludeId: id });
                if (!available) {
                    setUniqueErrors(prev => ({ ...prev, [field]: UNIQUE_MSG(field) }));
                    toast.error(UNIQUE_MSG(field));
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                // Ignore file URL fields when sending back, only send new files if selected
                if (key !== 'scan_cin' && key !== 'scan_permis') {
                    if (formData[key] !== null && formData[key] !== undefined) {
                        data.append(key, typeof formData[key] === 'boolean' ? (formData[key] ? 'true' : 'false') : formData[key]);
                    }
                }
            });
            if (files.scan_cin) data.append('scan_cin', files.scan_cin);
            if (files.scan_permis) data.append('scan_permis', files.scan_permis);

            await api.patch(`clients/${id}/`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(t('u.client_mis_jour_avec_succs'));
            markClean();
            navigate('/clients');
        } catch (err) {
            console.error("Error updating client:", err);
            setError(t('u.erreur_lors_de_la_sauvegarde'));
            setSaving(false);
        }
    };

    const handleDelete = () => {
        messageBox.danger(t('u.tes_vous_sr_de_vouloir_supprimer'), t('u.supprimer_le_client'), {
            onConfirm: async () => {
                try {
                    await api.delete(`clients/${id}/`);
                    toast.success(t('u.client_supprim_avec_succs'));
                    navigate('/clients');
                } catch (err) {
                    console.error("Error deleting client:", err);
                    toast.error(apiErrorText(err, t('u.erreur_lors_de_la_suppression')));
                }
            }
        });
    };

    if (loading) return <div className="p-8 flex items-center justify-center gap-3 text-primary font-semibold" role="status"><Spinner size={22} /> {t('u.chargement_du_profil_client')}</div>;

    const totalSpent = contracts.reduce((sum, c) => sum + parseFloat(c.montant_total || 0), 0);
    const rentalCount = contracts.length;

    return (
        <div className="w-full px-4 py-6">
            {/* Breadcrumb + header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                        <Link to="/clients" className="hover:underline">{t('u.clients')}</Link> / Modifier
                    </p>
                    <h1 className="font-bold text-[28px] tracking-tight" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>
                        {t('u.modifier_le_client')}
                    </h1>
                    <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                        {formData.prenom} {formData.nom} — {formData.cin_passport || t('u.non_renseign', { label: cinLabelFor(formData.nationalite) })}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="ghost" icon="delete" className="!text-danger-dark hover:!bg-danger-bg" onClick={handleDelete}>{t('u.supprimer')}</Button>
                    <Button variant="outline" onClick={() => navigate('/clients')}>{t('u.annuler')}</Button>
                    <Button type="submit" form="client-form" icon="save" loading={saving}>
                        {saving ? t('u.enregistrement') : t('u.sauvegarder')}
                    </Button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-lg flex items-center gap-3 font-semibold text-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                    <span className="material-symbols-outlined">error</span>
                    <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                {/* Left Column: Form Sections */}
                <form id="client-form" {...formProps} onSubmit={handleSubmit} className="xl:col-span-2 space-y-6">
                    {/* Section 1: Personal Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="label">{t('u.prnom')}</label>
                                <Input invalid={hasError('prenom')} name="prenom" value={formData.prenom || ''} onChange={handleChange} type="text" />
                                {fieldErrorMsg('prenom') && (
                                    <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                        {fieldErrorMsg('prenom')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label">{t('u.nom')}</label>
                                <Input invalid={hasError('nom')} name="nom" value={formData.nom || ''} onChange={handleChange} type="text" />
                                {fieldErrorMsg('nom') && (
                                    <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                        {fieldErrorMsg('nom')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label">{cinLabelFor(formData.nationalite)}</label>
                                <Input invalid={hasError('cin_passport')} name="cin_passport" value={formData.cin_passport || ''} onChange={handleChange} onBlur={handleBlurUnique('cin_passport')} type="text" />
                                {fieldErrorMsg('cin_passport') && (
                                    <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                        {fieldErrorMsg('cin_passport')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label">{t('u.adresse_email')}</label>
                                <Input invalid={hasError('email')} name="email" value={formData.email || ''} onChange={handleChange} onBlur={handleBlurUnique('email')} type="email" />
                                {fieldErrorMsg('email') && (
                                    <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                        {fieldErrorMsg('email')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label">{t('u.numro_de_tlphone')}</label>
                                <Input invalid={hasError('telephone')} name="telephone" value={formData.telephone || ''} onChange={handleChange} onBlur={handleBlurUnique('telephone')} type="tel" />
                                {fieldErrorMsg('telephone') && (
                                    <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                        {fieldErrorMsg('telephone')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label">{t('u.sexe')}</label>
                                <div className="w-fit">
                                    <SegmentedControl label={t('u.sexe')} value={formData.sexe} onChange={(value) => handleChange({ target: { name: 'sexe', value } })}>
                                        {SEXE_OPTIONS.map((opt) => (
                                            <SegmentedControlItem key={opt.value} value={opt.value} label={translateOr(t, `sexe.${opt.value}`, opt.label)} />
                                        ))}
                                    </SegmentedControl>
                                </div>
                            </div>
                            <div>
                                <label className="label">{t('u.nationalit')}</label>
                                <Select invalid={hasError('nationalite')} name="nationalite" value={formData.nationalite || ''} onChange={handleChange}>
                                    <option value="">{t('u.slectionner_2')}</option>
                                    {NATIONALITES.map(n => (
                                        <option key={n} value={n}>{translateOr(t, `nat.${n}`, n)}</option>
                                    ))}
                                </Select>
                            </div>
                            <div>
                                <label className="label">{t('u.ville')}</label>
                                <Input invalid={hasError('ville')} name="ville" value={formData.ville || ''} onChange={handleChange} type="text" />
                            </div>
                            <div>
                                <label className="label">{t('u.pays')}</label>
                                <Input invalid={hasError('pays')} name="pays" value={formData.pays || ''} onChange={handleChange} type="text" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="label">{t('u.adresse')}</label>
                                <Input invalid={hasError('adresse')} name="adresse" value={formData.adresse || ''} onChange={handleChange} type="text" />
                                {fieldErrorMsg('adresse') && (
                                    <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                        <span className="material-symbols-outlined text-[13px]">error</span>
                                        {fieldErrorMsg('adresse')}
                                    </p>
                                )}
                            </div>
                        </div>

                    {/* Section 2: Identity Documents */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {/* Drivers License */}
                            <div>
                                <div className="flex items-center gap-2 mb-5">
                                    <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--primary-container)' }}>card_membership</span>
                                    <p className="text-[13px] font-bold" style={{ color: 'var(--on-surface)' }}>{t('u.permis_de_conduire_3')}</p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">{t('u.n_de_permis')}</label>
                                        <Input invalid={hasError('permis_conduite')} name="permis_conduite" value={formData.permis_conduite || ''} onChange={handleChange} onBlur={handleBlurUnique('permis_conduite')} type="text" />
                                        {fieldErrorMsg('permis_conduite') && (
                                            <p className="text-[11px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                                <span className="material-symbols-outlined text-[13px]">error</span>
                                                {fieldErrorMsg('permis_conduite')}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="label">{t('u.date_de_dlivrance')}</label>
                                        <Input invalid={hasError('date_delivrance_permis')} name="date_delivrance_permis" value={formData.date_delivrance_permis || ''} onChange={handleChange} type="date" />
                                    </div>
                                    <div>
                                        <label className="label">{t('u.scan_du_permis')}</label>
                                        {formData.scan_permis && !files.scan_permis && (
                                            <a href={formData.scan_permis} target="_blank" rel="noreferrer" className="text-xs font-bold mb-2 inline-flex items-center gap-1" style={{ color: 'var(--primary-container)' }}>
                                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                {t('u.voir_le_scan_actuel')}
                                            </a>
                                        )}
                                        <FileField label={t('u.glisser_un_fichier_ou_parcourir')} isLabelHidden value={files.scan_permis} onChange={(file) => setFile('scan_permis', file)} accept="image/*,.pdf" placeholder={t('u.tlcharger_un_nouveau_document')} />
                                    </div>
                                </div>
                            </div>
                            {/* Passport / CIN */}
                            <div>
                                <div className="flex items-center gap-2 mb-5">
                                    <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--primary-container)' }}>public</span>
                                    <p className="text-[13px] font-bold" style={{ color: 'var(--on-surface)' }}>{cinLabelFor(formData.nationalite)}</p>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">{t('u.n_de_document')}</label>
                                        <Input invalid={hasError('cin_passport')} name="cin_passport" value={formData.cin_passport || ''} onChange={handleChange} type="text" />
                                    </div>
                                    <div>
                                        <label className="label">{t('u.scan_d_identit')}</label>
                                        {formData.scan_cin && !files.scan_cin && (
                                            <a href={formData.scan_cin} target="_blank" rel="noreferrer" className="text-xs font-bold mb-2 inline-flex items-center gap-1" style={{ color: 'var(--primary-container)' }}>
                                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                {t('u.voir_le_scan_actuel')}
                                            </a>
                                        )}
                                        <FileField label={t('u.glisser_un_fichier_ou_parcourir')} isLabelHidden value={files.scan_cin} onChange={(file) => setFile('scan_cin', file)} accept="image/*,.pdf" placeholder={t('u.tlcharger_un_nouveau_document')} />
                                    </div>
                                </div>
                            </div>
                        </div>

                    {/* Section 3: Rental History */}
                    <Table
                        caption={t('u.historique')}
                        rows={contracts.slice(0, 5)}
                        emptyTitle={t('u.aucun_contrat_trouv_pour_ce_clie')}
                        columns={[
                            { key: 'vehicle_name', label: t('u.vhicule'), className: 'font-semibold' },
                            {
                                key: 'formatted_dates', label: t('u.priode'),
                                render: (_, contract) => (
                                    <div>
                                        <p className="text-xs">
                                            {contract.formatted_dates?.range || `${formatDate(contract.date_sortie)} - ${formatDate(contract.date_retour_prevue)}`}
                                        </p>
                                        <p className="text-label-sm font-normal text-text-muted">{t('contracts.days', { n: contract.jours })}</p>
                                    </div>
                                ),
                            },
                            { key: 'montant_total', label: t('u.revenu'), align: 'right', className: 'font-bold', render: (v) => formatMoney(v) },
                            { key: 'statut', label: t('u.statut'), align: 'right', render: (v) => <StatusBadge status={v} /> },
                        ]}
                    />
                </form>

                {/* Right Column: Sidebar */}
                <div className="space-y-6">
                    {/* Client Profile Summary */}
                    <Card padding={6} variant="default" className="flex flex-col items-center text-center">
                        <div className="relative mb-5">
                            <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'var(--primary-container)', color: '#fff' }}>
                                <span className="material-symbols-outlined text-4xl">person</span>
                            </div>
                            <div className="absolute bottom-1 end-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white" style={{ background: 'var(--success)', color: '#fff' }}>
                                <span className="material-symbols-outlined text-[14px]">verified</span>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--on-surface)' }}>{formData.prenom} {formData.nom}</h3>
                        <p className="text-xs mb-5" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                            {formData.email || t('u.aucun_email_renseign')}
                        </p>
                        <div className="flex gap-2 mb-6">
                            <span className="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>{t('u.vrifi')}</span>
                            <span className="text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider" style={{ background: 'var(--info-bg)', color: 'var(--primary-container)' }}>{t('u.client')}</span>
                        </div>
                        <div className="w-full grid grid-cols-2 gap-4 text-start border-t pt-6" style={{ borderColor: 'var(--stroke)' }}>
                            <div>
                                <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>{t('u.total_dpens')}</p>
                                <p className="text-lg font-extrabold" style={{ color: 'var(--primary-container)' }}>{totalSpent.toLocaleString()} MAD</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>{t('u.locations')}</p>
                                <p className="text-lg font-extrabold" style={{ color: 'var(--on-surface)' }}>{rentalCount}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>{t('u.points_fidlit')}</p>
                                <p className="text-lg font-extrabold" style={{ color: 'var(--on-surface)' }}>{Math.floor(totalSpent / 100)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>{t('u.profil_risque')}</p>
                                <p className="text-lg font-extrabold" style={{ color: formData.liste_noire ? 'var(--danger)' : 'var(--success)' }}>
                                    {formData.liste_noire ? t('u.bloqu') : t('u.faible')}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Internal Notes */}
                    <Card padding={6} variant="default">
                        <h3 className="font-bold text-[14px] mb-4" style={{ color: 'var(--on-surface)' }}>{t('u.notes_de_gestion_interne')}</h3>
                        <Textarea invalid={hasError('remarques')}
                            name="remarques"
                            value={formData.remarques || ''}
                            onChange={handleChange}
                           
                            placeholder={t('u.ajoutez_des_notes_confidentielle')}
                            rows="4"
                        ></Textarea>
                    </Card>

                    {/* Blacklist Toggle */}
                    <div className="card shadow-l1 p-6" style={formData.liste_noire ? { background: 'var(--danger-bg)', borderColor: 'var(--danger)' } : {}}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-extrabold" style={{ color: formData.liste_noire ? 'var(--danger)' : 'var(--on-surface)' }}>{t('u.liste_noire_2')}</h3>
                                <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>{t('u.bloquer_les_futures_locations')}</p>
                            </div>
                            <Switch label={t('u.liste_noire_2')} isLabelHidden value={Boolean(formData.liste_noire)} onChange={(v) => handleChange({ target: { name: 'liste_noire', type: 'checkbox', checked: v } })} />
                        </div>
                    </div>

                    {/* Historique des modifications */}
                    <Card padding={6} variant="default">
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-slate-600">{t('u.historique')}</h3>
                        <AuditTimeline model="client" id={id} />
                    </Card>

                    {/* Danger Zone */}
                    <div className="rounded-lg p-6 border" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)' }}>
                        <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--danger)' }}>
                            <span className="material-symbols-outlined text-[20px]">warning</span>
                            <h3 className="text-sm font-bold uppercase tracking-wider">{t('u.zone_de_danger')}</h3>
                        </div>
                        <p className="text-xs mb-6" style={{ color: 'var(--danger)', opacity: 0.7 }}>
                            {t('u.la_suppression_d_un_client_archi')}
                        </p>
                        <Button variant="danger" icon="delete" className="w-full" onClick={handleDelete}>{t('u.supprimer_le_profil_client')}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditClient;
