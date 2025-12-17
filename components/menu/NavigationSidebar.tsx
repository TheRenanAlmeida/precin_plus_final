
import React from 'react';

interface NavigationSidebarProps {
    goToDashboard: () => void;
    goToHistory: () => void;
    goToAdmin: () => void;
    goToContracts?: () => void;
    isAdmin: boolean;
}

const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ goToDashboard, goToHistory, goToAdmin, goToContracts, isAdmin }) => (
    <aside className="lg:col-span-3 space-y-8">
        <div className="p-5 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 space-y-4 sticky top-24">
            <h2 className="text-xl font-bold text-slate-100 uppercase tracking-wide border-b border-slate-800 pb-3">Acesso Rápido</h2>
            
            <button onClick={goToDashboard} className="w-full text-left p-3 rounded-lg text-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition duration-150 shadow-md flex items-center gap-3 border border-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                DASHBOARD
            </button>

            <button onClick={goToHistory} className="w-full text-left p-3 rounded-lg text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition duration-150 shadow-md flex items-center gap-3 border border-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                HISTÓRICO
            </button>

            {goToContracts && (
                <button onClick={goToContracts} className="w-full text-left p-3 rounded-lg text-lg font-medium text-slate-100 bg-slate-700 hover:bg-slate-600 transition duration-150 shadow-md flex items-center gap-3 border border-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    CONFIGURAR CONTRATO
                </button>
            )}

            {isAdmin && (
                <button onClick={goToAdmin} className="w-full text-left p-3 rounded-lg text-lg font-medium text-white bg-slate-800 hover:bg-slate-700 transition duration-150 shadow-md flex items-center gap-3 border border-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    PAINEL ADMIN
                </button>
            )}
        </div>
    </aside>
);

export default NavigationSidebar;
