
import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { UserProfile, ChartSeries, HistoryRow, DistributorStyle, ProductPrices, DistributorDBStyle } from '../types';
import { calculateIQRAverage, calculateCustomMaxPrice } from '../utils/dataHelpers';
import { processHistoryData } from '../utils/historyDataProcessor';
import { FUEL_PRODUCTS } from '../constants/fuels';
import { getDistributorStyle, getOriginalBrandName } from '../utils/styleManager';
import { useContracts } from './useContracts'; // Importação do hook de contratos

type MarketHistoryRecord = { data: string; price: number | null; Distribuidora: string | null };
type UserPriceRecord = { price_date: string; brand_name: string; price: number };

export const useHistoryData = (
    userProfile: UserProfile,
    availableBases: string[],
    selectedBase: string,
    selectedFuelType: string,
    setSelectedFuelType: (fuel: string) => void,
    startDate: string,
    endDate: string
) => {
    // States
    const [historyData, setHistoryData] = useState<HistoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [distributorImages, setDistributorImages] = useState<{ [key: string]: string | null }>({});
    const [dbStyles, setDbStyles] = useState<Map<string, DistributorDBStyle>>(new Map());
    const [seriesConfig, setSeriesConfig] = useState<ChartSeries[]>([]);
    const [availableFuelsForBase, setAvailableFuelsForBase] = useState<string[]>([]);

    // Carrega contratos da base selecionada para calcular desvios corretamente na tabela
    // A lógica de prioridade (* vs base) é resolvida dentro do hook useContracts
    const { contracts } = useContracts(userProfile?.id, selectedBase);

    // Fetch available fuels for the selected base
    useEffect(() => {
        const controller = new AbortController();
        const fetchAvailableFuels = async () => {
            if (!selectedBase) {
                setAvailableFuelsForBase([]);
                return;
            }
            const { data, error } = await supabase
                .from('pplus_historico_precos_diarios')
                .select('fuel_type')
                .eq('Base', selectedBase)
                .abortSignal(controller.signal)
                .returns<{ fuel_type: string }[]>();

            if (controller.signal.aborted) return;

            if (error) {
                setError(`Não foi possível carregar os combustíveis: ${error.message}`);
                setAvailableFuelsForBase([]);
            } else if (data) {
                const uniqueFuels = [...new Set((data as { fuel_type: string }[]).map(item => item.fuel_type))].sort((a, b) => {
                    const indexA = FUEL_PRODUCTS.indexOf(a as any);
                    const indexB = FUEL_PRODUCTS.indexOf(b as any);
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return a.localeCompare(b);
                });
                setAvailableFuelsForBase(uniqueFuels);
                if (uniqueFuels.length > 0 && !uniqueFuels.includes(selectedFuelType)) {
                    setSelectedFuelType(uniqueFuels[0]);
                }
            }
        };
        fetchAvailableFuels();
        return () => controller.abort();
    }, [selectedBase, selectedFuelType, setSelectedFuelType]);

    // Main data fetch function
    const fetchHistoryData = useCallback(async (signal: AbortSignal) => {
        if (!selectedBase || !selectedFuelType || !userProfile) {
            setError(null); 
            setLoading(false);
            return;
        }
    
        setLoading(true);
        setError(null);
        setHistoryData([]);
    
        try {
            const rawMarketPromise = supabase
                .from('pplus_historico_precos_diarios')
                .select('data, price, Distribuidora')
                .eq('Base', selectedBase)
                .eq('fuel_type', selectedFuelType)
                .gte('data', startDate)
                .lte('data', endDate)
                .abortSignal(signal)
                .returns<MarketHistoryRecord[]>();
    
            const userPricesPromise = supabase
                .from('pplus_user_daily_prices')
                .select('price_date, brand_name, price')
                .eq('user_id', userProfile.id)
                .eq('base_name', selectedBase)
                .eq('product_name', selectedFuelType)
                .gte('price_date', startDate)
                .lte('price_date', endDate)
                .abortSignal(signal)
                .returns<UserPriceRecord[]>();
    
            const [rawMarketResult, userPricesResult] = await Promise.all([rawMarketPromise, userPricesPromise]);

            if (signal.aborted) return;
    
            const { data: rawMarketData, error: marketError } = rawMarketResult;
            const { data: userPriceData, error: userPriceError } = userPricesResult;
    
            if (marketError) throw new Error(`Erro ao buscar dados de mercado: ${marketError.message}`);
            if (userPriceError) throw new Error(`Erro ao buscar cotações do usuário: ${userPriceError.message}`);
            
            const groupedMarketPrices: { [period: string]: ProductPrices } = {};
            (rawMarketData ?? []).forEach(row => {
                if(row.price === null || !row.Distribuidora) return;
                const period = row.data;
                if (!groupedMarketPrices[period]) groupedMarketPrices[period] = {};
                const dayPrices = groupedMarketPrices[period];
                if (!dayPrices[row.Distribuidora]) dayPrices[row.Distribuidora] = [];
                dayPrices[row.Distribuidora].push(row.price);
            });

            const marketHistoryRows: HistoryRow[] = [];
            for (const period in groupedMarketPrices) {
                const pricesByDistributor = groupedMarketPrices[period];
                
                // LÓGICA CORRIGIDA PARA IGUALAR AO DASHBOARD:
                // 1. Identifica quais distribuidoras têm preço neste dia
                const activeDistributors = Object.keys(pricesByDistributor);
                let pricesForAvg: number[] = [];
                let allPricesForMinMax: number[] = [];

                if (activeDistributors.length === 0) continue;

                // Coleta todos os preços para cálculo de min/max absoluto
                allPricesForMinMax = Object.values(pricesByDistributor).flat().filter((p): p is number => typeof p === 'number' && isFinite(p));

                if (activeDistributors.length === 1) {
                    // Se só tem 1 distribuidora no dia, a média é a média interna dela (variação da própria marca)
                    pricesForAvg = pricesByDistributor[activeDistributors[0]].filter((p): p is number => typeof p === 'number' && isFinite(p));
                } else {
                    // Se tem várias distribuidoras, pega o MELHOR PREÇO de cada uma para compor a média competitiva
                    pricesForAvg = activeDistributors.map(d => {
                        const pList = pricesByDistributor[d];
                        return Math.min(...pList.filter((p): p is number => typeof p === 'number' && isFinite(p)));
                    });
                }
                
                if (allPricesForMinMax.length > 0) {
                    marketHistoryRows.push({
                        period,
                        distribuidora: null,
                        fuel_type: selectedFuelType,
                        distribuidora_avg_price: null,
                        market_min: Math.min(...allPricesForMinMax),
                        market_avg: calculateIQRAverage(pricesForAvg), // Usa a lógica competitiva corrigida
                        market_max: calculateCustomMaxPrice(pricesByDistributor),
                    });
                }
            }
            
            const groupedUserPrices: { [period: string]: { [brand: string]: number[] } } = {};
            (userPriceData ?? []).forEach(row => {
                const period = row.price_date;
                if (!groupedUserPrices[period]) groupedUserPrices[period] = {};
                if (!groupedUserPrices[period][row.brand_name]) groupedUserPrices[period][row.brand_name] = [];
                groupedUserPrices[period][row.brand_name].push(row.price);
            });
    
            const userHistoryRows: HistoryRow[] = [];
            for (const period in groupedUserPrices) {
                for (const brand in groupedUserPrices[period]) {
                    const prices = groupedUserPrices[period][brand];
                    if (prices.length > 0) {
                        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
                        userHistoryRows.push({
                            period,
                            distribuidora: brand,
                            fuel_type: selectedFuelType,
                            distribuidora_avg_price: avgPrice,
                            market_min: 0, market_avg: 0, market_max: 0,
                        });
                    }
                }
            }
            
            const combinedData = [...marketHistoryRows, ...userHistoryRows];
    
            if (!combinedData || combinedData.length === 0) {
                 setError(`Nenhum dado de preço encontrado para o combustível "${selectedFuelType}" na base selecionada (${selectedBase}).`);
            } else {
                 setError(null); 
            }
    
            setHistoryData(combinedData || []);
    
        } catch (err: any) {
            if (!signal.aborted) {
                const errorMessage = err.message ?? JSON.stringify(err) ?? 'Ocorreu um erro desconhecido.';
                setError(`Ocorreu um erro ao buscar o histórico: ${errorMessage}`);
            }
        } finally {
            if (!signal.aborted) {
                setLoading(false);
            }
        }
    }, [selectedBase, selectedFuelType, userProfile, startDate, endDate]);

    // Initial data fetch (styles, images)
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchInitialData = async () => {
            setLoading(true);

            if (availableBases.length === 0) {
                setError("Nenhuma base de atuação foi configurada ou encontrada.");
                setLoading(false);
                return;
            }

            const distributorsPromise = supabase.from('Distribuidoras').select('Name, imagem').abortSignal(signal).returns<{ Name: string, imagem: string | null }[]>();
            const stylesPromise = supabase.from('pplus_distributor_styles').select('name, bg_color, text_color, shadow_style').abortSignal(signal).returns<DistributorDBStyle[]>();
            
            const [distributorsResult, stylesResult] = await Promise.all([distributorsPromise, stylesPromise]);
            
            if (signal.aborted) return;

            const { data: distributorsData, error: distError } = distributorsResult;
            const { data: stylesData, error: stylesError } = stylesResult;

            if (distError) {
                setError(prev => `${prev ? prev + ' ' : ''}Falha ao carregar logos: ${distError.message}`);
            } else if (distributorsData) {
                const imageMap = distributorsData.reduce((acc, dist) => {
                    acc[dist.Name] = dist.imagem;
                    return acc;
                }, {} as { [key: string]: string | null });
                setDistributorImages(imageMap);
            }
            
            if (stylesError) {
                console.error("Falha ao carregar estilos:", stylesError.message);
            } else if (stylesData) {
                const stylesMap = new Map<string, DistributorDBStyle>();
                (stylesData as DistributorDBStyle[]).forEach(s => stylesMap.set(s.name, s));
                setDbStyles(stylesMap);
            }
        };
        fetchInitialData();
        return () => controller.abort();
    }, [userProfile, availableBases]);

    // Trigger main data fetch when filters change
    useEffect(() => {
        const controller = new AbortController();
        if (selectedBase && selectedFuelType) {
            fetchHistoryData(controller.signal);
        }
        return () => controller.abort();
    }, [selectedBase, selectedFuelType, fetchHistoryData]);

    // Memos for derived data
    const displayNames = useMemo(() => {
        if (!userProfile?.preferencias || !selectedBase) return [];
        return userProfile.preferencias
            .filter(p => p.base === selectedBase)
            .map(p => p.bandeira)
            .sort();
    }, [userProfile?.preferencias, selectedBase]);

    const getDistributorColor = useCallback((name: string): DistributorStyle => {
        return getDistributorStyle(name, dbStyles);
    }, [dbStyles]);

    const chartAndSeriesData = useMemo(() => {
        if (!historyData || historyData.length === 0) {
            return { chartData: { labels: [], datasets: [] }, seriesConfig: [] };
        }
    
        // ... (entire chartAndSeriesData logic from History.tsx) ...
        const dataByPeriod = new Map<string, any>();
        const seriesKeys = new Set<string>();
    
        seriesKeys.add('market_min');
        seriesKeys.add('market_avg');
        seriesKeys.add('market_max');
    
        historyData.forEach(row => {
            const periodKey = row.period;
            if (!dataByPeriod.has(periodKey)) {
                dataByPeriod.set(periodKey, { period: periodKey });
            }
            const periodData = dataByPeriod.get(periodKey);
    
            if (row.distribuidora === null) {
                periodData.market_min = row.market_min;
                periodData.market_avg = row.market_avg;
                periodData.market_max = row.market_max;
            } else {
                const distributorKey = row.distribuidora;
                periodData[distributorKey] = row.distribuidora_avg_price;
                seriesKeys.add(distributorKey);
            }
        });
    
        const sortedPeriodKeys = Array.from(dataByPeriod.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        const labels = sortedPeriodKeys;
        const dataPoints = sortedPeriodKeys.map(key => dataByPeriod.get(key));
    
        const marketColors: { [key: string]: string } = {
            market_min: 'rgba(34, 197, 94, 1)',
            market_avg: 'rgba(59, 130, 246, 1)',
            market_max: 'rgba(239, 68, 68, 1)'
        };
    
        const marketNames: { [key: string]: string } = {
            market_min: 'Mínimo do Mercado',
            market_avg: 'Variação do Mercado',
            market_max: 'Máximo do Mercado'
        };
    
        const getSeriesColor = (key: string): string => {
            if (marketColors[key]) return marketColors[key];
            const colorStyle = getDistributorColor(key);
            if (colorStyle) {
                return colorStyle.background.replace(/, ?\d?\.?\d+\)$/, ', 1)');
            }
            const hash = key.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
            return `hsl(${hash % 360}, 70%, 50%)`;
        };
    
        const newSeriesConfig = Array.from(seriesKeys).map((key): ChartSeries => {
            const isMarket = key.startsWith('market_');
            const displayName = isMarket ? marketNames[key] : (displayNames.find(d => d === key) || key);
            return {
                key: key,
                name: displayName,
                color: getSeriesColor(key),
                type: isMarket ? 'market' : 'distributor',
                isVisible: true
            };
        });
    
        const datasets = newSeriesConfig.map(series => {
            const isDistributor = series.type === 'distributor';
            const datasetConfig: any = {
                label: series.name,
                data: dataPoints.map(p => p[series.key] ?? null),
                borderColor: series.color,
                backgroundColor: series.color.replace('1)', '0.2)'),
                tension: 0.2,
                borderWidth: 2.5,
                spanGaps: true,
                pointRadius: 3,
                pointHoverRadius: 5,
            };
            if (isDistributor) {
                datasetConfig.borderDash = [5, 5];
                datasetConfig.pointStyle = 'crossRot';
                datasetConfig.pointRadius = 5;
                datasetConfig.pointHoverRadius = 7;
            }
            return datasetConfig;
        });
    
        return { chartData: { labels, datasets }, seriesConfig: newSeriesConfig };
    }, [historyData, displayNames, getDistributorColor]);

    const filteredHistoryDataForTable = useMemo(() => {
        if (!historyData) return [];
        const start = new Date(startDate + 'T12:00:00Z').getTime();
        const end = new Date(endDate + 'T12:00:00Z').getTime();

        return historyData.filter(row => {
            const rowDate = new Date(row.period + 'T12:00:00Z').getTime();
            return rowDate >= start && rowDate <= end;
        });
    }, [historyData, startDate, endDate]);

    const processedTableData = useMemo(() => {
        return processHistoryData(filteredHistoryDataForTable, displayNames);
    }, [filteredHistoryDataForTable, displayNames]);
    
    // Set series config when chart data changes with localStorage support
    useEffect(() => {
        setSeriesConfig(prevConfig => {
            const newConfig = chartAndSeriesData.seriesConfig;
            if (!newConfig || newConfig.length === 0) return prevConfig;

            const prevMap = new Map(prevConfig.map(s => [s.key, s.isVisible]));
            
            let savedVisibility: Record<string, boolean> = {};
            try {
                const raw = localStorage.getItem('precin_history_series_visibility');
                if (raw) savedVisibility = JSON.parse(raw);
            } catch (e) {
                console.warn("Erro ao ler visibilidade do gráfico de histórico:", e);
            }

            return newConfig.map(series => {
                const fromSaved = savedVisibility[series.key];
                const fromPrev = prevMap.get(series.key);
                
                let isVisible = series.isVisible;
                if (typeof fromSaved === 'boolean') isVisible = fromSaved;
                else if (typeof fromPrev === 'boolean') isVisible = fromPrev;

                return { ...series, isVisible };
            });
        });
    }, [chartAndSeriesData.seriesConfig]);

    // Save series config on change
    useEffect(() => {
        if (seriesConfig.length === 0) return;
        const visibility: Record<string, boolean> = {};
        seriesConfig.forEach(s => visibility[s.key] = s.isVisible);
        try {
            localStorage.setItem('precin_history_series_visibility', JSON.stringify(visibility));
        } catch (e) {
            console.warn("Erro ao salvar visibilidade do gráfico de histórico:", e);
        }
    }, [seriesConfig]);

    return {
        contracts, // Retorna os contratos efetivos
        loading,
        error,
        distributorImages,
        seriesConfig,
        availableFuelsForBase,
        displayNames,
        chartAndSeriesData,
        processedTableData,
        getDistributorColor,
        setSeriesConfig
    };
};
