import React from 'react';
import { DistributorStyle } from '../../types';

interface MarketDistributorsSectionProps {
    marketDistributorsForBase: Array<{ name: string; imageUrl: string | null }>;
    distributorColors: { [key: string]: DistributorStyle };
    selectedBase: string;
    handleSelectMarketDistributor: (distName: string) => void;
}

const MarketDistributorsSection: React.FC<MarketDistributorsSectionProps> = ({
    marketDistributorsForBase, distributorColors, selectedBase, handleSelectMarketDistributor
}) => (
    <>
        <div className="flex flex-col mb-4">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                Cotações Avulsas
            </h2>
            <div className="flex flex-wrap items-center justify-between mt-2 gap-4">
                <p className="text-gray-600 text-sm">
                    Selecione para cotar e ajudar a construir o benchmark de mercado.
                </p>
            </div>
        </div>
        <div className="flex flex-wrap gap-3">
            {marketDistributorsForBase.map(({ name: distName, imageUrl }) => {
                const style = distributorColors[distName];
                if (!style) return null; // Avoid rendering if style is not ready
                return (
                <button 
                    key={distName}
                    onClick={() => handleSelectMarketDistributor(distName)}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg font-semibold text-center transition duration-200 hover:shadow-xl hover:-translate-y-1"
                    style={{ backgroundColor: style.background, color: style.border }}
                >
                    {imageUrl && (
                        <img
                            src={imageUrl}
                            alt={distName}
                            className="w-6 h-6 rounded-full bg-white/20 p-0.5 object-contain"
                        />
                    )}
                    <span>{distName}</span>
                </button>
            )})}
        </div>
    </>
);
export default MarketDistributorsSection;