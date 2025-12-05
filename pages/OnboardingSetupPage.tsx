
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, BandeiraBasePair, DistributorDBStyle, DistributorStyle } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import PreferenceFormModal from '../components/PreferenceFormModal';
import { getDistributorStyle, getOriginalBrandName } from '../utils/styleManager';
import DistributorLogo from '../components/DistributorLogo';

// --- Funções Auxiliares de Nomenclatura ---
const extractStateSuffix = (baseName: string): string => {
    const match = baseName.match(/ - ([A-Z]{2})$/);
    return match ? match[1] : '';
};

export const processBandeiraDisplayNames = (preferences: BandeiraBasePair[]): (BandeiraBasePair & { displayName: string })[] => {
    if (!preferences || preferences.length === 0) return [];

    // Etapa 1: Contar a presença de cada bandeira em diferentes estados
    const brandStates = new Map<string, Set<string>>();
    preferences.forEach(({ bandeira, base }) => {
        if (!brandStates.has(bandeira)) brandStates.set(bandeira, new Set());
        const state = extractStateSuffix(base);
        if (state) brandStates.get(bandeira)!.add(state);
    });

    // Etapa 2: Gerar nomes de exibição potenciais com base na regra de múltiplos estados
    const intermediateList = preferences.map(pref => {
        const { bandeira, base } = pref;
        const statesForBrand = brandStates.get(bandeira);
        let potentialName = bandeira;
        
        if (statesForBrand && statesForBrand.size > 1) {
            const state = extractStateSuffix(base);
            if (state) {
                potentialName = `${bandeira} ${state}`;
            }
        }
        return { ...pref, potentialName };
    });

    // Etapa 3: Contar duplicatas dos nomes potenciais e aplicar sufixos numéricos
    const nameCounts = new Map<string, number>();
    intermediateList.forEach(({ potentialName }) => {
        nameCounts.set(potentialName, (nameCounts.get(potentialName) || 0) + 1);
    });

    const nameUsage = new Map<string, number>();
    const finalList = intermediateList.map(item => {
        const { potentialName } = item;
        let displayName = potentialName;
        
        if ((nameCounts.get(potentialName) || 0) > 1) {
            const currentUsage = nameUsage.get(potentialName) || 0;
            displayName = `${potentialName} ${currentUsage + 1}`;
            nameUsage.set(potentialName, currentUsage + 1);
        }
        return { ...item, displayName };
    });

    return finalList;
};


// --- Componente para mostrar o Card de Preferência Salva ---
interface SavedPreferenceCardProps {
    displayName: string;
    base: string;
    index: number;
    onRemove: (index: number) => void;
    style: DistributorStyle;
    imageUrl: string | null;
}

const SavedPreferenceCard: React.FC<SavedPreferenceCardProps> = ({ displayName, base, index, onRemove, style, imageUrl }) => (
    <div className="relative bg-slate-800/50 border border-slate-700/50 rounded-xl shadow-sm overflow-hidden hover:bg-slate-800 hover:border-slate-600 transition group h-full">
        <div className="absolute left-0 top-0 h-full w-2 rounded-l-xl" style={{ background: style.background }}></div>
        <div className="p-4 pl-6 flex flex-col justify-between h-full">
            <div>
                <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <DistributorLogo distributorName={displayName} imageUrl={imageUrl} />
                        <h3 className="font-semibold text-slate-200">{displayName}</h3>
                    </div>
                </div>
                <p className="text-sm text-slate-400 mt-2">Base: <span className="font-medium text-slate-300">{base}</span></p>
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t border-slate-700/50">
                <button 
                    type="button" 
                    onClick={() => onRemove(index)} 
                    className="text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Remover
                </button>
            </div>
        </div>
    </div>
);


