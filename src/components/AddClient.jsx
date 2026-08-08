import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const AddClient = () => {
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
        remarques: ''
    });
    const [files, setFiles] = useState({
        scan_cin: null,
        scan_permis: null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const { name, files: selectedFiles } = e.target;
        if (selectedFiles.length > 0) {
            setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
            navigate('/clients');
        } catch (err) {
            console.error("Error creating client:", err);
            setError(err.response?.data ? JSON.stringify(err.response.data) : "Une erreur est survenue lors de la création du client.");
            setLoading(false);
        }
    };

    return (
        <div className="p-0">
            {/* Page Header & Actions */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <nav className="flex text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 gap-2">
                        <button onClick={() => navigate('/clients')} className="hover:text-indigo-650">Clients</button>
                        <span>/</span>
                        <span className="text-slate-600">Ajouter un nouveau client</span>
                    </nav>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ajouter un Client</h1>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => navigate('/clients')}
                        className="px-6 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl shadow-md shadow-indigo-200/50 hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Enregistrement...' : 'Enregistrer le Client'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg">
                    {error}
                </div>
            )}

            {/* Content Grid */}
            <div className="grid grid-cols-12 gap-8">
                {/* Left Column: Primary Form */}
                <div className="col-span-8 space-y-8">
                    {/* Section: Personal Information */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                                <h2 className="text-lg font-extrabold text-slate-900">Informations Personnelles</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Prénom</label>
                                    <input 
                                        name="prenom"
                                        value={formData.prenom}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                        placeholder="ex. Jonathan" 
                                        type="text"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nom</label>
                                    <input 
                                        name="nom"
                                        value={formData.nom}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                        placeholder="ex. Wick" 
                                        type="text"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">CIN / Passeport</label>
                                    <input 
                                        name="cin_passport"
                                        value={formData.cin_passport}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                        placeholder="ex. AB123456" 
                                        type="text"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Adresse Email</label>
                                    <input 
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                        placeholder="jonathan.wick@example.com" 
                                        type="email"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Numéro de Téléphone</label>
                                    <input 
                                        name="telephone"
                                        value={formData.telephone}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                        placeholder="+212 600-000000" 
                                        type="tel"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Sexe</label>
                                    <select 
                                        name="sexe"
                                        value={formData.sexe}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200"
                                    >
                                        <option value="">-- Sélectionner --</option>
                                        <option value="HOMME">Homme</option>
                                        <option value="FEMME">Femme</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nationalité</label>
                                    <input 
                                        name="nationalite"
                                        value={formData.nationalite}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                        placeholder="ex. Marocaine" 
                                        type="text"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Ville</label>
                                    <input 
                                        name="ville"
                                        value={formData.ville}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                        placeholder="ex. Casablanca" 
                                        type="text"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Pays</label>
                                    <input 
                                        name="pays"
                                        value={formData.pays}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                        placeholder="ex. Maroc" 
                                        type="text"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2 pt-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Adresse Résidentielle</label>
                                    <textarea 
                                        name="adresse"
                                        value={formData.adresse}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200 resize-none" 
                                        placeholder="Rue, Numéro, Ville, Code Postal" 
                                        rows="3"
                                    ></textarea>
                                </div>
                            </div>
                        </section>

                        {/* Section: Identity Documents */}
                        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                                <h2 className="text-lg font-extrabold text-slate-900">Documents d'Identité</h2>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Numéro du Permis de Conduire</label>
                                    <div className="relative">
                                        <input 
                                            name="permis_conduite"
                                            value={formData.permis_conduite}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 pl-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                            placeholder="AB12345678" 
                                            type="text"
                                        />
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">badge</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Date de délivrance du permis</label>
                                    <div className="relative">
                                        <input 
                                            name="date_delivrance_permis"
                                            value={formData.date_delivrance_permis}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 pl-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                            type="date"
                                        />
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">calendar_today</span>
                                    </div>
                                </div>
                                <div className="col-span-2 mt-4 grid grid-cols-2 gap-6">
                                    {/* Scan Permis */}
                                    <label className="border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-indigo-600">drive_eta</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800">Scan du Permis</p>
                                        <p className="text-xs text-slate-400 mt-1">{files.scan_permis ? files.scan_permis.name : "Cliquez pour télécharger"}</p>
                                        <input type="file" name="scan_permis" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                    </label>
                                    
                                    {/* Scan CIN/Passport */}
                                    <label className="border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-indigo-600">public</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800">Scan CIN / Passeport</p>
                                        <p className="text-xs text-slate-400 mt-1">{files.scan_cin ? files.scan_cin.name : "Cliquez pour télécharger"}</p>
                                        <input type="file" name="scan_cin" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                    </label>
                                </div>
                            </div>
                        </section>
                    </form>
                </div>

                {/* Right Column: Sidebar Actions & Status */}
                <div className="col-span-4 space-y-6">
                    {/* Status Card */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-extrabold text-slate-900 mb-4">Statut d'Enregistrement</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500">État</span>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-full">Nouveau</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500">Type</span>
                                <span className="text-xs font-extrabold text-slate-900">Client Standard</span>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-indigo-650 text-sm">info</span>
                                <span className="text-[11px] font-semibold text-slate-650">Vérification requise</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed italic">Le client sera invité à compléter la vérification KYC par e-mail une fois enregistré.</p>
                        </div>
                    </div>

                    {/* Quick Insights */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-xs font-bold font-label text-slate-400 uppercase tracking-widest mb-6">Liste de contrôle de sécurité</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                <div className="text-xs">
                                    <p className="font-bold text-on-surface">Infos Personnelles</p>
                                    <p className="text-slate-400 mt-0.5">Coordonnées de base</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-slate-300">circle</span>
                                <div className="text-xs">
                                    <p className="font-bold text-on-surface">Document d'identité Valide</p>
                                    <p className="text-slate-400 mt-0.5">Date d'expiration valide</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-slate-300">circle</span>
                                <div className="text-xs">
                                    <p className="font-bold text-on-surface">Méthode de Paiement</p>
                                    <p className="text-slate-400 mt-0.5">Carte requise plus tard</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddClient;
