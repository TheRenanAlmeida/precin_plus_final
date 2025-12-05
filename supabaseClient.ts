import { createClient } from '@supabase/supabase-js';

// As credenciais do Supabase foram centralizadas aqui para simplificar a configuração.
const supabaseUrl = 'https://hjdbjszaykgosoicpmye.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZGJqc3pheWtnb3NvaWNwbXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc3MzI4MTgsImV4cCI6MjAzMzMwODgxOH0.qqbbXRRRik4A2mOa67pyJ1yzb-RPY0CmA5f21vZoj1k';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('As credenciais do Supabase (URL e chave anônima) são necessárias.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);