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

const EMPTY_FORM = { name: '', address: '', city: '', telephone: '', email: '', rc: '', ice: '', isActive: true };

const toForm = (agency) => ({
    id: agency.id,
    name: agency.nom_agence || '',
    address: agency.adresse || '',
    city: agency.ville || '',
    telephone: agency.telephone || '',
    email: agency.email || '',
    rc: agency.rc || '',
    ice: agency.ice || '',
    isActive: agency.is_active !== false,
});

const toPayload = (form) => ({
    nom_agence: form.name,
    adresse: form.address,
    ville: form.city,
    telephone: form.telephone,
    email: form.email,
    rc: form.rc,
    ice: form.ice,
    is_active: form.isActive,
});

const AgencyManagement = () => {
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const { data: agencies, loading, refetch: fetchAgencies } = useFetchAll('agencies/');

    const openModal = (agency = null) => {
        setForm(agency ? toForm(agency) : EMPTY_FORM);
        setIsEditing(Boolean(agency));
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`agencies/${form.id}/`, toPayload(form));
            } else {
                await api.post('agencies/', toPayload(form));
            }
            closeModal();
            await fetchAgencies();
            toast.success(isEditing ? 'Agence mise à jour avec succès.' : 'Agence créée avec succès.');
        } catch (error) {
            console.error("Erreur lors de l'enregistrement de l'agence", error);
            toast.error("Erreur lors de l'enregistrement. Vérifiez les données.");
        }
    };

    const handleDelete = (id) => {
        messageBox.danger("Êtes-vous sûr de vouloir supprimer cette agence ?", "Supprimer l'agence", {
            onConfirm: async () => {
                try {
                    await api.delete(`agencies/${id}/`);
                    await fetchAgencies();
                    toast.success('Agence supprimée avec succès.');
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
                title="Gestion des Agences"
                actions={
                    <Button icon="add" size="lg" onClick={() => openModal()}>
                        Nouvelle Agence
                    </Button>
                }
            />

            <div className="card rounded-token shadow-l1 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-left border-b border-stroke" style={{ background: 'var(--slate-bg)' }}>
                                <th className="px-6 py-4">Agence</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stroke">
                            {agencies.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-4">
                                        <EmptyState
                                            icon="storefront"
                                            title="Aucune agence"
                                            description="Créez une première agence pour commencer."
                                        />
                                    </td>
                                </tr>
                            ) : agencies.map(agency => (
                                <tr key={agency.id} className="group hover:bg-surface-hover transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center font-bold text-lg text-primary overflow-hidden">
                                                {agency.logo
                                                    ? <img src={agency.logo} alt="logo" className="w-full h-full object-cover" />
                                                    : agency.nom_agence[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-on-surface">{agency.nom_agence}</p>
                                                <p className="text-[10px] text-on-surface-variant uppercase font-semibold">ICE: {agency.ice || '-'}</p>
                                                {agency.ville && <p className="text-[10px] text-on-surface-variant/60 font-medium">{agency.ville}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-medium">{agency.email}</p>
                                        <p className="text-xs text-on-surface-variant">{agency.telephone}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <StatusBadge
                                            variant={agency.is_active ? 'success' : 'neutral'}
                                            appearance="dot"
                                            label={agency.is_active ? 'Actif' : 'Inactif'}
                                        />
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                            <Button variant="ghost" iconOnly icon="edit" aria-label="Modifier" onClick={() => openModal(agency)} />
                                            <Button variant="ghost" iconOnly icon="delete" className="!text-error hover:!bg-error/10" aria-label="Supprimer" onClick={() => handleDelete(agency.id)} />
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
                title={isEditing ? "Modifier l'agence" : "Ajouter une agence"}
                labelId="agency-modal-title"
                footer={
                    <>
                        <Button variant="ghost" onClick={closeModal}>Annuler</Button>
                        <Button type="submit" form="agency-form" icon="save">Enregistrer</Button>
                    </>
                }
            >
                <form id="agency-form" onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Nom de l'agence" required>
                            <input className="field w-full" type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                        </Field>
                        <Field label="Téléphone" required>
                            <input className="field w-full" type="text" value={form.telephone} onChange={(e) => setField('telephone', e.target.value)} required />
                        </Field>
                        <Field label="Email">
                            <input className="field w-full" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                        </Field>
                        <Field label="Statut">
                            <Dropdown
                                options={[{ value: 'true', label: 'Actif' }, { value: 'false', label: 'Inactif' }]}
                                value={form.isActive ? 'true' : 'false'}
                                onChange={(v) => setField('isActive', v === 'true')}
                            />
                        </Field>
                        <Field label="RC">
                            <input className="field w-full" type="text" value={form.rc} onChange={(e) => setField('rc', e.target.value)} />
                        </Field>
                        <Field label="ICE">
                            <input className="field w-full" type="text" value={form.ice} onChange={(e) => setField('ice', e.target.value)} />
                        </Field>
                        <Field label="Ville" className="md:col-span-2">
                            <input className="field w-full" type="text" value={form.city} onChange={(e) => setField('city', e.target.value)} />
                        </Field>
                        <Field label="Adresse" required className="md:col-span-2">
                            <textarea className="field w-full min-h-[100px]" value={form.address} onChange={(e) => setField('address', e.target.value)} required />
                        </Field>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default AgencyManagement;