import React, { useState } from 'react';
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
                    data: { // This data is stored in user_metadata
                        name: fullName, // CAMPO CRÍTICO PARA O TRIGGER
                        // Including product data as requested. A backend trigger
                        // is assumed to promote this to app_metadata.
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
            }
            // A verificação de acesso e o redirecionamento agora são
            // totalmente gerenciados pelo listener onAuthStateChange em App.tsx.
            // A verificação de 'app_metadata' foi removida para garantir que
            // novos usuários possam acessar o sistema.
        }
        setLoading(false);
    };

    const inputStyle = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm";

    return (
        <AuthFormContainer>
            <div className="w-full">
                <div className="text-center mb-8">
                    <img src="https://i.imgur.com/rtUhjXo.png" alt="precin+" className="h-20 w-auto mx-auto" />
                    <h1 className="text-3xl font-bold text-black mt-4">
                        {isSignUp ? 'Crie sua conta' : 'Bem-vindo!'}
                    </h1>
                    <p className="text-black">
                        {isSignUp ? 'Preencha os campos para se cadastrar.' : 'Faça login para continuar.'}
                    </p>
                </div>
                <form onSubmit={handleAuth}>
                    <div className="space-y-4">
                        {isSignUp && (
                            <>
                                <div>
                                    <label htmlFor="fullName" className="text-sm font-medium text-black">Nome Completo / Razão Social</label>
                                    <input type="text" id="fullName" name="fullName" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Seu nome ou da sua empresa" className={inputStyle} />
                                </div>
                            </>
                        )}
                        <div>
                            <label htmlFor="email" className="text-sm font-medium text-black">Email</label>
                            <input type="email" id="email" name="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputStyle} />
                        </div>
                        <div>
                            <label htmlFor="password" className="text-sm font-medium text-black">Senha</label>
                            <input type="password" id="password" name="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} required className={inputStyle} />
                        </div>
                    </div>
                    {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
                    {message && <p className="mt-4 text-center text-sm text-green-600">{message}</p>}
                    <div className="mt-6">
                        <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50">
                            {loading ? 'Carregando...' : (isSignUp ? 'Cadastrar' : 'Entrar')}
                        </button>
                    </div>
                </form>
                <div className="mt-6 text-center">
                    <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm font-medium text-green-600 hover:text-green-500">
                        {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
                    </button>
                </div>
            </div>
        </AuthFormContainer>
    );
}