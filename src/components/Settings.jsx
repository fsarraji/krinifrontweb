import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import api from '../api';
import { jwtDecode } from 'jwt-decode';

const ToggleSwitch = ({ checked, onChange, disabled }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
    </label>
);

const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200 disabled:bg-slate-50 disabled:text-slate-500";

const fieldLabel = "block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2";

const Settings = () => {
    const [settings, setSettings] = useState({
        nom_agence: '',
        adresse: '',
        ville: '',
        telephone: '',
        email: '',
        caution_active: true,
        caution_montant: 1500,
        km_extra_active: true,
        km_par_jour: 250,
        km_tarif_extra_defaut: 1.5,
        cachet_signature: null,
    });
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
                km_extra_active: res.data.km_extra_active,
                km_par_jour: parseInt(res.data.km_par_jour),
                km_tarif_extra_defaut: parseFloat(res.data.km_tarif_extra_defaut),
                cachet_signature: res.data.cachet_signature,
            });
            setAllBrands(brandsRes.data.results || brandsRes.data || []);
            setSelectedBrands((res.data.brands || []).map(String));
        } catch (error) {
            console.error("Error fetching settings:", error);
            setMessage({ text: 'Erreur lors du chargement des paramètres.', type: 'error' });
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
            setAccountMessage({ text: 'Erreur lors du chargement du compte.', type: 'error' });
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
                if (key !== 'cachet_signature' && settings[key] != null) {
                    formData.append(key, settings[key]);
                }
            });
            selectedBrands.forEach(id => formData.append('brands', id));
            if (cachetFile) {
                formData.append('cachet_signature', cachetFile);
            }

            const res = await api.put('agency/settings/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Mettre à jour l'image si elle a été changée par le backend
            if (res.data.cachet_signature) {
                setSettings(prev => ({ ...prev, cachet_signature: res.data.cachet_signature }));
            }
            setCachetFile(null); // Reset the file input state

            setMessage({ text: 'Paramètres sauvegardés avec succès.', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error("Error saving settings:", error);
            setMessage({ text: "Erreur lors de la sauvegarde (Non autorisé ou erreur serveur).", type: 'error' });
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
            setAccountMessage({ text: 'Compte mis à jour avec succès.', type: 'success' });
            setTimeout(() => setAccountMessage({ text: '', type: '' }), 3000);
        } catch (error) {
            console.error("Error saving account:", error);
            const data = error.response?.data;
            let msg = "Erreur lors de la mise à jour du compte.";
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
                <p className="text-slate-500 font-semibold animate-pulse">Chargement des paramètres...</p>
            </div>
        );
    }

    const isOwner = userRole === 'OWNER' || userRole === 'SUPERADMIN';

    const SectionCard = ({ icon, title, description, children }) => (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/80">
                <h2 className="text-xl font-extrabold font-headline text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600">{icon}</span>
                    {title}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    {description}
                    {!isOwner && <span className="font-bold text-red-500 ml-1">(Seul le propriétaire peut modifier)</span>}
                </p>
            </div>
            <div className="p-6 space-y-6">{children}</div>
        </div>
    );

    const TabButton = ({ tabKey, icon, label }) => (
        <button
            type="button"
            onClick={() => setActiveTab(tabKey)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2.5 ${
                activeTab === tabKey
                    ? 'text-slate-900 bg-white rounded-lg shadow-sm ring-1 ring-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
        >
            <span className="material-symbols-outlined text-lg">{icon}</span>
            {label}
        </button>
    );

    const Message = ({ msg }) =>
        msg.text ? (
            <div className={`p-4 rounded-xl border font-semibold flex items-center gap-3 ${msg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <span className="material-symbols-outlined">{msg.type === 'success' ? 'check_circle' : 'error'}</span>
                {msg.text}
            </div>
        ) : null;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Editorial Header Section */}
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">Configuration</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Paramètres</h2>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                <TabButton tabKey="agency" icon="storefront" label="Agence" />
                <TabButton tabKey="account" icon="person" label="Compte" />
            </div>

            {activeTab === 'agency' ? (
                <form onSubmit={handleSave} className="space-y-6">
                    <Message msg={message} />

                    {/* Section Informations de l'agence */}
                    <SectionCard icon="storefront" title="Informations de l'agence" description="Coordonnées affichées sur vos contrats et documents officiels.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={fieldLabel}>Nom de l'agence</label>
                                <input type="text" value={settings.nom_agence} disabled className={inputClass} />
                            </div>
                            <div>
                                <label className={fieldLabel}>Email</label>
                                <input
                                    type="email"
                                    value={settings.email}
                                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                    disabled={!isOwner || saving}
                                    placeholder="contact@agence.com"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={fieldLabel}>Téléphone</label>
                                <input
                                    type="tel"
                                    value={settings.telephone}
                                    onChange={(e) => setSettings({ ...settings, telephone: e.target.value })}
                                    disabled={!isOwner || saving}
                                    placeholder="06 00 00 00 00"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={fieldLabel}>Ville</label>
                                <input
                                    type="text"
                                    value={settings.ville}
                                    onChange={(e) => setSettings({ ...settings, ville: e.target.value })}
                                    disabled={!isOwner || saving}
                                    placeholder="Casablanca"
                                    className={inputClass}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className={fieldLabel}>Adresse</label>
                                <textarea
                                    rows={2}
                                    value={settings.adresse}
                                    onChange={(e) => setSettings({ ...settings, adresse: e.target.value })}
                                    disabled={!isOwner || saving}
                                    placeholder="Adresse complète de l'agence"
                                    className={`${inputClass} resize-none`}
                                />
                            </div>
                        </div>
                    </SectionCard>

                    {/* Section Caution */}
                    <SectionCard icon="security" title="Gestion de la Caution" description="Définissez si les locations nécessitent une caution et fixez son montant par défaut.">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-800">Activer la Caution</h3>
                                <p className="text-xs text-slate-500 mt-1">Si désactivée, aucune caution ne sera demandée lors de la création d'un contrat.</p>
                            </div>
                            <ToggleSwitch
                                checked={settings.caution_active}
                                onChange={(e) => setSettings({ ...settings, caution_active: e.target.checked })}
                                disabled={!isOwner || saving}
                            />
                        </div>

                        <div className={`transition-all duration-300 ${!settings.caution_active ? 'opacity-40 pointer-events-none' : ''}`}>
                            <label className={fieldLabel}>Montant de la caution (DH)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">DH</span>
                                <input
                                    type="number" min="0" step="100"
                                    value={settings.caution_montant}
                                    onChange={(e) => setSettings({ ...settings, caution_montant: e.target.value })}
                                    disabled={!isOwner || saving || !settings.caution_active}
                                    className={`${inputClass} pl-12`}
                                />
                            </div>
                        </div>
                    </SectionCard>

                    {/* Section Kilométrage */}
                    <SectionCard icon="speed" title="Kilométrage Inclus & Supplément" description="Définissez le nombre de km inclus par jour et le tarif facturé par km supplémentaire.">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-800">Activer la facturation des km supplémentaires</h3>
                                <p className="text-xs text-slate-500 mt-1">Si désactivé, le kilométrage sera illimité sans supplément.</p>
                            </div>
                            <ToggleSwitch
                                checked={settings.km_extra_active}
                                onChange={(e) => setSettings({ ...settings, km_extra_active: e.target.checked })}
                                disabled={!isOwner || saving}
                            />
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300 ${!settings.km_extra_active ? 'opacity-40 pointer-events-none' : ''}`}>
                            <div>
                                <label className={fieldLabel}>Km inclus par jour</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">KM</span>
                                    <input
                                        type="number" min="0" step="10"
                                        value={settings.km_par_jour}
                                        onChange={(e) => setSettings({ ...settings, km_par_jour: e.target.value })}
                                        disabled={!isOwner || saving || !settings.km_extra_active}
                                        className={`${inputClass} pl-12`}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5 ml-1">Défaut recommandé : 250 km/jour</p>
                            </div>
                            <div>
                                <label className={fieldLabel}>Tarif par km supplémentaire (DH)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">DH</span>
                                    <input
                                        type="number" min="0" step="0.5"
                                        value={settings.km_tarif_extra_defaut}
                                        onChange={(e) => setSettings({ ...settings, km_tarif_extra_defaut: e.target.value })}
                                        disabled={!isOwner || saving || !settings.km_extra_active}
                                        className={`${inputClass} pl-12`}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5 ml-1">Tarif par défaut pour tous les véhicules</p>
                            </div>
                        </div>

                        {/* Preview calculation */}
                        {settings.km_extra_active && (
                            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">info</span>
                                    Exemple de calcul (3 jours, 900 km parcourus)
                                </p>
                                <div className="space-y-1 text-xs text-indigo-600">
                                    <p>• Km inclus : {settings.km_par_jour} km/j × 3 jours = <strong>{settings.km_par_jour * 3} km</strong></p>
                                    <p>• Km parcourus : 900 km</p>
                                    {900 > settings.km_par_jour * 3 ? (
                                        <p className="text-orange-600 font-bold">• Dépassement : {900 - settings.km_par_jour * 3} km × {settings.km_tarif_extra_defaut} DH = <strong>{((900 - settings.km_par_jour * 3) * settings.km_tarif_extra_defaut).toFixed(2)} DH de supplément</strong></p>
                                    ) : (
                                        <p className="text-green-600 font-bold">• Aucun dépassement — inclus dans le forfait ✓</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </SectionCard>

                    {/* Section Marques affichées */}
                    <SectionCard icon="directions_car" title="Marques affichées" description="Sélectionnez les marques à afficher dans les formulaires de véhicule. Aucune sélection = toutes les marques.">
                        {allBrands.length === 0 ? (
                            <p className="text-sm text-slate-400">Aucune marque disponible.</p>
                        ) : (
                            <Select
                                isMulti
                                isSearchable
                                isClearable
                                options={allBrands.map(b => ({ value: String(b.id), label: b.name }))}
                                value={allBrands
                                    .filter(b => selectedBrands.includes(String(b.id)))
                                    .map(b => ({ value: String(b.id), label: b.name }))}
                                onChange={(selected) => setSelectedBrands((selected || []).map(o => o.value))}
                                isDisabled={!isOwner || saving}
                                placeholder="Rechercher et sélectionner les marques..."
                                noOptionsMessage={() => 'Aucune marque'}
                                className="text-sm"
                                classNamePrefix="react-select"
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        backgroundColor: '#f8fafc',
                                        borderColor: '#e2e8f0',
                                        borderRadius: '0.75rem',
                                        fontSize: '0.875rem',
                                        padding: '2px 4px',
                                        minHeight: '46px',
                                    }),
                                    multiValue: (base) => ({
                                        ...base,
                                        backgroundColor: '#eff6ff',
                                        borderRadius: '8px',
                                    }),
                                    multiValueLabel: (base) => ({ ...base, color: '#1d4ed8', fontWeight: '600' }),
                                    multiValueRemove: (base) => ({ ...base, color: '#1d4ed8', ':hover': { backgroundColor: '#dbeafe', color: '#1d4ed8' } }),
                                    menu: (base) => ({ ...base, borderRadius: '0.75rem', overflow: 'hidden' }),
                                    placeholder: (base) => ({ ...base, color: '#94a3b8' }),
                                }}
                            />
                        )}
                        {selectedBrands.length > 0 && (
                            <p className="text-xs text-slate-500 mt-3 ml-1">
                                <span className="font-bold text-indigo-600">{selectedBrands.length}</span> marque(s) sélectionnée(s) pour l'affichage.
                            </p>
                        )}
                    </SectionCard>

                    {/* Section Branding / Cachet */}
                    <SectionCard icon="verified" title="Branding et Documents" description="Configurez les éléments visuels de vos documents officiels.">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className={fieldLabel}>Cachet & Signature de l'Agence</label>
                                <p className="text-xs text-slate-500 mb-4">Cette image (idéalement au format PNG avec fond transparent) sera utilisée sur les contrats de location générés en PDF.</p>

                                <div className="flex items-center gap-6">
                                    {/* Preview box */}
                                    <div className="w-48 h-32 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden">
                                        {cachetFile ? (
                                            <img src={URL.createObjectURL(cachetFile)} alt="Cachet preview" className="max-w-full max-h-full object-contain p-2" />
                                        ) : settings.cachet_signature ? (
                                            <img src={settings.cachet_signature} alt="Cachet actuel" className="max-w-full max-h-full object-contain p-2" />
                                        ) : (
                                            <div className="text-center text-slate-400">
                                                <span className="material-symbols-outlined text-3xl">image</span>
                                                <p className="text-[10px] mt-1 font-semibold uppercase">Aucun cachet</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload button */}
                                    <div className="flex-1">
                                        <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-semibold text-sm cursor-pointer transition-all w-max ${!isOwner || saving ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'bg-white hover:bg-slate-50 border-slate-200 text-indigo-600 hover:border-indigo-300'}`}>
                                            <span className="material-symbols-outlined text-[20px]">upload_file</span>
                                            {cachetFile ? 'Changer l\'image' : 'Importer un cachet (PNG/JPG)'}
                                            <input
                                                type="file"
                                                accept=".png,.jpg,.jpeg"
                                                className="hidden"
                                                disabled={!isOwner || saving}
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setCachetFile(e.target.files[0]);
                                                    }
                                                }}
                                            />
                                        </label>
                                        {cachetFile && (
                                            <p className="text-xs text-indigo-600 font-bold mt-2 ml-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                Fichier prêt à être sauvegardé
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
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200/50 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <><span className="material-symbols-outlined animate-spin text-sm">refresh</span> Sauvegarde en cours...</>
                                ) : (
                                    <><span className="material-symbols-outlined text-sm">save</span> Enregistrer toutes les modifications</>
                                )}
                            </button>
                        </div>
                    )}
                </form>
            ) : (
                <form onSubmit={handleAccountSave} className="space-y-6">
                    <Message msg={accountMessage} />

                    {/* Section Informations du compte */}
                    <SectionCard icon="person" title="Informations du compte" description="Modifiez les informations de votre compte utilisateur.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={fieldLabel}>Nom d'utilisateur</label>
                                <input
                                    type="text"
                                    value={account.username}
                                    onChange={(e) => setAccount({ ...account, username: e.target.value })}
                                    placeholder="Nom d'utilisateur"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={fieldLabel}>Email</label>
                                <input
                                    type="email"
                                    value={account.email}
                                    onChange={(e) => setAccount({ ...account, email: e.target.value })}
                                    placeholder="email@exemple.com"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={fieldLabel}>Prénom</label>
                                <input
                                    type="text"
                                    value={account.first_name}
                                    onChange={(e) => setAccount({ ...account, first_name: e.target.value })}
                                    placeholder="Prénom"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={fieldLabel}>Nom</label>
                                <input
                                    type="text"
                                    value={account.last_name}
                                    onChange={(e) => setAccount({ ...account, last_name: e.target.value })}
                                    placeholder="Nom"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </SectionCard>

                    {/* Section Mot de passe */}
                    <SectionCard icon="lock" title="Changer le mot de passe" description="Laissez ces champs vides pour conserver votre mot de passe actuel.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={fieldLabel}>Mot de passe actuel</label>
                                <input
                                    type="password"
                                    value={passwordForm.current_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                    placeholder="Mot de passe actuel"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={fieldLabel}>Nouveau mot de passe</label>
                                <input
                                    type="password"
                                    value={passwordForm.new_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                    placeholder="Nouveau mot de passe"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </SectionCard>

                    {/* Save button */}
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={accountSaving}
                            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200/50 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {accountSaving ? (
                                <><span className="material-symbols-outlined animate-spin text-sm">refresh</span> Sauvegarde en cours...</>
                            ) : (
                                <><span className="material-symbols-outlined text-sm">save</span> Enregistrer le compte</>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default Settings;
