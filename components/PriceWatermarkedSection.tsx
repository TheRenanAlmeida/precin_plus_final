
import React, { forwardRef } from 'react';
import WatermarkContainer from './WatermarkContainer';
import { UserProfile } from '../types';

interface PriceWatermarkedSectionProps {
    userProfile: UserProfile;
    selectedBase?: string; // Mantido para compatibilidade de tipos em outros arquivos, mas não usado no WatermarkContainer
    children: React.ReactNode;
    className?: string;
    wrapperClass?: string; 
}

/**
 * Wrapper de segurança para áreas que exibem preço.
 * Renderiza um WatermarkContainer ABSOLUTO no TOPO (Overlay).
 */
const PriceWatermarkedSection = forwardRef<HTMLDivElement, PriceWatermarkedSectionProps>(({
    userProfile,
    children,
    className = "",
    wrapperClass = ""
}, ref) => {
    return (
        <div ref={ref} className={`relative ${className}`}>
            {/* Conteúdo Real (Fundo) */}
            <div className={`relative z-0 ${wrapperClass}`}>
                {children}
            </div>

            {/* Camada de Watermark Absoluta (Frente) */}
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[inherit]">
                <WatermarkContainer 
                    userProfile={userProfile} 
                    className="w-full h-full"
                />
            </div>
        </div>
    );
});

PriceWatermarkedSection.displayName = 'PriceWatermarkedSection';

export default PriceWatermarkedSection;
