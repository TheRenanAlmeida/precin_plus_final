import { supabase } from '../supabaseClient';
import type { UserProfile, BrandName } from '../types';
import { formatDateForInput } from '../utils/dateUtils';

// Type definitions specific to this service
type UserPricesResponse = {
    prices: { [key in BrandName]?: { [product: string]: number } };
    inputs: { [key in BrandName]?: { [product: string]: string } };
};

type UserPriceRecord = {
    brand_name: string;
    product_name: string;
    price: number | null;
};

/**
 * Fetches the prices quoted by the user for a specific date.
 * @param userId - The ID of the logged-in user.
 * @param date - The date for which to fetch prices.
 * @returns An object containing the prices as numbers and as formatted input strings.
 */
export const fetchUserDailyPricesForDate = async (userId: string, date: Date, signal?: AbortSignal): Promise<UserPricesResponse> => {
    if (!userId) {
        return { prices: {}, inputs: {} };
    }

    const formattedDate = formatDateForInput(date);

    let query = supabase
        .from('pplus_user_daily_prices')
        .select('brand_name, product_name, price')
        .eq('user_id', userId)
        .eq('price_date', formattedDate);
    
    if (signal) {
        query = query.abortSignal(signal);
    }

    const { data: userPrices, error } = await query.returns<UserPriceRecord[]>();

    if (error) {
        // Verifica se o erro é devido ao cancelamento da requisição (AbortError)
        // O Supabase/Postgrest pode retornar erros com mensagens variadas para aborts.
        if (error.message && (error.message.includes('AbortError') || error.message.includes('aborted'))) {
             // Lança como um DOMException AbortError padrão para ser capturado silenciosamente pelo hook
             throw new DOMException('Aborted', 'AbortError');
        }

        // Aprimora o log para exibir a mensagem real do erro, evitando [object Object].
        console.error("Error loading saved daily prices:", error.message || error);
        // Lança o erro para ser tratado pela camada que chamou o serviço (o hook).
        throw error;
    }

    const loadedPrices: UserPricesResponse['prices'] = {};
    const loadedInputs: UserPricesResponse['inputs'] = {};

    (userPrices ?? []).forEach(item => {
        const { brand_name, product_name, price } = item;
        if (!brand_name || !product_name || price === null) return;

        if (!loadedPrices[brand_name]) {
            loadedPrices[brand_name] = {};
            loadedInputs[brand_name] = {};
        }

        const priceNum = Number(price);
        if (!isNaN(priceNum)) {
            loadedPrices[brand_name]![product_name] = priceNum;
            const formattedValue = priceNum.toFixed(4).replace('.', ',');
            loadedInputs[brand_name]![product_name] = formattedValue;
        }
    });

    return { prices: loadedPrices, inputs: loadedInputs };
};


/**
 * Saves or updates the user's daily price quotes in the database.
 * @param allBrandPrices - An object containing all the prices to be saved.
 * @param userProfile - The complete profile of the logged-in user.
 * @param refDate - The reference date for the quotes.
 * @param selectedBase - The currently selected operating base.
 * @returns The result from the Supabase upsert operation.
 */
export const saveUserDailyPrices = async (
    allBrandPrices: { [key in BrandName]?: { [product: string]: number } },
    userProfile: UserProfile,
    refDate: Date,
    selectedBase: string
) => {
    const recordsToInsert: {
        user_id: string;
        user_email: string;
        price_date: string;
        base_name: string;
        brand_name: string;
        product_name: string;
        price: number;
    }[] = [];

    const currentDate = formatDateForInput(refDate);

    Object.keys(allBrandPrices).forEach(brand => {
        const productPrices = allBrandPrices[brand as BrandName];
        if (!productPrices) return;

        const preference = userProfile.preferencias?.find(p => p.bandeira === brand);
        const base = preference ? preference.base : selectedBase;

        if (!base) {
            console.warn(`Base for brand "${brand}" not found. Skipping save for this brand.`);
            return;
        }

        Object.keys(productPrices).forEach(product => {
            const price = productPrices[product];
            if (price && price > 0) {
                recordsToInsert.push({
                    user_id: userProfile.id,
                    user_email: userProfile.email,
                    price_date: currentDate,
                    base_name: base,
                    brand_name: brand,
                    product_name: product,
                    price: price,
                });
            }
        });
    });

    if (recordsToInsert.length === 0) {
        return { error: null };
    }

    return await supabase
        .from('pplus_user_daily_prices')
        .upsert(recordsToInsert, {
            onConflict: 'user_id, price_date, base_name, brand_name, product_name',
        });
};