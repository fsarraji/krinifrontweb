import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import Dropdown from './Dropdown';
import api from '../api';
import { jwtDecode } from 'jwt-decode';
import DamageSelector from './DamageSelector';
import FuelGaugeSelector from './FuelGaugeSelector';

const getLocalDatetime = (date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
};

const ContractForm = () => {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userRole, setUserRole] = useState('');
    const [agencySettings, setAgencySettings] = useState({ caution_active: true, caution_montant: 1500 });
    const [isCautionActive, setIsCautionActive] = useState(true);

    
    const [formData, setFormData] = useState({
        vehicle: '',
        client: '',
        deuxieme_chauffeur: '',
        date_sortie: getLocalDatetime(new Date()),
        date_retour_prevue: getLocalDatetime(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
        prix_par_jour: 0,
        montant_paye: 0,
        caution: 1500,
        km_sortie: 0,
        carburant_sortie: '2/8',
        statut: 'EN_COURS',
        notes: '',
        degats_depart: '',
        damages: [],
        chauffeur_service: false,
        // Éléments de l'état du véhicule
        roue_secours: false,
        cric: false,
        manivelle: false,
        gilet: false,
        triangle: false,
        extincteur: false,
        papiers: false,
        cles: true,
    });

    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showClientModal, setShowClientModal] = useState(false);

    const fetchClients = async () => {
        try {
            const response = await api.get('clients/');
            setClients(response.data);
            return response.data;
        } catch (error) {
            console.error("Erreur lors du chargement des clients", error);
            return [];
        }
    };

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

        const fetchData = async () => {
            try {
                const [vRes, cRes, settingsRes] = await Promise.all([
                    api.get('vehicles/'),
                    api.get('clients/'),
                    api.get('agency/settings/').catch(() => ({ data: { caution_active: true, caution_montant: 1500 } }))
                ]);
                // On ne garde que les véhicules disponibles pour un nouveau contrat
                setVehicles(vRes.data.filter(v => v.statut === 'Available'));
                setClients(cRes.data);
                
                const settings = settingsRes.data;
                setAgencySettings(settings);
                setIsCautionActive(settings.caution_active);
                setFormData(prev => ({
                    ...prev,
                    caution: settings.caution_active ? parseFloat(settings.caution_montant) : 0
                }));
                
                setLoading(false);
            } catch (error) {
                console.error("Erreur lors du chargement des données", error);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleVehicleSelect = (vehicle) => {
        setSelectedVehicle(vehicle);
            setFormData({
                ...formData,
                vehicle: vehicle.id,
                prix_par_jour: vehicle.prix_par_jour || 0,
                km_sortie: vehicle.kilometrage || 0
            });
        };
    
        const diffDays = () => {
            const start = new Date(formData.date_sortie);
            const end = new Date(formData.date_retour_prevue);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays || 1;
        };
    
        const totalEstimate = () => {
            const days = diffDays();
            const base = days * formData.prix_par_jour;
            const chauffeur = formData.chauffeur_service ? 50 * days : 0; // Exemple: 50 DH/jour pour le chauffeur
            return base + chauffeur;
        };
    
        const handleSubmit = async (e) => {
            e.preventDefault();
            try {
                const dataToSubmit = {
                    ...formData,
                    jours: diffDays(),
                    montant_total: totalEstimate(),
                    // Les dates sont maintenant des datetime-local (YYYY-MM-DDTHH:mm)
                    date_sortie: `${formData.date_sortie}:00`,
                    date_retour_prevue: `${formData.date_retour_prevue}:00`,
                };
                await api.post('contracts/', dataToSubmit);
                navigate('/contracts');
            } catch (error) {
                console.error("Erreur lors de la création du contrat", error);
                if (error.response?.data?.non_field_errors) {
                    alert(error.response.data.non_field_errors[0]);
                } else if (error.response?.data?.detail) {
                    alert(error.response.data.detail);
                } else {
                    alert("Erreur lors de la création du contrat. Vérifiez les champs et la disponibilité du véhicule.");
                }
            }
        };
    
        const filteredVehicles = vehicles.filter(v => 
            v.marque_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            v.modele_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    
        if (loading) return <div className="p-8 text-center font-headline font-bold text-primary">Initialisation du Fleet Concierge...</div>;
    
        return (
            <div className="min-h-screen bg-surface">
                {/* Header Section */}
                <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold tracking-widest text-primary uppercase">Fleet Concierge</span>
                            <div className="h-px w-8 bg-primary/30"></div>
                        </div>
                        <h2 className="text-4xl font-extrabold tracking-tight text-on-surface font-headline">Nouveau Contrat de Location</h2>
                        <p className="text-on-surface-variant mt-2 max-w-md">Réservation de précision pour les actifs de luxe et utilitaires. Remplissez les détails ci-dessous.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/contracts')}
                            className="px-6 py-3 rounded-lg border border-outline-variant text-on-surface-variant font-semibold hover:bg-surface-container-low transition-colors"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={handleSubmit}
                            className="px-6 py-3 rounded-lg bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:opacity-90 transition-all"
                        >
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'opsz' 20" }}>check_circle</span>
                            Valider le Contrat
                        </button>
                    </div>
                </header>
    
                {/* Bento Layout Grid */}
                <div className="grid grid-cols-12 gap-6 pb-20">
                    {/* Left Column: Form Sections */}
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                        
                        {/* Vehicle Selection */}
                        <section className="bg-white p-8 rounded-xl ring-1 ring-outline-variant/15 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary">directions_car</span>
                                    <h3 className="text-lg font-bold font-headline">Sélection du Véhicule</h3>
                                </div>
                                <div className="relative">
                                    <input 
                                        className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 w-64" 
                                        placeholder="Rechercher dans la flotte..." 
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-sm">search</span>
                                </div>
                            </div>
    
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto p-1">
                                {filteredVehicles.map(vehicle => (
                                    <div 
                                        key={vehicle.id}
                                        onClick={() => handleVehicleSelect(vehicle)}
                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex gap-4 items-center group ${formData.vehicle === vehicle.id ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:bg-surface-container-low'}`}
                                    >
                                        <div className="w-24 h-16 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                                            {vehicle.image ? (
                                                <img src={vehicle.image} alt={vehicle.modele_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-slate-300 text-3xl">image</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`font-bold transition-colors ${formData.vehicle === vehicle.id ? 'text-primary' : 'text-on-surface'}`}>{vehicle.marque_name} {vehicle.modele_name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono uppercase">{vehicle.matricule}</span>
                                                <span className="text-xs text-primary font-semibold">{vehicle.prix_par_jour} DH / jour</span>
                                            </div>
                                        </div>
                                    {formData.vehicle === vehicle.id && (
                                        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    )}
                                </div>
                            ))}
                            {filteredVehicles.length === 0 && (
                                <div className="col-span-2 py-10 text-center text-slate-400 font-medium italic">Aucun véhicule disponible trouvé.</div>
                            )}
                        </div>
                    </section>

                    {/* Client Selection */}
                    <section className="bg-white p-8 rounded-xl ring-1 ring-outline-variant/15 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">person</span>
                                <h3 className="text-lg font-bold font-headline">Informations Client</h3>
                            </div>
                            <button 
                                onClick={() => setShowClientModal(true)}
                                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                                NOUVEAU CLIENT
                            </button>
                        </div>
                        <div className="relative">
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2 ml-1">Sélectionner un client existant</label>
                            <Select 
                                options={clients.map(c => ({
                                    value: c.id,
                                    label: `${c.nom} ${c.prenom} (${c.cin_passport})`,
                                    clientData: c
                                }))}
                                onChange={(opt) => setFormData({...formData, client: opt ? opt.value : ''})}
                                value={formData.client ? {
                                    value: formData.client,
                                    label: clients.find(c => c.id == formData.client) ? `${clients.find(c => c.id == formData.client).nom} ${clients.find(c => c.id == formData.client).prenom} (${clients.find(c => c.id == formData.client).cin_passport})` : ''
                                } : null}
                                placeholder="Rechercher par nom, prénom ou CIN..."
                                isSearchable
                                isClearable
                                classNamePrefix="react-select"
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        backgroundColor: '#f8fafc', // surface-container-low
                                        border: 'none',
                                        padding: '4px',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem'
                                    }),
                                    placeholder: (base) => ({
                                        ...base,
                                        color: '#94a3b8'
                                    })
                                }}
                            />
                        </div>
                        
                        {formData.client && (
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                <div className="p-3 bg-surface-container rounded-lg">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Téléphone</p>
                                    <p className="text-sm font-medium">{clients.find(c => c.id == formData.client)?.telephone || 'N/A'}</p>
                                </div>
                                <div className="p-3 bg-surface-container rounded-lg">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">N° Permis</p>
                                    <p className="text-sm font-medium">{clients.find(c => c.id == formData.client)?.permis_conduite || 'N/A'}</p>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 border-t border-slate-100 pt-6">
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2 ml-1">Deuxième Conducteur (Optionnel)</label>
                            <Select 
                                options={clients.filter(c => c.id != formData.client).map(c => ({
                                    value: c.id,
                                    label: `${c.nom} ${c.prenom} (${c.cin_passport})`
                                }))}
                                onChange={(opt) => setFormData({...formData, deuxieme_chauffeur: opt ? opt.value : ''})}
                                value={formData.deuxieme_chauffeur ? {
                                    value: formData.deuxieme_chauffeur,
                                    label: clients.find(c => c.id == formData.deuxieme_chauffeur) ? `${clients.find(c => c.id == formData.deuxieme_chauffeur).nom} ${clients.find(c => c.id == formData.deuxieme_chauffeur).prenom} (${clients.find(c => c.id == formData.deuxieme_chauffeur).cin_passport})` : ''
                                } : null}
                                placeholder="Rechercher un deuxième chauffeur..."
                                isSearchable
                                isClearable
                                classNamePrefix="react-select"
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        backgroundColor: '#f8fafc',
                                        border: 'none',
                                        padding: '4px',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem'
                                    })
                                }}
                            />
                        </div>
                    </section>

                    {/* Vehicle Accessories & Status */}
                    <section className="bg-white p-8 rounded-xl ring-1 ring-outline-variant/15 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="material-symbols-outlined text-primary">checklist</span>
                            <h3 className="text-lg font-bold font-headline">Accessoires & État du Véhicule</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {[
                                { id: 'roue_secours', label: 'Roue Secours' },
                                { id: 'cric', label: 'Cric' },
                                { id: 'manivelle', label: 'Manivelle' },
                                { id: 'gilet', label: 'Gilet' },
                                { id: 'triangle', label: 'Triangle' },
                                { id: 'extincteur', label: 'Extincteur' },
                                { id: 'papiers', label: 'Papiers' },
                                { id: 'cles', label: 'Clés' },
                            ].map(item => (
                                <div 
                                    key={item.id}
                                    onClick={() => setFormData({...formData, [item.id]: !formData[item.id]})}
                                    className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${formData[item.id] ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {formData[item.id] ? 'check_box' : 'check_box_outline_blank'}
                                    </span>
                                    <span className="text-xs font-bold">{item.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-3 ml-1">Niveau de Carburant</label>
                                <FuelGaugeSelector 
                                    value={formData.carburant_sortie}
                                    onChange={(val) => setFormData({...formData, carburant_sortie: val})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-3 ml-1">Kilos Départ</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-slate-400 font-bold text-xs">KM</span>
                                    <input 
                                        className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20" 
                                        type="number" 
                                        value={formData.km_sortie}
                                        onChange={(e) => setFormData({...formData, km_sortie: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2 ml-1">État & Dégâts au Départ</label>
                            <DamageSelector 
                                damages={formData.damages}
                                onChange={(newDamages) => setFormData({...formData, damages: newDamages})}
                                type="DEPART"
                            />
                            
                            <div className="mt-4">
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2 ml-1">Observation générale (optionnel)</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 resize-none" 
                                    placeholder="Note supplémentaire sur l'état général..." 
                                    rows="2"
                                    value={formData.degats_depart}
                                    onChange={(e) => setFormData({...formData, degats_depart: e.target.value})}
                                ></textarea>
                            </div>
                        </div>
                    </section>

                    {/* Rental Dates & Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <section className="bg-white p-8 rounded-xl ring-1 ring-outline-variant/15 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="material-symbols-outlined text-primary">calendar_today</span>
                                <h3 className="text-lg font-bold font-headline">Période de Location</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2">Date et Heure de Départ</label>
                                    <input 
                                        className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/20" 
                                        type="datetime-local"
                                        value={formData.date_sortie}
                                        onChange={(e) => setFormData({...formData, date_sortie: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2">Date et Heure de Retour Prévu</label>
                                    <input 
                                        className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/20" 
                                        type="datetime-local"
                                        value={formData.date_retour_prevue}
                                        onChange={(e) => setFormData({...formData, date_retour_prevue: e.target.value})}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="bg-white p-8 rounded-xl ring-1 ring-outline-variant/15 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="material-symbols-outlined text-primary">room_service</span>
                                <h3 className="text-lg font-bold font-headline">Préférences & Caution</h3>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-low transition-colors">
                                    <div>
                                        <p className="text-sm font-bold text-on-surface">Service Chauffeur</p>
                                        <p className="text-xs text-slate-500">Conducteur premium</p>
                                    </div>
                                    <div 
                                        onClick={() => setFormData({...formData, chauffeur_service: !formData.chauffeur_service})}
                                        className="relative inline-flex items-center cursor-pointer"
                                    >
                                        <div className={`w-11 h-6 transition-colors rounded-full relative ${formData.chauffeur_service ? 'bg-primary' : 'bg-slate-200'}`}>
                                            <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full transition-transform ${formData.chauffeur_service ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2 ml-1">
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Garantie (Caution)</label>
                                        <div 
                                            onClick={() => {
                                                const newState = !isCautionActive;
                                                setIsCautionActive(newState);
                                                setFormData({...formData, caution: newState ? agencySettings.caution_montant : 0});
                                            }}
                                            className="relative inline-flex items-center cursor-pointer"
                                        >
                                            <div className={`w-9 h-5 transition-colors rounded-full relative ${isCautionActive ? 'bg-primary' : 'bg-slate-200'}`}>
                                                <div className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full transition-transform ${isCautionActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3 text-slate-400 font-bold">DH</span>
                                        <input 
                                            className={`w-full border-none rounded-lg pl-12 pr-4 py-3 text-sm font-bold ${!isCautionActive ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-surface-container-low focus:ring-2 focus:ring-primary/20'}`} 
                                            type="number" 
                                            value={formData.caution}
                                            onChange={(e) => setFormData({...formData, caution: e.target.value})}
                                            disabled={!isCautionActive}
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2 ml-1">Montant Versé</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-3 text-slate-400 font-bold">DH</span>
                                            <input 
                                                className="w-full bg-surface-container-low border-none rounded-lg pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20" 
                                                type="number" 
                                                value={formData.montant_paye}
                                                onChange={(e) => setFormData({...formData, montant_paye: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2 ml-1">Mode de Paiement</label>
                                        <Dropdown
                                            options={[
                                                { value: 'Espèce', label: 'Espèce' },
                                                { value: 'Chèque', label: 'Chèque' },
                                                { value: 'TPE', label: 'TPE' },
                                                { value: 'Virement', label: 'Virement' }
                                            ]}
                                            value={formData.methode_paiement || 'Espèce'}
                                            onChange={(v) => setFormData({...formData, methode_paiement: v})}
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-100 hidden">
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2 ml-1">Statut Initial du Contrat</label>
                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, statut: 'EN_COURS'})}
                                            className={`flex-1 p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${formData.statut === 'EN_COURS' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                        >
                                            <span className="material-symbols-outlined">play_circle</span>
                                            <span className="text-[10px] font-bold uppercase">Actif Immédiat</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, statut: 'RESERVE'})}
                                            className={`flex-1 p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${formData.statut === 'RESERVE' ? 'border-secondary bg-secondary/5 text-secondary' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                        >
                                            <span className="material-symbols-outlined">event_note</span>
                                            <span className="text-[10px] font-bold uppercase">Réservation</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Contract Notes */}
                    <section className="bg-white p-8 rounded-xl ring-1 ring-outline-variant/15 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-primary">notes</span>
                            <h3 className="text-lg font-bold font-headline">Dispositions Particulières</h3>
                        </div>
                        <textarea 
                            className="w-full bg-surface-container-low border-none rounded-lg p-4 text-sm focus:ring-2 focus:ring-primary/20 resize-none" 
                            placeholder="Entrez toute condition supplémentaire, notes sur l'état, ou demandes client..." 
                            rows="4"
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        ></textarea>
                    </section>
                </div>

                {/* Right Column: Pricing Summary */}
                <div className="col-span-12 lg:col-span-4">
                    <div className="sticky top-12 space-y-6">
                        <section className="bg-primary text-on-primary p-8 rounded-2xl shadow-2xl shadow-primary/30 relative overflow-hidden">
                            {/* Decorative Background */}
                            <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
                            <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-primary-container/20 rounded-full blur-2xl"></div>
                            
                            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-200 mb-8">Résumé Estimatif</h3>
                            
                            <div className="space-y-6 relative z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-2xl font-bold font-headline">{diffDays()} Jours de Location</p>
                                        <p className="text-xs text-blue-100/60">{selectedVehicle ? `${selectedVehicle.marque_name} ${selectedVehicle.modele_name}` : 'Aucun véhicule sélectionné'}</p>
                                    </div>
                                    <p className="text-lg font-semibold">{ (diffDays() * formData.prix_par_jour).toLocaleString() } DH</p>
                                </div>
                                
                                {formData.chauffeur_service && (
                                    <div className="flex justify-between items-center py-4 border-y border-white/10">
                                        <p className="text-sm font-medium">Supplement Chauffeur</p>
                                        <p className="text-sm font-medium">+{(diffDays() * 50).toLocaleString()} DH</p>
                                    </div>
                                )}
                                
                                <div className="pt-4">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-blue-200 mb-1">Total Approximatif</p>
                                    <div className="flex items-baseline justify-between">
                                        <p className="text-5xl font-extrabold tracking-tighter font-headline">{totalEstimate().toLocaleString()} DH</p>
                                        <p className="text-xs text-blue-100/80">TTC</p>
                                    </div>
                                </div>

                                {isCautionActive && (
                                    <div className="mt-8 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-green-300 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-green-300">Caution Requise</span>
                                        </div>
                                        <p className="text-lg font-bold">{parseFloat(formData.caution || 0).toLocaleString()} DH</p>
                                        <p className="text-[10px] text-white/50 leading-relaxed mt-1 italic">Retenue autorisée sur carte ou par dépôt. Libérée après inspection conforme de l'actif.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
                            <div className="flex items-center gap-3 text-on-surface-variant">
                                <span className="material-symbols-outlined text-sm">info</span>
                                <p className="text-xs leading-relaxed">Le système vérifie automatiquement la disponibilité en temps réel.</p>
                            </div>
                            <div className="flex items-center gap-3 text-on-surface-variant">
                                <span className="material-symbols-outlined text-sm">lock</span>
                                <p className="text-xs leading-relaxed">Les contrats sont légalement contraignants dès la validation du concierge.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <AddClientModal 
                isOpen={showClientModal} 
                onClose={() => setShowClientModal(false)} 
                onClientCreated={(newClient) => {
                    setClients(prev => [...prev, newClient]);
                    setFormData(prev => ({ ...prev, client: newClient.id }));
                }}
            />
        </div>
    );
};

const AddClientModal = ({ isOpen, onClose, onClientCreated }) => {
    const [formData, setFormData] = useState({
        prenom: '',
        nom: '',
        cin_passport: '',
        email: '',
        telephone: '',
        adresse: '',
        permis_conduite: '',
        date_delivrance_permis: '',
        remarques: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('clients/', formData);
            onClientCreated(response.data);
            onClose();
            // Reset form
            setFormData({
                prenom: '', nom: '', cin_passport: '', email: '',
                telephone: '', adresse: '', permis_conduite: '',
                date_delivrance_permis: '', remarques: ''
            });
        } catch (err) {
            console.error("Error creating client:", err);
            setError(err.response?.data ? JSON.stringify(err.response.data) : "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xl font-bold font-headline text-primary">Nouveau Client Rapide</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Prénom</label>
                            <input name="prenom" value={formData.prenom} onChange={handleChange} required className="w-full bg-slate-50 border-none rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20" placeholder="ex. Adam" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nom</label>
                            <input name="nom" value={formData.nom} onChange={handleChange} required className="w-full bg-slate-50 border-none rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20" placeholder="ex. Bennett" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">CIN / Passeport</label>
                            <input name="cin_passport" value={formData.cin_passport} onChange={handleChange} required className="w-full bg-slate-50 border-none rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20" placeholder="ex. AB123456" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Téléphone</label>
                            <input name="telephone" value={formData.telephone} onChange={handleChange} required className="w-full bg-slate-50 border-none rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20" placeholder="+212 6..." />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Permis de Conduire</label>
                            <input name="permis_conduite" value={formData.permis_conduite} onChange={handleChange} required className="w-full bg-slate-50 border-none rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20" placeholder="Numéro de permis" />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Annuler</button>
                        <button type="submit" disabled={loading} className="flex-[2] px-4 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-95 transition-all disabled:opacity-50">
                            {loading ? 'Création...' : 'Créer et Sélectionner'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContractForm;
