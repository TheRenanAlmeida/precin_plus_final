import React from 'react';
import type { CustomerQuoteTableProps } from '../../types';
import { formatPriceSmart } from '../../utils/dataHelpers';
import { getOriginalBrandName } from '../../utils/styleManager';
import type { BrandName, ComparisonMode } from '../../types';
import DistributorLogo from '../DistributorLogo';

// TypeScript declarations for libraries loaded via CDN
declare const html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
declare const jspdf: any;
declare const Chart: any;


const CustomerQuoteTable: React.FC<CustomerQuoteTableProps> = ({ 
  brands,
  allBrandPrices, 
  allBrandPriceInputs,
  handleBrandPriceChange, 
  marketMinPrices,
  averagePrices,
  onOpenShareModal,
  isSharing,
  quoteTableRef,
  distributorColors,
  distributorImages,
  products,
  selectedDistributors,
  onDistributorPillClick,
  isSharePreview = false,
  isComparisonMode,
  comparisonMode,
  onSaveQuote,
  isSaving,
  isSaveSuccess,
  activeBrand,
  onActiveBrandChange,
}) => {

  const isAvgMode = comparisonMode === 'avg';

  const BrandHeaderPill = ({ brand }: { brand: BrandName }) => {
    const style = distributorColors[brand] || distributorColors.DEFAULT;
    const imageUrl = distributorImages[getOriginalBrandName(brand)];
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-full distributor-pill"
        style={
          {
            backgroundColor: style.background,
            color: style.border,
            '--shadow-color': style.shadowColor,
          } as React.CSSProperties
        }
      >
        <DistributorLogo distributorName={brand} imageUrl={imageUrl} />
        <span>{brand}</span>
      </div>
    );
  };
  
  const renderBrandTabs = () => (
    <div className="bg-gray-100 p-1 rounded-lg inline-flex items-center space-x-1" role="tablist" aria-label="Seleção de Bandeira">
      {brands.map((brand) => {
        const style = distributorColors[brand] || distributorColors.DEFAULT;
        const isActive = brand === activeBrand;
        const brandDisplayName = brand === 'Branca/Indefinida' ? 'Branca' : brand;

        const inactiveStyle: React.CSSProperties = {
          backgroundColor: '#fff',
          color: '#166534', // text-green-800
        };

        const activeStyle: React.CSSProperties = {
          backgroundColor: style.background,
          color: style.border,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        };
        
        return (
          <button
            key={brand}
            onClick={() => onActiveBrandChange(brand)}
            role="tab"
            aria-selected={isActive}
            className={`whitespace-nowrap py-1.5 px-3 sm:px-4 rounded-md font-bold text-sm transition-all duration-200 ease-in-out focus:outline-none border ${isActive ? 'border-transparent' : 'border-gray-300'}`}
            style={{
                ... (isActive ? activeStyle : inactiveStyle),
            } as React.CSSProperties}
          >
            {brandDisplayName}
          </button>
        );
      })}
    </div>
  );

  const renderSingleBrandView = () => (
    <table className="w-full text-sm text-left text-gray-700">
      <thead className="text-base text-white uppercase bg-gradient-to-r from-green-600 to-green-500">
        <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:font-bold [&>th]:tracking-wider [&>th]:[text-shadow:0_1px_1px_rgba(0,0,0,0.3)]">
          <th scope="col" className="text-left sticky left-0 z-20 bg-green-600 min-w-[140px]">PRODUTO</th>
          <th scope="col" className="text-center min-w-[180px]">
            <BrandHeaderPill brand={activeBrand} />
          </th>
          <th scope="col" className="text-center min-w-[150px] whitespace-nowrap">
            {isAvgMode ? 'PREÇO MÉDIO' : 'MENOR PREÇO'}
          </th>
          <th scope="col" className="text-center min-w-[130px] whitespace-nowrap">DIFERENÇA R$</th>
          <th scope="col" className="text-center min-w-[130px] whitespace-nowrap">DIFERENÇA %</th>
          <th scope="col" className="text-center min-w-[220px]">
            {isAvgMode ? 'DISTRIBUIDORAS (MÉDIA)' : 'DISTRIBUIDORAS (MINIMA)'}
          </th>
        </tr>
      </thead>
      <tbody>
        {products.map((produto) => {
          const brandPrice = allBrandPrices[activeBrand]?.[produto] || 0;
          const brandPriceInput = allBrandPriceInputs[activeBrand]?.[produto] ?? '';
          const comparisonPrice = isAvgMode ? (averagePrices[produto] || 0) : (marketMinPrices[produto]?.minPrice || 0);
          const { distributors } = marketMinPrices[produto] || { distributors: [] };
          const difference = brandPrice - comparisonPrice;
          const percentageDifference = comparisonPrice === 0 ? 0 : (difference / comparisonPrice) * 100;
          const isCheaper = difference <= 0;

          let highlightClasses = "bg-gray-50 border-gray-300 text-gray-900";
          const priceEntered = brandPriceInput && brandPrice > 0;

          if (priceEntered && comparisonPrice > 0) {
              highlightClasses = difference <= 0.00001 ? "bg-green-200 border-green-500 text-green-900" : "bg-red-100 border-red-500 text-red-900";
          }
          highlightClasses += " focus:border-transparent focus:ring-2 hover:ring-2 focus:shadow-lg hover:shadow-lg transition-all duration-200 ease-in-out";
          if (priceEntered && comparisonPrice > 0) {
              highlightClasses += difference <= 0.00001 ? " focus:ring-green-500 hover:ring-green-500 focus:shadow-green-500/40 hover:shadow-green-500/40" : " focus:ring-red-500 hover:ring-red-500 focus:shadow-red-500/40 hover:shadow-red-500/40";
          } else {
              highlightClasses += " focus:ring-gray-400 hover:ring-gray-400 focus:shadow-gray-400/30 hover:shadow-gray-400/30";
          }

          return (
            <tr key={produto} className="align-middle transition-colors hover:bg-gray-50/50 border-b border-gray-200 last:border-b-0">
              <td className="px-2 sm:px-4 py-4 font-semibold text-gray-800 whitespace-nowrap sticky left-0 z-10 bg-white hover:bg-gray-50/50 transition-colors">{produto}</td>
              <td className="px-2 sm:px-4 py-4 text-center">
                <div className="relative flex justify-center items-center">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={brandPriceInput}
                    onChange={(e) => handleBrandPriceChange(activeBrand, produto, e.target.value)}
                    className={`w-28 h-10 rounded-full p-2 border font-bold text-center relative ${highlightClasses}`}
                  />
                </div>
              </td>
              <td className="px-2 sm:px-4 py-4 text-center">
                <span className="inline-flex items-center justify-center w-28 h-10 rounded-full bg-slate-100 font-bold border border-slate-400 text-gray-800">
                  {formatPriceSmart(comparisonPrice)}
                </span>
              </td>
              <td className="px-2 sm:px-4 py-4 text-center">
                <span className={`inline-flex items-center justify-center min-w-[80px] h-8 px-3 text-sm font-bold rounded-full ${isCheaper ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {difference > 0.00001 ? '+' : ''}{formatPriceSmart(difference)}
                </span>
              </td>
              <td className="px-2 sm:px-4 py-4 text-center">
                <span className={`inline-flex items-center justify-center min-w-[80px] h-8 px-3 text-sm font-bold rounded-full ${isCheaper ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {percentageDifference >= 0 ? '+' : ''}{percentageDifference.toFixed(2)}%
                </span>
              </td>
              {isAvgMode ? (
                produto === products[0] ? (
                  <td className="px-2 sm:px-4 py-4 align-middle text-center" rowSpan={products.length}>
                    <div className="grid grid-cols-2 gap-1.5 max-w-[240px] mx-auto">
                      {Array.from(selectedDistributors).sort().map((distributor: string) => {
                          const imageUrl = distributorImages[getOriginalBrandName(distributor)];
                          return (
                          <button key={distributor} onClick={() => onDistributorPillClick?.(distributor)}
                                className="flex items-center justify-center gap-2 px-3 h-8 text-xs font-bold rounded-full truncate distributor-pill cursor-pointer"
                                style={{ 
                                    backgroundColor: (distributorColors[distributor] || distributorColors.DEFAULT).background, 
                                    color: (distributorColors[distributor] || distributorColors.DEFAULT).border,
                                    '--shadow-color': (distributorColors[distributor] || distributorColors.DEFAULT).shadowColor,
                                } as React.CSSProperties}>
                            <DistributorLogo distributorName={distributor} imageUrl={imageUrl} />
                            <span className="truncate">{distributor}</span>
                          </button>
                        )})}
                    </div>
                  </td>
                ) : null
              ) : (
                <td className="px-2 sm:px-4 py-4 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-1 max-w-[200px] mx-auto">
                    {distributors.map((distributor) => {
                      const imageUrl = distributorImages[getOriginalBrandName(distributor)];
                      return (
                      <button key={distributor} onClick={() => onDistributorPillClick?.(distributor)}
                            className="inline-flex items-center justify-center gap-2 px-3 h-8 text-xs font-bold rounded-full truncate distributor-pill cursor-pointer"
                            style={{ 
                                backgroundColor: (distributorColors[distributor] || distributorColors.DEFAULT).background, 
                                color: (distributorColors[distributor] || distributorColors.DEFAULT).border,
                                '--shadow-color': (distributorColors[distributor] || distributorColors.DEFAULT).shadowColor,
                            } as React.CSSProperties}>
                        <DistributorLogo distributorName={distributor} imageUrl={imageUrl} />
                        <span className="truncate">{distributor}</span>
                      </button>
                    )})}
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const renderComparisonView = () => {
      const orderedBrands: BrandName[] = [activeBrand, ...brands.filter(b => b !== activeBrand)];
      const formatDifference = (diff: number | null) => {
          if (diff === null || isNaN(diff) || Math.abs(diff) < 0.0001) return '0,00';
          const sign = diff > 0 ? '+' : '';
          return sign + formatPriceSmart(diff);
      };

      return (
        <table className="w-full text-sm text-left text-gray-700">
            <thead className="text-base text-white uppercase bg-gradient-to-r from-green-600 to-green-500">
                <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:font-bold [&>th]:tracking-wider [&>th]:[text-shadow:0_1px_1px_rgba(0,0,0,0.3)]">
                    <th scope="col" className="text-left sticky left-0 z-20 bg-green-600 min-w-[140px] px-4">PRODUTO</th>
                    {orderedBrands.map(brand => (
                        <th key={brand} scope="col" className="text-center min-w-[180px] transition-colors">
                          <BrandHeaderPill brand={brand} />
                        </th>
                    ))}
                    <th scope="col" className="text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center rounded-lg" role="group">
                            <span className="bg-green-600 text-white font-bold text-xs px-3 py-1.5 rounded-l-lg">
                                Precin
                            </span>
                            <span className="bg-white text-green-800 font-bold text-xs px-3 py-1.5 rounded-r-lg border-y border-r border-gray-200">
                                {isAvgMode ? 'Média' : 'Mínima'}
                            </span>
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody>
                {products.map((produto) => {
                    const referencePrice = allBrandPrices[activeBrand]?.[produto] || 0;
                    const pricesForProduct = brands.map(b => allBrandPrices[b]?.[produto]).filter(p => p !== undefined && p > 0) as number[];
                    const userMinPrice = pricesForProduct.length > 0 ? Math.min(...pricesForProduct) : 0;
                    const marketComparisonPrice = isAvgMode ? (averagePrices[produto] || 0) : (marketMinPrices[produto]?.minPrice || 0);

                    const marketDifference = (referencePrice > 0 && marketComparisonPrice > 0) ? marketComparisonPrice - referencePrice : null;
                    let marketPillClasses = 'bg-slate-100 border-slate-400 text-gray-800';
                    if (marketDifference !== null) {
                        if (marketDifference < -0.00001) {
                            marketPillClasses = 'bg-green-100 text-green-800 border-green-400';
                        } else if (marketDifference > 0.00001) {
                            marketPillClasses = 'bg-red-100 text-red-800 border-red-400';
                        }
                    }

                    return (
                        <tr key={produto} className="align-middle transition-colors hover:bg-gray-50/50 border-b border-gray-200 last:border-b-0">
                            <td className="px-4 py-4 font-semibold text-gray-800 whitespace-nowrap sticky left-0 z-10 bg-white hover:bg-gray-50/50 transition-colors">{produto}</td>
                            {orderedBrands.map(brand => {
                                const brandPrice = allBrandPrices[brand]?.[produto] || 0;

                                if (brand === activeBrand) {
                                    const isCheapest = brandPrice > 0 && brandPrice === userMinPrice;
                                    const isMoreExpensive = userMinPrice > 0 && brandPrice > userMinPrice;
                                    const activePillClasses = isCheapest
                                        ? 'bg-green-200 border-green-500 text-green-900'
                                        : isMoreExpensive
                                        ? 'bg-red-100 border-red-500 text-red-900'
                                        : 'bg-gray-50 border-gray-300 text-gray-900';

                                    return (
                                        <td key={brand} className="px-2 py-4 text-center bg-green-50 border-x border-green-200">
                                            <div className="flex justify-center items-center">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={allBrandPriceInputs[brand]?.[produto] ?? ''}
                                                    onChange={(e) => handleBrandPriceChange(brand, produto, e.target.value)}
                                                    className={`w-28 h-10 rounded-full p-2 border font-bold text-center relative transition-all duration-200 ease-in-out ${activePillClasses} focus:ring-2 focus:ring-green-500 hover:ring-2 hover:ring-green-500`}
                                                />
                                            </div>
                                        </td>
                                    );
                                } else {
                                    const difference = (brandPrice > 0 && referencePrice > 0) ? brandPrice - referencePrice : null;
                                    let inactivePillClasses = 'bg-slate-100 border-slate-400 text-gray-800';
                                    if (difference !== null) {
                                        if (difference < -0.00001) {
                                            inactivePillClasses = 'bg-green-100 text-green-800 border-green-400';
                                        } else if (difference > 0.00001) {
                                            inactivePillClasses = 'bg-red-100 text-red-800 border-red-400';
                                        }
                                    }

                                    return (
                                        <td key={brand} className="px-2 py-4 text-center">
                                            <div className="flex justify-center items-center gap-1.5">
                                                <span className={`w-28 h-10 rounded-full p-2 border font-bold text-center inline-flex items-center justify-center ${inactivePillClasses}`}>
                                                    {brandPrice > 0 ? formatPriceSmart(brandPrice) : '-'}
                                                </span>
                                                {difference !== null && (
                                                    <span className={`flex-shrink-0 inline-flex items-center justify-center w-14 h-6 text-xs font-bold rounded-full ${difference < -0.00001 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {formatDifference(difference)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    );
                                }
                            })}
                            <td className="px-2 py-4 text-center">
                                <div className="flex justify-center items-center gap-1.5">
                                    <span className={`w-28 h-10 rounded-full p-2 border font-bold text-center inline-flex items-center justify-center ${marketPillClasses}`}>
                                        {marketComparisonPrice > 0 ? formatPriceSmart(marketComparisonPrice) : '-'}
                                    </span>
                                    {marketDifference !== null && (
                                        <span className={`flex-shrink-0 inline-flex items-center justify-center w-14 h-6 text-xs font-bold rounded-full ${marketDifference < -0.00001 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {formatDifference(marketDifference)}
                                        </span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      );
  };
  
  const renderSharePreview = () => (
    <table className="w-full text-sm text-left text-gray-700 table-fixed">
      <thead className="text-base text-white uppercase bg-green-600">
        <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-bold [&>th]:tracking-wider [&>th]:[text-shadow:0_1px_1px_rgba(0,0,0,0.3)]">
          <th scope="col" className="text-left bg-green-600 w-[15%]">PRODUTO</th>
          <th scope="col" className="text-center w-[15%]"><BrandHeaderPill brand={activeBrand} /></th>
          <th scope="col" className="text-center w-[15%]">{isAvgMode ? 'PREÇO MÉDIO' : 'MENOR PREÇO'}</th>
          <th scope="col" className="text-center w-[12%]">DIFERENÇA R$</th>
          <th scope="col" className="text-center w-[12%]">DIFERENÇA %</th>
          <th scope="col" className="text-center w-[31%]">{isAvgMode ? 'DISTRIBUIDORAS (MÉDIA)' : 'DISTRIBUIDORAS (MINIMA)'}</th>
        </tr>
      </thead>
      <tbody>
        {products.map((produto, index) => {
            const brandPrice = allBrandPrices[activeBrand]?.[produto] || 0;
            const comparisonPrice = isAvgMode ? (averagePrices[produto] || 0) : (marketMinPrices[produto]?.minPrice || 0);
            const { distributors } = marketMinPrices[produto] || { distributors: [] };
            const difference = brandPrice - comparisonPrice;
            const percentageDifference = comparisonPrice === 0 ? 0 : (difference / comparisonPrice) * 100;
            const isCheaper = difference <= 0;
            const highlightClasses = brandPrice > 0 && comparisonPrice > 0 ? (difference <= 0.00001 ? "bg-green-200 border-green-500 text-green-900" : "bg-red-100 border-red-500 text-red-900") : "bg-gray-50 border-gray-300 text-gray-900";
            const isLastRow = index === products.length - 1;
            const cellBorderClass = !isLastRow ? 'border-b border-gray-200' : '';
          return (
            <tr key={produto} className={`align-middle ${cellBorderClass}`}>
              <td className="px-4 py-4 font-semibold text-gray-800 whitespace-nowrap bg-white">{produto}</td>
              <td className="px-4 py-4 text-center">
                <span className={`inline-flex items-center justify-center w-32 h-10 rounded-full border font-bold ${highlightClasses}`}>
                  {formatPriceSmart(brandPrice)}
                </span>
              </td>
              <td className="px-4 py-4 text-center">
                <span className="inline-flex items-center justify-center w-32 h-10 rounded-full bg-slate-100 font-bold border border-slate-400 text-gray-800">
                  {formatPriceSmart(comparisonPrice)}
                </span>
              </td>
              <td className="px-4 py-4 text-center">
                <span className={`inline-flex items-center justify-center min-w-[70px] h-8 px-3 text-sm font-bold rounded-full ${isCheaper ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {difference > 0.00001 ? '+' : ''}{formatPriceSmart(difference)}
                </span>
              </td>
              <td className="px-4 py-4 text-center">
                <span className={`inline-flex items-center justify-center min-w-[70px] h-8 px-3 text-sm font-bold rounded-full ${isCheaper ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {percentageDifference >= 0 ? '+' : ''}{percentageDifference.toFixed(2)}%
                </span>
              </td>
              {isAvgMode && index === 0 ? (
                <td className="px-4 py-4 align-middle text-center" rowSpan={products.length}>
                  <div className="grid grid-cols-2 gap-1.5 max-w-[240px] mx-auto p-2">
                    {Array.from(selectedDistributors).sort().map((d: string) => {
                      const imageUrl = distributorImages[getOriginalBrandName(d)];
                      return (
                        <div key={d} className="flex items-center justify-center gap-2 px-3 h-8 text-xs font-bold rounded-full truncate distributor-pill" style={{ backgroundColor: (distributorColors[d] || distributorColors.DEFAULT).background, color: (distributorColors[d] || distributorColors.DEFAULT).border } as React.CSSProperties}>
                           <DistributorLogo distributorName={d} imageUrl={imageUrl} />
                           <span className="truncate">{d}</span>
                        </div>
                      )
                    })}
                  </div>
                </td>
              ) : !isAvgMode && (
                <td className="px-4 py-4 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-1 max-w-[200px] mx-auto">
                    {distributors.map((d) => {
                      const imageUrl = distributorImages[getOriginalBrandName(d)];
                      return (
                        <div key={d} className="inline-flex items-center justify-center gap-2 px-3 h-8 text-xs font-bold rounded-full truncate distributor-pill" style={{ backgroundColor: (distributorColors[d] || distributorColors.DEFAULT).background, color: (distributorColors[d] || distributorColors.DEFAULT).border } as React.CSSProperties}>
                           <DistributorLogo distributorName={d} imageUrl={imageUrl} />
                           <span className="truncate">{d}</span>
                        </div>
                      )
                    })}
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const renderComparisonSharePreview = () => {
    const orderedBrands: BrandName[] = [activeBrand, ...brands.filter(b => b !== activeBrand)];
    const formatDifference = (diff: number | null) => {
        if (diff === null || isNaN(diff) || Math.abs(diff) < 0.0001) return '0,00';
        const sign = diff > 0 ? '+' : '';
        return sign + formatPriceSmart(diff);
    };

    return (
        <table className="w-full text-sm text-left text-gray-700 table-fixed">
            <thead className="text-base text-white uppercase bg-green-600">
                <tr className="[&>th]:px-2 [&>th]:py-3 [&>th]:font-bold [&>th]:tracking-wider [&>th]:[text-shadow:0_1px_1px_rgba(0,0,0,0.3)]">
                    <th scope="col" className="text-left bg-green-600 w-[15%] px-4">PRODUTO</th>
                    {orderedBrands.map(brand => (
                        <th key={brand} scope="col" className="text-center w-[15%]">
                            <BrandHeaderPill brand={brand} />
                        </th>
                    ))}
                    <th scope="col" className="text-center w-[25%] whitespace-nowrap">
                        <div className="inline-flex items-center justify-center rounded-lg" role="group">
                            <span className="bg-green-600 text-white font-bold text-xs px-3 py-1.5 rounded-l-lg">
                                Precin
                            </span>
                            <span className="bg-white text-green-800 font-bold text-xs px-3 py-1.5 rounded-r-lg border-y border-r border-gray-200">
                                {isAvgMode ? 'Média' : 'Mínima'}
                            </span>
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody>
                {products.map((produto, index) => {
                    const referencePrice = allBrandPrices[activeBrand]?.[produto] || 0;
                    const pricesForProduct = brands.map(b => allBrandPrices[b]?.[produto]).filter(p => p !== undefined && p > 0) as number[];
                    const userMinPrice = pricesForProduct.length > 0 ? Math.min(...pricesForProduct) : 0;
                    const marketComparisonPrice = isAvgMode ? (averagePrices[produto] || 0) : (marketMinPrices[produto]?.minPrice || 0);

                    const marketDifference = (referencePrice > 0 && marketComparisonPrice > 0) ? marketComparisonPrice - referencePrice : null;
                    let marketPillClasses = 'bg-slate-100 border-slate-400 text-gray-800';
                    if (marketDifference !== null) {
                        if (marketDifference < -0.00001) marketPillClasses = 'bg-green-100 text-green-800 border-green-400';
                        else if (marketDifference > 0.00001) marketPillClasses = 'bg-red-100 text-red-800 border-red-400';
                    }
                    const cellBorderClass = index < products.length - 1 ? 'border-b border-gray-200' : '';

                    return (
                        <tr key={produto} className={`align-middle ${cellBorderClass}`}>
                            <td className="px-4 py-4 font-semibold text-gray-800 whitespace-nowrap bg-white">{produto}</td>
                            {orderedBrands.map(brand => {
                                const brandPrice = allBrandPrices[brand]?.[produto] || 0;
                                if (brand === activeBrand) {
                                    const isCheapest = brandPrice > 0 && brandPrice === userMinPrice;
                                    const isMoreExpensive = userMinPrice > 0 && brandPrice > userMinPrice;
                                    const activePillClasses = isCheapest ? 'bg-green-200 border-green-500 text-green-900' : isMoreExpensive ? 'bg-red-100 border-red-500 text-red-900' : 'bg-gray-50 border-gray-300 text-gray-900';
                                    return (
                                        <td key={brand} className="px-2 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center w-28 h-10 rounded-full p-2 border font-bold ${activePillClasses}`}>
                                                {brandPrice > 0 ? formatPriceSmart(brandPrice) : '-'}
                                            </span>
                                        </td>
                                    );
                                } else {
                                    const difference = (brandPrice > 0 && referencePrice > 0) ? brandPrice - referencePrice : null;
                                    let inactivePillClasses = 'bg-slate-100 border-slate-400 text-gray-800';
                                    if (difference !== null) {
                                        if (difference < -0.00001) inactivePillClasses = 'bg-green-100 text-green-800 border-green-400';
                                        else if (difference > 0.00001) inactivePillClasses = 'bg-red-100 text-red-800 border-red-400';
                                    }
                                    return (
                                        <td key={brand} className="px-2 py-4 text-center">
                                            <div className="flex justify-center items-center gap-1.5">
                                                <span className={`inline-flex items-center justify-center w-28 h-10 rounded-full p-2 border font-bold ${inactivePillClasses}`}>
                                                    {brandPrice > 0 ? formatPriceSmart(brandPrice) : '-'}
                                                </span>
                                                {difference !== null && (
                                                    <span className={`flex-shrink-0 inline-flex items-center justify-center w-14 h-6 text-xs font-bold rounded-full ${difference < -0.00001 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {formatDifference(difference)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    );
                                }
                            })}
                            <td className="px-2 py-4 text-center">
                                <div className="flex justify-center items-center gap-1.5">
                                    <span className={`inline-flex items-center justify-center w-28 h-10 rounded-full p-2 border font-bold ${marketPillClasses}`}>
                                        {marketComparisonPrice > 0 ? formatPriceSmart(marketComparisonPrice) : '-'}
                                    </span>
                                    {marketDifference !== null && (
                                        <span className={`flex-shrink-0 inline-flex items-center justify-center w-14 h-6 text-xs font-bold rounded-full ${marketDifference < -0.00001 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {formatDifference(marketDifference)}
                                        </span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
  };


  return (
    <div ref={quoteTableRef}>
      <div className={isSharePreview ? "px-6 pt-6 pb-4" : "p-4 sm:p-6"}>
          <h2 className={isSharePreview ? "text-2xl font-black text-gray-800 tracking-wider" : "text-xl sm:text-2xl font-bold text-gray-800 tracking-wide"}>
              COTAÇÃO BANDEIRAS
          </h2>
      </div>

      {!isSharePreview && (
        <div className="px-4 sm:px-6 pb-3 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
            {renderBrandTabs()}
            <div className="flex items-center gap-3 flex-wrap">
                <button onClick={onSaveQuote} disabled={isSaving || isSaveSuccess}
                  className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 transition-all disabled:opacity-70 text-sm ${isSaveSuccess ? 'bg-green-600 text-white' : 'bg-white text-green-800 hover:bg-gray-50'}`}
                >
                  {isSaving ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : isSaveSuccess ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  )}
                  <span>{isSaving ? 'Salvando...' : isSaveSuccess ? 'Salvo!' : 'Salvar Cotação'}</span>
                </button>
                <button onClick={onOpenShareModal} disabled={isSharing}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-green-800 font-semibold rounded-lg shadow-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 transition-all disabled:opacity-50 disabled:cursor-wait text-sm"
                >
                  {isSharing ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  )}
                  <span>Compartilhar</span>
                </button>
            </div>
        </div>
      )}

      <div className="overflow-x-auto">
        {isSharePreview 
          ? isComparisonMode ? renderComparisonSharePreview() : renderSharePreview()
          : isComparisonMode ? renderComparisonView() : renderSingleBrandView()
        }
      </div>
    </div>
  );
};
export default CustomerQuoteTable;
