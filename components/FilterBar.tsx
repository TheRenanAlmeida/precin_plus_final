import React, { useState } from 'react';
import DistributorLogo from './DistributorLogo';
import PillToggleButton from './PillToggleButton';

export interface FilterOption {
    key: string;
    name: string;
    color?: string;
    textColor?: string;
    shadowColor?: string;
    imageUrl?: string | null;
    isVisible: boolean;
}

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
    children?: React.ReactNode;
}


const FilterBar: React.FC<FilterBarProps> = ({
    filterSections,
    distributorFilters,
    onToggleFilter,
    onSelectAllDistributors,
    onClearAllDistributors,
    children
}) => {
    const [isDistributorModalOpen, setIsDistributorModalOpen] = useState(false);

    const FilterPill: React.FC<{ option: FilterOption }> = ({ option }) => {
        if (option.color && option.textColor) {
            // Distributor style
            const className = option.isVisible 
                ? "inline-flex items-center justify-center gap-2 px-3 py-1 text-xs font-semibold rounded border transition-all bg-gray-100 text-gray-900 border-gray-300"
                : "inline-flex items-center justify-center gap-2 px-3 py-1 text-xs font-medium rounded border transition-all bg-white text-gray-400 border-gray-200 opacity-60 hover:opacity-100";
    
            return (
                <button
                    key={option.key}
                    onClick={() => onToggleFilter(option.key)}
                    className={className}
                    aria-pressed={option.isVisible}
                >
                    <DistributorLogo distributorName={option.name} imageUrl={option.imageUrl} />
                    <span className="truncate max-w-[80px]">{option.name}</span>
                </button>
            );
        }
    
        // Standard Toggle Style (DefiLlama-like)
        const className = option.isVisible 
            ? "px-3 py-1 text-xs font-semibold rounded border bg-gray-800 text-white border-gray-800 shadow-sm" 
            : "px-3 py-1 text-xs font-medium rounded border bg-white text-gray-600 border-gray-300 hover:bg-gray-50";
        
        return (
            <button
                key={option.key}
                onClick={() => onToggleFilter(option.key)}
                className={className}
                aria-pressed={option.isVisible}
            >
                {option.name}
            </button>
        );
    };

    return (
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
            <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-6">
                    {/* Controls Injection */}
                    {children}

                    <div className="hidden sm:block w-px h-6 bg-gray-200"></div>

                    {filterSections.map(section => (
                        <div key={section.label} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{section.label}</span>
                            {section.displayMode === 'dropdown' ? (
                                <div className="relative">
                                    <select
                                        value={section.options.find(o => o.isVisible)?.key || ''}
                                        onChange={(e) => onToggleFilter(e.target.value)}
                                        className="appearance-none bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded py-1.5 pl-3 pr-8 focus:outline-none focus:border-gray-500 cursor-pointer hover:border-gray-400 transition-colors"
                                    >
                                        {section.options.map(option => (
                                            <option key={option.key} value={option.key}>{option.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            ) : section.displayMode === 'toggle' ? (
                                <div className="flex bg-gray-100 rounded p-0.5 border border-gray-200">
                                    {section.options.map(opt => (
                                        <button
                                            key={opt.key}
                                            onClick={() => onToggleFilter(opt.key)}
                                            className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${opt.isVisible ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            {opt.name}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {section.options.map(option => (
                                        <FilterPill key={option.key} option={option} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-2 xl:pt-0 border-t xl:border-t-0 border-gray-100">
                    <button
                        onClick={() => setIsDistributorModalOpen(prev => !prev)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded border transition-all ${isDistributorModalOpen ? 'bg-gray-100 text-gray-900 border-gray-400' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                    >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd"></path></svg>
                        <span>Distribuidoras</span> 
                        {distributorFilters.count !== undefined && distributorFilters.count > 0 && (
                            <span className="flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-gray-800 rounded-full px-1">{distributorFilters.count}</span>
                        )}
                    </button>
                </div>
            </div>

            {isDistributorModalOpen && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase">Filtrar Distribuidoras</h4>
                        <div className="flex gap-2">
                            <button onClick={onSelectAllDistributors} className="text-xs font-medium text-green-600 hover:text-green-700">Selecionar Todas</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={onClearAllDistributors} className="text-xs font-medium text-gray-500 hover:text-gray-700">Limpar</button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                        {distributorFilters.options.map(option => <FilterPill key={option.key} option={option} />)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterBar;