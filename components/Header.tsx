
import React from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

interface HeaderProps {
    userProfile?: UserProfile | null;
    children?: React.ReactNode;
    className?: string;
}

const Header: React.FC<HeaderProps> = ({ userProfile, children, className }) => {
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };
    
    // Se className for fornecido, usa ele. Se não, usa o verde padrão.
    // Dashboard sobrescreve a cor para slate-950.
    // REMOVIDO: 'sticky top-0' para que o header pare de seguir a rolagem.
    const headerClass = className 
        ? `shadow-md relative z-50 ${className}`
        : "bg-[#16a34a] shadow-md relative z-50";

    return (
        <header className={headerClass}>
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <img src="https://i.imgur.com/scv57na.png" alt="precin+" className="h-14 w-auto" />
                    </div>
                    <div className="flex items-center gap-2">
                        {children}
                        {userProfile && (
                            <button onClick={handleLogout} className="text-gray-100 hover:bg-white/10 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                Sair
                            </button>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default Header;
