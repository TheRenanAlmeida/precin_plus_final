

import React from 'react';
import type { HistoryDataTableProps } from '../../types';
import { formatPrice, formatDeltaForDisplay, formatPriceDifferenceForDisplay } from '../../utils/dataHelpers';

const RenderDelta: React.FC<{ delta: number | null }> = ({ delta }) => {
    const data = formatDeltaForDisplay(delta);
    if (!data) return <span className="text-slate-600">-</span>;
    const { colorClass, arrow, formattedValue } = data;
    // Remapear classes de cor light para dark
    let darkColorClass = 'text-slate-400';
    if (colorClass.includes('green')) darkColorClass = 'text-emerald-400';
    else if (colorClass.includes('red')) darkColorClass = 'text-rose-400';

    return (
        <span className={`inline-flex items-center justify-center gap-1 text-xs font-bold tabular-nums ${darkColorClass}`}>
            {arrow} {formattedValue}
        </span>
    );
};

const RenderPriceDifference: React.FC<{ delta: number | null }> = ({ delta }) => {
    const data = formatPriceDifferenceForDisplay(delta);
    if (!data) return <span className="text-slate-600">-</span>;
    const { colorClass, sign, formattedValue } = data;
    
    let darkColorClass = 'text-slate-500';
    if (colorClass.includes('red')) darkColorClass = 'text-rose-400';
    else if (colorClass.includes('green')) darkColorClass = 'text-emerald-400';

    return (
        <span className={`text-xs font-bold tabular-nums ${darkColorClass}`}>
            {sign}{formattedValue}
        </span>
    );
};


