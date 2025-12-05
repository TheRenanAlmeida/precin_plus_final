

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

// Interface for data from 'Distribuidoras' table
interface DistributorData {
    name: string;
    bases: string;
    imagem: string | null;
}

type BaseRecord = { Base: string | null };

const MenuSkeleton: React.FC = () => (
    <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 animate-pulse">
                <div className="h-10 bg-slate-200 rounded w-1/2 mx-auto mb-2"></div>
                <div className="h-6 bg-slate-200 rounded w-3/4 mx-auto"></div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* NavigationSidebar Skeleton */}
                <aside className="lg:col-span-3 space-y-8">
                    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200 space-y-4 animate-pulse">
                        <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-12 bg-slate-200 rounded-lg"></div>
                        <div className="h-12 bg-slate-200 rounded-lg"></div>
                    </div>
                </aside>

                {/* Main Content Skeleton */}
                <main className="lg:col-span-9">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 animate-pulse">
                        {/* UserDistributorsSection Skeleton */}
                        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                                <div className="h-8 bg-slate-200 rounded w-1/4"></div>
                            </div>
                            <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                            <div className="space-y-3 pt-3">
                                <div className="h-24 bg-slate-100 rounded-xl"></div>
                                <div className="h-24 bg-slate-100 rounded-xl"></div>
                                <div className="h-24 bg-slate-100 rounded-xl"></div>
                            </div>
                        </div>

                        {/* MarketDistributorsSection Skeleton */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-4">
                            <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                            <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                            <div className="flex flex-wrap gap-3 pt-3">
                                <div className="h-8 bg-slate-200 rounded-full w-24"></div>
                                <div className="h-8 bg-slate-200 rounded-full w-32"></div>
                                <div className="h-8 bg-slate-200 rounded-full w-28"></div>
                                <div className="h-8 bg-slate-200 rounded-full w-20"></div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    </div>
);


