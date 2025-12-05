
import { calculateIQRAverage } from './dataHelpers';

export type DailyPoint = {
  date: string;
  avg: number;
};

export type GaugeRating =
  | 'muito_acima'
  | 'acima'
  | 'na_media'
  | 'abaixo'
  | 'muito_abaixo';

export interface PurchaseGaugeMetrics {
  windowDays: number;

  todayDate: string;
  todayPrice: number;

  medianPrice: number;
  idealPrice: number; // média dos melhores preços (10% mais baratos abaixo da mediana)
  minPrice: number;
  maxPrice: number;

  score: number;          // 0..1 (para uso genérico, mas o gauge agora usa diffPct)
  diffPct: number;        // Diferença percentual bruta (ex: 0.0013 para 0.13%)
  rating: GaugeRating;    // rótulo textual descritivo
  percentile: number;     // 0..1 (posição de hoje na janela: 0 = mais barato, 1 = mais caro)
  
  hasEnoughData: boolean;
}

// Interface simplificada para o objeto de dados do Chart.js que recebemos
export interface ChartJsData {
  labels: string[];
  datasets: { label: string; data: (number | null)[] }[];
}

function median(values: number[]): number {
  const arr = values
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  const n = arr.length;
  if (!n) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
}

/**
 * Calcula métricas avançadas de compra baseadas em ranking e percentil.
 * Define uma "Faixa Ideal" baseada nos 10% melhores preços recentes.
 */
export function computePurchaseGaugeMetrics(
  points: DailyPoint[],
  windowDays = 60
): PurchaseGaugeMetrics | null {
  if (!points || points.length === 0) return null;

  const n = points.length;
  const today = points[n - 1];
  if (!(today && today.avg > 0)) return null;

  // Recorte da janela temporal
  const startIndex = Math.max(0, n - windowDays);
  const windowPoints = points.slice(startIndex, n);
  
  // Filtra apenas valores válidos para estatística
  const prices = windowPoints.map((p) => p.avg).filter((v) => v > 0);

  // Se tivermos poucos dados, retornamos um estado básico indicando insuficiência
  if (prices.length < 5) {
    return {
      windowDays: prices.length,
      todayDate: today.date,
      todayPrice: today.avg,
      medianPrice: today.avg,
      idealPrice: today.avg,
      minPrice: today.avg,
      maxPrice: today.avg,
      score: 0.5,
      diffPct: 0,
      rating: 'na_media',
      percentile: 0.5,
      hasEnoughData: false,
    };
  }

  const todayPrice = today.avg;
  const sorted = [...prices].sort((a, b) => a - b); // Menor -> Maior
  
  const minPrice = sorted[0];
  const maxPrice = sorted[sorted.length - 1];
  const medianPrice = median(sorted);

  // Cálculo da Faixa Ideal:
  // 1. Pega todos os preços abaixo da mediana
  const bestCandidates = sorted.filter((p) => p < medianPrice);
  let idealPrice = medianPrice;

  if (bestCandidates.length > 0) {
    // 2. Desses, pega os 10% melhores (mais baratos), garantindo pelo menos 1
    const k = Math.max(1, Math.floor(bestCandidates.length * 0.1)); 
    const bestSlice = bestCandidates.slice(0, k);
    
    // 3. Média desses melhores dias
    idealPrice = bestSlice.reduce((acc, v) => acc + v, 0) / bestSlice.length;
  }

  // --- NOVA LÓGICA DE SENSIBILIDADE (Percentual) ---
  const diffPct = medianPrice > 0 ? (todayPrice - medianPrice) / medianPrice : 0; // ex: 0.0013 = 0.13%
  const diffPctAbs = Math.abs(diffPct);

  // 1) Score para o velocímetro (mantido para compatibilidade, mas o componente usará diffPct)
  const MAX_PCT = 0.02; 
  const norm = Math.max(-1, Math.min(1, diffPct / MAX_PCT));
  const score = (1 - norm) / 2;

  // 2) Classificação Textual (Rating) baseada em %
  let rating: GaugeRating;

  if (diffPctAbs < 0.001) {
    // Menos de 0.10% de diferença: NA MÉDIA
    rating = 'na_media';
  } else if (diffPctAbs < 0.008) {
    // Entre 0.10% e 0.80%: ACIMA / ABAIXO (sem "Muito")
    rating = diffPct > 0 ? 'acima' : 'abaixo';
  } else {
    // Mais de 0.80%: MUITO ACIMA / MUITO ABAIXO
    rating = diffPct > 0 ? 'muito_acima' : 'muito_abaixo';
  }

  // --- CÁLCULO DO PERCENTIL (Apenas para contexto textual) ---
  let idx = sorted.findIndex((p) => p >= todayPrice);
  if (idx === -1) idx = sorted.length - 1; 
  
  const percentile = sorted.length > 1 ? idx / (sorted.length - 1) : 0.5;

  return {
    windowDays: prices.length,
    todayDate: today.date,
    todayPrice,
    medianPrice,
    idealPrice,
    minPrice,
    maxPrice,
    score,
    diffPct,
    rating,
    percentile,
    hasEnoughData: true,
  };
}

/**
 * Constrói métricas do termômetro a partir dos dados do gráfico (Chart.js).
 */
export function buildGaugeMetricsFromChart(
  chartData: ChartJsData | null | undefined,
  windowDays = 21
): PurchaseGaugeMetrics | null {
  if (!chartData || !chartData.labels || chartData.labels.length === 0) return null;

  // Tenta achar o dataset "Preço Médio (IQR)", que é a nossa referência principal
  const avgDataset =
    chartData.datasets.find((d) => d.label === 'Preço Médio (IQR)') ??
    chartData.datasets[0]; 

  if (!avgDataset) return null;

  // Mapeia para o formato DailyPoint
  const points: DailyPoint[] = chartData.labels
    .map((date, idx) => {
      const v = avgDataset.data[idx];
      if (v === null || v === undefined || !Number.isFinite(v)) return null;
      return { date, avg: v as number };
    })
    .filter((p): p is DailyPoint => p !== null);

  if (points.length < 5) return null; // Precisa de um mínimo de dados

  // A janela efetiva é o menor entre o solicitado e o que temos no gráfico
  const effectiveWindow = Math.min(windowDays, points.length);

  return computePurchaseGaugeMetrics(points, effectiveWindow);
}
