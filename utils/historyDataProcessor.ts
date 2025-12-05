import type { HistoryRow, ProcessedRow } from '../types';

export const processHistoryData = (historyData: HistoryRow[], displayNames: string[]): ProcessedRow[] => {
    if (!historyData || historyData.length === 0) return [];

    const periodFormatter = (dateStr: string): string => {
        const date = new Date(dateStr);
        // A granularidade é sempre diária, então a formatação é fixa.
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    };

    const dataByPeriod = new Map<string, HistoryRow[]>();
    historyData.forEach(row => {
        const periodKey = row.period;
        if (!dataByPeriod.has(periodKey)) dataByPeriod.set(periodKey, []);
        dataByPeriod.get(periodKey)!.push(row);
    });

    const sortedPeriodKeys = Array.from(dataByPeriod.keys()).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    
    let previousMarketAggregates: { min: number | null, avg: number | null, max: number | null } = { min: null, avg: null, max: null };
    let previousDistributorPrices: Map<string, number | null> = new Map();

    const output: ProcessedRow[] = [];

    for (const periodKey of sortedPeriodKeys) {
        const periodRows = dataByPeriod.get(periodKey)!;
        const marketRow = periodRows.find(d => d.distribuidora === null);
        
        const currentMarketData: Partial<HistoryRow> = marketRow || {
            market_min: null, market_avg: null, market_max: null
        };

        const calculateDelta = (current: number | null, previous: number | null): number | null => {
            if (current === null || previous === null || previous === 0) return null;
            return parseFloat((((current - previous) / previous) * 100).toFixed(2));
        };

        const market: ProcessedRow['market'] = {
            min: { value: currentMarketData.market_min ?? null, delta: calculateDelta(currentMarketData.market_min ?? null, previousMarketAggregates.min) },
            avg: { value: currentMarketData.market_avg ?? null, delta: calculateDelta(currentMarketData.market_avg ?? null, previousMarketAggregates.avg) },
            max: { value: currentMarketData.market_max ?? null, delta: calculateDelta(currentMarketData.market_max ?? null, previousMarketAggregates.max) },
        };
        
        const currentDistributorPrices: ProcessedRow['distributorPrices'] = [];
        displayNames.forEach(displayName => {
             const rowData = periodRows.find(r => r.distribuidora === displayName);
             const currentPrice = rowData ? rowData.distribuidora_avg_price : null;
             const previousPrice = previousDistributorPrices.get(displayName) || null;

             currentDistributorPrices.push({
                 name: displayName,
                 price: { value: currentPrice, delta: calculateDelta(currentPrice, previousPrice) }
             });
        });

        output.push({
            periodDisplay: periodFormatter(periodKey),
            periodKey: periodKey,
            market: market,
            distributorPrices: currentDistributorPrices,
        });
        
        previousMarketAggregates = { min: market.min.value, avg: market.avg.value, max: market.max.value };
        previousDistributorPrices = new Map(currentDistributorPrices.map(d => [d.name, d.price.value]));
    }

    return output.reverse();
};