export const FUEL_TO_CODE: Record<string, string> = {
  'Gasolina Comum': 'GC',
  'Gasolina Aditivada': 'GA',
  'Etanol': 'E',
  'Diesel S10': 'S10',
  'Diesel S500': 'S500',
};

export const CODE_TO_FUEL: Record<string, string> = {
  'GC': 'Gasolina Comum',
  'GA': 'Gasolina Aditivada',
  'E': 'Etanol',
  'S10': 'Diesel S10',
  'S500': 'Diesel S500',
};

export const mapFuelToCode = (fuel: string): string => {
  if (!fuel) return '';
  const trimmed = fuel.trim();
  return FUEL_TO_CODE[trimmed] || trimmed.toUpperCase();
};

export const mapCodeToFuel = (code: string): string => {
  if (!code) return '';
  const normalized = code.trim().toUpperCase();
  if (['E', 'ET', 'ETA'].includes(normalized)) return 'Etanol';
  if (['GC', 'GAS'].includes(normalized)) return 'Gasolina Comum';
  if (['GA', 'GADA'].includes(normalized)) return 'Gasolina Aditivada';
  if (['S10', 'D10'].includes(normalized)) return 'Diesel S10';
  if (['S500', 'D500'].includes(normalized)) return 'Diesel S500';
  return CODE_TO_FUEL[normalized] || code;
};