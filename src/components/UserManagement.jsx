import React, { useState } from 'react';
import api from '../api';
import useFetchAll from '../hooks/useFetchAll';
import Dropdown from './Dropdown';
import { toast } from './Toast';
import { messageBox } from './MessageBox';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Field from './ui/Field';
import StatusBadge from './ui/StatusBadge';
import Spinner from './ui/Spinner';
import EmptyState from './ui/EmptyState';
import PageHeader from './ui/PageHeader';

const EMPTY_FORM = { username: '', email: '', firstName: '', lastName: '', role: 'EMPLOYEE', agency: '', password: '', isActive: true };

const ROLE_OPTIONS = [
    { value: 'OWNER', label: 'Propriétaire Agence' },
    { value: 'EMPLOYEE', label: 'Employé' },
];

const ACTIVE_OPTIONS = [
    { value: 'true', label: 'Actif' },
    { value: 'false', label: 'Inactif' },
];

const toForm = (user) => ({
    id: user.id,
    username: user.username || '',
    email: user.email || '',
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    role: user.role || 'EMPLOYEE',
    agency: user.agency ? String(user.agency) : '',
    password: '',
    isActive: user.is_active !== false,
});

const toPayload = (form) => {
    const payload = {
        username: form.username,
        email: form.email,
        first_name: form.firstName,
        last_name: form.lastName,
        role: form.role,
        agency: form.agency || null,
        is_active: form.isActive,
    };
    if (form.password) payload.password = form.password;
    return payload;
};

const UserManagement = () => {
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const { data: users, loading, refetch: fetchUsers } = useFetchAll('users/');
    const { data: agencies } = useFetchAll('agencies/');

    const openModal = (user = null) => {
        setForm(user ? toForm(user) : EMPTY_FORM);
        setIsEditing(Boolean(user));
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`users/${form.id}/`, toPayload(form));
            } else {
                await api.post('users/', toPayload(form));
            }
            closeModal();
            await fetchUsers();
            toast.success(isEditing ? 'Utilisateur mis à jour avec succès.' : 'Utilisateur créé avec succès.');
        } catch (error) {
            console.error("Erreur lors de l'enregistrement", error);
            toast.error("Erreur lors de l'enregistrement. Vérifiez les données (le nom d'utilisateur doit être unique).");
        }
    };

    const handleDelete = (id) => {
        messageBox.danger("Supprimer cet utilisateur ?", "Supprimer l'utilisateur", {
            onConfirm: async () => {
                try {
                    await api.delete(`users/${id}/`);
                    await fetchUsers();
                    toast.success('Utilisateur supprimé avec succès.');
                } catch (error) {
                    console.error("Erreur lors de la suppression", error);
                    toast.error("Erreur lors de la suppression.");
                }
            }
        });
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
    }

    return (
        <>
            <PageHeader
                eyebrow="Administration Système"
                title="Gestion des Utilisateurs"
                actions={
                    <Button icon="person_add" size="lg" onClick={() => openModal()}>
                        Nouvel Utilisateur
                    </Button>
                }
            />

            <div className="card rounded-token shadow-l1 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-left border-b border-stroke" style={{ background: 'var(--slate-bg)' }}>
                                <th className="px-6 py-4">Utilisateur</th>
                                <th className="px-6 py-4">Agence</th>
                                <th className="px-6 py-4">Rôle</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stroke">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4">
                                        <EmptyState
                                            icon="person_off"
                                            title="Aucun utilisateur"
                                            description="Créez un premier utilisateur pour votre agence."
                                        />
                                    </td>
                                </tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="group hover:bg-surface-hover transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center font-bold text-primary">
                                                {user.username[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-on-surface">{user.username}</p>
                                                <p className="text-[10px] text-on-surface-variant">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-medium">{user.agency_name || 'Système (Super Admin)'}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-xs font-semibold text-on-surface-variant">{user.role}</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <StatusBadge
                                            variant={user.is_active ? 'success' : 'neutral'}
                                            appearance="dot"
                                            label={user.is_active ? 'Actif' : 'Inactif'}
                                        />
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity justify-end">
                                            <Button variant="ghost" iconOnly icon="edit" aria-label="Modifier" onClick={() => openModal(user)} />
                                            <Button variant="ghost" iconOnly icon="delete" className="!text-error hover:!bg-error/10" aria-label="Supprimer" onClick={() => handleDelete(user.id)} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={isEditing ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}
                labelId="user-modal-title"
                footer={
                    <>
                        <Button variant="ghost" onClick={closeModal}>Annuler</Button>
                        <Button type="submit" form="user-form" icon="save">Enregistrer</Button>
                    </>
                }
            >
                <form id="user-form" onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Nom d'utilisateur" required>
                            <input className="field w-full" type="text" value={form.username} onChange={(e) => setField('username', e.target.value)} required />
                        </Field>
                        <Field label="Email">
                            <input className="field w-full" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                        </Field>
                        <Field label="Prénom">
                            <input className="field w-full" type="text" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
                        </Field>
                        <Field label="Nom">
                            <input className="field w-full" type="text" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
                        </Field>
                        <Field label="Agence">
                            <Dropdown
                                options={[
                                    { value: '', label: '-- Aucune (Super Admin) --' },
                                    ...agencies.map(a => ({ value: String(a.id), label: a.nom_agence }))
                                ]}
                                value={form.agency || ''}
                                onChange={(v) => setField('agency', v || '')}
                            />
                        </Field>
                        <Field label="Rôle">
                            <Dropdown
                                options={ROLE_OPTIONS}
                                value={form.role}
                                onChange={(v) => setField('role', v)}
                            />
                        </Field>
                        <Field label={isEditing ? "Mot de passe" : "Mot de passe"} hint={isEditing ? 'Laisser vide pour ne pas changer.' : undefined}>
                            <input
                                className="field w-full"
                                type="password"
                                value={form.password}
                                onChange={(e) => setField('password', e.target.value)}
                                required={!isEditing}
                            />
                        </Field>
                        <Field label="Statut">
                            <Dropdown
                                options={ACTIVE_OPTIONS}
                                value={form.isActive ? 'true' : 'false'}
                                onChange={(v) => setField('isActive', v === 'true')}
                            />
                        </Field>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default UserManagement;