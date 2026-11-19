import { apiPathFromUrl } from '../utils/pagination';
import Button from './ui/Button';
import Card from './ui/Card';
import { CheckboxInput, Slider } from '@astryxdesign/core';
import { Input } from './ui/Input';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { resolveImage } from '../imageUrl';
import Dropdown from './Dropdown';
import { formatMoney } from '../utils/formatters';
import { useI18n } from '../i18n/context';

const Marketplace = () => {
  const { t } = useI18n();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'All Vehicles',
    price: 1000,
  });
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/').replace(/\/$/, "");
        // Endpoint public paginé : on suit `next` pour tout récupérer (axios nu, sans jeton).
        let url = `${baseUrl}/public-vehicles/?page_size=100`;
        let all = [];
        while (url) {
          const { data } = await axios.get(url);
          if (Array.isArray(data)) { all = all.concat(data); url = null; }
          else { all = all.concat(data.results || []); url = data.next ? `${baseUrl}/${apiPathFromUrl(data.next)}` : null; }
        }
        if (!cancelled) setVehicles(all);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredVehicles = vehicles.filter(vehicle => {
    const brand = vehicle.marque_name || '';
    const model = vehicle.modele_name || '';
    const matchesCategory = filters.category === 'All Vehicles' ||
                             (filters.category === 'Luxury Sedan' && (brand.includes('Mercedes') || brand.includes('Porsche'))) ||
                             (filters.category === 'Premium SUV' && (model.includes('SUV') || model.includes('Range'))) ||
                             (filters.category === 'Sports Coupe' && model.includes('911'));
    const matchesPrice = parseFloat(vehicle.prix_par_jour) <= filters.price;
    return matchesCategory && matchesPrice;
  });

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="bg-app-bg dark:bg-slate-900 sticky top-0 z-50 shadow-sm">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-12">
            <span className="text-2xl font-bold tracking-tighter text-primary dark:text-white font-manrope cursor-pointer" onClick={() => navigate('/')}>Kricar Marketplace</span>
            <div className="hidden md:flex items-center gap-8 font-manrope text-sm font-semibold tracking-tight">
              <a className="text-primary dark:text-white border-b-2 border-primary dark:border-blue-400 pb-1" href="#">{t('u.parcourir')}</a>
              <a className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white transition-colors" href="#">{t('u.agences')}</a>
              <a className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white transition-colors" href="#">{t('u.assurance')}</a>
              <a className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white transition-colors" href="#">{t('u.assistance')}</a>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-slate-500">
              <span className="material-symbols-outlined cursor-pointer hover:bg-surface-hover p-2 rounded-md transition-all">language</span>
              <span className="material-symbols-outlined cursor-pointer hover:bg-surface-hover p-2 rounded-md transition-all">help_outline</span>
            </div>
            <Button onClick={() => navigate('/login')}>{t('u.se_connecter')}</Button>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-6 py-8">
        {/* Hero Search Section */}
        <section className="mb-12">
          <div className="relative rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center mb-[-60px]">
            <img 
              alt="" 
              className="absolute inset-0 w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCidonWutwMfI3gt6Dn1pxetj6tgSwnnpvZsS1llaF7dKjA1v_R32PgzTQxl275uqrsG3oWx2fRHP7pkJXajnH1nCgty3DcwRD9FbmZYeI2jP7lgSrCtlZihZmplDWxw2CGcP_UnynP5jPU9czcSgKarfbFsNDwFWq6bxj_Jp0T6ljTytcX_h602xbm2BgFMKabGDWoa58CVbdxm7q-A8ZFh0JLSr59BvKOsoIjyyDyQkoYCiIMJzEJWt7ZGEfSGYHSJzdXtbZOsKg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent"></div>
            <div className="relative z-10 text-center px-4">
              <h1 className="text-white text-5xl md:text-6xl font-extrabold tracking-tight mb-4 font-manrope">{t('u.le_concierge_de_prcision')}</h1>
              <p className="text-white/90 text-xl max-w-2xl mx-auto">{t('u.dcouvrez_une_flotte_exclusive_sl')}</p>
            </div>
          </div>

          {/* Search Bar Overlay */}
          <div className="relative z-20 max-w-5xl mx-auto bg-white p-4 rounded-xl shadow-xl flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 px-1">{t('u.lieu')}</label>
              <div className="bg-slate-50 flex items-center px-4 py-3 rounded-lg border-b-2 border-transparent focus-within:border-primary transition-all">
                <span className="material-symbols-outlined text-slate-400 me-2">location_on</span>
                <Input className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium" placeholder={t('u.ville_ou_aroport_de_dpart')} type="text"/>
              </div>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 px-1">{t('u.dates')}</label>
              <div className="bg-slate-50 flex items-center px-4 py-3 rounded-lg border-b-2 border-transparent focus-within:border-primary transition-all">
                <span className="material-symbols-outlined text-slate-400 me-2">calendar_today</span>
                <Input className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium" placeholder="24 oct. - 28 oct." type="text"/>
              </div>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 px-1">{t('u.catgorie_de_vhicule')}</label>
              <div className="bg-slate-50 flex items-center px-4 py-3 rounded-lg border-b-2 border-transparent focus-within:border-primary transition-all">
                <span className="material-symbols-outlined text-slate-400 me-2">directions_car</span>
                <Dropdown
                  options={[
                    { value: 'All Vehicles', label: t('u.tous_les_vhicules') },
                    { value: 'Luxury Sedan', label: t('u.berline_de_luxe') },
                    { value: 'Premium SUV', label: t('u.suv_premium') },
                    { value: 'Sports Coupe', label: t('u.coup_sport') }
                  ]}
                  value={filters.category}
                  onChange={(v) => setFilters({...filters, category: v})}
                />
              </div>
            </div>
            <Button size="lg" icon="search">{t('u.trouver_un_vhicule')}</Button>
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-8 mt-16">
          {/* Filter Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-8">
              <div>
                <h3 className="font-manrope font-bold text-lg mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">filter_list</span>
                  {t('u.affiner_les_rsultats')}
                </h3>
                <div className="space-y-8">
                  {/* Agency Filter Placeholder */}
                  <Card padding={4} variant="muted">
                    <span className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-4">{t('u.agence_de_location')}</span>
                    <div className="space-y-3">
                      {['Vantage Elite', 'Hertz Premium', 'Sixt Luxury'].map(agency => (
                        <CheckboxInput key={agency} label={agency} value={false} onChange={() => {}} />
                      ))}
                    </div>
                  </Card>

                  {/* Price Range */}
                  <Card padding={4} variant="muted">
                    <span className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-4">{t('u.prix_jour_max', { max: formatMoney(filters.price, { decimals: 0 }) })}</span>
                    <Slider
                        label={t('u.prix_jour_max', { max: formatMoney(filters.price, { decimals: 0 }) })}
                        isLabelHidden
                        min={50}
                        max={1000}
                        step={50}
                        value={filters.price}
                        onChange={(v) => setFilters({ ...filters, price: v })}
                        valueDisplay="none"
                    />
                    <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
                      <span>50 MAD</span>
                      <span className="text-primary">1 000+ MAD</span>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </aside>

          {/* Vehicle Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-8">
              <p className="text-sm text-slate-500">{t('u.affichage_de')} <span className="font-bold text-slate-900">{t('u.vhicules_2', { n: filteredVehicles.length })}</span> {t('u.disponibles_2')}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">{t('u.trier_par')}</span>
                <Dropdown
                  options={[
                    { value: 'Relevance', label: t('u.pertinence') },
                    { value: 'Price: Low to High', label: t('u.prix_croissant') },
                    { value: 'Price: High to Low', label: t('u.prix_dcroissant') }
                  ]}
                  defaultValue={{ value: 'Relevance', label: t('u.pertinence') }}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '36px',
                      padding: '0 4px'
                    })
                  }}
                  className="w-48"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredVehicles.map(vehicle => (
                  <Card padding={0} variant="default" key={vehicle.id} className="group overflow-hidden transition-all duration-300 hover:translate-y-[-4px]">
                    <div className="relative h-64 overflow-hidden bg-slate-100">
                      {resolveImage(vehicle.image) ? (
                        <img 
                          alt={vehicle.modele_name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          src={resolveImage(vehicle.image)}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-6xl">directions_car</span>
                        </div>
                      )}
                      <div className="absolute top-4 end-4">
                        <span className="bg-white/80 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-primary">
                          {vehicle.carburant}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-xl font-extrabold font-manrope leading-none">{vehicle.marque_name} {vehicle.modele_name}</h3>
                          <p className="text-sm text-slate-400 font-medium mt-1">{vehicle.annee} • {vehicle.couleur}</p>
                        </div>
                        <div className="text-end">
                          <span className="text-2xl font-bold font-manrope text-primary">{formatMoney(vehicle.prix_par_jour, { decimals: 0 })}</span>
                          <span className="text-xs text-slate-400 font-bold block">{t('u.jour_2')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 py-4 mb-4 border-y border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="material-symbols-outlined text-sm">settings_input_component</span>
                          <span className="text-xs font-semibold">{t('u.automatique')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="material-symbols-outlined text-sm">local_gas_station</span>
                          <span className="text-xs font-semibold">{vehicle.carburant}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                          </div>
                          <span className="text-xs font-bold text-slate-500">{vehicle.agency_details?.name || 'Kricar Partner'}</span>
                        </div>
                        <Button>{t('u.rserver')}</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            
            {filteredVehicles.length === 0 && !loading && (
              <div className="text-center py-20 bg-slate-50 rounded-xl">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">search_off</span>
                <p className="text-slate-500 font-medium">{t('u.aucun_vhicule_ne_correspond_vos_')}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-white mt-24">
        <div className="w-full py-12 px-8 flex flex-col md:flex-row justify-between items-center gap-6 max-w-screen-2xl mx-auto">
          <div className="flex flex-col gap-2">
            <span className="font-manrope font-bold text-white text-xl">Kricar Agency</span>
            <p className="text-xs tracking-wide text-slate-400">{t('u.2026_kricar_agency_tous_droits_r')}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-xs tracking-wide uppercase">
            <a className="text-slate-400 hover:text-white underline transition-all" href="#">{t('u.confidentialit')}</a>
            <a className="text-slate-400 hover:text-white underline transition-all" href="#">{t('u.conditions_d_utilisation')}</a>
            <a className="text-slate-400 hover:text-white underline transition-all" href="#">{t('u.solutions_de_flotte')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Marketplace;
