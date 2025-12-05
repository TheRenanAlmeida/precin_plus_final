

import React, { useRef, useEffect, useMemo } from 'react';
import type { HistoryPriceChartProps } from '../../types';
import { formatPrice } from '../../utils/dataHelpers';

declare const echarts: any | undefined;

const PT_BR_LOCALE = {
  time: {
    month: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    monthAbbr: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    dayOfWeek: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    dayOfWeekAbbr: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  },
};

if (typeof echarts !== 'undefined') {
  echarts.registerLocale('pt-BR', PT_BR_LOCALE);
}

const generateEChartsOptions = (
  chartData: HistoryPriceChartProps['chartData'],
  seriesConfig: HistoryPriceChartProps['seriesConfig'],
  defaultZoom: { startValue?: number; endValue?: number }
) => {
  const visibleSeriesConfig = seriesConfig.filter(s => s.isVisible);
  const allLabels = chartData.labels;
  const timestamps = allLabels.map(l => new Date(l + 'T00:00:00Z').getTime());

  const minDataset = chartData.datasets.find((d: any) => d.label === 'Mínimo do Mercado');
  const avgDataset = chartData.datasets.find((d: any) => d.label === 'Variação do Mercado');
  const maxDataset = chartData.datasets.find((d: any) => d.label === 'Máximo do Mercado');

  const isMarketVisible = seriesConfig.find(s => s.name === 'Variação do Mercado')?.isVisible ?? false;

  const echartsSeries: any[] = [];

  if (minDataset && avgDataset && maxDataset && isMarketVisible) {
    const minData = minDataset.data;
    const avgData = avgDataset.data;
    const maxData = maxDataset.data;
  
    const greenBandData = avgData.map((avg: number | null, i: number) => {
      const min = minData[i];
      return avg !== null && min !== null ? avg - min : null;
    });
    const redBandData = maxData.map((max: number | null, i: number) => {
      const avg = avgData[i];
      return max !== null && avg !== null ? max - avg : null;
    });
  
    // BASE do stack: linha "virtual" no mínimo (sem cor visível)
    echartsSeries.push({
      name: '_min_base_internal',
      type: 'line',
      data: timestamps.map((t, i) => [t, minData[i]]),
      stack: 'market_band',
      symbol: 'none',
      lineStyle: { width: 0 },
      areaStyle: { color: 'transparent' },
      showInLegend: false,
      sampling: 'lttb',
      progressive: 400,
      progressiveThreshold: 3000,
    });
  
    // Faixa MÍNIMO → MÉDIA (azul/ciano neon)
    // Quanto mais longe da média (perto do mínimo), mais forte o azul
    echartsSeries.push({
      name: '_green_band_internal',
      type: 'line',
      data: timestamps.map((t, i) => [t, greenBandData[i]]),
      stack: 'market_band',
      symbol: 'none',
      lineStyle: { width: 0 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(56, 189, 248, 0.05)' }, // perto da média (mais claro)
            { offset: 1, color: 'rgba(34, 211, 238, 0.7)' },  // mais longe (min), azul neon forte
          ],
        },
        shadowColor: 'rgba(34, 211, 238, 0.35)',
        shadowBlur: 14,
      },
      showInLegend: false,
      sampling: 'lttb',
      progressive: 400,
      progressiveThreshold: 3000,
    });
  
    // Faixa MÉDIA → MÁXIMO (vermelho neon)
    // Quanto mais longe da média (perto do máximo), mais forte o vermelho
    echartsSeries.push({
      name: '_red_band_internal',
      type: 'line',
      data: timestamps.map((t, i) => [t, redBandData[i]]),
      stack: 'market_band',
      symbol: 'none',
      lineStyle: { width: 0 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(248, 113, 113, 0.8)' }, // topo (max) vermelho neon forte
            { offset: 1, color: 'rgba(248, 113, 113, 0.06)' }, // perto da média (mais claro)
          ],
        },
        shadowColor: 'rgba(248, 113, 113, 0.4)',
        shadowBlur: 16,
      },
      showInLegend: false,
      sampling: 'lttb',
      progressive: 400,
      progressiveThreshold: 3000,
    });
  
    // Linha da MÉDIA do mercado – branca com glow
    echartsSeries.push({
      name: 'Variação do Mercado',
      type: 'line',
      data: timestamps.map((t, i) => [t, avgData[i]]),
      itemStyle: { color: '#f9fafb' }, // quase branco
      lineStyle: {
        width: 2.6,
        color: '#f9fafb',
        shadowColor: 'rgba(249, 250, 251, 0.45)',
        shadowBlur: 12,
      },
      symbolSize: 4,
      showSymbol: false,
      smooth: false,
      z: 10,
      sampling: 'lttb',
      progressive: 400,
      progressiveThreshold: 3000,
    });
  }

  chartData.datasets
    .filter((d: any) => visibleSeriesConfig.some(s => s.name === d.label && s.type === 'distributor'))
    .forEach((dataset: any) => {
      const config = visibleSeriesConfig.find(s => s.name === dataset.label)!;
      echartsSeries.push({
        name: config.name,
        type: 'line',
        data: timestamps.map((t, i) => [t, dataset.data[i]]),
        sampling: 'lttb',
        itemStyle: { color: config.color },
        lineStyle: { width: 2.0 },
        symbolSize: 4,
        showSymbol: false,
        smooth: false,
        progressive: 400,
        progressiveThreshold: 3000
      });
    });

  const avgSeriesIndex = echartsSeries.findIndex(s => s.name === 'Variação do Mercado');
  
  const totalPoints = chartData.labels.length;
  const minSpan = (15 / Math.max(15, totalPoints)) * 100;

  let lastShownYear: number | null = null;
  let lastShownMonth: number | null = null;
  const xAxisFormatter = function (this: any, value: number) {
    const date = new Date(value);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    let timeRange = 0;
    if (this && this.axis) {
      const extent = this.axis.scale.getExtent();
      timeRange = extent[1] - extent[0];
    }
    const oneMonth = 3600 * 24 * 1000 * 30.5;

    if (timeRange > oneMonth * 12) {
      if (lastShownYear !== year) {
        lastShownYear = year;
        lastShownMonth = -1;
        return year.toString();
      }
    }
    if (lastShownMonth !== month) {
      lastShownMonth = month;
      if (lastShownYear !== year) {
        lastShownYear = year;
        return year.toString();
      }
      return PT_BR_LOCALE.time.monthAbbr[month];
    }
    if (timeRange < oneMonth * 2.5) {
      return `{day|${day}}`;
    }
    return '';
  };

  return {
    useUTC: true,
    backgroundColor: 'transparent',
    animationDuration: 600,
    animationDurationUpdate: 300,
    animationEasing: 'cubicOut',
    legend: { show: false },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
    
    // Configuração de Eixos para Dark Mode
    xAxis: [
      {
        type: 'time',
        boundaryGap: false,
        axisLabel: {
          color: '#94a3b8', // slate-400
          rotate: 0,
          formatter: xAxisFormatter,
          interval: 0,
          showMinLabel: true,
          showMaxLabel: true,
          rich: {
            day: { fontSize: 10, color: '#64748b' } // slate-500
          },
          margin: 12
        },
        axisTick: {
          show: true,
          alignWithLabel: true,
          interval: 0,
          lineStyle: { color: '#334155' } // slate-700
        },
        axisLine: {
            lineStyle: { color: '#334155' } // slate-700
        },
        splitLine: {
          show: true,
          lineStyle: { color: '#1e293b', type: 'dashed' }, // slate-800
          interval: (index: number) => {
            const label = allLabels[index];
            if (!label) return false;
            const prevLabel = index > 0 ? allLabels[index - 1] : null;
            return !prevLabel || label.substring(5, 7) !== prevLabel.substring(5, 7);
          }
        }
      }
    ],

    yAxis: {
      type: 'value',
      min: (v: { min: number }) => (v.min > 0 ? v.min - 0.01 : 0),
      axisLabel: { 
          formatter: (v: number) => formatPrice(v),
          color: '#94a3b8', // slate-400
          fontSize: 11
      },
      splitLine: {
          lineStyle: { color: '#1e293b' } // slate-800
      }
    },

    dataZoom: [
      { type: 'inside', xAxisIndex: 0, minSpan, throttle: 50 },
      {
        type: 'slider',
        xAxisIndex: 0,
        bottom: 8,
        height: 28,
        seriesIndex: avgSeriesIndex !== -1 ? [avgSeriesIndex] : undefined,
        startValue: defaultZoom.startValue,
        endValue: defaultZoom.endValue,
        minSpan,
        handleStyle: { color: '#10b981' }, // emerald-500
        textStyle: { color: '#94a3b8' },
        borderColor: '#334155',
        fillerColor: 'rgba(16, 185, 129, 0.2)',
        throttle: 50
      }
    ],

    tooltip: {
      trigger: 'axis',
      order: 'valueDesc',
      renderMode: 'html',
      appendToBody: true,
      confine: true,
      enterable: true,
      transitionDuration: 0.1,
      backgroundColor: '#0f172a', // slate-950
      borderColor: '#1e293b', // slate-800
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      textStyle: {
        color: '#f1f5f9', // slate-100
      },
      extraCssText: 'box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);',
      formatter: (params: any[]) => {
        if (typeof echarts === 'undefined' || !params || params.length === 0) return '';
        const date = echarts.time.format(params[0].value[0], '{dd}/{MM}/{yyyy}', true);
        let tooltip = `<div style="font-weight:700;font-size:12px;margin-bottom:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #334155;padding-bottom:4px;">${date}</div>`;

        const reconstructedMarket: any = { min: null, avg: null, max: null };
        const minBase = params.find(p => p.seriesName === '_min_base_internal')?.value[1];
        const greenBand = params.find(p => p.seriesName === '_green_band_internal')?.value[1];
        const redBand = params.find(p => p.seriesName === '_red_band_internal')?.value[1];

        if (minBase !== null && minBase !== undefined) {
          reconstructedMarket.min = minBase;
          if (greenBand !== null && greenBand !== undefined) {
            reconstructedMarket.avg = minBase + greenBand;
            if (redBand !== null && redBand !== undefined) {
              reconstructedMarket.max = minBase + greenBand + redBand;
            }
          }
        }

        const allItems = params
          .filter(p => !p.seriesName.startsWith('_'))
          .map(p => ({ name: p.seriesName, value: p.value[1], color: p.color }));

        if (reconstructedMarket.min !== null)
          allItems.push({
            name: 'Mínimo do Mercado',
            value: reconstructedMarket.min,
            color: '#22d3ee', // teal/cyan neon (bate com a faixa azul)
          });
        
        if (reconstructedMarket.max !== null)
          allItems.push({
            name: 'Máximo do Mercado',
            value: reconstructedMarket.max,
            color: '#fb7185', // rose/red neon (bate com a faixa vermelha)
          });

        const sorted = allItems.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
        sorted.forEach(item => {
          const seriesName = item.name.replace(' do Mercado', '').replace('Variação', 'Média');
          const price = item.value !== null && item.value !== undefined ? formatPrice(item.value) : 'N/A';
          tooltip += `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;line-height:1.6;gap:12px;">
              <div style="display:flex;align-items:center;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${item.color};margin-right:8px;"></span>
                  <span style="color:#cbd5e1;font-weight:500;">${seriesName}</span>
              </div>
              <span style="font-family:monospace;font-weight:700;color:#f8fafc;">${price}</span>
            </div>
          `;
        });
        return `<div style="min-width: 180px;">${tooltip}</div>`;
      }
    },

    axisPointer: {
      type: 'cross',
      snap: true,
      lineStyle: { color: '#475569' },
      label: {
        backgroundColor: '#334155',
        color: '#f1f5f9',
        formatter: function (params: any) {
          if (typeof echarts === 'undefined') return String(params.value);
          if (params.axisDimension === 'x') return echarts.time.format(params.value, '{dd}/{MM}/{yyyy}', true);
          if (params.axisDimension === 'y') return formatPrice(params.value);
          return params.value;
        }
      }
    },

    series: echartsSeries
  };
};

