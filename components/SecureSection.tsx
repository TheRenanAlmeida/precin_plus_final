
import React from 'react';
import WatermarkContainer from './WatermarkContainer';
import { UserProfile } from '../types';

interface SecureSectionProps {
    userProfile: UserProfile | null | undefined;
    children: React.ReactNode;
    className?: string;
    offsetTop?: number;
    enabled?: boolean;
}

/**
 * Wrapper de segurança que aplica a marca d'água com os dados do usuário
 * em seções sensíveis do sistema.
 */
const SecureSection: React.FC<SecureSectionProps> = ({ 
    userProfile, 
    children, 
    className = '', 
    offsetTop = 0,
    enabled = true 
}) => {
    if (!userProfile) {
        return <div className={className}>{children}</div>;
    }

    const companyName = `Precin Plus • ${userProfile.nome}`;
    const cnpjText = userProfile.cnpj ? `CNPJ: ${userProfile.cnpj}` : '';
    
    return (
        <WatermarkContainer
            company={companyName}
            email={userProfile.email}
            cnpj={cnpjText}
            className={className}
            offsetTop={offsetTop}
            enabled={enabled}
        >
            {children}
        </WatermarkContainer>
    );
};

export default SecureSection;
