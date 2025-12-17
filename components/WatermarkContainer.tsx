
import React, { useMemo } from 'react';
import { buildUserWatermark } from '../utils/watermark';
import { UserProfile } from '../types';

interface WatermarkContainerProps {
  children?: React.ReactNode;
  userProfile?: UserProfile | null;
  base?: string;
  enabled?: boolean;
  className?: string;
  opacity?: number;
}

const WatermarkContainer: React.FC<WatermarkContainerProps> = ({
  children,
  userProfile,
  base,
  enabled = true,
  className = '',
  opacity,
}) => {
  const backgroundImage = useMemo(() => {
    if (!enabled || !userProfile) return 'none';

    const { line1, line2 } = buildUserWatermark(userProfile, base);

    // Configuração Única (Estilo denso para tabelas/seções)
    // Reduzido para 0.06 conforme solicitado para maior sutileza
    const config = { 
        op: 0.06, 
        size: 200, 
        fontSize: 11,
        textColor: '#cbd5e1' // slate-300
    };

    const finalOpacity = opacity !== undefined ? opacity : config.op;
    const rotation = -30;
    
    const width = config.size;
    const height = config.size;
    const centerX = width / 2;
    const centerY = height / 2;

    const svgString = `
      <svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
        <style>
          .wm-text { 
            fill: ${config.textColor}; 
            font-size: ${config.fontSize}px; 
            font-weight: 700; 
            font-family: ui-sans-serif, system-ui, sans-serif; 
            opacity: ${finalOpacity};
            pointer-events: none;
            user-select: none;
            text-transform: uppercase;
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
          <tspan x='${centerX}' dy='-1.0em'>PRECIN PLUS • CONFIDENCIAL</tspan>
          <tspan x='${centerX}' dy='1.4em'>${line1}</tspan>
          <tspan x='${centerX}' dy='1.4em' style="font-size: 0.85em; font-family: monospace;">${line2}</tspan>
        </text>
      </svg>
    `.trim().replace(/\s+/g, ' ');

    const encodedSVG = typeof window !== 'undefined' && window.btoa 
      ? window.btoa(unescape(encodeURIComponent(svgString)))
      : ''; 
      
    return `url("data:image/svg+xml;base64,${encodedSVG}")`;
  }, [userProfile, base, enabled, opacity]);

  return (
    <div 
        className={`relative overflow-hidden ${className}`}
        style={{
            backgroundImage: backgroundImage,
            backgroundRepeat: 'repeat',
            pointerEvents: 'none',
        }}
    >
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
};

export default WatermarkContainer;
