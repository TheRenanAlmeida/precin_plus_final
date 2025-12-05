
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { formatPrice } from '../../utils/dataHelpers';
import { FuelProduct } from '../../constants/fuels';

declare const Chart: any;

export const weekendIndicatorPlugin = {
  id: 'weekendIndicator',
  afterDatasetsDraw(chart: any) {
    const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
    if (!chart.data.labels || chart.data.labels.length === 0) return;
    ctx.save();
    
    const dayOfWeekFormatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: 'UTC',
    });

    for (let i = 1; i < chart.data.labels.length; i++) {
      const label = chart.data.labels[i] as string;
      const currentDate = new Date(`${label.substring(0, 10)}T12:00:00Z`);
      const currentDayString = dayOfWeekFormatter.format(currentDate);
      
      if (currentDayString === 'Mon') {
        const prevDataPointIndex = i - 1;
        const xPos = (x.getPixelForValue(prevDataPointIndex) + x.getPixelForValue(i)) / 2;

        ctx.beginPath();
        ctx.moveTo(xPos, top);
        ctx.lineTo(xPos, bottom);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)'; // slate-600/30 for dark mode
        ctx.setLineDash([3, 3]);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
};

export const refDateIndicatorPlugin = {
  id: 'refDateIndicator',
  afterDatasetsDraw(chart: any, args: any, options: any) {
    const { refDate } = options;
    if (!refDate) return;
    
    // Use scales.y properties directly which are updated with zoom/rescale
    const { ctx, data, scales: { x, y } } = chart;
    const refDateString = new Date(refDate.getTime() - (refDate.getTimezoneOffset() * 60000))
        .toISOString().split('T')[0];
    
    const refDateIndex = data.labels.indexOf(refDateString);
    if (refDateIndex === -1) return;

    const xPos = x.getPixelForValue(refDateIndex);
    
    // Ensure we draw within the chart area top/bottom (respecting scales)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xPos, y.top);
    ctx.lineTo(xPos, y.bottom);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'; // red-500
    ctx.setLineDash([6, 3]);
    ctx.stroke();
    ctx.restore();
  }
};

