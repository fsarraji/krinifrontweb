import { tNow } from '../i18n/runtime';
import { toast } from './Toast';
import MoneyInput from './ui/MoneyInput';
import ErrorBanner from './ui/ErrorBanner';
import Field from './ui/Field';
import FileField from './ui/FileField';
import Card from './ui/Card';
import { Switch, CheckboxInput } from '@astryxdesign/core';
import Button from './ui/Button';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core';
import { Input, Textarea } from './ui/Input';
import GeofenceManager from './GeofenceManager';
import React, { useState, useEffect } from 'react';
import Dropdown from './Dropdown';
import api from '../api';
import { formatMoney } from '../utils/formatters';
import { jwtDecode } from 'jwt-decode';
import { optimizeImageFile } from '../utils/imageUtils';
import { useI18n } from '../i18n/context';

// Interrupteur Astryx ; onChange reçoit un pseudo-événement ({ target: { checked } }) comme avant.
const ToggleSwitch = ({ checked, onChange, disabled, label }) => (
    <Switch
        label={label || ' '}
        isLabelHidden
        value={Boolean(checked)}
        isDisabled={disabled}
        onChange={(next) => onChange({ target: { checked: next } })}
    />
);

// Carte de section et message d'erreur : définis hors du composant (sinon recréés à chaque rendu,
// ce qui fait perdre le focus des champs).
const SectionCard = ({ icon, title, description, isOwner, children }) => {
    const { t } = useI18n();
    return (
        <Card padding={0} variant="default">
            <div className="p-6 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl">
                <h2 className="text-xl font-extrabold font-headline text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">{icon}</span>
                    {title}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    {description}
                    {!isOwner && <span className="font-bold text-danger ms-1">{t('u.seul_le_propritaire_peut_modifie')}</span>}
                </p>
            </div>
            <div className="p-6 space-y-6">{children}</div>
        </Card>
    );
};

const Message = ({ msg }) => (msg.type === 'error' ? <ErrorBanner message={msg.text} /> : null);


