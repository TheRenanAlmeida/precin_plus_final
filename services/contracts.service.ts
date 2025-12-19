import { supabase } from '../supabaseClient';
import type { UserContracts, ContractBase } from '../types';
import { mapFuelToCode, mapCodeToFuel } from '../utils/fuelMappers';

const norm = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const clampSpread = (spread: number): number => {
  if (!Number.isFinite(spread)) return 0;
  const clamped = Math.max(0, Math.min(0.99, spread));
  return parseFloat(clamped.toFixed(4));
};

const isContractBase = (v: any): v is ContractBase => v === 'MIN' || v === 'AVG';

/**
 * Mapeia siglas que podem existir no banco por inserções manuais ou legadas
 */
const legacyCandidates = (code: string) => {
  const c = code.trim().toUpperCase();
  const set = new Set<string>([c]);

  // Etanol legado
  if (c === 'E') {
    set.add('ET');
    set.add('ETA');
  }

  // Diesel legado
  if (c === 'S10') set.add('D10');
  if (c === 'S500') set.add('D500');

  return Array.from(set);
};

export const fetchUserContracts = async (
  userId: string,
  baseName?: string,
  signal?: AbortSignal
): Promise<UserContracts> => {
  const safeBase = norm(baseName);
  if (!safeBase || safeBase === '*') return {};

  let query = supabase
    .from('pplus_contracts')
    .select('id, base_name, brand_name, product_name, base_ref, spread, updated_at')
    .eq('user_id', userId)
    .eq('base_name', safeBase);

  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;

  if (error) {
    if (error.message?.includes('AbortError') || error.message?.includes('aborted')) {
      throw new DOMException('Aborted', 'AbortError');
    }
    throw new Error(error.message || `Erro ao carregar contratos.`);
  }

  const contracts: UserContracts = {};
  (data || []).forEach((row: any) => {
    const brand = norm(row.brand_name);
    const uiFuelName = mapCodeToFuel(norm(row.product_name));
    
    if (!contracts[brand]) contracts[brand] = {};
    
    contracts[brand][uiFuelName] = {
      id: row.id,
      base: isContractBase(row.base_ref) ? row.base_ref : 'AVG',
      spread: clampSpread(Number(row.spread)),
      updatedAt: row.updated_at,
    };
  });

  return contracts;
};

/**
 * IMPLEMENTAÇÃO V0 DEFINITIVA - RECONSTRUÍDA DO ZERO
 * Exclui um contrato e retorna a quantidade de linhas afetadas.
 */
export const deleteContractSafe = async (params: {
  userId: string;
  baseName: string;
  brandName: string;
  productName: string; // nome UI ("Gasolina Comum", etc.)
  contractId?: string;
}): Promise<number> => {
  const userId = norm(params.userId);
  const baseName = norm(params.baseName);
  const brandName = norm(params.brandName);
  const productName = norm(params.productName);
  const contractId = norm(params.contractId);

  if (!userId) throw new Error('Delete: userId vazio.');
  if (!baseName || baseName === '*') throw new Error('Delete: baseName inválida.');
  if (!brandName) throw new Error('Delete: brandName vazio.');
  if (!productName) throw new Error('Delete: productName vazio.');

  const code = norm(mapFuelToCode(productName)).toUpperCase();
  const productCandidates = legacyCandidates(code);

  console.log('[SERVICE DELETE] start', { contractId, userId, baseName, brandName, productName, candidates: productCandidates });

  // 1) Melhor caminho: por ID
  if (contractId && contractId.length > 20) {
    const { data, error } = await supabase
      .from('pplus_contracts')
      .delete()
      .eq('id', contractId)
      .eq('user_id', userId) // garante owner (RLS)
      .select('id');

    console.log('[SERVICE DELETE] by id result', { deleted: data?.length, error });

    if (error) throw new Error(error.message);

    const deleted = Array.isArray(data) ? data.length : 0;
    if (deleted > 0) return deleted;
  }

  // 2) Fallback por chave composta
  const { data: data2, error: error2 } = await supabase
    .from('pplus_contracts')
    .delete()
    .eq('user_id', userId)
    .eq('base_name', baseName)
    .ilike('brand_name', brandName) // case-insensitive
    .in('product_name', productCandidates)
    .select('id');

  console.log('[SERVICE DELETE] fallback result', { deleted: data2?.length, error: error2 });

  if (error2) throw new Error(error2.message);

  return Array.isArray(data2) ? data2.length : 0;
};

export const upsertUserContracts = async (
  userId: string,
  baseName: string,
  items: Array<{ brand_name: string; product_name: string; base_ref: ContractBase; spread: number }>
) => {
  const safeBase = norm(baseName);
  const rowsToInsert = items.map((item) => ({
    user_id: userId,
    base_name: safeBase,
    brand_name: norm(item.brand_name),
    product_name: mapFuelToCode(item.product_name), 
    base_ref: item.base_ref,
    spread: clampSpread(item.spread), 
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('pplus_contracts').upsert(rowsToInsert, {
    onConflict: 'user_id,base_name,brand_name,product_name',
  });

  if (error) throw new Error(error.message);
};

export const batchUpsertContracts = async (userId: string, contracts: UserContracts, targetBase: string) => {
  const rowsToInsert: any[] = [];
  Object.keys(contracts).forEach(brand => {
    Object.keys(contracts[brand]).forEach(fuelName => {
      const rule = contracts[brand][fuelName];
      rowsToInsert.push({
        user_id: userId,
        base_name: targetBase,
        brand_name: brand,
        product_name: mapFuelToCode(fuelName),
        base_ref: rule.base,
        spread: clampSpread(rule.spread),
        updated_at: new Date().toISOString(),
      });
    });
  });

  if (rowsToInsert.length > 0) {
    await supabase.from('pplus_contracts').upsert(rowsToInsert, {
      onConflict: 'user_id,base_name,brand_name,product_name',
    });
  }
};