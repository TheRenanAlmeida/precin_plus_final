
import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';

interface TipProps {
    text: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    underline?: boolean;
    side?: 'top' | 'bottom';
    as?: React.ElementType;
}

/**
 * Componente wrapper simples para Tooltips.
 * Envolve o children em um trigger e exibe o text no hover.
 */
export const Tip: React.FC<TipProps> = ({ 
    text, 
    children, 
    className, 
    underline = true, 
    side = 'top',
    as: Component = 'span' 
}) => {
    // Se não houver texto, renderiza apenas o children sem tooltip
    if (!text) return <>{children}</>;

    const decorationClass = underline 
        ? 'cursor-help decoration-dotted decoration-slate-500 underline-offset-2' 
        : '';

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Component className={`${decorationClass} ${className || ''}`}>
                    {children}
                </Component>
            </TooltipTrigger>
            <TooltipContent side={side}>
                {text}
            </TooltipContent>
        </Tooltip>
    );
};
