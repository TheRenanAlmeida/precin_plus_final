
import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile } from '../types';
import { useHistoryData } from '../hooks/useHistoryData';
import Header from '../components/Header';

import HistoryPriceChart from '../components/historico/HistoryPriceChart';
import HistoryDataTable from '../components/historico/HistoryDataTable';
import HistorySummaryCards from '../components/historico/HistorySummaryCards';
import TableSkeletonLoader from '../components/skeletons/TableSkeletonLoader';
import { getOriginalBrandName } from '../utils/styleManager';

interface HistoryProps {
    userProfile: UserProfile;
    goBack: () => void;
    availableBases: string[];
    selectedFuelType: string;
    setSelectedFuelType: (fuel: string) => void;
    selectedBase: string;
    setSelectedBase: (base: string) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
}

const HistorySkeleton: React.FC = () => (
    <div className="space-y-4">
        <div className="h-20 bg-slate-900 rounded-xl shadow-lg border border-slate-800 animate-pulse"></div>
        <div className="h-24 bg-slate-900 rounded-xl shadow-lg border border-slate-800 animate-pulse"></div>
        <div className="h-96 bg-slate-900 rounded-xl shadow-lg border border-slate-800 animate-pulse"></div>
        <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-4">
            <TableSkeletonLoader rows={8} cols={5} />
        </div>
    </div>
);


