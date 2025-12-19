
import { supabase } from '../supabaseClient';

export interface MarketDayStatus {
    sources: number;
    valid: boolean;
    lastValidDay: string | null;
}

// Cache em memória
const cache = new Map<string, { data: MarketDayStatus; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Gerenciamento de chamadas simultâneas (Dedupe)
const inFlight = new Map<string, Promise<MarketDayStatus | null>>();

/**
 * Consulta o status do mercado para uma base e data específicas usando a RPC única.
 * Implementa cache, dedupe e nova lógica de interpretação de fontes (0..3).
 */
export const getMarketDayStatus = async (
    baseName: string, 
    dayISO: string, 
    minSources = 3, 
    signal?: AbortSignal
): Promise<MarketDayStatus | null> => {
    const cacheKey = `${baseName}|${dayISO}|${minSources}`;
    
    // 1. Tenta recuperar do cache
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
        return cached.data;
    }

    // 2. Tenta recuperar promessa em andamento (Dedupe)
    if (inFlight.has(cacheKey)) {
        return inFlight.get(cacheKey)!;
    }

    // 3. Execução da chamada
    const promise = (async () => {
        try {
            console.count("[MarketDay] RPC call");
            console.time(`[MarketDay] ${cacheKey}`);

            const { data, error } = await supabase.rpc('pplus_market_day_status', { 
                p_base: baseName, 
                p_day: dayISO, 
                p_min_sources: minSources 
            }).abortSignal(signal || new AbortController().signal);

            console.timeEnd(`[MarketDay] ${cacheKey}`);

            if (error) {
                // AbortError não deve ser tratado como erro de lógica
                if (error.message?.includes('aborted') || signal?.aborted) return null;
                throw error;
            }

            const row = data?.[0];
            const sources = Number(row?.sources || 0);
            
            // Nova regra: sources é limitado a 3 no banco.
            // sources = 3 significa "3 ou mais fontes".
            const status: MarketDayStatus = {
                sources,
                valid: sources >= 3,
                lastValidDay: row?.last_valid_day || null
            };

            // Salva no cache
            cache.set(cacheKey, { data: status, expiry: Date.now() + CACHE_TTL });

            return status;
        } catch (err: any) {
            if (err.name === 'AbortError' || signal?.aborted) return null;
            console.error('Error in getMarketDayStatus:', err);
            // Fallback seguro em caso de erro real
            return { sources: 0, valid: false, lastValidDay: null };
        } finally {
            // Remove do mapa de inFlight ao terminar
            inFlight.delete(cacheKey);
        }
    })();

    inFlight.set(cacheKey, promise);
    return promise;
};

/**
 * Funções legadas mantidas para compatibilidade interna.
 */
export const getMarketSourcesCount = async (baseName: string, dayISO: string, signal?: AbortSignal): Promise<number> => {
    const status = await getMarketDayStatus(baseName, dayISO, 3, signal);
    return status ? status.sources : 0;
};
