import React from 'react';

interface TableSkeletonLoaderProps {
  rows?: number;
  cols?: number;
  hasHeader?: boolean;
}

const TableSkeletonLoader: React.FC<TableSkeletonLoaderProps> = ({ rows = 5, cols = 6, hasHeader = true }) => {
  return (
    <div className="w-full overflow-hidden">
      <div className="animate-pulse">
        {hasHeader && (
          <div className="flex bg-slate-200 p-3 mb-1">
            {Array.from({ length: cols }).map((_, i) => (
              <div key={i} className={`flex-1 ${i === 0 ? 'w-1/4' : 'w-3/4'}`}>
                <div className="h-4 bg-slate-300 rounded"></div>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2 p-2">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex space-x-2 items-center">
              {Array.from({ length: cols }).map((_, colIndex) => (
                 <div key={colIndex} className={`h-8 bg-slate-200 rounded ${colIndex === 0 ? 'w-1/4' : 'w-3/4'}`}></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TableSkeletonLoader;
