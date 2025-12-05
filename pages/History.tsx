

import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile } from '../types';
import { useHistoryData } from '../hooks/useHistoryData';

import HistoryPriceChart from '../components/historico/HistoryPriceChart';
import HistoryDataTable from '../components/historico/HistoryDataTable';
import TableSkeletonLoader from '../components/skeletons/TableSkeletonLoader';
import DistributorLogo from '../components/DistributorLogo';
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

const COLUMN_OPTIONS = [
    { key: 'seu_preco', label: 'Meus Preços'},
    { key: 'market_min', label: 'Mínima Mercado'},
    { key: 'market_avg', label: 'Média Mercado'},
    { key: 'market_max', label: 'Máxima Mercado'},
];

const HistorySkeleton: React.FC = () => (
    <div className="space-y-4">
        <div className="h-24 bg-white rounded-xl shadow-lg border border-gray-200 animate-pulse"></div>
        <div className="h-24 bg-white rounded-xl shadow-lg border border-gray-200 animate-pulse"></div>
        <div className="h-96 bg-white rounded-xl shadow-lg border border-gray-200 animate-pulse"></div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
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
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['seu_preco', 'market_min', 'market_avg', 'market_max']);
    const [pendingStartDate, setPendingStartDate] = useState(startDate);
    const [pendingEndDate, setPendingEndDate] = useState(endDate);
    const [openFilterSection, setOpenFilterSection] = useState<'distributors' | 'chart' | null>(null);
    
    // --- Data Logic now in Custom Hook ---
    const {
        loading,
        error,
        distributorImages,
        seriesConfig,
        availableFuelsForBase,
        displayNames,
        chartAndSeriesData,
        processedTableData,
        getDistributorColor,
        setSeriesConfig,
    } = useHistoryData(userProfile, availableBases, selectedBase, selectedFuelType, setSelectedFuelType, startDate, endDate);
    
    // --- Table-specific distributor filter state ---
    const [selectedTableDistributors, setSelectedTableDistributors] = useState<Set<string>>(new Set());
    useEffect(() => {
        setSelectedTableDistributors(new Set(displayNames));
    }, [displayNames]);

    const isTableFilterDirty =
      selectedTableDistributors.size > 0 &&
      selectedTableDistributors.size < displayNames.length;
    
    const isChartFilterDirty = seriesConfig.some(s => !s.isVisible);

    // Handlers
    const handleApplyDates = () => {
        if (new Date(pendingStartDate) > new Date(pendingEndDate)) {
            // setError('A Data Início não pode ser maior que a Data Fim.');
            setPendingStartDate(startDate);
            setPendingEndDate(endDate);
            return;
        }
        setStartDate(pendingStartDate);
        setEndDate(pendingEndDate);
    };
    
    const handleColumnToggle = (key: string) => {
        setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };
    const handleTableDistributorToggle = (distName: string) => {
        setSelectedTableDistributors(prev => {
            const newSet = new Set(prev);
            if (newSet.has(distName)) newSet.delete(distName); else newSet.add(distName);
            return newSet;
        });
    };
    const handleSelectAllTableDistributors = () => setSelectedTableDistributors(new Set(displayNames));
    const handleClearAllTableDistributors = () => setSelectedTableDistributors(new Set());

    const toggleHistorySeriesVisibility = (seriesKey: string) => {
        setSeriesConfig(prevConfig =>
            prevConfig.map(series =>
                series.key === seriesKey ? { ...series, isVisible: !series.isVisible } : series
            )
        );
    };

    const handleToggleFilterSection = (section: 'distributors' | 'chart') => {
        setOpenFilterSection(prev => (prev === section ? null : section));
    };
    
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-300 pb-4">
                <h1 className="text-3xl font-extrabold text-gray-900">Histórico de Preços</h1>
                <button 
                    onClick={goBack} 
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 focus:ring-green-700"
                >
                    Voltar ao Menu
                </button>
            </div>
            
            {loading ? <HistorySkeleton />
            : error ? <p className="text-center text-red-600 bg-red-100 p-4 rounded-md">{error}</p>
            : (
                <>
                    <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
                        <div className="flex flex-wrap items-center gap-4">
                             <div className="flex items-center gap-2">
                                <label htmlFor="base-select-history" className="text-sm font-semibold text-gray-700">Base:</label>
                                <div className="relative">
                                    <select id="base-select-history" value={selectedBase} onChange={(e) => setSelectedBase(e.target.value)} disabled={loading || availableBases.length === 0} className="appearance-none bg-white border border-gray-300 text-gray-600 font-semibold text-sm rounded-full py-1.5 pl-4 pr-10 focus:outline-none focus:border-green-500 transition-colors hover:bg-gray-50 shadow-sm">
                                        {availableBases.map(base => (<option key={base} value={base}>{base}</option>))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="fuel-type-select-history" className="text-sm font-semibold text-gray-700">Combustível:</label>
                                <div className="relative">
                                    <select id="fuel-type-select-history" value={selectedFuelType} onChange={(e) => setSelectedFuelType(e.target.value)} disabled={loading} className="appearance-none bg-white border border-gray-300 text-gray-600 font-semibold text-sm rounded-full py-1.5 pl-4 pr-10 focus:outline-none focus:border-green-500 transition-colors hover:bg-gray-50 shadow-sm">
                                        {availableFuelsForBase.map(fuel => (<option key={fuel} value={fuel}>{fuel}</option>))}
                                    </select>
                                     <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </div>
                                </div>
                            </div>
                           
                            <div className="sm:flex-grow sm:flex sm:justify-end gap-2">
                                <button
                                    onClick={() => handleToggleFilterSection('chart')}
                                    className={`
                                        flex items-center gap-2 px-4 py-1.5 text-sm font-semibold
                                        rounded-full transition-all shadow-sm focus:outline-none
                                        w-full justify-center sm:w-auto border
                                        ${
                                        openFilterSection === 'chart' || isChartFilterDirty
                                            ? 'bg-green-50 text-green-700 border-green-400'
                                            : 'bg-white text-gray-600 hover:text-green-700 border-gray-300'
                                        }
                                    `}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                                    <span>Gráfico</span>
                                </button>
                            </div>
                        </div>
                        {openFilterSection === 'chart' && seriesConfig.length > 0 && (
                             <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-bold text-gray-700 mb-3">Filtrar Séries no Gráfico:</h4>
                                <div className="flex flex-wrap items-center gap-3">
                                    {seriesConfig
                                        .filter(series => series.name === 'Variação do Mercado' || series.type === 'distributor')
                                        .map(series => {
                                        const isVisible = series.isVisible;
                                        if (series.type === 'distributor') {
                                            const style = getDistributorColor(series.name);
                                            const imageUrl = distributorImages[getOriginalBrandName(series.name)];
                                            const pillClassName = isVisible
                                                ? "inline-flex items-center justify-center gap-2 px-3 h-8 text-xs font-bold rounded-full truncate distributor-pill"
                                                : "inline-flex items-center justify-center gap-2 px-3 h-8 text-xs font-bold rounded-full truncate bg-white text-gray-600 border border-gray-300 hover:bg-gray-50";

                                            return (
                                                <button
                                                    key={series.key}
                                                    onClick={() => toggleHistorySeriesVisibility(series.key)}
                                                    className={pillClassName}
                                                    style={isVisible ? {
                                                        backgroundColor: style.background,
                                                        color: style.border,
                                                        '--shadow-color': style.shadowColor || style.background,
                                                    } as React.CSSProperties : {}}
                                                >
                                                    <DistributorLogo distributorName={series.name} imageUrl={imageUrl} />
                                                    <span className="truncate">{series.name}</span>
                                                </button>
                                            );
                                        } else { // Market series
                                            return (
                                                <button
                                                    key={series.key}
                                                    onClick={() => toggleHistorySeriesVisibility(series.key)}
                                                    className={`
                                                        px-4 py-1.5 rounded-full text-sm font-semibold transition-all border shadow-sm
                                                        whitespace-nowrap
                                                        ${isVisible
                                                            ? 'bg-green-50 text-green-700 border-green-400'
                                                            : 'bg-white text-gray-600 hover:text-green-700 border-gray-300'
                                                        }
                                                    `}
                                                >
                                                    {series.name}
                                                </button>
                                            );
                                        }
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label htmlFor="start-date-history" className="text-sm font-semibold text-gray-700">Início:</label>
                                <input type="date" id="start-date-history" value={pendingStartDate} onChange={(e) => setPendingStartDate(e.target.value)} onBlur={handleApplyDates} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} className="appearance-none bg-white border border-gray-300 text-gray-600 font-semibold text-sm rounded-full py-1.5 px-4 focus:outline-none focus:border-green-500 transition-colors hover:bg-gray-50 shadow-sm custom-date-picker-style" disabled={loading} />
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="end-date-history" className="text-sm font-semibold text-gray-700">Fim:</label>
                                <input type="date" id="end-date-history" value={pendingEndDate} onChange={(e) => setPendingEndDate(e.target.value)} onBlur={handleApplyDates} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} className="appearance-none bg-white border border-gray-300 text-gray-600 font-semibold text-sm rounded-full py-1.5 px-4 focus:outline-none focus:border-green-500 transition-colors hover:bg-gray-50 shadow-sm custom-date-picker-style" disabled={loading} />
                            </div>
                        </div>
                    </div>

                    <HistoryPriceChart
                        chartData={chartAndSeriesData.chartData}
                        seriesConfig={seriesConfig}
                    />

                    <div className="p-4 sm:p-6 mb-6 bg-white rounded-xl shadow-lg border border-gray-200">
                        <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Personalizar Tabela</h3>
                                <p className="text-sm text-gray-600">Selecione as colunas a serem exibidas na tabela.</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {COLUMN_OPTIONS.map(col => {
                                const isVisible = visibleColumns.includes(col.key);
                                return (
                                    <button
                                        key={col.key}
                                        onClick={() => handleColumnToggle(col.key)}
                                        className={`
                                            px-4 py-1.5 rounded-full text-sm font-semibold transition-all border shadow-sm
                                            whitespace-nowrap
                                            ${isVisible
                                                ? 'bg-green-50 text-green-700 border-green-400'
                                                : 'bg-white text-gray-600 hover:text-green-700 border-gray-300'
                                            }
                                        `}
                                    >
                                        {col.label}
                                    </button>
                                );
                            })}
                             <button
                                onClick={() => handleToggleFilterSection('distributors')}
                                className={`
                                    flex items-center gap-2 px-4 py-1.5 text-sm font-semibold
                                    rounded-full transition-all shadow-sm focus:outline-none
                                    border
                                    ${
                                    openFilterSection === 'distributors' || isTableFilterDirty
                                        ? 'bg-green-50 text-green-700 border-green-400'
                                        : 'bg-white text-gray-600 hover:text-green-700 border-gray-300'
                                    }
                                `}
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd"></path></svg>
                                <span>Distribuidoras</span>
                                    {displayNames.length > 0 && (
                                    <span className="flex items-center justify-center ml-2 w-5 h-5 text-[10px] rounded-full bg-green-600 text-white">
                                    {selectedTableDistributors.size}/{displayNames.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {openFilterSection === 'distributors' && displayNames.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-gray-700">Filtrar Minhas Distribuidoras na Tabela:</h4>
                                    <div className="flex gap-2">
                                        <button onClick={handleSelectAllTableDistributors} className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors shadow-sm focus:outline-none">
                                            Selecionar Todas
                                        </button>
                                        <button onClick={handleClearAllTableDistributors} className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors shadow-sm focus:outline-none">
                                            Limpar Seleção
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {displayNames.map(distName => {
                                        const style = getDistributorColor(distName);
                                        const isActive = selectedTableDistributors.has(distName);
                                        const imageUrl = distributorImages[getOriginalBrandName(distName)];

                                        const pillClassName = isActive 
                                            ? "inline-flex items-center justify-center gap-2 px-3 h-8 text-xs font-bold rounded-full truncate distributor-pill"
                                            : "inline-flex items-center justify-center gap-2 px-3 h-8 text-xs font-bold rounded-full truncate bg-white text-gray-600 border border-gray-300 hover:bg-gray-50";

                                        return (
                                            <button
                                                key={distName}
                                                onClick={() => handleTableDistributorToggle(distName)}
                                                className={pillClassName}
                                                style={isActive ? {
                                                    backgroundColor: style.background,
                                                    color: style.border,
                                                    '--shadow-color': style.shadowColor || style.background,
                                                } as React.CSSProperties : {}}
                                            >
                                                <DistributorLogo distributorName={distName} imageUrl={imageUrl} />
                                                <span className="truncate">{distName}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {processedTableData.length === 0 ? <p className="text-center text-gray-600 bg-gray-100 p-4 rounded-md">Nenhum dado encontrado para os filtros de data selecionados.</p>
                    : (
                        <HistoryDataTable
                            processedData={processedTableData}
                            visibleColumns={visibleColumns}
                            getDistributorColor={getDistributorColor}
                            distributorImages={distributorImages}
                            selectedTableDistributors={selectedTableDistributors}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default History;
