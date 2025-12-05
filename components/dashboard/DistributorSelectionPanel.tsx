import React from 'react';
import type { DistributorSelectionPanelProps } from '../../types';

const DistributorSelectionPanel: React.FC<DistributorSelectionPanelProps> = ({
  allDistributors,
  selectedDistributors,
  onSelectionChange,
  onSelectAll,
  onClearAll,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Filtro de Distribuidoras</h3>
          <p className="text-sm text-gray-600">Selecione as Distribuidoras para incluir nos cálculos de Média e Mínima.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onSelectAll} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-md focus:outline-none border border-green-400">
            Selecionar Todas
          </button>
          <button onClick={onClearAll} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors shadow-md focus:outline-none border border-green-400">
            Limpar Seleção
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {allDistributors.map(distributor => {
          const isSelected = selectedDistributors.has(distributor);
          return (
            <label
              key={distributor}
              htmlFor={`distributor-filter-${distributor}`}
              className={`
                flex items-center gap-2 cursor-pointer py-2 px-3 rounded-full
                border text-sm font-medium transition-all duration-200 select-none border-green-400
                ${isSelected 
                  ? 'bg-green-50 text-green-800 shadow-sm' 
                  : 'bg-white hover:bg-gray-50 text-gray-700'
                }
              `}
            >
              <input
                id={`distributor-filter-${distributor}`}
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelectionChange(distributor, !isSelected)}
                className="sr-only"
              />
              <div className={`
                w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all
                ${isSelected 
                  ? 'bg-green-600 border-green-600' 
                  : 'bg-white border-2 border-gray-300'
                }
              `}>
                {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
              </div>
              <span className="truncate">{distributor}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default DistributorSelectionPanel;