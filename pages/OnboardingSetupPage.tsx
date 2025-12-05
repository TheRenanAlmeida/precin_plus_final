

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
    <div className="relative bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition hover:shadow-md h-full">
        <div className="absolute left-0 top-0 h-full w-2 rounded-l-xl" style={{ background: style.background }}></div>
        <div className="p-4 pl-6 flex flex-col justify-between h-full">
            <div>
                <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <DistributorLogo distributorName={displayName} imageUrl={imageUrl} />
                        <h3 className="font-semibold text-gray-800">{displayName}</h3>
                    </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">Base: <span className="font-medium text-gray-700">{base}</span></p>
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
                <button 
                    type="button" 
                    onClick={() => onRemove(index)} 
                    className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors flex items-center gap-1"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Remover
                </button>
            </div>
        </div>
    </div>
);


// --- Componente para o Card de Adicionar Novo ---
const AddNewCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button 
        type="button" 
        onClick={onClick}
        className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#00502a] rounded-xl text-[#00502a] hover:bg-green-50 transition-colors h-full min-h-[150px] sm:min-h-0 shadow-inner"
    >
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
        <span className="mt-2 font-medium text-base">Adicionar Nova Configuração</span>
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
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="max-w-4xl w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mt-4">Configuração Inicial</h1>
                    <p className="text-gray-500 mt-2">Bem-vindo(a), {userProfile.nome}! Adicione as distribuidoras e as bases que você deseja monitorar.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <AddNewCard onClick={() => { setError(null); setIsModalOpen(true); }} />
                    </div>
                    
                    {error && <p className="mt-6 text-center text-sm text-red-600">{error}</p>}
                    
                    <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                        <button type="submit" disabled={isSubmitting || preferences.length === 0} className="w-full md:w-1/2 flex justify-center mx-auto py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:bg-gray-400">
                            {isSubmitting ? 'Salvando...' : 'Concluir e ir para o Dashboard'}
                        </button>
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
