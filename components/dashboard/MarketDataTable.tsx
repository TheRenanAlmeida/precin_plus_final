

import React from 'react';
import type { MarketDataTableProps } from '../../types';
import { formatPriceSmart } from '../../utils/dataHelpers';

const PRODUCT_ABBR: Record<string, string> = {
  'Gasolina Comum': 'GC',
  'Gasolina Aditivada': 'GA',
  'Etanol': 'ET',
  'Diesel S10': 'S10',
  'Diesel S500': 'S500',
};

const MarketDataTable: React.FC<MarketDataTableProps> = ({ 
    marketData, 
    marketMinPrices, 
    distributors, 
    distributorColors, 
    selectedDistributors, 
    highlightedDistributor, 
}) => {
  // Dark mode classes - Extremely dense for "single screen" view
  // 'table-fixed' is crucial here to force columns to fit within the container width
  const headerClass = "px-1 py-2 text-center font-bold border-b border-slate-800 text-[10px] uppercase tracking-tighter text-slate-400 bg-slate-900/90 break-words leading-tight align-bottom";
  const cellClass = "px-1 py-2 text-center font-sans tabular-nums text-xs transition-all duration-200 border-b border-slate-800/50";
  
  // First column (Product) specific style - narrow width
  const stickyColClass = "px-2 py-2 font-bold text-slate-300 text-center bg-slate-900 border-r border-slate-800 text-[10px] uppercase w-12";

  return (
    <div className="bg-slate-900 w-full rounded-2xl border border-slate-800 shadow-lg flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Tabela do Mercado</h2>
          </div>
      </div>
      
      {/* Removed overflow-x-auto to force single screen view */}
      <div className="w-full">
        <table className="w-full text-xs text-left border-collapse font-sans bg-slate-900 table-fixed">
          <thead>
            <tr>
              {/* Product Column - Fixed narrow width */}
              <th scope="col" className={`${stickyColClass} w-[50px]`}>PROD</th>
              
              {/* Distributor Columns - Auto distributed due to table-fixed */}
              {distributors.map((distributor) => {
                  const colors = distributorColors[distributor] || distributorColors.DEFAULT;
                  const isDistributorActive = selectedDistributors.has(distributor);
                  return (
                    <th 
                      key={distributor} 
                      scope="col" 
                      className={`${headerClass} ${!isDistributorActive ? 'opacity-30 grayscale' : ''} ${highlightedDistributor === distributor ? 'bg-amber-900/20' : ''}`}
                    >
                        <span style={{ color: colors.background }}>{distributor}</span>
                    </th>
                  );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {marketData.length > 0 ? marketData.map(({ produto, prices }) => (
              <tr key={produto} className="hover:bg-slate-800/60 transition-colors">
                <th scope="row" className={stickyColClass} title={produto}>
                    {PRODUCT_ABBR[produto] || produto.substring(0, 3)}
                </th>
                {distributors.map((distributor) => {
                  const priceArray = prices[distributor];
                  const price = priceArray && priceArray.length > 0 ? Math.min(...priceArray) : undefined;
                  const isDistributorActive = selectedDistributors.has(distributor);
                  const isMinPriceAmongSelected = price === marketMinPrices[produto]?.minPrice;
                  const isMin = isDistributorActive && isMinPriceAmongSelected;
                  
                  return (
                    <td key={distributor} className={`${cellClass} ${
                        isMin 
                        ? 'font-bold text-emerald-400 bg-emerald-950/20' 
                        : `text-slate-400 ${!isDistributorActive ? 'opacity-20' : ''}`
                    } ${highlightedDistributor === distributor ? 'bg-amber-900/10 text-amber-200' : ''}`}>
                      {price !== undefined ? formatPriceSmart(price) : '-'}
                    </td>
                  );
                })}
              </tr>
            )) : (
              <tr>
                <td colSpan={distributors.length + 1} className="text-center py-6 text-slate-500 text-xs">
                  Sem dados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarketDataTable;