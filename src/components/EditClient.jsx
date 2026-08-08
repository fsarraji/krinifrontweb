import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { toast } from './Toast';
import { messageBox } from './MessageBox';

const EditClient = () => {
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
                setError("Une erreur est survenue lors de la récupération des données.");
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
    };

    const handleFileChange = (e) => {
        const { name, files: selectedFiles } = e.target;
        if (selectedFiles.length > 0) {
            setFiles(prev => ({ ...prev, [name]: selectedFiles[0] }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
            toast.success('Client mis à jour avec succès.');
            navigate('/clients');
        } catch (err) {
            console.error("Error updating client:", err);
            setError("Erreur lors de la sauvegarde.");
            setSaving(false);
        }
    };

    const handleDelete = () => {
        messageBox.danger("Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.", "Supprimer le client", {
            onConfirm: async () => {
                try {
                    await api.delete(`clients/${id}/`);
                    toast.success('Client supprimé avec succès.');
                    navigate('/clients');
                } catch (err) {
                    console.error("Error deleting client:", err);
                    toast.error("Erreur lors de la suppression.");
                }
            }
        });
    };

    if (loading) return <div className="text-center mt-20 font-bold text-primary">Chargement du profil client...</div>;

    const totalSpent = contracts.reduce((sum, c) => sum + parseFloat(c.montant_total || 0), 0);
    const rentalCount = contracts.length;

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                <div>
                    <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                        <Link to="/clients" className="hover:text-indigo-650 transition-colors">Clients</Link>
                        <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                        <span className="text-slate-900">Modifier le Client</span>
                    </nav>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                        Modifier le Client <span className="text-indigo-600/60 font-light">— {formData.prenom} {formData.nom}</span>
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/clients')}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200/50 disabled:opacity-50"
                    >
                        {saving ? 'Enregistrement...' : 'Sauvegarder'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-sm rounded-r-xl">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Form Sections */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Section 1: Personal Information */}
                    <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                            <span className="material-symbols-outlined text-indigo-655 font-bold">person</span>
                            <h2 className="text-lg font-extrabold text-slate-900">Informations Personnelles</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Prénom</label>
                                <input 
                                    name="prenom"
                                    value={formData.prenom}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                    type="text" 
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nom</label>
                                <input 
                                    name="nom"
                                    value={formData.nom}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                    type="text" 
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Adresse Email</label>
                                <input 
                                    name="email"
                                    value={formData.email || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                    type="email" 
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Numéro de Téléphone</label>
                                <input 
                                    name="telephone"
                                    value={formData.telephone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                    type="tel" 
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Sexe</label>
                                <select 
                                    name="sexe"
                                    value={formData.sexe || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200"
                                >
                                    <option value="">-- Sélectionner --</option>
                                    <option value="HOMME">Homme</option>
                                    <option value="FEMME">Femme</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Nationalité</label>
                                <input 
                                    name="nationalite"
                                    value={formData.nationalite || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                    type="text" 
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Ville</label>
                                <input 
                                    name="ville"
                                    value={formData.ville || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                    type="text" 
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Pays</label>
                                <input 
                                    name="pays"
                                    value={formData.pays || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                    type="text" 
                                />
                            </div>
                            <div className="flex flex-col gap-1.5 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Adresse</label>
                                <input 
                                    name="adresse"
                                    value={formData.adresse}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-1 focus:ring-indigo-600 outline-none transition-all duration-200" 
                                    type="text" 
                                />
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Identity Documents */}
                    <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                            <span className="material-symbols-outlined text-indigo-650 font-bold">badge</span>
                            <h2 className="text-lg font-extrabold text-slate-900">Documents d'Identité</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Drivers License */}
                            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 hover:border-slate-350 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                                            <span className="material-symbols-outlined text-indigo-600">card_membership</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">Permis de Conduire</p>
                                            <p className="text-[10px] text-slate-400">Expire: {formData.date_delivrance_permis || 'Non renseigné'}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 ring-1 ring-emerald-250 font-bold">VÉRIFIÉ</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">N° Permis</label>
                                        <input 
                                            name="permis_conduite"
                                            value={formData.permis_conduite}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650 outline-none transition-all duration-200" 
                                            type="text" 
                                        />
                                    </div>
                                    <div className="flex flex-col border-t border-slate-200 pt-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Scan du permis</label>
                                        {formData.scan_permis && !files.scan_permis && (
                                            <a href={formData.scan_permis} target="_blank" rel="noreferrer" className="text-xs text-indigo-650 font-bold hover:underline mb-2 inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                Voir le scan actuel
                                            </a>
                                        )}
                                        <label className="border border-dashed border-slate-200 bg-white rounded-xl p-3 text-center cursor-pointer hover:bg-slate-50 transition-colors">
                                            <span className="text-xs font-semibold text-indigo-650">
                                                {files.scan_permis ? files.scan_permis.name : "Télécharger un nouveau document"}
                                            </span>
                                            <input type="file" name="scan_permis" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            {/* Passport / CIN */}
                            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 hover:border-slate-350 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                                            <span className="material-symbols-outlined text-indigo-600">public</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">CIN / Passeport</p>
                                            <p className="text-[10px] text-slate-400">Vérification standard</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 ring-1 ring-emerald-250 font-bold">VÉRIFIÉ</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">N° Document</label>
                                        <input 
                                            name="cin_passport"
                                            value={formData.cin_passport}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:border-indigo-655 focus:ring-1 focus:ring-indigo-655 outline-none transition-all duration-200" 
                                            type="text" 
                                        />
                                    </div>
                                    <div className="flex flex-col border-t border-slate-200 pt-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Scan d'identité</label>
                                        {formData.scan_cin && !files.scan_cin && (
                                            <a href={formData.scan_cin} target="_blank" rel="noreferrer" className="text-xs text-indigo-650 font-bold hover:underline mb-2 inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                Voir le scan actuel
                                            </a>
                                        )}
                                        <label className="border border-dashed border-slate-200 bg-white rounded-xl p-3 text-center cursor-pointer hover:bg-slate-50 transition-colors">
                                            <span className="text-xs font-semibold text-indigo-650">
                                                {files.scan_cin ? files.scan_cin.name : "Télécharger un nouveau document"}
                                            </span>
                                            <input type="file" name="scan_cin" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Rental History */}
                    <section className="bg-white p-8 rounded-xl ring-1 ring-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">history</span>
                                <h2 className="text-xl font-bold font-headline text-slate-900">Historique des locations</h2>
                            </div>
                            <Link to="/contracts" className="text-xs font-bold text-primary hover:underline">Voir tous les contrats</Link>
                        </div>
                        <div className="overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                                        <th className="pb-4 px-2">Véhicule</th>
                                        <th className="pb-4 px-2">Période</th>
                                        <th className="pb-4 px-2 text-right">Revenu</th>
                                        <th className="pb-4 px-2 text-right">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {contracts.slice(0, 5).map(contract => (
                                        <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="py-4 px-2 border-t border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-semibold text-slate-900">{contract.vehicle_name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-2 border-t border-slate-100">
                                                <p className="text-xs text-slate-900">
                                                    {contract.formatted_dates?.range || `${new Date(contract.date_sortie).toLocaleDateString()} - ${new Date(contract.date_retour_prevue).toLocaleDateString()}`}
                                                </p>
                                                <p className="text-[10px] text-slate-500">{contract.jours} Jours</p>
                                            </td>
                                            <td className="py-4 px-2 border-t border-slate-100 text-right font-bold text-primary">{contract.montant_total} MAD</td>
                                            <td className="py-4 px-2 border-t border-slate-100 text-right">
                                                <span className={`text-[10px] px-2 py-1 rounded font-bold ${
                                                    contract.statut === 'TERMINE' ? 'bg-slate-100 text-slate-600' : 
                                                    contract.statut === 'EN_COURS' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {contract.statut}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {contracts.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="py-8 text-center text-slate-400 italic">Aucun contrat trouvé pour ce client.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    {/* Client Profile Summary */}
                    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center">
                        <div className="relative mb-6">
                            <div className="w-28 h-28 rounded-full ring-4 ring-indigo-50 p-1 bg-slate-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-indigo-600">person</span>
                            </div>
                            <div className="absolute bottom-1 right-1 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center border-4 border-white">
                                <span className="material-symbols-outlined text-[16px] font-bold">verified</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-1">{formData.prenom} {formData.nom}</h3>
                        <p className="text-xs text-slate-400 mb-6">Inscrit le {new Date().getFullYear() - 1}</p>
                        
                        <div className="flex gap-2 mb-8">
                            <span className="text-[10px] px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 font-bold tracking-wider uppercase">VÉRIFIÉ</span>
                            <span className="text-[10px] px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 font-bold tracking-wider uppercase">PREMIUM</span>
                        </div>

                        <div className="w-full grid grid-cols-2 gap-4 text-left border-t border-slate-100 pt-8">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Dépensé</p>
                                <p className="text-lg font-extrabold text-indigo-600">{totalSpent.toLocaleString()} MAD</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Locations</p>
                                <p className="text-lg font-extrabold text-slate-900">{rentalCount}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Points Fidélité</p>
                                <p className="text-lg font-extrabold text-slate-900">{Math.floor(totalSpent / 100)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Profil Risque</p>
                                <p className={`text-lg font-extrabold ${formData.liste_noire ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {formData.liste_noire ? 'Bloqué' : 'Faible'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Internal Notes */}
                    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-extrabold text-slate-900 mb-4">Notes de gestion interne</h3>
                        <textarea 
                            name="remarques"
                            value={formData.remarques || ''}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 focus:border-indigo-650 focus:bg-white focus:ring-1 focus:ring-indigo-650 outline-none transition-all duration-200 resize-none" 
                            placeholder="Ajoutez des notes confidentielles sur l'interaction avec le client..." 
                            rows="4"
                        ></textarea>
                    </div>

                    {/* Blacklist Toggle */}
                    <div className={`rounded-2xl p-8 border transition-all ${formData.liste_noire ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className={`text-sm font-extrabold ${formData.liste_noire ? 'text-rose-700' : 'text-slate-900'}`}>Liste Noire</h3>
                                <p className="text-xs text-slate-500 mt-1">Bloquer les futures locations</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="liste_noire"
                                    checked={formData.liste_noire}
                                    onChange={handleChange}
                                    className="sr-only peer" 
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-rose-50/50 rounded-2xl p-8 border border-rose-200">
                        <div className="flex items-center gap-2 mb-4 text-rose-700">
                            <span className="material-symbols-outlined text-[20px]">warning</span>
                            <h3 className="text-sm font-bold uppercase tracking-wider">Zone de Danger</h3>
                        </div>
                        <p className="text-xs text-rose-600/70 mb-6">La suppression d'un client archivera ses données. Il ne pourra plus louer de véhicules.</p>
                        <button 
                            onClick={handleDelete}
                            className="w-full py-3 bg-white text-rose-600 font-bold text-xs rounded-xl border border-rose-200 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                        >
                            SUPPRIMER LE PROFIL CLIENT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditClient;
