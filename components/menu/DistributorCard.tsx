
import React from 'react';
import { BandeiraBasePair, DistributorStyle } from '../../types';
import { FUEL_PRODUCTS } from '../../constants/fuels';

interface DistributorCardProps {
    dist: BandeiraBasePair;
    style: DistributorStyle;
    lastPrices: { [brand: string]: { [product: string]: { price: number; date: string } } };
    onSelect: (dist: BandeiraBasePair) => void;
    imageUrl: string | null;
    selectedQuoteDate: string;
}

const DistributorCard: React.FC<DistributorCardProps> = ({ dist, style, lastPrices, onSelect, imageUrl, selectedQuoteDate }) => {
    const productsToShow = FUEL_PRODUCTS;
    const brandPrices = lastPrices[dist.bandeira];
    const hasAnyPrice = brandPrices && Object.keys(brandPrices).length > 0;
    
    // Verifica se já existe cotação salva especificamente para a data que o usuário está visualizando
    const isQuotedOnSelectedDate = brandPrices && Object.values(brandPrices).some((p: any) => p.date === selectedQuoteDate);

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
            className={`relative cursor-pointer bg-slate-800/50 border rounded-xl shadow-sm overflow-hidden hover:bg-slate-800 transition group font-sans
                ${isQuotedOnSelectedDate ? 'border-emerald-500/30' : 'border-slate-700/50 hover:border-slate-600'}
            `}>
            <div className="absolute left-0 top-0 h-full w-2 rounded-l-xl" style={{ background: style.background }}></div>
            <div className="p-4 pl-6">
                <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                        {imageUrl && (
                            <img
                                src={imageUrl}
                                alt={dist.bandeira}
                                className="w-8 h-8 rounded-full bg-white/20 p-0.5 object-contain border border-slate-600"
                            />
                        )}
                        <h3 className="font-bold text-slate-200 group-hover:text-white transition-colors">{dist.bandeira}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-700">{dist.base}</span>
                        {isQuotedOnSelectedDate ? (
                            <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/50 uppercase tracking-tighter">
                                Registrada nesta data
                            </span>
                        ) : (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 uppercase tracking-tighter">
                                Sem cotação na data
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-xs text-slate-400 mb-3 font-medium">Última atualização: {formattedLastUpdate || '—'}</p>
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
                        
                        // Destaca em verde se o preço for especificamente da data selecionada
                        const isThisDate = priceInfo?.date === selectedQuoteDate;

                        return (
                            <div key={product} className="flex justify-between border-t border-slate-700/50 pt-1 first:border-t-0 first:pt-0">
                                <span className="text-slate-300 text-xs uppercase font-semibold">{productAbbr}</span>
                                <span className={`font-sans tabular-nums font-bold ${isThisDate ? 'text-emerald-400' : 'text-slate-200 opacity-60'}`}>
                                    {priceInfo ? `R$ ${priceInfo.price.toFixed(4).replace('.', ',')}` : '-'}
                                </span>
                            </div>
                        );
                    }) : (
                        <div className="text-center text-slate-500 py-2 border-t border-slate-700/50">
                            <span className="text-xs font-medium uppercase tracking-wide">Clique para cotar</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DistributorCard;
