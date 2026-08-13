import React, { useState, useRef, useEffect } from 'react';

const FuelGaugeSelector = ({ value, onChange, compact = false }) => {
    // value expected format: "2/8", "0/8", etc.
    const [isDragging, setIsDragging] = useState(false);
    const svgRef = useRef(null);
    const isDraggingRef = useRef(isDragging);
    
    useEffect(() => {
        isDraggingRef.current = isDragging;
    }, [isDragging]);

    const levels = 8;
    const currentLevel = parseInt(value ? value.split('/')[0] : '2', 10) || 0;
    const currentLevelRef = useRef(currentLevel);
    
    useEffect(() => {
        currentLevelRef.current = currentLevel;
    }, [currentLevel]);

    const angleForLevel = (level) => {
        // level 0 -> 180 degrees (left), level 8 -> 0 degrees (right)
        return 180 - (level / levels) * 180;
    };

    const calculateLevelFromEvent = (e) => {
        if (!svgRef.current) return currentLevelRef.current;
        const rect = svgRef.current.getBoundingClientRect();
        
        // Calculate center of gauge relative to viewport
        // viewBox="0 0 200 120", center is at (100, 100)
        const scaleX = rect.width / 200;
        const scaleY = rect.height / 120;
        const centerX = rect.left + 100 * scaleX;
        const centerY = rect.top + 100 * scaleY;

        const x = e.clientX - centerX;
        const y = centerY - e.clientY; // invert Y so up is positive

        // compute angle in degrees
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        // angle corresponds to: 180 is level 0, 0 is level 8.
        let boundedAngle = Math.max(0, Math.min(180, angle));
        let levelFloat = (180 - boundedAngle) / (180 / levels);
        let level = Math.round(levelFloat);
        
        return Math.max(0, Math.min(levels, level));
    };

    const handlePointerDown = (e) => {
        setIsDragging(true);
        // We call preventDefault on mouse events to stop text selection while dragging
        // However onPointerDown shouldn't rigorously preventDefault if we want passive touch
        e.currentTarget.setPointerCapture(e.pointerId);
        
        const level = calculateLevelFromEvent(e);
        if (level !== currentLevelRef.current) {
            onChange(`${level}/8`);
        }
    };

    const handlePointerMove = (e) => {
        if (!isDraggingRef.current) return;
        const level = calculateLevelFromEvent(e);
        if (level !== currentLevelRef.current) {
            onChange(`${level}/8`);
        }
    };

    const handlePointerUp = (e) => {
        setIsDragging(false);
        try {
            if (e.pointerId && svgRef.current) {
                svgRef.current.releasePointerCapture(e.pointerId);
            }
        } catch {
            // ignore capture release errors
        }
    };

    const cx = 100;
    const cy = 100;
    const radius = 80;

    // Generate ticks
    const ticks = [];
    for (let i = 0; i <= levels; i++) {
        const a = angleForLevel(i);
        const rad = a * (Math.PI / 180);
        const isMajor = i % 2 === 0; // 0, 2, 4, 6, 8
        const tickLength = isMajor ? 14 : 7;
        const tickThickness = isMajor ? 4 : 2.5;
        
        const innerRadius = radius - tickLength;
        const outerRadius = radius;

        const x1 = cx + innerRadius * Math.cos(rad);
        const y1 = cy - innerRadius * Math.sin(rad);
        const x2 = cx + outerRadius * Math.cos(rad);
        const y2 = cy - outerRadius * Math.sin(rad);
        
        // Color: red for Empty (0, 1), dark blue-black for rest
        const isRed = i <= 1;
        const color = isRed ? '#ef4444' : '#0f172a';

        ticks.push(
            <line 
                key={i} 
                x1={x1} y1={y1} x2={x2} y2={y2} 
                stroke={color} 
                strokeWidth={tickThickness} 
                strokeLinecap="round"
            />
        );
    }

    // Needle
    const needleAngle = angleForLevel(currentLevel);
    const radNeedle = needleAngle * (Math.PI / 180);
    const needleLength = radius - 18;
    const nx = cx + needleLength * Math.cos(radNeedle);
    const ny = cy - needleLength * Math.sin(radNeedle);

    // Tail of needle extending slightly behind center
    const tailLength = 12;
    const tx = cx - tailLength * Math.cos(radNeedle);
    const ty = cy + tailLength * Math.sin(radNeedle);

    return (
        <div className={`flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-100 relative select-none touch-none w-full mx-auto shadow-inner ${compact ? 'p-1 max-w-[150px]' : 'p-2 max-w-sm'}`}>
            <svg 
                ref={svgRef}
                viewBox="0 0 200 120" 
                className="w-full h-auto cursor-pointer focus:outline-none"
                style={{ maxHeight: compact ? '85px' : '140px' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                {/* Gauge Background arc (optional) */}
                <path d="M20,100 A80,80 0 0,1 180,100" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />

                {/* Letters E and F */}
                <text x="30" y="115" fontSize={compact ? 13 : 22} fontFamily="Inter, sans-serif" fontWeight="900" fill="#0f172a" textAnchor="middle">E</text>
                <text x="170" y="115" fontSize={compact ? 13 : 22} fontFamily="Inter, sans-serif" fontWeight="900" fill="#0f172a" textAnchor="middle">F</text>

                {/* Ticks */}
                {ticks}

                {/* Needle path */}
                <line 
                    x1={tx} y1={ty} 
                    x2={nx} y2={ny} 
                    stroke="#ef4444" 
                    strokeWidth={compact ? 4 : 5} 
                    strokeLinecap="round" 
                    style={{ transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                />
                
                {/* Needle center dot */}
                <circle cx={cx} cy={cy} r={compact ? 8 : 10} fill="#0f172a" />
            </svg>
            
            {/* Fuel Icon in center */}
            <div className={`absolute left-1/2 -translate-x-1/2 pointer-events-none transition-colors duration-300 ${compact ? 'top-[32%]' : 'top-[35%]'} ${currentLevel <= 1 ? 'text-red-500' : 'text-slate-800'}`}>
                <span className={`material-symbols-outlined ${compact ? 'text-lg' : 'text-4xl'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                    local_gas_station
                </span>
            </div>

            {/* Display fraction text */}
            <div className={`absolute right-1 bg-white border border-slate-200 rounded-md font-bold text-slate-600 shadow-sm pointer-events-none font-mono ${compact ? 'top-0.5 px-1 py-px text-[7px]' : 'top-2 right-2 px-2.5 py-1 text-[10px]'}`}>
                {currentLevel}/8
            </div>
            
            {/* Quick helper text */}
            <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 text-slate-400 font-medium bg-white/90 rounded-full pointer-events-none uppercase tracking-wider ${compact ? 'text-[6px] px-1.5 py-px' : 'bottom-2 text-[9px] px-3 py-0.5'}`}>
                Glisser ou Cliquer
            </div>
        </div>
    );
};

export default FuelGaugeSelector;
