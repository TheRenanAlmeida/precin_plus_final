import React, { useState } from 'react';

interface DistributorLogoProps {
  distributorName: string;
  imageUrl: string | null | undefined;
}

const DistributorLogo: React.FC<DistributorLogoProps> = ({ distributorName, imageUrl }) => {
    const [hasError, setHasError] = useState(false);

    const getInitials = (name: string) => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    if (imageUrl && !hasError) {
        return (
            <img
                src={imageUrl}
                alt={distributorName}
                className="w-5 h-5 rounded-full bg-white/20 p-0.5 object-contain flex-shrink-0"
                onError={() => setHasError(true)}
                loading="lazy"
            />
        );
    }

    return (
        <div 
            className="w-5 h-5 rounded-full bg-white/30 flex-shrink-0 flex items-center justify-center"
            title={distributorName}
        >
            <span className="text-xs font-black" style={{ fontSize: '0.6rem' }}>
                {getInitials(distributorName)}
            </span>
        </div>
    );
};

export default DistributorLogo;