import { supabase } from '../supabaseClient';
import { DistributorDBStyle } from '../types';

type DistributorRecord = { Name: string; imagem: string | null };

/**
 * Fetches the list of all distributors with their images and all custom visual styles.
 * This function consolidates two separate Supabase calls into one service endpoint.
 * @returns An object containing arrays for distributors data and styles data.
 */
export const fetchDistributorsAndStyles = async (signal?: AbortSignal): Promise<{
    distributorsData: DistributorRecord[] | null;
    stylesData: DistributorDBStyle[] | null;
    distributorsError: Error | null;
    stylesError: Error | null;
}> => {
    try {
        let distributorsQuery = supabase
            .from('Distribuidoras')
            .select('Name, imagem');
        if (signal) {
            distributorsQuery = distributorsQuery.abortSignal(signal);
        }
        const distributorsPromise = distributorsQuery.returns<DistributorRecord[]>();

        let stylesQuery = supabase
            .from('pplus_distributor_styles')
            .select('name, bg_color, text_color, shadow_style');
        if (signal) {
            stylesQuery = stylesQuery.abortSignal(signal);
        }
        const stylesPromise = stylesQuery.returns<DistributorDBStyle[]>();

        const [distributorsResult, stylesResult] = await Promise.all([distributorsPromise, stylesPromise]);

        return {
            distributorsData: distributorsResult.data,
            stylesData: stylesResult.data,
            distributorsError: distributorsResult.error as Error | null,
            stylesError: stylesResult.error as Error | null,
        };
    } catch (error: any) {
        // Rethrow AbortError so the caller can handle it (ignore it)
        if (error.name === 'AbortError' || error.message?.includes('Aborted') || error.message?.includes('aborted')) {
            throw error;
        }
        console.error('Unexpected error in fetchDistributorsAndStyles:', error);
        return {
            distributorsData: null,
            stylesData: null,
            distributorsError: new Error('Failed to fetch distributors data.'),
            stylesError: new Error('Failed to fetch styles data.'),
        };
    }
};