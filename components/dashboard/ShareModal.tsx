
import React, { useRef } from 'react';
import CustomerQuoteTable from './CustomerQuoteTable';
import SharePreviewTheme from './SharePreviewTheme';
import type { BrandName, ComparisonMode, DistributorColors, MinPriceInfo, UserProfile } from '../../types';
import type { FuelProduct } from '../../constants/fuels';
import { formatBrazilDateTime, BRAZIL_TZ_LABEL } from '../../utils/dateUtils';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    isSharing: boolean;
    executeShareAction: (action: (element: HTMLElement) => Promise<any>, elementToCapture: HTMLElement | null) => void;
    shareActions: {
      handleDownloadJPG: (element: HTMLElement) => Promise<void>;
      handleWebShare: (element: HTMLElement) => Promise<void>;
    }
    allBrandPrices: { [key in BrandName]?: { [product: string]: number } };
    allBrandPriceInputs: { [key in BrandName]?: { [product: string]: string } };
    marketMinPrices: { [product: string]: MinPriceInfo };
    averagePrices: { [product: string]: number };
    comparisonMode: ComparisonMode;
    distributorColors: DistributorColors;
    distributorImages: { [key: string]: string | null };
    products: FuelProduct[];
    allDistributors: string[];
    selectedDistributors: Set<string>;
    activeBrand: BrandName;
    isComparisonMode: boolean;
    brands: BrandName[];
    userProfile: UserProfile;
    selectedBase: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ 
    isOpen, onClose, isSharing, executeShareAction, shareActions,
    allBrandPrices, allBrandPriceInputs, marketMinPrices, averagePrices, 
    comparisonMode, distributorColors, distributorImages, products, 
    allDistributors, selectedDistributors, activeBrand, isComparisonMode, brands,
    userProfile, selectedBase
}) => {
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const { handleDownloadJPG, handleWebShare } = shareActions;
    
    const ShareHeader = () => {
        const formattedDateTime = formatBrazilDateTime(new Date());

        return (
            <div className="w-full mb-2 flex justify-between items-start border-b border-slate-700 pb-4">
                <img src="https://i.imgur.com/scv57na.png" alt="precin+" className="h-14 w-auto" />
                <div className="text-right">
                    <p className="font-semibold text-sm text-slate-300 tabular-nums capitalize">{formattedDateTime}</p>
                    <p className="text-xs text-slate-500">{BRAZIL_TZ_LABEL}</p>
                </div>
            </div>
        );
    };
    
    // Conteúdo interno extraído para evitar duplicação
    const renderContent = () => {
        const brandStyle = distributorColors[activeBrand] || distributorColors.DEFAULT;
        const activeBrandName = activeBrand === 'Branca/Indefinida' ? 'Bandeira Branca' : activeBrand;

        return (
            <>
                <ShareHeader />
                
                <div className="w-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                            Cotações do Dia:
                        </h3>
                        {activeBrand && (
                            <span 
                                className="text-sm font-extrabold uppercase tracking-wide"
                                style={{ color: brandStyle.border }} 
                            >
                                {activeBrandName}
                            </span>
                        )}
                    </div>
                    <span className="inline-flex items-center justify-center px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded-full">
                        <span className="inline-block translate-y-[-6px]">
                            {selectedBase}
                        </span>
                    </span>
                </div>

                <div className="w-full space-y-8">
                    <CustomerQuoteTable
                        brands={brands}
                        allBrandPrices={allBrandPrices}
                        allBrandPriceInputs={allBrandPriceInputs}
                        handleBrandPriceChange={() => {}}
                        onOpenShareModal={() => {}}
                        onSaveQuote={() => {}}
                        isSaving={false}
                        isSharing={false}
                        quoteTableRef={null}
                        isSharePreview={true}
                        marketMinPrices={marketMinPrices}
                        averagePrices={averagePrices}
                        distributorColors={distributorColors}
                        distributorImages={distributorImages}
                        products={products}
                        selectedDistributors={selectedDistributors}
                        isComparisonMode={isComparisonMode}
                        comparisonMode={comparisonMode}
                        isSaveSuccess={false}
                        activeBrand={activeBrand}
                        onActiveBrandChange={() => {}}
                    />
                </div>
            </>
        );
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-slate-800" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-100">Compartilhar Cotação</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                
                <div className="flex-grow p-6 bg-slate-950 overflow-auto custom-scrollbar">
                    {/* Container Off-screen para geração da imagem (html2canvas) */}
                    <div
                      className="absolute -left-[9999px] top-0 p-8 bg-slate-900"
                      ref={previewContainerRef}
                    >
                      <SharePreviewTheme>
                          {renderContent()}
                      </SharePreviewTheme>
                    </div>

                    {/* Container Visível para o usuário (Preview) */}
                    <div className="p-2 sm:p-4 flex justify-center">
                        <SharePreviewTheme>
                            {renderContent()}
                        </SharePreviewTheme>
                    </div>
                </div>

                <footer className="p-4 border-t border-slate-800 flex justify-end items-center gap-3 bg-slate-900">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-300 bg-transparent border border-slate-700 rounded-lg shadow-sm hover:bg-slate-800">Cancelar</button>
                    <button onClick={() => executeShareAction(handleDownloadJPG, previewContainerRef.current)} disabled={isSharing} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-blue-300">Baixar JPG</button>
                    {navigator.share && <button onClick={() => executeShareAction(handleWebShare, previewContainerRef.current)} disabled={isSharing} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 disabled:bg-green-300">Compartilhar</button>}
                </footer>
            </div>
        </div>
    );
};

export default ShareModal;
