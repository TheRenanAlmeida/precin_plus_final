import { supabase } from '../supabaseClient';
import { FuelPriceRecord, UserHistoryChartRecord } from '../types';
import { formatDateForInput } from '../utils/dateUtils';

type DateRecord = { data: string | null };

/**
 * Fetches and processes the historical data required for the dashboard charts.
 * This includes calculating the appropriate date window and fetching both
 * market data and the user's price history within that window.
 * 
 * @param selectedBase - The operating base for the data.
 * @param refDate - The central reference date for the chart window.
 * @param selectedDistributors - A set of distributors to filter the market data by.
 * @param userId - The ID of the logged-in user.
 * @returns An object containing the raw market chart data and the user's history data.
 */
export const fetchChartDataForDashboard = async (
    selectedBase: string,
    refDate: Date,
    selectedDistributors: Set<string>,
    userId: string,
    signal?: AbortSignal
): Promise<{
    rawChartData: FuelPriceRecord[] | null;
    userHistoryChartData: UserHistoryChartRecord[] | null;
    error: string | null;
}> => {
    // FIX: Re-structured the Supabase query to apply the `.in()` filter before `.returns()` to prevent a type error. The `.in()` filter must be applied to the `PostgrestFilterBuilder` instance, not after the response has been transformed.
    let distinctDatesQueryBuilder = supabase
        .from('pplus_historico_precos_diarios')
        .select('data', { head: false })
        .eq('Base', selectedBase);

    if (selectedDistributors.size > 0) {
        distinctDatesQueryBuilder = distinctDatesQueryBuilder.in('Distribuidora', Array.from(selectedDistributors));
    }
    
    if (signal) {
        distinctDatesQueryBuilder = distinctDatesQueryBuilder.abortSignal(signal);
    }

    const { data: distinctDatesData, error: distinctDatesError } = await distinctDatesQueryBuilder
        .order('data', { ascending: true })
        .returns<DateRecord[]>();


    if (distinctDatesError) {
        return { rawChartData: null, userHistoryChartData: null, error: `Error fetching chart dates: ${distinctDatesError.message}` };
    }

    const L: string[] = Array.isArray(distinctDatesData)
        ? [...new Set(distinctDatesData.map(r => r.data).filter((d): d is string => typeof d === 'string'))]
        : [];
        
    if (L.length === 0) {
        return { rawChartData: [], userHistoryChartData: [], error: null };
    }

    // --- Date Window Calculation Logic ---
    const ref_date_str = formatDateForInput(refDate);
    let i = -1;
    for (let j = L.length - 1; j >= 0; j--) {
        if (L[j] <= ref_date_str) {
            i = j;
            break;
        }
    }
    if (i === -1) i = 0;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const refDateObj = new Date(ref_date_str + 'T12:00:00Z');
    const diffTime = today.getTime() - refDateObj.getTime();
    const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    const days_ahead = Math.min(diffDays, 10);

    let left = Math.max(0, i - (20 - days_ahead));
    let right = Math.min(L.length - 1, i + days_ahead);
    
    let currentSize = right - left + 1;
    if (L.length > currentSize && currentSize < 21) {
        const needed = 21 - currentSize;
        const canExpandLeft = left;
        const expandLeft = Math.min(needed, canExpandLeft);
        left -= expandLeft;
        
        currentSize = right - left + 1;
        if (currentSize < 21) {
            const stillNeeded = 21 - currentSize;
            const canExpandRight = (L.length - 1) - right;
            const expandRight = Math.min(stillNeeded, canExpandRight);
            right += expandRight;
        }
    }
    // --- End of Date Window Logic ---

    const finalDates = L.slice(left, right + 1);
    if (finalDates.length === 0) {
        return { rawChartData: [], userHistoryChartData: [], error: null };
    }

    // FIX: Re-structured the Supabase query to apply the `.in()` filter before `.returns()` to prevent a type error. The `.in()` filter must be applied to the `PostgrestFilterBuilder` instance, not after the response has been transformed.
    let marketChartQueryBuilder = supabase
        .from('pplus_historico_precos_diarios')
        .select('Distribuidora, fuel_type, price, data, Base, Responsavel')
        .eq('Base', selectedBase)
        .in('data', finalDates);

    if (selectedDistributors.size > 0) {
        marketChartQueryBuilder = marketChartQueryBuilder.in('Distribuidora', Array.from(selectedDistributors));
    }

    if (signal) {
        marketChartQueryBuilder = marketChartQueryBuilder.abortSignal(signal);
    }
    const marketChartQuery = marketChartQueryBuilder.returns<FuelPriceRecord[]>();

    let userChartQueryBuilder = supabase
        .from('pplus_user_daily_prices')
        .select('price_date, brand_name, product_name, price')
        .eq('user_id', userId)
        .eq('base_name', selectedBase)
        .in('price_date', finalDates);
    
    if (signal) {
        userChartQueryBuilder = userChartQueryBuilder.abortSignal(signal);
    }
    const userChartQuery = userChartQueryBuilder.returns<UserHistoryChartRecord[]>();

    const [marketChartResult, userChartResult] = await Promise.all([marketChartQuery, userChartQuery]);

    const chartError = marketChartResult.error ? `Market chart error: ${marketChartResult.error.message}` : null;
    const userHistoryError = userChartResult.error ? `User history error: ${userChartResult.error.message}` : null;

    return {
        rawChartData: marketChartResult.data || [],
        userHistoryChartData: userChartResult.data || [],
        error: [chartError, userHistoryError].filter(Boolean).join(' | ') || null,
    };
};