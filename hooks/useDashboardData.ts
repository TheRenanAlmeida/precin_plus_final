import { useState, useMemo, useCallback, useEffect } from 'react';
import {
    UserProfile,
    ProductData,
    DistributorColors,
    BrandName,
    ComparisonMode,
    ChartSeries,
    MinPriceInfo,
    DistributorDBStyle,
    DistributorStyle,
    FuelPriceRecord,
    UserHistoryChartRecord,
    ProductPrices,
} from '../types';
import { FuelProduct, FUEL_PRODUCTS } from '../constants/fuels';

import { fetchDistributorsAndStyles } from '../services/distributors.service';
import { fetchMarketDataForDate } from '../services/market.service';
import { fetchUserDailyPricesForDate, saveUserDailyPrices } from '../services/prices.service';
import { fetchChartDataForDashboard } from '../services/charts.service';
import {
    calculateIQRAverage,
    findMinPriceInfo,
    calculateProductAveragesFromRecords,
    calculateCustomMaxPrice,
} from '../utils/dataHelpers';
import { getDistributorStyle, defaultDistributorStyle, getOriginalBrandName } from '../utils/styleManager';

// Local types from DashboardPage
type ChartDataset = {
    label: string;
    data: (number | null)[];
    [key: string]: any;
};
type ChartData = {
    labels: string[];
    datasets: ChartDataset[];
};
type FinalChartData = Record<string, ChartData>;
type UserPricesByFuelAndDate = Record<string, Record<string, Record<string, number | null>>>;

