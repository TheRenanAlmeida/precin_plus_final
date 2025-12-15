
import React from 'react';
import type { CustomerQuoteTableProps } from '../../types';
import { getOriginalBrandName } from '../../utils/styleManager';

// Sub-components
import QuoteTableSingleView from './quote-table/QuoteTableSingleView';
import QuoteTableComparisonView from './quote-table/QuoteTableComparisonView';

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

  const renderBrandTabs = () => (
    <div className="flex items-center gap-1 bg-slate-900 border-b border-slate-800 px-2 pt-2 overflow-x-auto scrollbar-hide">
      {brands.map((brand) => {
        const isActive = brand === activeBrand;
        const brandDisplayName = brand === 'Branca/Indefinida' ? 'Branca' : brand;
        const style = distributorColors[brand] || distributorColors.DEFAULT;
        const originalName = getOriginalBrandName(brand);
        const imageUrl = distributorImages[originalName];

        return (
          <button
            key={brand}
            onClick={() => onActiveBrandChange(brand)}
            style={isActive ? { color: style.background } : {}}
            className={`
              flex items-center gap-2 whitespace-nowrap px-4 py-2 font-bold text-xs border-t border-l border-r rounded-t-lg transition-all
              ${isActive 
                ? 'bg-slate-800 border-slate-700 border-b-slate-800 -mb-px z-10' 
                : 'bg-slate-900/30 text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
              }
            `}
          >
            {imageUrl && (
                <img src={imageUrl} alt={brand} className="w-4 h-4 object-contain" />
            )}
            {brandDisplayName}
          </button>
        );
      })}
    </div>
  );

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
        {isComparisonMode ? (
            <QuoteTableComparisonView 
                products={products}
                brands={brands}
                activeBrand={activeBrand}
                allBrandPrices={allBrandPrices}
                allBrandPriceInputs={allBrandPriceInputs}
                handleBrandPriceChange={handleBrandPriceChange}
                marketMinPrices={marketMinPrices}
                averagePrices={averagePrices}
                distributorColors={distributorColors}
                distributorImages={distributorImages}
                isSharePreview={isSharePreview}
                isAvgMode={isAvgMode}
            />
        ) : (
            <QuoteTableSingleView 
                products={products}
                activeBrand={activeBrand}
                allBrandPrices={allBrandPrices}
                allBrandPriceInputs={allBrandPriceInputs}
                handleBrandPriceChange={handleBrandPriceChange}
                marketMinPrices={marketMinPrices}
                averagePrices={averagePrices}
                selectedDistributors={selectedDistributors}
                distributorColors={distributorColors}
                onDistributorPillClick={onDistributorPillClick}
                isSharePreview={isSharePreview}
                isAvgMode={isAvgMode}
            />
        )}
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
