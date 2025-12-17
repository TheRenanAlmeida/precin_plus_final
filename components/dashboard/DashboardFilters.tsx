
import React, { useRef, useEffect } from 'react';
import type { DistributorColors } from '../../types';
import { getOriginalBrandName } from '../../utils/styleManager';

interface DashboardFiltersProps {
    availableBases: string[];
    selectedBase: string;
    setSelectedBase: (base: string) => void;
    comparisonMode: 'min' | 'avg';
    setComparisonMode: (mode: 'min' | 'avg') => void;
    pendingDateString: string;
    setPendingDateString: (date: string) => void;
    handleApplyDate: () => void;
    isDistributorFilterOpen: boolean;
    setIsDistributorFilterOpen: (isOpen: boolean) => void;
    selectedDistributors: Set<string>;
    distributors: string[];
    distributorColors: DistributorColors;
    distributorImages: { [key: string]: string | null };
    handleSelectAllDistributors: () => void;
    handleClearAllDistributors: () => void;
    handleToggleDistributor: (dist: string) => void;
    isComparisonMode: boolean;
    setIsComparisonMode: (mode: boolean) => void;
    goBack: () => void;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
    availableBases,
    selectedBase,
    setSelectedBase,
    comparisonMode,
    setComparisonMode,
    pendingDateString,
    setPendingDateString,
    handleApplyDate,
    isDistributorFilterOpen,
    setIsDistributorFilterOpen,
    selectedDistributors,
    distributors,
    distributorColors,
    distributorImages,
    handleSelectAllDistributors,
    handleClearAllDistributors,
    handleToggleDistributor,
    isComparisonMode,
    setIsComparisonMode,
    goBack
}) => {
    const distributorFilterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (distributorFilterRef.current && !distributorFilterRef.current.contains(event.target as Node)) {
                setIsDistributorFilterOpen(false);
            }
        }

        if (isDistributorFilterOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDistributorFilterOpen, setIsDistributorFilterOpen]);

    return (
        <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between bg-slate-900/50 backdrop-blur-sm rounded-xl p-3 border border-slate-800 shadow-sm sticky top-0 z-30">
            <div className="flex flex-wrap items-center gap-3">
                {/* Menu Button (Left Aligned) */}
                <button onClick={goBack} className="text-xs font-bold text-slate-400 hover:text-slate-100 uppercase tracking-wide transition-colors flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    Menu
                </button>
                
                <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block"></div>

                {/* Base Selector */}
                <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
                    <span className="text-xs font-bold text-slate-400 uppercase">Base</span>
                    <select
                        value={selectedBase}
                        onChange={(e) => setSelectedBase(e.target.value)}
                        className="bg-transparent text-slate-100 text-sm font-semibold focus:outline-none cursor-pointer"
                    >
                        {availableBases.map(base => (
                            <option key={base} value={base} className="bg-slate-800 text-slate-100">{base}</option>
                        ))}
                    </select>
                </div>

                {/* Benchmark Toggle */}
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    <button
                        onClick={() => setComparisonMode('min')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${comparisonMode === 'min' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Mínima
                    </button>
                    <button
                        onClick={() => setComparisonMode('avg')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${comparisonMode === 'avg' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Média
                    </button>
                </div>

                {/* Date Picker */}
                <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
                    <span className="text-xs font-bold text-slate-400 uppercase">Data</span>
                    <input
                        type="date"
                        value={pendingDateString}
                        onChange={(e) => setPendingDateString(e.target.value)}
                        onBlur={handleApplyDate}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="bg-transparent text-slate-100 text-sm font-sans tabular-nums focus:outline-none cursor-pointer custom-date-picker-style"
                    />
                </div>

                {/* Distributor Filter (Dropdown) */}
                <div className="relative" ref={distributorFilterRef}>
                    <button
                        onClick={() => setIsDistributorFilterOpen(!isDistributorFilterOpen)}
                        className={`
                            flex items-center gap-2 rounded-lg px-3 py-1.5 border text-xs font-bold uppercase transition-colors
                            ${isDistributorFilterOpen 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            }
                        `}
                    >
                        <span>Distribuidoras</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums font-sans ${selectedDistributors.size > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                            {selectedDistributors.size}/{distributors.length}
                        </span>
                        <svg className={`w-3 h-3 transition-transform ${isDistributorFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {isDistributorFilterOpen && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 flex flex-col max-h-[400px]">
                            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 rounded-t-xl sticky top-0 backdrop-blur-sm">
                                <button 
                                    onClick={handleSelectAllDistributors} 
                                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider"
                                >
                                    Selecionar Todas
                                </button>
                                <button 
                                    onClick={handleClearAllDistributors} 
                                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-wider"
                                >
                                    Limpar
                                </button>
                            </div>
                            <div className="overflow-y-auto p-2 space-y-1">
                                {distributors.map(dist => {
                                    const isSelected = selectedDistributors.has(dist);
                                    const colorStyle = distributorColors[dist] || distributorColors.DEFAULT;
                                    const imageUrl = distributorImages[getOriginalBrandName(dist)];

                                    return (
                                        <button
                                            key={dist}
                                            onClick={() => handleToggleDistributor(dist)}
                                            className={`
                                                w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left
                                                ${isSelected ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:bg-slate-800/50'}
                                            `}
                                        >
                                            <div 
                                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 bg-transparent'}`}
                                            >
                                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            
                                            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                                                {imageUrl ? (
                                                    <img src={imageUrl} alt={dist} className="w-4 h-4 object-contain" />
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorStyle.background }} />
                                                )}
                                            </div>
                                            
                                            <span className="truncate flex-1">{dist}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 justify-end">
                 {/* Brand Comparison Toggle */}
                 <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-9 h-5 rounded-full p-1 transition-colors ${isComparisonMode ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${isComparisonMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <input type="checkbox" className="hidden" checked={isComparisonMode} onChange={() => setIsComparisonMode(!isComparisonMode)} />
                    <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">Comparar Bandeiras</span>
                </label>
            </div>
        </div>
    );
};

export default DashboardFilters;
