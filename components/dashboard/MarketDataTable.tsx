import React from 'react';
import type { MarketDataTableProps } from '../../types';
import { formatPriceSmart } from '../../utils/dataHelpers';


const MarketDataTable: React.FC<MarketDataTableProps> = ({ 
    marketData, 
    marketMinPrices, 
    distributors, 
    distributorColors, 
    selectedDistributors, 
    highlightedDistributor, 
}) => {
  return (
    <div>
      <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-wide">COTAÇÃO COMPLETA DE MERCADO (BASE DE DADOS)</h2>
          <p className="text-xs text-gray-500 mt-1">
            A célula destacada em cada linha representa o menor preço de mercado entre as distribuidoras selecionadas.
          </p>
        </div>
      </div>
      <div className="overflow-auto max-h-[60vh] relative">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-xs uppercase bg-slate-100 sticky top-0 z-30">
            <tr>
              <th scope="col" className="px-2 sm:px-4 py-3 sticky left-0 bg-slate-100 z-40 font-semibold tracking-wider text-gray-600">PRODUTO</th>
              {distributors.map((distributor) => {
                  const colors = distributorColors[distributor] || distributorColors.DEFAULT;
                  const isDistributorActive = selectedDistributors.has(distributor);
                  return (
                    <th 
                      key={distributor} 
                      scope="col" 
                      className={`px-2 sm:px-3 py-3 text-center font-semibold tracking-wider transition-opacity ${!isDistributorActive ? 'opacity-40' : ''} ${highlightedDistributor === distributor ? 'highlight-column' : ''}`}
                      style={{ 
                        backgroundColor: colors.background,
                        color: colors.border
                      }}
                    >
                      {distributor}
                    </th>
                  );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {marketData.length > 0 ? marketData.map(({ produto, prices }) => (
              <tr key={produto} className="hover:bg-slate-50">
                <th scope="row" className="px-2 sm:px-4 py-3 font-medium text-gray-900 bg-white whitespace-nowrap sticky left-0 z-20 border-r">{produto}</th>
                {distributors.map((distributor) => {
                  const priceArray = prices[distributor];
                  const price = priceArray && priceArray.length > 0 ? Math.min(...priceArray) : undefined;
                  const isDistributorActive = selectedDistributors.has(distributor);
                  const isMinPriceAmongSelected = price === marketMinPrices[produto]?.minPrice;
                  const isMin = isDistributorActive && isMinPriceAmongSelected;
                  
                  return (
                    <td key={distributor} className={`px-2 sm:px-3 py-3 text-center font-bold transition-all duration-200 tabular-nums ${
                        isMin 
                        ? 'bg-green-100 text-green-900 z-10 relative' 
                        : `text-gray-800 ${!isDistributorActive ? 'opacity-40' : ''}`
                    } ${highlightedDistributor === distributor ? 'highlight-column' : ''}`}>
                      {price !== undefined ? formatPriceSmart(price) : '-'}
                    </td>
                  );
                })}
              </tr>
            )) : (
              <tr>
                <td colSpan={distributors.length + 1} className="text-center py-10 text-gray-500">
                  Nenhum dado de mercado encontrado para a data e base selecionadas.
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