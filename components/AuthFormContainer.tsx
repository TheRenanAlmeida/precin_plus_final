import React from 'react';

interface AuthFormContainerProps {
    children: React.ReactNode;
    widthClass?: string;
}

const AuthFormContainer: React.FC<AuthFormContainerProps> = ({ children, widthClass = 'max-w-md' }) => {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
            <div className={`w-full bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 ${widthClass}`}>
                {children}
            </div>
        </div>
    );
};

export default AuthFormContainer;