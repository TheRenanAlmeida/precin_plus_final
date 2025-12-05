import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, DistributorDBStyle, BandeiraBasePair } from '../types';
import LoadingScreen from '../components/LoadingScreen';
import ErrorScreen from '../components/ErrorScreen';
import NotificationToast from '../components/menu/NotificationToast';
import DistributorLogo from '../components/DistributorLogo';
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

// --- Helper Functions ---
const getLuminance = (hex: string): number => {
    if (!hex || !hex.startsWith('#') || hex.length !== 7) return 0;
    const rgb = parseInt(hex.slice(1), 16);
    let r = (rgb >> 16) & 0xff;
    let g = (rgb >> 8) & 0xff;
    let b = (rgb >> 0) & 0xff;

    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7158 + a[2] * 0.0722;
};

const calculateContrast = (hex1: string, hex2: string): number => {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
};


// --- Sub-components for Admin Page ---

const ColorSwatch: React.FC<{ label: string, color: string, onChange: (color: string) => void }> = ({ label, color, onChange }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div>
            <label className="text-xs font-medium text-slate-600">{label}</label>
            <div className="flex items-center gap-2 mt-1">
                <div 
                    className="w-6 h-6 rounded-md border border-slate-300 cursor-pointer" 
                    style={{ backgroundColor: color }}
                    onClick={() => inputRef.current?.click()}
                    title={`Clique para alterar a cor ${label}`}
                >
                    <input ref={inputRef} type="color" value={color} onChange={e => onChange(e.target.value)} className="opacity-0 w-0 h-0" />
                </div>
                <span className="text-xs text-slate-500 font-mono uppercase">{color}</span>
            </div>
        </div>
    );
};

