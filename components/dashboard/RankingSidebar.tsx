import React from 'react';
import { FUEL_PRODUCTS } from '../../constants/fuels';

interface RankingSidebarProps {
  products: string[];                       // alinha com DashboardPage
  onProductSelect: (product: string) => void;
  activeProduct: string | null;
}

const PRODUCT_ABBREVIATIONS: Record<string, string> = {
  'Gasolina Comum': 'GC',
  'Gasolina Aditivada': 'GA',
  'Etanol': 'E',
  'Diesel S10': 'S10',
  'Diesel S500': 'S500',
};

const RankingSidebar: React.FC<RankingSidebarProps> = ({
  products,
  onProductSelect,
  activeProduct,
}) => {
  // se não vier nada do backend, usa a lista padrão
  const baseList = (products && products.length > 0) ? products : [...FUEL_PRODUCTS];

  // tira duplicados
  // FIX: Added explicit type `string[]` to `uniqueProducts` to prevent it from being inferred as `unknown[]`, resolving subsequent type errors.
  const uniqueProducts: string[] = Array.from(new Set(baseList));

  // mantém a ordem GC > GA > E > S10 > S500 e manda o resto pro fim
  const customSort = (a: string, b: string) => {
    const order = FUEL_PRODUCTS as readonly string[];
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);

    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  };

  const sortedProducts = uniqueProducts.sort(customSort);

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40">
      <ul className="space-y-2">
        {sortedProducts.map((product) => {
          const isActive = activeProduct === product;
          const abbr = PRODUCT_ABBREVIATIONS[product] ?? product.charAt(0);

          return (
            <li key={product} title={product}>
              <button
                type="button"
                onClick={() => onProductSelect(product)}
                className={`
                  w-14 h-12 flex items-center justify-center cursor-pointer shadow-lg
                  font-semibold text-sm rounded-r-full border
                  transition-all duration-200
                  hover:scale-110 hover:z-50
                  focus:outline-none focus:scale-110 focus:z-50
                  ${
                    isActive
                      ? 'bg-green-50 text-green-700 border-green-400'
                      : 'bg-white text-gray-600 hover:text-green-700 border-gray-300'
                  }
                `}
              >
                {abbr}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default RankingSidebar;