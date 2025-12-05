import React, { useRef, useEffect, useState, useCallback } from 'react';
import { formatPrice } from '../../utils/dataHelpers';

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
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.6)';
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
    
    const { ctx, data, scales: { x, y } } = chart;
    const refDateString = new Date(refDate.getTime() - (refDate.getTimezoneOffset() * 60000))
        .toISOString().split('T')[0];
    
    const refDateIndex = data.labels.indexOf(refDateString);
    if (refDateIndex === -1) return;

    const xPos = x.getPixelForValue(refDateIndex);
    
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xPos, y.top);
    ctx.lineTo(xPos, y.bottom);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'; // red-500
    ctx.setLineDash([6, 3]);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    data.datasets.forEach((dataset: any) => {
        const value = dataset.data[refDateIndex];
        if (value !== null && value !== undefined) {
            const yPos = y.getPixelForValue(value);
            ctx.beginPath();
            ctx.arc(xPos, yPos, 6, 0, 2 * Math.PI, false); // Larger radius
            ctx.fillStyle = 'rgba(220, 38, 38, 1)'; // red-600
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'white';
            ctx.stroke();
        }
    });
    ctx.restore();
  }
};

export const getChartOptions = (title: string, isModal: boolean = false, chartData: any = null, refDate: Date, isTooltipPinned: boolean) => {
  const tooltipColors = [
    'rgba(34, 197, 94, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(239, 68, 68, 0.8)',
  ];

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'nearest' as const,
      intersect: true,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: isModal ? 14 : 10 },
          boxWidth: isModal ? 30 : 20,
          boxHeight: isModal ? 14 : 10,
          padding: 20,
          usePointStyle: false,
        },
      },
      title: {
        display: true,
        text: title,
        font: {
          size: isModal ? 20 : 16,
          weight: 'bold' as const,
        },
        color: '#334155',
      },
      refDateIndicator: {
          refDate: refDate
      },
      tooltip: {
        enabled: true,
        backgroundColor: (context: any) => {
          if (context.tooltip.dataPoints.length > 0) {
            const index = context.tooltip.dataPoints[0].datasetIndex;
            return tooltipColors[index] || 'rgba(15, 23, 42, 0.8)';
          }
          return 'rgba(15, 23, 42, 0.8)';
        },
        titleFont: { size: isModal ? 14 : 12, weight: 'bold' as const },
        bodyFont: { size: isModal ? 16 : 14, weight: 'bold' as const },
        padding: isModal ? 12 : 10,
        displayColors: false,
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
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: number) => formatPrice(value),
          font: { size: isModal ? 12 : 10 },
        },
        min: 0,
        max: 0,
      },
      x: {
        grid: { display: false },
        ticks: { 
          font: { size: isModal ? 12 : 10 },
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
        point: {
            radius: isModal ? 4 : 3,
            hoverRadius: isModal ? 6 : 5,
            hitRadius: 15,
        }
    }
  };

  if (chartData?.datasets) {
    const allDataPoints = chartData.datasets.flatMap((dataset: any) => dataset.data);
    const validDataPoints = allDataPoints.filter((p: number | null) => p !== null && isFinite(p));
    if (validDataPoints.length > 0) {
      const dataMin = Math.min(...validDataPoints);
      const dataMax = Math.max(...validDataPoints);
      const range = dataMax - dataMin;
      
      let stepSize = 0.02;
      if (range > 0.7) {
          stepSize = 0.08;
      } else if (range > 0.3) {
          stepSize = 0.04;
      }
      
      const paddedMin = (Math.floor(dataMin / stepSize) * stepSize) - stepSize;
      const paddedMax = (Math.ceil(dataMax / stepSize) * stepSize) + stepSize;

      options.scales.y.min = Math.max(0, paddedMin);
      options.scales.y.max = paddedMax;
      options.scales.y.ticks.stepSize = stepSize;
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
      className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 relative transition-all duration-300 ${isCarouselItem ? 'h-full' : 'h-80'} ${isCenter ? 'cursor-pointer' : ''}`}
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
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 sm:p-8" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <header className="p-2 border-b border-gray-200 flex justify-end items-center">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
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
  products: string[];
  chartData: { [key: string]: any };
  refDate: Date;
  onChartExpand: (fuelType: string) => void;
}> = ({ products, chartData, refDate, onChartExpand }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const dragThreshold = useRef(5);
  const pointerDownSlideIndex = useRef<number | null>(null);

  const goToSlide = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const goToNext = useCallback(() => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % products.length);
  }, [products.length]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + products.length) % products.length);
  }, [products.length]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (products.length <= 1) return;
    
    const slideElement = (e.target as HTMLElement)?.closest('[data-slide-index]');
    pointerDownSlideIndex.current = slideElement ? parseInt(slideElement.getAttribute('data-slide-index') || '-1', 10) : null;

    isDragging.current = true;
    dragStartX.current = e.clientX;
    setDragOffset(0);
    setIsTransitioning(false);
    if (carouselRef.current) carouselRef.current.style.cursor = 'grabbing';
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setDragOffset(e.clientX - dragStartX.current);
  };

  const handlePointerUp = (event?: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setIsTransitioning(true);

    if (carouselRef.current) carouselRef.current.style.cursor = 'grab';
    
    if (Math.abs(dragOffset) < dragThreshold.current) {
        const slideIndex = pointerDownSlideIndex.current;
        if (slideIndex !== null && slideIndex !== -1) {
            if (slideIndex === activeIndex) {
                const isCanvasClick = (event?.target as HTMLElement)?.tagName === 'CANVAS';
                if (!isCanvasClick) {
                    onChartExpand(products[activeIndex]);
                }
            } else {
                goToSlide(slideIndex);
            }
        }
    } else {
        const swipeThreshold = 50; 
        if (dragOffset > swipeThreshold) goToPrev();
        else if (dragOffset < -swipeThreshold) goToNext();
    }
    
    setDragOffset(0);
    pointerDownSlideIndex.current = null;
  };
  
  useEffect(() => {
    const carouselElement = carouselRef.current;
    const preventContextMenu = (e: Event) => e.preventDefault();
    if (carouselElement) {
      carouselElement.addEventListener('contextmenu', preventContextMenu);
      return () => carouselElement.removeEventListener('contextmenu', preventContextMenu);
    }
  }, []);

  return (
    <div className="relative w-full h-[350px] flex items-center justify-center">
      <button 
        onClick={goToPrev} 
        className="absolute left-0 sm:-left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/60 backdrop-blur-sm shadow-lg hover:bg-white/90 transition-all disabled:opacity-50"
        aria-label="Gráfico Anterior"
        disabled={products.length <= 1}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-800"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
      </button>

      <div 
        ref={carouselRef}
        className="relative w-full h-full overflow-hidden touch-pan-y"
        style={{ perspective: '1500px', transformStyle: 'preserve-3d', cursor: products.length > 1 ? 'grab' : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {products.map((fuelType, index) => {
          const numProducts = products.length;
          const carouselWidth = carouselRef.current?.offsetWidth || window.innerWidth;
          
          let offset = index - activeIndex;
          if (numProducts > 2) { 
            if (offset > numProducts / 2) offset -= numProducts;
            if (offset < -numProducts / 2) offset += numProducts;
          }

          const dragProgress = isTransitioning ? 0 : dragOffset / carouselWidth;
          const effectiveOffset = offset - dragProgress;
          const absEffectiveOffset = Math.abs(effectiveOffset);

          if (absEffectiveOffset > 2) return <div key={fuelType} style={{ display: 'none' }} />;

          const scale = 1 - 0.2 * Math.min(absEffectiveOffset, 2);
          const translateZ = -150 * Math.min(absEffectiveOffset, 2);
          const rotateY = -40 * effectiveOffset;
          const opacity = Math.max(0, 1 - 0.5 * absEffectiveOffset);
          const translateX = effectiveOffset * 65;

          const style: React.CSSProperties = {
            transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
            opacity: opacity,
            zIndex: products.length - Math.round(absEffectiveOffset),
            transition: isTransitioning ? 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease' : 'none',
            position: 'absolute', width: '60%', height: '100%', top: 0, left: '20%',
            pointerEvents: !isDragging.current ? 'auto' : 'none',
          };

          return (
            <div key={fuelType} style={style} data-slide-index={index}>
              <PriceEvolutionChart title={fuelType} chartData={chartData[fuelType]} refDate={refDate} onExpand={() => onChartExpand(fuelType)} isCarouselItem={true} isCenter={offset === 0} />
            </div>
          );
        })}
      </div>

      <button 
        onClick={goToNext} 
        className="absolute right-0 sm:-right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/60 backdrop-blur-sm shadow-lg hover:bg-white/90 transition-all disabled:opacity-50"
        aria-label="Próximo Gráfico"
        disabled={products.length <= 1}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-800"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
      </button>
    </div>
  );
};

export const ChartHeader: React.FC<{ selectedBase: string, refDate: Date }> = ({ selectedBase, refDate }) => (
    <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-wide">Evolução de Preços - Base {selectedBase}</h2>
        <div className="inline-block bg-red-100 text-red-800 text-sm font-semibold px-4 py-1.5 rounded-full border border-red-300">
            Data selecionada: {refDate.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })}
        </div>
    </div>
);