export const useDashboardData = (
    userProfile: UserProfile,
    availableBases: string[],
    selectedBase: string,
) => {
    // State declarations
    const [allBrandPrices, setAllBrandPrices] = useState<{ [key in BrandName]?: { [product: string]: number } }>({});
    const [allBrandPriceInputs, setAllBrandPriceInputs] = useState<{ [key in BrandName]?: { [product: string]: string } }>({});
    const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('min');
    
    const [marketData, setMarketData] = useState<ProductData[]>([]);
    const [unfilteredAveragePrices, setUnfilteredAveragePrices] = useState<{ [product: string]: number }>({});
    const [distributors, setDistributors] = useState<string[]>([]);
    // FIX: A lista de produtos agora é estática e não depende dos dados de mercado do dia.
    // Isso garante que o RankingSidebar e a tabela de cotações estejam sempre visíveis e funcionais.
    const products = [...FUEL_PRODUCTS];
    const [distributorColors, setDistributorColors] = useState<DistributorColors>({ DEFAULT: defaultDistributorStyle });
    const [distributorImages, setDistributorImages] = useState<{ [key: string]: string | null }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDistributors, setSelectedDistributors] = useState<Set<string>>(new Set());
    const [rawChartData, setRawChartData] = useState<FuelPriceRecord[]>([]);
    const [userHistoryChartData, setUserHistoryChartData] = useState<UserHistoryChartRecord[]>([]);
    
    const [isComparisonMode, setIsComparisonMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaveSuccess, setIsSaveSuccess] = useState(false);
    
    const [dashboardSeriesConfig, setDashboardSeriesConfig] = useState<ChartSeries[]>([]);

    const [refDate, setRefDate] = useState(new Date());
    
    const userBandeiras = useMemo(() => {
        if (!userProfile.preferencias || !selectedBase) return [];
        const brandsForBase = userProfile.preferencias
            .filter(p => p.base === selectedBase)
            .map(p => p.bandeira);
        return Array.from(new Set(brandsForBase)).sort();
    }, [userProfile.preferencias, selectedBase]);
    
    const [activeBrand, setActiveBrand] = useState<BrandName>('');

    useEffect(() => {
        if (userBandeiras.length > 0 && !userBandeiras.includes(activeBrand)) {
            setActiveBrand(userBandeiras[0]);
        } else if (userBandeiras.length === 0) {
            setActiveBrand('');
        }
    }, [userBandeiras, activeBrand]);

    // Data Fetching
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        async function fetchPageData() {
            setIsLoading(true);
            setError(null);
            
            try {
                const marketPromise = fetchMarketDataForDate(selectedBase, refDate, signal);
                const userPricesPromise = fetchUserDailyPricesForDate(userProfile.id, refDate, signal);
                const distributorsPromise = fetchDistributorsAndStyles(signal);

                const [marketResult, userPricesResult, distributorsResult] = await Promise.all([marketPromise, userPricesPromise, distributorsPromise]);

                if (signal.aborted) return;
                
                const { data: rawData, error: pricesError } = marketResult;
                const { prices: loadedPrices, inputs: loadedInputs } = userPricesResult;
                const { distributorsData, stylesData, distributorsError, stylesError } = distributorsResult;

                if (stylesError) console.error("Falha ao carregar estilos do banco de dados:", stylesError.message);
                if (distributorsError) setError(`Falha ao carregar logos: ${distributorsError.message}`);
                if (pricesError) {
                throw new Error(`Ocorreu um erro ao buscar os dados: ${pricesError.message}.`);
                }

                if (distributorsData) {
                    const imageMap = distributorsData.reduce((acc, dist) => {
                        acc[dist.Name] = dist.imagem;
                        return acc;
                    }, {} as { [key: string]: string | null });
                    setDistributorImages(imageMap);
                }
                
                setAllBrandPrices(loadedPrices);
                setAllBrandPriceInputs(loadedInputs);
                
                const typedRawData = rawData || [];
                const trueMarketAverages = calculateProductAveragesFromRecords(typedRawData as any);
                setUnfilteredAveragePrices(trueMarketAverages);

                const productMap = new Map<string, ProductPrices>();
                const distributorSet = new Set<string>();

                typedRawData.forEach(record => {
                    if (!record.fuel_type || !record.Distribuidora || record.price === null) return;
                    if (!productMap.has(record.fuel_type)) productMap.set(record.fuel_type, {});
                    const productPrices = productMap.get(record.fuel_type)!;
                    if (!productPrices[record.Distribuidora]) productPrices[record.Distribuidora] = [];
                    productPrices[record.Distribuidora].push(record.price);
                    distributorSet.add(record.Distribuidora);
                });

                const customSort = (a: string, b: string) => {
                const indexA = FUEL_PRODUCTS.indexOf(a as FuelProduct);
                const indexB = FUEL_PRODUCTS.indexOf(b as FuelProduct);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1; if (indexB !== -1) return 1;
                return a.localeCompare(b);
                };
                
                const newDistributors = Array.from(distributorSet).sort((a,b) => a.localeCompare(b));
                const sortedMarketData = Array.from(productMap.entries()).map(([produto, prices]) => ({ produto, prices })).sort((a, b) => customSort(a.produto, b.produto));

                const allNamesToColor = Array.from(new Set([...newDistributors, ...userBandeiras]));
                const dbStylesMap = new Map<string, DistributorDBStyle>();
                if (stylesData) {
                    stylesData.forEach(style => dbStylesMap.set(style.name, style));
                }
                
                const fetchedColors = allNamesToColor.reduce((acc: DistributorColors, name: string) => {
                    acc[name] = getDistributorStyle(name, dbStylesMap);
                    return acc;
                }, { DEFAULT: { ...defaultDistributorStyle } });
                
                setMarketData(sortedMarketData);
                setDistributors(newDistributors);
                setDistributorColors(fetchedColors);
                setSelectedDistributors(new Set(newDistributors));
            
            } catch (err: any) {
                if (err.name !== 'AbortError' && !signal.aborted) {
                    setError(err.message || "Um erro inesperado ocorreu.");
                }
            } finally {
                if (!signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        if (selectedBase) {
            fetchPageData();
        } else if (availableBases.length === 0 && !userProfile.credencial) {
            setError("Nenhuma base de atuação configurada. Por favor, ajuste suas preferências.");
            setIsLoading(false);
        }

        return () => {
            controller.abort();
        };
    }, [refDate, selectedBase, userBandeiras, userProfile.id, userProfile.credencial, availableBases]);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        async function fetchChartData() {
            if (!selectedBase) {
                setRawChartData([]);
                return;
            }
            
            const { rawChartData, userHistoryChartData, error: chartError } = await fetchChartDataForDashboard(
                selectedBase, refDate, selectedDistributors, userProfile.id, signal
            );
            
            if (signal.aborted) return;
            
            if (chartError) {
                setError(prev => `${prev || ''} ${chartError}`);
            }
            setRawChartData(rawChartData || []);
            setUserHistoryChartData(userHistoryChartData || []);
        }

        fetchChartData();

        return () => {
            controller.abort();
        };
    }, [refDate, selectedBase, selectedDistributors, userProfile.id]);

    // Derived State
    const marketMinPrices = useMemo(() => {
        return marketData.reduce((acc, { produto, prices }) => {
            const filteredPrices: ProductPrices = {};
            for (const distributor of selectedDistributors) {
                if (prices[distributor] !== undefined) filteredPrices[distributor] = prices[distributor];
            }
            acc[produto] = findMinPriceInfo(filteredPrices);
            return acc;
        }, {} as { [product: string]: MinPriceInfo });
    }, [marketData, selectedDistributors]);
    
    const dynamicAveragePrices = useMemo(() => {
        if (selectedDistributors.size > 0 && selectedDistributors.size === distributors.length) {
            return unfilteredAveragePrices;
        }
        return marketData.reduce((acc, { produto, prices }) => {
            const priceList = Array.from(selectedDistributors)
                .flatMap(d => prices[d] || [])
                .filter(p => p !== undefined && p !== null) as number[];
            acc[produto] = calculateIQRAverage(priceList);
            return acc;
        }, {} as {[product: string]: number});
    }, [marketData, selectedDistributors, distributors.length, unfilteredAveragePrices]);

    const chartAndSeriesData = useMemo(() => {
        const dataByFuelTypeAndDate: Record<string, Record<string, ProductPrices>> = {};

        rawChartData.forEach((record) => {
            const { fuel_type, data, Distribuidora, price } = record;
            if (price && price > 0 && typeof fuel_type === 'string' && typeof data === 'string' && typeof Distribuidora === 'string') {
                if (!dataByFuelTypeAndDate[fuel_type]) dataByFuelTypeAndDate[fuel_type] = {};
                const fuelData = dataByFuelTypeAndDate[fuel_type];
                if (!fuelData[data]) fuelData[data] = {};
                const dateData = fuelData[data];
                if (!dateData[Distribuidora]) dateData[Distribuidora] = [];
                dateData[Distribuidora].push(price);
            }
        });

        const userPricesByFuelAndDate: UserPricesByFuelAndDate = {};
        userHistoryChartData.forEach((record) => {
            const { product_name, price_date, brand_name, price } = record;
            if (typeof product_name === 'string' && typeof price_date === 'string' && typeof brand_name === 'string') {
                if (!userPricesByFuelAndDate[product_name]) userPricesByFuelAndDate[product_name] = {};
                const productData = userPricesByFuelAndDate[product_name];
                if (!productData[price_date]) productData[price_date] = {};
                const dateData = productData[price_date];
                dateData[brand_name] = price;
            }
        });

        const finalChartData: FinalChartData = {};
        const allFuelTypesInWindow = Object.keys(dataByFuelTypeAndDate);

        if (allFuelTypesInWindow.length === 0) return { chartData: {}, seriesConfig: [] };

        // FIX: Corrigido para remover filtro redundante e garantir que `sort` opere em string[], evitando erros de tipo.
        // FIX: Add a type guard to ensure the array passed to Set contains only strings, resolving the "unknown[] is not assignable to string[]" error.
        const labels: string[] = [...new Set(rawChartData.map((d) => d.data).filter((d): d is string => typeof d === 'string'))].sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());

        if (labels.length === 0) return { chartData: {}, seriesConfig: [] };

        for (const fuelType of allFuelTypesInWindow) {
            const dailyStats = labels.map(dateStr => {
                const pricesByDistributor = dataByFuelTypeAndDate[fuelType]?.[dateStr] || {};
                const allPricesFlat = Object.values(pricesByDistributor).flat().filter((p): p is number => typeof p === 'number' && isFinite(p));

                if (allPricesFlat.length === 0) return { min: null, avg: null, max: null };
                const min = Math.min(...allPricesFlat);
                const max = calculateCustomMaxPrice(pricesByDistributor);
                const avg = calculateIQRAverage(allPricesFlat);
                return { min, avg: avg > 0 ? avg : null, max };
            });

            const datasets: ChartDataset[] = [
                {
                    label: 'Preço Mínimo',
                    data: dailyStats.map(d => d.min),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.2,
                    borderWidth: 2,
                    spanGaps: true,
                },
                {
                    label: 'Preço Médio (IQR)',
                    data: dailyStats.map(d => d.avg),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.2,
                    borderWidth: 2,
                    spanGaps: true,
                },
                {
                    label: 'Preço Máximo',
                    data: dailyStats.map(d => d.max),
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.2,
                    borderWidth: 2,
                    spanGaps: true,
                },
            ];

            userBandeiras.forEach(brand => {
                const brandColorStyle = distributorColors[brand] || distributorColors.DEFAULT;
                const borderColor = brandColorStyle.background.replace(/, ?\d?\.?\d+\)$/, ', 1)');
                datasets.push({
                    label: brand,
                    data: labels.map(date => userPricesByFuelAndDate[fuelType]?.[date]?.[brand] ?? null),
                    borderColor: borderColor,
                    backgroundColor: borderColor.replace('1)', '0.2)'),
                    tension: 0.2,
                    borderWidth: 2.5,
                    borderDash: [5, 5],
                    spanGaps: true,
                });
            });

            finalChartData[fuelType] = { labels, datasets };
        }
        
        const productOrder = FUEL_PRODUCTS;
        const sortedKeys = Object.keys(finalChartData).sort((a, b) => {
            const indexA = productOrder.indexOf(a as FuelProduct), indexB = productOrder.indexOf(b as FuelProduct);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1; if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });
        
        const sortedFinalChartData: FinalChartData = {};
        sortedKeys.forEach(key => {
            sortedFinalChartData[key] = finalChartData[key];
        });

        const newSeriesConfig: ChartSeries[] = [
            { key: 'Preço Mínimo', name: 'Preço Mínimo', color: 'rgb(34, 197, 94)', type: 'market', isVisible: true },
            { key: 'Preço Médio (IQR)', name: 'Preço Médio (IQR)', color: 'rgb(59, 130, 246)', type: 'market', isVisible: true },
            { key: 'Preço Máximo', name: 'Preço Máximo', color: 'rgb(239, 68, 68)', type: 'market', isVisible: true },
        ];
        
        userBandeiras.forEach(brand => {
            const brandColorStyle = distributorColors[brand] || distributorColors.DEFAULT;
            newSeriesConfig.push({
                key: brand,
                name: brand,
                color: brandColorStyle.background.replace(/, ?\d?\.?\d+\)$/, ', 1)'),
                type: 'distributor',
                isVisible: true,
            });
        });

        return { chartData: sortedFinalChartData, seriesConfig: newSeriesConfig };
    }, [rawChartData, userHistoryChartData, userBandeiras, distributorColors]);

    useEffect(() => {
        setDashboardSeriesConfig(prevConfig => {
            const newConfig = chartAndSeriesData.seriesConfig;
            if (!newConfig || newConfig.length === 0) {
                return prevConfig.filter(s => s.type === 'market');
            }
            const prevVisibilityMap = new Map(prevConfig.map(s => [s.key, s.isVisible]));
            return newConfig.map(newSeries => ({
                ...newSeries,
                isVisible: prevVisibilityMap.has(newSeries.key) ? prevVisibilityMap.get(newSeries.key)! : newSeries.isVisible,
            }));
        });
    }, [chartAndSeriesData.seriesConfig]);

    const visibleSeriesNames = useMemo(() => new Set(
        dashboardSeriesConfig.filter(s => s.isVisible).map(s => s.name)
    ), [dashboardSeriesConfig]);

    const filteredChartData = useMemo(() => {
        const newChartData: Record<string, ChartData> = {};
        (Object.keys(chartAndSeriesData.chartData) as string[]).forEach((fuelType) => {
            const originalData = chartAndSeriesData.chartData[fuelType];
            if (originalData && 'datasets' in originalData) {
                newChartData[fuelType] = {
                    ...originalData,
                    datasets: originalData.datasets.filter((dataset: ChartDataset) => visibleSeriesNames.has(dataset.label))
                };
            }
        });
        return newChartData;
    }, [chartAndSeriesData.chartData, visibleSeriesNames]);