const Settings = () => {
    const { t } = useI18n();
    const [settings, setSettings] = useState({
        nom_agence: '',
        adresse: '',
        ville: '',
        telephone: '',
        email: '',
        caution_active: true,
        caution_montant: 1500,
        tva_rate: 20,
        km_extra_active: true,
        km_par_jour: 250,
        km_tarif_extra_defaut: 1.5,
        logo: null,
        cachet_signature: null,
        traccar_url: '',
        traccar_username: '',
    });
    const [traccarPassword, setTraccarPassword] = useState('');
    const [traccarPasswordSet, setTraccarPasswordSet] = useState(false);
    const [traccarConfigured, setTraccarConfigured] = useState(false);
    const [clearTraccarPassword, setClearTraccarPassword] = useState(false);
    const [logoFile, setLogoFile] = useState(null);
    const [cachetFile, setCachetFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [allBrands, setAllBrands] = useState([]);
    const [selectedBrands, setSelectedBrands] = useState([]);

    const [activeTab, setActiveTab] = useState('agency');
    const [accountLoading, setAccountLoading] = useState(true);
    const [accountSaving, setAccountSaving] = useState(false);
    const [account, setAccount] = useState({ username: '', email: '', first_name: '', last_name: '' });
    const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });
    const [accountMessage, setAccountMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUserRole(decoded.role || '');
            } catch (err) {
                console.error("Token decode error:", err);
            }
        }
        fetchSettings();
        fetchAccount();
    }, []);

    const fetchSettings = async () => {
        try {
            const [res, brandsRes] = await Promise.all([
                api.get('agency/settings/'),
                api.get('brands/', { params: { all: 1 } }).catch(() => ({ data: [] })),
            ]);
            setSettings({
                nom_agence: res.data.nom_agence || '',
                adresse: res.data.adresse || '',
                ville: res.data.ville || '',
                telephone: res.data.telephone || '',
                email: res.data.email || '',
                caution_active: res.data.caution_active,
                caution_montant: parseFloat(res.data.caution_montant),
                tva_rate: res.data.tva_rate != null ? parseFloat(res.data.tva_rate) : 20,
                km_extra_active: res.data.km_extra_active,
                km_par_jour: parseInt(res.data.km_par_jour),
                km_tarif_extra_defaut: parseFloat(res.data.km_tarif_extra_defaut),
                logo: res.data.logo,
                cachet_signature: res.data.cachet_signature,
                traccar_url: res.data.traccar_url || '',
                traccar_username: res.data.traccar_username || '',
            });
            setTraccarPasswordSet(!!res.data.traccar_password_set);
            setTraccarConfigured(!!res.data.traccar_configured);
            setAllBrands(brandsRes.data.results || brandsRes.data || []);
            setSelectedBrands((res.data.brands || []).map(String));
        } catch (error) {
            console.error("Error fetching settings:", error);
            setMessage({ text: tNow('u.erreur_lors_du_chargement_des_pa'), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchAccount = async () => {
        try {
            const res = await api.get('users/me/');
            setAccount({
                username: res.data.username || '',
                email: res.data.email || '',
                first_name: res.data.first_name || '',
                last_name: res.data.last_name || '',
            });
        } catch (error) {
            console.error("Error fetching account:", error);
            setAccountMessage({ text: tNow('u.erreur_lors_du_chargement_du_com'), type: 'error' });
        } finally {
            setAccountLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        try {
            const formData = new FormData();
            Object.keys(settings).forEach(key => {
                if (key !== 'logo' && key !== 'cachet_signature' && settings[key] != null) {
                    formData.append(key, settings[key]);
                }
            });
            if (traccarPassword.trim()) formData.append('traccar_password', traccarPassword.trim());
            if (clearTraccarPassword) formData.append('traccar_clear_password', 'true');
            selectedBrands.forEach(id => formData.append('brands', id));
            if (logoFile) {
                formData.append('logo', logoFile);
            }
            if (cachetFile) {
                formData.append('cachet_signature', cachetFile);
            }

            const res = await api.put('agency/settings/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Mettre à jour les images si elles ont été changées par le backend
            if (res.data.logo) {
                setSettings(prev => ({ ...prev, logo: res.data.logo }));
            }
            if (res.data.cachet_signature) {
                setSettings(prev => ({ ...prev, cachet_signature: res.data.cachet_signature }));
            }
            setLogoFile(null); // Reset the file input state
            setCachetFile(null); // Reset the file input state
            setTraccarPasswordSet(!!res.data.traccar_password_set);
            setTraccarConfigured(!!res.data.traccar_configured);
            setTraccarPassword('');
            setClearTraccarPassword(false);

            toast.success(t('u.paramtres_sauvegards_avec_succs'));
        } catch (error) {
            console.error("Error saving settings:", error);
            setMessage({ text: t('u.erreur_lors_de_la_sauvegarde_non'), type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleAccountSave = async (e) => {
        e.preventDefault();
        setAccountSaving(true);
        setAccountMessage({ text: '', type: '' });

        try {
            const payload = {
                username: account.username.trim(),
                email: account.email.trim(),
                first_name: account.first_name.trim(),
                last_name: account.last_name.trim(),
            };
            if (passwordForm.new_password) {
                payload.current_password = passwordForm.current_password;
                payload.new_password = passwordForm.new_password;
            }
            await api.put('users/me/', payload);
            setPasswordForm({ current_password: '', new_password: '' });
            toast.success(t('u.compte_mis_jour_avec_succs'));
        } catch (error) {
            console.error("Error saving account:", error);
            const data = error.response?.data;
            let msg = t('u.erreur_lors_de_la_mise_jour_du_c');
            if (data) {
                if (typeof data === 'string') msg = data;
                else if (data.detail) msg = data.detail;
                else {
                    const keys = Object.keys(data);
                    if (keys.length > 0) {
                        const first = data[keys[0]];
                        msg = `${keys[0]} : ${Array.isArray(first) ? first[0] : first}`;
                    }
                }
            }
            setAccountMessage({ text: msg, type: 'error' });
        } finally {
            setAccountSaving(false);
        }
    };

    if (loading || accountLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-slate-500 font-semibold animate-pulse">{t('u.chargement_des_paramtres')}</p>
            </div>
        );
    }

    const isOwner = userRole === 'OWNER' || userRole === 'SUPERADMIN';

    return (
        <div className="flex flex-col gap-6">
            {/* Editorial Header Section */}
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">{t('u.configuration')}</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('u.paramtres')}</h2>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                <SegmentedControl label={t('u.configuration')} value={activeTab} onChange={setActiveTab}>
                    <SegmentedControlItem value="agency" label={t('u.agence')} icon={<span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>storefront</span>} />
                    <SegmentedControlItem value="account" label={t('u.compte')} icon={<span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>person</span>} />
            </SegmentedControl>
            </div>

            {activeTab === 'agency' ? (
                <form onSubmit={handleSave} className="space-y-6">
                    <Message msg={message} />

                    {/* Section Informations de l'agence */}
                    <SectionCard isOwner={isOwner} icon="storefront" title={t('u.informations_de_l_agence')} description={t('u.coordonnes_affiches_sur_vos_cont')}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label={t('u.nom_de_l_agence')}>
                                <Input type="text" value={settings.nom_agence} disabled />
                            </Field>
                            <Field label={t('u.email')}>
                                <Input
                                    type="email"
                                    value={settings.email}
                                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                    disabled={!isOwner || saving}
                                    placeholder="contact@agence.com"
                                   
                                />
                            </Field>
                            <Field label={t('u.tlphone')}>
                                <Input
                                    type="tel"
                                    value={settings.telephone}
                                    onChange={(e) => setSettings({ ...settings, telephone: e.target.value })}
                                    disabled={!isOwner || saving}
                                    placeholder="06 00 00 00 00"
                                   
                                />
                            </Field>
                            <Field label={t('u.ville')}>
                                <Input
                                    type="text"
                                    value={settings.ville}
                                    onChange={(e) => setSettings({ ...settings, ville: e.target.value })}
                                    disabled={!isOwner || saving}
                                    placeholder="Casablanca"
                                   
                                />
                            </Field>
                            <Field label={t('u.adresse')} className="md:col-span-2">
                                <Textarea
                                    rows={2}
                                    value={settings.adresse}
                                    onChange={(e) => setSettings({ ...settings, adresse: e.target.value })}
                                    disabled={!isOwner || saving}
                                    placeholder={t('u.adresse_complte_de_l_agence')}
                                   
                                />
                            </Field>
                        </div>
                    </SectionCard>

                    {/* Section Caution */}
                    <SectionCard isOwner={isOwner} icon="security" title={t('u.gestion_de_la_caution')} description={t('u.dfinissez_si_les_locations_ncess')}>
                        <Card padding={4} variant="muted" className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-800">{t('u.activer_la_caution')}</h3>
                                <p className="text-xs text-slate-500 mt-1">{t('u.si_dsactive_aucune_caution_ne_se')}</p>
                            </div>
                            <ToggleSwitch
                                checked={settings.caution_active}
                                onChange={(e) => setSettings({ ...settings, caution_active: e.target.checked })}
                                disabled={!isOwner || saving}
                            />
                        </Card>

                        <Field label={t('u.montant_de_la_caution_mad')} className={`transition-all duration-300 ${!settings.caution_active ? 'opacity-40 pointer-events-none' : ''}`}>
                            <MoneyInput
                                min="0" step="100"
                                value={settings.caution_montant}
                                onChange={(e) => setSettings({ ...settings, caution_montant: e.target.value })}
                                disabled={!isOwner || saving || !settings.caution_active}
                            />
                        </Field>
                    </SectionCard>

                    {/* Section TVA / Facturation */}
                    <SectionCard isOwner={isOwner} icon="receipt_long" title={t('u.facturation_tva')} description={t('u.taux_de_tva_appliqu_aux_factures')}>
                        <Field label={t('u.taux_de_tva')}>
                            <Input
                                type="number" min="0" max="100" step="0.01" suffix="%"
                                value={settings.tva_rate}
                                onChange={(e) => setSettings({ ...settings, tva_rate: e.target.value })}
                                disabled={!isOwner || saving}
                            />
                        </Field>
                    </SectionCard>

                    {/* Section Kilométrage */}
                    <SectionCard isOwner={isOwner} icon="speed" title={t('u.kilomtrage_inclus_supplment')} description={t('u.dfinissez_le_nombre_de_km_inclus')}>
                        <Card padding={4} variant="muted" className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-800">{t('u.activer_la_facturation_des_km_su')}</h3>
                                <p className="text-xs text-slate-500 mt-1">{t('u.si_dsactiv_le_kilomtrage_sera_il')}</p>
                            </div>
                            <ToggleSwitch
                                checked={settings.km_extra_active}
                                onChange={(e) => setSettings({ ...settings, km_extra_active: e.target.checked })}
                                disabled={!isOwner || saving}
                            />
                        </Card>

                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300 ${!settings.km_extra_active ? 'opacity-40 pointer-events-none' : ''}`}>
                            <Field label={t('u.km_inclus_par_jour')} hint={t('u.dfaut_recommand_250_km_jour')}>
                                <Input
                                    type="number" min="0" step="10" suffix="km"
                                    value={settings.km_par_jour}
                                    onChange={(e) => setSettings({ ...settings, km_par_jour: e.target.value })}
                                    disabled={!isOwner || saving || !settings.km_extra_active}
                                />
                            </Field>
                            <Field label={t('u.tarif_par_km_supplmentaire_mad')} hint={t('u.tarif_par_dfaut_pour_tous_les_vh')}>
                                <MoneyInput
                                    step="0.5"
                                    value={settings.km_tarif_extra_defaut}
                                    onChange={(e) => setSettings({ ...settings, km_tarif_extra_defaut: e.target.value })}
                                    disabled={!isOwner || saving || !settings.km_extra_active}
                                />
                            </Field>
                        </div>

                        {/* Preview calculation */}
                        {settings.km_extra_active && (
                            <Card padding={4} variant="muted">
                                <p className="text-xs font-bold text-primary-deep uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">info</span>
                                    {t('u.exemple_de_calcul_3_jours_900_km')}
                                </p>
                                <div className="space-y-1 text-xs text-primary">
                                    <p>{t('u.km_inclus_km_j_3_jours', { perDay: settings.km_par_jour })} = <strong>{settings.km_par_jour * 3} {t('veh.kmUnit')}</strong></p>
                                    <p>{t('u.km_parcourus_900_km')}</p>
                                    {900 > settings.km_par_jour * 3 ? (
                                        <p className="text-orange-600 font-bold">{t('u.dpassement_km_mad_de_supplment', { km: 900 - settings.km_par_jour * 3, rate: settings.km_tarif_extra_defaut, total: formatMoney((900 - settings.km_par_jour * 3) * settings.km_tarif_extra_defaut) })}</p>
                                    ) : (
                                        <p className="text-success font-bold">{t('u.aucun_dpassement_inclus_dans_le_')}</p>
                                    )}
                                </div>
                            </Card>
                        )}
                    </SectionCard>

                    {/* Zones autorisées (géorepérage) */}
                    <GeofenceManager canEdit={isOwner} />

                    {/* Section Suivi GPS / Traccar */}
                    <SectionCard isOwner={isOwner} icon="satellite_alt" title={t('u.suivi_gps_traccar')} description={t('u.connectez_le_compte_serveur_trac')}>
                        <div className={`flex items-center gap-2 mb-4 text-sm font-bold ${traccarConfigured ? 'text-success' : 'text-danger'}`}>
                            <span className="material-symbols-outlined text-base">{traccarConfigured ? 'check_circle' : 'cancel'}</span>
                            {traccarConfigured ? t('u.compte_traccar_connect') : t('u.compte_traccar_non_configur')}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                            <Field label={t('u.url_du_serveur')}>
                                <Input
                                    type="url"
                                    value={settings.traccar_url}
                                    onChange={(e) => setSettings(prev => ({ ...prev, traccar_url: e.target.value }))}
                                    placeholder="http://serveur-traccar:8082"
                                    disabled={!isOwner || saving}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                />
                            </Field>
                            <Field label={t('u.utilisateur')}>
                                <Input
                                    type="text"
                                    value={settings.traccar_username}
                                    onChange={(e) => setSettings(prev => ({ ...prev, traccar_username: e.target.value }))}
                                    placeholder={t('u.utilisateur_traccar')}
                                    disabled={!isOwner || saving}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                />
                            </Field>
                            <Field label={t('u.mot_de_passe')}>
                                <Input
                                    type="password"
                                    value={traccarPassword}
                                    onChange={(e) => setTraccarPassword(e.target.value)}
                                    placeholder={traccarPasswordSet ? t('u.laisser_vide_pour_conserver') : t('u.mot_de_passe_traccar')}
                                    disabled={!isOwner || saving}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                />
                            </Field>
                            {traccarPasswordSet && (
                                <div className="flex items-end pb-1">
                                    <CheckboxInput label={t('u.effacer_le_mot_de_passe_enregist')} value={clearTraccarPassword} onChange={(c) => setClearTraccarPassword(c)} isDisabled={!isOwner || saving} />
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    {/* Section Marques affichées */}
                    <SectionCard isOwner={isOwner} icon="directions_car" title={t('u.marques_affiches')} description={t('u.slectionnez_les_marques_afficher')}>
                        {allBrands.length === 0 ? (
                            <p className="text-sm text-slate-400">{t('u.aucune_marque_disponible')}</p>
                        ) : (
                            <Dropdown
                                isMulti
                                isSearchable
                                options={allBrands.map(b => ({ value: String(b.id), label: b.name }))}
                                value={selectedBrands}
                                onChange={(vals) => setSelectedBrands((vals || []).map(String))}
                                isDisabled={!isOwner || saving}
                                placeholder={t('u.rechercher_et_slectionner_les_ma')}
                                noOptionsMessage={() => t('u.aucune_marque')}
                                aria-label={t('u.marques_affiches')}
                            />
                        )}
                        {selectedBrands.length > 0 && (
                            <p className="text-xs text-slate-500 mt-3 ms-1">
                                <span className="font-bold text-primary">{selectedBrands.length}</span> marque(s) sélectionnée(s) pour l'affichage.
                            </p>
                        )}
                    </SectionCard>

                    {/* Section Branding / Cachet */}
                    <SectionCard isOwner={isOwner} icon="verified" title={t('u.branding_et_documents')} description={t('u.configurez_les_lments_visuels_de')}>
                        <div className="grid grid-cols-1 gap-8">
                            {/* Logo */}
                            <div>
                                <p className="text-xs text-slate-500 mb-4">{t('u.ce_logo_sera_utilis_sur_vos_cont')}</p>

                                <div className="flex items-center gap-6">
                                    {/* Preview box */}
                                    <div className="w-48 h-32 bg-white border border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden">
                                        {logoFile ? (
                                            <img src={URL.createObjectURL(logoFile)} alt="Logo preview" className="max-w-full max-h-full object-contain p-2" />
                                        ) : settings.logo ? (
                                            <img src={settings.logo} alt={t('u.logo_actuel')} className="max-w-full max-h-full object-contain p-2" />
                                        ) : (
                                            <div className="text-center text-slate-400">
                                                <span className="material-symbols-outlined text-3xl">image</span>
                                                <p className="text-[10px] mt-1 font-semibold uppercase">{t('u.aucun_logo')}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload button */}
                                    <div className="flex-1">
                                        <FileField
                                            label={t('u.logo_de_l_agence')}
                                            value={logoFile}
                                            onChange={async (file) => setLogoFile(file ? await optimizeImageFile(file) : null) }
                                            accept=".png,.jpg,.jpeg"
                                            placeholder={logoFile ? t('u.changer_le_logo') : t('u.importer_un_logo_png_jpg')}
                                            disabled={!isOwner || saving}
                                        />
                                        {logoFile && (
                                            <p className="text-xs text-primary font-bold mt-2 ms-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                {t('u.fichier_prt_tre_sauvegard')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Cachet & Signature */}
                            <div>
                                <p className="text-xs text-slate-500 mb-4">{t('u.cette_image_idalement_au_format_')}</p>

                                <div className="flex items-center gap-6">
                                    {/* Preview box */}
                                    <div className="w-48 h-32 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden">
                                        {cachetFile ? (
                                            <img src={URL.createObjectURL(cachetFile)} alt="Cachet preview" className="max-w-full max-h-full object-contain p-2" />
                                        ) : settings.cachet_signature ? (
                                            <img src={settings.cachet_signature} alt={t('u.cachet_actuel')} className="max-w-full max-h-full object-contain p-2" />
                                        ) : (
                                            <div className="text-center text-slate-400">
                                                <span className="material-symbols-outlined text-3xl">image</span>
                                                <p className="text-[10px] mt-1 font-semibold uppercase">{t('u.aucun_cachet')}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload button */}
                                    <div className="flex-1">
                                        <FileField
                                            label={t('u.cachet_signature_de_l_agence')}
                                            value={cachetFile}
                                            onChange={async (file) => setCachetFile(file ? await optimizeImageFile(file) : null) }
                                            accept=".png,.jpg,.jpeg"
                                            placeholder={cachetFile ? t('u.changer_l_image') : t('u.importer_un_cachet_png_jpg')}
                                            disabled={!isOwner || saving}
                                        />
                                        {cachetFile && (
                                            <p className="text-xs text-primary font-bold mt-2 ms-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                {t('u.fichier_prt_tre_sauvegard')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Save button */}
                    {isOwner && (
                        <div className="flex justify-end pt-2">
                            <Button type="submit" icon="save" loading={saving}>{saving ? t('u.sauvegarde_en_cours') : t('u.enregistrer_toutes_les_modificat')}</Button>
                        </div>
                    )}
                </form>
            ) : (
                <form onSubmit={handleAccountSave} className="space-y-6">
                    <Message msg={accountMessage} />

                    {/* Section Informations du compte */}
                    <SectionCard isOwner={isOwner} icon="person" title={t('u.informations_du_compte')} description={t('u.modifiez_les_informations_de_vot')}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label={t('u.nom_d_utilisateur')}>
                                <Input
                                    type="text"
                                    value={account.username}
                                    onChange={(e) => setAccount({ ...account, username: e.target.value })}
                                    placeholder={t('u.nom_d_utilisateur')}
                                   
                                />
                            </Field>
                            <Field label={t('u.email')}>
                                <Input
                                    type="email"
                                    value={account.email}
                                    onChange={(e) => setAccount({ ...account, email: e.target.value })}
                                    placeholder="email@exemple.com"
                                   
                                />
                            </Field>
                            <Field label={t('u.prnom')}>
                                <Input
                                    type="text"
                                    value={account.first_name}
                                    onChange={(e) => setAccount({ ...account, first_name: e.target.value })}
                                    placeholder={t('u.prnom')}
                                   
                                />
                            </Field>
                            <Field label={t('u.nom')}>
                                <Input
                                    type="text"
                                    value={account.last_name}
                                    onChange={(e) => setAccount({ ...account, last_name: e.target.value })}
                                    placeholder={t('u.nom')}
                                   
                                />
                            </Field>
                        </div>
                    </SectionCard>

                    {/* Section Mot de passe */}
                    <SectionCard isOwner={isOwner} icon="lock" title={t('u.changer_le_mot_de_passe')} description={t('u.laissez_ces_champs_vides_pour_co')}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label={t('u.mot_de_passe_actuel')}>
                                <Input
                                    type="password"
                                    value={passwordForm.current_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                    placeholder={t('u.mot_de_passe_actuel')}
                                   
                                />
                            </Field>
                            <Field label={t('u.nouveau_mot_de_passe')}>
                                <Input
                                    type="password"
                                    value={passwordForm.new_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                    placeholder={t('u.nouveau_mot_de_passe')}
                                   
                                />
                            </Field>
                        </div>
                    </SectionCard>

                    {/* Save button */}
                    <div className="flex justify-end pt-2">
                        <Button type="submit" icon="save" loading={accountSaving}>{accountSaving ? t('u.sauvegarde_en_cours') : t('u.enregistrer_le_compte')}</Button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default Settings;