export const getChartOptions = (
    title: string, 
    isModal: boolean = false, 
    chartData: any = null, 
    refDate: Date, 
    isTooltipPinned: boolean
) => {
  const refDateString = new Date(refDate.getTime() - (refDate.getTimezoneOffset() * 60000))
      .toISOString().split('T')[0];
  const refDateIndex = chartData?.labels?.indexOf(refDateString) ?? -1;

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: isModal,
        position: 'top' as const,
        labels: {
          color: '#94a3b8', // slate-400
          font: { size: isModal ? 14 : 11, family: 'Inter, sans-serif' },
          boxWidth: 12,
          boxHeight: 12,
          padding: 15,
          usePointStyle: true,
        },
      },
      title: {
        display: false, // Title handled in React layout
      },
      refDateIndicator: {
          refDate: refDate
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(15, 23, 42, 0.8)', // slate-950 com 80% de opacidade
        backdropFilter: 'blur(4px)',
        titleColor: '#f1f5f9', // slate-100
        bodyColor: '#cbd5e1', // slate-300
        borderColor: '#1e293b', // slate-800
        borderWidth: 1,
        titleFont: { size: isModal ? 14 : 12, weight: 'bold' as const },
        bodyFont: { size: isModal ? 14 : 12, weight: 'normal' as const },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        usePointStyle: true,
        events: isTooltipPinned ? [] : ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
        callbacks: {
          title: (context: any) => {
            const dataPoint = context[0];
            if (dataPoint?.label) {
              const label = dataPoint.label;
              const date = new Date(`${label.substring(0, 10)}T12:00:00Z`);
              return date.toLocaleDateString('pt-BR', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              });
            }
            return '';
          },
          label: (context: any) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatPrice(context.parsed.y);
            }
            return label;
          },
          labelColor: (ctx: any) => {
            const color = ctx.dataset.borderColor as string || '#94a3b8';
            return {
                borderColor: color,
                backgroundColor: color, 
                borderWidth: 0,
                borderRadius: 2,
            };
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: number) => formatPrice(value),
          font: { size: 10, family: 'Inter, sans-serif' },
          color: '#64748b', // slate-500
        },
        grid: {
            color: '#1e293b', // slate-800
            drawBorder: false,
        },
        border: { display: false },
        // min/max will be calculated below
      },
      x: {
        grid: { display: false },
        ticks: { 
          font: { size: 10, family: 'Inter, sans-serif' },
          color: '#64748b', // slate-500
          callback: function(this: any, value: number) {
            const label = this.chart.data.labels[value] as string;
            if (label) {
              const date = new Date(`${label.substring(0, 10)}T12:00:00Z`);
              return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                timeZone: 'UTC'
              });
            }
            return '';
          }
        },
      },
    },
    elements: {
        line: {
            borderWidth: 2,
            tension: 0.3,
        },
        point: {
            radius: (ctx: any) => (ctx.active || ctx.dataIndex === refDateIndex) ? (isModal ? 5 : 4) : 0,
            hoverRadius: (ctx: any) => isModal ? 6 : 5,
            hitRadius: 15,
            pointStyle: (ctx: any) => {
                if (ctx.active || ctx.dataIndex === refDateIndex) {
                    return ctx.dataset.seriesType === 'distributor' ? 'crossRot' : 'circle';
                }
                return false;
            },
            backgroundColor: (ctx: any) => {
                const color = ctx.dataset.borderColor as string;
                return '#0f172a'; // Dark background for point fill
            },
            borderColor: (ctx: any) => {
                const color = ctx.dataset.borderColor as string;
                return color;
            },
            borderWidth: 2,
        }
    }
  };

  if (chartData?.datasets) {
    // Only consider datasets that are NOT hidden for the scale calculation
    const visibleDatasets = chartData.datasets.filter((d: any) => !d.hidden);
    
    const allDataPoints = visibleDatasets.flatMap((dataset: any) => dataset.data);
    const validDataPoints = allDataPoints.filter((p: number | null) => p !== null && isFinite(p));
    
    if (validDataPoints.length > 0) {
      let dataMin = Math.min(...validDataPoints);
      let dataMax = Math.max(...validDataPoints);
      let range = dataMax - dataMin;
      
      // Enforce minimum step of 0.02
      let stepSize = 0.02; 
      
      // Dynamic padding to "gain space" when removing outliers
      // If range is tiny (<= 0.04), we center it with small padding
      // If range is large, we allow bigger steps
      if (range > 0.7) stepSize = 0.08;
      else if (range > 0.3) stepSize = 0.04;
      else if (range <= 0.02) {
          // Extra tight case: center the line
          const mid = (dataMin + dataMax) / 2;
          dataMin = mid - 0.03;
          dataMax = mid + 0.03;
      }

      // Calculate padded min/max aligned to stepSize
      const paddedMin = (Math.floor(dataMin / stepSize) * stepSize) - stepSize;
      const paddedMax = (Math.ceil(dataMax / stepSize) * stepSize) + stepSize;

      options.scales.y.min = Math.max(0, paddedMin);
      options.scales.y.max = paddedMax;
      options.scales.y.ticks.stepSize = stepSize;
    } else {
        // Fallback if all data is hidden
        options.scales.y.min = 0;
        options.scales.y.max = 1;
    }
  }

  return options;
};

