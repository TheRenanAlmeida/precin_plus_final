
import { useState, useEffect, useCallback } from 'react';
import type { UserContracts, ContractBase } from '../types';
import * as contractsService from '../services/contracts.service';

export const useContracts = (userId: string | undefined, baseName?: string) => {
    const [contracts, setContracts] = useState<UserContracts>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadContracts = useCallback(async () => {
        if (!userId || !baseName || baseName === '*') {
            setLoading(false);
            setContracts({});
            return;
        }
        
        try {
            setLoading(true);
            const data = await contractsService.fetchUserContracts(userId, baseName);
            setContracts(data);
            setError(null);
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setError(err?.message || 'Erro ao carregar contratos.');
        } finally {
            setLoading(false);
        }
    }, [userId, baseName]);

    useEffect(() => {
        loadContracts();
    }, [loadContracts]);

    const saveContract = useCallback(async (base: string, brand: string, fuel: string, baseRef: ContractBase, spread: number) => {
        if (!userId || !base || base === '*') return;
        try {
            await contractsService.upsertUserContracts(userId, base, [{
                brand_name: brand,
                product_name: fuel,
                base_ref: baseRef,
                spread: spread
            }]);
            await loadContracts();
        } catch (err: any) {
            throw err;
        }
    }, [userId, loadContracts]);

    const removeContract = useCallback(async (params: { contractId?: string, brandName?: string, productName?: string }) => {
        if (!userId || !baseName) return false;
        
        try {
            // Garante que o userId do hook seja usado
            await contractsService.deleteContractSafe({
                userId,
                baseName,
                brandName: params.brandName || '',
                productName: params.productName || '',
                contractId: params.contractId
            });
            
            await loadContracts();
            return true;
        } catch (err: any) {
            console.error("Remove contract error:", err);
            throw err;
        }
    }, [userId, baseName, loadContracts]);

    const importContracts = useCallback(async (jsonString: string) => {
        if (!userId || !baseName || baseName === '*') return false;
        try {
            const parsed: UserContracts = JSON.parse(jsonString);
            await contractsService.batchUpsertContracts(userId, parsed, baseName);
            await loadContracts();
            return true;
        } catch (e) {
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
