
import React from 'react';
import QuoteRow from './QuoteRow';
import type { FuelProduct, BrandName, MinPriceInfo, DistributorColors } from '../../../types';

interface QuoteTableSingleViewProps {
    products: FuelProduct[];
    activeBrand: BrandName;
    allBrandPrices: { [key in BrandName]?: { [product: string]: number } };
    allBrandPriceInputs: { [key in BrandName]?: { [product: string]: string } };
    handleBrandPriceChange: (brand: string, product: string, value: string) => void;
    marketMinPrices: { [product: string]: MinPriceInfo };
    averagePrices: { [product: string]: number };
    selectedDistributors: Set<string>;
    distributorColors: DistributorColors;
    onDistributorPillClick?: (dist: string) => void;
    isSharePreview: boolean;
    isAvgMode: boolean;
}

const QuoteTableSingleView: React.FC<QuoteTableSingleViewProps> = ({
    products,
    activeBrand,
    allBrandPrices,
    allBrandPriceInputs,
    handleBrandPriceChange,
    marketMinPrices,
    averagePrices,
    selectedDistributors,
    distributorColors,
    onDistributorPillClick,
    isSharePreview,
    isAvgMode
}) => {
    // Usando as classes 'pp-th' (header base) do index.html
    
    // Helper para distribuir as distribuidoras (apenas para modo Avg)
    const getDistributorChunks = (dists: string[], chunks: number) => {
        const sorted = [...dists].sort();
        const result = [];
        const base = Math.floor(sorted.length / chunks);
        const remainder = sorted.length % chunks;
        
        let startIndex = 0;
        for (let i = 0; i < chunks; i++) {
            const count = base + (i < remainder ? 1 : 0);
            result.push(sorted.slice(startIndex, startIndex + count));
            startIndex += count;
        }
        return result;
    };

    const distributorChunks = isAvgMode 
        ? getDistributorChunks(Array.from(selectedDistributors) as string[], products.length)
        : [];

    return (
        <div className="w-full">
            <table className="w-full text-left border-collapse bg-slate-900 font-sans table-fixed">
                <colgroup>
                    <col className="w-[15%]" /> {/* Produto */}
                    <col className="w-[13%]" /> {/* Seu Preço */}
                    <col className="w-[13%]" /> {/* Ref */}
                    <col className="w-[10%]" /> {/* Dif R$ */}
                    <col className="w-[10%]" /> {/* Dif % */}
                    <col className="w-[39%]" /> {/* Fontes - Expandido */}
                </colgroup>
                <thead>
                    <tr>
                        <th scope="col" className="pp-th text-left">Produto</th>
                        <th scope="col" className="pp-th text-right">Seu Preço</th>
                        <th scope="col" className="pp-th text-right">{isAvgMode ? 'Ref. Média' : 'Ref. Mínima'}</th>
                        <th scope="col" className="pp-th text-right">Dif R$</th>
                        <th scope="col" className="pp-th text-right">Dif %</th>
                        <th scope="col" className="pp-th text-right">Fontes</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((produto, index) => {
                        const brandPrice = allBrandPrices[activeBrand]?.[produto] || 0;
                        const brandPriceInput = allBrandPriceInputs[activeBrand]?.[produto] ?? '';
                        const comparisonPrice = isAvgMode ? (averagePrices[produto] || 0) : (marketMinPrices[produto]?.minPrice || 0);
                        
                        // Define quais distribuidores mostrar na célula de fontes
                        const distributorsToShow = isAvgMode 
                            ? (distributorChunks[index] || []) 
                            : (marketMinPrices[produto]?.distributors || []);

                        return (
                            <QuoteRow
                                key={produto}
                                product={produto}
                                activeBrand={activeBrand}
                                brandPrice={brandPrice}
                                brandPriceInput={brandPriceInput}
                                comparisonPrice={comparisonPrice}
                                marketDistributors={distributorsToShow}
                                distributorColors={distributorColors}
                                onPriceChange={handleBrandPriceChange}
                                onDistributorPillClick={onDistributorPillClick}
                                isSharePreview={isSharePreview}
                                isAvgMode={isAvgMode}
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default QuoteTableSingleView;