// FIX: Replaced the `reduce` method with a `for...of` loop to ensure proper type inference and resolve the "Type 'unknown' cannot be used as an index type" error, which can occur with complex accumulator types in `reduce`.
    const filteredAllBrandPrices = useMemo(() => {
        const allowedBrands = new Set(userBandeiras);
        const result: { [key in BrandName]?: { [product: string]: number } } = {};
        for (const brand of Object.keys(allBrandPrices) as BrandName[]) {
            if (allowedBrands.has(brand)) {
                result[brand] = allBrandPrices[brand];
            }
        }
        return result;
    }, [allBrandPrices, userBandeiras]);

// FIX: Replaced the `reduce` method with a `for...of` loop to ensure proper type inference and resolve the "Type 'unknown' cannot be used as an index type" error, which can occur with complex accumulator types in `reduce`.
    const filteredAllBrandPriceInputs = useMemo(() => {
        const allowedBrands = new Set(userBandeiras);
        const result: { [key in BrandName]?: { [product: string]: string } } = {};
        for (const brand of Object.keys(allBrandPriceInputs) as BrandName[]) {
            if (allowedBrands.has(brand)) {
                result[brand] = allBrandPriceInputs[brand];
            }
        }
        return result;
    }, [allBrandPriceInputs, userBandeiras]);

    // Handlers
    const handleBrandPriceChange = useCallback((brand: BrandName, product: string, value: string) => {
        let digits = value.replace(/\D/g, '').slice(0, 5);
        if (digits === '') {
          setAllBrandPriceInputs(p => ({ ...p, [brand]: { ...p[brand], [product]: '' } }));
          setAllBrandPrices(p => ({ ...p, [brand]: { ...p[brand], [product]: 0 } }));
          return;
        }
        const formattedValue = digits.length > 1 ? `${digits.slice(0, 1)},${digits.slice(1)}` : digits;
        const price = parseInt(digits.padEnd(5, '0'), 10) / 10000;
        
        setAllBrandPriceInputs(p => ({ ...p, [brand]: { ...p[brand], [product]: formattedValue } }));
        setAllBrandPrices(p => ({ ...p, [brand]: { ...p[brand], [product]: price } }));
    }, []);

    const handleSaveQuote = useCallback(async () => {
        if (!userProfile) {
          setError('Dados do usuário incompletos. Não é possível salvar a cotação.');
          return;
        }
        setIsSaving(true);
        setIsSaveSuccess(false);
        setError(null);
    
        const { error: upsertError } = await saveUserDailyPrices(filteredAllBrandPrices, userProfile, refDate, selectedBase);
        
        setIsSaving(false);
    
        if (upsertError) {
          console.error("Erro detalhado do Supabase:", upsertError);
          const errorMessage = upsertError.message || "Erro desconhecido. Verifique o console para mais detalhes.";
          setError(`Não foi possível salvar a cotação: ${errorMessage}`);
        } else {
          setIsSaveSuccess(true);
          setTimeout(() => setIsSaveSuccess(false), 2500);
        }
    }, [filteredAllBrandPrices, userProfile, refDate, selectedBase]);
    
    const toggleDashboardSeriesVisibility = useCallback((seriesKey: string) => {
        setDashboardSeriesConfig(prevConfig =>
            prevConfig.map(series =>
                series.key === seriesKey ? { ...series, isVisible: !series.isVisible } : series
            )
        );
    }, []);
    
    const handleSelectAllDistributors = useCallback(() => {
        setSelectedDistributors(new Set(distributors));
    }, [distributors]);

    const handleClearAllDistributors = useCallback(() => {
        setSelectedDistributors(new Set());
    }, []);

    const handleToggleDistributor = useCallback((distName: string) => {
        setSelectedDistributors(prev => {
            const newSet = new Set(prev);
            if (newSet.has(distName)) {
                newSet.delete(distName);
            } else {
                newSet.add(distName);
            }
            return newSet;
        });
    }, []);


    return {
        isLoading,
        error,
        marketData,
        products,
        distributors,
        distributorColors,
        distributorImages,
        allBrandPrices: filteredAllBrandPrices,
        allBrandPriceInputs: filteredAllBrandPriceInputs,
        marketMinPrices,
        dynamicAveragePrices,
        selectedDistributors,
        isComparisonMode,
        isSaving,
        isSaveSuccess,
        dashboardSeriesConfig,
        refDate,
        userBandeiras,
        activeBrand,
        comparisonMode,
        filteredChartData,

        // Handlers and Setters
        handleBrandPriceChange,
        handleSaveQuote,
        setRefDate,
        setActiveBrand,
        setComparisonMode,
        setIsComparisonMode,
        toggleDashboardSeriesVisibility,
        handleSelectAllDistributors,
        handleClearAllDistributors,
        handleToggleDistributor,
    };
};
