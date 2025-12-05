
import React, { useState, useCallback, useRef, useMemo } from 'react';
import Header from '../components/Header';
import ErrorScreen from '../components/ErrorScreen';
import { type UserProfile } from '../types';
import { formatDateForInput } from '../utils/dateUtils';
import { getOriginalBrandName } from '../utils/styleManager';
import { FuelProduct, FUEL_PRODUCTS } from '../constants/fuels';
import { useDashboardData } from '../hooks/useDashboardData';
import { computePurchaseGaugeMetrics, type DailyPoint } from '../utils/fuelGauge';
import { formatPriceSmart } from '../utils/dataHelpers';

// Import Components
import CustomerQuoteTable from '../components/dashboard/CustomerQuoteTable';
import MarketDataTable from '../components/dashboard/MarketDataTable';
import ShareModal from '../components/dashboard/ShareModal';
import { ChartCarousel, ChartHeader, ChartModal } from '../components/dashboard/charts';
import PurchaseThermometer, { PurchaseThermometerData } from '../components/dashboard/PurchaseThermometer';
import RankingPanel from '../components/dashboard/RankingPanel';

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
    const avgDataset = chartDataForFuel.datasets.find(d => 
        d.label === 'Preço Médio (IQR)' || 
        (d.seriesType === 'market' && d.label.includes('Médio'))
    );

    if (!avgDataset) return null;

    // 1. Mapeia os dados do gráfico para pontos diários
    const allPoints: DailyPoint[] = chartDataForFuel.labels.map((date, idx) => ({
        date,
        avg: avgDataset.data[idx] as number
    })).filter(p => p.avg !== null && p.avg !== undefined && Number.isFinite(p.avg));

    // 2. Filtra estritamente os dados até a data selecionada (refDate).
    const refDateStr = formatDateForInput(refDate);
    const historicalPoints = allPoints.filter(p => p.date <= refDateStr);

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
  
  // Share
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
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#0f172a' }); // Dark bg for share
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.download = `cotacao-precin-plus-${new Date().toISOString().split('T')[0]}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWebShare = async (element: HTMLElement) => {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#0f172a' });
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
            try { await navigator.share(shareData); } catch (error) { if ((error as Error).name !== 'AbortError') alert('Ocorreu um erro ao tentar compartilhar.'); }
        } else {
            alert("Seu navegador não suporta o compartilhamento de arquivos. Tente baixar a imagem em JPG.");
        }
    }, 'image/jpeg', 0.9);
  };

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorScreen error={error} />;

  const StatChip = ({ label, value, colorClass = "text-slate-100" }: { label: string, value: string, colorClass?: string }) => (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium whitespace-nowrap shadow-sm">
          <span className="text-slate-400 uppercase tracking-wider">{label}</span>
          <span className={`font-sans tabular-nums font-bold ${colorClass}`}>{value}</span>
      </div>
  );

  return (
    <div className="font-sans antialiased bg-slate-950 text-slate-200 min-h-screen pb-10">
      {/* Header Escuro */}
      <Header userProfile={userProfile} className="bg-slate-950 border-b border-slate-800">
          <span className="hidden md:inline-block text-xs font-mono text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">LIVE</span>
      </Header>
      
      <main className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-4 space-y-4">
        
        {/* Top Filter Bar */}
        <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between bg-slate-900/50 backdrop-blur-sm rounded-xl p-3 border border-slate-800 shadow-sm sticky top-0 z-30">
            <div className="flex flex-wrap items-center gap-3">
                {/* Base Selector */}
                <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
                    <span className="text-xs font-bold text-slate-400 uppercase">Base</span>
                    <select
                        value={selectedBase}
                        onChange={(e) => setSelectedBase(e.target.value)}
                        className="bg-transparent text-slate-100 text-sm font-semibold focus:outline-none cursor-pointer"
                    >
                        {availableBases.map(base => (
                            <option key={base} value={base} className="bg-slate-800 text-slate-100">{base}</option>
                        ))}
                    </select>
                </div>

                {/* Benchmark Toggle */}
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    <button
                        onClick={() => setComparisonMode('min')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${comparisonMode === 'min' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Mínima
                    </button>
                    <button
                        onClick={() => setComparisonMode('avg')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${comparisonMode === 'avg' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Média
                    </button>
                </div>

                {/* Date Picker */}
                <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
                    <span className="text-xs font-bold text-slate-400 uppercase">Data</span>
                    <input
                        type="date"
                        value={pendingDateString}
                        onChange={(e) => setPendingDateString(e.target.value)}
                        onBlur={handleApplyDate}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="bg-transparent text-slate-100 text-sm font-sans tabular-nums focus:outline-none cursor-pointer custom-date-picker-style"
                    />
                </div>

                {/* Distributor Filter (Dropdown) */}
                <div className="relative">
                    <button
                        onClick={() => setIsDistributorFilterOpen(!isDistributorFilterOpen)}
                        className={`
                            flex items-center gap-2 rounded-lg px-3 py-1.5 border text-xs font-bold uppercase transition-colors
                            ${isDistributorFilterOpen 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            }
                        `}
                    >
                        <span>Distribuidoras</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums font-sans ${selectedDistributors.size > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                            {selectedDistributors.size}/{distributors.length}
                        </span>
                        <svg className={`w-3 h-3 transition-transform ${isDistributorFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {isDistributorFilterOpen && (
                        <>
                            <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setIsDistributorFilterOpen(false)}
                            />
                            <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 flex flex-col max-h-[400px]">
                                <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 rounded-t-xl sticky top-0 backdrop-blur-sm">
                                    <button 
                                        onClick={handleSelectAllDistributors} 
                                        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider"
                                    >
                                        Selecionar Todas
                                    </button>
                                    <button 
                                        onClick={handleClearAllDistributors} 
                                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-wider"
                                    >
                                        Limpar
                                    </button>
                                </div>
                                <div className="overflow-y-auto p-2 space-y-1">
                                    {distributors.map(dist => {
                                        const isSelected = selectedDistributors.has(dist);
                                        const colorStyle = distributorColors[dist] || distributorColors.DEFAULT;
                                        const imageUrl = distributorImages[getOriginalBrandName(dist)];

                                        return (
                                            <button
                                                key={dist}
                                                onClick={() => handleToggleDistributor(dist)}
                                                className={`
                                                    w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-left
                                                    ${isSelected ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:bg-slate-800/50'}
                                                `}
                                            >
                                                <div 
                                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 bg-transparent'}`}
                                                >
                                                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                
                                                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                                                    {imageUrl ? (
                                                        <img src={imageUrl} alt={dist} className="w-4 h-4 object-contain" />
                                                    ) : (
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colorStyle.background }} />
                                                    )}
                                                </div>
                                                
                                                <span className="truncate flex-1">{dist}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 justify-end">
                 {/* Brand Comparison Toggle */}
                 <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-9 h-5 rounded-full p-1 transition-colors ${isComparisonMode ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${isComparisonMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <input type="checkbox" className="hidden" checked={isComparisonMode} onChange={() => setIsComparisonMode(!isComparisonMode)} />
                    <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">Comparar Bandeiras</span>
                </label>

                <div className="h-6 w-px bg-slate-700 mx-1"></div>

                <button onClick={goBack} className="text-xs font-bold text-slate-400 hover:text-slate-100 uppercase tracking-wide transition-colors">
                    Menu
                </button>
            </div>
        </div>

        {/* 
            ROW 1: CHART & THERMOMETER 
        */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            
            {/* Chart Column (Main) */}
            <div className="lg:col-span-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg flex flex-col h-[480px] overflow-hidden">
                <div className="h-full flex flex-col p-4 sm:p-5">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                                Mercado de {selectedFuel}
                                <span className="text-[10px] font-normal text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">{selectedBase}</span>
                            </h2>
                        </div>
                        
                        {/* Fuel Tabs inside Chart Card */}
                        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide max-w-[200px] sm:max-w-none">
                            {products.map(fuel => (
                                <button
                                    key={fuel}
                                    onClick={() => setSelectedFuel(fuel)}
                                    className={`
                                        px-2 py-1 text-[10px] font-semibold rounded-md border transition-all whitespace-nowrap
                                        ${selectedFuel === fuel 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50' 
                                            : 'bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700'
                                        }
                                    `}
                                >
                                    {fuel === 'Gasolina Comum' ? 'GC' : fuel === 'Gasolina Aditivada' ? 'GA' : fuel === 'Etanol' ? 'Et' : fuel === 'Diesel S10' ? 'S10' : 'S500'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ===== CHART FILTER PANEL ===== */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2 border-t border-slate-800 pt-3">
                      {/* Market Filters */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Mercado:</span>
                        {dashboardSeriesConfig.filter(s => s.type === 'market').map(series => (
                            <button
                                key={series.key}
                                onClick={() => toggleDashboardSeriesVisibility(series.key)}
                                className={`flex items-center gap-2 px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                                    series.isVisible
                                    ? 'bg-slate-800 border-slate-700 text-slate-100'
                                    : 'bg-transparent border-slate-800 text-slate-500 opacity-60 hover:opacity-100'
                                }`}
                            >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: series.isVisible ? series.color : '#64748b' }}></div>
                                <span>{series.name.replace('Preço ', '').replace(' (IQR)','')}</span>
                            </button>
                        ))}
                      </div>
                      
                      {dashboardSeriesConfig.some(s => s.type === 'distributor') && (
                        <>
                          <div className="h-4 w-px bg-slate-700"></div>
                          <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Suas Bandeiras:</span>
                              {dashboardSeriesConfig.filter(s => s.type === 'distributor').map(series => (
                                <button
                                    key={series.key}
                                    onClick={() => toggleDashboardSeriesVisibility(series.key)}
                                    className={`flex items-center gap-2 px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                                        series.isVisible
                                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                                        : 'bg-transparent border-slate-800 text-slate-500 opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: series.isVisible ? series.color : '#64748b' }}></div>
                                    <span>{series.name}</span>
                                </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex-grow relative min-h-0">
                         {/* FIX: Removed 'onSeriesToggle' prop as it's not defined in the ChartCarousel component. */}
                         <ChartCarousel
                            products={products}
                            chartData={filteredChartData}
                            refDate={refDate}
                            onChartExpand={handleChartExpand}
                            selectedFuel={selectedFuel}
                            onSelectedFuelChange={setSelectedFuel}
                        />
                    </div>

                    {/* Metric Chips Row */}
                    <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                        {purchaseThermometerData && (
                            <>
                                <StatChip 
                                    label={`Mediana ${purchaseThermometerData.windowDays}d`} 
                                    value={`R$ ${formatPriceSmart(purchaseThermometerData.medianPrice)}`} 
                                />
                                <StatChip 
                                    label="Média IQR Hoje" 
                                    value={`R$ ${formatPriceSmart(purchaseThermometerData.todayPrice)}`} 
                                    colorClass="text-blue-400"
                                />
                                <StatChip 
                                    label="Diferença R$" 
                                    value={`${(purchaseThermometerData.todayPrice - purchaseThermometerData.medianPrice) > 0 ? '+' : ''}${formatPriceSmart(purchaseThermometerData.todayPrice - purchaseThermometerData.medianPrice)}`}
                                    colorClass={(purchaseThermometerData.todayPrice - purchaseThermometerData.medianPrice) > 0 ? 'text-rose-400' : 'text-emerald-400'}
                                />
                                <StatChip 
                                    label="Diferença %" 
                                    value={`${purchaseThermometerData.diffPct > 0 ? '+' : ''}${(purchaseThermometerData.diffPct * 100).toFixed(2)}%`}
                                    colorClass={purchaseThermometerData.diffPct > 0 ? 'text-rose-400' : 'text-emerald-400'}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Thermometer Column - 1 of 4 columns */}
            <div className="lg:col-span-1 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden h-[480px]">
                 <div className="h-full p-4">
                     <PurchaseThermometer 
                        data={purchaseThermometerData} 
                        selectedFuel={selectedFuel}
                        onFuelChange={setSelectedFuel}
                        availableFuels={products}
                    />
                </div>
            </div>
        </div>

        {/* ROW 2: Customer Quotes (Full Width) */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden flex flex-col h-auto">
            <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/50">
                <div>
                    <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Suas Cotações do Dia</h3>
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
