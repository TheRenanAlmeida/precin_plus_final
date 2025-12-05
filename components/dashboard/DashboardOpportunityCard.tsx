
import React from 'react';
import { formatPriceSmart } from '../../utils/dataHelpers';

interface Opportunity {
  product: string;
  brandPrice: number;
  marketPrice: number;
  diff: number;
  diffPercent: number;
}

interface DashboardOpportunityCardProps {
  baseName: string;
  activeBrand: string | null;
  comparisonMode: 'min' | 'avg';
  opportunity: Opportunity | null; // Insight "negativo" (acima do mercado)
  advantage: Opportunity | null;   // Insight "positivo" (abaixo do mercado)
}

// Sub-componente para renderizar uma "caixa" de estatística dentro do card
const StatBox = ({ label, value, subtext, colorClass, bgClass, borderClass }: { label: string, value: string, subtext?: string, colorClass: string, bgClass: string, borderClass: string }) => (
    <div className={`p-3 rounded-lg border ${bgClass} ${borderClass}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${colorClass} opacity-80`}>
            {label}
        </p>
        <p className={`mt-1 text-lg font-bold ${colorClass}`}>
            {value}
        </p>
        {subtext && <p className={`mt-1 text-[11px] ${colorClass}`}>{subtext}</p>}
    </div>
);

const DashboardOpportunityCard: React.FC<DashboardOpportunityCardProps> = ({
  baseName,
  activeBrand,
  comparisonMode,
  opportunity,
  advantage,
}) => {
  const modeLabel =
    comparisonMode === 'avg' ? 'média de mercado' : 'mínima de mercado';

  const title = 'Insights do Dia';

  // Caso 1: Não tem bandeira ativa, ou não tem NENHUM insight (tudo zerado ou sem dados)
  if (!activeBrand || (!opportunity && !advantage)) {
    return (
      <section className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600">
            📊
          </span>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        <p className="text-sm text-gray-700">
            {!activeBrand 
                ? "Selecione uma bandeira para ver os insights de preço." 
                : `Seus preços estão alinhados com o mercado na base ${baseName || 'selecionada'}.`}
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700">
            📈
          </span>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        {baseName && (
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {baseName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* BLOCO 1 – Oportunidade (Alerta / Acima do mercado) */}
          {opportunity ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-600 text-xl">⚠️</span>
                      <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Atenção: preço acima da referência de mercado</h3>
                  </div>
                  
                  <p className="text-sm text-gray-700">
                    Em <span className="font-semibold">{activeBrand}</span>, o preço de <span className="font-semibold">{opportunity.product}</span> está{' '}
                    <span className="font-bold text-red-700">
                        {formatPriceSmart(opportunity.diff)} (+{opportunity.diffPercent.toFixed(2)}%)
                    </span>{' '}
                    acima da <strong>referência de mercado</strong> ({modeLabel}) no período analisado.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-auto">
                      <StatBox 
                        label="Seu Preço" 
                        value={formatPriceSmart(opportunity.brandPrice)} 
                        bgClass="bg-white" borderClass="border-slate-200" colorClass="text-slate-800" 
                      />
                      <StatBox 
                        label="Mercado" 
                        value={formatPriceSmart(opportunity.marketPrice)} 
                        bgClass="bg-white" borderClass="border-slate-200" colorClass="text-slate-800" 
                      />
                      <div className="col-span-2 sm:col-span-1">
                        <StatBox 
                            label="Diferença" 
                            value={`+ ${formatPriceSmart(opportunity.diff)}`} 
                            subtext="Negocie com a distribuidora!"
                            bgClass="bg-red-50" borderClass="border-red-100" colorClass="text-red-800" 
                        />
                      </div>
                  </div>
              </div>
          ) : (
             <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col justify-center items-center text-center gap-2 opacity-70">
                 <span className="text-2xl">✅</span>
                 <p className="text-sm font-medium text-gray-600">Nenhum produto acima do mercado hoje.</p>
             </div>
          )}

          {/* BLOCO 2 – Ponto Forte (Vantagem / Abaixo do mercado) */}
          {advantage ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-1">
                      <span className="text-emerald-600 text-xl">🏆</span>
                      <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Vantagem de preço</h3>
                  </div>

                  <p className="text-sm text-gray-700">
                    Em <span className="font-semibold">{activeBrand}</span>, o preço de <span className="font-semibold">{advantage.product}</span> está{' '}
                    <span className="font-bold text-emerald-700">
                        {formatPriceSmart(Math.abs(advantage.diff))} ({advantage.diffPercent.toFixed(2)}%)
                    </span>{' '}
                    abaixo da <strong>referência de mercado</strong> ({modeLabel}) no período analisado.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-auto">
                      <StatBox 
                        label="Seu Preço" 
                        value={formatPriceSmart(advantage.brandPrice)} 
                        bgClass="bg-white" borderClass="border-slate-200" colorClass="text-slate-800" 
                      />
                      <StatBox 
                        label="Mercado" 
                        value={formatPriceSmart(advantage.marketPrice)} 
                        bgClass="bg-white" borderClass="border-slate-200" colorClass="text-slate-800" 
                      />
                      <div className="col-span-2 sm:col-span-1">
                        <StatBox 
                            label="Vantagem" 
                            value={`${formatPriceSmart(advantage.diff)}`} 
                            subtext="Seu preço está abaixo da referência de mercado no período analisado."
                            bgClass="bg-emerald-100" borderClass="border-emerald-200" colorClass="text-emerald-800" 
                        />
                      </div>
                  </div>
              </div>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col justify-center items-center text-center gap-2 opacity-70">
                 <span className="text-2xl">⚖️</span>
                 <p className="text-sm font-medium text-gray-600">Nenhum produto com vantagem competitiva destacada.</p>
             </div>
          )}
      </div>
    </section>
  );
};

export default DashboardOpportunityCard;
