
import React, { useState, useEffect } from 'react';
import type { BrandContracts, ContractBase } from '../../types';
import { FUEL_PRODUCTS } from '../../constants/fuels';

interface ContractEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    brandName: string;
    existingContracts: BrandContracts;
    onSave: (fuel: string, base: ContractBase, spread: number) => Promise<any>;
    onRemove: (fuel: string) => Promise<any>;
}

const FUEL_LABELS: Record<string, string> = {
    'Gasolina Comum': 'GC',
    'Gasolina Aditivada': 'GA',
    'Etanol': 'ET',
    'Diesel S10': 'S10',
    'Diesel S500': 'S500',
};

const ContractEditModal: React.FC<ContractEditModalProps> = ({ 
    isOpen, onClose, brandName, existingContracts, onSave, onRemove 
}) => {
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h3 className="text-lg font-bold text-slate-100">
                        Contratos: <span className="text-emerald-400">{brandName}</span>
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-xs text-slate-500 mb-4 bg-slate-800/50 p-2 rounded border border-slate-700">
                        Defina o <strong>Spread</strong> (valor fixo em R$) a ser somado sobre a base escolhida.
                        Limite: R$ 0,00 a R$ 0,20. As alterações são salvas automaticamente ao sair do campo.
                    </p>

                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-slate-500 border-b border-slate-800">
                                <th className="pb-2 font-medium">Combustível</th>
                                <th className="pb-2 font-medium">Base</th>
                                <th className="pb-2 font-medium text-right">Spread (R$)</th>
                                <th className="pb-2 font-medium text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {FUEL_PRODUCTS.map(fuel => {
                                const contract = existingContracts[fuel];
                                return (
                                    <ContractRow 
                                        key={fuel} 
                                        fuel={fuel} 
                                        contract={contract} 
                                        onSave={onSave}
                                        onRemove={onRemove}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

const ContractRow: React.FC<{ 
    fuel: string, 
    contract: any, 
    onSave: (f: string, b: ContractBase, s: number) => Promise<any>,
    onRemove: (f: string) => Promise<any>
}> = ({ fuel, contract, onSave, onRemove }) => {
    const [base, setBase] = useState<ContractBase>(contract?.base || 'AVG');
    const [spreadStr, setSpreadStr] = useState<string>(contract?.spread?.toFixed(3) || '');
    const [error, setError] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState(false);

    // Update local state if contract changes externally (e.g. after refresh)
    useEffect(() => {
        if (contract) {
            setBase(contract.base);
            setSpreadStr(contract.spread.toFixed(3));
        } else {
            // Se não tem contrato, mantém o que o usuário está digitando ou limpa se for refresh limpo
            if (!isSaving) {
                setBase('AVG');
            }
        }
    }, [contract]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSave = async () => {
        // Se estiver vazio e não tinha contrato antes, não faz nada
        if (!spreadStr && !contract) return;
        
        const val = parseFloat(spreadStr.replace(',', '.'));
        
        // Se apagou o valor e tinha contrato, talvez queira remover? 
        // Por segurança, exigimos clique no botão remover, ou apenas não salva se inválido.
        
        if (isNaN(val) || val < 0 || val > 0.20) {
            if (spreadStr !== '') setError(true);
            return;
        }
        
        setError(false);
        setIsSaving(true);
        try {
            await onSave(fuel, base, val);
        } catch (e) {
            setError(true);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBlur = () => {
        handleSave();
    };

    const handleRemove = async () => {
        setIsSaving(true);
        await onRemove(fuel);
        setSpreadStr('');
        setIsSaving(false);
    };

    return (
        <tr className="group hover:bg-slate-800/30">
            <td className="py-3 font-medium text-slate-300">
                {FUEL_LABELS[fuel] || fuel}
                <div className="text-[10px] text-slate-500 font-normal hidden sm:block">{fuel}</div>
            </td>
            <td className="py-3">
                <select 
                    value={base} 
                    onChange={e => { 
                        setBase(e.target.value as ContractBase); 
                        // Trigger save effect slightly delayed to allow state update or handle via useEffect dep
                        // But handling direct call here is safer with current value
                    }}
                    onBlur={handleBlur} // Salva ao sair do select também
                    disabled={isSaving}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
                >
                    <option value="MIN">Mínimo</option>
                    <option value="AVG">Média</option>
                </select>
            </td>
            <td className="py-3 text-right relative">
                <input 
                    type="text" 
                    inputMode="decimal"
                    value={spreadStr}
                    onChange={e => {
                        setSpreadStr(e.target.value);
                        setError(false);
                    }}
                    onBlur={handleBlur}
                    disabled={isSaving}
                    placeholder="0.000"
                    className={`w-20 bg-slate-900 border text-right text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 transition-all
                        ${error ? 'border-rose-500 focus:ring-rose-500 text-rose-400' : 'border-slate-700 focus:ring-emerald-500 text-emerald-400 font-bold'}
                        ${isSaving ? 'opacity-50' : ''}
                    `}
                />
            </td>
            <td className="py-3 text-center">
                {isSaving ? (
                    <svg className="animate-spin h-4 w-4 text-emerald-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : contract ? (
                    <div className="flex flex-col items-center">
                        <button onClick={handleRemove} className="text-slate-500 hover:text-rose-400 transition-colors" title="Remover contrato">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                        <span className="text-[9px] text-slate-600 mt-1">
                            {new Date(contract.updatedAt).toLocaleDateString('pt-BR')}
                        </span>
                    </div>
                ) : (
                    <span className="text-slate-700 text-[10px]">•</span>
                )}
            </td>
        </tr>
    );
};

export default ContractEditModal;
