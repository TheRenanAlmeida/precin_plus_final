
import type { DistributorStyle, MinPriceInfo, ProductPrices } from './types';

// --- Funções de Conversão de Cor ---

export const rgbaToHex = (rgba: string): string => {
    if (!rgba || !rgba.startsWith('rgba')) {
        return rgba.startsWith('#') ? rgba : '#cccccc';
    }
    const parts = rgba.substring(rgba.indexOf('(') + 1, rgba.lastIndexOf(')')).split(/,\s*/);
    if (parts.length < 3) return '#cccccc';

    const r = parseInt(parts[0], 10);
    const g = parseInt(parts[1], 10);
    const b = parseInt(parts[2], 10);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export const hexToRgba = (hex: string, alpha: number = 1.0): string => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(204, 204, 204, ${alpha})`;

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};


// --- Funções de Cálculo de Preços ---

export const calculateIQRAverage = (priceList: number[]): number => {
    const validPrices = priceList.filter(p => typeof p === 'number' && isFinite(p));
    if (validPrices.length === 0) {
        return 0;
    }
    if (validPrices.length < 4) {
        const sum = validPrices.reduce((acc, val) => acc + val, 0);
        const avg = validPrices.length > 0 ? sum / validPrices.length : 0;
        return parseFloat(avg.toFixed(4));
    }

    const sortedPrices = [...validPrices].sort((a, b) => a - b);

    const q1Index = Math.floor(sortedPrices.length / 4);
    const q3Index = Math.floor(sortedPrices.length * (3 / 4));
    const q1 = sortedPrices[q1Index];
    const q3 = sortedPrices[q3Index];

    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const filteredPrices = sortedPrices.filter(price => price >= lowerBound && price <= upperBound);

    if (filteredPrices.length === 0) {
        const sum = sortedPrices.reduce((acc, val) => acc + val, 0);
        const avg = sortedPrices.length > 0 ? sum / sortedPrices.length : 0;
        return parseFloat(avg.toFixed(4));
    }

    const sum = filteredPrices.reduce((acc, val) => acc + val, 0);
    const avg = sum / filteredPrices.length;
    return parseFloat(avg.toFixed(4));
};

export const calculateProductAveragesFromRecords = (records: { fuel_type: string, price: number }[]): { [product: string]: number } => {
    const pricesByProduct: { [product: string]: number[] } = {};

    records.forEach(record => {
        if (!record.fuel_type || record.price === null || !isFinite(record.price)) return;
        if (!pricesByProduct[record.fuel_type]) {
            pricesByProduct[record.fuel_type] = [];
        }
        pricesByProduct[record.fuel_type].push(record.price);
    });

    const averages: { [product: string]: number } = {};
    for (const product of Object.keys(pricesByProduct)) {
        averages[product] = calculateIQRAverage(pricesByProduct[product]);
    }
    return averages;
};

export const findMinPriceInfo = (prices: ProductPrices): MinPriceInfo => {
  if (Object.keys(prices).length === 0) {
      return { minPrice: Infinity, distributors: [] };
  }
  
  const allPrices = Object.values(prices).flat().filter((p): p is number => typeof p === 'number' && isFinite(p));
  if (allPrices.length === 0) {
      return { minPrice: Infinity, distributors: [] };
  }

  const minPrice = Math.min(...allPrices);
  const distributors = Object.keys(prices)
    .filter(distributor => {
        const priceArray = prices[distributor];
        return Array.isArray(priceArray) && priceArray.includes(minPrice);
    });
    
  return { minPrice, distributors: [...new Set(distributors)] };
};

export const calculateCustomMaxPrice = (prices: ProductPrices): number => {
    const minPricesPerDistributor = Object.values(prices)
        .map(priceArray => {
            if (!Array.isArray(priceArray)) {
                return null;
            }
            const validPrices = priceArray.filter((p): p is number => typeof p === 'number' && isFinite(p));
            return validPrices.length > 0 ? Math.min(...validPrices) : null;
        })
        .filter((p): p is number => p !== null);

    if (minPricesPerDistributor.length === 0) {
        return 0;
    }

    const maxPrice = Math.max(...minPricesPerDistributor);
    return parseFloat(maxPrice.toFixed(4));
};


// --- Formatação Visual Centralizada ---

const formatPriceValue = (value: number | string): string => {
    const numValue = typeof value === 'string' 
                   ? parseFloat(value.replace(',', '.')) 
                   : value;
    
    if (isNaN(numValue) || numValue === null || !isFinite(numValue)) {
        return '-';
    }

    const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2, 
        maximumFractionDigits: 4, 
        useGrouping: true,
    });

    let formatted = formatter.format(numValue);

    const decimalIndex = formatted.indexOf(',');
    if (decimalIndex !== -1) {
        while (formatted.endsWith('0') && formatted.length > decimalIndex + 3) {
            formatted = formatted.substring(0, formatted.length - 1);
        }
    }
    
    return formatted;
};

export const formatPriceSmart = (price: number | null | undefined): string => {
    if (price === null || price === undefined || isNaN(price) || !isFinite(price)) {
        return '-';
    }
    return formatPriceValue(price);
};

export const formatPrice = (price: number | null): string => {
    if (price === null || isNaN(price)) return '-';
    return `R$ ${formatPriceValue(price)}`;
};

/**
 * Retorna a classe de cor baseada no valor da diferença.
 * > 0: Vermelho (mais caro)
 * < 0: Verde (mais barato)
 * ~ 0: Neutro
 */
export const getDiffColorClass = (val: number | null, inverse: boolean = false): string => {
    if (val === null || isNaN(val)) return 'text-slate-500';
    if (Math.abs(val) < 0.00001) return 'text-slate-500'; // Neutro/Igual
    
    // Padrão: Valor positivo = Ruim (mais caro), Valor negativo = Bom (mais barato)
    const isBad = val > 0;
    
    if (inverse) { // Inverso: Valor positivo = Bom (ex: lucro)
        return isBad ? 'text-emerald-400' : 'text-rose-400';
    }
    
    return isBad ? 'text-rose-400' : 'text-emerald-400';
};

export const formatDiffCurrency = (val: number | null): string => {
    if (val === null || isNaN(val)) return '-';
    const abs = Math.abs(val);
    const sign = val > 0.00001 ? '+' : val < -0.00001 ? '-' : '';
    return `${sign}${formatPriceSmart(abs)}`; 
};

export const formatDiffPercent = (val: number | null): string => {
    if (val === null || isNaN(val)) return '-';
    const sign = val > 0 ? '+' : val < 0 ? '' : '';
    return `${sign}${val.toFixed(2).replace('.', ',')}%`;
};

// Helpers para Histórico (com setas)
export const formatDeltaForDisplay = (delta: number | null): { colorClass: string; arrow: string; formattedValue: string } | null => {
    if (delta === null || isNaN(delta)) return null;
    
    const isDecrease = delta < 0;
    const isIncrease = delta > 0;
    
    let colorClass = 'text-slate-400';
    if (isDecrease) colorClass = 'text-emerald-400';
    else if (isIncrease) colorClass = 'text-rose-400';

    const arrow = isDecrease ? '↓' : (isIncrease ? '↑' : '');
    const formattedValue = `${Math.abs(delta).toFixed(2).replace('.', ',')}%`;

    return { colorClass, arrow, formattedValue };
};

export const formatPriceDifferenceForDisplay = (delta: number | null): { colorClass: string; sign: string; formattedValue: string } | null => {
    if (delta === null || isNaN(delta)) return null;

    const sign = delta > 0.00001 ? '+' : (delta < -0.00001 ? '-' : '');
    const formattedValue = formatPriceValue(Math.abs(delta));

    let colorClass = 'text-slate-500'; 
    if (delta > 0.00001) colorClass = 'text-rose-400';
    else if (delta < -0.00001) colorClass = 'text-emerald-400';

    return { colorClass, sign, formattedValue };
};
