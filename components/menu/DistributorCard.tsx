import React from 'react';
import { BandeiraBasePair, DistributorStyle } from '../../types';
import { FUEL_PRODUCTS } from '../../constants/fuels';

interface DistributorCardProps {
    dist: BandeiraBasePair;
    style: DistributorStyle;
    lastPrices: { [brand: string]: { [product: string]: { price: number; date: string } } };
    onSelect: (dist: BandeiraBasePair) => void;
    imageUrl: string | null;
}

const DistributorCard: React.FC<DistributorCardProps> = ({ dist, style, lastPrices, onSelect, imageUrl }) => {
    const productsToShow = FUEL_PRODUCTS;
    const brandPrices = lastPrices[dist.bandeira];
    const hasAnyPrice = brandPrices && Object.keys(brandPrices).length > 0;
    
    let lastUpdateDate: string | null = null;
    if (hasAnyPrice) {
        const allDates = Object.values(brandPrices).map((p: { price: number; date: string }) => p.date);
        if (allDates.length > 0) {
            lastUpdateDate = allDates.sort((a, b) => b.localeCompare(a))[0];
        }
    }
    const formattedLastUpdate = lastUpdateDate 
        ? new Date(`${lastUpdateDate}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) 
        : null;

    return (
        <div onClick={() => onSelect(dist)}
            className="relative cursor-pointer bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
            <div className="absolute left-0 top-0 h-full w-2 rounded-l-xl" style={{ background: style.background }}></div>
            <div className="p-4 pl-6">
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                        {imageUrl && (
                            <img
                                src={imageUrl}
                                alt={dist.bandeira}
                                className="w-8 h-8 rounded-full bg-white/20 p-0.5 object-contain border border-gray-200"
                            />
                        )}
                        <h3 className="font-semibold text-gray-800">{dist.bandeira}</h3>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{dist.base}</span>
                </div>
                <p className="text-sm text-gray-500 mb-2">Última atualização: {formattedLastUpdate || '—'}</p>
                <div className="space-y-1 text-sm">
                    {hasAnyPrice ? productsToShow.map(product => {
                        const priceInfo = brandPrices?.[product];
                        const productAbbr = {
                            'Gasolina Comum': 'G. Comum',
                            'Gasolina Aditivada': 'G. Aditivada',
                            'Etanol': 'Etanol',
                            'Diesel S10': 'D. S10',
                            'Diesel S500': 'D. S500',
                        }[product] || product;
                        
                        return (
                            <div key={product} className="flex justify-between border-t border-gray-100 pt-1 first:border-t-0 first:pt-0">
                                <span className="text-gray-700">{productAbbr}</span>
                                <span className="font-semibold text-gray-800 tabular-nums">
                                    {priceInfo ? `R$ ${priceInfo.price.toFixed(4).replace('.', ',')}` : '-'}
                                </span>
                            </div>
                        );
                    }) : (
                        <div className="text-center text-gray-500 py-4 border-t border-gray-100">
                            <span className="text-sm font-medium">Clique para cotar</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DistributorCard;