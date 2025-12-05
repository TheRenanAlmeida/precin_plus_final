import React from 'react';

interface DashboardSummaryCardsProps {
  baseAtual: string;
  totalBasesDisponiveis: number;
  totalDistribuidoras: number;
  distribuidorasSelecionadas: number;
  lastUpdate: string;
}

const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({
  baseAtual,
  totalBasesDisponiveis,
  totalDistribuidoras,
  distribuidorasSelecionadas,
  lastUpdate,
}) => {
  const stats = [
    {
      label: 'Base',
      value: baseAtual || '—',
    },
    {
      label: 'Distribuidoras',
      value: `${distribuidorasSelecionadas}/${totalDistribuidoras}`,
    },
    {
      label: 'Atualização',
      value: lastUpdate,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-6 sm:gap-10 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-6 py-3 mb-4 shadow-sm">
        {stats.map((stat, index) => (
            <div key={stat.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-gray-500 font-medium uppercase text-xs tracking-wide">{stat.label}:</span>
                <span className="font-bold text-gray-900 tabular-nums">{stat.value}</span>
            </div>
        ))}
        <div className="hidden sm:block flex-grow"></div>
        <div className="text-xs text-gray-400">
            Dados fornecidos por precin+
        </div>
    </div>
  );
};

export default DashboardSummaryCards;