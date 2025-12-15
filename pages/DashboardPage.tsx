
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

  // --- UI State ---
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [highlightedDistributor, setHighlightedDistributor] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  
  // State do Filtro de Distribuidoras (Dropdown)
  const [isDistributorFilterOpen, setIsDistributorFilterOpen] = useState(false);

  // Combustível selecionado
  const [selectedFuel, setSelectedFuel] = useState<string>(FUEL_PRODUCTS[0]);

  // --- Hook de Dados ---
  const {
    isLoading, error, marketData, products, distributors, distributorColors, distributorImages,
    allBrandPrices, allBrandPriceInputs, marketMinPrices, dynamicAveragePrices, selectedDistributors,
    isComparisonMode, isSaving, isSaveSuccess, dashboardSeriesConfig, refDate, userBandeiras,
    activeBrand, comparisonMode, filteredChartData,
    rawChartData,

    handleBrandPriceChange, handleSaveQuote, setRefDate, setActiveBrand,
    setComparisonMode, setIsComparisonMode, toggleDashboardSeriesVisibility,
    handleSelectAllDistributors, handleClearAllDistributors, handleToggleDistributor,
  } = useDashboardData(userProfile, availableBases, selectedBase);

  // --- Lógica Termômetro ---
  const chartDataForFuel = filteredChartData[selectedFuel];
  
  const gaugeMetrics = useMemo(() => {
    if (!chartDataForFuel || !chartDataForFuel.datasets || !chartDataForFuel.labels) return null;

    // Encontra o dataset de média de mercado
    const avgDataset = chartDataForFuel.datasets.find((d: any) => 
        d.label === 'Preço Médio (IQR)' || 
        (d.seriesType === 'market' && d.label.includes('Médio'))
    );

    if (!avgDataset) return null;

    // 1. Mapeia os dados do gráfico para pontos diários
    const allPoints: DailyPoint[] = chartDataForFuel.labels.map((date: string, idx: number) => ({
        date,
        avg: avgDataset.data[idx] as number
    })).filter((p: DailyPoint) => p.avg !== null && p.avg !== undefined && Number.isFinite(p.avg));

    // 2. Filtra estritamente os dados até a data selecionada (refDate).
    const refDateStr = formatDateForInput(refDate);
    const historicalPoints = allPoints.filter((p: DailyPoint) => p.date <= refDateStr);

    // 3. Calcula as métricas usando os últimos 21 dias DESSA lista filtrada
    return computePurchaseGaugeMetrics(historicalPoints, 21);
  }, [chartDataForFuel, refDate]);

  const purchaseThermometerData = useMemo<PurchaseThermometerData | null>(() => {
    if (!gaugeMetrics || !rawChartData) return null;

    const fuelType = selectedFuel as FuelProduct;
    const todayDateStr = gaugeMetrics.todayDate;
    const todayRecords = rawChartData.filter(r => 
        r.fuel_type === fuelType && 
        r.data === todayDateStr
    );

    const goodDistributors = todayRecords
        .filter(r => r.price !== null && r.price < gaugeMetrics.medianPrice)
        .map(r => r.Distribuidora)
        .filter((d): d is string => typeof d === 'string');

    const uniqueGoodDistributors = Array.from(new Set(goodDistributors)).sort();

    return {
      ...gaugeMetrics,
      fuelType,
      goodDistributors: uniqueGoodDistributors,
    };
  }, [gaugeMetrics, rawChartData, selectedFuel]);

  const [pendingDateString, setPendingDateString] = useState(formatDateForInput(refDate));
  
  // Handlers
  const handleChartExpand = (fuelType: string) => setExpandedChart(fuelType);
  const handleChartClose = () => setExpandedChart(null);
  const handleDistributorPillClick = useCallback((distributor: string) => {
    if (marketTableRef.current) {
        marketTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedDistributor(distributor);
        setTimeout(() => setHighlightedDistributor(null), 2500);
    }
  }, []);

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
  
  // Share & Download Logic using new utility
  const executeShareAction = async (action: (element: HTMLElement) => Promise<any>, elementToCapture: HTMLElement | null) => {
    if (!elementToCapture) return alert("Ocorreu um erro: elemento para captura não encontrado.");
    setIsSharing(true);
    try {
      await action(elementToCapture);
    } catch (error: any) {
      console.error("Share/Download Error:", error);
      if (error.name !== 'AbortError') alert("Ocorreu um erro ao tentar gerar a imagem.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadJPG = async (element: HTMLElement) => {
    const fileName = `cotacao-precin-plus-${new Date().toISOString().split('T')[0]}.jpg`;
    await downloadElementAsJpeg(element, fileName, {
        windowWidth: 1400, // Força layout desktop
        backgroundColor: '#0f172a' // Garante fundo escuro
    });
  };

  const handleWebShare = async (element: HTMLElement) => {
    try {
        const fileName = `cotacao-precin-plus-${new Date().toISOString().split('T')[0]}.jpg`;
        const blob = await elementToJpegBlob(element, {
            windowWidth: 1400,
            backgroundColor: '#0f172a'
        });

        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const shareData = {
            title: 'Cotação de Combustível - precin+',
            text: 'Confira a cotação de combustível gerada pelo sistema precin+.',
            files: [file],
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            alert("Seu navegador não suporta o compartilhamento direto de imagens. Tente baixar a imagem.");
        }
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error("Web Share Error:", error);
            alert('Ocorreu um erro ao tentar compartilhar.');
        }
    }
  };

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorScreen error={error} />;

  return (
    <div className="font-sans antialiased bg-slate-950 text-slate-200 min-h-screen pb-10">
      {/* Header Escuro */}
      <Header userProfile={userProfile} className="bg-slate-950 border-b border-slate-800">
          <span className="hidden md:inline-block text-xs font-mono text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">LIVE</span>
      </Header>
      
      <main className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-4">
        
        {/* New Modular Filter Bar */}
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

        {/* ROW 1: New Modular Chart Section */}
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
            handleChartExpand={handleChartExpand}
            purchaseThermometerData={purchaseThermometerData}
        />

        {/* ROW 2: Customer Quotes (Full Width) */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden flex flex-col h-auto">
            <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/50">
                <div>
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                        Suas Cotações do Dia
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded ml-1">
                            {selectedBase}
                        </span>
                    </h3>
                </div>
            </div>

            <div className="p-0">
                <div className="w-full overflow-hidden">
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
                </div>
            </div>
        </div>

        {/* ROW 3: Market Rankings Table Section (Full Width) */}
        <div ref={marketTableRef} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden h-auto">
             <div className="w-full">
                 <MarketDataTable 
                    marketData={marketData}
                    marketMinPrices={marketMinPrices}
                    distributors={distributors}
                    distributorColors={distributorColors}
                    selectedDistributors={selectedDistributors}
                    highlightedDistributor={highlightedDistributor}
                 />
             </div>
        </div>

        {/* ROW 4: Rankings Panel (5 Containers Side-by-Side) */}
        <div>
            <RankingPanel 
                marketData={marketData}
                distributorColors={distributorColors}
                distributorImages={distributorImages}
            />
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
        selectedBase={selectedBase}
      />
      <ChartModal
        isOpen={expandedChart !== null}
        onClose={handleChartClose}
        title={expandedChart ? `Evolução: ${expandedChart}` : ''}
        chartData={expandedChart ? filteredChartData[expandedChart] : null}
        refDate={refDate}
      />
    </div>
  );
}
