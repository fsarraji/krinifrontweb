import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { resolveImage } from '../imageUrl';
import Dropdown from './Dropdown';

const Marketplace = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'All Vehicles',
    price: 1000,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/').replace(/\/$/, "");
      const response = await axios.get(`${baseUrl}/public-vehicles/`);
      setVehicles(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesCategory = filters.category === 'All Vehicles' || 
                             (filters.category === 'Luxury Sedan' && vehicle.marque_name?.includes('Mercedes') || vehicle.marque_name?.includes('Porsche')) ||
                             (filters.category === 'Premium SUV' && vehicle.modele_name?.includes('SUV') || vehicle.modele_name?.includes('Range')) ||
                             (filters.category === 'Sports Coupe' && vehicle.modele_name?.includes('911'));
    const matchesPrice = parseFloat(vehicle.prix_par_jour) <= filters.price;
    return matchesCategory && matchesPrice;
  });

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="bg-[#f7f9fb] dark:bg-slate-900 sticky top-0 z-50 shadow-sm">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-12">
            <span className="text-2xl font-bold tracking-tighter text-[#00236f] dark:text-white font-manrope cursor-pointer" onClick={() => navigate('/')}>Vantage Marketplace</span>
            <div className="hidden md:flex items-center gap-8 font-manrope text-sm font-semibold tracking-tight">
              <a className="text-[#00236f] dark:text-white border-b-2 border-[#00236f] dark:border-blue-400 pb-1" href="#">Browse</a>
              <a className="text-slate-500 dark:text-slate-400 hover:text-[#00236f] dark:hover:text-white transition-colors" href="#">Agencies</a>
              <a className="text-slate-500 dark:text-slate-400 hover:text-[#00236f] dark:hover:text-white transition-colors" href="#">Insurance</a>
              <a className="text-slate-500 dark:text-slate-400 hover:text-[#00236f] dark:hover:text-white transition-colors" href="#">Support</a>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-slate-500">
              <span className="material-symbols-outlined cursor-pointer hover:bg-[#f2f4f6] p-2 rounded-md transition-all">language</span>
              <span className="material-symbols-outlined cursor-pointer hover:bg-[#f2f4f6] p-2 rounded-md transition-all">help_outline</span>
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="bg-[#00236f] text-white px-5 py-2.5 rounded-lg text-sm font-semibold tracking-wide active:scale-95 duration-150 ease-in-out transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-6 py-8">
        {/* Hero Search Section */}
        <section className="mb-12">
          <div className="relative rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center mb-[-60px]">
            <img 
              alt="Hero" 
              className="absolute inset-0 w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCidonWutwMfI3gt6Dn1pxetj6tgSwnnpvZsS1llaF7dKjA1v_R32PgzTQxl275uqrsG3oWx2fRHP7pkJXajnH1nCgty3DcwRD9FbmZYeI2jP7lgSrCtlZihZmplDWxw2CGcP_UnynP5jPU9czcSgKarfbFsNDwFWq6bxj_Jp0T6ljTytcX_h602xbm2BgFMKabGDWoa58CVbdxm7q-A8ZFh0JLSr59BvKOsoIjyyDyQkoYCiIMJzEJWt7ZGEfSGYHSJzdXtbZOsKg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#00236f]/60 to-transparent"></div>
            <div className="relative z-10 text-center px-4">
              <h1 className="text-white text-5xl md:text-6xl font-extrabold tracking-tight mb-4 font-manrope">The Precision Concierge.</h1>
              <p className="text-white/90 text-xl max-w-2xl mx-auto">Discover the world's most exclusive fleet, curated for your journey.</p>
            </div>
          </div>

          {/* Search Bar Overlay */}
          <div className="relative z-20 max-w-5xl mx-auto bg-white p-4 rounded-xl shadow-xl flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 px-1">Location</label>
              <div className="bg-slate-50 flex items-center px-4 py-3 rounded-lg border-b-2 border-transparent focus-within:border-[#00236f] transition-all">
                <span className="material-symbols-outlined text-slate-400 mr-2">location_on</span>
                <input className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium" placeholder="Pick-up City or Airport" type="text"/>
              </div>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 px-1">Dates</label>
              <div className="bg-slate-50 flex items-center px-4 py-3 rounded-lg border-b-2 border-transparent focus-within:border-[#00236f] transition-all">
                <span className="material-symbols-outlined text-slate-400 mr-2">calendar_today</span>
                <input className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium" placeholder="Oct 24 - Oct 28" type="text"/>
              </div>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 px-1">Vehicle Category</label>
              <div className="bg-slate-50 flex items-center px-4 py-3 rounded-lg border-b-2 border-transparent focus-within:border-[#00236f] transition-all">
                <span className="material-symbols-outlined text-slate-400 mr-2">directions_car</span>
                <Dropdown
                  options={[
                    { value: 'All Vehicles', label: 'All Vehicles' },
                    { value: 'Luxury Sedan', label: 'Luxury Sedan' },
                    { value: 'Premium SUV', label: 'Premium SUV' },
                    { value: 'Sports Coupe', label: 'Sports Coupe' }
                  ]}
                  value={filters.category}
                  onChange={(v) => setFilters({...filters, category: v})}
                />
              </div>
            </div>
            <button className="bg-[#00236f] hover:bg-[#1e3a8a] text-white px-8 py-3.5 rounded-lg font-bold transition-all h-[50px] flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">search</span>
              Find Vehicle
            </button>
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-8 mt-16">
          {/* Filter Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-8">
              <div>
                <h3 className="font-manrope font-bold text-lg mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00236f]">filter_list</span>
                  Refine Results
                </h3>
                <div className="space-y-8">
                  {/* Agency Filter Placeholder */}
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <span className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-4">Rental Agency</span>
                    <div className="space-y-3">
                      {['Vantage Elite', 'Hertz Premium', 'Sixt Luxury'].map(agency => (
                        <label key={agency} className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" className="rounded-sm text-[#00236f] focus:ring-[#00236f] h-4 w-4 border-slate-300" />
                          <span className="text-sm font-medium group-hover:text-[#00236f] transition-colors">{agency}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <span className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-4">Price / Day (Max ${filters.price})</span>
                    <input 
                      className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-[#00236f]" 
                      max="1000" min="50" step="50" type="range" 
                      value={filters.price}
                      onChange={(e) => setFilters({...filters, price: parseInt(e.target.value)})}
                    />
                    <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
                      <span>$50</span>
                      <span className="text-[#00236f]">$1,000+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Vehicle Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-8">
              <p className="text-sm text-slate-500">Showing <span className="font-bold text-slate-900">{filteredVehicles.length} luxury vehicles</span> available</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Sort by</span>
                <Dropdown
                  options={[
                    { value: 'Relevance', label: 'Relevance' },
                    { value: 'Price: Low to High', label: 'Price: Low to High' },
                    { value: 'Price: High to Low', label: 'Price: High to Low' }
                  ]}
                  defaultValue={{ value: 'Relevance', label: 'Relevance' }}
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00236f]"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredVehicles.map(vehicle => (
                  <div key={vehicle.id} className="group bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:translate-y-[-4px] hover:shadow-md">
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
                      <div className="absolute top-4 right-4">
                        <span className="bg-white/80 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-[#00236f]">
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
                        <div className="text-right">
                          <span className="text-2xl font-bold font-manrope text-[#00236f]">${vehicle.prix_par_jour}</span>
                          <span className="text-xs text-slate-400 font-bold block">/ DAY</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 py-4 mb-4 border-y border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="material-symbols-outlined text-sm">settings_input_component</span>
                          <span className="text-xs font-semibold">Automatic</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span className="material-symbols-outlined text-sm">local_gas_station</span>
                          <span className="text-xs font-semibold">{vehicle.carburant}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#00236f]/10 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#00236f] text-[14px]" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                          </div>
                          <span className="text-xs font-bold text-slate-500">{vehicle.agency_details?.name || 'Vantage Partner'}</span>
                        </div>
                        <button className="bg-[#00236f] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:shadow-lg transition-all">Book Now</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {filteredVehicles.length === 0 && !loading && (
              <div className="text-center py-20 bg-slate-50 rounded-xl">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">search_off</span>
                <p className="text-slate-500 font-medium">No vehicles found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-white mt-24">
        <div className="w-full py-12 px-8 flex flex-col md:flex-row justify-between items-center gap-6 max-w-screen-2xl mx-auto">
          <div className="flex flex-col gap-2">
            <span className="font-manrope font-bold text-white text-xl">Vantage Fleet Systems</span>
            <p className="text-xs tracking-wide text-slate-400">© 2024 Vantage Fleet Systems. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-xs tracking-wide uppercase">
            <a className="text-slate-400 hover:text-white underline transition-all" href="#">Privacy Policy</a>
            <a className="text-slate-400 hover:text-white underline transition-all" href="#">Terms of Service</a>
            <a className="text-slate-400 hover:text-white underline transition-all" href="#">Fleet Solutions</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Marketplace;
