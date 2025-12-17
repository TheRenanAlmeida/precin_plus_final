
import React from 'react';
import { BandeiraBasePair, DistributorStyle } from '../../types';
import DistributorCard from './DistributorCard';
import { Tip } from '../common/Tip';
import { TOOLTIP } from '../../constants/tooltips';

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
        <div className="flex flex-col mb-4 border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-slate-100 leading-tight">
                <Tip text={TOOLTIP.HEADER_MY_DISTRIBUTORS}>
                    Minhas Distribuidoras
                </Tip>
            </h2>
            <div className="flex flex-wrap items-center justify-between mt-2 gap-4">
                <p className="text-slate-400 text-sm">
                Selecione para inserir os preços de hoje.
                </p>
                {availableBases.length > 0 && (
                <div className="flex items-center gap-3 mt-1 sm:mt-0">
                    <label
                    htmlFor="base-selector"
                    className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap"
                    >
                    Base:
                    </label>
                    <select
                    id="base-selector"
                    value={selectedBase}
                    onChange={(e) => setSelectedBase(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg
                                        focus:ring-emerald-500 focus:border-emerald-500 px-2.5 py-1.5 shadow-sm"
                    >
                    {availableBases.map(base => (
                        <option key={base} value={base} className="bg-slate-900">
                        {base}
                        </option>
                    ))}
                    </select>
                </div>
                )}
            </div>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
