
import React from 'react';

interface SharePreviewThemeProps {
    children: React.ReactNode;
}

const SharePreviewTheme: React.FC<SharePreviewThemeProps> = ({ children }) => {
  return (
    <div className="flex flex-col items-start space-y-6 p-8 bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-[1200px] shadow-2xl mx-auto">
      {children}
    </div>
  );
};

export default SharePreviewTheme;
