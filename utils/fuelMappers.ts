
import { FUEL_PRODUCTS } from '../constants/fuels';

// Mapeamento: UI (Longo) -> Banco (Curto)
export const FUEL_TO_CODE: Record<string, string> = {
    'Gasolina Comum': 'GC',
    'Gasolina Aditivada': 'GA',
    'Etanol': 'E',
    'Diesel S10': 'S10',
    'Diesel S500': 'S500',
};

// Mapeamento Inverso: Banco (Curto) -> UI (Longo)
export const CODE_TO_FUEL: Record<string, string> = Object.entries(FUEL_TO_CODE).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
}, {} as Record<string, string>);

/**
 * Converte o nome do produto da UI para o código do banco.
 * Se não houver mapeamento, retorna o próprio valor (fallback).
 */
export const mapFuelToCode = (fuelName: string): string => {
    return FUEL_TO_CODE[fuelName?.trim()] || fuelName;
};

/**
 * Converte o código do banco para o nome do produto da UI.
 * Se não houver mapeamento, retorna o próprio valor.
 */
export const mapCodeToFuel = (code: string): string => {
    return CODE_TO_FUEL[code] || code;
};
