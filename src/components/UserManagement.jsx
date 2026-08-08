import React, { useState, useEffect } from 'react';
import api from '../api';
import Dropdown from './Dropdown';
import { toast } from './Toast';
import { messageBox } from './MessageBox';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentUser, setCurrentUser] = useState({ username: '', email: '', first_name: '', last_name: '', role: 'EMPLOYEE', agency: '', password: '', is_active: true });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchAgencies();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('users/');
            setUsers(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Erreur lors de la récupération des utilisateurs", error);
            setLoading(false);
        }
    };

    const fetchAgencies = async () => {
        try {
            const response = await api.get('agencies/');
            setAgencies(response.data);
        } catch (error) {
            console.error("Erreur les agences", error);
        }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        const data = { ...currentUser };
        if (!data.password) delete data.password;
        if (!data.agency) data.agency = null;

        try {
            if (isEditing) {
                await api.put(`users/${currentUser.id}/`, data);
            } else {
                await api.post('users/', data);
            }
            setShowModal(false);
            fetchUsers();
            toast.success(isEditing ? 'Utilisateur mis à jour avec succès.' : 'Utilisateur créé avec succès.');
            resetForm();
        } catch (error) {
            console.error("Erreur lors de l'enregistrement", error);
            toast.error("Erreur lors de l'enregistrement. Vérifiez les données (le nom d'utilisateur doit être unique).");
        }
    };

    const resetForm = () => {
        setCurrentUser({ username: '', email: '', first_name: '', last_name: '', role: 'EMPLOYEE', agency: '', password: '', is_active: true });
        setIsEditing(false);
    };

    const handleEdit = (user) => {
        setCurrentUser({ ...user, password: '' });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        messageBox.danger("Supprimer cet utilisateur ?", "Supprimer l'utilisateur", {
            onConfirm: async () => {
                try {
                    await api.delete(`users/${id}/`);
                    fetchUsers();
                    toast.success('Utilisateur supprimé avec succès.');
                } catch (error) {
                    console.error("Erreur suppression", error);
                    toast.error("Erreur lors de la suppression.");
                }
            }
        });
    };

    if (loading) return <div className="text-center mt-20 font-bold text-primary">Chargement...</div>;

    return (
        <>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary mb-1 block font-label">Administration Système</span>
                    <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Gestion des Utilisateurs</h2>
                </div>
                <button 
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-headline font-bold text-sm editorial-shadow hover:scale-[0.98] transition-all"
                >
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Nouvel Utilisateur
                </button>
            </div>

            <div className="bg-surface-container-lowest rounded-3xl editorial-shadow overflow-hidden">
                <div className="p-4 overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-left border-b border-slate-50">
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Utilisateur</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Agence</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Rôle</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {users.map(user => (
                                <tr key={user.id} className="group hover:bg-surface-container-low/50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                {user.username[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-on-surface">{user.username}</p>
                                                <p className="text-[10px] text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-medium">{user.agency_name || 'Système (Super Admin)'}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-xs font-semibold text-slate-600">{user.role}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${user.is_active ? 'bg-tertiary-container/20 text-on-tertiary-container' : 'bg-error-container/30 text-error'}`}>
                                            {user.is_active ? 'Actif' : 'Inactif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                            <button onClick={() => handleEdit(user)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(user.id)} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors">
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

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden editorial-shadow">
                        <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold font-headline">{isEditing ? 'Modifier l\'Utilisateur' : 'Ajouter un Utilisateur'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-on-surface transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSaveUser} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Nom d'utilisateur</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"	
                                        type="text" 
                                        value={currentUser.username} 
                                        onChange={e => setCurrentUser({...currentUser, username: e.target.value})} 
                                        required 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"	
                                        type="email" 
                                        value={currentUser.email} 
                                        onChange={e => setCurrentUser({...currentUser, email: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Prénom</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"	
                                        type="text" 
                                        value={currentUser.first_name} 
                                        onChange={e => setCurrentUser({...currentUser, first_name: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Nom</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"	
                                        type="text" 
                                        value={currentUser.last_name} 
                                        onChange={e => setCurrentUser({...currentUser, last_name: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Agence</label>
                                    <Dropdown
                                        options={[
                                            { value: '', label: '-- Aucune (Super Admin) --' },
                                            ...agencies.map(a => ({ value: String(a.id), label: a.nom_agence }))
                                        ]}
                                        value={currentUser.agency || ''}
                                        onChange={(v) => setCurrentUser({...currentUser, agency: v || ''})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Rôle</label>
                                    <Dropdown
                                        options={[
                                            { value: 'OWNER', label: 'Propriétaire Agence' },
                                            { value: 'EMPLOYEE', label: 'Employé' }
                                        ]}
                                        value={currentUser.role}
                                        onChange={(v) => setCurrentUser({...currentUser, role: v})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Mot de passe {isEditing && '(laisser vide pour ne pas changer)'}</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"	
                                        type="password" 
                                        value={currentUser.password} 
                                        onChange={e => setCurrentUser({...currentUser, password: e.target.value})} 
                                        required={!isEditing}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Statut</label>
                                    <Dropdown
                                        options={[
                                            { value: 'true', label: 'Actif' },
                                            { value: 'false', label: 'Inactif' }
                                        ]}
                                        value={currentUser.is_active ? 'true' : 'false'}
                                        onChange={(v) => setCurrentUser({...currentUser, is_active: v === 'true'})}
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

export default UserManagement;
