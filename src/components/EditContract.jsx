import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import Dropdown from './Dropdown';
import api from '../api';

const EditContract = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [contract, setContract] = useState(null);
    const [paymentsHistory, setPaymentsHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentFormData, setPaymentFormData] = useState({
        amount: '',
        payment_method: 'Espèce',
        reference: '',
        notes: ''
    });
    const [formData, setFormData] = useState({
        statut: '',
        // Add other fields as needed based on the design
    });

    useEffect(() => {
        const fetchContractAndPayments = async () => {
            try {
                const response = await api.get(`contracts/${id}/`);
                setContract(response.data);
                setFormData({
                    statut: response.data.statut,
                });
                
                try {
                    const paymentsResponse = await api.get(`payments/?contract=${id}`);
                    setPaymentsHistory(paymentsResponse.data.results || paymentsResponse.data);
                } catch (err) {
                    console.error("Could not fetch payments history", err);
                }
                
                setLoading(false);
            } catch (error) {
                console.error("Erreur lors de la récupération du contrat", error);
                setLoading(false);
            }
        };
        fetchContractAndPayments();
    }, [id]);

    const handleSave = async () => {
        try {
            await api.patch(`contracts/${id}/`, formData);
            navigate('/contracts');
        } catch (error) {
            console.error("Erreur lors de la mise à jour du contrat", error);
        }
    };

    const handleDiscard = () => {
        navigate('/contracts');
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...paymentFormData,
                contract: parseInt(id),
                agency: contract.agency // From the contract
            };
            await api.post('payments/', payload);
            
            // Refresh contract to get new amounts
            const response = await api.get(`contracts/${id}/`);
            setContract(response.data);
            
            // Refresh payments list
            const paymentsResponse = await api.get(`payments/?contract=${id}`);
            setPaymentsHistory(paymentsResponse.data.results || paymentsResponse.data);
            
            setShowPaymentModal(false);
            setPaymentFormData({
                amount: '',
                payment_method: 'Espèce',
                reference: '',
                notes: ''
            });
        } catch (error) {
            console.error("Erreur lors de l'ajout du paiement. Assurez-vous d'être connecté et que l'API est correcte.", error);
            alert("Erreur lors de l'ajout du paiement. Consultez la console.");
        }
    };

    if (loading) return <div className="text-center mt-20 font-bold text-primary">Chargement du contrat...</div>;
    if (!contract) return <div className="text-center mt-20 font-bold text-error">Contrat non trouvé.</div>;

    return (
        <div className="max-w-6xl mx-auto px-0 mt-0">
            {/* Header Summary (Editorial Style) */}
            <div className="flex justify-between items-end mb-10">
                <div>
                    <p className="font-label text-xs uppercase tracking-[0.05em] text-slate-500 font-medium mb-1">Résumé du Contrat</p>
                    <h2 className="font-headline text-4xl font-extrabold text-primary tracking-tight">CTR-{id.toString().padStart(5, '0')}</h2>
                    <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                            <span className="text-sm font-medium">{contract.client_name} {contract.client_prenom}</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-slate-400">directions_car</span>
                            <span className="text-sm font-medium">{contract.vehicle_name}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleDiscard}
                        className="px-6 py-2.5 rounded-md text-sm font-semibold text-error hover:bg-error-container/30 transition-colors"
                    >
                        Abandonner les modifications
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-8 py-2.5 rounded-md text-sm font-semibold bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[0.98] transition-transform"
                    >
                        Enregistrer les modifications
                    </button>
                </div>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-12 gap-6">
                {/* Left Column: Settings & Period */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                    {/* Contract Status & Period */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Status Section */}
                        <section className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                            <h3 className="font-headline text-lg font-bold mb-6 flex items-center gap-2 text-primary">
                                <span className="material-symbols-outlined">rule</span> Statut du Contrat
                            </h3>
                            <div className="relative">
                                <label className="font-label text-[10px] uppercase font-bold text-slate-500 mb-2 block tracking-wider">Statut Actuel</label>
                                <Select 
                                    options={[
                                        { value: 'RESERVE', label: 'Réservé' },
                                        { value: 'EN_COURS', label: 'En cours' },
                                        { value: 'TERMINE', label: 'Terminé' },
                                        { value: 'ANNULE', label: 'Annulé' }
                                    ]}
                                    onChange={(opt) => setFormData({...formData, statut: opt ? opt.value : ''})}
                                    value={{ 
                                        value: formData.statut, 
                                        label: {
                                            'RESERVE': 'Réservé',
                                            'EN_COURS': 'En cours',
                                            'TERMINE': 'Terminé',
                                            'ANNULE': 'Annulé'
                                        }[formData.statut] || formData.statut 
                                    }}
                                    classNamePrefix="react-select"
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            backgroundColor: '#f8fafc',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            padding: '2px'
                                        })
                                    }}
                                />
                            </div>
                            <div className="mt-6 flex items-center gap-2 px-4 py-3 bg-green-50 rounded-lg text-green-700">
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                <p className="text-[10px] font-bold uppercase tracking-wider">Dernière vérification : il y a 2 heures</p>
                            </div>
                        </section>

                        {/* Rental Period Section */}
                        <section className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                            <h3 className="font-headline text-lg font-bold mb-6 flex items-center gap-2 text-primary">
                                <span className="material-symbols-outlined">calendar_today</span> Période de Location
                            </h3>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Départ</p>
                                    <p className="text-sm font-bold">{contract.formatted_dates?.start || contract.date_debut}</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-300">arrow_forward</span>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Retour</p>
                                    <p className="text-sm font-bold">{contract.formatted_dates?.end || contract.date_fin}</p>
                                </div>
                            </div>
                            <button className="w-full py-2.5 rounded-lg border-2 border-primary/10 text-primary text-[10px] font-bold hover:bg-primary/5 transition-colors uppercase tracking-widest">
                                Prolongation du contrat
                            </button>
                        </section>
                    </div>

                    {/* Payment Tracking Section */}
                    <section className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-headline text-lg font-bold flex items-center gap-2 text-primary">
                                <span className="material-symbols-outlined">payments</span> Suivi des Paiements
                            </h3>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-colors uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-xs">receipt</span> Voir Facture
                                </button>
                                <button onClick={() => setShowPaymentModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-[10px] font-bold hover:bg-primary/95 transition-colors uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-xs">add</span> Ajouter Paiement
                                </button>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {/* Payment Status Indicators */}
                            <div className="flex flex-col md:flex-row items-center gap-8 py-4 px-6 bg-slate-50/50 rounded-xl">
                                <div className="flex-1 w-full">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Progression du paiement</span>
                                        <span className="text-[10px] font-extrabold text-primary">{contract.montant_total ? ((contract.montant_paye / contract.montant_total * 100).toFixed(0)) : 0}% Collecté</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${contract.montant_total ? (contract.montant_paye / contract.montant_total * 100) : 0}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 mb-1"></span>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Payé</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="w-2.5 h-2.5 rounded-full bg-orange-400 mb-1"></span>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Partiel</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 mb-1"></span>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Impayé</span>
                                    </div>
                                </div>
                            </div>
                            {/* Transaction Log (Minimalist) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="p-4 bg-white rounded-lg border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Caution / Dépôt</p>
                                    <p className="text-sm font-bold text-green-600">{(contract.caution || 0).toLocaleString()} DH</p>
                                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-medium">Réglé au départ</p>
                                </div>
                                <div className="p-4 bg-white rounded-lg border border-slate-100">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Payé à ce jour</p>
                                    <p className="text-sm font-bold text-primary">{(contract.montant_paye || 0).toLocaleString()} DH</p>
                                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-medium">Historique validé</p>
                                </div>
                                <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-200 border-dashed">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Reste à payer</p>
                                    <p className="text-sm font-bold text-red-600">{(contract.reste_a_payer || 0).toLocaleString()} DH</p>
                                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-medium">À collecter au retour</p>
                                </div>
                            </div>
                            
                            {/* Payments History List */}
                            {paymentsHistory.length > 0 && (
                                <div className="mt-6 border border-slate-100 rounded-lg overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Historique des transactions</span>
                                    </div>
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3">Méthode</th>
                                                <th className="px-4 py-3">Référence / Notes</th>
                                                <th className="px-4 py-3 text-right">Montant</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paymentsHistory.map(pay => (
                                                <tr key={pay.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-slate-600">
                                                        {new Date(pay.payment_date || pay.created_at).toLocaleDateString('fr-FR', {
                                                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                                            {pay.payment_method}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs">
                                                        {pay.reference || '- '}
                                                        {pay.notes && <span className="block text-[10px] text-slate-400">{pay.notes}</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-green-600 whitespace-nowrap">
                                                        +{parseFloat(pay.amount).toLocaleString()} DH
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column: Financial & Documents */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    {/* Financial Summary (High Contrast Card) */}
                    <section className="bg-[#00236f] text-white p-8 rounded-xl shadow-2xl shadow-primary/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="material-symbols-outlined text-6xl">account_balance_wallet</span>
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-headline text-lg font-bold mb-8 flex items-center gap-2">
                                <span className="material-symbols-outlined">insights</span> Résumé Financier
                            </h3>
                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">Valeur Totale du Contrat</p>
                                    <p className="font-headline text-2xl font-bold">{parseFloat(contract.montant_total).toLocaleString()} DH</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">Payé à ce jour</p>
                                        <p className="text-lg font-bold text-green-300">{(contract.montant_paye || 0).toLocaleString()} DH</p>
                                    </div>
                                    <span className="text-2xl opacity-20 font-light">−</span>
                                </div>
                                <div className="pt-6 border-t border-white/10">
                                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Solde Restant</p>
                                    <p className="font-headline text-4xl font-extrabold text-white">{(contract.reste_a_payer || 0).toLocaleString()} DH</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Documents Section */}
                    <section className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <h3 className="font-headline text-lg font-bold mb-6 flex items-center gap-2 text-primary">
                            <span className="material-symbols-outlined">folder_open</span> Documents
                        </h3>
                        <div className="flex flex-col gap-3">
                            <button className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-left group">
                                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                                    <span className="material-symbols-outlined">picture_as_pdf</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-900 line-clamp-1">Contrat_Signe_{id}.pdf</p>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase">PDF • 2.4 MB</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">download</span>
                            </button>
                            <button className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-left group">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">mail</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-900">Renvoyer au Client</p>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase">{contract.client_email || 'client@email.com'}</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">send</span>
                            </button>
                        </div>
                    </section>

                    {/* Critical Actions */}
                    <section className="mt-4">
                        <button className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-red-100 text-red-600 hover:bg-red-50 transition-colors text-[10px] font-bold uppercase tracking-widest bg-white shadow-sm">
                            <span className="material-symbols-outlined text-lg">gavel</span> Résilier le Contrat
                        </button>
                        <p className="text-[9px] text-center mt-3 text-slate-400 leading-relaxed px-4 font-medium uppercase tracking-tight">
                            La résiliation est irréversible et déclenchera le protocole de retour véhicule.
                        </p>
                    </section>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-headline text-xl font-bold text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-600">attach_money</span> 
                                Ajouter un Paiement
                            </h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-error transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleAddPayment} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Montant (DH) <span className="text-error">*</span></label>
                                <input 
                                    type="number" 
                                    required
                                    min="1"
                                    step="0.01"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-slate-800"
                                    placeholder="Ex: 1500"
                                    value={paymentFormData.amount}
                                    onChange={(e) => setPaymentFormData({...paymentFormData, amount: e.target.value})}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Méthode de Paiement <span className="text-error">*</span></label>
                                <Dropdown
                                    options={[
                                        { value: 'Espèce', label: 'Espèce (Cash)' },
                                        { value: 'TPE', label: 'Carte Bancaire (TPE)' },
                                        { value: 'Virement', label: 'Virement Bancaire' },
                                        { value: 'Chèque', label: 'Chèque' }
                                    ]}
                                    value={paymentFormData.payment_method}
                                    onChange={(v) => setPaymentFormData({...paymentFormData, payment_method: v})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Référence (Optionnel)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                                    placeholder="N° Chèque ou Réf Virement"
                                    value={paymentFormData.reference}
                                    onChange={(e) => setPaymentFormData({...paymentFormData, reference: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 placeholder:text-slate-400"
                                    placeholder="Détails supplémentaires..."
                                    rows="2"
                                    value={paymentFormData.notes}
                                    onChange={(e) => setPaymentFormData({...paymentFormData, notes: e.target.value})}
                                ></textarea>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                                    Annuler
                                </button>
                                <button type="submit" className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-white bg-primary shadow-lg shadow-primary/20 hover:bg-primary/95 hover:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-sm">check_circle</span> Valider le Paiement
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditContract;
