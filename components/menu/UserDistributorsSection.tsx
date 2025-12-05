import React from 'react';
import { BandeiraBasePair, DistributorStyle } from '../../types';
import DistributorCard from './DistributorCard';

interface UserDistributor extends BandeiraBasePair {
    imageUrl: string | null;
}

interface UserDistributorsSectionProps {
    userDistributorsForBase: UserDistributor[];
    distributorColors: { [key: string]: DistributorStyle };
    lastPrices: { [brand: string]: { [product: string]: { price: number; date: string } } };
    availableBases: string[];
    selectedBase: string;
    setSelectedBase: (value: string) => void;
    handleSelectDistributorToQuote: (dist: BandeiraBasePair) => void;
}

const UserDistributorsSection: React.FC<UserDistributorsSectionProps> = ({
    userDistributorsForBase, distributorColors, lastPrices, availableBases, selectedBase, setSelectedBase, handleSelectDistributorToQuote
}) => (
    <>
        <div className="flex flex-col mb-4">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                Minhas Distribuidoras
            </h2>
            <div className="flex flex-wrap items-center justify-between mt-2 gap-4">
                <p className="text-gray-600 text-sm">
                Selecione para inserir os preços de hoje.
                </p>
                {availableBases.length > 0 && (
                <div className="flex items-center gap-3 mt-1 sm:mt-0">
                    <label
                    htmlFor="base-selector"
                    className="text-sm font-medium text-gray-700 whitespace-nowrap"
                    >
                    Base:
                    </label>
                    <select
                    id="base-selector"
                    value={selectedBase}
                    onChange={(e) => setSelectedBase(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg
                                        focus:ring-green-500 focus:border-green-500 px-2.5 py-1.5 shadow-sm"
                    >
                    {availableBases.map(base => (
                        <option key={base} value={base}>
                        {base}
                        </option>
                    ))}
                    </select>
                </div>
                )}
            </div>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {userDistributorsForBase.map((dist) => {
                const style = distributorColors[dist.bandeira];
                if (!style) return null; // Don't render card until color is loaded
                return (
                    <DistributorCard 
                        key={`${dist.bandeira}-${dist.base}`}
                        dist={dist}
                        style={style}
                        lastPrices={lastPrices}
                        onSelect={handleSelectDistributorToQuote}
                        imageUrl={dist.imageUrl}
                    />
                );
            })}
        </div>
    </>
);

export default UserDistributorsSection;