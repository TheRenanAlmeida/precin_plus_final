
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// --- Context & Types ---
interface TooltipContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  coords: { x: number; y: number };
  setTriggerRect: (rect: DOMRect) => void;
  delayDuration: number;
}

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

// --- Provider ---
export const TooltipProvider: React.FC<{ children: React.ReactNode; delayDuration?: number }> = ({ 
  children, 
  delayDuration = 200 
}) => {
  // Simple pass-through context, state is managed per Tooltip instance for now, 
  // but provider sets global defaults.
  return <>{children}</>;
};

// --- Root Component ---
export const Tooltip: React.FC<{ children: React.ReactNode; delayDuration?: number }> = ({ 
  children, 
  delayDuration = 200 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsOpen(true), delayDuration);
  };

  const close = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsOpen(false), 100); // Small exit delay
  };

  const setTriggerRect = (rect: DOMRect) => {
    // Calculate center top position
    // We adjust Y to be above the element
    setCoords({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
  };

  return (
    <TooltipContext.Provider value={{ isOpen, open, close, coords, setTriggerRect, delayDuration }}>
      {children}
    </TooltipContext.Provider>
  );
};

// --- Trigger ---
export const TooltipTrigger: React.FC<{ children: React.ReactNode; asChild?: boolean; className?: string }> = ({ 
  children, 
  asChild,
  className 
}) => {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error("TooltipTrigger must be used within a Tooltip");

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    ctx.setTriggerRect(rect);
    ctx.open();
  };

  // Clone element if asChild is true to avoid wrapper div mess
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: ctx.close,
      onFocus: ctx.open,
      onBlur: ctx.close,
      // Merge classNames if existing
      className: `${child.props.className || ''} ${className || ''}`.trim()
    });
  }

  return (
    <div 
      className={className}
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={ctx.close}
      onFocus={ctx.open}
      onBlur={ctx.close}
    >
      {children}
    </div>
  );
};

// --- Content (Portal) ---
export const TooltipContent: React.FC<{ children: React.ReactNode; className?: string; side?: 'top' | 'bottom' }> = ({ 
  children, 
  className,
  side = 'top' 
}) => {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error("TooltipContent must be used within a Tooltip");

  if (!ctx.isOpen) return null;

  // Use Portal to render outside of any overflow:hidden containers
  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: ctx.coords.x,
        top: ctx.coords.y - 8, // slight offset
        transform: 'translate(-50%, -100%)', // Center horizontally, move up
        zIndex: 9999,
        pointerEvents: 'none'
      }}
      className={`
        animate-in fade-in-0 zoom-in-95 duration-200
        z-50 overflow-hidden rounded-md border border-slate-800 bg-slate-900 
        px-3 py-1.5 text-xs text-slate-100 shadow-xl
        max-w-[260px] text-center leading-relaxed
        ${className || ''}
      `}
    >
      {children}
      {/* Tiny arrow (optional) */}
      <div className="absolute left-1/2 bottom-[-4px] -translate-x-1/2 w-2 h-2 bg-slate-900 border-b border-r border-slate-800 rotate-45 transform"></div>
    </div>,
    document.body
  );
};
