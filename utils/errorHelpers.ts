
/**
 * Função de extração de mensagem de erro aprimorada para evitar [object Object].
 * Extrai mensagens de objetos de erro do Supabase, instâncias de Error ou strings.
 */
export const getErrorMessage = (error: unknown): string => {
    if (!error) return 'Erro desconhecido.';
    
    // Se for uma string direta
    if (typeof error === 'string') return error;
    
    // Se for instância de Error (como TypeError: Failed to fetch)
    if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
            return 'Falha de conexão com o servidor. Verifique sua internet.';
        }
        return error.message;
    }

    // Se for um objeto (Supabase, Postgrest, etc)
    if (typeof error === 'object') {
        const anyError = error as any;
        
        // Prioridade de campos comuns em erros de API
        const msg = anyError.message || anyError.msg || anyError.error_description || anyError.error || anyError.details;
        
        if (typeof msg === 'string') {
            if (msg.includes('Failed to fetch')) return 'Erro de conexão: servidor inacessível.';
            return msg;
        }
        
        // Se a mensagem for outro objeto, tenta stringify de forma amigável
        try {
            const str = JSON.stringify(error);
            if (str && str !== '{}') return str;
        } catch (e) {
            // fallback
        }
    }
    
    const finalFallback = String(error);
    return finalFallback === '[object Object]' ? 'Erro inesperado no servidor ou conexão.' : finalFallback;
};
