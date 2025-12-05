import React from 'react';

interface WatermarkContainerProps {
  children: React.ReactNode;
  company?: string;
  cnpj?: string;
  email?: string;
  enabled?: boolean;
  className?: string;
  /**
   * Quantos pixels do topo devem ficar SEM marca d’água.
   * Ex: 0 = marca d’água desde o topo
   * Ex: 140 = só a partir de 140px pra baixo
   */
  offsetTop?: number;
}

const WatermarkContainer: React.FC<WatermarkContainerProps> = ({
  children,
  company = '',
  cnpj = '',
  email = '',
  enabled = true,
  className = '',
  offsetTop = 0,
}) => {
  const shouldShow = enabled && (company || cnpj || email);

  const watermarkBlock = (
    <div className="flex flex-col text-center leading-tight">
      <span>{company}</span>
      <span>{cnpj}</span>
      <span>{email}</span>
    </div>
  );

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Grade de blocos repetidos - só a partir de offsetTop */}
      {shouldShow && (
        <div
          className="
            pointer-events-none absolute left-0 right-0 bottom-0
            z-[60] select-none
            opacity-10 text-gray-700 font-semibold
            grid place-items-center
          "
          style={{
            top: offsetTop,
            transform: 'rotate(-30deg)',
            fontSize: '14px',
            gridTemplateColumns: 'repeat(auto-fill, 260px)',
            gridAutoRows: '120px',
          }}
        >
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i}>{watermarkBlock}</div>
          ))}
        </div>
      )}

      {/* Conteúdo normal */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default WatermarkContainer;