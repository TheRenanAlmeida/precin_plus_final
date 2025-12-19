
import React from 'react';
import { Tip } from './Tip';

interface FilterButtonProps {
    label: React.ReactNode;
    active: boolean;
    disabled?: boolean;
    onClick: () => void;
    size?: 'sm' | 'md';
    className?: string;
    tooltip?: React.ReactNode;
}

/**
 * Componente padronizado para botões de filtro em toda a aplicação.
 * Agora com suporte nativo a Tooltips.
 */
const FilterButton: React.FC<FilterButtonProps> = ({ 
    label, 
    active, 
    disabled = false, 
    onClick, 
    size = 'md',
    className = '',
    tooltip
}) => {
    const sizeClasses = {
        sm: 'px-2 py-1 text-[10px]',
        md: 'px-3 py-1.5 text-xs'
    };

    const baseClasses = "rounded-lg border font-bold uppercase tracking-wide transition-all shadow-sm flex items-center justify-center gap-2";
    
    const stateClasses = active 
        ? "border-emerald-500/60 text-emerald-200 bg-emerald-500/10" 
        : "border-slate-700 bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200";
    
    const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";

    const button = (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${sizeClasses[size]} ${stateClasses} ${disabledClasses} ${className}`}
        >
            {label}
        </button>
    );

    if (tooltip) {
        return (
            <Tip text={tooltip} underline={false}>
                {button}
            </Tip>
        );
    }

    return button;
};

export default FilterButton;
