import React from 'react';

interface NotificationToastProps {
    notification: { type: 'success' | 'error', message: string } | null;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification }) => {
    if (!notification) return null;

    return (
        <div className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} animate-fade-in z-30`}>
            {notification.message}
        </div>
    );
};

export default NotificationToast;
