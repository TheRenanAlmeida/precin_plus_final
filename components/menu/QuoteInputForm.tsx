
import React, { useState } from 'react';
import { BandeiraBasePair } from '../../types';
import { FUEL_PRODUCTS } from '../../constants/fuels';
import { supabase } from '../../supabaseClient'; // Para pegar o user

interface QuoteInputFormProps {
    distributor: BandeiraBasePair;
    initialPrices: { [product: string]: string };
    onPriceChange: (product: string, value: string) => void;
    onSubmit: (dist: BandeiraBasePair, prices: { [product: string]: string }) => void;
    onCancel: () => void;
}

const QuoteInputForm: React.FC<QuoteInputFormProps> = ({ distributor, initialPrices, onPriceChange, onSubmit, onCancel }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // User effect removed as it was only for contracts
    
    const products = FUEL_PRODUCTS;

    const handleLocalPriceChange = (product: string, value: string) => {
        let digits = value.replace(/\D/g, '').slice(0, 4); 
        if (digits === '') {
            onPriceChange(product, '');
            return;
        }
        const formattedValue = digits.length > 1 ? `${digits.slice(0, 1)},${digits.slice(1)}` : digits;
        onPriceChange(product, formattedValue);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSubmit(distributor, initialPrices);
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            {products.map(product => {
               const hasValue = initialPrices[product] && initialPrices[product].length > 0;
               return (
                  <div key={product} className="flex items-center justify-between py-1">
                    <label
                      htmlFor={product}
                      className="text-sm font-medium text-slate-400 uppercase tracking-wide"
                    >
                      {product} <span className="text-[10px] text-slate-600">(R$)</span>
                    </label>
                    <input
                    type="text"
                    inputMode="decimal"
                    id={product}
                    value={initialPrices[product] || ''}
                    onChange={(e) => handleLocalPriceChange(product, e.target.value)}
                    placeholder="0,000"
                    className={`w-32 border rounded-lg bg-slate-950 px-3 py-2 text-right font-sans tabular-nums font-bold text-lg focus:outline-none transition shadow-inner
                                ${hasValue ? 'text-emerald-400 border-emerald-500/50' : 'text-slate-500 border-slate-700 focus:border-emerald-500 focus:text-slate-200'}`}
                    />
                  </div>
                );
            })}
          </div>
        
          <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 font-medium
                         hover:bg-slate-700 hover:text-white transition"
            >
              Cancelar
            </button>
        
            <button
            type="submit"
            disabled={isSubmitting || Object.values(initialPrices).every(p => !p)}
            className="px-6 py-2 rounded-lg font-bold text-white shadow-lg
                        bg-emerald-600 hover:bg-emerald-500
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900
                        transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
            {isSubmitting ? 'Enviando...' : 'Enviar Cotação'}
            </button>
          </div>
        </form>
    );
};

export default QuoteInputForm;
