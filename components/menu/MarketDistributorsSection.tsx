
import React from 'react';
import { DistributorStyle } from '../../types';
import { Tip } from '../common/Tip';
import { TOOLTIP } from '../../constants/tooltips';

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
    <div className="font-sans">
        <div className="flex flex-col mb-4 border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-slate-100 leading-tight">
                <Tip text={TOOLTIP.HEADER_MARKET_QUOTES}>
                    Cotações Avulsas
                </Tip>
            </h2>
            <div className="flex flex-wrap items-center justify-between mt-2 gap-4">
                <p className="text-slate-300 font-medium text-sm px-1">
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
                    style={{ borderLeftColor: style.background }}
                    className={`flex items-center justify-center px-3 py-1.5 rounded-r-lg border-y border-r border-l-[4px] text-sm font-semibold transition-all shadow-sm whitespace-nowrap
                        ${isSelected
                            ? 'bg-slate-700 text-emerald-400 border-slate-600'
                            : 'bg-slate-800 text-slate-300 border-slate-700/50 hover:bg-slate-700 hover:text-slate-100 hover:border-slate-600'
                        }
                    `}
                >
                    <span className="truncate">{distName}</span>
                </button>
            )})}
        </div>
    </div>
);
export default MarketDistributorsSection;
