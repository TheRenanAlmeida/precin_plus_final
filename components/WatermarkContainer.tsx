
import React, { useMemo } from 'react';

interface WatermarkContainerProps {
  children: React.ReactNode;
  company?: string;
  cnpj?: string;
  email?: string;
  enabled?: boolean;
  className?: string;
  /**
   * Quantos pixels do topo devem ficar SEM marca d’água (offset visual).
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
  const backgroundImage = useMemo(() => {
    if (!enabled || (!company && !cnpj && !email)) return 'none';

    // Cores e estilo do texto SVG
    const textColor = '#94a3b8'; // slate-400
    const opacity = 0.08; // Bem sutil
    const fontSize = 13;
    const rotation = -30;
    
    // Tamanho do "azulejo" repetido
    const width = 350;
    const height = 350;
    const centerX = width / 2;
    const centerY = height / 2;

    // Construção segura do SVG string
    // Usamos <tspan> para quebra de linha manual, centralizando cada linha
    const svgString = `
      <svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
        <style>
          .wm-text { 
            fill: ${textColor}; 
            font-size: ${fontSize}px; 
            font-weight: 700; 
            font-family: ui-sans-serif, system-ui, sans-serif; 
            opacity: ${opacity};
            pointer-events: none;
            user-select: none;
          }
        </style>
        <text 
          x='${centerX}' 
          y='${centerY}' 
          text-anchor='middle' 
          dominant-baseline='middle' 
          transform='rotate(${rotation} ${centerX} ${centerY})' 
          class='wm-text'
        >
          ${company ? `<tspan x='${centerX}' dy='-1.4em'>${company}</tspan>` : ''}
          ${email ? `<tspan x='${centerX}' dy='1.4em'>${email}</tspan>` : ''}
          ${cnpj ? `<tspan x='${centerX}' dy='1.4em'>${cnpj}</tspan>` : ''}
        </text>
      </svg>
    `.trim().replace(/\s+/g, ' ');

    // Codifica para Base64 para usar no CSS background
    // escape() é deprecated mas funcional para utf8 simples, ou encodeURIComponent para maior segurança
    const encodedSVG = typeof window !== 'undefined' && window.btoa 
      ? window.btoa(unescape(encodeURIComponent(svgString)))
      : ''; 
      
    return `url("data:image/svg+xml;base64,${encodedSVG}")`;
  }, [company, cnpj, email, enabled]);

  return (
    <div 
        className={`relative overflow-hidden ${className}`}
        style={{
            backgroundImage: backgroundImage,
            backgroundRepeat: 'repeat',
            backgroundPosition: `0px ${offsetTop}px`, // Respeita o offsetTop movendo o bg
        }}
    >
      {/* O conteúdo fica por cima (z-index natural ou definido) */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};

export default WatermarkContainer;
