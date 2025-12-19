
import React from 'react';
import { ChartCarousel } from './charts';
import PurchaseThermometer, { PurchaseThermometerData } from './PurchaseThermometer';
import { formatPriceSmart } from '../../utils/dataHelpers';
import { getOriginalBrandName } from '../../utils/styleManager';
import type { FuelProduct } from '../../constants/fuels';
import type { ChartSeries } from '../../types';
import { Tip } from '../common/Tip';
import { TOOLTIP } from '../../constants/tooltips';
import FilterButton from '../common/FilterButton';

interface DashboardChartSectionProps {
    selectedFuel: string;
    setSelectedFuel: (fuel: string) => void;
    selectedBase: string;
    products: FuelProduct[];
    dashboardSeriesConfig: ChartSeries[];
    toggleDashboardSeriesVisibility: (key: string) => void;
    distributorImages: { [key: string]: string | null };
    filteredChartData: any;
    refDate: Date;
    handleChartExpand: (fuelType: string) => void;
    purchaseThermometerData: PurchaseThermometerData | null;
}

const StatChip = ({ label, value, colorClass = "text-slate-100" }: { label: string, value: string, colorClass?: string }) => (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium whitespace-nowrap shadow-sm">
        <span className="text-slate-400 uppercase tracking-wider">{label}</span>
        <span className={`font-sans tabular-nums font-bold ${colorClass}`}>{value}</span>
    </div>
);

const DashboardChartSection: React.FC<DashboardChartSectionProps> = ({
    selectedFuel,
    setSelectedFuel,
    selectedBase,
    products,
    dashboardSeriesConfig,
    toggleDashboardSeriesVisibility,
    distributorImages,
    filteredChartData,
    refDate,
    handleChartExpand,
    purchaseThermometerData
}) => {
    const fuelTooltips: Record<string, string> = {
        'Gasolina Comum': 'Ver gráfico de Gasolina Comum',
        'Gasolina Aditivada': 'Ver gráfico de Gasolina Aditivada',
        'Etanol': 'Ver gráfico de Etanol',
        'Diesel S10': 'Ver gráfico de Diesel S10',
        'Diesel S500': 'Ver gráfico de Diesel S500',
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Chart Column (Main) */}
            <div className="lg:col-span-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg flex flex-col h-[480px] overflow-hidden">
                <div className="h-full flex flex-col p-4 sm:p-5">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                                <Tip text={TOOLTIP.HEADER_MARKET_CHART}>
                                    Mercado de {selectedFuel}
                                </Tip>
                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded">
                                    {selectedBase}
                                </span>
                            </h2>
                        </div>
                        
                        {/* Fuel Tabs inside Chart Card */}
                        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide max-w-[200px] sm:max-w-none">
                            {products.map(fuel => (
                                <FilterButton
                                    key={fuel}
                                    onClick={() => setSelectedFuel(fuel)}
                                    active={selectedFuel === fuel}
                                    size="sm"
                                    tooltip={fuelTooltips[fuel]}
                                    label={fuel === 'Gasolina Comum' ? 'GC' : fuel === 'Gasolina Aditivada' ? 'GA' : fuel === 'Etanol' ? 'Et' : fuel === 'Diesel S10' ? 'S10' : 'S500'}
                                />
                            ))}
                        </div>
                    </div>

                    {/* ===== CHART FILTER PANEL ===== */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2 border-t border-slate-800 pt-3">
                      {/* Market Filters */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Mercado:</span>
                        {dashboardSeriesConfig.filter(s => s.type === 'market').map(series => {
                            const tooltipText = series.key === 'Preço Mínimo' ? TOOLTIP.MARKET_MIN : 
                                               series.key === 'Preço Máximo' ? TOOLTIP.MARKET_MAX : 
                                               TOOLTIP.MARKET_AVG;
                            return (
                                <FilterButton
                                    key={series.key}
                                    onClick={() => toggleDashboardSeriesVisibility(series.key)}
                                    active={series.isVisible}
                                    size="sm"
                                    tooltip={tooltipText}
                                    label={
                                        <>
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: series.isVisible ? series.color : '#64748b' }}></div>
                                            <span>{series.name.replace('Preço ', '').replace(' (IQR)','')}</span>
                                        </>
                                    }
                                />
                            );
                        })}
                      </div>
                      
                      {dashboardSeriesConfig.some(s => s.type === 'distributor') && (
                        <>
                          <div className="h-4 w-px bg-slate-700"></div>
                          <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Suas Bandeiras:</span>
                              {dashboardSeriesConfig.filter(s => s.type === 'distributor').map(series => {
                                const originalName = getOriginalBrandName(series.name);
                                const imageUrl = distributorImages[originalName];
                                
                                return (
                                <FilterButton
                                    key={series.key}
                                    onClick={() => toggleDashboardSeriesVisibility(series.key)}
                                    active={series.isVisible}
                                    size="sm"
                                    tooltip={`Exibir/Ocultar sua cotação para ${series.name} no histórico.`}
                                    label={
                                        <>
                                            {imageUrl ? (
                                                <img src={imageUrl} alt={series.name} className="w-4 h-4 object-contain" />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: series.isVisible ? series.color : '#64748b' }}></div>
                                            )}
                                            <span style={{ color: series.isVisible ? series.color : 'inherit' }}>{series.name}</span>
                                        </>
                                    }
                                />
                            )})}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex-grow relative min-h-0">
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
    );
};

export default React.memo(DashboardChartSection);
