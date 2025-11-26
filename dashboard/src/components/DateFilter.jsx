import React, { useState } from 'react';

const DateFilter = ({ onFilterChange, initialStartDate = null, initialEndDate = null }) => {
    const [startDate, setStartDate] = useState(initialStartDate || '');
    const [endDate, setEndDate] = useState(initialEndDate || '');
    const [compareMode, setCompareMode] = useState(false);
    const [compareStartDate, setCompareStartDate] = useState('');
    const [compareEndDate, setCompareEndDate] = useState('');

    // Função para obter o primeiro e último dia do mês
    const getMonthRange = (yearMonth) => {
        if (!yearMonth) return { start: '', end: '' };
        const [year, month] = yearMonth.split('-');
        const start = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const end = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
        return { start, end };
    };

    const handleStartMonthChange = (e) => {
        const yearMonth = e.target.value;
        setStartDate(yearMonth);
        if (yearMonth) {
            const { start, end } = getMonthRange(yearMonth);
            setEndDate(end);
            applyFilter(start, end, compareMode, compareStartDate, compareEndDate);
        } else {
            setEndDate('');
            applyFilter('', '', compareMode, compareStartDate, compareEndDate);
        }
    };

    const handleCompareStartMonthChange = (e) => {
        const yearMonth = e.target.value;
        setCompareStartDate(yearMonth);
        if (yearMonth) {
            const { start, end } = getMonthRange(yearMonth);
            setCompareEndDate(end);
            applyFilter(startDate, endDate, compareMode, start, end);
        } else {
            setCompareEndDate('');
            applyFilter(startDate, endDate, compareMode, '', '');
        }
    };

    const handleCompareModeToggle = (e) => {
        const enabled = e.target.checked;
        setCompareMode(enabled);
        if (!enabled) {
            setCompareStartDate('');
            setCompareEndDate('');
        }
        applyFilter(startDate, endDate, enabled, compareStartDate, compareEndDate);
    };

    const applyFilter = (start, end, compare, compStart, compEnd) => {
        onFilterChange({
            startDate: start || null,
            endDate: end || null,
            compareMode: compare,
            compareStartDate: compStart || null,
            compareEndDate: compEnd || null
        });
    };

    const clearFilter = () => {
        setStartDate('');
        setEndDate('');
        setCompareMode(false);
        setCompareStartDate('');
        setCompareEndDate('');
        onFilterChange({
            startDate: null,
            endDate: null,
            compareMode: false,
            compareStartDate: null,
            compareEndDate: null
        });
    };

    const hasActiveFilters = startDate || compareMode;

    return (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl shadow-md border border-slate-200 p-5 mb-6">
            <div className="flex flex-wrap items-center gap-4">
                {/* Período Principal */}
                <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-slate-200 shadow-sm">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Período Principal:</label>
                    <input
                        type="month"
                        value={startDate}
                        onChange={handleStartMonthChange}
                        className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all min-w-[140px]"
                        placeholder="MM/AAAA"
                    />
                </div>

                {/* Checkbox de Comparação */}
                <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2.5 border border-slate-200 shadow-sm">
                    <input
                        type="checkbox"
                        id="compareMode"
                        checked={compareMode}
                        onChange={handleCompareModeToggle}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="compareMode" className="text-sm font-semibold text-slate-700 cursor-pointer whitespace-nowrap">
                        Comparar com outro período
                    </label>
                </div>

                {/* Período de Comparação */}
                {compareMode && (
                    <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-slate-200 shadow-sm animate-in fade-in duration-200">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Período de Comparação:</label>
                        <input
                            type="month"
                            value={compareStartDate}
                            onChange={handleCompareStartMonthChange}
                            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all min-w-[140px]"
                            placeholder="MM/AAAA"
                        />
                    </div>
                )}

                {/* Botão Limpar */}
                {hasActiveFilters && (
                    <button
                        onClick={clearFilter}
                        className="ml-auto flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-800 border border-slate-300 rounded-lg transition-all shadow-sm hover:shadow"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Limpar Filtros
                    </button>
                )}
            </div>
        </div>
    );
};

export default DateFilter;

