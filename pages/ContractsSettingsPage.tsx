
import React, { useState } from 'react';
import Header from '../components/Header';
import { UserProfile } from '../types';
import { useContracts } from '../hooks/useContracts';
import ContractEditModal from '../components/contracts/ContractEditModal';
import LoadingScreen from '../components/LoadingScreen';

interface ContractsSettingsPageProps {
    userProfile: UserProfile;
    goBack: () => void;
}

const ContractsSettingsPage: React.FC<ContractsSettingsPageProps> = ({ userProfile, goBack }) => {
    const defaultBase = React.useMemo(() => {
        const bases = Array.from(new Set(userProfile.preferencias.map(p => p.base))).sort();
        return bases[0] || '';
    }, [userProfile.preferencias]);

    const { contracts, loading, saveContract, removeContract, importContracts, exportContracts } = 
        useContracts(userProfile.id, defaultBase);
        
    const [editingBrand, setEditingBrand] = useState<string | null>(null);
    const [importData, setImportData] = useState('');
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
    const [isProcessingImport, setIsProcessingImport] = useState(false);

    const brands = Array.from(new Set(userProfile.preferencias.map(p => p.bandeira))).sort();

    const handleExport = () => {
        const data = exportContracts();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `contratos_precin_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = async () => {
        if (!importData) return;
        setIsProcessingImport(true);
        setImportStatus(null);
        
        const success = await importContracts(importData);
        
        setIsProcessingImport(false);
        if (success) {
            setImportStatus({ type: 'success', msg: 'Contratos importados com sucesso na base ativa!' });
            setImportData('');
        } else {
            setImportStatus({ type: 'error', msg: 'Erro ao importar. Verifique o JSON.' });
        }
    };

    if (loading && !isProcessingImport && !editingBrand) {
        return <LoadingScreen message="Carregando contratos..." />;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            <Header userProfile={userProfile} className="bg-slate-950 border-b border-slate-800" />
            
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <button onClick={goBack} className="text-xs font-bold text-slate-400 hover:text-slate-100 uppercase tracking-wide flex items-center gap-1 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            Voltar
                        </button>
                        <h1 className="text-3xl font-bold text-slate-100">Configuração de Contratos</h1>
                        <p className="text-slate-400 mt-1">Regras de spread para cada bandeira.</p>
                        {defaultBase && (
                            <p className="text-emerald-400 text-xs font-bold mt-2 uppercase tracking-wider">
                                Base Ativa: {defaultBase}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg text-sm font-bold text-emerald-400 flex items-center gap-2 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Exportar
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg">
                        <h2 className="text-lg font-bold text-slate-100 mb-4 border-b border-slate-800 pb-2">Seus Contratos</h2>
                        <div className="space-y-3">
                            {brands.map(brand => {
                                const activeRules = contracts[brand] ? Object.keys(contracts[brand]).length : 0;
                                return (
                                    <div key={brand} className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors">
                                        <div>
                                            <span className="font-bold text-slate-200 block">{brand}</span>
                                            <span className="text-xs text-slate-500">{activeRules} regras</span>
                                        </div>
                                        <button 
                                            onClick={() => setEditingBrand(brand)}
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase rounded text-emerald-400"
                                        >
                                            Editar
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg h-fit">
                        <h2 className="text-lg font-bold text-slate-100 mb-4 border-b border-slate-800 pb-2">Importar Backup</h2>
                        <textarea 
                            value={importData}
                            onChange={e => setImportData(e.target.value)}
                            className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-300 focus:ring-emerald-500 mb-3"
                            placeholder='{"Shell": {"Gasolina Comum": {"base": "AVG", "spread": 0.04...}}}'
                        />
                        <button 
                            onClick={handleImport}
                            disabled={!importData || isProcessingImport}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isProcessingImport ? 'Importando...' : 'Importar'}
                        </button>
                        {importStatus && (
                            <p className={`mt-3 text-xs text-center font-bold p-2 rounded ${importStatus.type === 'success' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`}>
                                {importStatus.msg}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {editingBrand && (
                <ContractEditModal 
                    isOpen={!!editingBrand}
                    onClose={() => setEditingBrand(null)}
                    brandName={editingBrand}
                    existingContracts={contracts[editingBrand] || {}}
                    onSave={(fuel, base, spread) => saveContract(defaultBase, editingBrand, fuel, base, spread)}
                    onRemove={async (fuel) => {
                        const contractId = editingBrand ? contracts[editingBrand]?.[fuel]?.id : undefined;
                        // Chama o remove do hook com contexto completo
                        await removeContract({
                            contractId,
                            brandName: editingBrand,
                            productName: fuel
                        });
                    }}
                />
            )}
        </div>
    );
};

export default ContractsSettingsPage;
