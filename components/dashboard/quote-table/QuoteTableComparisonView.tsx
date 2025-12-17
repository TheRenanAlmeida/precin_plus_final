
import React from 'react';
import type { FuelProduct, BrandName, DistributorColors, MinPriceInfo } from '../../../types';
import { formatPriceSmart, formatDiffCurrency, getDiffColorClass } from '../../../utils/dataHelpers';
import { getOriginalBrandName } from '../../../utils/styleManager';
import DebouncedPriceInput from './DebouncedPriceInput';

interface QuoteTableComparisonViewProps {
    products: FuelProduct[];
    brands: BrandName[];
    activeBrand: BrandName;
    allBrandPrices: { [key in BrandName]?: { [product: string]: number } };
    allBrandPriceInputs: { [key in BrandName]?: { [product: string]: string } };
    handleBrandPriceChange: (brand: string, product: string, value: string) => void;
    marketMinPrices: { [product: string]: MinPriceInfo };
    averagePrices: { [product: string]: number };
    distributorColors: DistributorColors;
    distributorImages: { [key: string]: string | null };
    isSharePreview: boolean;
    isAvgMode: boolean;
}

const QuoteTableComparisonView: React.FC<QuoteTableComparisonViewProps> = ({
    products,
    brands,
    activeBrand,
    allBrandPrices,
    allBrandPriceInputs,
    handleBrandPriceChange,
    marketMinPrices,
    averagePrices,
    distributorColors,
    distributorImages,
    isSharePreview,
    isAvgMode
}) => {
    // Usando as novas classes 'pp-th' e 'pp-td' definidas no index.html
    
    // Ordena: Bandeira Ativa primeiro, depois as outras
    const orderedBrands: BrandName[] = [activeBrand, ...brands.filter(b => b !== activeBrand)];
    
    // Definição de Larguras Dinâmicas
    const productColWidth = 14; 
    const remainingWidth = 100 - productColWidth;
    const numberOfDynamicCols = orderedBrands.length + 1; // +1 para a coluna Mercado
    const dynamicColWidth = remainingWidth / numberOfDynamicCols;

    return (
        <div className="w-full">
            <table className="w-full text-left border-collapse bg-slate-900 font-sans table-fixed">
                <colgroup>
                    <col style={{ width: `${productColWidth}%` }} />
                    {orderedBrands.map(b => <col key={b} style={{ width: `${dynamicColWidth}%` }} />)}
                    <col style={{ width: `${dynamicColWidth}%` }} />
                </colgroup>
                <thead>
                    <tr>
                        <th scope="col" className="pp-th text-left">PRODUTO</th>
                        {orderedBrands.map(brand => {
                            const isReference = brand === activeBrand;
                            const style = distributorColors[brand] || distributorColors.DEFAULT;
                            const originalName = getOriginalBrandName(brand);
                            const imageUrl = distributorImages[originalName];
                            
                            // Visual Limpo: Apenas borda inferior na referência, sem fundo colorido
                            const headerStyle = isReference 
                                ? { borderBottom: `2px solid ${style.border}` } 
                                : {};

                            return (
                                <th key={brand} scope="col" className="pp-th text-center" style={headerStyle}>
                                    <div className="flex flex-col items-center gap-1">
                                        {imageUrl && (
                                            <img src={imageUrl} alt={brand} className="w-5 h-5 object-contain" />
                                        )}
                                        <span 
                                            className="truncate block max-w-full font-bold"
                                            style={{ color: style.border }}
                                        >
                                            {brand === 'Branca/Indefinida' ? 'Branca' : brand}
                                        </span>
                                    </div>
                                </th>
                            );
                        })}
                        <th scope="col" className="pp-th text-center">
                            {isAvgMode ? 'Média Mkt' : 'Mínima Mkt'}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((produto) => {
                        const referencePrice = allBrandPrices[activeBrand]?.[produto] || 0;
                        const marketComparisonPrice = isAvgMode ? (averagePrices[produto] || 0) : (marketMinPrices[produto]?.minPrice || 0);
                        
                        const marketDiff = (marketComparisonPrice > 0 && referencePrice > 0) 
                            ? marketComparisonPrice - referencePrice 
                            : null;

                        return (
                            <tr key={produto} className="hover:bg-slate-800/40 transition-colors">
                                {/* Coluna Produto */}
                                <td className="pp-td-text" title={produto}>
                                    {produto}
                                </td>

                                {/* Colunas das Bandeiras */}
                                {orderedBrands.map((brand) => {
                                    const brandPrice = allBrandPrices[brand]?.[produto] || 0;
                                    const isReference = brand === activeBrand;
                                    
                                    if (isReference) {
                                        const brandPriceInput = allBrandPriceInputs[brand]?.[produto] ?? '';
                                        const priceEntered = brandPriceInput && brandPrice > 0;
                                        
                                        return (
                                            <td key={brand} className="pp-td text-center bg-slate-800/30 border-l border-r border-slate-700/30 p-0">
                                                {isSharePreview ? (
                                                    <span className={`font-bold font-sans text-sm text-slate-100`}>
                                                        {priceEntered ? formatPriceSmart(brandPrice) : '-'}
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center justify-center h-full w-full p-1">
                                                        <DebouncedPriceInput
                                                            value={brandPriceInput}
                                                            onCommit={(val) => handleBrandPriceChange(brand, produto, val)}
                                                            placeholder="0,000"
                                                            className="w-full text-center bg-transparent border border-transparent rounded focus:bg-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none font-bold text-slate-100 font-sans tabular-nums text-sm py-1.5 transition-all placeholder-slate-700"
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    } else {
                                        // Comparação (Outras Marcas vs Ativa)
                                        const difference = (brandPrice > 0 && referencePrice > 0) ? brandPrice - referencePrice : null;
                                        let priceColorClass = 'text-slate-500';
                                        let diffDisplay = null;

                                        if (brandPrice > 0) {
                                            if (referencePrice > 0 && difference !== null) {
                                                priceColorClass = getDiffColorClass(difference);

                                                if (Math.abs(difference) > 0.0001) {
                                                     const diffColorClass = difference < 0 ? 'text-emerald-400' : 'text-rose-400';
                                                     // Removemos o quadrado (badge/bg), apenas texto colorido
                                                     diffDisplay = (
                                                        <span className={`text-[10px] font-bold ${diffColorClass}`}>
                                                            {formatDiffCurrency(difference)}
                                                        </span>
                                                     );
                                                }
                                            } else {
                                                priceColorClass = 'text-slate-100';
                                            }
                                        }

                                        return (
                                            <td key={brand} className="pp-td text-center">
                                                <div className="flex flex-col items-center justify-center gap-0.5">
                                                    <span className={`font-bold font-sans text-sm ${priceColorClass}`}>
                                                        {brandPrice > 0 ? formatPriceSmart(brandPrice) : '-'}
                                                    </span>
                                                    {diffDisplay}
                                                </div>
                                            </td>
                                        );
                                    }
                                })}

                                {/* Coluna Mercado */}
                                <td className="pp-td text-center bg-slate-900/50 border-l border-slate-800">
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                        <span className="text-slate-100 font-bold font-sans text-sm">
                                            {marketComparisonPrice > 0 ? formatPriceSmart(marketComparisonPrice) : '-'}
                                        </span>
                                        {marketDiff !== null && Math.abs(marketDiff) > 0.0001 && (
                                            // Também removido o badge do mercado
                                            <span className={`text-[10px] font-bold ${marketDiff < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {formatDiffCurrency(marketDiff)}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default QuoteTableComparisonView;
