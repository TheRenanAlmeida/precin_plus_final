import React from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

interface HeaderProps {
    userProfile?: UserProfile | null;
    children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ userProfile, children }) => {
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };
    
    return (
        <header className="bg-[#16a34a] shadow-md sticky top-0 z-50">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <img src="https://i.imgur.com/scv57na.png" alt="precin+" className="h-14 w-auto" />
                    </div>
                    <div className="flex items-center gap-2">
                        {children}
                        {userProfile && (
                            <button onClick={handleLogout} className="text-gray-100 hover:bg-green-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
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