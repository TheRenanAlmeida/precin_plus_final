
import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import { UserProfile, BandeiraBasePair, DistributorStyle, DistributorDBStyle, UserContracts } from '../types';
import NavigationSidebar from '../components/menu/NavigationSidebar';
import { supabase } from '../supabaseClient';
import LoadingScreen from '../components/LoadingScreen';
import NotificationToast from '../components/menu/NotificationToast';
import { getDistributorStyle, getOriginalBrandName } from '../utils/styleManager';
import { fetchUserContracts, upsertUserContracts, deleteContract } from '../services/contracts.service';
import ContractInputForm from '../components/contracts/ContractInputForm';
import { Tip } from '../components/common/Tip';
import { TOOLTIP } from '../constants/tooltips';

interface ContractsPageProps {
    userProfile: UserProfile;
    goBack: () => void;
    goToDashboard: () => void;
    goToHistory: () => void;
    goToAdmin: () => void;
    goToContracts: () => void;
}

const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.message) {
        if (typeof error.message === 'object') {
            try { return JSON.stringify(error.message); } catch { return String(error.message); }
        }
        return String(error.message);
    }
    try {
        return JSON.stringify(error);
    } catch {
        return 'Ocorreu um erro desconhecido.';
    }
};

const ContractsPage: React.FC<ContractsPageProps> = ({ 
    userProfile, 
    goBack,
    goToDashboard,
    goToHistory,
    goToAdmin,
    goToContracts
}) => {
    // --- State ---
    const [loading, setLoading] = useState(true);
    const [contracts, setContracts] = useState<UserContracts>({});
    const [selectedBase, setSelectedBase] = useState<string>('');
    const [availableBases, setAvailableBases] = useState<string[]>([]);
    const [dbStyles, setDbStyles] = useState<Map<string, DistributorDBStyle>>(new Map());
    const [distributorImages, setDistributorImages] = useState<{ [key: string]: string | null }>({});
    const [distributorColors, setDistributorColors] = useState<{ [key: string]: DistributorStyle }>({});
    
    const [selectedDistributor, setSelectedDistributor] = useState<BandeiraBasePair | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    // --- Effect 1: Inicializar Bases (Sem Fetch de Dados) ---
    useEffect(() => {
        if (!userProfile?.preferencias) return;

        // Determine bases
        const bases = Array.from(new Set(userProfile.preferencias.map(p => p.base))).sort();
        setAvailableBases(bases);
        
        // Se ainda não tiver base selecionada, seleciona a primeira
        // Isso evita que a mudança de selectedBase cause loops se estivesse no mesmo effect do fetch
        if (bases.length > 0) {
            setSelectedBase((current) => {
                if (!current || !bases.includes(current)) {
                    return bases[0];
                }
                return current;
            });
        }
    }, [userProfile.preferencias]);

    // --- Effect 2: Buscar Dados (Depende de selectedBase e userId) ---
    useEffect(() => {
        if (!userProfile?.id || !selectedBase) {
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        const signal = controller.signal;

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Load Contracts for the ACTIVE BASE (Resolves Priority: Base > '*')
                const contractsData = await fetchUserContracts(userProfile.id, selectedBase, signal);
                if (signal.aborted) return;
                setContracts(contractsData);

                // 2. Load Styles & Images
                const [distRes, stylesRes] = await Promise.all([
                    supabase.from('Distribuidoras').select('Name, imagem').abortSignal(signal),
                    supabase.from('pplus_distributor_styles').select('name, bg_color, text_color, shadow_style').abortSignal(signal)
                ]);

                if (signal.aborted) return;

                if (distRes.data) {
                    const imageMap = distRes.data.reduce((acc: any, item: any) => {
                        acc[item.Name] = item.imagem;
                        return acc;
                    }, {});
                    setDistributorImages(imageMap);
                }

                if (stylesRes.data) {
                    const stylesMap = new Map<string, DistributorDBStyle>();
                    (stylesRes.data as DistributorDBStyle[]).forEach(s => stylesMap.set(s.name, s));
                    setDbStyles(stylesMap);
                }

            } catch (err: any) {
                // Silencia AbortError
                if (signal.aborted || err.name === 'AbortError' || err.message?.includes('Aborted')) {
                    return;
                }
                console.error(err);
                showNotification('error', `Erro ao carregar dados: ${getErrorMessage(err)}`);
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [userProfile.id, selectedBase]); // Dependências estáveis

    // --- Derived Data ---
    const userDistributorsForBase = useMemo(() => {
        if (!selectedBase) return [];
        return userProfile.preferencias
            .filter(p => p.base === selectedBase)
            .map(p => ({
                ...p,
                imageUrl: distributorImages[getOriginalBrandName(p.bandeira)] || null
            }));
    }, [userProfile.preferencias, selectedBase, distributorImages]);

    useEffect(() => {
        const colors: { [key: string]: DistributorStyle } = {};
        userDistributorsForBase.forEach(d => {
            colors[d.bandeira] = getDistributorStyle(d.bandeira, dbStyles);
        });
        setDistributorColors(colors);
    }, [userDistributorsForBase, dbStyles]);

    // --- Handlers ---
    const handleSaveContract = async (items: Array<{ brand_name: string; product_name: string; base_ref: 'MIN' | 'AVG'; spread: number }>) => {
        if (!selectedBase) {
            showNotification('error', 'Nenhuma base selecionada.');
            return;
        }

        try {
            // Salva usando a base selecionada (agora obrigatória no schema)
            await upsertUserContracts(userProfile.id, selectedBase, items);
            
            // Recarrega os contratos para refletir a atualização
            const updatedContracts = await fetchUserContracts(userProfile.id, selectedBase);
            setContracts(updatedContracts);
            
            showNotification('success', `Contrato salvo para a base ${selectedBase}!`);
            setSelectedDistributor(null);
        } catch (err: any) {
            console.error(err);
            showNotification('error', `Erro ao salvar contrato: ${getErrorMessage(err)}`);
        }
    };

    const handleRemoveContract = async (productName: string) => {
        if (!selectedBase || !selectedDistributor) return;
        try {
            await deleteContract(userProfile.id, selectedBase, selectedDistributor.bandeira, productName);
            // Recarrega os contratos
            const updatedContracts = await fetchUserContracts(userProfile.id, selectedBase);
            setContracts(updatedContracts);
            showNotification('success', 'Contrato excluído.');
        } catch (err: any) {
            console.error(err);
            showNotification('error', `Erro ao excluir contrato: ${getErrorMessage(err)}`);
        }
    };

    if (loading && availableBases.length === 0) return <LoadingScreen />;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            <Header userProfile={userProfile} className="bg-slate-950 border-b border-slate-800" />
            <div className="max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
                
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight">Gestão de Contratos</h1>
                    <p className="mt-2 text-lg text-slate-400">Configure seus spreads e bases de preço.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Navigation Sidebar */}
                    <NavigationSidebar 
                        goToDashboard={goToDashboard}
                        goToHistory={goToHistory}
                        goToAdmin={goToAdmin}
                        goToContracts={goToContracts} 
                        isAdmin={userProfile.credencial === 'administrador'}
                    />
                    
                    <main className="lg:col-span-9">
                        
                        {/* --- TOP FILTER BAR (Consistent with History/Dashboard) --- */}
                        <div className="flex flex-col xl:flex-row gap-4 xl:items-center justify-between bg-slate-900/50 backdrop-blur-sm rounded-xl p-3 border border-slate-800 shadow-sm sticky top-0 z-30 mb-6">
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Menu Button */}
                                <button onClick={goBack} className="text-xs font-bold text-slate-400 hover:text-slate-100 uppercase tracking-wide transition-colors flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                                    Menu
                                </button>
                                
                                <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block"></div>

                                {/* Base Selector */}
                                <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
                                    <Tip text={TOOLTIP.CONTRACT_BASE_SELECTOR}>
                                        <span className="text-xs font-bold text-slate-400 uppercase">Base</span>
                                    </Tip>
                                    <select
                                        value={selectedBase}
                                        onChange={(e) => {
                                            setSelectedBase(e.target.value);
                                            setSelectedDistributor(null); // Reset selection on base change
                                        }}
                                        disabled={loading || availableBases.length === 0}
                                        className="bg-transparent text-slate-100 text-sm font-semibold focus:outline-none cursor-pointer"
                                    >
                                        {availableBases.map(base => (
                                            <option key={base} value={base} className="bg-slate-800 text-slate-100">{base}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            
                            {/* LISTA DE DISTRIBUIDORAS (ESQUERDA) */}
                            <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 h-fit overflow-hidden p-6">
                                <div className="flex flex-col mb-4 border-b border-slate-800 pb-3">
                                    <h2 className="text-xl font-bold text-slate-100 leading-tight">
                                        <Tip text={TOOLTIP.HEADER_CONTRACT_LIST}>
                                            Minhas Distribuidoras
                                        </Tip>
                                    </h2>
                                    <div className="flex flex-wrap items-center justify-between mt-2 gap-4">
                                        <p className="text-slate-400 text-sm">
                                            Selecione para configurar o contrato para a base <strong className="text-emerald-400">{selectedBase}</strong>.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {userDistributorsForBase.map((dist) => {
                                        const style = distributorColors[dist.bandeira];
                                        if (!style) return null;
                                        
                                        return (
                                            <div key={`${dist.bandeira}-${dist.base}`} onClick={() => setSelectedDistributor(dist)}
                                                className={`relative cursor-pointer bg-slate-800/50 border rounded-xl shadow-sm overflow-hidden hover:bg-slate-800 transition group
                                                    ${selectedDistributor?.bandeira === dist.bandeira ? 'border-emerald-500/50 ring-1 ring-emerald-500/50' : 'border-slate-700/50 hover:border-slate-600'}
                                                `}
                                            >
                                                <div className="absolute left-0 top-0 h-full w-2 rounded-l-xl" style={{ background: style.background }}></div>
                                                <div className="p-4 pl-6 flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        {dist.imageUrl && (
                                                            <img src={dist.imageUrl} alt={dist.bandeira} className="w-8 h-8 rounded-full bg-white/20 p-0.5 object-contain border border-slate-600" />
                                                        )}
                                                        <h3 className="font-bold text-slate-200 group-hover:text-white transition-colors">{dist.bandeira}</h3>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-900 text-slate-500 border border-slate-700">{dist.base}</span>
                                                        {contracts[dist.bandeira] && Object.keys(contracts[dist.bandeira]).length > 0 && (
                                                            <span className="mt-1 text-[10px] text-emerald-400 font-medium">
                                                                {Object.keys(contracts[dist.bandeira]).length} regras ativas
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {userDistributorsForBase.length === 0 && (
                                        <p className="text-sm text-slate-500 italic text-center py-4">
                                            Nenhuma distribuidora encontrada nesta base.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* ÁREA DE FORMULÁRIO (DIREITA) */}
                            <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 h-fit overflow-hidden">
                                <div className={`transition-all duration-500 ease-in-out ${!selectedDistributor ? 'max-h-0 opacity-0 invisible' : 'max-h-[1000px] opacity-100 visible'}`}>
                                    {selectedDistributor && (
                                        <div className="rounded-r-xl overflow-hidden border-y border-r border-l-[6px] mt-0 shadow-lg transition-all animate-fade-in"
                                            style={{ borderLeftColor: distributorColors[selectedDistributor.bandeira]?.background || '#334155' }}
                                        >
                                            <div className="p-4 bg-slate-800 flex justify-between items-center">
                                                <div>
                                                    <h2 className="text-lg font-bold text-slate-100">
                                                        Contrato: <span style={{ color: distributorColors[selectedDistributor.bandeira]?.background }}>{selectedDistributor.bandeira}</span>
                                                    </h2>
                                                    <p className="text-sm text-slate-400">
                                                        Base: {selectedDistributor.base}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="p-6 bg-slate-900/50">
                                                <ContractInputForm 
                                                    brandName={selectedDistributor.bandeira}
                                                    existingContracts={contracts}
                                                    onSave={handleSaveContract}
                                                    onRemove={handleRemoveContract}
                                                    onCancel={() => setSelectedDistributor(null)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {!selectedDistributor && (
                                    <div className="p-10 flex flex-col items-center justify-center text-slate-500 h-full min-h-[300px]">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <p className="text-sm">Selecione uma distribuidora ao lado para configurar o contrato.</p>
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

export default ContractsPage;
