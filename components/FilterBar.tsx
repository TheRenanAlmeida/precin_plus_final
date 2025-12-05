import React, { useState } from 'react';
import DistributorLogo from './DistributorLogo';
import PillToggleButton from './PillToggleButton';

// Definição de tipo para uma opção de filtro (Pílula)
export interface FilterOption {
    key: string;      // ID único (ex: 'distrib_shell', 'base_betim')
    name: string;     // Rótulo (ex: 'Shell', 'Betim - MG')
    color?: string;    // Cor de fundo HEX/RGBA da pílula (ex: '#E53935')
    textColor?: string; // Cor do texto da pílula
    shadowColor?: string; // Cor da sombra para o efeito de hover
    imageUrl?: string | null; // URL da imagem/logo
    isVisible: boolean; // Estado (ativo/inativo)
}

// Props do componente
export interface FilterSection {
    label: string;
    options: FilterOption[];
    displayMode?: 'pills' | 'dropdown' | 'toggle';
}

interface FilterBarProps {
    filterSections: FilterSection[];
    distributorFilters: {
        options: FilterOption[];
        count?: number;
    };
    onToggleFilter: (key: string) => void;
    onSelectAllDistributors?: () => void;
    onClearAllDistributors?: () => void;
}


const FilterBar: React.FC<FilterBarProps> = ({
    filterSections,
    distributorFilters,
    onToggleFilter,
    onSelectAllDistributors,
    onClearAllDistributors
}) => {
    const [isDistributorModalOpen, setIsDistributorModalOpen] = useState(false);

    // Componente de Pílula Reutilizável
    const FilterPill: React.FC<{ option: FilterOption }> = ({ option }) => {
        // Estilo específico para pílulas de distribuidora (com logo)
        if (option.color && option.textColor) {
            const style = option.isVisible ? {
                backgroundColor: option.color,
                color: option.textColor,
                '--shadow-color': option.shadowColor || option.color,
            } as React.CSSProperties : {};
    
            const className = option.isVisible 
                ? "inline-flex items-center justify-center gap-2 px-3 h-8 text-xs font-bold rounded-full truncate distributor-pill"
                : "inline-flex items-center justify-center gap-2 px-3 h-8 text-xs font-bold rounded-full truncate bg-white text-gray-600 border border-gray-300 hover:bg-gray-50";
    
            return (
                <button
                    key={option.key}
                    onClick={() => onToggleFilter(option.key)}
                    className={className}
                    style={style}
                >
                    <DistributorLogo distributorName={option.name} imageUrl={option.imageUrl} />
                    <span className="truncate">{option.name}</span>
                </button>
            );
        }
    
        // Estilo padrão para pílulas de modo/análise
        const baseClasses = "px-4 py-1.5 rounded-full text-sm font-semibold transition-all border shadow-sm whitespace-nowrap";
        const className = `${baseClasses} ${option.isVisible 
            ? 'bg-green-50 text-green-700 border-green-400' 
            : 'bg-white text-gray-600 hover:text-green-700 border-gray-300'}`;
        
        return (
            <button
                key={option.key}
                onClick={() => onToggleFilter(option.key)}
                className={className}
            >
                {option.name}
            </button>
        );
    };

    return (
        <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-200 w-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-4">
                {filterSections.map(section => (
                    <div key={section.label} className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700">{section.label}</span>
                        {section.displayMode === 'dropdown' ? (
                            <div className="relative">
                                <select
                                    value={section.options.find(o => o.isVisible)?.key || ''}
                                    onChange={(e) => onToggleFilter(e.target.value)}
                                    className="appearance-none bg-white border border-gray-300 text-gray-600 font-semibold text-sm rounded-full py-1.5 pl-4 pr-10 focus:outline-none focus:border-green-500 transition-colors hover:bg-gray-50 shadow-sm"
                                    aria-label={`Selecionar ${section.label}`}
                                >
                                    {section.options.map(option => (
                                        <option key={option.key} value={option.key}>{option.name}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        ) : section.displayMode === 'toggle' ? (
                            <PillToggleButton
                                options={section.options.map(o => ({ label: o.name, value: o.key }))}
                                activeOption={section.options.find(o => o.isVisible)?.key || ''}
                                onChange={(value) => onToggleFilter(value)}
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                {section.options.map(option => (
                                    <FilterPill key={option.key} option={option} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                <div className="sm:flex-grow sm:flex sm:justify-end">
                    <button
                        onClick={() => setIsDistributorModalOpen(prev => !prev)}
                        className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold bg-white text-gray-600 hover:text-green-700 border border-gray-300 rounded-full transition-all shadow-sm focus:outline-none w-full justify-center sm:w-auto"
                        aria-expanded={isDistributorModalOpen}
                        aria-controls="distributor-modal"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd"></path></svg>
                        <span>Distribuidoras</span> 
                        {distributorFilters.count !== undefined && distributorFilters.count > 0 && (
                            <span className="flex items-center justify-center w-5 h-5 text-xs font-extrabold text-white bg-green-600 rounded-full">{distributorFilters.count}</span>
                        )}
                    </button>
                </div>
            </div>

            {isDistributorModalOpen && (
                <div id="distributor-modal" className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-gray-700">Filtrar Distribuidoras:</h4>
                        {(onSelectAllDistributors || onClearAllDistributors) && (
                            <div className="flex gap-2">
                                {onSelectAllDistributors && (
                                    <button onClick={onSelectAllDistributors} className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors shadow-sm focus:outline-none">
                                        Selecionar Todas
                                    </button>
                                )}
                                {onClearAllDistributors && (
                                    <button onClick={onClearAllDistributors} className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors shadow-sm focus:outline-none">
                                        Limpar Seleção
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {distributorFilters.options.map(option => <FilterPill key={option.key} option={option} />)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterBar;