
import { useState, useEffect, useCallback } from 'react';
import type { UserContracts, ContractBase } from '../types';
import * as contractsService from '../services/contracts.service';

/**
 * Hook para gerenciar contratos.
 * @param userId ID do usuário
 * @param baseName (Opcional) Se fornecido, o hook carrega os contratos efetivos para essa base (Combinando Específicos + Genéricos '*').
 */
export const useContracts = (userId: string | undefined, baseName?: string) => {
    const [contracts, setContracts] = useState<UserContracts>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getSafeErrorMessage = (err: any): string => {
        if (typeof err === 'string') return err;
        if (err?.message) {
             if (typeof err.message === 'object') {
                 try { return JSON.stringify(err.message); } catch { return String(err.message); }
             }
             return String(err.message);
        }
        return 'Erro desconhecido ao processar contratos.';
    };

    // Carrega contratos do Supabase
    const loadContracts = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        
        try {
            setLoading(true);
            // Passa a baseName para o serviço resolver a prioridade (* vs Base Específica)
            const data = await contractsService.fetchUserContracts(userId, baseName);
            setContracts(data);
            setError(null);
        } catch (err: any) {
            console.error("Failed to load contracts:", err);
            setError(getSafeErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [userId, baseName]);

    useEffect(() => {
        loadContracts();
    }, [loadContracts]);

    const saveContract = useCallback(async (targetBase: string, brandName: string, fuelType: string, base: ContractBase, spread: number) => {
        if (!userId) return;
        try {
            await contractsService.upsertContract(userId, targetBase, brandName, fuelType, base, spread);
            await loadContracts(); 
            return true;
        } catch (err: any) {
            console.error("Failed to save contract:", err);
            throw err;
        }
    }, [userId, loadContracts]);

    const removeContract = useCallback(async (targetBase: string, brandName: string, fuelType: string) => {
        if (!userId) return;
        try {
            await contractsService.deleteContract(userId, targetBase, brandName, fuelType);
            await loadContracts();
            return true;
        } catch (err: any) {
            console.error("Failed to remove contract:", err);
            throw err;
        }
    }, [userId, loadContracts]);

    const importContracts = useCallback(async (jsonString: string) => {
        if (!userId) return false;
        try {
            const parsed: UserContracts = JSON.parse(jsonString);
            if (typeof parsed !== 'object' || parsed === null) throw new Error("JSON inválido");
            
            // Importa como genérico '*' por padrão se não houver contexto de base
            await contractsService.batchUpsertContracts(userId, parsed, baseName || '*');
            await loadContracts();
            return true;
        } catch (e) {
            console.error("Invalid JSON or DB error during import", e);
            return false;
        }
    }, [userId, baseName, loadContracts]);

    const exportContracts = useCallback(() => {
        return JSON.stringify(contracts, null, 2);
    }, [contracts]);

    return {
        contracts,
        loading,
        error,
        saveContract,
        removeContract,
        importContracts,
        exportContracts,
        refreshContracts: loadContracts
    };
};
