
import { supabase } from '../supabaseClient';
import type { UserContracts, ContractBase } from '../types';
import { mapFuelToCode, mapCodeToFuel } from '../utils/fuelMappers';

/**
 * Busca os contratos do usuário e calcula os contratos efetivos para uma base específica.
 * Lógica: Carrega contratos da base solicitada E contratos genéricos ('*').
 * Prioridade: Contrato específico da base > Contrato genérico (*).
 */
export const fetchUserContracts = async (userId: string, baseName?: string, signal?: AbortSignal): Promise<UserContracts> => {
    let query = supabase
        .from('pplus_contracts')
        .select('base_name, brand_name, product_name, base_ref, spread, updated_at')
        .eq('user_id', userId);

    // Se uma base for fornecida, filtramos por ela E pelo genérico '*'
    if (baseName) {
        query = query.in('base_name', [baseName, '*']);
    }

    if (signal) {
        query = query.abortSignal(signal);
    }

    const { data, error } = await query;

    if (error) {
        // Verifica se o erro é um AbortError (cancelamento de requisição)
        // O Supabase/Postgrest pode retornar erros com mensagens variadas para aborts.
        if (error.message && (error.message.includes('AbortError') || error.message.includes('aborted') || error.code === '20')) {
             // Lança como exceção para ser capturado pelo chamador, mas evita log de erro
             // Usamos DOMException para manter compatibilidade com verificações padrão de AbortError
             throw new DOMException('Aborted', 'AbortError');
        }

        // Safe logging to avoid [object Object]
        console.error("[Contracts Service] Fetch Error:", JSON.stringify(error, null, 2));
        throw new Error(`Erro ao carregar contratos: ${error.message}`);
    }

    const contracts: UserContracts = {};

    // Helper para processar o registro e adicionar ao mapa
    const processRow = (row: any) => {
        // MAPPER: Converte código do banco ('GC') para nome da UI ('Gasolina Comum') para uso no frontend
        const uiProductName = mapCodeToFuel(row.product_name);

        if (!contracts[row.brand_name]) {
            contracts[row.brand_name] = {};
        }
        contracts[row.brand_name][uiProductName] = {
            base: row.base_ref as ContractBase,
            spread: Number(row.spread),
            updatedAt: row.updated_at
        };
    };

    // 1. Processa primeiro os genéricos ('*') para servirem de base
    const genericContracts = (data || []).filter((r: any) => r.base_name === '*');
    genericContracts.forEach(processRow);

    // 2. Processa os específicos da base selecionada (sobrescreve os genéricos se houver conflito)
    if (baseName) {
        const specificContracts = (data || []).filter((r: any) => r.base_name === baseName);
        specificContracts.forEach(processRow);
    }

    return contracts;
};

/**
 * Salva múltiplos contratos de uma vez (Upsert)
 */
export const upsertUserContracts = async (
    userId: string, 
    baseName: string,
    items: Array<{ brand_name: string; product_name: string; base_ref: ContractBase; spread: number }>
) => {
    const rowsToInsert = items.map(item => ({
        user_id: userId,
        base_name: baseName, 
        brand_name: item.brand_name,
        // MAPPER: Converte nome da UI ('Gasolina Comum') para código do banco ('GC')
        product_name: mapFuelToCode(item.product_name), 
        base_ref: item.base_ref,
        spread: item.spread,
        updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
        .from('pplus_contracts')
        .upsert(rowsToInsert, {
            // Constraint correta para evitar duplicação
            onConflict: 'user_id,base_name,brand_name,product_name'
        });

    if (error) {
        console.error("[Contracts Service] Batch Upsert Error:", JSON.stringify(error, null, 2));
        throw new Error(`Erro ao salvar contratos: ${error.message}`);
    }
};

/**
 * Upsert a single contract
 */
export const upsertContract = async (
    userId: string, 
    baseName: string,
    brandName: string, 
    productName: string, 
    base: ContractBase, 
    spread: number
) => {
    const { error } = await supabase
        .from('pplus_contracts')
        .upsert({
            user_id: userId,
            base_name: baseName,
            brand_name: brandName,
            // MAPPER: Converte para código
            product_name: mapFuelToCode(productName),
            base_ref: base,
            spread: spread,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id,base_name,brand_name,product_name'
        });

    if (error) {
        console.error("[Contracts Service] Upsert Error:", JSON.stringify(error, null, 2));
        throw new Error(`Erro ao salvar contrato: ${error.message}`);
    }
};

/**
 * Delete a single contract
 */
export const deleteContract = async (userId: string, baseName: string, brandName: string, productName: string) => {
    const { error } = await supabase
        .from('pplus_contracts')
        .delete()
        .match({
            user_id: userId,
            base_name: baseName,
            brand_name: brandName,
            // MAPPER: Converte para código para encontrar o registro correto
            product_name: mapFuelToCode(productName)
        });

    if (error) {
        console.error("[Contracts Service] Delete Error:", JSON.stringify(error, null, 2));
        throw new Error(`Erro ao remover contrato: ${error.message}`);
    }
};

/**
 * Batch upsert contracts (from import / full JSON)
 */
export const batchUpsertContracts = async (userId: string, contracts: UserContracts, defaultBase: string = '*') => {
    const rowsToInsert: any[] = [];

    Object.keys(contracts).forEach(brand => {
        const products = contracts[brand];
        Object.keys(products).forEach(product => {
            const rule = products[product];
            if (rule && rule.base && typeof rule.spread === 'number') {
                rowsToInsert.push({
                    user_id: userId,
                    base_name: defaultBase, 
                    brand_name: brand,
                    // MAPPER: Converte para código
                    product_name: mapFuelToCode(product),
                    base_ref: rule.base,
                    spread: rule.spread,
                    updated_at: new Date().toISOString()
                });
            }
        });
    });

    if (rowsToInsert.length === 0) return;

    const { error } = await supabase
        .from('pplus_contracts')
        .upsert(rowsToInsert, {
            onConflict: 'user_id,base_name,brand_name,product_name'
        });

    if (error) {
        console.error("[Contracts Service] Import Error:", JSON.stringify(error, null, 2));
        throw new Error(`Erro ao importar contratos: ${error.message}`);
    }
};