const HistoryDataTable: React.FC<HistoryDataTableProps> = ({
    processedData,
    visibleColumns,
    getDistributorColor,
    selectedTableDistributors,
}) => {

    return (
        <div className="overflow-x-auto shadow-xl rounded-xl border border-slate-800 bg-slate-900">
            <table className="min-w-full divide-y divide-slate-800">
                <caption className="sr-only">Tabela de histórico de preços por período.</caption>
                <thead className="text-[10px] text-slate-400 uppercase bg-slate-950 sticky top-0 z-20">
                    <tr>
                        <th scope="col" className="px-3 py-3 text-left font-bold tracking-wider sticky left-0 bg-slate-950 z-30 border-r border-slate-800">Período</th>
                        <th scope="col" className="px-3 py-3 text-left font-bold tracking-wider border-r border-slate-800">Distribuidora</th>
                        {visibleColumns.includes('seu_preco') && (<><th scope="col" className="px-2 py-3 text-center font-bold tracking-wider">Meus Preços</th><th scope="col" className="px-2 py-3 text-center font-bold tracking-wider border-r border-slate-800">Evol %</th></>)}
                        {visibleColumns.includes('market_min') && (<><th scope="col" className="px-2 py-3 text-center font-bold tracking-wider">Mín. Mkt</th><th scope="col" className="px-2 py-3 text-center font-bold tracking-wider border-r border-slate-800">Evol %</th></>)}
                        {visibleColumns.includes('market_avg') && (<><th scope="col" className="px-2 py-3 text-center font-bold tracking-wider">Méd. Mkt</th><th scope="col" className="px-2 py-3 text-center font-bold tracking-wider border-r border-slate-800">Evol %</th></>)}
                        {visibleColumns.includes('market_max') && (<><th scope="col" className="px-2 py-3 text-center font-bold tracking-wider">Máx. Mkt</th><th scope="col" className="px-2 py-3 text-center font-bold tracking-wider">Evol %</th></>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900">
                    {processedData.map((periodRow) => (
                        <React.Fragment key={periodRow.periodKey}>
                            {/* Linha de Resumo de Mercado (Header da Data) */}
                            <tr className="group bg-slate-800/30 hover:bg-slate-800/60">
                                <th scope="row" className="px-3 py-2 font-bold text-slate-200 sticky left-0 bg-slate-900 group-hover:bg-slate-800 z-10 text-left border-r border-slate-800 text-xs whitespace-nowrap">{periodRow.periodDisplay}</th>
                                <th scope="row" className="px-3 py-2 font-bold text-slate-400 text-left text-xs border-r border-slate-800">MERCADO</th>
                                {visibleColumns.includes('seu_preco') && (<><td className="px-2 py-2 text-center text-xs text-slate-600">-</td><td className="px-2 py-2 text-center text-xs text-slate-600 border-r border-slate-800">-</td></>)}
                                {visibleColumns.includes('market_min') && (<><td className="px-2 py-2 text-center text-xs font-sans tabular-nums font-bold text-slate-300">{formatPrice(periodRow.market.min.value)}</td><td className="px-2 py-2 text-center text-xs border-r border-slate-800"><RenderDelta delta={periodRow.market.min.delta} /></td></>)}
                                {visibleColumns.includes('market_avg') && (<><td className="px-2 py-2 text-center text-xs font-sans tabular-nums font-bold text-slate-300">{formatPrice(periodRow.market.avg.value)}</td><td className="px-2 py-2 text-center text-xs border-r border-slate-800"><RenderDelta delta={periodRow.market.avg.delta} /></td></>)}
                                {visibleColumns.includes('market_max') && (<><td className="px-2 py-2 text-center text-xs font-sans tabular-nums font-bold text-slate-300">{formatPrice(periodRow.market.max.value)}</td><td className="px-2 py-2 text-center text-xs"><RenderDelta delta={periodRow.market.max.delta} /></td></>)}
                            </tr>
                            {/* Linhas das Distribuidoras */}
                            {periodRow.distributorPrices.filter(dist => selectedTableDistributors.has(dist.name)).map((distributorPriceRow) => {
                                const { name, price: priceData } = distributorPriceRow;
                                const color = getDistributorColor(name);
                                const userPrice = priceData.value;
                                const diffMin = userPrice !== null && periodRow.market.min.value !== null ? userPrice - periodRow.market.min.value : null;
                                const diffAvg = userPrice !== null && periodRow.market.avg.value !== null ? userPrice - periodRow.market.avg.value : null;
                                const diffMax = userPrice !== null && periodRow.market.max.value !== null ? userPrice - periodRow.market.max.value : null;
                                
                                return (
                                    <tr key={`${periodRow.periodKey}-${name}`} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-3 py-2 sticky left-0 bg-slate-900 hover:bg-slate-900/0 z-10 border-r border-slate-800"></td> 
                                        <th scope="row" className="px-3 py-2 text-left border-r border-slate-800">
                                            <div className="inline-flex items-center gap-2">
                                                <div 
                                                    className="h-2 w-2 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: color.background }}
                                                />
                                                <span className="text-sm font-medium text-slate-300 truncate max-w-[120px]">{name}</span>
                                            </div>
                                        </th>
                                        {visibleColumns.includes('seu_preco') && (<><td className="px-2 py-2 text-center text-xs font-sans tabular-nums font-bold text-emerald-400 bg-emerald-950/10">{formatPrice(priceData.value)}</td><td className="px-2 py-2 text-center border-r border-slate-800"><RenderDelta delta={priceData.delta} /></td></>)}
                                        {visibleColumns.includes('market_min') && <td colSpan={2} className="px-2 py-2 text-center border-r border-slate-800"><RenderPriceDifference delta={diffMin} /></td>}
                                        {visibleColumns.includes('market_avg') && <td colSpan={2} className="px-2 py-2 text-center border-r border-slate-800"><RenderPriceDifference delta={diffAvg} /></td>}
                                        {visibleColumns.includes('market_max') && <td colSpan={2} className="px-2 py-2 text-center"><RenderPriceDifference delta={diffMax} /></td>}
                                    </tr>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default HistoryDataTable;