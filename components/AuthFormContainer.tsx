
import React from 'react';

// FIX: Refactored to use React.FC and an interface for clearer type definition, which resolves misleading "children is missing" errors in consuming components.
interface AuthFormContainerProps {
    children: React.ReactNode;
    widthClass?: string;
}

const AuthFormContainer: React.FC<AuthFormContainerProps> = ({ children, widthClass = 'max-w-md' }) => {
    return (
        <div className="min-h-screen bg-white flex flex-col justify-center items-center p-4">
            <div className={`w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200 ${widthClass}`}>
                {children}
            </div>
        </div>
    );
};

export default AuthFormContainer;