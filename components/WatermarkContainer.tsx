
import React, { useMemo } from 'react';
import { buildUserWatermark } from '../utils/watermark';
import { UserProfile } from '../types';

interface WatermarkContainerProps {
  children?: React.ReactNode;
  userProfile?: UserProfile | null;
  enabled?: boolean;
  className?: string;
  opacity?: number;
}

const WatermarkContainer: React.FC<WatermarkContainerProps> = ({
  children,
  userProfile,
  enabled = true,
  className = '',
  opacity,
}) => {
  const backgroundImage = useMemo(() => {
    if (!enabled || !userProfile) return 'none';

    const { line1, line2, line3 } = buildUserWatermark(userProfile);

    const config = { 
        op: 0.06, 
        size: 240, 
        fontSize: 12, 
        textColor: '#cbd5e1' 
    };

    const finalOpacity = opacity !== undefined ? opacity : config.op;
    const rotation = -30;
    
    const width = config.size;
    const height = config.size;
    const centerX = width / 2;
    const centerY = 80; 

    const svgString = `
      <svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
        <style>
          .wm-text { 
            fill: ${config.textColor}; 
            font-size: ${config.fontSize}px; 
            font-weight: 800; 
            font-family: ui-sans-serif, system-ui, sans-serif; 
            opacity: ${finalOpacity};
            text-transform: uppercase;
          }
          .wm-mono {
            font-family: ui-monospace, SFMono-Regular, monospace;
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
          <tspan x='${centerX}' dy='-1.2em'>${line1}</tspan>
          <tspan x='${centerX}' dy='1.4em'>${line2}</tspan>
          <tspan x='${centerX}' dy='1.4em' class='wm-mono' style="font-size: 0.85em;">${line3}</tspan>
        </text>
      </svg>
    `.trim().replace(/\s+/g, ' ');

    const encodedSVG = typeof window !== 'undefined' && window.btoa 
      ? window.btoa(unescape(encodeURIComponent(svgString)))
      : ''; 
      
    return `url("data:image/svg+xml;base64,${encodedSVG}")`;
  }, [userProfile, enabled, opacity]);

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
