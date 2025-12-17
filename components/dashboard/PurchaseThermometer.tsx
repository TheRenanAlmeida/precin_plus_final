
import React, { useEffect, useRef } from 'react';
import type { FuelProduct } from '../../constants/fuels';
import { formatPrice } from '../../utils/dataHelpers';
import type { PurchaseGaugeMetrics } from '../../utils/fuelGauge';
import { Tip } from '../common/Tip';
import { TOOLTIP } from '../../constants/tooltips';

// Declaração do ECharts global
declare const echarts: any;

export interface PurchaseThermometerData extends PurchaseGaugeMetrics {
  fuelType: FuelProduct;
  goodDistributors: string[];
}

interface PurchaseThermometerProps {
  data: PurchaseThermometerData | null;
  selectedFuel: string;
  onFuelChange: (fuel: string) => void;
  availableFuels: string[];
}

// Função para gerar o texto descritivo
function buildPriceLevelText(
  rating: 'muito_abaixo' | 'abaixo' | 'na_media' | 'acima' | 'muito_acima',
  percentile: number,
  windowDays: number
): string {
  const daysText = `nos últimos ${windowDays} dias`;

  if (percentile <= 0.01) {
    return `O preço de hoje é o mais baixo observado ${daysText}.`;
  }
  if (percentile >= 0.99) {
    return `O preço de hoje é o mais alto observado ${daysText}.`;
  }
  if (rating === 'muito_abaixo' || rating === 'abaixo') {
    let pctLow = Math.round(percentile * 100);
    if (pctLow < 1) pctLow = 1;
    return `O preço de hoje está entre os ${pctLow}% preços mais baixos observados ${daysText}.`;
  }
  if (rating === 'muito_acima' || rating === 'acima') {
    let pctHigh = Math.round((1 - percentile) * 100);
    if (pctHigh < 1) pctHigh = 1;
    return `O preço de hoje está entre os ${pctHigh}% preços mais altos observados ${daysText}.`;
  }
  return `O preço de hoje está próximo da mediana do mercado ${daysText}.`;
}

const PurchaseThermometer: React.FC<PurchaseThermometerProps> = ({ data, selectedFuel }) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!chartRef.current || !data || !data.hasEnoughData || typeof echarts === 'undefined') return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;

    const diffVal = data.diffPct * 100;

    const option = {
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          center: ['50%', '85%'], // Ajustado levemente para baixo para acomodar o tamanho reduzido
          radius: '90%', // Reduzido em 25% (de 120% para 90%)
          min: -2,
          max: 2,
          splitNumber: 8,
          axisLine: {
            lineStyle: {
              width: 19, // Reduzido proporcionalmente (de 25 para 19)
              color: [
                [0.25, '#16a34a'], // muito abaixo
                [0.45, '#22c55e'], // abaixo
                [0.55, '#eab308'], // centro/neutro
                [0.75, '#f97316'], // acima
                [1, '#ef4444'],    // muito acima
              ],
            },
          },
          pointer: {
            icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
            length: '15%',
            width: 11, // Reduzido proporcionalmente (de 15 para 11)
            offsetCenter: [0, '-60%'],
            itemStyle: { 
              color: 'auto',
              borderColor: '#fff',
              borderWidth: 1,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
              shadowBlur: 5,
            },
          },
          axisTick: {
            length: 9, // Reduzido proporcionalmente (de 12 para 9)
            lineStyle: { color: 'auto', width: 2 },
          },
          splitLine: {
            length: 19, // Reduzido proporcionalmente (de 25 para 19)
            lineStyle: { color: 'auto', width: 3 },
          },
          axisLabel: {
            show: false,
          },
          title: {
            show: true,
            offsetCenter: [0, '-15%'],
            fontSize: 10, // Reduzido de 12 para 10
            color: '#94a3b8', 
            fontWeight: 500,
          },
          detail: {
            show: true,
            fontSize: 21, // Reduzido de 28 para 21
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif',
            offsetCenter: [0, '-40%'],
            valueAnimation: true,
            formatter: (value: number) => {
              const sign = value > 0 ? '+' : value < 0 ? '−' : '';
              const abs = Math.abs(value).toFixed(2).replace('.', ',');
              return `${sign}${abs}%`;
            },
            color: 'auto',
            textShadowColor: 'rgba(0, 0, 0, 0.3)',
            textShadowBlur: 2,
          },
          data: [
            {
              value: diffVal,
              name: `vs mediana (${data.windowDays}d)`,
            },
          ],
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [data]);

  if (!data || !data.hasEnoughData) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-center text-xs text-slate-500 p-4">
        <p>Dados insuficientes para cálculo do termômetro neste período.</p>
      </div>
    );
  }

  // Textos e Cores
  const ratingText = {
      'muito_abaixo': 'Excelente Compra',
      'abaixo': 'Abaixo da Média',
      'na_media': 'Na Média',
      'acima': 'Acima da Média',
      'muito_acima': 'Preço Alto'
  };
  
  const ratingColors = {
      'muito_abaixo': 'text-emerald-400',
      'abaixo': 'text-emerald-300',
      'na_media': 'text-amber-400',
      'acima': 'text-orange-400',
      'muito_acima': 'text-rose-400'
  };

  const descriptiveText = buildPriceLevelText(data.rating, data.percentile, data.windowDays);
  const textColorClass = data.rating === 'na_media' ? 'text-slate-500' : ratingColors[data.rating];

  return (
    <div className="flex flex-col items-center h-full w-full">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide shrink-0">
            <Tip text={TOOLTIP.HEADER_THERMOMETER}>
                Termômetro de Mercado
            </Tip>
        </h3>
        
        <span className="mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/50 uppercase tracking-wide shrink-0">
            {selectedFuel}
        </span>
        
        <div ref={chartRef} className="w-full flex-grow min-h-0" />
        
        <div className="text-center mt-auto pt-2 shrink-0">
            <div className={`text-lg font-bold uppercase tracking-wide ${ratingColors[data.rating]}`}>
                {ratingText[data.rating]}
            </div>
            <p className={`text-[10px] ${textColorClass} mt-1 max-w-[200px] leading-tight`}>
                {descriptiveText}
            </p>
        </div>
    </div>
  );
};

export default PurchaseThermometer;