const HistoryPriceChart: React.FC<HistoryPriceChartProps> = ({ chartData, seriesConfig }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  const defaultZoom = useMemo(() => {
    if (!chartData.labels || chartData.labels.length === 0) return {};
    const allTimestamps = chartData.labels.map(l => new Date(l + 'T00:00:00Z').getTime());
    const endTime = allTimestamps[allTimestamps.length - 1];
    const startIndex = Math.max(0, allTimestamps.length - 30);
    const startTime = allTimestamps[startIndex];
    return { startValue: startTime, endValue: endTime };
  }, [chartData.labels]);

  useEffect(() => {
    if (typeof echarts === 'undefined') return;
    if (chartRef.current && chartData.labels.length > 0) {
      if (!chartInstanceRef.current) {
        chartInstanceRef.current = echarts.init(chartRef.current, null, { locale: 'pt-BR' });
      }
      const options = generateEChartsOptions(chartData, seriesConfig, defaultZoom);
      chartInstanceRef.current.setOption(options, true);
    } else if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
      chartInstanceRef.current = null;
    }

    const resizeHandler = () => chartInstanceRef.current?.resize();
    window.addEventListener('resize', resizeHandler);
    return () => {
      window.removeEventListener('resize', resizeHandler);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [chartData, seriesConfig, defaultZoom]);

  return (
    <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-4 mb-6">
      <div className="h-96 relative">
        {chartData.labels.length > 0 ? (
          <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Nenhum dado disponível para exibir o gráfico.
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPriceChart;