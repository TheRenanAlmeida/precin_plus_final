
import React, { useState, useCallback, useRef, useMemo } from 'react';
import Header from '../components/Header';
import ErrorScreen from '../components/ErrorScreen';
import { type UserProfile } from '../types';
import { formatDateForInput } from '../utils/dateUtils';
import { FUEL_PRODUCTS, FuelProduct } from '../constants/fuels';
import { useDashboardData } from '../hooks/useDashboardData';
import { computePurchaseGaugeMetrics, type DailyPoint } from '../utils/fuelGauge';
import { downloadElementAsJpeg, elementToJpegBlob } from '../utils/screenshot';

// Import Components
import CustomerQuoteTable from '../components/dashboard/CustomerQuoteTable';
import MarketDataTable from '../components/dashboard/MarketDataTable';
import ShareModal from '../components/dashboard/ShareModal';
import { ChartModal } from '../components/dashboard/charts';
import { PurchaseThermometerData } from '../components/dashboard/PurchaseThermometer';
import RankingPanel from '../components/dashboard/RankingPanel';

// Novos componentes refatorados
import DashboardFilters from '../components/dashboard/DashboardFilters';
import DashboardChartSection from '../components/dashboard/DashboardChartSection';
import { Tip } from '../components/common/Tip';
import { TOOLTIP } from '../constants/tooltips';
import PriceWatermarkedSection from '../components/PriceWatermarkedSection';

interface DashboardPageProps {
  goBack: () => void;
  userProfile: UserProfile;
  availableBases: string[];
  selectedBase: string;
  setSelectedBase: (base: string) => void;
}

const DashboardSkeleton: React.FC = () => (
    <div className="min-h-screen bg-slate-950 p-4">
        <div className="h-16 bg-slate-900 rounded-xl border border-slate-800 animate-pulse mb-6"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-slate-900 rounded-xl border border-slate-800 animate-pulse"></div>
            <div className="h-96 bg-slate-900 rounded-xl border border-slate-800 animate-pulse"></div>
        </div>
        <div className="mt-6 h-96 bg-slate-900 rounded-xl border border-slate-800 animate-pulse"></div>
    </div>
);

