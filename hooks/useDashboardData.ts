
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
} from '../utils/dataHelpers';
import { getDistributorStyle, defaultDistributorStyle, getOriginalBrandName } from '../utils/styleManager';

/**
 * Extrai uma mensagem de erro legível de qualquer tipo de exceção.
 * @param error O erro capturado.
 * @returns Uma string com a mensagem de erro.
 */
const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    if (typeof error === 'string') {
        return error;
    }
    try {
        return JSON.stringify(error);
    } catch {
        return 'Ocorreu um erro desconhecido e não foi possível exibi-lo.';
    }
};

// Local types from DashboardPage
type ChartDataset = {
    label: string;
    data: (number | null)[];
    hidden?: boolean; // Adicionado para controle de visibilidade
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
    // FIX: A lista de produtos agora é estática e memoizada para evitar re-renders desnecessários no gráfico
    const products = useMemo(() => [...FUEL_PRODUCTS], []);
    
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
                    throw pricesError;
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
                    const fuelProducts: readonly string[] = FUEL_PRODUCTS;
                    const indexA = fuelProducts.indexOf(a);
                    const indexB = fuelProducts.indexOf(b);
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
                
                const fetchedColors = allNamesToColor.reduce<DistributorColors>((acc, name) => {
                    acc[name] = getDistributorStyle(name, dbStylesMap);
                    return acc;
                }, { DEFAULT: { ...defaultDistributorStyle } });
                
                setMarketData(sortedMarketData);
                setDistributors(newDistributors);
                setDistributorColors(fetchedColors);
                setSelectedDistributors(new Set(newDistributors));
            
            } catch (err: any) {
                // Verificação robusta para AbortError
                if (
                    (err instanceof Error && (err.name === 'AbortError' || err.message.includes('Aborted') || err.message.includes('aborted'))) || 
                    (err && typeof err === 'object' && err.message && (err.message.includes('AbortError') || err.message.includes('aborted')))
                ) {
                    return; // Ignore abort errors, they are expected
                }
                if (!signal.aborted) {
                    const message = getErrorMessage(err);
                    setError(`Falha ao carregar os dados: ${message}`);
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
    
    // CORREÇÃO: Alinhando a lógica da Tabela com a lógica do Gráfico
    const dynamicAveragePrices = useMemo(() => {
        return marketData.reduce((acc, { produto, prices }) => {
            const distList = Array.from(selectedDistributors) as string[];
            let pricesToAverage: number[] = [];

            // Se apenas 1 distribuidora está selecionada:
            // O gráfico mostra a variação interna (todos os preços). A tabela deve fazer o mesmo.
            if (distList.length === 1) {
                const d = distList[0];
                const pList = prices[d];
                if (pList) {
                    const validPrices = pList.filter(p => typeof p === 'number' && isFinite(p));
                    pricesToAverage = validPrices;
                }
            } 
            // Se múltiplas distribuidoras estão selecionadas:
            // O gráfico compara a competitividade (Melhor preço vs Melhor preço).
            // A tabela deve calcular a média dos PREÇOS MÍNIMOS de cada distribuidora.
            else {
                for (const d of distList) {
                    const pList = prices[d];
                    if (pList && pList.length > 0) {
                        const validPrices = pList.filter(p => typeof p === 'number' && isFinite(p));
                        if (validPrices.length > 0) {
                            // Pega o MELHOR preço desta distribuidora para compor a média de mercado
                            pricesToAverage.push(Math.min(...validPrices));
                        }
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
        userHistoryChartData.forEach((record: UserHistoryChartRecord) => {
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

        if (allFuelTypesInWindow.length === 0) return { chartData: {} as FinalChartData, seriesConfig: [] };

        const labels: string[] = Array.from(new Set<string>(
            rawChartData
                .map((d) => d.data)
                .filter((d): d is string => typeof d === 'string')
        )).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        if (labels.length === 0) return { chartData: {} as FinalChartData, seriesConfig: [] };

        for (const fuelType of allFuelTypesInWindow) {
            const dailyStats = labels.map(dateStr => {
                const pricesByDistributor = dataByFuelTypeAndDate[fuelType]?.[dateStr] || {};
                const activeDistributors = Object.keys(pricesByDistributor).filter(d => pricesByDistributor[d] && pricesByDistributor[d].length > 0);

                if (activeDistributors.length === 0) return { min: null, avg: null, max: null };

                let valuesForStats: number[] = [];

                if (activeDistributors.length === 1) {
                    // Cenário 1: Apenas 1 bandeira selecionada.
                    // Mostra a variação INTERNA (amplitude) daquela bandeira.
                    valuesForStats = pricesByDistributor[activeDistributors[0]];
                } else {
                    // Cenário 2: Múltiplas bandeiras.
                    // Competitividade: Pega o MELHOR preço (Mínimo) de cada concorrente.
                    // Isso gera uma faixa de mercado dos "Melhores Preços".
                    valuesForStats = activeDistributors.map(d => Math.min(...pricesByDistributor[d]));
                }

                // Garante que são números válidos
                const validValues = valuesForStats.filter((p): p is number => typeof p === 'number' && isFinite(p));

                if (validValues.length === 0) return { min: null, avg: null, max: null };
                
                const min = Math.min(...validValues);
                const avg = calculateIQRAverage(validValues);
                const max = Math.max(...validValues);

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
                    seriesType: 'distributor',
                });
            });

            finalChartData[fuelType] = { labels, datasets };
        }
        
        const productOrder = FUEL_PRODUCTS as readonly string[];
        const sortedKeys = Object.keys(finalChartData).sort((a, b) => {
            const indexA = productOrder.indexOf(a);
            const indexB = productOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1; if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });
        
        const sortedFinalChartData: FinalChartData = {};
        sortedKeys.forEach((key) => {
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

    // --- Atualiza configuração de séries (Gráfico) com persistência ---
    useEffect(() => {
        setDashboardSeriesConfig(prevConfig => {
            const newConfig = chartAndSeriesData.seriesConfig as ChartSeries[];
            if (!newConfig || newConfig.length === 0) {
                return prevConfig.filter(s => s.type === 'market');
            }
            
            const prevVisibilityMap = new Map(prevConfig.map(s => [s.key, s.isVisible]));
            
            // Carregar do localStorage
            let savedVisibility: Record<string, boolean> = {};
            try {
                const raw = localStorage.getItem('precin_dashboard_series_visibility');
                if (raw) savedVisibility = JSON.parse(raw);
            } catch (e) {
                console.warn("Erro ao ler visibilidade do localStorage:", e);
            }

            return newConfig.map((newSeries: ChartSeries) => {
                const fromSaved = savedVisibility[newSeries.key];
                const fromPrev = prevVisibilityMap.get(newSeries.key);
                
                let isVisible = newSeries.isVisible;
                // Preferência salva tem prioridade maior, depois estado anterior
                if (typeof fromSaved === 'boolean') {
                    isVisible = fromSaved;
                } else if (typeof fromPrev === 'boolean') {
                    isVisible = fromPrev;
                }

                return { ...newSeries, isVisible };
            });
        });
    }, [chartAndSeriesData.seriesConfig]);

    // --- Salvar visibilidade das séries no localStorage ---
    useEffect(() => {
        if (dashboardSeriesConfig.length === 0) return;
        const visibility: Record<string, boolean> = {};
        dashboardSeriesConfig.forEach(s => visibility[s.key] = s.isVisible);
        try {
            localStorage.setItem('precin_dashboard_series_visibility', JSON.stringify(visibility));
        } catch (e) {
            console.warn("Erro ao salvar visibilidade no localStorage:", e);
        }
    }, [dashboardSeriesConfig]);

    const visibleSeriesNames = useMemo(() => new Set(
        dashboardSeriesConfig.filter(s => s.isVisible).map(s => s.name)
    ), [dashboardSeriesConfig]);

    const filteredChartData = useMemo(() => {
        const newChartData: Record<string, ChartData> = {};
        const cd = chartAndSeriesData.chartData as Record<string, ChartData>;
        
        if (cd && typeof cd === 'object') {
            Object.keys(cd).forEach((key: string) => {
                const originalData = cd[key];
                if (originalData && originalData.datasets) {
                    newChartData[key] = {
                        ...originalData,
                        // MODIFICADO: Em vez de filtrar (remover), apenas marcamos como hidden.
                        // Isso permite que o Chart.js mantenha a referência, mas a lógica de min/max
                        // no componente charts.tsx irá ignorar os dados hidden para re-escalar.
                        datasets: originalData.datasets.map((dataset: ChartDataset) => ({
                            ...dataset,
                            hidden: !visibleSeriesNames.has(dataset.label)
                        }))
                    };
                }
            });
        }
        return newChartData;
    }, [chartAndSeriesData.chartData, visibleSeriesNames]);

    const filteredAllBrandPrices = useMemo(() => {
        const allowedBrands = new Set(userBandeiras);
        const result: { [key in BrandName]?: { [product: string]: number } } = {};
        Object.keys(allBrandPrices).forEach((key) => {
            const brand = key as BrandName;
            const prices = allBrandPrices[brand];
            if (allowedBrands.has(brand) && prices) {
                result[brand] = prices;
            }
        });
        return result;
    }, [allBrandPrices, userBandeiras]);

    const filteredAllBrandPriceInputs = useMemo(() => {
        const allowedBrands = new Set(userBandeiras);
        const result: { [key in BrandName]?: { [product: string]: string } } = {};
        Object.keys(allBrandPriceInputs).forEach((key) => {
             const brand = key as BrandName;
             const inputs = allBrandPriceInputs[brand];
             if (allowedBrands.has(brand) && inputs) {
                 result[brand] = inputs;
             }
        });
        return result;
    }, [allBrandPriceInputs, userBandeiras]);

    // Handlers
    const handleBrandPriceChange = useCallback((brand: BrandName, product: string, value: string) => {
        // ALTERADO: Limita a 4 dígitos no total (X,XXX) para 3 casas decimais
        let digits = value.replace(/\D/g, '').slice(0, 4);
        if (digits === '') {
          setAllBrandPriceInputs(p => ({ ...p, [brand]: { ...p[brand], [product]: '' } }));
          setAllBrandPrices(p => ({ ...p, [brand]: { ...p[brand], [product]: 0 } }));
          return;
        }
        const formattedValue = digits.length > 1 ? `${digits.slice(0, 1)},${digits.slice(1)}` : digits;
        // ALTERADO: Divisão por 1000 para 3 casas decimais
        const price = parseInt(digits.padEnd(4, '0'), 10) / 1000;
        
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
        
        // Raw data for advanced components (like PurchaseThermometer)
        rawChartData,

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
