import React from 'react';
import { DistributorStyle } from '../../types';

interface DistributorFilterPillsProps {
    distributors: string[];
    selected: Set<string>;
    onToggle: (name: string) => void;
    getDistributorColor: (name: string) => DistributorStyle;
}

const DistributorFilterPills: React.FC<DistributorFilterPillsProps> = ({
    distributors,
    selected,
    onToggle,
    getDistributorColor,
}) => {
    return (
        <div className="flex flex-wrap gap-2">
            {distributors.map(name => {
                const isActive = selected.has(name);
                const style = getDistributorColor(name);

                return (
                    <button
                        key={name}
                        onClick={() => onToggle(name)}
                        aria-pressed={isActive}
                        className={`
                            flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors
                            whitespace-nowrap
                            ${isActive
                                ? 'bg-slate-700 text-slate-100 border-slate-600'
                                : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'
                            }
                        `}
                    >
                        <div 
                            className="h-2 w-2 rounded-full" 
                            style={{ backgroundColor: style.background }} 
                        />
                        <span className="truncate max-w-[120px]">{name}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default DistributorFilterPills;
