
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { UserProfile, BandeiraBasePair } from './types';

// Componentes
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import { TooltipProvider } from './components/ui/tooltip'; 
import { getErrorMessage } from './utils/errorHelpers';

// Páginas do fluxo
import AuthPage from './pages/AuthPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import OnboardingSetupPage from './pages/OnboardingSetupPage';
import DashboardPage from './pages/DashboardPage';
import Menu from './pages/Menu';
import History from './pages/History';
import AdminPage from './pages/AdminPage';
import ContractsPage from './pages/Contracts'; 

type AppView = 'menu' | 'dashboard' | 'history' | 'admin' | 'contracts';

const FUEL_CACHE_KEY = 'history_fuel_v2';
const BASE_CACHE_KEY = 'history_base_v2';
const START_DATE_CACHE_KEY = 'history_start_date_v2';
const END_DATE_CACHE_KEY = 'history_end_date_v2';

type UserProfileResponse = {
    id: string;
    nome: string;
    email: string;
    cnpj: string | null;
    telefone: string | null;
    credencial: string;
    preferencias: any; 
    atualizado_em?: string;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('menu');
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const events: (keyof DocumentEventMap)[] = ['copy', 'cut', 'paste', 'contextmenu', 'selectstart'];
    events.forEach(evt => {
      document.addEventListener(evt, prevent);
    });
    return () => {
      events.forEach(evt => {
        document.removeEventListener(evt, prevent);
      });
    };
  }, []);

  const getCachedValue = <T extends string>(key: string, defaultValue: T): T => {
    try {
        const cached = localStorage.getItem(key);
        return (cached as T) || defaultValue;
    } catch (e) {
        console.warn(`Could not read from localStorage for key "${key}"`, e);
        return defaultValue;
    }
  };

  const setCachedValue = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn(`Could not write to localStorage for key "${key}"`, e);
    }
  };

  const ninetyDaysAgo = () => {
      const date = new Date();
      date.setDate(date.getDate() - 90);
      return date.toISOString().split('T')[0];
  };

  const today = () => new Date().toISOString().split('T')[0];
  
  const [availableBases, setAvailableBases] = useState<string[]>([]);
  const [historySelectedFuelType, setHistorySelectedFuelType] = useState<string>(() => getCachedValue(FUEL_CACHE_KEY, 'Gasolina Comum'));
  const [selectedBase, setSelectedBase] = useState<string>(() => getCachedValue(BASE_CACHE_KEY, ''));
  const [historyStartDate, setHistoryStartDate] = useState<string>(() => getCachedValue(START_DATE_CACHE_KEY, ninetyDaysAgo()));
  const [historyEndDate, setHistoryEndDate] = useState<string>(() => getCachedValue(END_DATE_CACHE_KEY, today()));

  const handleSetHistoryFuel = (fuel: string) => {
      setCachedValue(FUEL_CACHE_KEY, fuel);
      setHistorySelectedFuelType(fuel);
  };
  const handleSetSelectedBase = (base: string) => {
      setCachedValue(BASE_CACHE_KEY, base);
      setSelectedBase(base);
  };
  const handleSetHistoryStartDate = (date: string) => {
      setCachedValue(START_DATE_CACHE_KEY, date);
      setHistoryStartDate(date);
  };
  const handleSetHistoryEndDate = (date: string) => {
      setCachedValue(END_DATE_CACHE_KEY, date);
      setHistoryEndDate(date);
  };

  const goToMenu = () => setCurrentView('menu');
  const goToDashboard = () => setCurrentView('dashboard');
  const goToHistory = () => setCurrentView('history');
  const goToContracts = () => setCurrentView('contracts');
  const goToAdmin = () => setCurrentView('admin');

  const processAndSetProfile = (data: UserProfileResponse) => {
      const hasPreferences = data.preferencias && Array.isArray(data.preferencias) && data.preferencias.length > 0;
      const profile: UserProfile = {
          id: data.id,
          nome: data.nome,
          email: data.email,
          cnpj: data.cnpj || null,
          telefone: data.telefone || null,
          credencial: data.credencial || 'usuario',
          profile_complete: !!(data.cnpj && data.telefone),
          onboarding_complete: hasPreferences,
          preferencias: hasPreferences ? (data.preferencias as BandeiraBasePair[]) : [],
          atualizado_em: data.atualizado_em,
      };
      setUserProfile(profile);
  };

  const fetchUserProfile = async (user: User) => {
    setLoading(true);

    try {
        const { data, error } = await supabase
            .from('pplus_users')
            .select('id, nome, email, cnpj, telefone, credencial, preferencias, atualizado_em')
            .eq('id', user.id)
            .single<UserProfileResponse>();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (data) {
            processAndSetProfile(data);
        } else {
            console.warn("Perfil não encontrado. Acionando criação de perfil via RPC.");
            
            const userName = user.user_metadata.name || user.email || 'Novo Usuário';
            if (!user.email) {
                throw new Error("Não foi possível criar seu perfil pois o e-mail não foi encontrado.");
            }

            const { error: rpcError } = await supabase.rpc('create_user_profile', {
                user_name: userName,
                user_email: user.email,
                user_credencial: 'usuario'
            });

            if (rpcError) throw rpcError;

            const { data: finalData, error: finalError } = await supabase
                .from('pplus_users')
                .select('id, nome, email, cnpj, telefone, credencial, preferencias, atualizado_em')
                .eq('id', user.id)
                .single<UserProfileResponse>();
            
            if (finalError) throw finalError;
            
            if (finalData) {
                processAndSetProfile(finalData);
            } else {
                throw new Error("Seu perfil foi criado, mas não conseguimos carregá-lo.");
            }
        }
    } catch (err) {
        console.error('Erro no fluxo de busca de perfil:', err);
        const message = getErrorMessage(err);
        setStartupError(`Ocorreu um erro ao carregar seu perfil: ${message}`);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession) {
          fetchUserProfile(newSession.user); 
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchAndSetBases = async () => {
        if (!userProfile) return;
        
        let uniqueBases: string[] = [];
        
        if (userProfile.credencial === 'administrador') {
            const { data, error } = await supabase
                .from('Precin - Bases')
                .select('"Nome da Base"')
                .abortSignal(controller.signal)
                .returns<{ "Nome da Base": string }[]>();

            if (controller.signal.aborted) return;

            if (error) {
                console.error("Erro ao buscar bases para o administrador:", error);
                const errorMessage = getErrorMessage(error);
                setStartupError(`Não foi possível carregar as bases de dados: ${errorMessage}`);
            } else if (data) {
                uniqueBases = [...new Set((data as { "Nome da Base": string }[])
                    .map(item => item["Nome da Base"])
                    .filter((base): base is string => typeof base === 'string' && base.length > 0))
                ].sort();
            }
        } else {
            const allBases: string[] = userProfile.preferencias.map(pref => pref.base);
            uniqueBases = Array.from(new Set(allBases)).sort();
        }
        
        setAvailableBases(uniqueBases);

        const currentSelectedBase = getCachedValue(BASE_CACHE_KEY, '');
        if (uniqueBases.length > 0 && (!currentSelectedBase || !uniqueBases.includes(currentSelectedBase))) {
            handleSetSelectedBase(uniqueBases[0]);
        } else if (uniqueBases.length === 0) {
            handleSetSelectedBase('');
        }
    };
    
    fetchAndSetBases();

    return () => controller.abort();
  }, [userProfile]);

  
  if (startupError) {
      return <ErrorScreen 
          title="Erro na Inicialização" 
          error={startupError} 
          recommendation="Por favor, recarregue a página. Se o problema persistir, contate o suporte."
      />;
  }

  if (loading) {
    return <LoadingScreen message="Inicializando sistema..." />;
  }

  if (!session) {
    return <AuthPage />; 
  }

  const renderAppContent = () => {
    if (userProfile) {
        if (!userProfile.profile_complete) {
          return <ProfileSetupPage user={session.user} userProfile={userProfile} onProfileComplete={() => fetchUserProfile(session.user)} />;
        }
        if (!userProfile.onboarding_complete) {
            return <OnboardingSetupPage userProfile={userProfile} onOnboardingComplete={() => fetchUserProfile(session.user)} />;
        }
    
        const menuProps = { 
            goToDashboard, 
            goToHistory, 
            goToContracts, 
            goToAdmin, 
            userProfile,
            availableBases,
            selectedBase,
            setSelectedBase: handleSetSelectedBase
        };
    
        switch (currentView) {
          case 'menu':
            return <Menu {...menuProps} />;
          case 'dashboard':
            return <DashboardPage 
                goBack={goToMenu} 
                userProfile={userProfile}
                availableBases={availableBases}
                selectedBase={selectedBase}
                setSelectedBase={handleSetSelectedBase}
            />;
          case 'history':
            return <History 
                goBack={goToMenu} 
                userProfile={userProfile}
                availableBases={availableBases}
                selectedFuelType={historySelectedFuelType}
                setSelectedFuelType={handleSetHistoryFuel}
                selectedBase={selectedBase}
                setSelectedBase={handleSetSelectedBase}
                startDate={historyStartDate}
                setStartDate={handleSetHistoryStartDate}
                endDate={historyEndDate}
                setEndDate={handleSetHistoryEndDate}
                goToContracts={goToContracts} // Added navigation prop
            />;
          case 'contracts':
            return <ContractsPage 
                userProfile={userProfile} 
                goBack={goToMenu} 
                goToDashboard={goToDashboard}
                goToHistory={goToHistory}
                goToAdmin={goToAdmin}
                goToContracts={goToContracts}
            />;
          case 'admin':
            if (userProfile.credencial !== 'administrador') {
                setCurrentView('menu');
                return <Menu {...menuProps} />;
            }
            return <AdminPage userProfile={userProfile} goBack={goToMenu} />;
          default:
            return <Menu {...menuProps} />;
        }
    }
    return <LoadingScreen message="Verificando sessão..." />;
  };

  return (
    <TooltipProvider>
      <div className="relative min-h-screen w-full bg-slate-950">
          <div className="relative z-0">
              {renderAppContent()}
          </div>
      </div>
    </TooltipProvider>
  );
}
