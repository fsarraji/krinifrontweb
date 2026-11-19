import React, { useState, useEffect, useMemo } from 'react';
import { apiErrorText } from '../utils/apiErrorText';
import ErrorBanner from './ui/ErrorBanner';
import StatusBadge from './ui/StatusBadge';
import PageHeader from './ui/PageHeader';
import Card from './ui/Card';
import { useNavigate } from 'react-router-dom';
import { fetchAllPages } from '../api';
import SearchFilterBar from './SearchFilterBar';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { formatDate, formatMoney } from '../utils/formatters';
import { SkeletonCards, SkeletonTable } from './Skeleton';
import { normalizeVehicleStatut } from '../utils/vehicleStatus';
import { useI18n } from '../i18n/context';

const Calendar = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedContract, setSelectedContract] = useState(null);

    const now = new Date();

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    // Timeline calculations
    const dayWidth = 62; // px per day
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonthCount = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInMonth = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);

    const monthLabel = formatDate(new Date(currentYear, currentMonth, 1), { month: 'long', year: 'numeric' });
    const monthDisplay = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    const FILTER_OPTIONS = [
        { value: 'ALL', label: t('u.toute_la_flotte'), dot: 'bg-primary' },
        { value: 'Rented', label: t('u.en_location'), dot: 'bg-success' },
        { value: 'Reserved', label: t('u.rservs'), dot: 'bg-indigo-500' },
        { value: 'Available', label: t('u.disponibles'), dot: 'bg-slate-400' },
        { value: 'Maintenance', label: t('status.Maintenance'), dot: 'bg-danger' },
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vehicles, contracts] = await Promise.all([
                    fetchAllPages('vehicles/'),
                    fetchAllPages('contracts/')
                ]);
                setVehicles(Array.isArray(vehicles) ? vehicles : []);
                setContracts(Array.isArray(contracts) ? contracts : []);
            } catch (error) {
                console.error("Erreur chargement calendrier:", error);
                setLoadError(apiErrorText(error, t('common.loadError')));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [reloadKey]);

    const getDayName = (day) => {
        const date = new Date(currentYear, currentMonth, day);
        return formatDate(date, { weekday: 'short' }).replace('.', '').toUpperCase();
    };
    const isWeekendDay = (day) => [0, 6].includes(new Date(currentYear, currentMonth, day).getDay());

    const getPosition = (dateStr) => {
        const date = new Date(dateStr);
        if (date.getFullYear() < currentYear || (date.getFullYear() === currentYear && date.getMonth() < currentMonth)) {
            return 0;
        }
        if (date.getFullYear() > currentYear || (date.getFullYear() === currentYear && date.getMonth() > currentMonth)) {
            return daysInMonthCount * dayWidth;
        }
        const day = date.getDate();
        const hours = date.getHours();
        return (day - 1) * dayWidth + (hours / 24) * dayWidth;
    };

    const calculateBar = (startStr, endStr) => {
        const startPos = getPosition(startStr);
        const endPos = getPosition(endStr);
        const width = Math.max(endPos - startPos, 28);
        return {
            left: `${startPos}px`,
            width: `${width}px`
        };
    };

    // Filter vehicles by search and status
    const filteredVehicles = useMemo(() => {
        return vehicles.filter(v => {
            const q = search.trim().toLowerCase();
            const matchSearch = !q || [v.matricule, v.marque_name, v.modele_name, v.carburant]
                .filter(Boolean)
                .some(x => x.toLowerCase().includes(q));

            if (!matchSearch) return false;

            const vehicleContracts = contracts.filter(c => c.vehicle === v.id && c.statut !== 'ANNULE');
            const isRented = normalizeVehicleStatut(v.statut) === 'Rented' || vehicleContracts.some(c => c.statut === 'EN_COURS');
            const isReserved = vehicleContracts.some(c => c.statut === 'RESERVE');
            const isMaintenance = normalizeVehicleStatut(v.statut) === 'Maintenance';
            const isAvailable = !isRented && !isReserved && !isMaintenance;

            if (statusFilter === 'Rented') return isRented;
            if (statusFilter === 'Reserved') return isReserved;
            if (statusFilter === 'Maintenance') return isMaintenance;
            if (statusFilter === 'Available') return isAvailable;
            return true;
        });
    }, [vehicles, contracts, search, statusFilter]);

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="h-8 w-64 bg-slate-200 animate-pulse rounded-xl"></div>
                <SkeletonCards count={4} />
                <SkeletonTable rows={6} cols={7} />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                eyebrow={t('u.planning_flotte')}
                title={t('u.planning_interactif_gantt')}
                className="!mb-0"
                actions={(
                    <div className="flex items-center justify-between gap-1 sm:gap-3 w-full sm:w-auto bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                        <Button variant="ghost" iconOnly icon="chevron_left" onClick={handlePrevMonth} aria-label={t('u.mois_prcdent')} title={t('u.mois_prcdent')} />
                        <Button variant="secondary" size="sm" onClick={handleToday}>{t('u.aujourd_hui')}</Button>
                        <span className="text-sm font-extrabold text-slate-900 px-1 sm:px-2 flex-1 sm:flex-none sm:min-w-[140px] text-center truncate">
                            {monthDisplay}
                        </span>
                        <Button variant="ghost" iconOnly icon="chevron_right" onClick={handleNextMonth} aria-label={t('u.mois_suivant')} title={t('u.mois_suivant')} />
                    </div>
                )}
            />
            {loadError && <ErrorBanner message={loadError} onRetry={() => { setLoadError(''); setLoading(true); setReloadKey((k) => k + 1); }} className="mb-4" />}

            {/* Search & Filter Bar */}
            <div>
                <SearchFilterBar
                    placeholder={t('u.filtrer_le_planning_matricule_ma')}
                    search={search}
                    onSearchChange={setSearch}
                    options={FILTER_OPTIONS}
                    filter={statusFilter}
                    onFilterChange={setStatusFilter}
                />
            </div>

            {/* Timeline Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs font-semibold text-slate-600">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-success"></span> {t('u.location_en_cours')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary"></span> {t('u.rservation_confirme')}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-danger"></span> Maintenance
                    </span>
                </div>
                <span className="text-slate-400 font-medium">{t('u.cliquez_sur_un_contrat_pour_affi')}</span>
            </div>

            {/* Gantt Timeline Board */}
            <Card padding={0} variant="default" dir="ltr" className="overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <div className="min-w-max flex flex-col">
                        {/* Days Header */}
                        <div className="flex sticky top-0 z-20 bg-app-bg border-b border-slate-200">
                            {/* Vehicle Column Header */}
                            <div className="w-[245px] shrink-0 h-[54px] px-4 border-r border-slate-100 bg-app-bg sticky left-0 top-0 z-40 shadow-[4px_0_10px_-4px_rgba(16,24,40,0.10)] font-bold text-xs text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">directions_car</span>
                                {t('u.vhicule')}
                            </div>

                            {/* Days Timeline */}
                            <div className="flex" style={{ width: `${daysInMonthCount * dayWidth}px` }}>
                                {daysInMonth.map((day) => {
                                    const dayName = getDayName(day);
                                    const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
                                    const isWeekend = isWeekendDay(day);
                                    return (
                                        <div
                                            key={day}
                                            style={{ width: `${dayWidth}px` }}
                                            className={`relative h-[54px] flex flex-col items-center justify-center border-r border-slate-100 ${isWeekend ? 'bg-danger-bg/40' : ''} ${isToday ? 'bg-primary-light/30' : ''}`}
                                        >
                                            <p className={`text-[10px] font-bold ${isWeekend ? 'text-danger' : 'text-slate-400'}`}>{dayName}</p>
                                            <p className={`text-xs font-extrabold mt-0.5 ${
                                                isToday
                                                    ? 'bg-primary text-white rounded-lg px-[7px] py-[4px] shadow-sm'
                                                    : isWeekend ? 'text-danger' : 'text-slate-600'
                                            }`}>
                                                {day.toString().padStart(2, '0')}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Vehicle Rows */}
                        <div className="divide-y divide-slate-100">
                            {filteredVehicles.map((vehicle) => {
                                const vehicleContracts = contracts.filter(c => c.vehicle === vehicle.id && c.statut !== 'ANNULE');
                                const isMaintenance = normalizeVehicleStatut(vehicle.statut) === 'Maintenance';

                                return (
                                    <div key={vehicle.id} className="flex h-[76px] group hover:bg-slate-50/70 transition-colors">
                                        {/* Vehicle Info Sticky Left Column */}
                                        <div className="w-[245px] shrink-0 px-4 border-r border-slate-100 bg-white sticky left-0 z-30 group-hover:bg-slate-50/70 transition-colors flex items-center gap-3 shadow-[4px_0_10px_-4px_rgba(16,24,40,0.10)]">
                                            {vehicle.image ? (
                                                <img src={vehicle.image} alt={vehicle.matricule} className="w-[46px] h-9 rounded-lg object-cover border border-slate-200 shadow-sm shrink-0" />
                                            ) : (
                                                <div className="w-[46px] h-9 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                                    <span className="material-symbols-outlined text-lg">directions_car</span>
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-slate-900 truncate" title={`${vehicle.marque_name} ${vehicle.modele_name}`}>
                                                    {vehicle.marque_name} {vehicle.modele_name}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="font-mono text-[10px] font-bold text-primary bg-surface-container-high px-1.5 py-0.5 rounded">
                                                        {vehicle.matricule}
                                                    </span>
                                                    {isMaintenance && (
                                                        <span className="text-[9px] font-bold text-danger-dark bg-danger-bg px-1.5 py-0.5 rounded">
                                                            {t('u.maint')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timeline Bar Track */}
                                        <div className="relative h-[76px] flex-1" style={{ width: `${daysInMonthCount * dayWidth}px` }}>
                                            {/* Today Vertical Highlight Line */}
                                            {currentMonth === now.getMonth() && currentYear === now.getFullYear() && (
                                                <div
                                                    className="absolute top-0 bottom-0 w-[2px] bg-indigo-500/40 pointer-events-none z-10"
                                                    style={{ left: `${(now.getDate() - 1) * dayWidth + (now.getHours() / 24) * dayWidth}px` }}
                                                />
                                            )}

                                            {/* Contracts Overlay */}
                                            {vehicleContracts.map(contract => {
                                                const barStyle = calculateBar(contract.date_sortie, contract.date_retour_prevue);
                                                const isActive = contract.statut === 'EN_COURS';

                                                return (
                                                    <button
                                                        type="button"
                                                        key={contract.id}
                                                        onClick={() => setSelectedContract(contract)}
                                                        aria-label={t('u.contrat', { id: contract.id, name: contract.client_name || contract.client_prenom })}
                                                        style={barStyle}
                                                        className={`absolute top-[18px] h-10 rounded-xl px-3 flex items-center justify-between gap-2 cursor-pointer transition-all z-20 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                                            isActive
                                                                ? 'bg-success text-white shadow-md hover:brightness-95 hover:-translate-y-px hover:shadow-md'
                                                                : 'bg-primary text-white shadow-md hover:brightness-95 hover:-translate-y-px hover:shadow-md'
                                                        }`}
                                                    >
                                                        <span className="text-xs font-extrabold truncate">
                                                            #{contract.id} — {contract.client_name || contract.client_prenom}
                                                        </span>
                                                        <span className="material-symbols-outlined text-sm text-white/80 shrink-0">info</span>
                                                    </button>
                                                );
                                            })}

                                            {/* Maintenance Bar */}
                                            {isMaintenance && vehicleContracts.length === 0 && (
                                                <div className="absolute inset-x-2 top-[18px] h-10 rounded-xl bg-danger text-white shadow-md flex items-center justify-center gap-2 text-xs font-bold z-10">
                                                    <span className="material-symbols-outlined text-base text-white/90">build</span>
                                                    <span>{t('u.vhicule_en_maintenance')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {filteredVehicles.length === 0 && (
                                <div className="p-12 text-center text-slate-400 font-medium">
                                    {t('u.aucun_vhicule_trouv_pour_ce_filt')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Contract Details Modal */}
            <Modal
                isOpen={Boolean(selectedContract)}
                onClose={() => setSelectedContract(null)}
                title={selectedContract ? `#CTR-${selectedContract.id.toString().padStart(5, '0')}` : ''}
                subtitle={t('u.dtails_du_contrat')}
                size="sm"
                footer={(
                    <>
                        <Button variant="outline" onClick={() => setSelectedContract(null)}>{t('u.fermer')}</Button>
                        <Button icon="edit" onClick={() => navigate(`/contracts/edit/${selectedContract.id}`)}>{t('u.modifier')}</Button>
                    </>
                )}
            >
                {selectedContract && (
                    <dl className="space-y-4 text-sm">
                        {[
                            [t('u.client'), `${selectedContract.client_name} ${selectedContract.client_prenom}`],
                            [t('u.vhicule'), `${selectedContract.vehicle_name} (${selectedContract.vehicle_matricule})`],
                            [t('u.priode'), `${formatDate(selectedContract.date_sortie)} ➔ ${formatDate(selectedContract.date_retour_prevue)}`],
                            [t('u.montant_total'), `${formatMoney(selectedContract.montant_total)} (${t('u.jours', { n: selectedContract.jours })})`],
                        ].map(([label, value]) => (
                            <div key={label} className="flex justify-between items-center gap-4 pb-3 border-b border-stroke">
                                <dt className="text-label-sm uppercase tracking-wider text-text-muted">{label}</dt>
                                <dd className="font-semibold text-on-surface text-right">{value}</dd>
                            </div>
                        ))}
                        <div className="flex justify-between items-center gap-4">
                            <dt className="text-label-sm uppercase tracking-wider text-text-muted">{t('u.statut')}</dt>
                            <dd>
                                <StatusBadge variant={selectedContract.statut === 'EN_COURS' ? 'success' : 'info'} label={selectedContract.statut === 'EN_COURS' ? t('u.en_cours_lou') : t('u.rserv')} />
                            </dd>
                        </div>
                    </dl>
                )}
            </Modal>
        </div>
    );
};

export default Calendar;
