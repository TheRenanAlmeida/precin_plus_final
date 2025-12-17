
import React, { forwardRef } from 'react';
import WatermarkContainer from './WatermarkContainer';
import { UserProfile } from '../types';

interface PriceWatermarkedSectionProps {
    userProfile: UserProfile;
    selectedBase?: string;
    children: React.ReactNode;
    className?: string;
    wrapperClass?: string; 
}

/**
 * Wrapper de segurança para áreas que exibem preço.
 * Renderiza um WatermarkContainer ABSOLUTO no TOPO (Overlay).
 * Garante que a marca d'água fique SOBRE o conteúdo, protegendo os dados e cobrindo espaços vazios.
 */
const PriceWatermarkedSection = forwardRef<HTMLDivElement, PriceWatermarkedSectionProps>(({
    userProfile,
    selectedBase,
    children,
    className = "",
    wrapperClass = ""
}, ref) => {
    return (
        <div ref={ref} className={`relative ${className}`}>
            {/* Conteúdo Real (Fundo) - z-0 para ficar abaixo da marca d'água */}
            <div className={`relative z-0 ${wrapperClass}`}>
                {children}
            </div>

            {/* Camada de Watermark Absoluta (Frente) - z-10 Overlay */}
            {/* pointer-events-none é CRÍTICO para permitir interação com o conteúdo abaixo */}
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[inherit]">
                <WatermarkContainer 
                    userProfile={userProfile} 
                    base={selectedBase}
                    className="w-full h-full"
                />
            </div>
        </div>
    );
});

PriceWatermarkedSection.displayName = 'PriceWatermarkedSection';

export default PriceWatermarkedSection;
