
import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import { UserProfile, BandeiraBasePair, DistributorStyle, DistributorDBStyle } from '../types';
import { supabase } from '../supabaseClient';
import LoadingScreen from '../components/LoadingScreen';

// Import modular components
import NavigationSidebar from '../components/menu/NavigationSidebar';
import UserDistributorsSection from '../components/menu/UserDistributorsSection';
import MarketDistributorsSection from '../components/menu/MarketDistributorsSection';
import NotificationToast from '../components/menu/NotificationToast';
import QuoteInputForm from '../components/menu/QuoteInputForm';
import { getDistributorStyle, getOriginalBrandName } from '../utils/styleManager';
import { formatDateForInput } from '../utils/dateUtils';
import { getErrorMessage } from '../utils/errorHelpers';
import { getMarketDayStatus, MarketDayStatus } from '../services/marketDay.service';

interface DistributorData {
    name: string;
    bases: string;
    imagem: string | null;
}

interface MenuProps {
    goToDashboard: () => void;
    goToHistory: () => void;
    goToAdmin: () => void;
    goToContracts: () => void;
    userProfile: UserProfile | null;
    availableBases: string[];
    selectedBase: string;
    setSelectedBase: (base: string) => void;
}

const Menu = ({ 
    goToDashboard, goToHistory, goToAdmin, goToContracts, userProfile, availableBases, selectedBase, setSelectedBase
}: MenuProps) => {
    
    const [selectedDistributorToQuote, setSelectedDistributorToQuote] = useState<BandeiraBasePair | null>(null);
    const [allDistributors, setAllDistributors] = useState<DistributorData[]>([]);
    const [distributorColors, setDistributorColors] = useState<{ [key: string]: DistributorStyle }>({});
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [selectedQuoteDate, setSelectedQuoteDate] = useState<string>(() => formatDateForInput(new Date()));
    const [lastPrices, setLastPrices] = useState<{ [brand: string]: { [product: string]: { price: number; date: string } } }>({});
    const [pendingQuotes, setPendingQuotes] = useState<{ [key: string]: { [product: string]: string } }>({});
    const [priceDataVersion, setPriceDataVersion] = useState(0);
    const [dbStyles, setDbStyles] = useState<Map<string, DistributorDBStyle>>(new Map());
    
    // Estado do Dia de Mercado
    const [marketDay, setMarketDay] = useState<{ checking: boolean } & MarketDayStatus>({
        checking: false,
        sources: 0,
        valid: true,
        lastValidDay: null
    });

    // Efeito para validar o dia usando a nova RPC única com DEBOUNCE
    useEffect(() => {
        if (!selectedBase || !selectedQuoteDate) return;
        const controller = new AbortController();
        
        const checkDay = async () => {
            setMarketDay(prev => ({ ...prev, checking: true }));
            const result = await getMarketDayStatus(selectedBase, selectedQuoteDate, 3, controller.signal);
            
            // Se result for null, a requisição foi abortada. Ignoramos sem resetar o estado.
            if (result && !controller.signal.aborted) {
                setMarketDay({ ...result, checking: false });
            }
        };

        const timer = setTimeout(checkDay, 250); // Debounce de 250ms
        
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [selectedBase, selectedQuoteDate]);

    const handleJumpToLastValidDay = () => {
        if (marketDay.lastValidDay) {
            setSelectedQuoteDate(marketDay.lastValidDay);
        }
    };

    const handleGoBackOneDay = () => {
        const d = new Date(selectedQuoteDate + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        setSelectedQuoteDate(formatDateForInput(d));
    };

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        const controller = new AbortController();
        const fetchInitialData = async () => {
            if (!userProfile) return;
            setLoading(true);
            try {
                const [distRes, stylesRes] = await Promise.all([
                    supabase.from('Distribuidoras').select('Name, Bases, imagem').abortSignal(controller.signal),
                    supabase.from('pplus_distributor_styles').select('name, bg_color, text_color, shadow_style').abortSignal(controller.signal)
                ]);
                if (controller.signal.aborted) return;
                if (stylesRes.data) {
                    const stylesMap = new Map<string, DistributorDBStyle>();
                    (stylesRes.data as DistributorDBStyle[]).forEach(style => stylesMap.set(style.name, style));
                    setDbStyles(stylesMap);
                }
                if (distRes.data) {
                    setAllDistributors(distRes.data.map(d => ({ name: d.Name, bases: d.Bases || '', imagem: d.imagem || null })));
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') showNotification('error', 'Erro ao carregar dados iniciais.');
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        fetchInitialData();
        return () => controller.abort();
    }, [userProfile]);

    useEffect(() => {
        const controller = new AbortController();
        const fetchLastPrices = async () => {
            if (!userProfile || !selectedBase) return;
            try {
                const { data, error } = await supabase.from('pplus_user_daily_prices')
                    .select('brand_name, product_name, price, price_date')
                    .eq('user_id', userProfile.id)
                    .eq('base_name', selectedBase)
                    .lte('price_date', selectedQuoteDate)
                    .order('price_date', { ascending: false })
                    .abortSignal(controller.signal);
                if (controller.signal.aborted) return;
                if (data) {
                    const mapped = data.reduce((acc, r) => {
                        if (!acc[r.brand_name]) acc[r.brand_name] = {};
                        if (!acc[r.brand_name][r.product_name]) acc[r.brand_name][r.product_name] = { price: r.price, date: r.price_date };
                        return acc;
                    }, {} as any);
                    setLastPrices(mapped);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') console.error(err);
            }
        };
        fetchLastPrices();
        return () => controller.abort();
    }, [selectedBase, userProfile, priceDataVersion, selectedQuoteDate]);

    const { userDistributorsForBase, marketDistributorsForBase } = useMemo(() => {
        if (loading || !selectedBase || !userProfile?.preferencias) return { userDistributorsForBase: [], marketDistributorsForBase: [] };
        const baseClean = selectedBase.trim().toLowerCase();
        const distImageMap = allDistributors.reduce((acc, d) => ({ ...acc, [d.name]: d.imagem }), {} as any);
        const userPrefs = userProfile.preferencias.filter(p => p.base === selectedBase);
        const userBrandNames = new Set(userPrefs.map(p => getOriginalBrandName(p.bandeira).toLowerCase()));
        const marketDists = allDistributors.filter(d => d.bases.toLowerCase().includes(baseClean) && !userBrandNames.has(d.name.toLowerCase()))
            .map(d => ({ name: d.name, imageUrl: d.imagem })).sort((a,b) => a.name.localeCompare(b.name));
        const userDists = userPrefs.map(p => ({ ...p, imageUrl: distImageMap[getOriginalBrandName(p.bandeira)] || null }));
        return { userDistributorsForBase: userDists, marketDistributorsForBase: marketDists };
    }, [allDistributors, selectedBase, userProfile?.preferencias, loading]);

    useEffect(() => {
        if (loading) return;
        const uniqueNames = [...new Set([...userDistributorsForBase.map(ud => ud.bandeira), ...marketDistributorsForBase.map(md => md.name)])];
        const colors = uniqueNames.reduce((acc, name) => ({ ...acc, [name]: getDistributorStyle(name, dbStyles) }), {} as any);
        setDistributorColors(colors);
    }, [userDistributorsForBase, marketDistributorsForBase, loading, dbStyles]);

    const getEffectivePricesForForm = (distributor: BandeiraBasePair | null) => {
        if (!distributor) return {};
        const key = `${distributor.bandeira}|${distributor.base}|${selectedQuoteDate}`;
        if (pendingQuotes[key]) return pendingQuotes[key];
        const brandLastPrices = lastPrices[distributor.bandeira] || {};
        const suggested: { [product: string]: string } = {};
        Object.entries(brandLastPrices).forEach(([prod, data]: [string, any]) => {
            if (data && typeof data.price === 'number') {
                suggested[prod] = data.price.toFixed(3).replace('.', ',');
            }
        });
        return suggested;
    };

    const handleQuoteSubmit = async (distributor: BandeiraBasePair, prices: { [product: string]: string }) => {
        if (!userProfile || !marketDay.valid) {
            showNotification('error', 'Cotação bloqueada: mercado indisponível nesta data.');
            return;
        }
        const validPrices = Object.entries(prices)
            .map(([product, priceStr]) => ({ product, price: parseFloat(priceStr.replace(',', '.')) }))
            .filter(item => !isNaN(item.price) && item.price > 0);
        if (validPrices.length === 0) return showNotification('error', 'Nenhum preço válido.');

        const isUserDist = userDistributorsForBase.some(d => d.bandeira === distributor.bandeira && d.base === distributor.base);
        try {
            if (isUserDist) {
                const records = validPrices.map(p => ({ user_id: userProfile.id, user_email: userProfile.email, price_date: selectedQuoteDate, base_name: distributor.base, brand_name: distributor.bandeira, product_name: p.product, price: p.price }));
                const { error } = await supabase.from('pplus_user_daily_prices').upsert(records, { onConflict: 'user_id, price_date, base_name, brand_name, product_name' });
                if (error) throw error;
                showNotification('success', 'Cotação enviada!');
                setSelectedDistributorToQuote(null);
                setPriceDataVersion(v => v + 1);
            } else {
                const records = validPrices.map(p => ({ distribuidora: distributor.bandeira, base: distributor.base, fuel_type: p.product, price: p.price, user_id: userProfile.id, status: 'PENDENTE' }));
                const { error } = await supabase.from('pplus_pending_prices').insert(records);
                if (error) throw error;
                showNotification('success', 'Cotação enviada para validação!');
                setSelectedDistributorToQuote(null);
            }
        } catch (error) {
            showNotification('error', `Falha ao enviar: ${getErrorMessage(error)}`);
        }
    };

    if (loading) return <LoadingScreen />;
    
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            <Header 
                userProfile={userProfile} 
                className="bg-slate-950 border-b border-slate-800"
                onLogoClick={() => setSelectedDistributorToQuote(null)}
            />
            <div className="max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight">Portal de Cotações</h1>
                    <p className="mt-2 text-lg text-slate-300 font-sans font-medium">Insira suas cotações e acesse a inteligência de mercado.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <NavigationSidebar goToDashboard={goToDashboard} goToHistory={goToHistory} goToAdmin={goToAdmin} goToContracts={goToContracts} isAdmin={userProfile?.credencial === 'administrador'} />

                    <main className="lg:col-span-9">
                        {!marketDay.valid && !marketDay.checking && (
                            <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-5 mb-8 flex flex-col items-center justify-between gap-4 animate-fade-in shadow-lg">
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                                    <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 shrink-0">
                                        <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    </div>
                                    <div className="flex-grow text-center sm:text-left">
                                        <h3 className="font-bold text-rose-400 uppercase tracking-wide">Dia Sem Mercado Operacional</h3>
                                        <p className="text-sm text-rose-200 font-sans font-medium mt-0.5">
                                            A base <strong className="text-rose-100">{selectedBase}</strong> não possui mercado operacional suficiente registrado em {selectedQuoteDate}.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2 shrink-0">
                                        <button onClick={handleGoBackOneDay} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg font-bold text-xs border border-slate-700 transition-all">
                                            Voltar 1 dia
                                        </button>
                                        {marketDay.lastValidDay && (
                                            <button onClick={handleJumpToLastValidDay} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs shadow-md transition-all">
                                                Ir para último dia com mercado
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 h-fit overflow-hidden">
                                <div className={`transition-all duration-500 p-6 ${selectedDistributorToQuote && userDistributorsForBase.some(d => d.bandeira === selectedDistributorToQuote.bandeira) ? 'max-h-0 opacity-0 invisible p-0' : 'max-h-[1000px] opacity-100 visible'}`}>
                                    <UserDistributorsSection
                                        userDistributorsForBase={userDistributorsForBase} distributorColors={distributorColors} lastPrices={lastPrices} availableBases={availableBases} 
                                        selectedBase={selectedBase} setSelectedBase={setSelectedBase} selectedQuoteDate={selectedQuoteDate} setSelectedQuoteDate={setSelectedQuoteDate} handleSelectDistributorToQuote={setSelectedDistributorToQuote}
                                        userId={userProfile?.id}
                                    />
                                </div>
                                {selectedDistributorToQuote && userDistributorsForBase.some(d => d.bandeira === selectedDistributorToQuote.bandeira) && (
                                    <div className="p-6 animate-fade-in">
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-lg font-bold text-slate-100">Cotação: <span style={{ color: distributorColors[selectedDistributorToQuote.bandeira]?.background }}>{selectedDistributorToQuote.bandeira}</span></h2>
                                            <span className="text-[10px] font-bold text-slate-300 font-sans uppercase px-2 py-1 bg-slate-800 rounded">{selectedQuoteDate}</span>
                                        </div>
                                        <QuoteInputForm 
                                            distributor={selectedDistributorToQuote} 
                                            initialPrices={getEffectivePricesForForm(selectedDistributorToQuote)}
                                            onPriceChange={(p, v) => {
                                                const currentEffective = getEffectivePricesForForm(selectedDistributorToQuote);
                                                setPendingQuotes(prev => ({ 
                                                    ...prev, 
                                                    [`${selectedDistributorToQuote.bandeira}|${selectedDistributorToQuote.base}|${selectedQuoteDate}`]: { 
                                                        ...(prev[`${selectedDistributorToQuote.bandeira}|${selectedDistributorToQuote.base}|${selectedQuoteDate}`] || currentEffective), 
                                                        [p]: v 
                                                    } 
                                                }));
                                            }}
                                            onSubmit={handleQuoteSubmit} onCancel={() => setSelectedDistributorToQuote(null)} 
                                            disabled={!marketDay.valid}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 h-fit overflow-hidden">
                                <div className={`transition-all duration-500 p-6 ${selectedDistributorToQuote && !userDistributorsForBase.some(d => d.bandeira === selectedDistributorToQuote.bandeira) ? 'max-h-0 opacity-0 invisible p-0' : 'max-h-[1000px] opacity-100 visible'}`}>
                                   <MarketDistributorsSection marketDistributorsForBase={marketDistributorsForBase} distributorColors={distributorColors} selectedBase={selectedBase} handleSelectMarketDistributor={(d) => setSelectedDistributorToQuote({ bandeira: d, base: selectedBase })} selectedDistributorName={selectedDistributorToQuote?.bandeira || null} />
                                </div>
                                {selectedDistributorToQuote && !userDistributorsForBase.some(d => d.bandeira === selectedDistributorToQuote.bandeira) && (
                                    <div className="p-6 animate-fade-in">
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-lg font-bold text-slate-100">Cotação Avulsa: <span style={{ color: distributorColors[selectedDistributorToQuote.bandeira]?.background }}>{selectedDistributorToQuote.bandeira}</span></h2>
                                        </div>
                                        <QuoteInputForm 
                                            distributor={selectedDistributorToQuote} 
                                            initialPrices={getEffectivePricesForForm(selectedDistributorToQuote)} 
                                            onPriceChange={(p, v) => {
                                                const currentEffective = getEffectivePricesForForm(selectedDistributorToQuote);
                                                setPendingQuotes(prev => ({ 
                                                    ...prev, 
                                                    [`${selectedDistributorToQuote.bandeira}|${selectedDistributorToQuote.base}|${selectedQuoteDate}`]: { 
                                                        ...(prev[`${selectedDistributorToQuote.bandeira}|${selectedDistributorToQuote.base}|${selectedQuoteDate}`] || currentEffective), 
                                                        [p]: v 
                                                    } 
                                                }));
                                            }}
                                            onSubmit={handleQuoteSubmit} onCancel={() => setSelectedDistributorToQuote(null)} 
                                            disabled={!marketDay.valid}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
                <NotificationToast notification={notification} />
            </div>
        </div>
    );
};
export default Menu;