export const PriceEvolutionChart: React.FC<{
  title: string;
  chartData: any;
  refDate: Date;
  onExpand?: () => void;
  isCarouselItem?: boolean;
  isCenter?: boolean;
}> = ({ title, chartData, refDate, onExpand, isCarouselItem = false, isCenter = false }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [isTooltipPinned, setIsTooltipPinned] = useState(false);

  useEffect(() => {
    const handleUnpin = (e: KeyboardEvent | MouseEvent) => {
        if (isTooltipPinned) {
            if ((e instanceof KeyboardEvent && e.key === 'Escape') || e.type === 'mouseleave') {
                setIsTooltipPinned(false);
            }
        }
    };
    document.addEventListener('keydown', handleUnpin);
    const chartElement = chartRef.current;
    chartElement?.addEventListener('mouseleave', handleUnpin);
    return () => {
        document.removeEventListener('keydown', handleUnpin);
        chartElement?.removeEventListener('mouseleave', handleUnpin);
    }
  }, [isTooltipPinned]);

  useEffect(() => {
    if (chartRef.current && chartData) {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (ctx) {
            const refDateString = new Date(refDate.getTime() - (refDate.getTimezoneOffset() * 60000))
              .toISOString().split('T')[0];
            const refDateIndex = chartData.labels.indexOf(refDateString);

            const options = getChartOptions(title, false, chartData, refDate, isTooltipPinned);
            options.onClick = (evt: any, elements: any[], chart: any) => {
                if (elements.length > 0) {
                    const clickedIndex = elements[0].index;
                    if (clickedIndex === refDateIndex) {
                        const newPinnedState = !isTooltipPinned;
                        setIsTooltipPinned(newPinnedState);
                        if (newPinnedState) {
                           chart.tooltip.setActiveElements(elements, { x: evt.x, y: evt.y });
                        } else {
                           chart.tooltip.setActiveElements([], { x: 0, y: 0 });
                        }
                        chart.update('none');
                    } else if (onExpand && isCenter) {
                       onExpand();
                    }
                } else if (onExpand && isCenter) {
                    onExpand();
                }
            };
            
            chartInstanceRef.current = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: options,
                plugins: [weekendIndicatorPlugin, refDateIndicatorPlugin],
            });
        }
    }

    return () => {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
        }
    };
  }, [chartData, title, refDate, isTooltipPinned, onExpand, isCenter]);


  return (
    <div
      className={`relative transition-all duration-300 ${isCarouselItem ? 'h-full' : 'h-80'} ${isCenter ? 'cursor-pointer' : ''}`}
      onClick={(e) => {
        const isCanvasClick = e.target instanceof HTMLCanvasElement;
        if (!isCanvasClick && onExpand && isCenter) {
            onExpand();
        }
      }}
    >
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export const ChartModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  chartData: any;
  refDate: Date;
}> = ({ isOpen, onClose, title, chartData, refDate }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [isTooltipPinned, setIsTooltipPinned] = useState(false);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (isTooltipPinned && e.key === 'Escape') {
              setIsTooltipPinned(false);
          }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isTooltipPinned]);

  useEffect(() => {
    let timeoutId: number | undefined;
    if (isOpen && chartRef.current && chartData) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      
      timeoutId = window.setTimeout(() => {
          const ctx = chartRef.current?.getContext('2d');
          if (ctx) {
            const refDateString = new Date(refDate.getTime() - (refDate.getTimezoneOffset() * 60000))
              .toISOString().split('T')[0];
            const refDateIndex = chartData.labels.indexOf(refDateString);
            const options = getChartOptions(title, true, chartData, refDate, isTooltipPinned);

            options.onClick = (evt: any, elements: any[], chart: any) => {
                if (elements.length > 0 && elements[0].index === refDateIndex) {
                    const newPinnedState = !isTooltipPinned;
                    setIsTooltipPinned(newPinnedState);
                    if (newPinnedState) {
                       chart.tooltip.setActiveElements(elements, { x: evt.x, y: evt.y });
                    } else {
                       chart.tooltip.setActiveElements([], { x: 0, y: 0 });
                    }
                    chart.update('none');
                }
            };
            
            chartInstanceRef.current = new Chart(ctx, {
              type: 'line',
              data: chartData,
              options: options,
              plugins: [weekendIndicatorPlugin, refDateIndicatorPlugin],
            });
          }
      }, 50);

    }

    return () => {
      clearTimeout(timeoutId);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isOpen, chartData, title, refDate, isTooltipPinned]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 sm:p-8 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-6xl h-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <header className="p-3 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-100 ml-4">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>
            <div className="flex-grow p-4 sm:p-6 relative" onMouseLeave={() => setIsTooltipPinned(false)}>
                <canvas ref={chartRef}></canvas>
            </div>
        </div>
    </div>
  );
};

export const ChartCarousel: React.FC<{
  // FIX: Updated the type of 'products' to be more specific, expecting an array of FuelProduct.
  products: FuelProduct[];
  chartData: { [key: string]: any };
  refDate: Date;
  onChartExpand: (fuelType: string) => void;
  selectedFuel?: string;
  onSelectedFuelChange?: (fuel: string) => void;
}> = ({ products, chartData, refDate, onChartExpand, selectedFuel, onSelectedFuelChange }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  useEffect(() => {
    if (selectedFuel) {
      const idx = products.indexOf(selectedFuel as FuelProduct);
      if (idx !== -1 && idx !== activeIndex) {
        setActiveIndex(idx);
      }
    }
  }, [selectedFuel, products, activeIndex]);

  // If chartData isn't ready for selectedFuel, show empty state
  if (!selectedFuel || !chartData[selectedFuel]) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Carregando gráfico...</div>;

  return (
    <div className="relative w-full h-full">
      <div className="w-full h-full">
          <PriceEvolutionChart 
            title={selectedFuel} 
            chartData={chartData[selectedFuel]} 
            refDate={refDate} 
            onExpand={() => onChartExpand(selectedFuel)} 
            isCarouselItem={true} 
            isCenter={true} 
          />
      </div>
    </div>
  );
};

export const ChartHeader: React.FC<{ selectedBase: string, refDate: Date }> = ({ selectedBase, refDate }) => (
    <div className="text-center space-y-1 mb-4">
        <h2 className="text-xl font-bold text-slate-100 tracking-wide">Evolução - {selectedBase}</h2>
    </div>
);
