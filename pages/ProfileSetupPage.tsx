import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import AuthFormContainer from '../components/AuthFormContainer'; // Import for consistent layout

interface Props {
    user: User;
    userProfile: UserProfile;
    onProfileComplete: () => void;
}

// --- Funções de Máscara ---
const formatPhone = (value: string): string => {
    if (!value) return "";
    value = value.replace(/\D/g, ''); // Remove tudo que não é dígito
    value = value.slice(0, 11); // Limita a 11 dígitos (DDD + 9 dígitos)

    if (value.length > 10) {
      // Celular (XX) XXXXX-XXXX
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (value.length > 6) {
      // Fixo (XX) XXXX-XXXX
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (value.length > 2) {
      // (XX) XXXX
      value = value.replace(/^(\d{2})(\d{0,4}).*/, '($1) $2');
    } else if (value.length > 0) {
      // (XX
      value = value.replace(/^(\d*)/, '($1');
    }
    return value;
};

const formatDocument = (value: string): string => {
    if (!value) return "";
    value = value.replace(/\D/g, ''); // Remove tudo que não é dígito

    if (value.length <= 11) {
      // Formato CPF: XXX.XXX.XXX-XX
      value = value.slice(0, 11);
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // Formato CNPJ: XX.XXX.XXX/XXXX-XX
      value = value.slice(0, 14);
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
};


export default function ProfileSetupPage({ user, userProfile, onProfileComplete }: Props) {
    // Keep the original state initialization to show existing data
    const [nome, setNome] = useState(userProfile.nome || '');
    const [cnpj, setCnpj] = useState(userProfile.cnpj || '');
    const [telefone, setTelefone] = useState(userProfile.telefone || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Remove a máscara antes de salvar no banco de dados
        const rawCnpj = cnpj.replace(/\D/g, '');
        const rawTelefone = telefone.replace(/\D/g, '');

        const { error } = await supabase
            .from('pplus_users')
            .update({
                nome,
                cnpj: rawCnpj,
                telefone: rawTelefone,
            })
            .eq('id', user.id);
        
        if (error) {
            setError('Erro ao atualizar perfil: ' + error.message);
        } else {
            onProfileComplete();
        }
        setLoading(false);
    };

    // Consistent input style with AuthPage
    const inputStyle = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm";

    return (
        <AuthFormContainer>
            <div className="text-center mb-8">
                 <h1 className="text-3xl font-bold text-gray-800 mt-4">Complete seu Perfil</h1>
                <p className="text-gray-500">Precisamos de mais algumas informações para continuar.</p>
            </div>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
                 <div className="space-y-4">
                    <div>
                        <label htmlFor="nome" className="text-sm font-medium text-gray-700">Nome Completo / Razão Social</label>
                        <input 
                            type="text" 
                            id="nome" 
                            value={nome} 
                            onChange={e => setNome(e.target.value)} 
                            required 
                            className={inputStyle}
                            placeholder="Seu nome ou da sua empresa"
                        />
                    </div>
                    <div>
                        <label htmlFor="cnpj" className="text-sm font-medium text-gray-700">CNPJ / CPF</label>
                        <input 
                            type="text" 
                            id="cnpj" 
                            value={cnpj} 
                            onChange={e => setCnpj(formatDocument(e.target.value))} 
                            required 
                            className={inputStyle}
                            placeholder="00.000.000/0000-00"
                            maxLength={18}
                        />
                    </div>
                     <div>
                        <label htmlFor="telefone" className="text-sm font-medium text-gray-700">Telefone</label>
                        <input 
                            type="tel" 
                            id="telefone" 
                            value={telefone} 
                            onChange={e => setTelefone(formatPhone(e.target.value))} 
                            required 
                            className={inputStyle}
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                        />
                    </div>
                </div>
                {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
                 <div className="mt-6">
                    <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50">
                        {loading ? 'Salvando...' : 'Salvar e Continuar'}
                    </button>
                </div>
            </form>
        </AuthFormContainer>
    );
}