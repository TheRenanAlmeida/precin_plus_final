
import React, { useState, useEffect } from 'react';
import type { HistoryDataTableProps } from '../../types';
import { formatPrice, formatDeviation, formatPriceSmart } from '../../utils/dataHelpers';
import { getOriginalBrandName } from '../../utils/styleManager';
import { Tip } from '../common/Tip';
import { TOOLTIP } from '../../constants/tooltips';
import PriceWatermarkedSection from '../PriceWatermarkedSection';

const HistoryDataTable: React.FC<HistoryDataTableProps> = ({
    processedData,
    getDistributorColor,
    selectedTableDistributors,
    distributorImages,
    contracts,
    selectedFuelType,
    userProfile,
    selectedBase,
    goToContracts 
}) => {
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (processedData.length > 0) {
            const allKeys = new Set(processedData.map(d => d.periodKey));
            setExpandedDays(allKeys);
        }
    }, [processedData.length]);

    const toggleDay = (periodKey: string) => {
        setExpandedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(periodKey)) {
                newSet.delete(periodKey);
            } else {
                newSet.add(periodKey);
            }
            return newSet;
        });
    };

    const headerCellClass = "px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right border-b border-slate-700 bg-slate-900/50";
    const bodyCellClass = "px-3 py-3 text-sm font-sans tabular-nums font-medium text-slate-200 text-right border-b border-slate-800";

    if (processedData.length === 0) {
        return (
            <div className="text-center p-8 bg-slate-900 rounded-xl border border-slate-800">
                <p className="text-slate-500">Nenhum dado encontrado para o período selecionado.</p>
            </div>
        );
    }

    return (
        <PriceWatermarkedSection
            userProfile={userProfile}
            selectedBase={selectedBase}
            className="rounded-xl overflow-hidden"
        >
            <div className="flex flex-col gap-4">
                {processedData.map((dayData) => {
                    const isExpanded = expandedDays.has(dayData.periodKey);
                    const visibleDistributors = dayData.distributorPrices.filter(d => selectedTableDistributors.has(d.name));
                    
                    if (visibleDistributors.length === 0 && !isExpanded) return null;

                    return (
                        <div
                            key={dayData.periodKey}
                            className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300"
                        >
                            <div 
                                onClick={() => toggleDay(dayData.periodKey)}
                                className="w-full px-4 py-3 bg-slate-800/80 hover:bg-slate-800 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/50"
                            >
                                <div className="flex items-center gap-3">
                                    <button className="text-slate-400 focus:outline-none">
                                        <svg className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <span className="text-lg font-bold text-slate-100 capitalize">{dayData.periodDisplay}</span>
                                </div>

                                <div className="flex items-center gap-4 text-xs sm:text-sm bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                    <span className="font-bold text-slate-400 uppercase tracking-wide mr-1">Mercado:</span>
                                    <div className="flex gap-3">
                                        <div>
                                            <Tip text={TOOLTIP.MARKET_MIN} className="text-slate-500 mr-1 inline-block">Min</Tip>
                                            <span className="font-sans tabular-nums font-bold text-emerald-400">{formatPrice(dayData.market.min.value)}</span>
                                        </div>
                                        <div className="w-px h-4 bg-slate-700"></div>
                                        <div>
                                            <Tip text={TOOLTIP.MARKET_AVG} className="text-slate-500 mr-1 inline-block">Méd</Tip>
                                            <span className="font-sans tabular-nums font-bold text-blue-400">{formatPrice(dayData.market.avg.value)}</span>
                                        </div>
                                        <div className="w-px h-4 bg-slate-700"></div>
                                        <div>
                                            <Tip text={TOOLTIP.MARKET_MAX} className="text-slate-500 mr-1 inline-block">Máx</Tip>
                                            <span className="font-sans tabular-nums font-bold text-rose-400">{formatPrice(dayData.market.max.value)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-left border-b border-slate-700 bg-slate-900/50 pl-6">
                                                    Posto / Distribuidora
                                                </th>
                                                <th className={headerCellClass}>Informado (R$)</th>
                                                <th className={headerCellClass}>
                                                    <Tip text={TOOLTIP.DIFF_VS_MIN}>Dif. Mín</Tip>
                                                </th>
                                                <th className={headerCellClass}>
                                                    <Tip text={TOOLTIP.DIFF_VS_AVG}>Dif. Méd</Tip>
                                                </th>
                                                <th className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-center border-b border-slate-700 bg-slate-900/50">
                                                    <Tip text={TOOLTIP.CONTRACT_BASE_TYPE}>Contrato</Tip>
                                                </th>
                                                <th className={headerCellClass}>
                                                    <Tip text={TOOLTIP.EXPECTED_PRICE}>Esperado (R$)</Tip>
                                                </th>
                                                <th className={headerCellClass}>
                                                    <Tip text={TOOLTIP.DEVIATION}>Desvio</Tip>
                                                </th>
                                                <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-center border-b border-slate-700 bg-slate-900/50 pr-6">
                                                    <Tip text={TOOLTIP.STATUS}>Status</Tip>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-slate-900">
                                            {visibleDistributors.map((dist) => {
                                                const originalName = getOriginalBrandName(dist.name);
                                                const style = getDistributorColor(dist.name);
                                                const imageUrl = distributorImages[originalName];
                                                const userPrice = dist.price.value;

                                                let contractRule = null;
                                                if (contracts && selectedFuelType) {
                                                    const brandContracts = contracts[dist.name] || contracts[originalName];
                                                    if (brandContracts) {
                                                        contractRule = brandContracts[selectedFuelType];
                                                    }
                                                }
                                                
                                                let expectedPrice: number | null = null;
                                                let deviation: number | null = null;
                                                let status: 'OK' | 'FORA' | 'N/A' = 'N/A';

                                                const marketMin = dayData.market.min.value;
                                                const marketAvg = dayData.market.avg.value;

                                                const deltaMin = (userPrice !== null && marketMin !== null) ? userPrice - marketMin : null;
                                                const deltaAvg = (userPrice !== null && marketAvg !== null) ? userPrice - marketAvg : null;

                                                if (contractRule && userPrice !== null && marketMin !== null && marketAvg !== null) {
                                                    const baseValue = contractRule.base === 'MIN' ? marketMin : marketAvg;
                                                    expectedPrice = baseValue + contractRule.spread;
                                                    deviation = userPrice - expectedPrice;
                                                    status = deviation > 0.0001 ? 'FORA' : 'OK';
                                                }

                                                return (
                                                    <tr key={dist.name} className="hover:bg-slate-800/30 transition-colors group">
                                                        <td className="px-4 py-3 border-b border-slate-800 pl-6">
                                                            <div className="flex items-center gap-3">
                                                                {imageUrl ? (
                                                                    <img src={imageUrl} alt={dist.name} className="w-5 h-5 object-contain" />
                                                                ) : (
                                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: style.background }} />
                                                                )}
                                                                <span className="text-sm font-bold text-slate-200" style={{ color: style.background }}>
                                                                    {dist.name}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td className={bodyCellClass}>
                                                            {userPrice !== null ? (
                                                                <span className="font-bold text-slate-100">{formatPrice(userPrice)}</span>
                                                            ) : (
                                                                <span className="text-slate-600">-</span>
                                                            )}
                                                        </td>

                                                        <td className={bodyCellClass}>
                                                            <span className={`text-xs font-bold ${deltaMin !== null && deltaMin > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                {formatDeviation(deltaMin)}
                                                            </span>
                                                        </td>

                                                        <td className={bodyCellClass}>
                                                            <span className={`text-xs font-bold ${deltaAvg !== null && deltaAvg > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                {formatDeviation(deltaAvg)}
                                                            </span>
                                                        </td>

                                                        <td className="px-3 py-3 text-center border-b border-slate-800">
                                                            <button 
                                                                onClick={goToContracts}
                                                                className="w-full h-full flex items-center justify-center focus:outline-none"
                                                                title="Clique para gerenciar contratos"
                                                            >
                                                                {contractRule ? (
                                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-400 uppercase tracking-wide whitespace-nowrap hover:bg-slate-700 hover:text-emerald-400 transition-all">
                                                                        {contractRule.base === 'MIN' ? 'Mín' : 'Méd'} {contractRule.spread >= 0 ? '+' : ''}{contractRule.spread.toFixed(2)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-slate-600 italic hover:text-emerald-400 transition-colors uppercase">Sem contrato</span>
                                                                )}
                                                            </button>
                                                        </td>

                                                        <td className={bodyCellClass}>
                                                            {expectedPrice !== null ? (
                                                                <span className="text-slate-400">{formatPriceSmart(expectedPrice)}</span>
                                                            ) : (
                                                                <span className="text-slate-600">-</span>
                                                            )}
                                                        </td>

                                                        <td className={bodyCellClass}>
                                                            {deviation !== null ? (
                                                                <span className={`font-bold tabular-nums ${status === 'FORA' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                    {formatDeviation(deviation)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-600">-</span>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-3 text-center border-b border-slate-800 pr-6">
                                                            {status === 'OK' && (
                                                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/30 border border-emerald-900/50 text-emerald-400">
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    <span className="text-[10px] font-extrabold uppercase tracking-wider">OK</span>
                                                                </div>
                                                            )}
                                                            {status === 'FORA' && (
                                                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/30 border border-rose-900/50 text-rose-400">
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                                                    </svg>
                                                                    <span className="text-[10px] font-extrabold uppercase tracking-wider">FORA</span>
                                                                </div>
                                                            )}
                                                            {status === 'N/A' && (
                                                                <span className="text-slate-600 text-lg">•</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </PriceWatermarkedSection>
    );
};

export default HistoryDataTable;
