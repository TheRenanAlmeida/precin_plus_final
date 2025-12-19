
import React, { useState, useMemo, useEffect } from 'react';
import { BandeiraBasePair, DistributorStyle } from '../../types';
import DistributorCard from './DistributorCard';
import { Tip } from '../common/Tip';
import { TOOLTIP } from '../../constants/tooltips';
import { formatDateForInput } from '../../utils/dateUtils';
import { getMarketSourcesCount } from '../../services/marketDay.service';
import { supabase } from '../../supabaseClient';

interface UserDistributor extends BandeiraBasePair {
    imageUrl: string | null;
}

interface DayShortcut {
    iso: string;
    label: string;
    shortDate: string;
    isQuoted: boolean; // Indica se o usuário já preencheu cotações neste dia
}

interface UserDistributorsSectionProps {
    userDistributorsForBase: UserDistributor[];
    distributorColors: { [key: string]: DistributorStyle };
    lastPrices: { [brand: string]: { [product: string]: { price: number; date: string } } };
    availableBases: string[];
    selectedBase: string;
    setSelectedBase: (value: string) => void;
    selectedQuoteDate: string;
    setSelectedQuoteDate: (date: string) => void;
    handleSelectDistributorToQuote: (dist: BandeiraBasePair) => void;
    userId?: string;
}

