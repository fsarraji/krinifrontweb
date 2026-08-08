import React, { useState, useEffect } from 'react';
import api from '../api';
import Dropdown from './Dropdown';

const AgencyManagement = () => {
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentAgency, setCurrentAgency] = useState({ nom_agence: '', adresse: '', ville: '', pays: '', telephone: '', email: '', rc: '', ice: '', is_active: true });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchAgencies();
    }, []);

    const fetchAgencies = async () => {
        try {
            const response = await api.get('agencies/');
            setAgencies(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Erreur lors de la récupération des agences", error);
            setLoading(false);
        }
    };

    const handleSaveAgency = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`agencies/${currentAgency.id}/`, currentAgency);
            } else {
                await api.post('agencies/', currentAgency);
            }
            setShowModal(false);
            fetchAgencies();
            setCurrentAgency({ nom_agence: '', adresse: '', ville: '', pays: '', telephone: '', email: '', rc: '', ice: '', is_active: true });
        } catch (error) {
            console.error("Erreur lors de l'enregistrement de l'agence", error);
            alert("Erreur lors de l'enregistrement. Vérifiez les données.");
        }
    };

    const handleEdit = (agency) => {
        setCurrentAgency(agency);
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette agence ?")) {
            try {
                await api.delete(`agencies/${id}/`);
                fetchAgencies();
            } catch (error) {
                console.error("Erreur lors de la suppression", error);
            }
        }
    };

    if (loading) return <div className="text-center mt-20 font-bold text-primary">Chargement des agences...</div>;

    return (
        <>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary mb-1 block font-label">Administration Système</span>
                    <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Gestion des Agences</h2>
                </div>
                <button 
                    onClick={() => { setIsEditing(false); setCurrentAgency({ nom_agence: '', adresse: '', ville: '', pays: '', telephone: '', email: '', rc: '', ice: '', is_active: true }); setShowModal(true); }}
                    className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-headline font-bold text-sm editorial-shadow hover:scale-[0.98] transition-all"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Nouvelle Agence
                </button>
            </div>

            <div className="bg-surface-container-lowest rounded-3xl editorial-shadow overflow-hidden">
                <div className="p-4 overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-left border-b border-slate-50">
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Agence</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Contact</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {agencies.map(agency => (
                                <tr key={agency.id} className="group hover:bg-surface-container-low/50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-lg text-primary overflow-hidden">
                                                {agency.logo ? <img src={agency.logo} alt="logo" className="w-full h-full object-cover" /> : agency.nom_agence[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-on-surface">{agency.nom_agence}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-semibold">ICE: {agency.ice || '-'}</p>
                                                        {agency.ville && <p className="text-[10px] text-slate-400 font-medium">{agency.ville}{agency.pays ? `, ${agency.pays}` : ''}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-medium">{agency.email}</p>
                                        <p className="text-xs text-slate-500">{agency.telephone}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${agency.is_active ? 'bg-tertiary-container/20 text-on-tertiary-container' : 'bg-error-container/30 text-error'}`}>
                                            {agency.is_active ? 'Actif' : 'Inactif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                            <button onClick={() => handleEdit(agency)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(agency.id)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors">
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for adding/editing agency */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden editorial-shadow">
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold font-headline">{isEditing ? 'Modifier l\'Agence' : 'Ajouter une Agence'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-on-surface transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveAgency} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Nom de l'agence</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"	
                                        type="text" 
                                        value={currentAgency.nom_agence} 
                                        onChange={e => setCurrentAgency({...currentAgency, nom_agence: e.target.value})} 
                                        required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Téléphone</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"	
                                        type="text" 
                                        value={currentAgency.telephone} 
                                        onChange={e => setCurrentAgency({...currentAgency, telephone: e.target.value})} 
                                        required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"	
                                        type="email" 
                                        value={currentAgency.email} 
                                        onChange={e => setCurrentAgency({...currentAgency, email: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Statut</label>
                                    <Dropdown
                                        options={[
                                            { value: 'true', label: 'Actif' },
                                            { value: 'false', label: 'Inactif' }
                                        ]}
                                        value={currentAgency.is_active ? 'true' : 'false'}
                                        onChange={(v) => setCurrentAgency({...currentAgency, is_active: v === 'true'})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">RC</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"	
                                        type="text" 
                                        value={currentAgency.rc} 
                                        onChange={e => setCurrentAgency({...currentAgency, rc: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">ICE</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"	
                                        type="text" 
                                        value={currentAgency.ice} 
                                        onChange={e => setCurrentAgency({...currentAgency, ice: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Ville</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"	
                                        type="text" 
                                        value={currentAgency.ville || ''} 
                                        onChange={e => setCurrentAgency({...currentAgency, ville: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-1">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Pays</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"	
                                        type="text" 
                                        value={currentAgency.pays || ''} 
                                        onChange={e => setCurrentAgency({...currentAgency, pays: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Adresse</label>
                                    <textarea 
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px]"	
                                        value={currentAgency.adresse} 
                                        onChange={e => setCurrentAgency({...currentAgency, adresse: e.target.value})} 
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button 
                                    type="submit"
                                    className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-bold editorial-shadow hover:scale-[0.98] transition-all"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default AgencyManagement;
