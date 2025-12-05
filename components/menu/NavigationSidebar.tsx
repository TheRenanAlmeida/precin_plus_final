import React from 'react';

interface NavigationSidebarProps {
    goToDashboard: () => void;
    goToHistory: () => void;
    goToAdmin: () => void;
    isAdmin: boolean;
}

const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ goToDashboard, goToHistory, goToAdmin, isAdmin }) => (
    <aside className="lg:col-span-3 space-y-8">
        <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200 space-y-4 sticky top-20">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">Painel de Acesso</h2>
            <button onClick={goToDashboard} className="w-full text-left p-3 rounded-lg text-lg font-medium text-white bg-green-600 hover:bg-green-700 transition duration-150 shadow-md flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                DASHBOARD
            </button>
            <button onClick={goToHistory} className="w-full text-left p-3 rounded-lg text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition duration-150 shadow-md flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                HISTÓRICO
            </button>
            {isAdmin && (
                <button onClick={goToAdmin} className="w-full text-left p-3 rounded-lg text-lg font-medium text-white bg-slate-700 hover:bg-slate-800 transition duration-150 shadow-md flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    PAINEL ADMIN
                </button>
            )}
        </div>
    </aside>
);

export default NavigationSidebar;