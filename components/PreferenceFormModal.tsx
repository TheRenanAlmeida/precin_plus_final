
import React, { useState, useMemo, useEffect } from 'react';
import type { BandeiraBasePair } from '../types'; 

// Opções de ordem e chaves
const CUSTOM_OPTION_VALUE = '__CUSTOM__'; 
const PRIMARY_BANDEIRA = 'Branca/Indefinida';
const SPECIFIC_ORDER = [
    'Vibra', 
    'Ipiranga', 
    'ALE', 
    'Shell'
];

interface PreferenceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (pair: BandeiraBasePair) => void;
    allDistributors: string[];
    allBases: string[];
}

const PreferenceFormModal: React.FC<PreferenceFormModalProps> = ({ isOpen, onClose, onSave, allDistributors, allBases }) => {
    const [selectedBandeira, setSelectedBandeira] = useState('');
    const [customBandeiraInput, setCustomBandeiraInput] = useState('');
    const [selectedBase, setSelectedBase] = useState('');
    const [error, setError] = useState<string | null>(null);

    // EFEITO: Reseta o estado do modal ao abrir/fechar
    useEffect(() => {
        if (!isOpen) {
            setSelectedBandeira('');
            setCustomBandeiraInput('');
            setSelectedBase('');
            setError(null);
        }
    }, [isOpen]);
    
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

        let bandeiraToSave = selectedBandeira;
        
        if (selectedBandeira === CUSTOM_OPTION_VALUE) {
            if (!customBandeiraInput.trim()) {
                setError('Por favor, insira um nome para a nova distribuidora.');
                return;
            }
            bandeiraToSave = customBandeiraInput.trim();
        }

        if (!bandeiraToSave || !selectedBase || selectedBandeira === '') {
            setError('Por favor, complete a seleção da Distribuidora e da Base.');
            return;
        }

        onSave({ bandeira: bandeiraToSave, base: selectedBase });
    };

    // Cores e Estilos
    const primaryColor = '#00502a'; 
    const inputStyle = 'bg-white text-gray-900 border border-gray-300 placeholder-gray-500 focus:ring-green-500 focus:border-green-500';

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-all">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-3">Adicionar Configuração</h3>
                <form onSubmit={handleSave} className="space-y-6">
                    
                    <div>
                        <label htmlFor="distribuidora" className="block text-sm font-medium text-gray-700 mb-1">Distribuidora:</label>
                        
                        <select
                            id="distribuidora"
                            value={selectedBandeira}
                            onChange={(e) => setSelectedBandeira(e.target.value)}
                            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base rounded-lg shadow-sm ${inputStyle} sm:text-sm`}
                            required
                        >
                            <option value="">Selecione ou Crie</option>
                            <option value={CUSTOM_OPTION_VALUE}>-- Criar Nova Distribuidora --</option>
                            <option value="" disabled>──────────────────</option>

                            {orderedDistributors.map(distributor => (
                                <option key={distributor} value={distributor}>{distributor}</option>
                            ))}
                        </select>
                        
                        {(selectedBandeira === CUSTOM_OPTION_VALUE) && (
                            <input
                                type="text"
                                value={customBandeiraInput}
                                onChange={(e) => setCustomBandeiraInput(e.target.value)}
                                placeholder="Nome da nova Distribuidora (Ex: Posto do Zé)"
                                className={`mt-2 block w-full px-3 py-2 text-base rounded-lg shadow-sm ${inputStyle} sm:text-sm`}
                                required
                            />
                        )}
                    </div>

                    <div>
                        <label htmlFor="base" className="block text-sm font-medium text-gray-700 mb-1">Base Vinculada:</label>
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
                    </div>
                    
                    {error && <p className="text-sm text-red-600 text-center pt-2">{error}</p>}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="py-2 px-4 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-green-700 transition-colors"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <svg className="w-5 h-5 inline mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                            Adicionar Distribuidora
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PreferenceFormModal;