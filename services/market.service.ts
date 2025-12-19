
import { supabase } from '../supabaseClient';
import { FuelPriceRecord } from '../types';
import { formatDateForInput } from '../utils/dateUtils';

/**
 * Fetches the market prices for a specific base and date.
 * @param selectedBase - The operating base to query (e.g., "Betim - MG").
 * @param refDate - The reference date for the prices.
 * @returns A promise that resolves to the raw market data records.
 */
export const fetchMarketDataForDate = async (selectedBase: string, refDate: Date, signal?: AbortSignal): Promise<{ data: FuelPriceRecord[] | null, error: Error | null }> => {
    try {
        const formattedDate = formatDateForInput(refDate);
        
        let query = supabase
            .from('pplus_historico_precos_diarios')
            .select('Distribuidora, Base, fuel_type, price, Responsavel, data')
            .eq('Base', selectedBase)
            .eq('data', formattedDate);
        
        if (signal) {
            query = query.abortSignal(signal);
        }

        const { data, error } = await query.returns<FuelPriceRecord[]>();

        return { data, error: error as Error | null };
    } catch (err: any) {
        if (err.name === 'AbortError' || signal?.aborted) return { data: null, error: null };
        return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
};
