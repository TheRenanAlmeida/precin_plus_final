export type DailyPoint = {
  date: string; // 'YYYY-MM-DD'
  avg: number;
};

export interface SeasonDetectionOptions {
  fastShockThresholdPct?: number;    // 0.009 = 0,9%
  gradualWindowDays?: number;        // 10
  gradualAccumThresholdPct?: number; // 0.012 = 1,2% acumulado
  gradualMinSameDirection?: number;  // 7 (de 10)
  recentDaysLookback?: number;       // 90
  fallbackDays?: number;             // 30
}

export interface SeasonDetectionResult {
  seasonStartIndex: number;
  seasonStartDate: string;
  reason: 'fast' | 'gradual' | 'fallback';
}

/**
 * Suaviza a série com média móvel de 3 dias (bordas tratadas com menos pontos).
 */
function smoothSeries(points: DailyPoint[]): number[] {
  const n = points.length;
  const smoothed: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - 1; j <= i + 1; j++) {
      if (j >= 0 && j < n && points[j].avg > 0) {
        sum += points[j].avg;
        count++;
      }
    }
    smoothed[i] = count > 0 ? sum / count : points[i].avg;
  }

  return smoothed;
}

/**
 * Calcula diferença relativa absoluta entre dias consecutivos.
 */
function computeDailyRelChanges(smoothed: number[]): number[] {
  const n = smoothed.length;
  const changes: number[] = new Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const prev = smoothed[i - 1];
    const cur = smoothed[i];
    if (prev > 0 && cur > 0) {
      changes[i] = Math.abs(cur - prev) / prev;
    } else {
      changes[i] = 0;
    }
  }

  return changes;
}

/**
 * Detecta início da temporada (último grande reajuste rápido ou gradual).
 */
export function detectSeasonStartIndex(
  points: DailyPoint[],
  options: SeasonDetectionOptions = {}
): SeasonDetectionResult | null {
  const n = points.length;
  if (n < 5) return null;

  const {
    fastShockThresholdPct = 0.009,
    gradualWindowDays = 10,
    gradualAccumThresholdPct = 0.012,
    gradualMinSameDirection = 7,
    recentDaysLookback = 90,
    fallbackDays = 30,
  } = options;

  const smoothed = smoothSeries(points);
  const dailyChanges = computeDailyRelChanges(smoothed);

  const candidatesFast: number[] = [];
  const candidatesGradual: number[] = [];

  // Índice máximo considerado "recente" (posição no array, não data absoluta)
  const latestIndex = n - 1;

  // 1) Reajustes rápidos: variação diária >= fastShockThresholdPct
  for (let i = 1; i < n; i++) {
    const change = dailyChanges[i];
    if (change >= fastShockThresholdPct) {
      candidatesFast.push(i);
    }
  }

  // 2) Reajustes graduais: janela de gradualWindowDays
  for (let t = gradualWindowDays; t < n; t++) {
    const start = t - gradualWindowDays;
    const base = smoothed[start];
    const now = smoothed[t];

    if (!(base > 0 && now > 0)) continue;

    const accum = (now - base) / base; // pode ser + ou -
    if (Math.abs(accum) < gradualAccumThresholdPct) continue;

    // Conta quantos passos diários têm a mesma direção
    let sameDirCount = 0;
    const direction = accum > 0 ? 1 : -1;

    for (let i = start + 1; i <= t; i++) {
      const step = smoothed[i] - smoothed[i - 1];
      if (step * direction > 0) {
        sameDirCount++;
      }
    }

    if (sameDirCount >= gradualMinSameDirection) {
      candidatesGradual.push(t);
    }
  }

  // 3) Filtra candidatos recentes (por tempo) – usando índice como proxy de tempo
  //    Assumindo série diária sem buracos grandes.
  const maxLookback = Math.min(recentDaysLookback, n - 1);
  const minRecentIndex = Math.max(0, latestIndex - maxLookback);

  const recentCandidates: { index: number; reason: 'fast' | 'gradual' }[] = [];

  for (const idx of candidatesFast) {
    if (idx >= minRecentIndex) {
      recentCandidates.push({ index: idx, reason: 'fast' });
    }
  }
  for (const idx of candidatesGradual) {
    if (idx >= minRecentIndex) {
      recentCandidates.push({ index: idx, reason: 'gradual' });
    }
  }

  if (recentCandidates.length > 0) {
    // pega o com índice mais alto (mais recente)
    let best = recentCandidates[0];
    for (const c of recentCandidates) {
      if (c.index > best.index) best = c;
    }

    return {
      seasonStartIndex: best.index,
      seasonStartDate: points[best.index].date,
      reason: best.reason,
    };
  }

  // 4) Fallback: últimos fallbackDays dias formam a temporada
  const startIdxFallback = Math.max(0, latestIndex - fallbackDays);
  return {
    seasonStartIndex: startIdxFallback,
    seasonStartDate: points[startIdxFallback].date,
    reason: 'fallback',
  };
}