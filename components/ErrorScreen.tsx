import React from 'react';

const ErrorScreen = ({ title = "Erro de Conexão", error, recommendation }: { title?: string, error: string | null, recommendation?: string }) => (
    <div className="flex justify-center items-center h-screen bg-slate-950 p-4">
        <div className="text-center p-8 bg-slate-900 border border-rose-900/50 text-rose-400 rounded-2xl shadow-xl max-w-lg">
          <div className="mb-4 text-rose-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-slate-100">{title}</h2>
          <p className="text-sm font-mono bg-black/20 p-2 rounded border border-rose-900/30 overflow-auto max-h-32 text-rose-300">{error}</p>
          <p className="mt-4 text-sm text-slate-400">{recommendation || "Por favor, verifique sua conexão com a internet e tente novamente."}</p>
           <button onClick={() => window.location.reload()} className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors">
                Recarregar a página
            </button>
        </div>
    </div>
);

export default ErrorScreen;