export default function DashboardPage({ goBack, userProfile, availableBases, selectedBase, setSelectedBase }: DashboardPageProps) {
  const quoteTableRef = useRef<HTMLDivElement>(null);
  const marketTableRef = useRef<HTMLDivElement>(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [highlightedDistributor, setHighlightedDistributor] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [isDistributorFilterOpen, setIsDistributorFilterOpen] = useState(false);
  const [selectedFuel, setSelectedFuel] = useState<string>(FUEL_PRODUCTS[0]);

  const {
    isLoading, error, marketData, products, distributors, distributorColors, distributorImages,
    allBrandPrices, allBrandPriceInputs, marketMinPrices, dynamicAveragePrices, selectedDistributors,
    isComparisonMode, isSaving, isSaveSuccess, dashboardSeriesConfig, refDate, userBandeiras,
    activeBrand, comparisonMode, filteredChartData, rawChartData, adjustmentNotification, noValidDayFound,
    handleBrandPriceChange, handleSaveQuote, setRefDate, setActiveBrand,
    setComparisonMode, setIsComparisonMode, toggleDashboardSeriesVisibility,
    handleSelectAllDistributors, handleClearAllDistributors, handleToggleDistributor,
  } = useDashboardData(userProfile, availableBases, selectedBase);

  const chartDataForFuel = filteredChartData[selectedFuel];
  
  const gaugeMetrics = useMemo(() => {
    if (!chartDataForFuel || !chartDataForFuel.datasets || !chartDataForFuel.labels) return null;
    const avgDataset = chartDataForFuel.datasets.find((d: any) => 
        d.label === 'Preço Médio (IQR)' || (d.seriesType === 'market' && d.label.includes('Médio'))
    );
    if (!avgDataset) return null;
    const refDateStr = formatDateForInput(refDate);
    const allPoints: DailyPoint[] = chartDataForFuel.labels.map((date: string, idx: number) => ({
        date, avg: avgDataset.data[idx] as number
    })).filter((p: DailyPoint) => p.avg !== null && Number.isFinite(p.avg) && p.date <= refDateStr);
    return computePurchaseGaugeMetrics(allPoints, 21);
  }, [chartDataForFuel, refDate]);

  const purchaseThermometerData = useMemo<PurchaseThermometerData | null>(() => {
    if (!gaugeMetrics || !rawChartData) return null;
    const fuelType = selectedFuel as FuelProduct;
    const todayDateStr = gaugeMetrics.todayDate;
    const goodDistributors = rawChartData
        .filter(r => r.fuel_type === fuelType && r.data === todayDateStr && r.price !== null && r.price < gaugeMetrics.medianPrice)
        .map(r => r.Distribuidora).filter((d): d is string => !!d);
    return { ...gaugeMetrics, fuelType, goodDistributors: Array.from(new Set(goodDistributors)).sort() };
  }, [gaugeMetrics, rawChartData, selectedFuel]);

  const [pendingDateString, setPendingDateString] = useState(formatDateForInput(refDate));
  
  React.useEffect(() => {
    setPendingDateString(formatDateForInput(refDate));
  }, [refDate]);

  const handleApplyDate = () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(pendingDateString)) {
      const newDate = new Date(pendingDateString + 'T12:00:00Z');
      if (!isNaN(newDate.getTime())) { setRefDate(newDate); return; }
    }
    setPendingDateString(formatDateForInput(refDate));
  };
  
  const executeShareAction = async (action: (element: HTMLElement) => Promise<any>, elementToCapture: HTMLElement | null) => {
    if (!elementToCapture) return;
    setIsSharing(true);
    try { await action(elementToCapture); } catch (error) { console.error(error); } finally { setIsSharing(false); }
  };

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorScreen error={error} />;

  return (
    <div className="font-sans antialiased bg-slate-950 text-slate-200 min-h-screen pb-10">
      <Header 
        userProfile={userProfile} 
        className="bg-slate-950 border-b border-slate-800"
        onLogoClick={goBack}
      >
          <span className="hidden md:inline-block text-xs font-mono text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">LIVE</span>
      </Header>
      
      <main className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-4">
        
        {adjustmentNotification && (
            <div className="bg-amber-950/30 border border-amber-900/50 text-amber-200 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in mb-4">
                <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm font-medium">
                    A data selecionada ({adjustmentNotification.original}) não possui fontes de mercado suficientes. 
                    Exibindo dados do último dia válido: <strong className="text-amber-400">{adjustmentNotification.adjusted}</strong>.
                </p>
            </div>
        )}

        {noValidDayFound && (
            <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 animate-fade-in shadow-xl">
                 <div className="bg-rose-500/10 p-4 rounded-full border border-rose-500/20">
                    <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-rose-400 uppercase tracking-wide">Nenhum dado encontrado</h2>
                    <p className="text-slate-400 max-w-md mt-2">
                        Não encontramos nenhum dia com dados suficientes (mínimo 3 fontes) nesta base até a data selecionada ({formatDateForInput(refDate)}).
                    </p>
                </div>
                <div className="flex gap-3 mt-2">
                    <button 
                        onClick={() => {
                            const d = new Date(refDate);
                            d.setDate(d.getDate() - 1);
                            setRefDate(d);
                        }}
                        className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold transition-all"
                    >
                        Voltar 1 dia
                    </button>
                    <button 
                        onClick={goBack}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all"
                    >
                        Voltar ao Menu
                    </button>
                </div>
            </div>
        )}

        <DashboardFilters 
            availableBases={availableBases}
            selectedBase={selectedBase}
            setSelectedBase={setSelectedBase}
            comparisonMode={comparisonMode}
            setComparisonMode={setComparisonMode}
            pendingDateString={pendingDateString}
            setPendingDateString={setPendingDateString}
            handleApplyDate={handleApplyDate}
            isDistributorFilterOpen={isDistributorFilterOpen}
            setIsDistributorFilterOpen={setIsDistributorFilterOpen}
            selectedDistributors={selectedDistributors}
            distributors={distributors}
            distributorColors={distributorColors}
            distributorImages={distributorImages}
            handleSelectAllDistributors={handleSelectAllDistributors}
            handleClearAllDistributors={handleClearAllDistributors}
            handleToggleDistributor={handleToggleDistributor}
            isComparisonMode={isComparisonMode}
            setIsComparisonMode={setIsComparisonMode}
            goBack={goBack}
        />

        {!noValidDayFound && (
          <>
            <PriceWatermarkedSection userProfile={userProfile} selectedBase={selectedBase}>
                <DashboardChartSection 
                    selectedFuel={selectedFuel}
                    setSelectedFuel={setSelectedFuel}
                    selectedBase={selectedBase}
                    products={products}
                    dashboardSeriesConfig={dashboardSeriesConfig}
                    toggleDashboardSeriesVisibility={toggleDashboardSeriesVisibility}
                    distributorImages={distributorImages}
                    filteredChartData={filteredChartData}
                    refDate={refDate}
                    handleChartExpand={(f) => setExpandedChart(f)}
                    purchaseThermometerData={purchaseThermometerData}
                />
            </PriceWatermarkedSection>

            <PriceWatermarkedSection userProfile={userProfile} selectedBase={selectedBase} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden flex flex-col h-auto">
                <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/50">
                    <div>
                        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                            <Tip text={TOOLTIP.HEADER_YOUR_QUOTES}>Suas Cotações da Data</Tip>
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded ml-1">{selectedBase}</span>
                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-400 bg-blue-950/30 border border-blue-900/50 rounded ml-1">{refDate.toLocaleDateString('pt-BR')}</span>
                        </h3>
                    </div>
                </div>
                <div className="p-0">
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
                        onDistributorPillClick={(d) => {
                            if (marketTableRef.current) {
                                marketTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                setHighlightedDistributor(d);
                                setTimeout(() => setHighlightedDistributor(null), 2500);
                            }
                        }}
                        isComparisonMode={isComparisonMode}
                        comparisonMode={comparisonMode}
                        activeBrand={activeBrand}
                        onActiveBrandChange={setActiveBrand}
                        onSaveQuote={handleSaveQuote}
                        isSaving={isSaving}
                        isSaveSuccess={isSaveSuccess}
                    />
                </div>
            </PriceWatermarkedSection>

            <PriceWatermarkedSection userProfile={userProfile} selectedBase={selectedBase} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden h-auto" ref={marketTableRef}>
                <MarketDataTable marketData={marketData} marketMinPrices={marketMinPrices} distributors={distributors} distributorColors={distributorColors} selectedDistributors={selectedDistributors} highlightedDistributor={highlightedDistributor} />
            </PriceWatermarkedSection>

            <PriceWatermarkedSection userProfile={userProfile} selectedBase={selectedBase}>
                <RankingPanel marketData={marketData} distributorColors={distributorColors} distributorImages={distributorImages} />
            </PriceWatermarkedSection>
          </>
        )}
      </main>

      <ShareModal
        isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} isSharing={isSharing}
        executeShareAction={executeShareAction} shareActions={{ 
          // FIX: downloadElementAsJpeg requires a second argument (fileName), so we wrap it in a function that provides one to match the expected signature.
          handleDownloadJPG: (el) => downloadElementAsJpeg(el, 'cotacao.jpg'), 
          handleWebShare: (el) => elementToJpegBlob(el).then(b => {
            const f = new File([b], 'cotacao.jpg', { type: 'image/jpeg' });
            if (navigator.canShare?.({ files: [f] })) return navigator.share({ files: [f] });
          }) 
        }}
        brands={userBandeiras} allBrandPrices={allBrandPrices} allBrandPriceInputs={allBrandPriceInputs} marketMinPrices={marketMinPrices} averagePrices={dynamicAveragePrices} comparisonMode={comparisonMode} distributorColors={distributorColors} distributorImages={distributorImages} products={products} allDistributors={distributors} selectedDistributors={selectedDistributors} activeBrand={activeBrand} isComparisonMode={isComparisonMode} userProfile={userProfile} selectedBase={selectedBase}
      />
      <ChartModal isOpen={expandedChart !== null} onClose={() => setExpandedChart(null)} title={expandedChart ? `Evolução: ${expandedChart}` : ''} chartData={expandedChart ? filteredChartData[expandedChart] : null} refDate={refDate} userProfile={userProfile} selectedBase={selectedBase} />
    </div>
  );
}