const History: React.FC<HistoryProps> = ({ 
    userProfile, 
    goBack,
    availableBases,
    selectedFuelType,
    setSelectedFuelType,
    selectedBase,
    setSelectedBase,
    startDate,
    setStartDate,
    endDate,
    setEndDate
}) => {
    // --- UI State ---
    // visibleColumns controla a tabela
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        try {
            const raw = localStorage.getItem('precin_history_visible_columns');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch {}
        return ['seu_preco', 'market_min', 'market_avg', 'market_max'];
    });

    const [pendingStartDate, setPendingStartDate] = useState(startDate);
    const [pendingEndDate, setPendingEndDate] = useState(endDate);
    
    // Estado do Dropdown de Distribuidoras
    const [isDistributorFilterOpen, setIsDistributorFilterOpen] = useState(false);

    // --- Data Logic from Custom Hook ---
    const {
        loading,
        error,
        seriesConfig,
        availableFuelsForBase,
        displayNames,
        chartAndSeriesData,
        processedTableData,
        getDistributorColor,
        setSeriesConfig,
        distributorImages // Adicionado para exibir logos no dropdown
    } = useHistoryData(userProfile, availableBases, selectedBase, selectedFuelType, setSelectedFuelType, startDate, endDate);
    
    // --- Global Distributor Filter State ---
    const [selectedTableDistributors, setSelectedTableDistributors] = useState<Set<string>>(new Set());
    
    // Inicializa seleção de distribuidoras
    useEffect(() => {
        if (displayNames.length === 0) {
             setSelectedTableDistributors(new Set());
             return;
        }

        let initialSet = new Set(displayNames);
        try {
            const raw = localStorage.getItem('precin_history_table_distributors');
            if (raw) {
                const saved = JSON.parse(raw);
                if (Array.isArray(saved)) {
                    const valid = saved.filter(d => displayNames.includes(d));
                    if (valid.length > 0) {
                        initialSet = new Set(valid);
                    }
                }
            }
        } catch {}
        setSelectedTableDistributors(initialSet);
    }, [displayNames]);

    // Save preferences
    useEffect(() => {
        localStorage.setItem('precin_history_visible_columns', JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        if (displayNames.length > 0) {
             localStorage.setItem('precin_history_table_distributors', JSON.stringify(Array.from(selectedTableDistributors)));
        }
    }, [selectedTableDistributors, displayNames]);

    // Sincroniza a visibilidade do GRÁFICO (seriesConfig) com a seleção global
    useEffect(() => {
        setSeriesConfig(prevConfig =>
            prevConfig.map(series => {
                // 1. Sincronia de Distribuidoras
                if (series.type === 'distributor') {
                    const isSelected = selectedTableDistributors.has(series.name);
                    return { ...series, isVisible: isSelected };
                }
                
                // 2. Sincronia de Mercado (Mín, Méd, Máx)
                // Mapeia keys do seriesConfig para keys do visibleColumns
                if (series.type === 'market') {
                    let colKey = '';
                    if (series.key === 'market_min' || series.name === 'Preço Mínimo') colKey = 'market_min';
                    else if (series.key === 'market_avg' || series.name === 'Variação do Mercado') colKey = 'market_avg';
                    else if (series.key === 'market_max' || series.name === 'Preço Máximo') colKey = 'market_max';
                    
                    if (colKey) {
                        return { ...series, isVisible: visibleColumns.includes(colKey) };
                    }
                }

                return series;
            })
        );
    }, [selectedTableDistributors, visibleColumns, setSeriesConfig]);


    // Handlers Globais
    const handleApplyDates = () => {
        if (new Date(pendingStartDate) > new Date(pendingEndDate)) {
            setPendingStartDate(startDate);
            setPendingEndDate(endDate);
            return;
        }
        setStartDate(pendingStartDate);
        setEndDate(pendingEndDate);
    };

    // Toggle Global: Distribuidoras
    const toggleGlobalDistributor = (distName: string) => {
        setSelectedTableDistributors(prev => {
            const newSet = new Set(prev);
            if (newSet.has(distName)) newSet.delete(distName); else newSet.add(distName);
            return newSet;
        });
    };

    const handleSelectAllDistributors = () => setSelectedTableDistributors(new Set(displayNames));
    const handleClearAllDistributors = () => setSelectedTableDistributors(new Set());

    // Toggle Global: Mercado (Mín, Méd, Máx)
    const toggleGlobalMarketMetric = (metricKey: 'market_min' | 'market_avg' | 'market_max') => {
        setVisibleColumns(prev => 
            prev.includes(metricKey) 
                ? prev.filter(k => k !== metricKey) 
                : [...prev, metricKey]
        );
    };

    // Helper para saber se uma métrica de mercado está ativa
    const isMarketActive = (key: string) => visibleColumns.includes(key);

    return (
        <div className="font-sans antialiased bg-slate-950 text-slate-200 min-h-screen pb-10">
            <Header userProfile={userProfile} className="bg-slate-950 border-b border-slate-800" />
            
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                
                {/* GLOBAL STICKY FILTER BAR - FIXED TO TOP-0 */}
                <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between bg-slate-900/50 backdrop-blur-sm rounded-xl p-3 border border-slate-800 shadow-sm sticky top-0 z-30">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Base Selector */}
                        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
                            <span className="text-xs font-bold text-slate-400 uppercase">Base</span>
                            <select
                                value={selectedBase}
                                onChange={(e) => setSelectedBase(e.target.value)}
                                disabled={loading || availableBases.length === 0}
                                className="bg-transparent text-slate-100 text-sm font-semibold focus:outline-none cursor-pointer"
                            >
                                {availableBases.map(base => (
                                    <option key={base} value={base} className="bg-slate-800 text-slate-100">{base}</option>
                                ))}
                            </select>
                        </div>

                        {/* Product Selector */}
                        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
                            <span className="text-xs font-bold text-slate-400 uppercase">Produto</span>
                            <select
                                value={selectedFuelType}
                                onChange={(e) => setSelectedFuelType(e.target.value)}
                                disabled={loading}
                                className="bg-transparent text-slate-100 text-sm font-semibold focus:outline-none cursor-pointer"
                            >
                                {availableFuelsForBase.map(fuel => (
                                    <option key={fuel} value={fuel} className="bg-slate-800 text-slate-100">{fuel}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range */}
                        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
                            <span className="text-xs font-bold text-slate-400 uppercase">Período</span>
                            <input 
                                type="date" 
                                value={pendingStartDate} 
                                onChange={(e) => setPendingStartDate(e.target.value)} 
                                onBlur={handleApplyDates}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleApplyDates();
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                className="bg-transparent text-slate-100 text-xs font-sans tabular-nums focus:outline-none custom-date-picker-style w-24" 
                                disabled={loading} 
                            />
                            <span className="text-slate-500 text-xs">até</span>
                            <input 
                                type="date" 
                                value={pendingEndDate} 
                                onChange={(e) => setPendingEndDate(e.target.value)} 
                                onBlur={handleApplyDates}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleApplyDates();
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                className="bg-transparent text-slate-100 text-xs font-sans tabular-nums focus:outline-none custom-date-picker-style w-24" 
                                disabled={loading} 
                            />
                        </div>

                        {/* Distributor Dropdown Filter */}
                        <div className="relative">
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
                                <span className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums font-sans ${selectedTableDistributors.size > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                    {selectedTableDistributors.size}/{displayNames.length}
                                </span>
                                <svg className={`w-3 h-3 transition-transform ${isDistributorFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </button>

                            {isDistributorFilterOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setIsDistributorFilterOpen(false)}
                                    />
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
                                            {displayNames.map(dist => {
                                                const isSelected = selectedTableDistributors.has(dist);
                                                const style = getDistributorColor(dist);
                                                const originalName = getOriginalBrandName(dist);
                                                const imageUrl = distributorImages[originalName] || null;

                                                return (
                                                    <button
                                                        key={dist}
                                                        onClick={() => toggleGlobalDistributor(dist)}
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
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: style.background }} />
                                                            )}
                                                        </div>
                                                        
                                                        <span className="truncate flex-1">{dist}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

                        {/* Market Metrics Toggles */}
                        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 gap-1">
                            <button
                                onClick={() => toggleGlobalMarketMetric('market_min')}
                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all ${isMarketActive('market_min') ? 'bg-slate-600 text-emerald-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Mínima
                            </button>
                            <button
                                onClick={() => toggleGlobalMarketMetric('market_avg')}
                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all ${isMarketActive('market_avg') ? 'bg-slate-600 text-blue-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Média
                            </button>
                            <button
                                onClick={() => toggleGlobalMarketMetric('market_max')}
                                className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all ${isMarketActive('market_max') ? 'bg-slate-600 text-rose-300 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Máxima
                            </button>
                        </div>
                    </div>

                    {/* Right Side: Menu Button */}
                    <div className="flex items-center gap-3 justify-end mt-2 xl:mt-0">
                         <div className="h-6 w-px bg-slate-700 hidden xl:block"></div>
                         <button onClick={goBack} className="text-xs font-bold text-slate-400 hover:text-slate-100 uppercase tracking-wide transition-colors">
                            Menu
                        </button>
                    </div>
                </div>
                
                {loading ? <HistorySkeleton />
                : error ? <p className="text-center text-rose-400 bg-rose-950/30 border border-rose-900/50 p-4 rounded-xl">{error}</p>
                : (
                    <>
                        <HistorySummaryCards 
                            processedData={processedTableData} 
                            selectedDistributors={selectedTableDistributors}
                        />

                        <HistoryPriceChart
                            chartData={chartAndSeriesData.chartData}
                            seriesConfig={seriesConfig}
                        />
                        
                        {processedTableData.length === 0 ? <p className="text-center text-slate-500 bg-slate-900 border border-slate-800 p-8 rounded-xl text-sm">Nenhum dado encontrado para os filtros de data selecionados.</p>
                        : (
                            <HistoryDataTable
                                processedData={processedTableData}
                                visibleColumns={visibleColumns}
                                getDistributorColor={getDistributorColor}
                                selectedTableDistributors={selectedTableDistributors}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default History;
