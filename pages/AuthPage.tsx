import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AuthFormContainer from '../components/AuthFormContainer';

export default function AuthPage() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [rememberMe, setRememberMe] = useState(true);

    useEffect(() => {
        try {
            const savedEmail = localStorage.getItem('savedUserEmail');
            if (savedEmail) {
                setEmail(savedEmail);
                setRememberMe(true);
            }
        } catch (e) {
            console.warn('Could not read saved email from localStorage', e);
        }
    }, []);

    const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (isSignUp) {
            const { error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin,
                    data: {
                        name: fullName,
                        products: ["precin_plus"],
                        provider: "email",
                        providers: ["email"]
                    },
                },
            });

            if (authError) {
                setError(authError.message);
            } else {
                setMessage('Cadastro realizado! Verifique sua caixa de entrada (e spam) para o e-mail de confirmação.');
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            
            if (error) {
                setError('E-mail ou senha inválidos.');
            } else {
                try {
                    if (rememberMe) {
                        localStorage.setItem('savedUserEmail', email);
                    } else {
                        localStorage.removeItem('savedUserEmail');
                    }
                } catch (e) {
                    console.warn('Could not update saved email in localStorage', e);
                }
            }
        }
        setLoading(false);
    };

    const inputStyle = "mt-1 block w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg shadow-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors";
    const labelStyle = "text-sm font-medium text-slate-300";

    return (
        <AuthFormContainer>
            <div className="w-full">
                <div className="text-center mb-8">
                    <img src="https://i.imgur.com/rtUhjXo.png" alt="precin+" className="h-20 w-auto mx-auto brightness-200 grayscale contrast-125" />
                    <h1 className="text-3xl font-bold text-slate-100 mt-4 tracking-tight">
                        {isSignUp ? 'Crie sua conta' : 'Bem-vindo'}
                    </h1>
                    <p className="text-slate-400 mt-2">
                        {isSignUp ? 'Preencha os campos para se cadastrar.' : 'Faça login para acessar o painel.'}
                    </p>
                </div>
                <form onSubmit={handleAuth}>
                    <div className="space-y-4">
                        {isSignUp && (
                            <>
                                <div>
                                    <label htmlFor="fullName" className={labelStyle}>Nome Completo / Razão Social</label>
                                    <input type="text" id="fullName" name="fullName" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Seu nome ou da sua empresa" className={inputStyle} />
                                </div>
                            </>
                        )}
                        <div>
                            <label htmlFor="email" className={labelStyle}>Email</label>
                            <input type="email" id="email" name="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputStyle} />
                        </div>
                        <div>
                            <label htmlFor="password" className={labelStyle}>Senha</label>
                            <input type="password" id="password" name="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} required className={inputStyle} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center">
                            <input 
                                id="remember-me" 
                                name="remember-me" 
                                type="checkbox" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-600 rounded bg-slate-800"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
                                Salvar login
                            </label>
                        </div>
                    </div>

                    {error && <p className="mt-4 text-center text-sm text-rose-400 bg-rose-950/30 p-2 rounded border border-rose-900/50">{error}</p>}
                    {message && <p className="mt-4 text-center text-sm text-emerald-400 bg-emerald-950/30 p-2 rounded border border-emerald-900/50">{message}</p>}
                    <div className="mt-6">
                        <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? 'Processando...' : (isSignUp ? 'Cadastrar' : 'Entrar')}
                        </button>
                    </div>
                </form>
                <div className="mt-6 text-center border-t border-slate-800 pt-4">
                    <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                        {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
                    </button>
                </div>
            </div>
        </AuthFormContainer>
    );
}