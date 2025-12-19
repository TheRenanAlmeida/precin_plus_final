
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
import { getMarketDayStatus, MarketDayStatus } from '../services/marketDay.service';
import {
    calculateIQRAverage,
    findMinPriceInfo,
    calculateProductAveragesFromRecords,
} from '../utils/dataHelpers';
import { getDistributorStyle, defaultDistributorStyle, getOriginalBrandName } from '../utils/styleManager';
import { formatDateForInput } from '../utils/dateUtils';

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
};

type ChartDataset = {
    label: string;
    data: (number | null)[];
    hidden?: boolean;
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
    const [allBrandPrices, setAllBrandPrices] = useState<{ [key in BrandName]?: { [product: string]: number } }>({});
    const [allBrandPriceInputs, setAllBrandPriceInputs] = useState<{ [key in BrandName]?: { [product: string]: string } }>({});
    const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('min');
    
    const [marketData, setMarketData] = useState<ProductData[]>([]);
    const [unfilteredAveragePrices, setUnfilteredAveragePrices] = useState<{ [product: string]: number }>({});
    const [distributors, setDistributors] = useState<string[]>([]);
    const products = useMemo(() => [...FUEL_PRODUCTS], []);
    
    const [distributorColors, setDistributorColors] = useState<DistributorColors>({ DEFAULT: defaultDistributorStyle });
    const [distributorImages, setDistributorImages] = useState<{ [key: string]: string | null }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isValidatingDay, setIsValidatingDay] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDistributors, setSelectedDistributors] = useState<Set<string>>(new Set());
    const [rawChartData, setRawChartData] = useState<FuelPriceRecord[]>([]);
    const [userHistoryChartData, setUserHistoryChartData] = useState<UserHistoryChartRecord[]>([]);
    
    const [isComparisonMode, setIsComparisonMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaveSuccess, setIsSaveSuccess] = useState(false);
    
    const [dashboardSeriesConfig, setDashboardSeriesConfig] = useState<ChartSeries[]>([]);
    const [refDate, setRefDate] = useState(new Date());
    const [adjustmentNotification, setAdjustmentNotification] = useState<{ original: string; adjusted: string } | null>(null);
    
    // Novo Estado Consolidado do Dia
    const [marketDay, setMarketDay] = useState<MarketDayStatus>({
        sources: 0,
        valid: true,
        lastValidDay: null
    });
    const [noValidDayFound, setNoValidDayFound] = useState(false);
    
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

    // Lógica de Validação de Dia de Mercado usando a RPC única com DEBOUNCE
    useEffect(() => {
        if (!selectedBase) return;
        
        const controller = new AbortController();
        const validateDay = async () => {
            setIsValidatingDay(true);
            setNoValidDayFound(false);
            const dateStr = formatDateForInput(refDate);
            
            const result = await getMarketDayStatus(selectedBase, dateStr, 3, controller.signal);
            
            if (result && !controller.signal.aborted) {
                setMarketDay(result);
                
                if (!result.valid) {
                    if (result.lastValidDay) {
                        const adjustedDate = new Date(result.lastValidDay + 'T12:00:00');
                        setAdjustmentNotification({
                            original: refDate.toLocaleDateString('pt-BR'),
                            adjusted: adjustedDate.toLocaleDateString('pt-BR')
                        });
                        setRefDate(adjustedDate);
                        setTimeout(() => setAdjustmentNotification(null), 5000);
                    } else {
                        setNoValidDayFound(true);
                    }
                }
            }
            
            if (!controller.signal.aborted) {
                setIsValidatingDay(false);
            }
        };

        const timer = setTimeout(validateDay, 250); // Debounce de 250ms
        
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [selectedBase, refDate]);

    // Data Fetching Principal - Respeita a validade do dia
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        async function fetchPageData() {
            // Só executa as queries pesadas se o dia for válido
            if (noValidDayFound || !marketDay.valid) {
                setMarketData([]);
                setDistributors([]);
                setIsLoading(false);
                return;
            }

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

                if (stylesError) console.error("Falha ao carregar estilos:", stylesError.message);
                if (distributorsError) setError(`Falha ao carregar logos: ${distributorsError.message}`);
                
                if (pricesError) throw pricesError;

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
                    const idxA = products.indexOf(a as any);
                    const idxB = products.indexOf(b as any);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    return a.localeCompare(b);
                };
                
                const newDistributors = Array.from(distributorSet).sort((a,b) => a.localeCompare(b));
                const sortedMarketData = Array.from(productMap.entries()).map(([produto, prices]) => ({ produto, prices })).sort((a, b) => customSort(a.produto, b.produto));

                const dbStylesMap = new Map<string, DistributorDBStyle>();
                if (stylesData) stylesData.forEach(style => dbStylesMap.set(style.name, style));
                
                const allNamesToColor = Array.from(new Set([...newDistributors, ...userBandeiras]));
                const fetchedColors = allNamesToColor.reduce<DistributorColors>((acc, name) => {
                    acc[name] = getDistributorStyle(name, dbStylesMap);
                    return acc;
                }, { DEFAULT: { ...defaultDistributorStyle } });
                
                setMarketData(sortedMarketData);
                setDistributors(newDistributors);
                setDistributorColors(fetchedColors);
                setSelectedDistributors(new Set(newDistributors));
            
            } catch (err: any) {
                if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
                if (!signal.aborted) setError(`Falha ao carregar os dados: ${getErrorMessage(err)}`);
            } finally {
                if (!signal.aborted) setIsLoading(false);
            }
        }

        if (selectedBase) {
            fetchPageData();
        } else if (availableBases.length === 0 && !userProfile.credencial) {
            setError("Nenhuma base de atuação configurada.");
            setIsLoading(false);
        }

        return () => controller.abort();
    }, [refDate, selectedBase, userBandeiras, userProfile.id, availableBases, noValidDayFound, marketDay.valid]);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        async function fetchChartData() {
            if (!selectedBase || !marketDay.valid) {
                setRawChartData([]);
                return;
            }
            
            const { rawChartData, userHistoryChartData, error: chartError } = await fetchChartDataForDashboard(
                selectedBase, refDate, selectedDistributors, userProfile.id, signal
            );
            
            if (signal.aborted) return;
            if (chartError) setError(prev => `${prev || ''} ${chartError}`);
            
            setRawChartData(rawChartData || []);
            setUserHistoryChartData(userHistoryChartData || []);
        }

        fetchChartData();
        return () => controller.abort();
    }, [refDate, selectedBase, selectedDistributors, userProfile.id, marketDay.valid]);

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
        return marketData.reduce((acc, { produto, prices }) => {
            const distList = Array.from(selectedDistributors) as string[];
            let pricesToAverage: number[] = [];

            if (distList.length === 1) {
                const pList = prices[distList[0]];
                if (pList) pricesToAverage = pList.filter(p => typeof p === 'number' && isFinite(p));
            } else {
                for (const d of distList) {
                    const pList = prices[d];
                    if (pList && pList.length > 0) {
                        const validPrices = pList.filter(p => typeof p === 'number' && isFinite(p));
                        if (validPrices.length > 0) pricesToAverage.push(Math.min(...validPrices));
                    }
                }
            }
            
            acc[produto] = calculateIQRAverage(pricesToAverage);
            return acc;
        }, {} as {[product: string]: number});
    }, [marketData, selectedDistributors]);

    const chartAndSeriesData = useMemo(() => {
        const dataByFuelTypeAndDate: Record<string, Record<string, ProductPrices>> = {};

        rawChartData.forEach((record: FuelPriceRecord) => {
            const { fuel_type, data, Distribuidora, price } = record;
            if (price && price > 0 && fuel_type && data && Distribuidora) {
                if (!dataByFuelTypeAndDate[fuel_type]) dataByFuelTypeAndDate[fuel_type] = {};
                const fuelData = dataByFuelTypeAndDate[fuel_type];
                if (!fuelData[data]) fuelData[data] = {};
                const dateData = fuelData[data];
                if (!dateData[Distribuidora]) dateData[Distribuidora] = [];
                dateData[Distribuidora].push(price);
            }
        });

        const userPricesByFuelAndDate: UserPricesByFuelAndDate = {};
        userHistoryChartData.forEach((record: UserHistoryChartRecord) => {
            const { product_name, price_date, brand_name, price } = record;
            if (product_name && price_date && brand_name) {
                if (!userPricesByFuelAndDate[product_name]) userPricesByFuelAndDate[product_name] = {};
                const productData = userPricesByFuelAndDate[product_name];
                if (!productData[price_date]) productData[price_date] = {};
                productData[price_date][brand_name] = price;
            }
        });

        const finalChartData: FinalChartData = {};
        const allFuelTypesInWindow = Object.keys(dataByFuelTypeAndDate);

        if (allFuelTypesInWindow.length === 0) return { chartData: {} as FinalChartData, seriesConfig: [] };

        const labels: string[] = Array.from(new Set<string>(
            rawChartData.map((d) => d.data).filter((d): d is string => !!d)
        )).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        if (labels.length === 0) return { chartData: {} as FinalChartData, seriesConfig: [] };

        for (const fuelType of allFuelTypesInWindow) {
            const dailyStats = labels.map(dateStr => {
                const pricesByDistributor = dataByFuelTypeAndDate[fuelType]?.[dateStr] || {};
                const activeDistributors = Object.keys(pricesByDistributor).filter(d => pricesByDistributor[d]?.length > 0);

                if (activeDistributors.length === 0) return { min: null, avg: null, max: null };

                let valuesForStats: number[] = [];
                if (activeDistributors.length === 1) {
                    valuesForStats = pricesByDistributor[activeDistributors[0]];
                } else {
                    valuesForStats = activeDistributors.map(d => Math.min(...pricesByDistributor[d]));
                }

                const validValues = valuesForStats.filter((p): p is number => typeof p === 'number' && isFinite(p));
                if (validValues.length === 0) return { min: null, avg: null, max: null };
                
                return { 
                    min: Math.min(...validValues), 
                    avg: calculateIQRAverage(validValues) || null, 
                    max: Math.max(...validValues) 
                };
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
                    seriesType: 'market',
                },
                {
                    label: 'Preço Médio (IQR)',
                    data: dailyStats.map(d => d.avg),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.2,
                    borderWidth: 2,
                    spanGaps: true,
                    seriesType: 'market',
                },
                {
                    label: 'Preço Máximo',
                    data: dailyStats.map(d => d.max),
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.2,
                    borderWidth: 2,
                    spanGaps: true,
                    seriesType: 'market',
                },
            ];

            userBandeiras.forEach(brand => {
                const style = distributorColors[brand] || distributorColors.DEFAULT;
                const borderColor = style.background.replace(/, ?\d?\.?\d+\)$/, ', 1)');
                datasets.push({
                    label: brand,
                    data: labels.map(date => userPricesByFuelAndDate[fuelType]?.[date]?.[brand] ?? null),
                    borderColor: borderColor,
                    backgroundColor: borderColor.replace('1)', '0.2)'),
                    tension: 0.2,
                    borderWidth: 2.5,
                    borderDash: [5, 5],
                    spanGaps: true,
                    seriesType: 'distributor',
                });
            });

            finalChartData[fuelType] = { labels, datasets };
        }
        
        const sortedFinalChartData: FinalChartData = {};
        Object.keys(finalChartData).sort((a,b) => products.indexOf(a as any) - products.indexOf(b as any))
            .forEach(key => sortedFinalChartData[key] = finalChartData[key]);

        const newSeriesConfig: ChartSeries[] = [
            { key: 'Preço Mínimo', name: 'Preço Mínimo', color: 'rgb(34, 197, 94)', type: 'market', isVisible: true },
            { key: 'Preço Médio (IQR)', name: 'Preço Médio (IQR)', color: 'rgb(59, 130, 246)', type: 'market', isVisible: true },
            { key: 'Preço Máximo', name: 'Preço Máximo', color: 'rgb(239, 68, 68)', type: 'market', isVisible: true },
        ];
        
        userBandeiras.forEach(brand => {
            const style = distributorColors[brand] || distributorColors.DEFAULT;
            newSeriesConfig.push({
                key: brand,
                name: brand,
                color: style.background.replace(/, ?\d?\.?\d+\)$/, ', 1)'),
                type: 'distributor',
                isVisible: true,
            });
        });

        return { chartData: sortedFinalChartData, seriesConfig: newSeriesConfig };
    }, [rawChartData, userHistoryChartData, userBandeiras, distributorColors, products]);

    useEffect(() => {
        setDashboardSeriesConfig(prevConfig => {
            const newConfig = chartAndSeriesData.seriesConfig;
            if (!newConfig || newConfig.length === 0) return prevConfig;
            const prevMap = new Map(prevConfig.map(s => [s.key, s.isVisible]));
            return newConfig.map(s => ({ ...s, isVisible: prevMap.has(s.key) ? prevMap.get(s.key)! : s.isVisible }));
        });
    }, [chartAndSeriesData.seriesConfig]);

    const visibleSeriesNames = useMemo(() => new Set(
        dashboardSeriesConfig.filter(s => s.isVisible).map(s => s.name)
    ), [dashboardSeriesConfig]);

    const filteredChartData = useMemo(() => {
        const newChartData: Record<string, ChartData> = {};
        const cd = chartAndSeriesData.chartData;
        Object.keys(cd).forEach(key => {
            newChartData[key] = {
                ...cd[key],
                datasets: cd[key].datasets.map(ds => ({ ...ds, hidden: !visibleSeriesNames.has(ds.label) }))
            };
        });
        return newChartData;
    }, [chartAndSeriesData.chartData, visibleSeriesNames]);

    const handleBrandPriceChange = useCallback((brand: BrandName, product: string, value: string) => {
        let digits = value.replace(/\D/g, '').slice(0, 4);
        if (digits === '') {
          setAllBrandPriceInputs(p => ({ ...p, [brand]: { ...p[brand], [product]: '' } }));
          setAllBrandPrices(p => ({ ...p, [brand]: { ...p[brand], [product]: 0 } }));
          return;
        }
        const formattedValue = digits.length > 1 ? `${digits.slice(0, 1)},${digits.slice(1)}` : digits;
        const price = parseInt(digits.padEnd(4, '0'), 10) / 1000;
        setAllBrandPriceInputs(p => ({ ...p, [brand]: { ...p[brand], [product]: formattedValue } }));
        setAllBrandPrices(p => ({ ...p, [brand]: { ...p[brand], [product]: price } }));
    }, []);

    const handleSaveQuote = useCallback(async () => {
        setIsSaving(true);
        setIsSaveSuccess(false);
        setError(null);
        const { error: upsertError } = await saveUserDailyPrices(allBrandPrices, userProfile, refDate, selectedBase);
        setIsSaving(false);
        if (upsertError) setError(`Falha ao salvar: ${upsertError.message}`);
        else {
          setIsSaveSuccess(true);
          setTimeout(() => setIsSaveSuccess(false), 2500);
        }
    }, [allBrandPrices, userProfile, refDate, selectedBase]);
    
    return {
        isLoading,
        isValidatingDay,
        error,
        marketData,
        products,
        distributors,
        distributorColors,
        distributorImages,
        allBrandPrices,
        allBrandPriceInputs,
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
        rawChartData,
        adjustmentNotification,
        marketDay, // Retornando marketDay consolidado
        noValidDayFound,
        handleBrandPriceChange,
        handleSaveQuote,
        setRefDate,
        setActiveBrand,
        setComparisonMode,
        setIsComparisonMode,
        toggleDashboardSeriesVisibility: (key: string) => setDashboardSeriesConfig(prev => prev.map(s => s.key === key ? { ...s, isVisible: !s.isVisible } : s)),
        handleSelectAllDistributors: () => setSelectedDistributors(new Set(distributors)),
        handleClearAllDistributors: () => setSelectedDistributors(new Set()),
        handleToggleDistributor: (dist: string) => setSelectedDistributors(prev => {
            const next = new Set(prev);
            if (next.has(dist)) next.delete(dist); else next.add(dist);
            return next;
        }),
    };
};
