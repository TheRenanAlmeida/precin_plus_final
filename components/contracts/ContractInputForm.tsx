
import React, { useState, useEffect } from 'react';
import { FUEL_PRODUCTS } from '../../constants/fuels';
import { UserContracts } from '../../types';
import { Tip } from '../common/Tip';
import { TOOLTIP } from '../../constants/tooltips';

interface ContractInputFormProps {
    brandName: string;
    existingContracts: UserContracts;
    onSave: (items: Array<{ brand_name: string; product_name: string; base_ref: 'MIN' | 'AVG'; spread: number }>) => Promise<void>;
    onRemove?: (productName: string) => Promise<void>;
    onCancel: () => void;
}

type LocalState = {
    [product: string]: {
        base_ref: 'MIN' | 'AVG';
        spreadStr: string; // Manter como string para controle do input
    }
};

const ContractInputForm: React.FC<ContractInputFormProps> = ({ brandName, existingContracts, onSave, onRemove, onCancel }) => {
    const [localState, setLocalState] = useState<LocalState>({});
    const [isSaving, setIsSaving] = useState(false);

    // Inicializa o estado local com os dados existentes ou defaults
    useEffect(() => {
        const brandData = existingContracts[brandName] || {};
        const initialState: LocalState = {};

        FUEL_PRODUCTS.forEach(product => {
            const existing = brandData[product];
            initialState[product] = {
                base_ref: existing?.base || 'AVG',
                spreadStr: existing ? existing.spread.toFixed(2).replace('.', ',') : '0,00'
            };
        });
        setLocalState(initialState);
    }, [brandName, existingContracts]);

    const handleBaseChange = (product: string, val: 'MIN' | 'AVG') => {
        setLocalState(prev => ({
            ...prev,
            [product]: { ...prev[product], base_ref: val }
        }));
    };

    const handleSpreadChange = (product: string, val: string) => {
        // Remove tudo que não é dígito
        let digits = val.replace(/\D/g, '');
        
        // Remove zeros à esquerda excessivos
        digits = digits.replace(/^0+/, '');
        
        // Se vazio, assume 0
        if (!digits) digits = '0';
        
        // Pad com zeros à esquerda para ter pelo menos 3 dígitos (ex: "004" -> 0,04)
        while (digits.length < 3) {
            digits = '0' + digits;
        }

        // Formata visualmente: "XX,YY"
        const integerPart = digits.slice(0, digits.length - 2);
        const decimalPart = digits.slice(digits.length - 2);
        let numericValue = parseFloat(`${integerPart}.${decimalPart}`);

        // Clamp no valor máximo de 0.20
        if (numericValue > 0.20) {
            numericValue = 0.20;
            // Reconstrói string para 0,20
            setLocalState(prev => ({
                ...prev,
                [product]: { ...prev[product], spreadStr: '0,20' }
            }));
            return;
        }

        const formatted = `${integerPart},${decimalPart}`;

        setLocalState(prev => ({
            ...prev,
            [product]: { ...prev[product], spreadStr: formatted }
        }));
    };

    const handleDelete = async (product: string) => {
        if (!onRemove) return;
        setIsSaving(true);
        try {
            await onRemove(product);
            // Reset local state for this product
            setLocalState(prev => ({
                ...prev,
                [product]: { base_ref: 'AVG', spreadStr: '0,00' }
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const itemsToSave = FUEL_PRODUCTS.map(product => {
                const state = localState[product];
                const spread = parseFloat(state.spreadStr.replace(',', '.'));
                return {
                    brand_name: brandName,
                    product_name: product,
                    base_ref: state.base_ref,
                    spread: spread
                };
            });

            await onSave(itemsToSave);
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar contrato.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="animate-fade-in">
            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 pb-2 border-b border-slate-700">
                Configurando regras para: <span className="text-slate-100">{brandName}</span>
            </h3>

            <div className="space-y-4 mb-6">
                {FUEL_PRODUCTS.map(product => (
                    <div key={product} className="flex items-center justify-between gap-4 p-2 rounded hover:bg-slate-800/30 transition-colors">
                        <span className="text-xs font-bold text-slate-300 w-1/3 truncate" title={product}>{product}</span>
                        
                        <div className="flex items-center gap-2">
                            {/* Toggle Base */}
                            <div className="flex bg-slate-950 rounded p-0.5 border border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => handleBaseChange(product, 'MIN')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${localState[product]?.base_ref === 'MIN' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Mínima
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBaseChange(product, 'AVG')}
                                    className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${localState[product]?.base_ref === 'AVG' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Média
                                </button>
                            </div>

                            {/* Input Spread */}
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold pointer-events-none">+R$</span>
                                <input 
                                    type="text"
                                    inputMode="numeric"
                                    value={localState[product]?.spreadStr || ''}
                                    onChange={(e) => handleSpreadChange(product, e.target.value)}
                                    className="w-20 bg-slate-950 border border-slate-700 rounded py-1.5 pl-8 pr-2 text-right text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 transition-colors cursor-text"
                                />
                            </div>

                            {/* Delete Button */}
                            {onRemove && (
                                <button
                                    type="button"
                                    onClick={() => handleDelete(product)}
                                    className="text-slate-600 hover:text-rose-500 p-1 transition-colors"
                                    title="Excluir contrato para este produto"
                                    disabled={isSaving}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wide transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wide shadow-lg transition-all disabled:opacity-50"
                >
                    {isSaving ? 'Salvando...' : 'Salvar Contrato'}
                </button>
            </div>
        </form>
    );
};

export default ContractInputForm;