const ContrastBadge: React.FC<{ bgColor: string, textColor: string }> = ({ bgColor, textColor }) => {
    const contrastRatio = useMemo(() => calculateContrast(bgColor, textColor), [bgColor, textColor]);
    
    let level: 'AAA' | 'AA' | 'Fail' = 'Fail';
    let text = 'Baixo contraste';
    let colorClasses = 'bg-red-100 text-red-800 border-red-300';

    if (contrastRatio >= 7) {
        level = 'AAA';
        text = 'AAA OK';
        colorClasses = 'bg-green-100 text-green-800 border-green-300';
    } else if (contrastRatio >= 4.5) {
        level = 'AA';
        text = 'AA OK';
        colorClasses = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (contrastRatio >= 3) {
        text = 'AA (Texto Grande)';
        colorClasses = 'bg-amber-100 text-amber-800 border-amber-300';
    }

    return (
        <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${colorClasses}`}>
            {text}
            <span className="ml-1.5 opacity-70">({contrastRatio.toFixed(2)}:1)</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Adicionar Preferência</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="base-select" className="text-sm font-medium text-slate-600">Base</label>
                        <select id="base-select" value={selectedBase} onChange={e => setSelectedBase(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm">
                            {allBases.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="bandeira-select" className="text-sm font-medium text-slate-600">Distribuidora</label>
                        <select id="bandeira-select" value={selectedBandeira} onChange={e => setSelectedBandeira(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm">
                            {allDistributors.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>
                {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700">Salvar</button>
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
                        text_color: existing?.text_color || '#000000',
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

    const handleStyleChange = (distName: string, field: keyof Omit<DistributorDBStyle, 'name'>, value: string) => {
        setStyles(prev => ({
            ...prev,
            [distName]: { ...prev[distName], [field]: value }
        }));
    };
    
    const handleShadowToggle = (distName: string) => {
        const currentStyle = styles[distName];
        const currentBg = currentStyle.bg_color;
        const newShadow = currentStyle.shadow_style ? null : hexToRgba(rgbaToHex(currentBg), 0.5);
        handleStyleChange(distName, 'shadow_style', newShadow!);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-300 pb-4">
                <h1 className="text-3xl font-extrabold text-slate-900">Painel de Administrador</h1>
                <button onClick={goBack} className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow transition-all">
                    Voltar ao Menu
                </button>
            </div>
            
            <div className="flex border-b border-slate-200">
                <button onClick={() => setActiveTab('styles')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'styles' ? 'border-b-2 border-green-600 text-green-600' : 'text-slate-500 hover:text-green-600'}`}>Estilos de Distribuidoras</button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'users' ? 'border-b-2 border-green-600 text-green-600' : 'text-slate-500 hover:text-green-600'}`}>Gerenciar Usuários</button>
            </div>

            {activeTab === 'styles' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4">
                    {distributors.map(dist => {
                        const style = styles[dist.name];
                        if (!style) return null;
                        
                        const bgColorHex = rgbaToHex(style.bg_color);
                        const textColorHex = rgbaToHex(style.text_color);
                        
                        return (
                            <div key={dist.name} className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 space-y-4">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-slate-800 text-lg">{dist.name}</h3>
                                    <div className="inline-flex items-center justify-center gap-2 px-3 h-8 text-xs font-bold rounded-full distributor-pill" style={{ backgroundColor: style.bg_color, color: style.text_color, '--shadow-color': style.shadow_style } as React.CSSProperties}>
                                        <DistributorLogo distributorName={dist.name} imageUrl={dist.image} />
                                        <span>Preview</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <ColorSwatch label="Fundo" color={bgColorHex} onChange={c => handleStyleChange(dist.name, 'bg_color', hexToRgba(c, 0.95))} />
                                    <ColorSwatch label="Texto" color={textColorHex} onChange={c => handleStyleChange(dist.name, 'text_color', c)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <ContrastBadge bgColor={bgColorHex} textColor={textColorHex} />
                                    <label htmlFor={`shadow-toggle-${dist.name}`} className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" id={`shadow-toggle-${dist.name}`} className="sr-only" checked={!!style.shadow_style} onChange={() => handleShadowToggle(dist.name)} />
                                            <div className={`block w-10 h-6 rounded-full ${style.shadow_style ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                            <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform"></div>
                                        </div>
                                        <div className="ml-2 text-xs text-slate-600">Sombra</div>
                                    </label>
                                </div>
                                <button onClick={() => handleSaveStyle(dist.name)} disabled={saving[dist.name]} className="w-full mt-2 py-2 px-4 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition">
                                    {saving[dist.name] ? 'Salvando...' : 'Salvar Estilo'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {activeTab === 'users' && (
                <div className="pt-4">
                    <input type="text" placeholder="Buscar por nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg mb-4" />
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Credencial</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Preferências</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {filteredUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-slate-900">{user.nome}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">{user.email}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.credencial === 'administrador' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>{user.credencial}</span>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">{user.preferencias?.length || 0}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-center text-sm font-medium">
                                            <button onClick={() => openUserModal(user)} className="text-green-600 hover:text-green-900">Editar</button>
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
                <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${isUserModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsUserModalOpen(false)}>
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-800 mb-4">{currentUser.nome}</h3>
                        <div className="space-y-4">
                             <div>
                                <label className="text-sm font-medium text-slate-600">Credencial</label>
                                <select value={currentUser.credencial} onChange={e => handleUserUpdate(currentUser.id, { credencial: e.target.value })} className="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm">
                                    <option value="usuario">Usuário</option>
                                    <option value="administrador">Administrador</option>
                                </select>
                            </div>
                             <div>
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-slate-600">Preferências ({currentUser.preferencias?.length || 0})</label>
                                    <button onClick={() => setIsAddPreferenceModalOpen(true)} className="text-sm font-semibold text-green-600 hover:text-green-800">+ Adicionar</button>
                                </div>
                                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-md p-2">
                                    {currentUser.preferencias?.map((pref, index) => (
                                        <div key={index} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                            <span className="text-sm text-slate-700">{pref.bandeira} - <span className="font-semibold">{pref.base}</span></span>
                                            <button onClick={() => handleRemovePreference(index)} className="text-red-500 hover:text-red-700">Remover</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">Fechar</button>
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
    );
};

export default AdminPage;