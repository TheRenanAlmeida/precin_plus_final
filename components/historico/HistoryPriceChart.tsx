import React, { useRef, useEffect, useMemo } from 'react';
import type { HistoryPriceChartProps } from '../../types';
import { formatPrice } from '../../utils/dataHelpers';

// Declaração do ECharts (assumindo que está disponível via CDN ou importação)
declare const echarts: any | undefined;

// Locale pt-BR para meses/dias
const PT_BR_LOCALE = {
  time: {
    month: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    monthAbbr: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    dayOfWeek: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    dayOfWeekAbbr: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  },
};

// Registra o locale (caso ECharts esteja disponível)
if (typeof echarts !== 'undefined') {
  echarts.registerLocale('pt-BR', PT_BR_LOCALE);
}

/**
 * Constrói as opções do ECharts usando os dados vindos do hook de histórico
 * e mantém a mesma lógica de visibilidade/formatação já existente.
 */
const generateEChartsOptions = (
  chartData: HistoryPriceChartProps['chartData'],
  seriesConfig: HistoryPriceChartProps['seriesConfig'],
  defaultZoom: { startValue?: number; endValue?: number }
) => {
  const visibleSeriesConfig = seriesConfig.filter(s => s.isVisible);
  const allLabels = chartData.labels;

  // 🔧 MELHORIA: converte as datas uma única vez (evita vários new Date(...) por ponto)
  const timestamps = allLabels.map(l => new Date(l + 'T00:00:00Z').getTime());

  const minDataset = chartData.datasets.find((d: any) => d.label === 'Mínimo do Mercado');
  const avgDataset = chartData.datasets.find((d: any) => d.label === 'Variação do Mercado');
  const maxDataset = chartData.datasets.find((d: any) => d.label === 'Máximo do Mercado');

  const isMarketVisible = seriesConfig.find(s => s.name === 'Variação do Mercado')?.isVisible ?? false;

  const echartsSeries: any[] = [];

  // 1) Faixa bicolor de mercado (verde/avg/vermelho)
  if (minDataset && avgDataset && maxDataset && isMarketVisible) {
    const minData = minDataset.data;
    const avgData = avgDataset.data;
    const maxData = maxDataset.data;

    const greenBandData = avgData.map((avg: number | null, i: number) => {
      const min = minData[i];
      return (avg !== null && min !== null) ? avg - min : null;
    });
    const redBandData = maxData.map((max: number | null, i: number) => {
      const avg = avgData[i];
      return (max !== null && avg !== null) ? max - avg : null;
    });

    // Base (min) – invisível (só para empilhamento)
    echartsSeries.push({
      name: '_min_base_internal',
      type: 'line',
      data: timestamps.map((t, i) => [t, minData[i]]),
      stack: 'market_band',
      symbol: 'none',
      lineStyle: { width: 0 },
      areaStyle: { color: 'transparent' },
      showInLegend: false,
      sampling: 'lttb',                  // 🔧 MELHORIA: downsampling preciso
      progressive: 400,                   // 🔧 MELHORIA
      progressiveThreshold: 3000          // 🔧 MELHORIA
    });

    // Faixa verde (min → avg)
    echartsSeries.push({
      name: '_green_band_internal',
      type: 'line',
      data: timestamps.map((t, i) => [t, greenBandData[i]]),
      stack: 'market_band',
      symbol: 'none',
      lineStyle: { width: 0 },
      areaStyle: { color: 'rgba(34, 197, 94, 0.45)' },
      showInLegend: false,
      sampling: 'lttb',
      progressive: 400,
      progressiveThreshold: 3000
    });

    // Faixa vermelha (avg → max)
    echartsSeries.push({
      name: '_red_band_internal',
      type: 'line',
      data: timestamps.map((t, i) => [t, redBandData[i]]),
      stack: 'market_band',
      symbol: 'none',
      lineStyle: { width: 0 },
      areaStyle: { color: 'rgba(239, 68, 68, 0.45)' },
      showInLegend: false,
      sampling: 'lttb',
      progressive: 400,
      progressiveThreshold: 3000
    });

    // Linha da média do mercado
    echartsSeries.push({
      name: 'Variação do Mercado',
      type: 'line',
      data: timestamps.map((t, i) => [t, avgData[i]]),
      itemStyle: { color: '#64748B' },
      lineStyle: { width: 2.5 },
      symbolSize: 4,
      showSymbol: false,
      smooth: false,
      z: 10,
      sampling: 'lttb',
      progressive: 400,
      progressiveThreshold: 3000
    });
  }

  // 2) Séries de distribuidoras
  chartData.datasets
    .filter((d: any) => visibleSeriesConfig.some(s => s.name === d.label && s.type === 'distributor'))
    .forEach((dataset: any) => {
      const config = visibleSeriesConfig.find(s => s.name === dataset.label)!;
      echartsSeries.push({
        name: config.name,
        type: 'line',
        data: timestamps.map((t, i) => [t, dataset.data[i]]),
        sampling: 'lttb',                // 🔧 MELHORIA
        itemStyle: { color: config.color },
        lineStyle: { width: 2.0 },
        symbolSize: 4,
        showSymbol: false,
        smooth: false,
        progressive: 400,                // 🔧 MELHORIA
        progressiveThreshold: 3000       // 🔧 MELHORIA
      });
    });

  // 3) Zoom mínimo em % (15 pontos)
  const totalPoints = chartData.labels.length;
  const minSpan = (15 / Math.max(15, totalPoints)) * 100;

  // 4) Formatter do eixo X — mantém sua lógica original
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

    // Anos (sem alteração)
    if (timeRange > oneMonth * 12) {
      if (lastShownYear !== year) {
        lastShownYear = year;
        lastShownMonth = -1;
        return year.toString();
      }
    }
    // Meses (sem alteração)
    if (lastShownMonth !== month) {
      lastShownMonth = month;
      if (lastShownYear !== year) {
        lastShownYear = year;
        return year.toString();
      }
      return PT_BR_LOCALE.time.monthAbbr[month];
    }
    // Dias (micronúmeros) — retorna SÓ o dia, em menor tamanho via "rich"
    if (timeRange < oneMonth * 2.5) {
      return `{day|${day}}`; // 🔧 MELHORIA: estilo menor só para o dia
    }
    return '';
  };

  return {
    useUTC: true,
    animationDuration: 600,
    animationDurationUpdate: 300, // 🔧 MELHORIA
    animationEasing: 'cubicOut',
    legend: { show: false },
    title: {
      text: 'Evolução de Preços',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 'bold', color: '#333' }
    },
    tooltip: {
      trigger: 'axis',
      order: 'valueDesc',               // 🔧 MELHORIA: itens ordenados por valor
      renderMode: 'html',
      appendToBody: true,
      confine: true,
      enterable: true,
      transitionDuration: 0.1,
      backgroundColor: 'rgba(17, 24, 39, 0.6)',
      borderColor: 'rgba(255, 255, 255, 0.15)',
      borderWidth: 1,
      borderRadius: 6,
      padding: 10,
      textStyle: {
        color: '#f8fafc',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowBlur: 2,
        textShadowOffsetX: 0,
        textShadowOffsetY: 1,
      },
      extraCssText: 'z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.3);',
      position: function (point: number[], _params: any, dom: HTMLElement, _rect: any, size: { viewSize: number[] }) {
        const viewWidth = size.viewSize[0];
        const tooltipWidth = dom.offsetWidth;
        const tooltipHeight = dom.offsetHeight;

        let x = point[0] + 20;
        let y = point[1] - tooltipHeight - 20;
        if (x + tooltipWidth > viewWidth) x = point[0] - tooltipWidth - 20;
        if (x < 0) x = point[0] + 20;
        if (y < 0) y = point[1] + 20;
        return [x, y];
      },
      formatter: (params: any[]) => {
        if (typeof echarts === 'undefined' || !params || params.length === 0) return '';
        const date = echarts.time.format(params[0].value[0], '{dd}/{MM}/{yyyy}', true);
        let tooltip = `<div style="font-weight:bold;font-size:14px;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:6px;">${date}</div>`;

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

        if (reconstructedMarket.min !== null) allItems.push({ name: 'Mínimo do Mercado', value: reconstructedMarket.min, color: 'rgba(34, 197, 94, 1)' });
        if (reconstructedMarket.max !== null) allItems.push({ name: 'Máximo do Mercado', value: reconstructedMarket.max, color: 'rgba(239, 68, 68, 1)' });

        const sorted = allItems.sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
        sorted.forEach(item => {
          const seriesName = item.name.replace(' do Mercado', '').replace('Variação', 'Média');
          const price = item.value !== null && item.value !== undefined ? formatPrice(item.value) : 'N/A';
          tooltip += `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;line-height:1.7;">
              <div style="display:flex;align-items:center;">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${item.color};margin-right:8px;"></span>
                  <span style="font-weight:600;color:#e5e7eb;">${seriesName}</span>
              </div>
              <span style="font-weight:bold;color:white;margin-left:16px;">${price}</span>
            </div>
          `;
        });
        return `<div style="min-width: 220px;">${tooltip}</div>`;
      }
    },

    axisPointer: {
      type: 'cross',
      snap: true,                       // 🔧 MELHORIA: cursor "cola" no ponto
      lineStyle: { color: 'rgba(100, 100, 100, 0.4)' },
      label: {
        backgroundColor: '#334155',
        formatter: function (params: any) {
          if (typeof echarts === 'undefined') return String(params.value);
          if (params.axisDimension === 'x') return echarts.time.format(params.value, '{dd}/{MM}/{yyyy}', true);
          if (params.axisDimension === 'y') return formatPrice(params.value);
          return params.value;
        }
      }
    },

    grid: { left: '3%', right: '4%', bottom: '18%', top: '15%', containLabel: true },

    xAxis: [
      {
        type: 'time',
        boundaryGap: false,

        // ✅ EXIGÊNCIA: mostrar TODAS as datas (ticks diários)
        // Mantém o mesmo formatter; só força que ticks/labels sejam gerados.
        axisLabel: {
          rotate: 0,
          formatter: xAxisFormatter,
          interval: 0,            // <- força tentar mostrar todos os labels (um por dia)
          showMinLabel: true,
          showMaxLabel: true,
          // 🔧 MELHORIA: estilo menor para micronúmeros de dia, sem mudar meses/anos
          rich: {
            day: { fontSize: 10, color: '#475569' } // só usado quando o formatter retorna {day|...}
          },
          margin: 8
        },
        axisTick: {
          show: true,
          alignWithLabel: true,
          interval: 0            // <- força tick por dia
        },

        // Mantém sua linha pontilhada marcando mudança de mês
        splitLine: {
          show: true,
          lineStyle: { color: '#e9e9e9', type: 'dashed' },
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
      name: 'Preço (R$)',
      min: (v: { min: number }) => (v.min > 0 ? v.min - 0.01 : 0),
      axisLabel: { formatter: (v: number) => formatPrice(v) }
    },

    dataZoom: [
      { type: 'inside', xAxisIndex: 0, minSpan, throttle: 50 },  // 🔧 MELHORIA: zoom suave
      {
        type: 'slider',
        xAxisIndex: 0,
        bottom: 10,
        startValue: defaultZoom.startValue,
        endValue: defaultZoom.endValue,
        minSpan,
        handleStyle: { color: '#22c55e' },
        textStyle: { color: '#444' },
        throttle: 50                                               // 🔧
      }
    ],

    series: echartsSeries
  };
};

// --- Componente React ---
const HistoryPriceChart: React.FC<HistoryPriceChartProps> = ({ chartData, seriesConfig }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // Zoom inicial: últimos 30 dias
  const defaultZoom = useMemo(() => {
    if (!chartData.labels || chartData.labels.length === 0) return {};
    const allTimestamps = chartData.labels.map(l => new Date(l + 'T00:00:00Z').getTime());
    const endTime = allTimestamps[allTimestamps.length - 1];
    const startIndex = Math.max(0, allTimestamps.length - 30);
    const startTime = allTimestamps[startIndex];
    return { startValue: startTime, endValue: endTime };
  }, [chartData.labels]);

  useEffect(() => {
    if (typeof echarts === 'undefined') {
      console.warn('ECharts library not found, chart will not be rendered.');
      return;
    }
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
    <div className="p-4 mb-6 bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="h-96 relative">
        {chartData.labels.length > 0 ? (
          <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Nenhum dado disponível para exibir o gráfico.
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPriceChart;