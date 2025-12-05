import React, { useState, useCallback, useRef, useMemo } from 'react';
import Header from '../components/Header';
import ErrorScreen from '../components/ErrorScreen';
import RealTimeClock from '../components/RealTimeClock';
import { type UserProfile } from '../types';
import { formatDateForInput } from '../utils/dateUtils';
import { getOriginalBrandName } from '../utils/styleManager';
import { FuelProduct } from '../constants/fuels';
import { useDashboardData } from '../hooks/useDashboardData';

// Import Components
import CustomerQuoteTable from '../components/dashboard/CustomerQuoteTable';
import MarketDataTable from '../components/dashboard/MarketDataTable';
import ShareModal from '../components/dashboard/ShareModal';
import RankingSidebar from '../components/dashboard/RankingSidebar';
import RankingDrawer from '../components/dashboard/RankingDrawer';
import { ChartCarousel, ChartHeader, ChartModal } from '../components/dashboard/charts';
import FilterBar, { FilterSection } from '../components/FilterBar';
import TableSkeletonLoader from '../components/skeletons/TableSkeletonLoader';
import WatermarkContainer from '../components/WatermarkContainer';

// FIX: Imported BaseSelector component to resolve "Cannot find name" error.


interface DashboardPageProps {
  goBack: () => void;
  userProfile: UserProfile;
  availableBases: string[];
  selectedBase: string;
  setSelectedBase: (base: string) => void;
}

const DashboardSkeleton: React.FC = () => (
    <div className="font-sans antialiased text-gray-900">
        <Header />
        <main className="p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-4">
                <div className="flex justify-between items-start border-b border-gray-300 pb-4">
                    <div>
                        <div className="h-10 bg-slate-200 rounded w-3/4 mb-2 animate-pulse"></div>
                        <div className="h-6 bg-slate-200 rounded w-1/2 animate-pulse"></div>
                    </div>
                    <div className="h-10 bg-slate-200 rounded w-32 animate-pulse"></div>
                </div>
                
                <div className="h-24 bg-white rounded-xl shadow-lg border border-gray-200 animate-pulse"></div>
                <div className="h-16 bg-white rounded-xl shadow-lg border border-gray-200 animate-pulse"></div>
                

                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                    <TableSkeletonLoader rows={5} cols={6} />
                </div>
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                    <TableSkeletonLoader rows={5} cols={8} />
                </div>
                <div className="h-96 bg-white rounded-xl shadow-lg border border-gray-200 animate-pulse"></div>
            </div>
        </main>
    </div>
);


export default function DashboardPage({ goBack, userProfile, availableBases, selectedBase, setSelectedBase }: DashboardPageProps) {
  const quoteTableRef = useRef<HTMLDivElement>(null);
  const marketTableRef = useRef<HTMLDivElement>(null);

  // --- UI State (Modals, drawers, etc.) ---
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [rankingProduct, setRankingProduct] = useState<string | null>(null);
  const [highlightedDistributor, setHighlightedDistributor] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  
  // --- Data Logic now in Custom Hook ---
  const {
    isLoading, error, marketData, products, distributors, distributorColors, distributorImages,
    allBrandPrices, allBrandPriceInputs, marketMinPrices, dynamicAveragePrices, selectedDistributors,
    isComparisonMode, isSaving, isSaveSuccess, dashboardSeriesConfig, refDate, userBandeiras,
    activeBrand, comparisonMode, filteredChartData,

    handleBrandPriceChange, handleSaveQuote, setRefDate, setActiveBrand,
    setComparisonMode, setIsComparisonMode, toggleDashboardSeriesVisibility,
    handleSelectAllDistributors, handleClearAllDistributors, handleToggleDistributor,
  } = useDashboardData(userProfile, availableBases, selectedBase);

  // State for date picker input, as it can be typed freely before applying.
  const [pendingDateString, setPendingDateString] = useState(formatDateForInput(refDate));
  
  
  // Handlers for UI state
  const handleRankingProductSelect = (product: string) => setRankingProduct(p => (p === product ? null : product));
  const handleChartExpand = (fuelType: string) => setExpandedChart(fuelType);
  const handleChartClose = () => setExpandedChart(null);
  const handleDistributorPillClick = useCallback((distributor: string) => {
    if (marketTableRef.current) {
        marketTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedDistributor(distributor);
        setTimeout(() => setHighlightedDistributor(null), 2500);
    }
  }, []);

  // Handler to apply date from date picker
  const handleApplyDate = () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(pendingDateString)) {
      const newDate = new Date(pendingDateString + 'T12:00:00Z');
      if (!isNaN(newDate.getTime())) {
          setRefDate(newDate);
          return;
      }
    }
    setPendingDateString(formatDateForInput(refDate));
  };
  
  const handleToggleFilter = (key: string) => {
      if (availableBases.includes(key)) {
        setSelectedBase(key);
        return;
      }
      if (key.startsWith('dist_')) {
          handleToggleDistributor(key.substring(5));
          return;
      }
      if (key === 'mode_min') setComparisonMode('min');
      if (key === 'mode_avg') setComparisonMode('avg');
      if (key === 'compare_brands') setIsComparisonMode(p => !p);
  };
  
  // Share Logic
  const executeShareAction = async (action: (element: HTMLElement) => Promise<any>, elementToCapture: HTMLElement | null) => {
    if (!elementToCapture) return alert("Ocorreu um erro: elemento para captura não encontrado.");
    setIsSharing(true);
    try {
      await action(elementToCapture);
    } catch (error: any) {
      console.error("Share/Download Error:", error);
      if (error.name !== 'AbortError') alert("Ocorreu um erro ao tentar compartilhar.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadJPG = async (element: HTMLElement) => {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/jpeg', 0.9); // Use JPEG with quality setting
    link.download = `cotacao-precin-plus-${new Date().toISOString().split('T')[0]}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWebShare = async (element: HTMLElement) => {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    });

    canvas.toBlob(async (blob) => {
        if (!blob) {
            alert("Não foi possível gerar a imagem para compartilhamento.");
            return;
        }

        const fileName = `cotacao-precin-plus-${new Date().toISOString().split('T')[0]}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const shareData = {
            title: 'Cotação de Combustível - precin+',
            text: 'Confira a cotação de combustível gerada pelo sistema precin+.',
            files: [file],
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                console.error('Erro ao compartilhar:', error);
                // The user might have cancelled the share, so we don't always show an error.
                if ((error as Error).name !== 'AbortError') {
                    alert('Ocorreu um erro ao tentar compartilhar.');
                }
            }
        } else {
            alert("Seu navegador não suporta o compartilhamento de arquivos. Tente baixar a imagem em JPG.");
        }
    }, 'image/jpeg', 0.9);
  };

  // FIX: Imported and used useMemo to prevent re-computation on every render, resolving "Cannot find name" error.
  const filterSections = useMemo((): FilterSection[] => [
    {
        label: "Base:",
        displayMode: 'dropdown',
        options: availableBases.map(base => ({
            key: base,
            name: base,
            isVisible: base === selectedBase
        }))
    },
    {
        label: "Análise:",
        displayMode: 'toggle',
        options: [
            { key: 'mode_min', name: 'Mínima', isVisible: comparisonMode === 'min' },
            { key: 'mode_avg', name: 'Média', isVisible: comparisonMode === 'avg' },
        ]
    },
    {
        label: "Modo:",
        displayMode: 'pills',
        options: [
            { key: 'compare_brands', name: 'Comparar Bandeiras', color: '#16a34a', isVisible: isComparisonMode },
        ]
    }
  ], [comparisonMode, isComparisonMode, availableBases, selectedBase]);
  
  // FIX: Imported and used useMemo to prevent re-computation on every render, resolving "Cannot find name" error.
  const distributorFilterOptions = useMemo(() => ({
      options: distributors.map(dist => {
          const style = distributorColors[dist] || distributorColors.DEFAULT;
          const originalName = getOriginalBrandName(dist);
          return {
              key: `dist_${dist}`,
              name: dist,
              color: style.background,
              textColor: style.border,
              shadowColor: style.shadowColor,
              imageUrl: distributorImages[originalName],
              isVisible: selectedDistributors.has(dist)
          };
      }),
      count: selectedDistributors.size
  }), [distributors, distributorColors, distributorImages, selectedDistributors]);
  
  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorScreen error={error} />;

  return (
    <div className="font-sans antialiased text-gray-900">
      <Header userProfile={userProfile} />
      <RankingSidebar products={products} onProductSelect={handleRankingProductSelect} activeProduct={rankingProduct} />
      <main className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex justify-between items-start border-b border-gray-300 pb-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                      Dashboard de Cotações
                    </h1>
                    <p className="mt-2 max-w-2xl text-lg text-gray-600">
                      Amplie sua vantagem nas negociações. Compare sua cotação com o mercado.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-4 ml-4 flex-shrink-0">
                    <button 
                        onClick={goBack} 
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 focus:ring-green-700 whitespace-nowrap"
                    >
                        Voltar ao Menu
                    </button>
                    <RealTimeClock />
                </div>
            </div>
            
            <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center gap-2">
                    <label htmlFor="quote-date-picker" className="text-sm font-semibold text-gray-700">Data da Cotação:</label>
                    <div className="relative">
                        <input
                            type="date"
                            id="quote-date-picker"
                            value={pendingDateString}
                            onChange={(e) => setPendingDateString(e.target.value)}
                            onBlur={handleApplyDate}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="appearance-none bg-white border border-gray-300 text-gray-600 font-semibold text-sm rounded-full py-1.5 px-4 focus:outline-none focus:border-green-500 transition-colors hover:bg-gray-50 shadow-sm custom-date-picker-style"
                            aria-label="Selecionar data da cotação"
                        />
                    </div>
                </div>
            </div>

            <FilterBar 
              filterSections={filterSections}
              distributorFilters={distributorFilterOptions}
              onToggleFilter={handleToggleFilter}
              onSelectAllDistributors={handleSelectAllDistributors}
              onClearAllDistributors={handleClearAllDistributors}
            />
            
            {marketData.length === 0 && !isLoading ? (
                <div className="text-center p-8 bg-yellow-50 border-2 border-yellow-200 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold text-yellow-900">Nenhum dado encontrado</h3>
                    <p className="text-yellow-800 mt-2">
                        Não encontramos dados de mercado para a data e base selecionadas.
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                        Por favor, selecione outra data ou verifique se há cotações disponíveis para esta base.
                    </p>
                </div>
            ) : (
                <>
                    <WatermarkContainer
                        company={userProfile.nome}
                        cnpj={userProfile.cnpj ? `CNPJ: ${userProfile.cnpj}` : ''}
                        email={userProfile.email}
                        className="bg-white rounded-xl shadow-lg border border-gray-200"
                        offsetTop={180}
                    >
                        <CustomerQuoteTable
                            brands={userBandeiras}
                            allBrandPrices={allBrandPrices} 
                            allBrandPriceInputs={allBrandPriceInputs}
                            handleBrandPriceChange={handleBrandPriceChange}
                            marketMinPrices={marketMinPrices}
                            averagePrices={dynamicAveragePrices}
                            onOpenShareModal={() => setIsShareModalOpen(true)}
                            isSharing={isSharing}
                            quoteTableRef={quoteTableRef}
                            distributorColors={distributorColors}
                            distributorImages={distributorImages}
                            products={products}
                            selectedDistributors={selectedDistributors}
                            onDistributorPillClick={handleDistributorPillClick}
                            isComparisonMode={isComparisonMode}
                            comparisonMode={comparisonMode}
                            activeBrand={activeBrand}
                            onActiveBrandChange={setActiveBrand}
                            onSaveQuote={handleSaveQuote}
                            isSaving={isSaving}
                            isSaveSuccess={isSaveSuccess}
                        />
                    </WatermarkContainer>
                    
                    <div ref={marketTableRef} className="scroll-mt-20">
                        <WatermarkContainer
                            company={userProfile.nome}
                            cnpj={userProfile.cnpj ? `CNPJ: ${userProfile.cnpj}` : ''}
                            email={userProfile.email}
                            className="bg-white rounded-xl shadow-lg border border-gray-200"
                            offsetTop={125}
                        >
                            <MarketDataTable 
                                marketData={marketData}
                                marketMinPrices={marketMinPrices} 
                                distributors={distributors}
                                distributorColors={distributorColors}
                                selectedDistributors={selectedDistributors}
                                highlightedDistributor={highlightedDistributor}
                            />
                        </WatermarkContainer>
                    </div>

                    <div className="space-y-8 pb-8">
                        <ChartHeader selectedBase={selectedBase} refDate={refDate} />
                        <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Séries Visíveis nos Gráficos:</h3>
                            <div className="flex flex-wrap items-center gap-2">
                                {dashboardSeriesConfig.map(series => (
                                    <button
                                        key={series.key}
                                        onClick={() => toggleDashboardSeriesVisibility(series.key)}
                                        className={`
                                            px-4 py-1.5 rounded-full text-sm font-semibold transition-all border shadow-sm
                                            whitespace-nowrap
                                            ${series.isVisible
                                                ? 'bg-green-50 text-green-700 border-green-400'
                                                : 'bg-white text-gray-600 hover:text-green-700 border-gray-300'
                                            }
                                        `}
                                    >
                                        {series.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <ChartCarousel
                            products={Object.keys(filteredChartData)}
                            chartData={filteredChartData}
                            refDate={refDate}
                            onChartExpand={handleChartExpand}
                        />
                    </div>
                </>
            )}
        </div>
      </main>
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        isSharing={isSharing}
        executeShareAction={executeShareAction}
        shareActions={{ handleDownloadJPG, handleWebShare }}
        brands={userBandeiras}
        allBrandPrices={allBrandPrices}
        allBrandPriceInputs={allBrandPriceInputs}
        marketMinPrices={marketMinPrices}
        averagePrices={dynamicAveragePrices}
        comparisonMode={comparisonMode}
        distributorColors={distributorColors}
        distributorImages={distributorImages}
        products={products}
        allDistributors={distributors}
        selectedDistributors={selectedDistributors}
        activeBrand={activeBrand}
        isComparisonMode={isComparisonMode}
        userProfile={userProfile}
      />
      <RankingDrawer
        isOpen={rankingProduct !== null}
        onClose={() => setRankingProduct(null)}
        product={rankingProduct}
        marketData={marketData}
        distributorColors={distributorColors}
        distributorImages={distributorImages}
      />
      <ChartModal
        isOpen={expandedChart !== null}
        onClose={handleChartClose}
        title={expandedChart ? `Evolução de Preços: ${expandedChart}` : ''}
        chartData={expandedChart ? filteredChartData[expandedChart] : null}
        refDate={refDate}
      />
    </div>
  );
}
