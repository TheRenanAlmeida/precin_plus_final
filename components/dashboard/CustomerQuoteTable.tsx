
import React from 'react';
import type { CustomerQuoteTableProps } from '../../types';
import { formatPriceSmart } from '../../utils/dataHelpers';
import type { BrandName, FuelProduct } from '../../types';

// TypeScript declarations for libraries loaded via CDN
declare const html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
declare const jspdf: any;
declare const Chart: any;

const CustomerQuoteTable: React.FC<CustomerQuoteTableProps> = ({ 
  brands,
  allBrandPrices, 
  allBrandPriceInputs,
  handleBrandPriceChange, 
  marketMinPrices,
  averagePrices,
  onOpenShareModal,
  isSharing,
  quoteTableRef,
  distributorColors,
  distributorImages,
  products,
  selectedDistributors,
  onDistributorPillClick,
  isSharePreview = false,
  isComparisonMode,
  comparisonMode,
  onSaveQuote,
  isSaving,
  isSaveSuccess,
  activeBrand,
  onActiveBrandChange,
}) => {

  const isAvgMode = comparisonMode === 'avg';

  const formatDiffCurrency = (val: number) => {
      const abs = Math.abs(val);
      const sign = val > 0.00001 ? '+' : val < -0.00001 ? '-' : '';
      return `${sign}${formatPriceSmart(abs)}`; 
  };

  const formatDiffPercent = (val: number) => {
      const sign = val > 0 ? '+' : val < 0 ? '' : '';
      return `${sign}${val.toFixed(2).replace('.', ',')}%`;
  };

  // Dark Mode Styles
  const headerCellClass = "px-2 py-3 text-center text-xs font-bold text-slate-300 uppercase tracking-wider bg-slate-900/95 border-b border-slate-700 whitespace-nowrap align-middle";
  const headerCellLeftClass = "px-3 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider bg-slate-900/95 border-b border-slate-700 whitespace-nowrap align-middle";
  const headerCellRightClass = headerCellClass.replace('text-center', 'text-right');
  
  const cellClass = "px-2 py-2.5 text-sm text-slate-200 border-b border-slate-800 whitespace-nowrap tabular-nums font-sans font-bold text-right";
  const cellLeftClass = "px-3 py-2.5 text-sm text-slate-200 border-b border-slate-800 whitespace-nowrap tabular-nums font-sans font-semibold text-left truncate";

  const renderBrandTabs = () => (
    <div className="flex items-center gap-1 bg-slate-900 border-b border-slate-800 px-2 pt-2 overflow-x-auto scrollbar-hide">
      {brands.map((brand) => {
        const isActive = brand === activeBrand;
        const brandDisplayName = brand === 'Branca/Indefinida' ? 'Branca' : brand;
        const style = distributorColors[brand as string] || distributorColors.DEFAULT;

        return (
          <button
            key={brand}
            onClick={() => onActiveBrandChange(brand)}
            style={isActive ? { color: style.background } : {}}
            className={`
              whitespace-nowrap px-4 py-2 font-bold text-xs border-t border-l border-r rounded-t-lg transition-all
              ${isActive 
                ? 'bg-slate-800 border-slate-700 border-b-slate-800 -mb-px z-10' 
                : 'bg-slate-900/30 text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
              }
            `}
          >
            {brandDisplayName}
          </button>
        );
      })}
    </div>
  );

  const renderSingleBrandView = () => (
    <div className="w-full">
        <table className="w-full text-left border-collapse bg-slate-900 font-sans table-fixed">
        <colgroup>
            <col className="w-[20%]" /> {/* Produto */}
            <col className="w-[15%]" /> {/* Seu Preço */}
            <col className="w-[15%]" /> {/* Ref */}
            <col className="w-[12%]" /> {/* Dif R$ */}
            <col className="w-[12%]" /> {/* Dif % */}
            <col className="w-[26%]" /> {/* Fontes */}
        </colgroup>
        <thead>
            <tr>
                <th scope="col" className={headerCellLeftClass}>Produto</th>
                <th scope="col" className={headerCellRightClass}>Seu Preço</th>
                <th scope="col" className={headerCellRightClass}>{isAvgMode ? 'Ref. Média' : 'Ref. Mínima'}</th>
                <th scope="col" className={headerCellRightClass}>Dif R$</th>
                <th scope="col" className={headerCellRightClass}>Dif %</th>
                <th scope="col" className={headerCellRightClass}>Fontes</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
            {products.map((produto: FuelProduct, index) => {
            const isFirstRow = index === 0;
            const brandPrice = allBrandPrices[activeBrand as string]?.[produto as string] || 0;
            const brandPriceInput = allBrandPriceInputs[activeBrand as string]?.[produto as string] ?? '';
            const comparisonPrice = isAvgMode ? (averagePrices[produto as string] || 0) : (marketMinPrices[produto as string]?.minPrice || 0);
            
            const difference = brandPrice - comparisonPrice;
            const percentageDifference = comparisonPrice === 0 ? 0 : (difference / comparisonPrice) * 100;
            const priceEntered = brandPriceInput && brandPrice > 0;

            let diffTextColor = "text-slate-500";
            if (priceEntered && comparisonPrice > 0 && Math.abs(percentageDifference) >= 0.05) {
                diffTextColor = difference > 0 ? "text-rose-400" : "text-emerald-400";
            }
            
            let userInputColorClass = 'text-slate-500';
            if (priceEntered) {
              if (comparisonPrice > 0) {
                if (difference > 0.0001) userInputColorClass = 'text-rose-400';
                else if (difference < -0.0001) userInputColorClass = 'text-emerald-400';
                else userInputColorClass = 'text-slate-100';
              } else {
                userInputColorClass = 'text-emerald-400';
              }
            }

            return (
                <tr key={produto} className="hover:bg-slate-800/40 transition-colors group">
                    <td className={cellLeftClass} title={produto}>{produto}</td>

                    <td className={cellClass}>
                      <div className="flex justify-end">
                        {isSharePreview ? (
                          <span
                            className={`
                              tabular-nums font-bold text-sm
                              ${userInputColorClass}
                            `}
                          >
                            {priceEntered ? formatPriceSmart(brandPrice) : '-'}
                          </span>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={brandPriceInput}
                            onChange={(e) =>
                              handleBrandPriceChange(activeBrand, produto, e.target.value)
                            }
                            placeholder="0,0000"
                            className={`
                              w-full max-w-[110px] text-right bg-transparent border border-transparent rounded
                              focus:bg-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50
                              hover:border-slate-700/50 outline-none transition-all py-1 px-1 font-sans tabular-nums font-bold text-sm
                              ${userInputColorClass} placeholder-slate-700
                            `}
                          />
                        )}
                      </div>
                    </td>

                    <td className={`${cellClass} text-slate-100`}>
                        {comparisonPrice > 0 ? formatPriceSmart(comparisonPrice) : '-'}
                    </td>

                    <td className={`${cellClass} ${diffTextColor}`}>
                        {priceEntered && comparisonPrice > 0 ? formatDiffCurrency(difference) : '-'}
                    </td>

                    <td className={`${cellClass} ${diffTextColor}`}>
                        {priceEntered && comparisonPrice > 0 ? formatDiffPercent(percentageDifference) : '-'}
                    </td>

                    {isAvgMode ? (
                        isFirstRow && (
                            <td className={`${cellClass} align-top py-4`} rowSpan={products.length}>
                                <div className="flex flex-wrap justify-end gap-1.5 content-start">
                                    {Array.from(selectedDistributors).sort().map((distributor) => {
                                        const style = distributorColors[distributor as string] || distributorColors.DEFAULT;
                                        return (
                                            <button 
                                                key={distributor} 
                                                onClick={() => onDistributorPillClick?.(distributor)}
                                                className="flex items-center gap-1.5 px-2 py-1 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors shadow-sm"
                                                title={distributor}
                                            >
                                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.background }} />
                                                <span className="text-[10px] font-bold text-slate-300 max-w-[60px] truncate">{distributor}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </td>
                        )
                    ) : (
                        <td className={cellClass}>
                            <div className="flex flex-wrap justify-end gap-1">
                                {(marketMinPrices[produto as string]?.distributors || []).map((distributor: string) => {
                                    const style = distributorColors[distributor] || distributorColors.DEFAULT;
                                    return (
                                        <button 
                                            key={distributor} 
                                            onClick={() => onDistributorPillClick?.(distributor)}
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors"
                                            title={distributor}
                                        >
                                            <div className="h-1 w-1 rounded-full" style={{ backgroundColor: style.background }} />
                                            <span className="text-[9px] font-bold text-slate-300 max-w-[50px] truncate">{distributor}</span>
                                        </button>
                                    );
                                })}
                                {(!marketMinPrices[produto as string]?.distributors || marketMinPrices[produto as string].distributors.length === 0) && (
                                    <span className="text-xs text-slate-600">-</span>
                                )}
                            </div>
                        </td>
                    )}
                </tr>
            );
            })}
        </tbody>
        </table>
    </div>
  );

  const renderComparisonView = () => {
      // Ordena: Bandeira Ativa primeiro, depois as outras
      const orderedBrands: BrandName[] = [activeBrand, ...brands.filter(b => b !== activeBrand)];
      
      // Definição de Larguras Dinâmicas
      const productColWidth = 14; // Coluna PRODUTO fixa em 14% (ou poderia ser px)
      
      // O restante (86%) é dividido igualmente entre (Bandeiras + 1 coluna Mercado)
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
                        <th scope="col" className={headerCellLeftClass}>PRODUTO</th>
                        {orderedBrands.map(brand => {
                            const isReference = brand === activeBrand;
                            const style = distributorColors[brand as string] || distributorColors.DEFAULT;
                            
                            // Estilo condicional para a bandeira ativa
                            const headerStyle = isReference 
                                ? { 
                                    backgroundColor: style.background.replace('1)', '0.15)').replace(')', ', 0.15)'), 
                                    borderBottom: `2px solid ${style.background}`
                                  } 
                                : {};

                            return (
                                <th key={brand} scope="col" className={headerCellClass} style={headerStyle}>
                                    <div className="flex flex-col items-center">
                                        <span 
                                            className="truncate block max-w-full font-bold"
                                            style={{ color: isReference ? style.background : '#94a3b8' }}
                                        >
                                            {brand === 'Branca/Indefinida' ? 'Branca' : brand}
                                        </span>
                                    </div>
                                </th>
                            );
                        })}
                        <th scope="col" className={headerCellClass}>
                            {isAvgMode ? 'Média Mkt' : 'Mínima Mkt'}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {products.map((produto: FuelProduct) => {
                        const referencePrice = allBrandPrices[activeBrand as string]?.[produto as string] || 0;
                        const marketComparisonPrice = isAvgMode ? (averagePrices[produto as string] || 0) : (marketMinPrices[produto as string]?.minPrice || 0);
                        
                        // Diferença do Mercado em relação à Ativa
                        const marketDiff = (marketComparisonPrice > 0 && referencePrice > 0) 
                            ? marketComparisonPrice - referencePrice 
                            : null;

                        return (
                            <tr key={produto} className="hover:bg-slate-800/40 transition-colors">
                                {/* Coluna Produto */}
                                <td className={cellLeftClass} title={produto}>
                                    {produto}
                                </td>

                                {/* Colunas das Bandeiras */}
                                {orderedBrands.map((brand: BrandName) => {
                                    const brandPrice = allBrandPrices[brand as string]?.[produto as string] || 0;
                                    const isReference = brand === activeBrand;
                                    
                                    if (isReference) {
                                        const brandPriceInput = allBrandPriceInputs[brand as string]?.[produto as string] ?? '';
                                        const priceEntered = brandPriceInput && brandPrice > 0;
                                        
                                        return (
                                            <td key={brand} className={`${cellClass} text-center bg-slate-800/30 border-l border-r border-slate-700/30`}>
                                                {isSharePreview ? (
                                                    <span className={`font-bold font-sans text-sm text-slate-100`}>
                                                        {priceEntered ? formatPriceSmart(brandPrice) : '-'}
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center justify-center h-full w-full p-1">
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={brandPriceInput}
                                                            onChange={(e) => handleBrandPriceChange(brand, produto, e.target.value)}
                                                            placeholder="0,0000"
                                                            className="w-full text-center bg-transparent border border-transparent rounded focus:bg-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 outline-none font-bold text-slate-100 font-sans tabular-nums text-sm py-1.5 transition-all placeholder-slate-700"
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    } else {
                                        // Célula de Comparação (Outras Marcas vs Ativa)
                                        const difference = (brandPrice > 0 && referencePrice > 0) ? brandPrice - referencePrice : null;
                                        
                                        // Lógica de Cor do Preço
                                        let priceColorClass = 'text-slate-500';
                                        let diffBadge = null;

                                        if (brandPrice > 0) {
                                            if (referencePrice > 0 && difference !== null) {
                                                if (difference > 0.0001) priceColorClass = 'text-rose-400';
                                                else if (difference < -0.0001) priceColorClass = 'text-emerald-400';
                                                else priceColorClass = 'text-slate-100';

                                                if (Math.abs(difference) > 0.0001) {
                                                     diffBadge = (
                                                        <span className={`text-[9px] font-bold ${difference < 0 ? 'text-emerald-400 bg-emerald-950/20' : 'text-rose-400 bg-rose-950/20'} px-1 rounded tabular-nums`}>
                                                            {formatDiffCurrency(difference)}
                                                        </span>
                                                     );
                                                }
                                            } else {
                                                priceColorClass = 'text-slate-100';
                                            }
                                        }

                                        return (
                                            <td key={brand} className={`${cellClass} text-center`}>
                                                <div className="flex flex-col items-center justify-center gap-0.5">
                                                    <span className={`font-bold font-sans text-sm ${priceColorClass}`}>
                                                        {brandPrice > 0 ? formatPriceSmart(brandPrice) : '-'}
                                                    </span>
                                                    {diffBadge}
                                                </div>
                                            </td>
                                        );
                                    }
                                })}

                                {/* Coluna Mercado */}
                                <td className={`${cellClass} text-center bg-slate-900/50 border-l border-slate-800`}>
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                        <span className="text-slate-100 font-bold font-sans text-sm">
                                            {marketComparisonPrice > 0 ? formatPriceSmart(marketComparisonPrice) : '-'}
                                        </span>
                                        {marketDiff !== null && Math.abs(marketDiff) > 0.0001 && (
                                            <span className={`text-[9px] font-bold ${marketDiff < 0 ? 'text-emerald-400 bg-emerald-950/20' : 'text-rose-400 bg-rose-950/20'} px-1 rounded tabular-nums`}>
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

  return (
    <div ref={quoteTableRef} className="font-sans relative z-10 w-full">
      
      {/* Sempre mostra as abas se não for preview de compartilhamento */}
      {!isSharePreview && renderBrandTabs()}

      {/* Header do modo comparação */}
      {isComparisonMode && !isSharePreview && (
           <div className="px-3 py-2 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/50">
                        Modo Comparativo
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium hidden sm:inline-block">
                        Base: <span className="text-slate-300 font-bold">{activeBrand}</span>
                    </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="text-emerald-400">Verde: Mais barato</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-rose-400">Vermelho: Mais caro</span>
                </div>
           </div>
      )}

      <div>
        {isComparisonMode ? renderComparisonView() : renderSingleBrandView()}
      </div>
      
      {!isSharePreview && (
        <div className="p-2 bg-slate-900 border-t border-slate-800 flex justify-end items-center gap-3">
            <button onClick={onOpenShareModal} disabled={isSharing}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg border transition-all shadow-sm bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-slate-600 disabled:opacity-50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                Compartilhar
            </button>
            <button onClick={onSaveQuote} disabled={isSaving || isSaveSuccess}
                  className={`
                    flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-lg border transition-all shadow-sm
                    ${isSaveSuccess 
                        ? 'bg-emerald-600 text-white border-emerald-500' 
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                    }
                  `}
                >
                  {isSaving ? 'Salvando...' : isSaveSuccess ? 'Preços Salvos' : 'Salvar Alterações'}
            </button>
        </div>
      )}
    </div>
  );
};
export default CustomerQuoteTable;
