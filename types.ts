import type { ChangeEvent, RefObject } from 'react';
// FIX: Import `FuelProduct` to use within this module and re-export it for other modules.
import type { FuelProduct } from './constants/fuels';
export type { FuelProduct };

// A constante BRANDS foi removida para permitir que as bandeiras sejam carregadas dinamicamente.
// export const BRANDS = ['Shell', 'Ipiranga', 'Vibra', 'Branca/Indefinida'] as const;
// O tipo BrandName agora é uma string para suportar nomes de bandeira dinâmicos.
export type BrandName = string;

export type ComparisonMode = 'min' | 'avg';

export interface DistributorStyle {
  background: string;
  border: string;
  shadowColor?: string;
}

export interface DistributorColors {
  [key: string]: DistributorStyle;
}

export interface ProductPrices {
  [distributor: string]: number[];
}

export interface ProductData {
  produto: string;
  prices: ProductPrices;
}

export interface MinPriceInfo {
  minPrice: number;
  distributors: string[];
}

export interface CustomerPrices {
    [product: string]: number;
}

export interface ShareActions {
  isShareOpen: boolean;
  isSharing: boolean;
  toggleShare: () => void;
  handleDownloadJPG: () => void;
  handleDownloadPDF: () => void;
  handleWebShare: () => void;
}

export interface DistributorConfig {
  Name: string;
}

export interface FuelPriceRecord {
  fuel_type: string;
  Distribuidora: string;
  price: number | null;
  Base: string;
  Responsavel: string;
  data: string;
}

export interface DailyPriceSummary {
  created_at: string;
  dia: string;
  fuel_type: string;
  // FIX: Update property names to match Supabase query aliases (e.g., avg_price).
  avg_price: number;
  min_price: number;
  max_price: number;
}

export interface UserHistoryChartRecord {
    price_date: string;
    brand_name: string;
    product_name: string;
    price: number | null;
}

export interface CustomerQuoteTableProps {
  brands: BrandName[];
  allBrandPrices: { [key in BrandName]?: { [product: string]: number } };
  allBrandPriceInputs: { [key in BrandName]?: { [product:string]: string } };
  handleBrandPriceChange: (brand: BrandName, product: string, value: string) => void;
  marketMinPrices: { [product: string]: MinPriceInfo };
  averagePrices: { [product: string]: number };
  quoteTableRef: RefObject<HTMLDivElement> | null;
  distributorColors: DistributorColors;
  distributorImages: { [key: string]: string | null };
  products: FuelProduct[];
  selectedDistributors: Set<string>;
  onDistributorPillClick?: (distributor: string) => void;
  isSharePreview?: boolean;
  isComparisonMode: boolean;
  comparisonMode: ComparisonMode;
  activeBrand: BrandName;
  onActiveBrandChange: (brand: BrandName) => void;
  onOpenShareModal: () => void;
  isSharing: boolean;
  onSaveQuote: () => void;
  isSaving: boolean;
  isSaveSuccess: boolean;
}

export interface MarketDataTableProps {
    marketData: ProductData[];
    marketMinPrices: { [product: string]: MinPriceInfo };
    distributors: string[];
    distributorColors: DistributorColors;
    selectedDistributors: Set<string>;
    highlightedDistributor: string | null;
}

export interface DistributorSelectionPanelProps {
  allDistributors: string[];
  selectedDistributors: Set<string>;
  onSelectionChange: (distributor: string, isSelected: boolean) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  distributorColors: DistributorColors;
}

export type BandeiraBasePair = {
    base: string;
    bandeira: string;
};

export interface UserProfile {
    id: string;
    nome: string;
    email: string;
    cnpj: string | null;
    telefone: string | null;
    credencial: string;
    profile_complete: boolean; // Derived in frontend
    onboarding_complete: boolean; // Derived in frontend
    preferencias: BandeiraBasePair[];
    atualizado_em?: string;
}

export interface ChartSeries {
    key: string;
    name: string;
    color: string;
    type: 'market' | 'distributor';
    isVisible: boolean;
}

// --- Types for History Page Modularization ---
export interface HistoryRow {
    period: string; 
    distribuidora: string | null;
    fuel_type: string; 
    distribuidora_avg_price: number | null;
    market_min: number;
    market_avg: number;
    market_max: number;
}

export interface PriceEvolution {
    value: number | null;
    delta: number | null; // Variação % em relação ao período anterior
}

export interface ProcessedRow {
    periodDisplay: string;
    periodKey: string;
    market: {
        min: PriceEvolution;
        avg: PriceEvolution;
        max: PriceEvolution;
    };
    distributorPrices: {
        name: string;
        price: PriceEvolution;
    }[];
}

export interface HistoryFilterPanelProps {
    selectedFuelType: string;
    onFuelTypeChange: (value: string) => void;
    availableBases: string[];
    selectedBase: string;
    onBaseChange: (value: string) => void;
    pendingStartDate: string;
    onPendingStartDateChange: (value: string) => void;
    pendingEndDate: string;
    onPendingEndDateChange: (value: string) => void;
    onApplyDates: () => void;
    loading: boolean;
}

export interface HistoryPriceChartProps {
    chartData: { labels: string[], datasets: any[] };
    seriesConfig: ChartSeries[];
}

export interface HistoryDataTableProps {
    processedData: ProcessedRow[];
    visibleColumns: string[];
    getDistributorColor: (name: string) => DistributorStyle;
    selectedTableDistributors: Set<string>;
}

// --- Types for Admin Page ---
export interface DistributorDBStyle {
  name: string;
  bg_color: string;
  text_color: string;
  shadow_style: string | null;
}