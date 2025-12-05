// constants/fuels.ts
export const FUEL_PRODUCTS = [
  'Gasolina Comum',
  'Gasolina Aditivada',
  'Etanol',
  'Diesel S10',
  'Diesel S500',
] as const;

export type FuelProduct = typeof FUEL_PRODUCTS[number];