const UserDistributorsSection: React.FC<UserDistributorsSectionProps> = ({
    userDistributorsForBase, 
    distributorColors, 
    lastPrices, 
    availableBases, 
    selectedBase, 
    setSelectedBase, 
    selectedQuoteDate,
    setSelectedQuoteDate,
    handleSelectDistributorToQuote,
    userId
}) => {
    const [dismissHelp, setDismissHelp] = useState(() => {
        return localStorage.getItem('precin_hide_retro_help') === 'true';
    });

    const [availableDayShortcuts, setAvailableDayShortcuts] = useState<DayShortcut[]>([]);
    const [isLoadingDays, setIsLoadingDays] = useState(false);

    const handleDismiss = () => {
        setDismissHelp(true);
        localStorage.setItem('precin_hide_retro_help', 'true');
    };

    // Efeito para buscar os últimos 5 dias que possuem dados de mercado e status de preenchimento
    useEffect(() => {
        if (!selectedBase || !userId) return;
        
        const controller = new AbortController();
        const checkDaysAvailability = async () => {
            setIsLoadingDays(true);
            const today = new Date();
            
            // 1. Coletamos datas de cotações do usuário FILTRANDO POR BASE
            const twentyDaysAgo = new Date();
            twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
            
            const { data: userQuotes } = await supabase
                .from('pplus_user_daily_prices')
                .select('price_date')
                .eq('user_id', userId)
                .eq('base_name', selectedBase) // CRUCIAL: Filtra pela base selecionada
                .gte('price_date', formatDateForInput(twentyDaysAgo))
                .abortSignal(controller.signal);
            
            const quotedDatesSet = new Set(userQuotes?.map(q => q.price_date) || []);

            // 2. Geramos os últimos 20 dias como candidatos para encontrar 5 úteis
            const dayCheckPromises = Array.from({ length: 20 }).map(async (_, i) => {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const iso = formatDateForInput(date);
                
                // Checa se o mercado existiu via RPC
                const sources = await getMarketSourcesCount(selectedBase, iso, controller.signal);
                
                if (sources > 0) {
                    return {
                        iso,
                        label: i === 0 ? 'Hoje' : i === 1 ? 'Ontem' : date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
                        shortDate: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                        timestamp: date.getTime(),
                        isQuoted: quotedDatesSet.has(iso)
                    };
                }
                return null;
            });

            const results = await Promise.all(dayCheckPromises);
            if (controller.signal.aborted) return;

            const validOnes = results
                .filter((r): r is (DayShortcut & { timestamp: number }) => r !== null)
                .sort((a, b) => a.timestamp - b.timestamp)
                .slice(-5); 

            setAvailableDayShortcuts(validOnes.map(({ timestamp, ...rest }) => rest));
            setIsLoadingDays(false);
        };

        checkDaysAvailability();
        return () => controller.abort();
    }, [selectedBase, userId, lastPrices]);

    const quotedProgress = useMemo(() => {
        if (userDistributorsForBase.length === 0) return { x: 0, y: 0 };
        const x = userDistributorsForBase.filter(dist => {
            const brandPrices = lastPrices[dist.bandeira];
            return brandPrices && Object.values(brandPrices).some((p: any) => p.date === selectedQuoteDate);
        }).length;
        return { x, y: userDistributorsForBase.length };
    }, [userDistributorsForBase, lastPrices, selectedQuoteDate]);

    return (
        <>
            <div className="flex flex-col mb-4 border-b border-slate-800 pb-3 font-sans">
                <div className="flex justify-between items-start mb-1">
                    <h2 className="text-xl font-bold text-slate-100 leading-tight">
                        <Tip text={TOOLTIP.HEADER_MY_DISTRIBUTORS}>
                            Minhas Distribuidoras
                        </Tip>
                    </h2>
                    {quotedProgress.y > 0 && (
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter mb-0.5">Progresso na Data</span>
                            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                                <div className="flex gap-0.5">
                                    {Array.from({ length: quotedProgress.y }).map((_, i) => (
                                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < quotedProgress.x ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                                    ))}
                                </div>
                                <span className="text-[10px] font-black text-slate-200 tabular-nums">
                                    {quotedProgress.x}/{quotedProgress.y}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {!dismissHelp && (
                    <div className="mt-3 mb-4 bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-3 relative animate-fade-in">
                        <button onClick={handleDismiss} className="absolute top-2 right-2 text-emerald-700 hover:text-emerald-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="flex gap-3">
                            <div className="bg-emerald-500/10 p-2 rounded-lg h-fit text-emerald-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Lançar cotações retroativas?</h4>
                                <p className="text-xs text-emerald-200 font-sans font-medium mt-1 leading-relaxed">
                                    Escolha a data abaixo para registrar preços de dias anteriores.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-slate-300 font-medium px-1">
                            Cotações nos últimos dias com mercado:
                        </p>
                        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide bg-slate-900/40 p-1.5 rounded-xl border border-slate-800">
                            {isLoadingDays ? (
                                <div className="flex gap-1 animate-pulse w-full">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex-1 min-w-[60px] h-[36px] bg-slate-800/50 rounded-lg"></div>
                                    ))}
                                </div>
                            ) : availableDayShortcuts.length > 0 ? (
                                <>
                                    {availableDayShortcuts.map((day) => {
                                        const isActive = selectedQuoteDate === day.iso;
                                        
                                        // Cores de status de preenchimento (Escrito Verde/Vermelho)
                                        const textStatusClass = day.isQuoted ? 'text-emerald-500' : 'text-rose-500';
                                        
                                        return (
                                            <button
                                                key={day.iso}
                                                onClick={() => setSelectedQuoteDate(day.iso)}
                                                className={`
                                                    flex flex-col items-center justify-center flex-1 min-w-[65px] py-1.5 rounded-lg transition-all duration-300 border
                                                    ${isActive 
                                                        ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[inset_0_0_12px_rgba(16,185,129,0.08)] z-10 scale-[1.02]' 
                                                        : 'bg-transparent border-transparent hover:bg-slate-800/60'}
                                                `}
                                            >
                                                <span className={`text-[9px] font-black uppercase leading-none tracking-tight ${textStatusClass}`}>{day.label}</span>
                                                <span className={`text-[10px] font-bold mt-1 tabular-nums ${textStatusClass}`}>{day.shortDate}</span>
                                                {isActive && (
                                                     <div className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5 shadow-[0_0_8px_rgba(16,185,129,1)] animate-pulse"></div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </>
                            ) : (
                                <span className="text-[10px] text-slate-500 italic font-sans px-2 py-1.5">Nenhum dado recente.</span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1 font-sans">
                            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700 flex-grow">
                                <span className="text-[10px] font-bold text-slate-300 uppercase">Calendário</span>
                                <input
                                    type="date"
                                    value={selectedQuoteDate}
                                    onChange={(e) => setSelectedQuoteDate(e.target.value)}
                                    className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none custom-date-picker-style flex-grow"
                                />
                            </div>
                            
                            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 shadow-inner max-w-[150px]">
                                <select
                                    id="base-selector"
                                    value={selectedBase}
                                    onChange={(e) => setSelectedBase(e.target.value)}
                                    className="bg-transparent border-none text-slate-200 text-[10px] font-black uppercase focus:ring-0 focus:outline-none p-0 cursor-pointer w-full text-center"
                                >
                                    {availableBases.map(base => (
                                        <option key={base} value={base} className="bg-slate-900">{base}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                {userDistributorsForBase.map((dist) => {
                    const style = distributorColors[dist.bandeira];
                    if (!style) return null;
                    return (
                        <DistributorCard 
                            key={`${dist.bandeira}-${dist.base}`}
                            dist={dist}
                            style={style}
                            lastPrices={lastPrices}
                            onSelect={handleSelectDistributorToQuote}
                            imageUrl={dist.imageUrl}
                            selectedQuoteDate={selectedQuoteDate}
                        />
                    );
                })}
            </div>
        </>
    );
};

export default UserDistributorsSection;
