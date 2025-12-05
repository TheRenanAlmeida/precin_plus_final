
import React, { useMemo } from 'react';
import type { ProductData, DistributorColors } from '../../types';
import { formatPriceSmart } from '../../utils/dataHelpers';
import { getOriginalBrandName } from '../../utils/styleManager';

interface RankingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: string | null;
  marketData: ProductData[];
  distributorColors: DistributorColors;
  distributorImages: { [key: string]: string | null };
}

const RankingDrawer: React.FC<RankingDrawerProps> = ({ isOpen, onClose, product, marketData, distributorColors, distributorImages }) => {
  const rankedPrices = useMemo(() => {
    if (!product) return [];
    const productData = marketData.find(p => p.produto === product);
    if (!productData) return [];

    // FIX: Correctly process price arrays to handle multiple prices per distributor, sort them, and assign ranks, resolving multiple type errors.
    const distributorPrices = Object.entries(productData.prices)
      .map(([distributor, prices]) => {
        // Each distributor can have multiple prices; we'll take the minimum valid price for ranking.
        // FIX: Use Array.isArray as a type guard to ensure `prices` is treated as an array.
        if (!Array.isArray(prices) || prices.length === 0) {
          return { distributor, price: null };
        }
        // FIX: Add `is number` type guard to correctly infer the type of `validPrices` as `number[]`.
        const validPrices = prices.filter((p): p is number => typeof p === 'number' && isFinite(p));
        if (validPrices.length === 0) {
          return { distributor, price: null };
        }
        return { distributor, price: Math.min(...validPrices) };
      })
      .filter((item): item is { distributor: string; price: number } => item.price !== null)
      .sort((a, b) => a.price - b.price);

    if (distributorPrices.length === 0) return [];

    const rankedList: { distributor: string; price: number; rank: number }[] = [];
    let rank = 0;
    let lastPrice = -Infinity;

    distributorPrices.forEach(({ distributor, price }) => {
      if (price > lastPrice) {
        rank++;
      }
      rankedList.push({ distributor, price, rank });
      lastPrice = price;
    });

    return rankedList;
  }, [product, marketData]);

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>
      <div 
        className={`fixed top-0 left-0 h-full w-80 sm:w-96 bg-gray-50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-r border-green-400 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {product && (
          <div className="flex flex-col h-full">
            <header className="p-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0">
              <h2 className="text-lg font-bold text-gray-800 truncate">Ranking: {product}</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </header>
            <ul className="flex-grow overflow-y-auto p-2 space-y-2 overflow-x-hidden">
              {rankedPrices.map(({ distributor, price, rank }) => {
                const style = distributorColors[distributor] || distributorColors.DEFAULT;
                const imageUrl = distributorImages[getOriginalBrandName(distributor)];
                let rankColor = 'bg-gray-200 text-gray-700';
                if (rank === 1) rankColor = 'bg-yellow-400 text-yellow-900';
                if (rank === 2) rankColor = 'bg-gray-300 text-gray-800';
                if (rank === 3) rankColor = 'bg-orange-400 text-orange-900';

                return (
                  <li 
                    key={distributor} 
                    className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 transition-transform duration-200 ease-in-out hover:scale-105 hover:ring-2 hover:ring-green-400 hover:z-10 hover:relative"
                  >
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${rankColor}`}>
                      {rank}º
                    </span>
                    <div 
                      className="flex-grow flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-bold rounded-full text-center truncate distributor-pill"
                      style={{ 
                        backgroundColor: style.background, 
                        color: style.border,
                        '--shadow-color': style.shadowColor,
                      } as React.CSSProperties}
                    >
                      {imageUrl && (
                          <img src={imageUrl} alt={distributor} className="w-5 h-5 rounded-full bg-white/20 p-0.5 object-contain" />
                      )}
                      <span className="truncate">{distributor}</span>
                    </div>
                    <span className="flex-shrink-0 text-base font-bold text-green-700">
                      R$ {formatPriceSmart(price)}
                    </span>
                  </li>
                );
              })}
              {rankedPrices.length === 0 && (
                <li className="text-center text-gray-500 p-8">
                  Nenhum preço encontrado para este produto.
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </>
  );
};

export default RankingDrawer;
