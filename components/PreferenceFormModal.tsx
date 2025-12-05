
import React, { useState, useMemo, useEffect } from 'react';
import type { BandeiraBasePair } from '../types'; 

// Opções de ordem e chaves
const PRIMARY_BANDEIRA = 'Branca/Indefinida';
const SPECIFIC_ORDER = [
    'Vibra', 
    'Ipiranga', 
    'ALE', 
    'Shell'
];
type SelectionMode = 'market' | 'custom' | 'white';

interface PreferenceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (pair: BandeiraBasePair) => void;
    allDistributors: string[];
    allBases: string[];
}

const PreferenceFormModal: React.FC<PreferenceFormModalProps> = ({ isOpen, onClose, onSave, allDistributors, allBases }) => {
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('market');
    const [selectedBandeira, setSelectedBandeira] = useState('');
    const [customBandeiraInput, setCustomBandeiraInput] = useState('');
    const [selectedBase, setSelectedBase] = useState('');
    const [error, setError] = useState<string | null>(null);

    // EFEITO: Reseta o estado do modal ao abrir/fechar
    useEffect(() => {
        if (isOpen) {
            setSelectionMode('market');
            setSelectedBandeira('');
            setCustomBandeiraInput('');
            setSelectedBase(allBases[0] || ''); // pré-seleciona a primeira base
            setError(null);
        }
    }, [isOpen, allBases]);
    
    // MEMO: ORGANIZAÇÃO DA LISTA DE DISTRIBUIDORAS
    const orderedDistributors = useMemo(() => {
        const remaining = new Set(allDistributors);
        const orderedList: string[] = [];

        // Adiciona Branca, se existir
        if (remaining.has(PRIMARY_BANDEIRA)) {
            orderedList.push(PRIMARY_BANDEIRA);
            remaining.delete(PRIMARY_BANDEIRA);
        }

        // Adiciona as bandeiras de ordem específica
        SPECIFIC_ORDER.forEach(bandeira => {
            if (remaining.has(bandeira)) {
                 orderedList.push(bandeira);
                 remaining.delete(bandeira);
            }
        });
        
        // FIX: Cast Array.from(remaining) to string[] to ensure correct type inference for sort and concat methods.
        // Adiciona o restante em ordem alfabética
        const otherDistributors = (Array.from(remaining) as string[]).sort((a, b) => a.localeCompare(b));
        
        return orderedList.concat(otherDistributors);
    }, [allDistributors]);
    
    if (!isOpen) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        let bandeiraToSave = '';

        switch (selectionMode) {
            case 'market':
                bandeiraToSave = selectedBandeira;
                break;
            case 'custom':
                if (!customBandeiraInput.trim()) {
                    setError('Por favor, insira um nome para o seu posto.');
                    return;
                }
                bandeiraToSave = customBandeiraInput.trim();
                break;
            case 'white':
                bandeiraToSave = PRIMARY_BANDEIRA;
                break;
        }

        if (!bandeiraToSave || !selectedBase) {
            setError('Por favor, complete a seleção da Distribuidora e da Base.');
            return;
        }

        onSave({ bandeira: bandeiraToSave, base: selectedBase });
    };

    const inputStyle = 'bg-slate-950 text-slate-200 border border-slate-700 placeholder-slate-500 focus:ring-emerald-500 focus:border-emerald-500';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-all border border-slate-800" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-slate-100 mb-6 border-b border-slate-800 pb-3">Adicionar Configuração</h3>
                <form onSubmit={handleSave} className="space-y-6">
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Qual o tipo de bandeira?</label>
                        <div className="grid grid-cols-3 gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
                            {(['market', 'custom', 'white'] as SelectionMode[]).map(mode => {
                                const labels: Record<SelectionMode, string> = {
                                    market: 'Mercado',
                                    custom: 'Meu Posto',
                                    white: 'B. Branca'
                                };
                                return (
                                    <button
                                        type="button"
                                        key={mode}
                                        onClick={() => setSelectionMode(mode)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                            selectionMode === mode ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        {labels[mode]}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 px-1">
                            {selectionMode === 'market' && "Selecione uma bandeira oficial (ex: Shell, Ipiranga) para comparar com os dados de mercado."}
                            {selectionMode === 'custom' && "Crie um nome personalizado para o seu posto se ele não tiver uma bandeira específica."}
                            {selectionMode === 'white' && "Opção padrão para postos sem bandeira definida."}
                        </p>
                    </div>
                    
                    {selectionMode === 'market' && (
                        <div>
                            <label htmlFor="distribuidora" className="block text-sm font-medium text-slate-400 mb-1">Distribuidora:</label>
                            <select
                                id="distribuidora"
                                value={selectedBandeira}
                                onChange={(e) => setSelectedBandeira(e.target.value)}
                                className={`mt-1 block w-full pl-3 pr-10 py-2 text-base rounded-lg shadow-sm ${inputStyle} sm:text-sm`}
                                required
                            >
                                <option value="">Selecione uma distribuidora</option>
                                {orderedDistributors.map(distributor => (
                                    <option key={distributor} value={distributor}>{distributor}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectionMode === 'custom' && (
                         <div>
                            <label htmlFor="custom-distribuidora" className="block text-sm font-medium text-slate-400 mb-1">Nome do Posto:</label>
                            <input
                                type="text"
                                id="custom-distribuidora"
                                value={customBandeiraInput}
                                onChange={(e) => setCustomBandeiraInput(e.target.value)}
                                placeholder="Ex: Posto do Zé"
                                className={`mt-1 block w-full px-3 py-2 text-base rounded-lg shadow-sm ${inputStyle} sm:text-sm`}
                                required
                            />
                        </div>
                    )}
                    
                    {selectionMode === 'white' && (
                        <div>
                           <label className="block text-sm font-medium text-slate-400 mb-1">Distribuidora:</label>
                           <div className={`mt-1 block w-full px-3 py-2 text-base rounded-lg shadow-sm ${inputStyle} bg-slate-800 text-slate-300`}>
                               {PRIMARY_BANDEIRA}
                           </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="base" className="block text-sm font-medium text-slate-400 mb-1">Base Vinculada:</label>
                        <select
                            id="base"
                            value={selectedBase}
                            onChange={(e) => setSelectedBase(e.target.value)}
                            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base rounded-lg shadow-sm ${inputStyle} sm:text-sm`}
                            required
                        >
                            <option value="">Selecione a Base</option>
                            {allBases.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1 px-1">
                            A base define a região geográfica (ex: Betim, Paulínia) de onde virão os preços de referência para comparação.
                        </p>
                    </div>
                    
                    {error && <p className="text-sm text-rose-400 text-center pt-2 bg-rose-950/30 border border-rose-900/50 p-2 rounded-lg">{error}</p>}

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="py-2 px-4 border border-slate-700 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="py-2 px-4 border border-transparent rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md"
                        >
                            Adicionar Configuração
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PreferenceFormModal;
