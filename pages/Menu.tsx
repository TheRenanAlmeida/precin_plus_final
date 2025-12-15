
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

            try {
                let bases: string[] = [];
                if (userProfile.credencial === 'administrador') {
                    const { data, error } = await supabase
                        .from('Precin - Bases')
                        .select('"Nome da Base"')
                        .abortSignal(controller.signal)
                        .returns<{ "Nome da Base": string }[]>();

                    if (controller.signal.aborted) return;
                    
                    if (error) {
                        console.error("Error fetching admin bases:", error.message || error);
                        const errorMessage = (error as any).message || JSON.stringify(error);
                        showNotification('error', `Erro ao buscar bases de admin: ${errorMessage}`);
                    } else if (data) {
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
                    console.error("Error fetching styles:", stylesError.message || stylesError);
                } else if (stylesData) {
                    const stylesMap = new Map<string, DistributorDBStyle>();
                    (stylesData as DistributorDBStyle[]).forEach(style => stylesMap.set(style.name, style));
                    setDbStyles(stylesMap);
                }

                if (error) {
                    console.error("Error fetching distributors:", error.message || error);
                    showNotification('error', 'Falha ao carregar lista de distribuidoras.');
                } else if (data) {
                    setAllDistributors(data.map(d => ({ name: d.Name, bases: d.Bases || '', imagem: d.imagem || null })));
                }
            } catch (err: any) {
                if (err.name !== 'AbortError' && !err.message?.includes('Aborted')) {
                    console.error("Unexpected error in fetchInitialData:", err);
                    showNotification('error', 'Ocorreu um erro inesperado ao carregar dados iniciais.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
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
                const { data, error } = await supabase
                    .from('pplus_user_daily_prices')
                    .select('brand_name, product_name, price, price_date')
                    .eq('user_id', userProfile.id)
                    .eq('base_name', selectedBase)
                    .order('price_date', { ascending: false })
                    .abortSignal(controller.signal);

                if (controller.signal.aborted) return;
        
                if (error) {
                    console.error("Error fetching last prices:", error.message || error);
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
            } catch (err: any) {
                if (err.name !== 'AbortError' && !err.message?.includes('Aborted')) {
                    console.error("Unexpected error in fetchLastPrices:", err);
                }
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
        return !isUserDist; // Se não é uma das minhas, é do mercado
    }, [selectedDistributorToQuote, userDistributorsForBase]);

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
        // Se o mesmo for clicado, deseleciona.
        if (selectedDistributorToQuote?.bandeira === dist.bandeira && selectedDistributorToQuote?.base === dist.base) {
            setSelectedDistributorToQuote(null);
            return;
        }

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
        const newSelection = { bandeira: distName, base: selectedBase };
        // Se a mesma distribuidora for clicada novamente, desmarque-a.
        if (selectedDistributorToQuote?.bandeira === distName && selectedDistributorToQuote?.base === selectedBase) {
            setSelectedDistributorToQuote(null);
        } else {
            setSelectedDistributorToQuote(newSelection);
        }
    };

    const styleForSelected = selectedDistributorToQuote ? getDistributorStyle(selectedDistributorToQuote.bandeira, dbStyles) : null;
    const selectedDistributorKey = selectedDistributorToQuote ? `${selectedDistributorToQuote.bandeira}|${selectedDistributorToQuote.base}` : '';

    if (loading) {
        return <LoadingScreen />;
    }
    
    const renderFormContainer = (distributor: BandeiraBasePair) => {
        const style = distributorColors[distributor.bandeira] || distributorColors.DEFAULT;
        
        return (
            <div 
                className="rounded-r-xl overflow-hidden border-y border-r border-l-[6px] border-slate-700 mt-4 shadow-lg transition-all animate-fade-in"
                style={{ borderLeftColor: style.background }}
            >
                 <div className="p-4 bg-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-100">
                            Cotação: <span style={{ color: style.background }}>{distributor.bandeira}</span>
                        </h2>
                        <p className="text-sm text-slate-400">
                            Insira as cotações para a Base {distributor.base}.
                        </p>
                    </div>
                </div>
                <div className="p-6 bg-slate-900/50">
                    <QuoteInputForm 
                        distributor={distributor} 
                        initialPrices={pendingQuotes[selectedDistributorKey] || {}}
                        onPriceChange={(product, value) => handlePendingPriceChange(selectedDistributorKey, product, value)}
                        onSubmit={handleQuoteSubmit} 
                        onCancel={() => setSelectedDistributorToQuote(null)} 
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            <Header userProfile={userProfile} className="bg-slate-950 border-b border-slate-800" />
            <div className="max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
                
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight">Portal de Cotações</h1>
                    <p className="mt-2 text-lg text-slate-400">Insira seus preços e acesse a inteligência de mercado.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    <NavigationSidebar 
                        goToDashboard={goToDashboard} 
                        goToHistory={goToHistory}
                        goToAdmin={goToAdmin}
                        isAdmin={userProfile?.credencial === 'administrador'}
                    />

                    <main className="lg:col-span-9">
                         <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            
                            <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 h-fit overflow-hidden">
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
                                    {isMyDistributorSelected && selectedDistributorToQuote && renderFormContainer(selectedDistributorToQuote)}
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 h-fit overflow-hidden">
                                <div className={`transition-all duration-500 ease-in-out ${isMarketDistributorSelected ? 'max-h-0 opacity-0 invisible' : 'max-h-[1000px] opacity-100 visible p-6'}`}>
                                   <MarketDistributorsSection
                                        marketDistributorsForBase={marketDistributorsForBase}
                                        distributorColors={distributorColors}
                                        selectedBase={selectedBase}
                                        handleSelectMarketDistributor={handleSelectMarketDistributor}
                                        selectedDistributorName={isMarketDistributorSelected ? selectedDistributorToQuote?.bandeira || null : null}
                                    />
                                </div>
                                <div className={`transition-all duration-500 ease-in-out ${isMarketDistributorSelected ? 'max-h-[1000px] opacity-100 visible' : 'max-h-0 opacity-0 invisible'}`}>
                                     {isMarketDistributorSelected && selectedDistributorToQuote && renderFormContainer(selectedDistributorToQuote)}
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
