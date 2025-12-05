import React from 'react';
import type { HistoryFilterPanelProps } from '../../types';
import { FUEL_PRODUCTS } from '../../constants/fuels';

const HistoryFilterPanel: React.FC<HistoryFilterPanelProps> = ({
    selectedFuelType, onFuelTypeChange,
    availableBases, selectedBase, onBaseChange,
    pendingStartDate, onPendingStartDateChange,
    pendingEndDate, onPendingEndDateChange,
    onApplyDates, loading
}) => {
    return (
        <div className="p-3 mb-6 bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center gap-4 flex-wrap">
                <div className="relative group bg-green-50 rounded-full shadow-sm border border-green-400 hover:bg-green-100 transition-all">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-green-800 pointer-events-none">Combustível</span>
                    <select id="fuel-type-select" value={selectedFuelType} onChange={(e) => onFuelTypeChange(e.target.value)} className="appearance-none bg-transparent w-full pl-24 pr-10 py-2 font-semibold text-green-800 focus:outline-none" disabled={loading}>
                        {[...FUEL_PRODUCTS].map(fuel => (<option key={fuel} value={fuel}>{fuel}</option>))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                        <svg className="w-4 h-4 text-green-600 group-hover:text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
                <div className="relative group bg-green-50 rounded-full shadow-sm border border-green-400 hover:bg-green-100 transition-all">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-green-800 pointer-events-none">Base</span>
                    <select id="base-select" value={selectedBase} onChange={(e) => onBaseChange(e.target.value)} className="appearance-none bg-transparent w-full pl-14 pr-10 py-2 font-semibold text-green-800 focus:outline-none" disabled={loading || availableBases.length === 0}>
                        {availableBases.map(base => (<option key={base} value={base}>{base}</option>))}
                    </select>
                     <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                        <svg className="w-4 h-4 text-green-600 group-hover:text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
                 <div className="relative group bg-green-50 rounded-full shadow-sm border border-green-400 hover:bg-green-100 transition-all">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-green-800 pointer-events-none">Início</span>
                    <input type="date" id="start-date" value={pendingStartDate} onChange={(e) => onPendingStartDateChange(e.target.value)} onBlur={onApplyDates} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} className="appearance-none bg-transparent w-full pl-16 pr-2 py-2 font-semibold text-green-800 focus:outline-none custom-date-picker-style" disabled={loading} />
                </div>
                <div className="relative group bg-green-50 rounded-full shadow-sm border border-green-400 hover:bg-green-100 transition-all">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-green-800 pointer-events-none">Fim</span>
                    <input type="date" id="end-date" value={pendingEndDate} onChange={(e) => onPendingEndDateChange(e.target.value)} onBlur={onApplyDates} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} className="appearance-none bg-transparent w-full pl-12 pr-2 py-2 font-semibold text-green-800 focus:outline-none custom-date-picker-style" disabled={loading} />
                </div>
            </div>
        </div>
    );
};

export default HistoryFilterPanel;