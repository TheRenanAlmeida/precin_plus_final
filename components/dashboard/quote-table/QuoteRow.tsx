
import React, { memo } from 'react';
import type { FuelProduct, DistributorColors } from '../../../types';
import { formatPriceSmart, formatDiffCurrency, formatDiffPercent, getDiffColorClass } from '../../../utils/dataHelpers';
import DebouncedPriceInput from './DebouncedPriceInput';
import QuoteTableSourcesBlock from './QuoteTableSourcesBlock';

interface QuoteRowProps {
    product: FuelProduct;
    activeBrand: string;
    brandPrice: number;
    brandPriceInput: string;
    comparisonPrice: number;
    marketDistributors: string[];
    distributorColors: DistributorColors;
    onPriceChange: (brand: string, product: string, value: string) => void;
    onDistributorPillClick?: (dist: string) => void;
    isSharePreview: boolean;
    isAvgMode: boolean;
}

const QuoteRow: React.FC<QuoteRowProps> = ({
    product,
    activeBrand,
    brandPrice,
    brandPriceInput,
    comparisonPrice,
    marketDistributors,
    distributorColors,
    onPriceChange,
    onDistributorPillClick,
    isSharePreview,
    isAvgMode
}) => {
    const difference = brandPrice - comparisonPrice;
    const percentageDifference = comparisonPrice === 0 ? 0 : (difference / comparisonPrice) * 100;
    const priceEntered = brandPriceInput && brandPrice > 0;

    // Lógica de cores unificada via helper
    let diffTextColor = "text-slate-500";
    if (priceEntered && comparisonPrice > 0) {
        diffTextColor = getDiffColorClass(difference);
    }
    
    // Cor do input do usuário
    let userInputColorClass = 'text-slate-500';
    if (priceEntered) {
        if (comparisonPrice > 0) {
            userInputColorClass = getDiffColorClass(difference);
        } else {
            userInputColorClass = 'text-emerald-400';
        }
    } else if (brandPriceInput) {
        userInputColorClass = 'text-slate-100'; // Digitando...
    }

    return (
        <tr className="hover:bg-slate-800/40 transition-colors group">
            <td className="pp-td-text" title={product}>{product}</td>

            <td className="pp-td text-right">
                {isSharePreview ? (
                    <span className={`tabular-nums font-bold text-sm ${userInputColorClass}`}>
                        {priceEntered ? formatPriceSmart(brandPrice) : '-'}
                    </span>
                ) : (
                    <div className="flex justify-end">
                        <DebouncedPriceInput
                            value={brandPriceInput}
                            onCommit={(val) => onPriceChange(activeBrand, product, val)}
                            placeholder="0,0000"
                            className={`
                                w-full max-w-[110px] text-right bg-transparent border border-transparent rounded
                                focus:bg-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50
                                hover:border-slate-700/50 outline-none transition-all py-1 px-1 font-sans tabular-nums font-bold text-sm
                                ${userInputColorClass} placeholder-slate-700
                            `}
                        />
                    </div>
                )}
            </td>

            <td className="pp-td text-right text-slate-100">
                {comparisonPrice > 0 ? formatPriceSmart(comparisonPrice) : '-'}
            </td>

            <td className={`pp-td text-right ${diffTextColor}`}>
                {priceEntered && comparisonPrice > 0 ? formatDiffCurrency(difference) : '-'}
            </td>

            <td className={`pp-td text-right ${diffTextColor}`}>
                {priceEntered && comparisonPrice > 0 ? formatDiffPercent(percentageDifference) : '-'}
            </td>

            <QuoteTableSourcesBlock 
                distributors={marketDistributors}
                distributorColors={distributorColors}
                onDistributorPillClick={onDistributorPillClick}
                isSharePreview={isSharePreview}
                isAvgMode={isAvgMode}
            />
        </tr>
    );
};

export default memo(QuoteRow);
