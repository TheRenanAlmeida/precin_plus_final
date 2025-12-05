
import React from 'react';
import { UserProfile } from '../types';

interface GlobalWatermarkProps {
  userProfile: UserProfile | null;
}

const GlobalWatermark: React.FC<GlobalWatermarkProps> = ({ userProfile }) => {
  if (!userProfile) return null;

  // Prepara os textos
  const name = userProfile.nome || 'Usuário';
  const email = userProfile.email || '';
  const cnpj = userProfile.cnpj ? `CNPJ: ${userProfile.cnpj}` : '';

  // Cria um array grande o suficiente para cobrir telas grandes (ex: 5x5 ou 6x6)
  // O CSS grid cuidará do espaçamento e repetição visual
  const items = Array.from({ length: 30 }); 

  return (
    <div className="global-watermark-overlay" aria-hidden="true">
      {items.map((_, index) => (
        <div key={index} className="global-watermark-item">
          <div className="gw-line font-bold">Precin Plus • Uso Exclusivo</div>
          <div className="gw-line">{name}</div>
          <div className="gw-line text-[10px]">{email}</div>
          {cnpj && <div className="gw-line text-[10px]">{cnpj}</div>}
        </div>
      ))}
    </div>
  );
};

export default GlobalWatermark;