const Menu = ({ goToDashboard, goToHistory, goToAdmin, userProfile }: { goToDashboard: () => void; goToHistory: () => void; goToAdmin: () => void; userProfile: UserProfile | null; }) => {
    
    const [selectedDistributorToQuote, setSelectedDistributorToQuote] = useState<BandeiraBasePair | null>(null);
    const [allDistributors, setAllDistributors] = useState<DistributorData[]>([]);
    const [distributorColors, setDistributorColors] = useState<{ [key: string]: DistributorStyle }>({});
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [availableBases, setAvailableBases] = useState<string[]>([]);
    const [selectedBase, setSelectedBase] = useState<string>('');
    const [lastPrices, setLastPrices] = useState<{ [brand: string]: { [product: string]: { price: number; date: string } } }>({});
    const [pendingQuotes, setPendingQuotes] = useState<{ [key: string]: { [product: string]: string } }>({});
    const [priceDataVersion, setPriceDataVersion] = useState(0);
    const [dbStyles, setDbStyles] = useState<Map<string, DistributorDBStyle>>(new Map());
    
    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    useEffect(() => {
        const controller = new AbortController();
        const fetchInitialData = async () => {
            if (!userProfile) return;
            setLoading(true);

            let bases: string[] = [];
            if (userProfile.credencial === 'administrador') {
                const { data, error } = await supabase
                    .from('Precin - Bases')
                    .select('"Nome da Base"')
                    .abortSignal(controller.signal)
                    .returns<{ "Nome da Base": string }[]>();

                if (controller.signal.aborted) return;
                
                if (error) {
                    console.error("Error fetching admin bases:", error);
                    const errorMessage = (error as any).message || JSON.stringify(error);
                    showNotification('error', `Erro ao buscar bases de admin: ${errorMessage}`);
                } else if (data) {
                    // FIX: Explicitly cast `data` to the expected type to resolve the "unknown[] is not assignable to string[]" error.
                    bases = [...new Set((data as { "Nome da Base": string }[])
                        .map(item => item["Nome da Base"])
                        .filter((base): base is string => typeof base === 'string' && base.length > 0))
                    ].sort();
                }
            } else if (userProfile.preferencias?.length) {
                bases = [...new Set(userProfile.preferencias.map(p => p.base))].sort();
            }
            setAvailableBases(bases);
            
            if (bases.length > 0 && (!selectedBase || !bases.includes(selectedBase))) {
                setSelectedBase(bases[0]);
            }

            const distributorsPromise = supabase.from('Distribuidoras').select('Name, Bases, imagem').abortSignal(controller.signal);
            const stylesPromise = supabase.from('pplus_distributor_styles').select('name, bg_color, text_color, shadow_style').abortSignal(controller.signal);

            const [distributorsResult, stylesResult] = await Promise.all([distributorsPromise, stylesPromise]);

            if (controller.signal.aborted) return;

            const { data, error } = distributorsResult;
            const { data: stylesData, error: stylesError } = stylesResult;
            
            if (stylesError) {
                console.error("Error fetching styles:", stylesError.message);
            } else if (stylesData) {
                const stylesMap = new Map<string, DistributorDBStyle>();
                (stylesData as DistributorDBStyle[]).forEach(style => stylesMap.set(style.name, style));
                setDbStyles(stylesMap);
            }

            if (error) {
                console.error("Error fetching distributors:", error);
                showNotification('error', 'Falha ao carregar lista de distribuidoras.');
            } else if (data) {
                setAllDistributors(data.map(d => ({ name: d.Name, bases: d.Bases || '', imagem: d.imagem || null })));
            }
            
            setLoading(false);
        };

        fetchInitialData();
        return () => controller.abort();
    }, [userProfile]);

    useEffect(() => {
        const controller = new AbortController();
        const fetchLastPrices = async () => {
            if (!userProfile || !selectedBase) return;
    
            const { data, error } = await supabase
                .from('pplus_user_daily_prices')
                .select('brand_name, product_name, price, price_date')
                .eq('user_id', userProfile.id)
                .eq('base_name', selectedBase)
                .order('price_date', { ascending: false })
                .abortSignal(controller.signal);

            if (controller.signal.aborted) return;
    
            if (error) {
                console.error("Error fetching last prices:", error);
                return;
            }
    
            if (data) {
                const latestPricesByBrandAndProduct = data.reduce((acc, priceRecord) => {
                    const { brand_name, product_name, price, price_date } = priceRecord;
                    if (!acc[brand_name]) {
                        acc[brand_name] = {};
                    }
                    if (!acc[brand_name][product_name]) {
                        acc[brand_name][product_name] = {
                            price: price,
                            date: price_date
                        };
                    }
                    return acc;
                }, {} as { [brand: string]: { [product: string]: { price: number; date: string } } });
                setLastPrices(latestPricesByBrandAndProduct);
            }
        };
    
        fetchLastPrices();
        return () => controller.abort();
    }, [selectedBase, userProfile, priceDataVersion]);

    const { userDistributorsForBase, marketDistributorsForBase } = useMemo(() => {
        if (loading || !selectedBase || !userProfile?.preferencias) {
            return { userDistributorsForBase: [], marketDistributorsForBase: [] };
        }
    
        const selectedBaseClean = selectedBase.trim().toLowerCase();
        
        const distributorImageMap = allDistributors.reduce((acc, dist) => {
            acc[dist.name] = dist.imagem;
            return acc;
        }, {} as { [key: string]: string | null });

        const userPreferencesForBase = userProfile.preferencias.filter(p => p.base === selectedBase);

        const userDistributorOriginalNamesForBase = new Set(userPreferencesForBase.map(p => getOriginalBrandName(p.bandeira).toLowerCase()));
    
        const marketDistributorsForBase = allDistributors
            .filter(dist => {
                const operatesInBase = dist.bases.toLowerCase().includes(selectedBaseClean);
                const isNotUserDistributor = !userDistributorOriginalNamesForBase.has(dist.name.toLowerCase());
                return operatesInBase && isNotUserDistributor;
            })
            .map(dist => ({ name: dist.name, imageUrl: dist.imagem }))
            .sort((a,b) => a.name.localeCompare(b.name));
        
        const userDistributorsForBase = userPreferencesForBase.map(p => {
            const originalName = getOriginalBrandName(p.bandeira);
            return {
                ...p,
                imageUrl: distributorImageMap[originalName] || null
            };
        });

        return { userDistributorsForBase, marketDistributorsForBase };
    }, [allDistributors, selectedBase, userProfile?.preferencias, loading]);

    const isMyDistributorSelected = useMemo(() => {
        if (!selectedDistributorToQuote) return false;
        return userDistributorsForBase.some(d => d.bandeira === selectedDistributorToQuote.bandeira && d.base === selectedDistributorToQuote.base);
    }, [selectedDistributorToQuote, userDistributorsForBase]);
    
    const isMarketDistributorSelected = useMemo(() => {
        if (!selectedDistributorToQuote) return false;
        const isUserDist = userDistributorsForBase.some(d => d.bandeira === selectedDistributorToQuote.bandeira && d.base === selectedDistributorToQuote.base);
        return marketDistributorsForBase.some(d => d.name === selectedDistributorToQuote.bandeira) && !isUserDist;
    }, [selectedDistributorToQuote, marketDistributorsForBase, userDistributorsForBase]);

    useEffect(() => {
        if (loading) return;

        const allVisibleDistributors = [
            ...userDistributorsForBase.map(ud => ud.bandeira),
            ...marketDistributorsForBase.map(md => md.name),
        ];
        const uniqueNames = [...new Set(allVisibleDistributors)];

        const colors = uniqueNames.reduce((acc, name) => {
            acc[name] = getDistributorStyle(name, dbStyles);
            return acc;
        }, {} as { [key: string]: DistributorStyle });

        setDistributorColors(colors);
    }, [userDistributorsForBase, marketDistributorsForBase, loading, dbStyles]);

    const handlePendingPriceChange = (distKey: string, product: string, value: string) => {
        setPendingQuotes(prev => ({
            ...prev,
            [distKey]: {
                ...(prev[distKey] || {}),
                [product]: value
            }
        }));
    };

    const handleQuoteSubmit = async (distributor: BandeiraBasePair, prices: { [product: string]: string }) => {
        if (!userProfile) return;
        const selectedDistributorKey = `${distributor.bandeira}|${distributor.base}`;
    
        const isUserDistributor = userDistributorsForBase.some(
            d => d.bandeira === distributor.bandeira && d.base === distributor.base
        );
    
        const validPrices = Object.entries(prices)
            .map(([product, priceStr]) => {
                const parsedPrice = parseFloat(priceStr.replace(',', '.'));
                return { product, price: isNaN(parsedPrice) ? null : parsedPrice };
            })
            .filter(item => item.price !== null && item.price > 0);
        
        if (validPrices.length === 0) {
            showNotification('error', 'Nenhum preço válido foi inserido.');
            return;
        }
    
        if (isUserDistributor) {
            const recordsToInsert = validPrices.map(({ product, price }) => ({
                user_id: userProfile.id,
                user_email: userProfile.email,
                price_date: new Date().toISOString().split('T')[0],
                base_name: distributor.base,
                brand_name: distributor.bandeira,
                product_name: product,
                price: price!
            }));
            
            const { error } = await supabase.from('pplus_user_daily_prices').upsert(recordsToInsert, {
                onConflict: 'user_id, price_date, base_name, brand_name, product_name',
            });
    
            if (error) {
                console.error("Error submitting user quote:", error);
                showNotification('error', `Falha ao enviar cotação: ${error.message}`);
            } else {
                showNotification('success', `Cotação para ${distributor.bandeira} enviada com sucesso!`);
                setSelectedDistributorToQuote(null);
                setPendingQuotes(prev => {
                    const newQuotes = { ...prev };
                    delete newQuotes[selectedDistributorKey];
                    return newQuotes;
                });
                setPriceDataVersion(v => v + 1);
            }
        } else {
            const recordsToInsert = validPrices.map(({ product, price }) => ({
                distribuidora: distributor.bandeira,
                base: distributor.base,
                fuel_type: product,
                price: price!,
                user_id: userProfile.id,
                status: 'PENDENTE'
            }));
            
            const { error } = await supabase.from('pplus_pending_prices').insert(recordsToInsert);
    
            if (error) {
                console.error("Error submitting market quote:", error);
                showNotification('error', `Falha ao enviar cotação avulsa: ${error.message}`);
            } else {
                showNotification('success', 'Cotação registrada e enviada para validação!');
                setSelectedDistributorToQuote(null);
                 setPendingQuotes(prev => {
                    const newQuotes = { ...prev };
                    delete newQuotes[selectedDistributorKey];
                    return newQuotes;
                });
            }
        }
    };

    const handleSelectDistributorToQuote = (dist: BandeiraBasePair) => {
        const key = `${dist.bandeira}|${dist.base}`;
        const lastSavedPrices = lastPrices[dist.bandeira];

        if (!pendingQuotes[key] && lastSavedPrices) {
            const initialFormPrices: { [product: string]: string } = {};
            Object.keys(lastSavedPrices).forEach(product => {
                const priceInfo = lastSavedPrices[product];
                if (priceInfo && typeof priceInfo.price === 'number') {
                    const formattedPrice = priceInfo.price.toFixed(4).replace('.', ',');
                    initialFormPrices[product] = formattedPrice;
                }
            });
            
            setPendingQuotes(prev => ({
                ...prev,
                [key]: initialFormPrices
            }));
        }
        
        setSelectedDistributorToQuote(dist);
    };
    
    const handleSelectMarketDistributor = (distName: string) => {
        setSelectedDistributorToQuote({ bandeira: distName, base: selectedBase });
    };

    const styleForSelected = selectedDistributorToQuote ? getDistributorStyle(selectedDistributorToQuote.bandeira, dbStyles) : null;
    const selectedDistributorKey = selectedDistributorToQuote ? `${selectedDistributorToQuote.bandeira}|${selectedDistributorToQuote.base}` : '';

    if (loading) {
        return <MenuSkeleton />;
    }
    
    const renderFormContainer = (distributor: BandeiraBasePair, style: DistributorStyle) => (
        <div className="flex">
            <div className="w-1.5 flex-shrink-0" style={{ background: style.background }}></div>
            <div className="flex-grow">
                <div className="p-4" style={{ backgroundColor: style.background }}>
                    <h2 className="text-xl font-bold" style={{ color: style.border }}>
                        Cotação: {distributor.bandeira}
                    </h2>
                    <p className="text-sm opacity-90" style={{ color: style.border }}>
                        Insira as cotações para a Base {distributor.base}.
                    </p>
                </div>
                <div className="p-6">
                    <QuoteInputForm 
                        distributor={distributor} 
                        initialPrices={pendingQuotes[selectedDistributorKey] || {}}
                        onPriceChange={(product, value) => handlePendingPriceChange(selectedDistributorKey, product, value)}
                        onSubmit={handleQuoteSubmit} 
                        onCancel={() => setSelectedDistributorToQuote(null)} 
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Header userProfile={userProfile} />
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold text-gray-900">Portal de Cotações</h1>
                    <p className="mt-2 text-lg text-gray-600">Insira seus preços e acesse a inteligência de mercado.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    
                    <NavigationSidebar 
                        goToDashboard={goToDashboard} 
                        goToHistory={goToHistory}
                        goToAdmin={goToAdmin}
                        isAdmin={userProfile?.credencial === 'administrador'}
                    />

                    <main className="lg:col-span-9">
                         <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            
                            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 h-fit overflow-hidden">
                                <div className={`transition-all duration-500 ease-in-out ${isMyDistributorSelected ? 'max-h-0 opacity-0 invisible' : 'max-h-[1000px] opacity-100 visible p-6'}`}>
                                    <UserDistributorsSection
                                        userDistributorsForBase={userDistributorsForBase}
                                        distributorColors={distributorColors}
                                        lastPrices={lastPrices}
                                        availableBases={availableBases}
                                        selectedBase={selectedBase}
                                        setSelectedBase={setSelectedBase}
                                        handleSelectDistributorToQuote={handleSelectDistributorToQuote}
                                    />
                                </div>
                                <div className={`transition-all duration-500 ease-in-out ${isMyDistributorSelected ? 'max-h-[1000px] opacity-100 visible' : 'max-h-0 opacity-0 invisible'}`}>
                                    {isMyDistributorSelected && selectedDistributorToQuote && styleForSelected && renderFormContainer(selectedDistributorToQuote, styleForSelected)}
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-fit overflow-hidden">
                               <div className={`transition-all duration-500 ease-in-out ${isMarketDistributorSelected ? 'max-h-0 opacity-0 invisible' : 'max-h-[1000px] opacity-100 visible p-6'}`}>
                                    <MarketDistributorsSection
                                        marketDistributorsForBase={marketDistributorsForBase}
                                        distributorColors={distributorColors}
                                        selectedBase={selectedBase}
                                        handleSelectMarketDistributor={handleSelectMarketDistributor}
                                    />
                               </div>
                               <div className={`transition-all duration-500 ease-in-out ${isMarketDistributorSelected ? 'max-h-[1000px] opacity-100 visible' : 'max-h-0 opacity-0 invisible'}`}>
                                    {isMarketDistributorSelected && selectedDistributorToQuote && styleForSelected && renderFormContainer(selectedDistributorToQuote, styleForSelected)}
                               </div>
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
