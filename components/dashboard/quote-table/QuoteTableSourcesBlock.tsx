
import React from 'react';
import type { DistributorColors } from '../../../types';

interface QuoteTableSourcesBlockProps {
    distributors: string[];
    distributorColors: DistributorColors;
    onDistributorPillClick?: (dist: string) => void;
    isSharePreview: boolean;
    isAvgMode: boolean; // Para decidir bordas e layouts específicos
}

const QuoteTableSourcesBlock: React.FC<QuoteTableSourcesBlockProps> = ({
    distributors,
    distributorColors,
    onDistributorPillClick,
    isSharePreview,
    isAvgMode
}) => {
    // Define o deslocamento vertical baseado no modo
    const pillTextOffsetClass = isSharePreview ? 'translate-y-[-6px]' : 'translate-y-[1px]';
    
    // Pill Styles
    const pillBaseClass = "inline-flex items-center justify-center px-2.5 h-6 rounded-r bg-slate-800 border-l-[4px] shadow-sm transition-all border-y border-r border-slate-700/50 hover:bg-slate-700 cursor-pointer group/pill";
    const pillTextClass = `inline-block text-xs font-bold text-slate-200 group-hover/pill:text-white leading-none whitespace-nowrap ${pillTextOffsetClass}`;

    // Estilo da célula container
    // Usa classes padronizadas do index.html (pp-td) ou inline styles específicos
    const sourcesCellClass = `pp-td text-right ${isAvgMode ? 'border-b-0 border-transparent border-0' : ''}`;
    const sourcesCellStyle = isAvgMode ? { borderBottom: 'none', border: 'none' } : {};

    return (
        <td className={sourcesCellClass} style={sourcesCellStyle}>
            <div className="flex flex-wrap justify-end gap-1.5 items-center min-h-[32px]">
                {distributors.length > 0 ? (
                    distributors.map((distributor) => {
                        const style = distributorColors[distributor] || distributorColors.DEFAULT;
                        return (
                            <button 
                                key={distributor} 
                                onClick={() => onDistributorPillClick?.(distributor)}
                                className={pillBaseClass}
                                style={{ borderLeftColor: style.background }}
                                title={distributor}
                            >
                                <span className={pillTextClass}>{distributor}</span>
                            </button>
                        );
                    })
                ) : (
                    <span className="text-xs text-slate-600">-</span>
                )}
            </div>
        </td>
    );
};

export default QuoteTableSourcesBlock;
