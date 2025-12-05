import React from 'react';

const ErrorScreen = ({ title = "Erro de Conexão", error, recommendation }: { title?: string, error: string | null, recommendation?: string }) => (
    <div className="flex justify-center items-center h-screen bg-slate-50 p-4">
        <div className="text-center p-8 bg-red-50 border-2 border-red-200 text-red-800 rounded-xl shadow-lg max-w-lg">
          <h2 className="text-2xl font-bold mb-4">{title}</h2>
          <p className="text-base">{error}</p>
          <p className="mt-4 text-sm text-red-700">{recommendation || "Por favor, verifique o arquivo `config.ts`, sua conexão com a internet e as permissões da sua view no Supabase."}</p>
           <button onClick={() => window.location.reload()} className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-white bg-red-600 hover:bg-red-700">
                Recarregar a página
            </button>
        </div>
    </div>
);

export default ErrorScreen;