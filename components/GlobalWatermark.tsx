
import React from 'react';
import { UserProfile } from '../types';
import WatermarkContainer from './WatermarkContainer';

interface GlobalWatermarkProps {
  userProfile: UserProfile | null;
}

const GlobalWatermark: React.FC<GlobalWatermarkProps> = ({ userProfile }) => {
  if (!userProfile) return null;

  // Usa position: absolute com h-full e w-full.
  // Isso requer que o pai (em App.tsx) tenha 'relative' e cresça com o conteúdo.
  // z-index alto (50) para ficar SOBRE o conteúdo, mas pointer-events-none permite cliques.
  // Scrollar junto com a página evita a sensação de "flutuar" sobre os elementos.
  return (
    <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden" aria-hidden="true">
        <WatermarkContainer 
            userProfile={userProfile} 
            className="w-full h-full"
        />
    </div>
  );
};

export default GlobalWatermark;