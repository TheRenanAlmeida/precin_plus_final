


import type { DistributorStyle, MinPriceInfo, ProductPrices } from './types';

// --- Funções de Conversão de Cor ---

/**
 * Converte uma string de cor rgba() para o formato hexadecimal #RRGGBB.
 * Ignora o valor alfa (transparência).
 * Retorna uma cor cinza padrão se o formato de entrada for inválido.
 */
export const rgbaToHex = (rgba: string): string => {
    if (!rgba || !rgba.startsWith('rgba')) {
        // Se já for HEX ou outro formato, retorna como está ou um padrão
        return rgba.startsWith('#') ? rgba : '#cccccc';
    }
    const parts = rgba.substring(rgba.indexOf('(') + 1, rgba.lastIndexOf(')')).split(/,\s*/);
    if (parts.length < 3) return '#cccccc'; // Fallback

    const r = parseInt(parts[0], 10);
    const g = parseInt(parts[1], 10);
    const b = parseInt(parts[2], 10);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Converte uma string de cor hexadecimal #RRGGBB para o formato rgba(r, g, b, a).
 * Permite definir um valor alfa (transparência).
 */
export const hexToRgba = (hex: string, alpha: number = 1.0): string => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(204, 204, 204, ${alpha})`; // Fallback cinza

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
    // For small samples, IQR is not robust, so we use a simple average.
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
    // FIX: Replaced for...in with for...of to ensure type safety when iterating over object keys.
    for (const product of Object.keys(pricesByProduct)) {
        averages[product] = calculateIQRAverage(pricesByProduct[product]);
    }
    return averages;
};

export const findMinPriceInfo = (prices: ProductPrices): MinPriceInfo => {
  if (Object.keys(prices).length === 0) {
      return { minPrice: Infinity, distributors: [] };
  }
  
  // FIX: Used a type guard in the filter to correctly infer the type of `p` as `number` and resolve "Argument of type 'unknown' is not assignable" error.
  const allPrices = Object.values(prices).flat().filter((p): p is number => typeof p === 'number' && isFinite(p));
  if (allPrices.length === 0) {
      return { minPrice: Infinity, distributors: [] };
  }

  const minPrice = Math.min(...allPrices);
  // FIX: Rewrote the `distributors` logic using `Object.keys` and `filter` to provide more robust type inference and resolve potential "Property 'filter' does not exist on type 'unknown'" errors.
  const distributors = Object.keys(prices)
    .filter(distributor => {
        const priceArray = prices[distributor];
        return Array.isArray(priceArray) && priceArray.includes(minPrice);
    });
    
  return { minPrice, distributors: [...new Set(distributors)] };
};

/**
 * Calcula o preço máximo de mercado com base na regra de negócio especificada:
 * o maior valor entre os preços mínimos de cada distribuidora.
 * @param prices - Um objeto onde as chaves são nomes de distribuidoras e os valores são arrays de seus preços.
 * @returns O preço máximo calculado.
 */
export const calculateCustomMaxPrice = (prices: ProductPrices): number => {
    // Passo 1: Encontrar o preço mínimo para cada distribuidora.
    const minPricesPerDistributor = Object.values(prices)
        .map(priceArray => {
            // FIX: Add a type guard to ensure `priceArray` is an array before calling `.filter`, resolving potential "property does not exist on type 'unknown'" errors.
            if (!Array.isArray(priceArray)) {
                return null;
            }
            const validPrices = priceArray.filter((p): p is number => typeof p === 'number' && isFinite(p));
            return validPrices.length > 0 ? Math.min(...validPrices) : null;
        })
        .filter((p): p is number => p !== null);

    // Passo 2: Encontrar o máximo desses preços mínimos.
    if (minPricesPerDistributor.length === 0) {
        return 0;
    }

    const maxPrice = Math.max(...minPricesPerDistributor);
    return parseFloat(maxPrice.toFixed(4));
};


/**
 * Formata um valor numérico para o padrão de preço de combustível (pt-BR):
 * - Garante no mínimo 2 e no máximo 4 casas decimais.
 * - Remove zeros desnecessários no final (ex: 1,1230 -> 1,123).
 */
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

// --- History Page Formatting Helpers ---

export const formatPrice = (price: number | null): string => {
    if (price === null || isNaN(price)) return '-';
    return `R$ ${formatPriceValue(price)}`;
};

export const formatDeltaForDisplay = (delta: number | null): { colorClass: string; arrow: string; formattedValue: string } | null => {
    if (delta === null || isNaN(delta)) return null;
    
    const isDecrease = delta < 0;
    const isIncrease = delta > 0;
    
    let colorClass = 'text-gray-700';
    if (isDecrease) colorClass = 'text-green-600';
    else if (isIncrease) colorClass = 'text-red-600';

    const arrow = isDecrease ? '↓' : (isIncrease ? '↑' : '');
    const formattedValue = `${Math.abs(delta).toFixed(2).replace('.', ',')}%`;

    return { colorClass, arrow, formattedValue };
};

export const formatPriceDifferenceForDisplay = (delta: number | null): { colorClass: string; sign: string; formattedValue: string } | null => {
    if (delta === null || isNaN(delta)) return null;

    const sign = delta > 0.00001 ? '+' : (delta < -0.00001 ? '-' : '');
    const formattedValue = formatPriceValue(Math.abs(delta));

    let colorClass = 'text-gray-800'; // Neutral for zero
    if (delta > 0.00001) colorClass = 'text-red-600';
    else if (delta < -0.00001) colorClass = 'text-green-600';

    return { colorClass, sign, formattedValue };
};