// --- Componente para o Card de Adicionar Novo ---
const AddNewCard: React.FC<{ onClick: () => void, isFirst: boolean }> = ({ onClick, isFirst }) => (
    <button 
        type="button" 
        onClick={onClick}
        className={`
            flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all h-full min-h-[150px] sm:min-h-0 shadow-inner group relative overflow-hidden
            ${isFirst 
                ? 'border-emerald-500/50 bg-emerald-950/10 text-emerald-400 hover:bg-emerald-950/20 hover:border-emerald-400' 
                : 'border-slate-700 text-slate-500 hover:bg-slate-800/50 hover:text-emerald-400 hover:border-emerald-500/50'
            }
        `}
    >
        {isFirst && <span className="absolute top-2 right-2 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>}
        
        <svg className="w-10 h-10 transition-colors mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
        <span className="font-bold text-base transition-colors">Adicionar Configuração</span>
        <span className="text-xs mt-1 opacity-70 font-medium">Bandeira + Base</span>
    </button>
);

interface Props {
    userProfile: UserProfile;
    onOnboardingComplete: () => void;
}

export default function OnboardingSetupPage({ userProfile, onOnboardingComplete }: Props) {
    const [preferences, setPreferences] = useState<BandeiraBasePair[]>([]);
    const [allBases, setAllBases] = useState<string[]>([]);
    const [allDistribuidoras, setAllDistribuidoras] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dbStyles, setDbStyles] = useState<Map<string, DistributorDBStyle>>(new Map());
    const [distributorImages, setDistributorImages] = useState<{ [key: string]: string | null }>({});

    const processedPreferences = useMemo(() => processBandeiraDisplayNames(preferences), [preferences]);

    useEffect(() => {
        const controller = new AbortController();
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const [basesRes, distRes, stylesRes] = await Promise.all([
                    supabase.from('Precin - Bases').select('"Nome da Base"').abortSignal(controller.signal).returns<{ "Nome da Base": string }[]>(),
                    supabase.from('Distribuidoras').select('Name, imagem').abortSignal(controller.signal).returns<{ Name: string, imagem: string | null }[]>(),
                    supabase.from('pplus_distributor_styles').select('name, bg_color, text_color, shadow_style').abortSignal(controller.signal).returns<DistributorDBStyle[]>(),
                ]);

                if (controller.signal.aborted) return;

                if (basesRes.error) throw new Error(`Bases: ${basesRes.error.message}`);
                if (distRes.error) throw new Error(`Distribuidoras: ${distRes.error.message}`);
                if (stylesRes.error) throw new Error(`Estilos: ${stylesRes.error.message}`);

                const basesData = basesRes.data?.map((row) => row['Nome da Base']) || [];
                const dists = distRes.data?.map((row) => ({ Name: row.Name, imagem: row.imagem })) || [];
                const distData = dists.map(d => d.Name);
                const imageMap = dists.reduce((acc, dist) => {
                    if(dist.Name) acc[dist.Name] = dist.imagem;
                    return acc;
                }, {} as { [key: string]: string | null });
                
                setAllBases(basesData.sort());
                setAllDistribuidoras(distData.sort());
                setDistributorImages(imageMap);

                const { data: stylesData } = stylesRes;
                if (stylesData) {
                    const stylesMap = new Map<string, DistributorDBStyle>();
                    (stylesData as DistributorDBStyle[]).forEach(s => stylesMap.set(s.name, s));
                    setDbStyles(stylesMap);
                }

                if (userProfile.preferencias && userProfile.preferencias.length > 0) {
                    setPreferences(userProfile.preferencias);
                }
            } catch (err) {
                if (!controller.signal.aborted) {
                    const message = (err as Error).message || JSON.stringify(err);
                    setError(`Erro ao buscar dados: ${message}. Tente recarregar a página.`);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };
        fetchData();
        return () => controller.abort();
    }, [userProfile.preferencias]);

    const handleAddPair = (newPair: BandeiraBasePair) => {
        setError(null);

        const exists = preferences.some(p => 
            p.bandeira === newPair.bandeira && p.base === newPair.base
        );
        
        if (exists) {
            setError(`A configuração para ${newPair.bandeira} na base ${newPair.base} já foi adicionada.`);
            setIsModalOpen(true);
            return;
        }
        
        setPreferences(prev => [...prev, newPair].sort((a,b) => a.bandeira.localeCompare(b.bandeira) || a.base.localeCompare(b.base)));
        setIsModalOpen(false);
    };

    const handleRemovePair = (index: number) => {
        setPreferences(preferences.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        if (preferences.length === 0) {
            setError('Por favor, adicione pelo menos uma configuração para avançar.');
            setIsSubmitting(false);
            return;
        }

        const preferencesToSave = processedPreferences.map(({ base, displayName }) => ({
            base: base,
            bandeira: displayName,
        }));

        const { error: updateError } = await supabase
            .from('pplus_users')
            .update({ preferencias: preferencesToSave })
            .eq('id', userProfile.id);

        if (updateError) {
            setError(`Erro ao salvar suas preferências: ${updateError.message}`);
        } else {
            onOnboardingComplete(); 
        }
        setIsSubmitting(false);
    };

    if (loading) {
        return <LoadingScreen message="Carregando configurações..." />;
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
            <div className="max-w-5xl w-full bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Vamos configurar seu painel</h1>
                    <p className="text-slate-400 mt-2 text-lg">Olá, {userProfile.nome.split(' ')[0]}! Defina suas operações para personalizarmos a análise de mercado.</p>
                    
                    {/* Seção Educativa "Por que?" */}
                    <div className="mt-6 bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex gap-4 items-start">
                        <div className="bg-emerald-950/30 p-2 rounded-lg border border-emerald-900/50 hidden sm:block">
                            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-1">Como isso impacta seu dia a dia?</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Ao selecionar sua <strong>Distribuidora</strong> e <strong>Base</strong>, o sistema cria um painel comparativo automático. 
                                Você verá se o seu preço de compra está competitivo em relação à média, mínima e máxima praticadas na sua região específica.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Botão de Adicionar sempre visível, com destaque se a lista estiver vazia */}
                        <AddNewCard 
                            onClick={() => { setError(null); setIsModalOpen(true); }} 
                            isFirst={preferences.length === 0} 
                        />

                        {processedPreferences.map((pair, index) => {
                            const originalName = getOriginalBrandName(pair.displayName);
                            const style = getDistributorStyle(originalName, dbStyles);
                            const imageUrl = distributorImages[originalName] || null;
                            return (
                                <SavedPreferenceCard 
                                    key={`${pair.displayName}-${pair.base}-${index}`}
                                    displayName={pair.displayName}
                                    base={pair.base}
                                    index={index}
                                    onRemove={handleRemovePair}
                                    style={style}
                                    imageUrl={imageUrl}
                                />
                            );
                        })}
                    </div>
                    
                    {error && <p className="mt-6 text-center text-sm text-rose-400 bg-rose-950/30 p-2 rounded-lg border border-rose-900/50">{error}</p>}
                    
                    <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col items-center">
                        <button 
                            type="submit" 
                            disabled={isSubmitting || preferences.length === 0} 
                            className={`
                                w-full md:w-1/2 py-3 px-6 rounded-full font-bold text-base shadow-lg transition-all
                                ${preferences.length === 0 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105 ring-2 ring-offset-2 ring-offset-slate-900 ring-emerald-600'
                                }
                            `}
                        >
                            {isSubmitting ? 'Configurando...' : 'Finalizar e Acessar Dashboard'}
                        </button>
                        {preferences.length === 0 && (
                            <p className="text-xs text-slate-500 mt-3 animate-pulse">Adicione pelo menos uma configuração acima para continuar.</p>
                        )}
                    </div>
                </form>
            </div>
            
            <PreferenceFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleAddPair}
                allDistributors={allDistribuidoras}
                allBases={allBases}
            />
        </div>
    );
}
