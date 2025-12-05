
import React, { useState } from 'react';
import type { HistoryDataTableProps, DistributorStyle } from '../../types';
import { formatPrice, formatDeltaForDisplay, formatPriceDifferenceForDisplay } from '../../utils/dataHelpers';
import { getOriginalBrandName } from '../../utils/styleManager';
import DistributorLogo from '../DistributorLogo';

const RenderDelta: React.FC<{ delta: number | null }> = ({ delta }) => {
    const data = formatDeltaForDisplay(delta);
    if (!data) return <span className="text-gray-400">-</span>;
    const { colorClass, arrow, formattedValue } = data;
    return (
        <span className={`inline-flex items-center justify-center gap-1 text-sm font-bold ${colorClass}`}>
            {arrow} {formattedValue}
        </span>
    );
};

const RenderPriceDifference: React.FC<{ delta: number | null }> = ({ delta }) => {
    const data = formatPriceDifferenceForDisplay(delta);
    if (!data) return <span className="text-gray-400">-</span>;
    const { colorClass, sign, formattedValue } = data;
    return (
        <span className={`text-sm font-bold ${colorClass}`}>
            {sign}{formattedValue}
        </span>
    );
};


const HistoryDataTable: React.FC<HistoryDataTableProps> = ({
    processedData,
    visibleColumns,
    getDistributorColor,
    distributorImages,
    selectedTableDistributors,
}) => {

    return (
        <div className="overflow-x-auto shadow-xl rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 bg-white">
                <thead className="text-xs text-white uppercase bg-gradient-to-r from-green-600 to-green-500 sticky top-0 z-20">
                    <tr>
                        <th scope="col" className="px-2 sm:px-4 py-3 text-left font-bold tracking-wider sticky left-0 bg-green-600 z-30">Período</th>
                        <th scope="col" className="px-2 sm:px-4 py-3 text-left font-bold tracking-wider">Distribuidora</th>
                        {visibleColumns.includes('seu_preco') && (<><th scope="col" className="px-2 sm:px-3 py-3 text-center font-bold tracking-wider">Meus Preços</th><th scope="col" className="px-2 sm:px-3 py-3 text-center font-bold tracking-wider">Evolução %</th></>)}
                        {visibleColumns.includes('market_min') && (<><th scope="col" className="px-2 sm:px-3 py-3 text-center font-bold tracking-wider">Mín. Mercado</th><th scope="col" className="px-2 sm:px-3 py-3 text-center font-bold tracking-wider">Evolução %</th></>)}
                        {visibleColumns.includes('market_avg') && (<><th scope="col" className="px-2 sm:px-3 py-3 text-center font-bold tracking-wider">Média Mercado</th><th scope="col" className="px-2 sm:px-3 py-3 text-center font-bold tracking-wider">Evolução %</th></>)}
                        {visibleColumns.includes('market_max') && (<><th scope="col" className="px-2 sm:px-3 py-3 text-center font-bold tracking-wider">Máx. Mercado</th><th scope="col" className="px-2 sm:px-3 py-3 text-center font-bold tracking-wider">Evolução %</th></>)}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {processedData.map((periodRow) => (
                        <React.Fragment key={periodRow.periodKey}>
                            <tr className="group bg-emerald-50/60 hover:bg-emerald-50">
                                <td className="px-2 sm:px-4 py-3 font-semibold text-gray-900 sticky left-0 bg-emerald-50 group-hover:bg-emerald-50 z-10">{periodRow.periodDisplay}</td>
                                <td className="px-2 sm:px-4 py-3 font-bold text-emerald-700">MERCADO</td>
                                {visibleColumns.includes('seu_preco') && (<><td className="px-2 sm:px-3 py-3 text-center text-sm text-gray-500">-</td><td className="px-2 sm:px-3 py-3 text-center text-sm text-gray-500">-</td></>)}
                                {visibleColumns.includes('market_min') && (<><td className="px-2 sm:px-3 py-3 text-center text-sm font-bold text-gray-900 border-l border-dotted border-gray-200">{formatPrice(periodRow.market.min.value)}</td><td className="px-2 sm:px-3 py-3 text-center text-sm font-medium"><RenderDelta delta={periodRow.market.min.delta} /></td></>)}
                                {visibleColumns.includes('market_avg') && (<><td className="px-2 sm:px-3 py-3 text-center text-sm font-bold text-gray-800 border-l border-dotted border-gray-200">{formatPrice(periodRow.market.avg.value)}</td><td className="px-2 sm:px-3 py-3 text-center text-sm font-medium"><RenderDelta delta={periodRow.market.avg.delta} /></td></>)}
                                {visibleColumns.includes('market_max') && (<><td className="px-2 sm:px-3 py-3 text-center text-sm font-bold text-gray-900 border-l border-dotted border-gray-200">{formatPrice(periodRow.market.max.value)}</td><td className="px-2 sm:px-3 py-3 text-center text-sm font-medium"><RenderDelta delta={periodRow.market.max.delta} /></td></>)}
                            </tr>
                            {periodRow.distributorPrices.filter(dist => selectedTableDistributors.has(dist.name)).map((distributorPriceRow) => {
                                const { name, price: priceData } = distributorPriceRow;
                                const color = getDistributorColor(name);
                                const imageUrl = distributorImages[getOriginalBrandName(name)];
                                const userPrice = priceData.value;
                                const diffMin = userPrice !== null && periodRow.market.min.value !== null ? userPrice - periodRow.market.min.value : null;
                                const diffAvg = userPrice !== null && periodRow.market.avg.value !== null ? userPrice - periodRow.market.avg.value : null;
                                const diffMax = userPrice !== null && periodRow.market.max.value !== null ? userPrice - periodRow.market.max.value : null;
                                
                                return (
                                    <tr key={`${periodRow.periodKey}-${name}`} className="hover:bg-gray-50">
                                        <td className="px-2 sm:px-4 py-3 font-medium text-gray-500 sticky left-0 bg-white hover:bg-gray-50 z-10"></td> 
                                        <td className="px-2 sm:px-4 py-3 text-sm font-semibold">
                                            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: color.background, color: color.border }}>
                                                {imageUrl && (
                                                    <img src={imageUrl} alt={name} className="w-5 h-5 rounded-full bg-white/20 p-0.5 object-contain" />
                                                )}
                                                <span>{name}</span>
                                            </div>
                                        </td>
                                        {visibleColumns.includes('seu_preco') && (<><td className="px-2 sm:px-3 py-3 text-center text-sm font-bold text-gray-800">{formatPrice(priceData.value)}</td><td className="px-2 sm:px-3 py-3 text-center text-sm font-medium"><RenderDelta delta={priceData.delta} /></td></>)}
                                        {visibleColumns.includes('market_min') && <td colSpan={2} className="px-2 sm:px-3 py-3 text-center border-l border-dotted border-gray-200"><RenderPriceDifference delta={diffMin} /></td>}
                                        {visibleColumns.includes('market_avg') && <td colSpan={2} className="px-2 sm:px-3 py-3 text-center border-l border-dotted border-gray-200"><RenderPriceDifference delta={diffAvg} /></td>}
                                        {visibleColumns.includes('market_max') && <td colSpan={2} className="px-2 sm:px-3 py-3 text-center border-l border-dotted border-gray-200"><RenderPriceDifference delta={diffMax} /></td>}
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
