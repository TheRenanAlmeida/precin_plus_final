import React, { useRef } from 'react';
import CustomerQuoteTable from './CustomerQuoteTable';
import type { BrandName, ComparisonMode, DistributorColors, MinPriceInfo, UserProfile } from '../../types';
// FIX: Imported FuelProduct type to resolve type mismatch for the 'products' prop.
import type { FuelProduct } from '../../constants/fuels';
import WatermarkContainer from '../WatermarkContainer';

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
    // FIX: Changed type from string[] to FuelProduct[] to match the expected type in CustomerQuoteTable.
    products: FuelProduct[];
    allDistributors: string[];
    selectedDistributors: Set<string>;
    activeBrand: BrandName;
    isComparisonMode: boolean;
    brands: BrandName[];
    userProfile: UserProfile;
}

const ShareModal: React.FC<ShareModalProps> = ({ 
    isOpen, onClose, isSharing, executeShareAction, shareActions,
    allBrandPrices, allBrandPriceInputs, marketMinPrices, averagePrices, 
    comparisonMode, distributorColors, distributorImages, products, 
    allDistributors, selectedDistributors, activeBrand, isComparisonMode, brands,
    userProfile
}) => {
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const { handleDownloadJPG, handleWebShare } = shareActions;
    
    const ShareHeader = () => {
        const formattedDateTime = new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZone: 'America/Sao_Paulo',
        }).format(new Date());

        return (
            <div className="mb-6 flex justify-between items-start border-b border-gray-200 pb-4">
                <img src="https://i.imgur.com/rtUhjXo.png" alt="precin+" className="h-14 w-auto" />
                <div className="text-right">
                    <p className="font-semibold text-sm text-gray-700">{formattedDateTime}</p>
                    <p className="text-xs text-gray-500">Horário de Brasília</p>
                </div>
            </div>
        );
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Compartilhar Cotação</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                
                <div className="flex-grow p-6 bg-gray-100 overflow-auto">
                    {/* Off-screen container for clean rendering */}
                    <div
                      className="fixed -left-[9999px] top-0 p-8 bg-slate-100"
                      ref={previewContainerRef}
                    >
                      <div className="mx-auto bg-white rounded-2xl shadow-2xl p-8 w-[1200px]">
                        <ShareHeader />
                        <div className="space-y-8">
                          <WatermarkContainer
                              company={userProfile.nome}
                              cnpj={userProfile.cnpj ? `CNPJ: ${userProfile.cnpj}` : ''}
                              email={userProfile.email}
                              offsetTop={110}
                          >
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
                          </WatermarkContainer>
                        </div>
                      </div>
                    </div>
                    {/* Visible container for user preview */}
                    <div className="p-8 bg-slate-100">
                      <div className="mx-auto bg-white rounded-2xl shadow-2xl p-8 max-w-[1200px]">
                        <ShareHeader />
                        <div className="space-y-8">
                            <WatermarkContainer
                                company={userProfile.nome}
                                cnpj={userProfile.cnpj ? `CNPJ: ${userProfile.cnpj}` : ''}
                                email={userProfile.email}
                                offsetTop={110}
                            >
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
                            </WatermarkContainer>
                        </div>
                      </div>
                    </div>
                </div>

                <footer className="p-4 border-t border-gray-200 flex justify-end items-center gap-3 bg-gray-50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Cancelar</button>
                    <button onClick={() => executeShareAction(handleDownloadJPG, previewContainerRef.current)} disabled={isSharing} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-blue-300">Baixar JPG</button>
                    {navigator.share && <button onClick={() => executeShareAction(handleWebShare, previewContainerRef.current)} disabled={isSharing} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 disabled:bg-green-300">Compartilhar</button>}
                </footer>
            </div>
        </div>
    );
};

export default ShareModal;