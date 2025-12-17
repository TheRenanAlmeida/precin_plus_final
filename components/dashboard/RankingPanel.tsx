
import React, { useMemo } from 'react';
import type { ProductData, DistributorColors } from '../../types';
import { formatPriceSmart } from '../../utils/dataHelpers';
import { getOriginalBrandName } from '../../utils/styleManager';
import { FUEL_PRODUCTS } from '../../constants/fuels';
import { Tip } from '../common/Tip';
import { TOOLTIP } from '../../constants/tooltips';

interface RankingPanelProps {
  marketData: ProductData[];
  distributorColors: DistributorColors;
  distributorImages: { [key: string]: string | null };
}

const RankingPanel: React.FC<RankingPanelProps> = ({ marketData, distributorColors, distributorImages }) => {
  
  // Pré-calcula os rankings para todos os produtos de uma vez
  const allRankings = useMemo(() => {
    const result: Record<string, { distributor: string; price: number; rank: number }[]> = {};

    FUEL_PRODUCTS.forEach(product => {
        const productData = marketData.find(p => p.produto === product);
        if (!productData) {
            result[product] = [];
            return;
        }

        const distributorPrices = Object.entries(productData.prices)
        .map(([distributor, prices]) => {
            if (!Array.isArray(prices) || prices.length === 0) return null;
            const validPrices = prices.filter((p): p is number => typeof p === 'number' && isFinite(p));
            if (validPrices.length === 0) return null;
            return { distributor, price: Math.min(...validPrices) };
        })
        .filter((item): item is { distributor: string; price: number } => item !== null)
        .sort((a, b) => a.price - b.price);

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

        result[product] = rankedList;
    });

    return result;
  }, [marketData]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {FUEL_PRODUCTS.map((product) => {
        const rankedPrices = allRankings[product] || [];
        
        return (
            <div key={product} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg flex flex-col h-full min-h-[350px]">
                {/* Header do Card */}
                <div className="p-3 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide text-center truncate" title={product}>
                        <Tip text={TOOLTIP.HEADER_RANKING}>
                            {product}
                        </Tip>
                    </h3>
                </div>

                {/* Lista de Ranking */}
                <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {rankedPrices.length > 0 ? (
                        rankedPrices.map(({ distributor, price, rank }) => {
                            const style = distributorColors[distributor] || distributorColors.DEFAULT;
                            const imageUrl = distributorImages[getOriginalBrandName(distributor)];
                            
                            let rankBadgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
                            if (rank === 1) rankBadgeClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
                            if (rank === 2) rankBadgeClass = 'bg-slate-300/20 text-slate-300 border-slate-400/30';
                            if (rank === 3) rankBadgeClass = 'bg-orange-500/20 text-orange-400 border-orange-500/30';

                            return (
                                <div 
                                    key={distributor} 
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/50 transition-colors group"
                                >
                                    <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border ${rankBadgeClass}`}>
                                        {rank}
                                    </span>
                                    
                                    <div className="flex-grow flex items-center gap-2 min-w-0">
                                        {imageUrl && (
                                            <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                                                <img src={imageUrl} alt={distributor} className="w-4 h-4 object-contain" />
                                            </div>
                                        )}
                                        <span className="text-[10px] font-medium text-slate-300 truncate group-hover:text-white transition-colors">
                                            {distributor}
                                        </span>
                                    </div>

                                    <span className="flex-shrink-0 text-[10px] font-sans tabular-nums font-bold text-emerald-400">
                                        {formatPriceSmart(price)}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600 text-xs py-10 opacity-50">
                            <span className="block mb-1">∅</span>
                            Sem dados
                        </div>
                    )}
                </div>
            </div>
        );
      })}
    </div>
  );
};

export default RankingPanel;
