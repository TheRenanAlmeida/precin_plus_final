import React, { useState } from 'react';
import { BandeiraBasePair } from '../../types';
import { FUEL_PRODUCTS } from '../../constants/fuels';

interface QuoteInputFormProps {
    distributor: BandeiraBasePair;
    initialPrices: { [product: string]: string };
    onPriceChange: (product: string, value: string) => void;
    onSubmit: (dist: BandeiraBasePair, prices: { [product: string]: string }) => void;
    onCancel: () => void;
}

const QuoteInputForm: React.FC<QuoteInputFormProps> = ({ distributor, initialPrices, onPriceChange, onSubmit, onCancel }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const products = FUEL_PRODUCTS;

    const handleLocalPriceChange = (product: string, value: string) => {
        let digits = value.replace(/\D/g, '').slice(0, 5); // Allows up to 5 digits (e.g., 9,9999)
        if (digits === '') {
            onPriceChange(product, '');
            return;
        }
        // Ensure the first digit is handled correctly before adding a comma
        const formattedValue = digits.length > 1 ? `${digits.slice(0, 1)},${digits.slice(1)}` : digits;
        onPriceChange(product, formattedValue);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSubmit(distributor, initialPrices); // Passa os preços do estado pai (props)
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit}>
          <div className="space-y-2">
            {products.map(product => (
              <div key={product} className="flex items-center justify-between py-1">
                <label
                  htmlFor={product}
                  className="text-sm font-medium text-gray-700"
                >
                  {product} (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  id={product}
                  value={initialPrices[product] || ''}
                  onChange={(e) => handleLocalPriceChange(product, e.target.value)}
                  placeholder="Ex: 5,1234"
                  className="w-36 border border-gray-200 rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400
                             focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500
                             transition shadow-sm"
                />
              </div>
            ))}
          </div>
        
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium
                         hover:bg-gray-100 hover:shadow-sm transition"
            >
              Cancelar
            </button>
        
            <button
              type="submit"
              disabled={isSubmitting || Object.values(initialPrices).every(p => !p)}
              className="px-6 py-2 rounded-lg font-semibold text-white shadow-sm
                         bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                         transition duration-150 disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Cotação'}
            </button>
          </div>
        </form>
    );
};

export default QuoteInputForm;