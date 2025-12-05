
import React from 'react';
import { formatPrice } from '../../utils/dataHelpers';
import { ProcessedRow } from '../../types';

interface HistorySummaryCardsProps {
  processedData: ProcessedRow[];
  selectedDistributors: Set<string>;
}

const HistorySummaryCards: React.FC<HistorySummaryCardsProps> = ({ processedData, selectedDistributors }) => {
  if (!processedData || processedData.length === 0) return null;

  const marketAvgValues = processedData
    .map(row => row.market.avg?.value ?? null)
    .filter((v): v is number => v !== null);

  const hasMarket = marketAvgValues.length >= 2;
  const marketEnd = hasMarket ? marketAvgValues[0] : null; 
  const marketStart = hasMarket ? marketAvgValues[marketAvgValues.length - 1] : null;
  
  const marketDiff = marketEnd !== null && marketStart !== null ? marketEnd - marketStart : null;
  const marketPct = marketStart && marketDiff !== null ? (marketDiff / marketStart) * 100 : null;

  const distributorEvolutions = Array.from(selectedDistributors).map(distName => {
    const prices = processedData
      .map(row => {
        const distData = row.distributorPrices.find(d => d.name === distName);
        return {
            price: distData?.price.value ?? null,
            date: row.periodDisplay
        };
      })
      .filter(p => p.price !== null) as { price: number, date: string }[];

    if (prices.length < 2) return null;

    const end = prices[0]; 
    const start = prices[prices.length - 1]; 

    const diff = end.price - start.price;
    const pct = (diff / start.price) * 100;

    return {
      name: distName,
      startPrice: start.price,
      endPrice: end.price,
      startDate: start.date,
      endDate: end.date,
      diff,
      pct
    };
  }).filter(Boolean); 

  let bestAdvantage: {
    periodDisplay: string;
    distributor: string;
    userPrice: number;
    marketPrice: number;
    diff: number; 
  } | null = null;

  for (const row of processedData) {
    const marketVal = row.market.avg?.value;
    if (typeof marketVal !== 'number') continue;

    for (const dist of row.distributorPrices) {
      if (selectedDistributors.has(dist.name)) {
        const userVal = dist.price.value;
        if (typeof userVal === 'number') {
           const diff = userVal - marketVal;
           if (!bestAdvantage || diff < bestAdvantage.diff) {
             bestAdvantage = {
               periodDisplay: row.periodDisplay,
               distributor: dist.name,
               userPrice: userVal,
               marketPrice: marketVal,
               diff
             };
           }
        }
      }
    }
  }

  const formatPct = (pct: number | null) =>
    pct === null ? '—' : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;

  const formatDiffLabel = (diff: number) => {
    const abs = Math.abs(diff);
    const base = formatPrice(abs);
    return diff > 0.00001 ? `${base} un` : diff < -0.00001 ? `${base} un` : `estável`;
  };

  const getDiffColor = (val: number) => val > 0 ? 'text-rose-400' : val < 0 ? 'text-emerald-400' : 'text-slate-400';
  const getBgColor = (val: number) => val > 0 ? 'bg-rose-950/40 text-rose-300 border border-rose-900/50' : val < 0 ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/50' : 'bg-slate-800 text-slate-300';

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      {/* Card Mercado */}
      <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-4 flex flex-col">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
          Mercado (Evolução Média)
        </p>
        {hasMarket && marketStart !== null && marketEnd !== null && marketDiff !== null ? (
          <div className="flex flex-col h-full justify-between">
            <div>
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm text-slate-400">Início</span>
                    <span className="font-sans tabular-nums text-slate-300">{formatPrice(marketStart)}</span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-800 pb-2 mb-2">
                    <span className="text-sm text-slate-400">Atual</span>
                    <span className="font-sans tabular-nums font-bold text-slate-100 text-lg">{formatPrice(marketEnd)}</span>
                </div>
            </div>
            <div className={`p-3 rounded-lg flex items-center justify-between ${getBgColor(marketDiff)}`}>
              <span className="text-xs font-bold uppercase">Variação</span>
              <span className="font-bold text-sm">
                {marketDiff > 0 ? '▲' : marketDiff < 0 ? '▼' : ''} {formatDiffLabel(marketDiff)} ({formatPct(marketPct)})
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center text-center">
             <p className="text-xs text-slate-500">
                Ainda não há dados suficientes de mercado.
             </p>
          </div>
        )}
      </div>

      {/* Card Evolução por Distribuidora */}
      <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-4 flex flex-col max-h-[250px]">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
          Sua Evolução (Por Bandeira)
        </p>
        
        {distributorEvolutions && distributorEvolutions.length > 0 ? (
            <div className="overflow-y-auto pr-1 space-y-3 flex-grow custom-scrollbar">
                {distributorEvolutions.map((item) => (
                    <div key={item.name} className="border-b border-slate-800 last:border-0 pb-2 last:pb-0">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm text-slate-300 truncate max-w-[120px]">{item.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getBgColor(item.diff)}`}>
                                {formatPct(item.pct)}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 font-sans tabular-nums">
                            <span>{formatPrice(item.startPrice)} <span className="text-slate-600">→</span> {formatPrice(item.endPrice)}</span>
                            <span className={getDiffColor(item.diff)}>
                                {item.diff > 0 ? '+' : ''}{formatPrice(item.diff)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
          <div className="flex-grow flex items-center justify-center text-center">
            <p className="text-xs text-slate-500">
                Selecione distribuidoras e preencha cotações em pelo menos 2 datas.
            </p>
          </div>
        )}
      </div>

      {/* Card Melhor Oportunidade */}
      <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-4 flex flex-col">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
          Melhor Descolamento vs Mercado
        </p>
        {bestAdvantage ? (
          <div className="flex flex-col h-full justify-between">
            <div>
                <p className="text-xs text-slate-400 mb-1">
                    Em <span className="font-bold text-slate-200">{bestAdvantage.periodDisplay}</span>, a distribuidora <span className="font-bold text-emerald-400">{bestAdvantage.distributor}</span> teve a melhor condição.
                </p>
            </div>
            
            <div className="space-y-1 my-2">
                <div className="flex justify-between text-xs border-b border-slate-800 pb-1">
                    <span className="text-slate-500">Seu Preço</span>
                    <span className="font-sans tabular-nums font-semibold text-emerald-400">{formatPrice(bestAdvantage.userPrice)}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Média Mercado</span>
                    <span className="font-sans tabular-nums font-semibold text-slate-400">{formatPrice(bestAdvantage.marketPrice)}</span>
                </div>
            </div>

            <div className={`p-3 rounded-lg flex items-center justify-between bg-emerald-950/30 text-emerald-300 border border-emerald-900/50`}>
              <span className="text-xs font-bold uppercase">Vantagem</span>
              <span className="font-bold text-sm font-sans tabular-nums">
                 {formatPrice(bestAdvantage.diff)} abaixo
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center text-center">
            <p className="text-xs text-slate-500">
              Não encontramos registros abaixo da média de mercado no período.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default HistorySummaryCards;
