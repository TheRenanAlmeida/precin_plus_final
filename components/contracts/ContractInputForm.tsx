import React, { useState, useEffect } from 'react';
import { FUEL_PRODUCTS } from '../../constants/fuels';
import { UserContracts } from '../../types';

interface ContractInputFormProps {
  brandName: string;
  existingContracts: UserContracts;
  onSave: (items: Array<{ brand_name: string; product_name: string; base_ref: 'MIN' | 'AVG'; spread: number }>) => Promise<void>;
  onRemove?: (contractId: string | undefined, productName: string, brandName: string) => Promise<void>;
  onCancel: () => void;
}

type LocalProductState = {
  id?: string;
  base_ref: 'MIN' | 'AVG';
  centsStr: string;
  isExisting: boolean;
};

type LocalState = Record<string, LocalProductState>;

const canUseBrowserModals = () => {
  try {
    // Se estiver em iframe/sandbox, chamadas nativas de modal (confirm/alert) costumam ser bloqueadas.
    if (window.self !== window.top) return false;
    return true;
  } catch {
    // Em alguns casos de cross-origin, o acesso a window.top lança exceção.
    return false;
  }
};

const confirmDeleteSafe = (msg: string) => {
  if (!canUseBrowserModals()) {
    console.warn('[LIXEIRA] ambiente sandbox/iframe detectado: pulando confirm() para evitar travamento.');
    return true; // Prossegue sem confirmação visual para não interromper o fluxo no sandbox
  }
  try {
    return window.confirm(msg);
  } catch {
    return true;
  }
};

const ContractInputForm: React.FC<ContractInputFormProps> = ({ brandName, existingContracts, onSave, onRemove, onCancel }) => {
  const [localState, setLocalState] = useState<LocalState>({});
  const [effectiveBrand, setEffectiveBrand] = useState<string>(brandName);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedTargetBrand = brandName.trim().toLowerCase();
    const brandKey = Object.keys(existingContracts).find(k => k.trim().toLowerCase() === normalizedTargetBrand);
    
    setEffectiveBrand(brandKey || brandName);
    
    const brandData = brandKey ? existingContracts[brandKey] : {};
    const initialState: LocalState = {};

    FUEL_PRODUCTS.forEach(productName => {
      const existing = brandData[productName];
      
      const cents = (existing && typeof existing.spread === 'number')
        ? Math.round(existing.spread * 100).toString().padStart(2, '0')
        : '';

      initialState[productName] = {
        id: existing?.id,
        base_ref: existing?.base || 'AVG',
        centsStr: cents,
        isExisting: !!existing
      };
    });

    setLocalState(initialState);
    setValidationError(null);
  }, [brandName, existingContracts]);

  const handleBaseChange = (product: string, val: 'MIN' | 'AVG') => {
    setLocalState(prev => ({
      ...prev,
      [product]: { ...prev[product], base_ref: val }
    }));
  };

  const handleCentsChange = (product: string, val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 2);
    setValidationError(null);

    setLocalState(prev => ({
      ...prev,
      [product]: {
        ...prev[product] || { base_ref: 'AVG', isExisting: false },
        centsStr: digits
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const itemsToSave: any[] = [];
    
    FUEL_PRODUCTS.forEach(product => {
        const state = localState[product];
        if (!state || (state.centsStr === '' && !state.isExisting)) return;

        const centsVal = parseInt(state.centsStr || '0', 10);
        
        itemsToSave.push({
            brand_name: effectiveBrand,
            product_name: product,
            base_ref: state.base_ref,
            spread: centsVal / 100
        });
    });

    if (itemsToSave.length === 0) {
      setValidationError("Insira pelo menos um valor de spread.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(itemsToSave);
    } catch (err: any) {
      if (err.message?.includes('pplus_contracts_spread_check')) {
          setValidationError("Erro: O banco de dados limita o spread a 20 centavos.");
      } else {
          setValidationError(err.message || 'Erro ao salvar regras.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (product: string) => {
    const state = localState[product];
    console.log('[LIXEIRA] clique', { product, brandName: effectiveBrand, id: state?.id });

    if (!state) {
        console.error('[LIXEIRA] Erro: Estado não encontrado para o produto', product);
        return;
    }

    if (!onRemove) {
        console.error('[LIXEIRA] Erro: A função onRemove não foi passada via props para o formulário.');
        return;
    }

    // Usa o confirm seguro que não trava em ambientes restritos (AI Studios)
    const ok = confirmDeleteSafe(`Deseja realmente excluir o contrato de ${product}?`);
    
    if (!ok) {
      console.log('[LIXEIRA] exclusão cancelada pelo usuário.');
      return;
    }

    setIsSaving(true);
    try {
      console.log('[LIXEIRA] chamando onRemove...', { id: state.id, product, brandName: effectiveBrand });
      await onRemove(state.id, product, effectiveBrand);
      console.log('[LIXEIRA] onRemove finalizado');

      // Só limpa localmente após confirmação do backend (resolução da promessa)
      setLocalState(prev => ({
        ...prev,
        [product]: {
          ...prev[product],
          id: undefined,
          centsStr: '',
          isExisting: false,
        }
      }));
    } catch (error) {
      console.error("[LIXEIRA] Falha no processo de exclusão:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700">
        <h3 className="text-sm font-bold text-slate-400 uppercase">
          Distribuidora: <span className="text-slate-100">{brandName}</span>
        </h3>
      </div>

      <div className="space-y-4 mb-6">
        {FUEL_PRODUCTS.map(product => {
          const productState = localState[product] || { base_ref: 'AVG', centsStr: '', isExisting: false };

          return (
            <div key={product} className="flex items-center justify-between gap-4 p-2 rounded hover:bg-slate-800/30 transition-colors">
              <span className="text-xs font-bold text-slate-300 w-1/3 truncate" title={product}>{product}</span>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-950 rounded p-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleBaseChange(product, 'MIN')}
                    className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${productState.base_ref === 'MIN' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Mínima
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBaseChange(product, 'AVG')}
                    className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${productState.base_ref === 'AVG' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Média
                  </button>
                </div>

                <div className={`flex items-center bg-slate-950 border rounded h-9 overflow-hidden transition-colors px-2 border-slate-700 focus-within:border-emerald-500`}>
                  <span className="text-[10px] font-bold text-slate-600 mr-1 select-none">R$</span>
                  <div className="flex items-baseline font-sans font-bold text-sm tabular-nums tracking-tighter">
                    <span className={`select-none leading-none text-white`}>0,</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={productState.centsStr}
                      onChange={(e) => handleCentsChange(product, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className={`w-5 bg-transparent border-none p-0 text-left text-sm font-bold focus:outline-none focus:ring-0 cursor-text tabular-nums leading-none text-white`}
                      placeholder="00"
                    />
                  </div>
                </div>

                <div className="w-8 flex justify-center">
                    {(productState.isExisting || productState.centsStr !== '') && (
                    <button
                        type="button"
                        onClick={() => handleDelete(product)}
                        className="text-slate-600 hover:text-rose-500 p-1.5 transition-colors group/trash"
                        disabled={isSaving}
                        title={`Excluir contrato de ${product}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {validationError && (
        <div className="mb-4 p-2 bg-rose-950/40 border border-rose-800 text-rose-400 text-xs font-bold rounded text-center">
          {validationError}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
        <button type="button" onClick={onCancel} disabled={isSaving} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 uppercase transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={isSaving} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase shadow-lg transition-all disabled:opacity-50">
          {isSaving ? 'Salvando...' : 'Salvar Regras'}
        </button>
      </div>
    </form>
  );
};

export default ContractInputForm;