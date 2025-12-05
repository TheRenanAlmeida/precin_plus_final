import React from 'react';
import { DistributorStyle } from '../../types';

interface MarketDistributorsSectionProps {
    marketDistributorsForBase: Array<{ name: string; imageUrl: string | null }>;
    distributorColors: { [key: string]: DistributorStyle };
    selectedBase: string;
    handleSelectMarketDistributor: (distName: string) => void;
    selectedDistributorName: string | null;
}

const MarketDistributorsSection: React.FC<MarketDistributorsSectionProps> = ({
    marketDistributorsForBase, distributorColors, selectedBase, handleSelectMarketDistributor, selectedDistributorName
}) => (
    <>
        <div className="flex flex-col mb-4 border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-slate-100 leading-tight">
                Cotações Avulsas
            </h2>
            <div className="flex flex-wrap items-center justify-between mt-2 gap-4">
                <p className="text-slate-400 text-sm">
                    Selecione para cotar e ajudar a construir o benchmark de mercado.
                </p>
            </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
            {marketDistributorsForBase.map(({ name: distName }) => {
                const style = distributorColors[distName];
                if (!style) return null; // Avoid rendering if style is not ready
                const isSelected = distName === selectedDistributorName;

                return (
                <button 
                    key={distName}
                    onClick={() => handleSelectMarketDistributor(distName)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors whitespace-nowrap
                        ${isSelected
                            ? 'bg-slate-700 text-emerald-400 border-slate-600 ring-2 ring-emerald-500'
                            : 'bg-slate-800/50 text-slate-300 border-slate-700/50 hover:bg-slate-800 hover:text-slate-100 hover:border-slate-600'
                        }
                    `}
                >
                    <div 
                        className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: style.background }} 
                    />
                    <span>{distName}</span>
                </button>
            )})}
        </div>
    </>
);
export default MarketDistributorsSection;