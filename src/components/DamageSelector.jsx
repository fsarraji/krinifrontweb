import React, { useState, useRef } from 'react';
import carDiagram from '../assets/car_damage_diagram.webp';

const DamageSelector = ({ damages = [], onChange, readOnly = false, type = 'DEPART' }) => {
    const imgRef = useRef(null);
    const [activeDamageId, setActiveDamageId] = useState(null);

    const handleImageClick = (e) => {
        if (readOnly) return;
        if (!imgRef.current) return;
        
        const rect = imgRef.current.getBoundingClientRect();
        const xPos = e.clientX - rect.left;
        const yPos = e.clientY - rect.top;
        
        // Calculate percentages
        const xPercent = (xPos / rect.width) * 100;
        const yPercent = (yPos / rect.height) * 100;
        
        const newId = Date.now().toString(); // temporary ID for frontend
        const newDamage = {
            id: newId,
            type: type,
            x: xPercent,
            y: yPercent,
            description: ''
        };
        
        onChange([...damages, newDamage]);
        setActiveDamageId(newId);
    };

    const handleDescriptionChange = (id, newDesc) => {
        const updatedDamages = damages.map(d => 
            d.id === id ? { ...d, description: newDesc } : d
        );
        onChange(updatedDamages);
    };

    const removeDamage = (id) => {
        if (readOnly) return;
        onChange(damages.filter(d => d.id !== id));
        if (activeDamageId === id) setActiveDamageId(null);
    };

    // Filter damages for current context ('DEPART' or 'RETOUR' for display logic, though usually component gets filtered array)
    const contextDamages = damages.filter(d => d.type === type);
    
    return (
        <div className="flex flex-col md:flex-row gap-6">
            <div className="relative flex-1" style={{ maxWidth: '400px' }}>
                <img 
                    ref={imgRef}
                    src={carDiagram} 
                    alt="Schéma de la voiture" 
                    className={`w-full h-auto object-contain border border-slate-200 rounded-xl bg-white ${!readOnly ? 'cursor-crosshair' : ''}`}
                    onClick={handleImageClick}
                />
                
                {contextDamages.map((damage, index) => (
                    <div 
                        key={damage.id || index}
                        className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-transform ${(!readOnly && activeDamageId === (damage.id || index)) ? 'bg-red-600 text-white scale-125 ring-2 ring-white z-10' : 'bg-red-500/80 text-white hover:bg-red-500'} ${!readOnly ? 'cursor-pointer' : ''}`}
                        style={{ left: `${damage.x}%`, top: `${damage.y}%` }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!readOnly) setActiveDamageId(damage.id || index);
                        }}
                    >
                        {index + 1}
                    </div>
                ))}
            </div>
            
            <div className="flex-1 bg-surface-container-low rounded-xl p-4 min-h-[200px] flex flex-col">
                <h4 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-red-500">warning</span>
                    Liste des anomalies ({type})
                </h4>
                
                {contextDamages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic text-center p-4">
                        {readOnly ? "Aucun dégât signalé." : "Cliquez sur le schéma pour ajouter des points de dégâts."}
                    </div>
                ) : (
                    <div className="space-y-3 overflow-y-auto pr-2 max-h-[300px]">
                        {contextDamages.map((damage, index) => (
                            <div 
                                key={damage.id || index} 
                                className={`p-3 rounded-lg border transition-colors ${(!readOnly && activeDamageId === (damage.id || index)) ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        {readOnly ? (
                                            <p className="text-sm text-slate-700">{damage.description || <span className="text-sm italic text-slate-400">Aucune description</span>}</p>
                                        ) : (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={damage.description}
                                                    onChange={(e) => handleDescriptionChange(damage.id || index, e.target.value)}
                                                    placeholder="Décrire l'anomalie (ex: rayure, bosse)..."
                                                    className="w-full bg-transparent border-b border-slate-300 focus:border-red-500 focus:outline-none text-sm py-1 placeholder:text-slate-400"
                                                    autoFocus={activeDamageId === (damage.id || index)}
                                                />
                                                <div className="flex justify-end mt-1">
                                                    <button 
                                                        onClick={() => removeDamage(damage.id || index)}
                                                        className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                                        Supprimer
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DamageSelector;
