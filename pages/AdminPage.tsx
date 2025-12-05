
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, DistributorDBStyle, BandeiraBasePair } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import ErrorScreen from '../components/ErrorScreen';
import NotificationToast from '../components/menu/NotificationToast';
import { rgbaToHex, hexToRgba } from '../utils/dataHelpers';

type AdminUser = {
    id: string;
    nome: string;
    email: string;
    credencial: string;
    preferencias: BandeiraBasePair[];
    atualizado_em?: string;
};
type StylesState = { [key: string]: Omit<DistributorDBStyle, 'name'> };
type ActiveTab = 'styles' | 'users';

// --- Sub-components for Admin Page ---

const ColorSwatch: React.FC<{ label: string, color: string, onChange: (color: string) => void }> = ({ label, color, onChange }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">{label}</label>
            <div className="flex items-center gap-2">
                <div 
                    className="w-full h-10 rounded-lg border border-slate-600 cursor-pointer shadow-sm relative overflow-hidden group" 
                    style={{ backgroundColor: color }}
                    onClick={() => inputRef.current?.click()}
                    title={`Clique para alterar a cor ${label}`}
                >
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors flex items-center justify-center">
                        <span className="text-[10px] font-mono text-white/80 opacity-0 group-hover:opacity-100 uppercase drop-shadow-md">{color}</span>
                    </div>
                    <input ref={inputRef} type="color" value={color} onChange={e => onChange(e.target.value)} className="opacity-0 w-full h-full cursor-pointer absolute inset-0" />
                </div>
            </div>
        </div>
    );
};

const AddPreferenceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (newPreference: BandeiraBasePair) => void;
    allBases: string[];
    allDistributors: string[];
    existingPreferences: BandeiraBasePair[];
}> = ({ isOpen, onClose, onSave, allBases, allDistributors, existingPreferences }) => {
    const [selectedBase, setSelectedBase] = useState('');
    const [selectedBandeira, setSelectedBandeira] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if(isOpen) {
            setSelectedBase(allBases[0] || '');
            setSelectedBandeira(allDistributors[0] || '');
            setError('');
        }
    }, [isOpen, allBases, allDistributors]);

    const handleSave = () => {
        if (!selectedBase || !selectedBandeira) {
            setError('Selecione uma base e uma distribuidora.');
            return;
        }
        const alreadyExists = existingPreferences.some(p => p.base === selectedBase && p.bandeira === selectedBandeira);
        if (alreadyExists) {
            setError('Esta combinação já foi adicionada.');
            return;
        }
        onSave({ base: selectedBase, bandeira: selectedBandeira });
        onClose();
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-slate-100 mb-4">Adicionar Preferência</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="base-select" className="text-sm font-medium text-slate-400">Base</label>
                        <select id="base-select" value={selectedBase} onChange={e => setSelectedBase(e.target.value)} className="mt-1 block w-full p-2 bg-slate-950 border border-slate-700 text-slate-200 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500">
                            {allBases.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="bandeira-select" className="text-sm font-medium text-slate-400">Distribuidora</label>
                        <select id="bandeira-select" value={selectedBandeira} onChange={e => setSelectedBandeira(e.target.value)} className="mt-1 block w-full p-2 bg-slate-950 border border-slate-700 text-slate-200 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500">
                            {allDistributors.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>
                {error && <p className="text-sm text-rose-400 mt-4 bg-rose-950/30 p-2 rounded">{error}</p>}
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition font-bold shadow-md">Salvar</button>
                </div>
            </div>
        </div>
    );
};


// --- Main Admin Page Component ---

const AdminPage: React.FC<{ userProfile: UserProfile, goBack: () => void }> = ({ userProfile, goBack }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('styles');
    const [distributors, setDistributors] = useState<{ name: string, image: string | null }[]>([]);
    const [styles, setStyles] = useState<StylesState>({});
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [allBases, setAllBases] = useState<string[]>([]);
    const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isAddPreferenceModalOpen, setIsAddPreferenceModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchAllAdminData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [distRes, stylesRes, usersRes, basesRes] = await Promise.all([
                    supabase.from('Distribuidoras').select('Name, imagem').abortSignal(signal),
                    supabase.from('pplus_distributor_styles').select('name, bg_color, text_color, shadow_style').abortSignal(signal),
                    supabase.from('pplus_users').select('id, nome, email, credencial, preferencias, atualizado_em').abortSignal(signal),
                    supabase.from('Precin - Bases').select('"Nome da Base"').abortSignal(signal)
                ]);

                if (signal.aborted) return;
                
                if (distRes.error) throw new Error(`Distributors: ${distRes.error.message}`);
                if (stylesRes.error) throw new Error(`Styles: ${stylesRes.error.message}`);
                if (usersRes.error) throw new Error(`Users: ${usersRes.error.message}`);
                if (basesRes.error) throw new Error(`Bases: ${basesRes.error.message}`);

                const distData = (distRes.data as { Name: string, imagem: string | null }[]).map(d => ({ name: d.Name, image: d.imagem })).sort((a,b) => a.name.localeCompare(b.name));
                setDistributors(distData);

                const stylesData = stylesRes.data as DistributorDBStyle[];
                const stylesMap = distData.reduce((acc, dist) => {
                    const existing = stylesData.find(s => s.name === dist.name);
                    acc[dist.name] = {
                        bg_color: existing?.bg_color || hexToRgba('#cccccc', 0.95),
                        text_color: existing?.text_color || '#e2e8f0', // default slate-200
                        shadow_style: existing?.shadow_style || null
                    };
                    return acc;
                }, {} as StylesState);
                setStyles(stylesMap);

                setUsers(usersRes.data as AdminUser[] || []);
                setAllBases((basesRes.data as { "Nome da Base": string }[]).map(b => b["Nome da Base"]).sort());

            } catch (err) {
                if (!signal.aborted) {
                    setError(`Error fetching admin data: ${(err as Error).message}`);
                }
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchAllAdminData();
        return () => controller.abort();
    }, []);

    // Função unificada para atualizar cor (sincroniza texto e bolinha, remove sombra)
    const handleSingleColorUpdate = (distName: string, hexColor: string) => {
        setStyles(prev => ({
            ...prev,
            [distName]: {
                ...prev[distName],
                bg_color: hexToRgba(hexColor, 0.95), // Bolinha com leve transparência
                text_color: hexColor,               // Texto com a cor sólida
                shadow_style: null                  // Remove qualquer sombra existente
            }
        }));
    };
    
    const handleSaveStyle = async (distName: string) => {
        setSaving(prev => ({ ...prev, [distName]: true }));
        const styleToSave = { name: distName, ...styles[distName] };
        
        const { error } = await supabase.from('pplus_distributor_styles').upsert(styleToSave, { onConflict: 'name' });
        
        if (error) {
            showNotification('error', `Erro ao salvar ${distName}: ${error.message}`);
        } else {
            showNotification('success', `Estilo de ${distName} salvo com sucesso!`);
        }
        setSaving(prev => ({ ...prev, [distName]: false }));
    };

    const handleUserUpdate = async (userId: string, updates: Partial<AdminUser>) => {
        const { error } = await supabase.from('pplus_users').update(updates).eq('id', userId);
        if (error) {
            showNotification('error', `Erro ao atualizar usuário: ${error.message}`);
        } else {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
            showNotification('success', `Usuário atualizado com sucesso!`);
        }
        setCurrentUser(null);
        setIsUserModalOpen(false);
    };
    
    const openUserModal = (user: AdminUser) => {
        setCurrentUser(user);
        setIsUserModalOpen(true);
    };

    const handleAddPreference = (newPreference: BandeiraBasePair) => {
        if (!currentUser) return;
        const updatedPreferences = [...(currentUser.preferencias || []), newPreference];
        handleUserUpdate(currentUser.id, { preferencias: updatedPreferences });
        setCurrentUser(prev => prev ? { ...prev, preferencias: updatedPreferences } : null);
    };
    
    const handleRemovePreference = (index: number) => {
        if (!currentUser) return;
        const updatedPreferences = currentUser.preferencias.filter((_, i) => i !== index);
        handleUserUpdate(currentUser.id, { preferencias: updatedPreferences });
        setCurrentUser(prev => prev ? { ...prev, preferencias: updatedPreferences } : null);
    };
    
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        return users.filter(u => 
            u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const allDistributorNames = useMemo(() => distributors.map(d => d.name), [distributors]);

    if (loading) return <LoadingScreen message="Carregando Painel de Admin..." />;
    if (error) return <ErrorScreen error={error} />;

    return (
        <div className="font-sans bg-slate-950 min-h-screen text-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                    <h1 className="text-3xl font-extrabold text-slate-100">Painel de Administrador</h1>
                    <button onClick={goBack} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 px-4 rounded-lg border border-slate-700 shadow transition-all">
                        Voltar ao Menu
                    </button>
                </div>
                
                <div className="flex border-b border-slate-800">
                    <button onClick={() => setActiveTab('styles')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'styles' ? 'border-b-2 border-emerald-500 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>Estilos</button>
                    <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'users' ? 'border-b-2 border-emerald-500 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>Usuários</button>
                </div>

                {activeTab === 'styles' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4">
                        {distributors.map(dist => {
                            const style = styles[dist.name];
                            if (!style) return null;
                            
                            const currentColorHex = style.text_color.startsWith('#') ? style.text_color : rgbaToHex(style.bg_color);
                            
                            return (
                                <div key={dist.name} className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-4 space-y-4 flex flex-col h-full">
                                    <div className="flex justify-between items-center mb-1">
                                         <h3 className="font-bold text-slate-100 text-sm truncate pr-2">{dist.name}</h3>
                                         <span className="text-[10px] text-slate-500 uppercase font-mono">Config</span>
                                    </div>
                                    
                                    {/* PREVIEWS DE VISUALIZAÇÃO - SIMPLIFICADOS SEM ÍCONES */}
                                    <div className="space-y-4">
                                        
                                        {/* 1. Estilo Bolinha + Texto Branco */}
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-slate-500 font-bold uppercase">1. Minhas Cotações (Pill)</span>
                                            <div className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-center">
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 shadow-sm">
                                                    <div 
                                                        className="w-3 h-3 rounded-full flex-shrink-0" 
                                                        style={{ backgroundColor: style.bg_color }}
                                                    ></div>
                                                    <span className="text-xs font-bold text-white truncate max-w-[100px]">{dist.name}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Estilo Texto Colorido (Sem Bolinha) */}
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-slate-500 font-bold uppercase">2. Mercado (Texto)</span>
                                            <div className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-center items-center h-12">
                                                 <span className="text-sm font-bold truncate max-w-[120px]" style={{ color: style.text_color }}>
                                                    {dist.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <ColorSwatch 
                                            label="Cor da Marca" 
                                            color={currentColorHex} 
                                            onChange={c => handleSingleColorUpdate(dist.name, c)} 
                                        />
                                    </div>

                                    <div className="mt-auto pt-4">
                                        <button onClick={() => handleSaveStyle(dist.name)} disabled={saving[dist.name]} className="w-full py-2.5 px-4 text-xs font-bold text-white uppercase bg-slate-700 border border-slate-600 rounded-lg hover:bg-emerald-600 hover:border-emerald-500 disabled:opacity-50 transition-all shadow-md">
                                            {saving[dist.name] ? 'Salvando...' : 'Salvar Alterações'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {activeTab === 'users' && (
                    <div className="pt-4">
                        <input type="text" placeholder="Buscar por nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 bg-slate-900 border border-slate-800 text-slate-200 rounded-lg mb-4 focus:ring-emerald-500 focus:border-emerald-500" />
                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                            <table className="min-w-full bg-slate-900 divide-y divide-slate-800">
                                <thead className="bg-slate-950">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Nome</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Credencial</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Prefs</th>
                                        <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                                            <th scope="row" className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-200 text-left">{user.nome}</th>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">{user.email}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full uppercase ${user.credencial === 'administrador' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>{user.credencial}</span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 font-sans tabular-nums">{user.preferencias?.length || 0}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                                                <button onClick={() => openUserModal(user)} className="text-emerald-400 hover:text-emerald-300 font-bold uppercase text-xs">Editar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                <NotificationToast notification={notification} />
                {currentUser && (
                    <div className={`fixed inset-0 bg-black/80 z-40 transition-opacity ${isUserModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsUserModalOpen(false)}>
                        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 rounded-xl shadow-2xl border border-slate-800 w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-slate-100 mb-6 border-b border-slate-800 pb-2">{currentUser.nome}</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-medium text-slate-400 block mb-1">Credencial</label>
                                    <select value={currentUser.credencial} onChange={e => handleUserUpdate(currentUser.id, { credencial: e.target.value })} className="block w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg shadow-sm focus:border-emerald-500 text-slate-200">
                                        <option value="usuario">Usuário</option>
                                        <option value="administrador">Administrador</option>
                                    </select>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-medium text-slate-400">Preferências (<span className="font-sans tabular-nums">{currentUser.preferencias?.length || 0}</span>)</label>
                                        <button onClick={() => setIsAddPreferenceModalOpen(true)} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 px-3 py-1 rounded border border-emerald-900">+ ADICIONAR</button>
                                    </div>
                                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border border-slate-800 bg-slate-950/50 rounded-lg p-2 custom-scrollbar">
                                        {currentUser.preferencias?.map((pref, index) => (
                                            <div key={index} className="flex justify-between items-center p-3 bg-slate-900 rounded border border-slate-800">
                                                <span className="text-sm text-slate-300 font-medium">{pref.bandeira} <span className="text-slate-500 mx-2">•</span> <span className="text-slate-400 text-xs uppercase">{pref.base}</span></span>
                                                <button onClick={() => handleRemovePreference(index)} className="text-rose-400 hover:text-rose-300 text-xs font-bold uppercase">Remover</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end mt-8 border-t border-slate-800 pt-4">
                                <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition">Fechar</button>
                            </div>
                        </div>
                    </div>
                )}
                {currentUser && (
                    <AddPreferenceModal 
                        isOpen={isAddPreferenceModalOpen}
                        onClose={() => setIsAddPreferenceModalOpen(false)}
                        onSave={handleAddPreference}
                        allBases={allBases}
                        allDistributors={allDistributorNames}
                        existingPreferences={currentUser.preferencias || []}
                    />
                )}
            </div>
        </div>
    );
};

export default AdminPage;
