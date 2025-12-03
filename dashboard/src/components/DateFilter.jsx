import React, { useState, useEffect, useRef, useMemo } from 'react';

// DateFilter component for filtering dashboard data by date range
const DateFilter = ({ onFilterChange, initialStartDate = null, initialEndDate = null, initialViewMode = 'month' }) => {
    const [viewMode, setViewMode] = useState(initialViewMode); // 'month' ou 'day'
    const [startDate, setStartDate] = useState(() => initialStartDate || '');
    const [endDate, setEndDate] = useState(() => initialEndDate || '');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        // Inicializar com o mês atual no formato YYYY-MM
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [error, setError] = useState('');
    const lastFilterRef = useRef(null);
    const isInternalUpdateRef = useRef(false);
    
    // Sincronizar viewMode com props
    useEffect(() => {
        if (initialViewMode !== viewMode) {
            setViewMode(initialViewMode);
        }
    }, [initialViewMode, viewMode]);
    
    // Criar chave estável para sincronização de datas
    const syncDependencyKey = useMemo(() => {
        return JSON.stringify({
            initialStartDate: initialStartDate || null,
            initialEndDate: initialEndDate || null
        });
    }, [initialStartDate, initialEndDate]);

    // Sincronizar datas quando vierem do componente pai (mas não quando for atualização interna)
    useEffect(() => {
        if (isInternalUpdateRef.current) {
            isInternalUpdateRef.current = false;
            return;
        }
        
        // Atualizar apenas se os valores do pai forem diferentes dos atuais
        if (initialStartDate !== null && initialStartDate !== startDate) {
            setStartDate(initialStartDate);
        } else if (initialStartDate === null && startDate !== '') {
            setStartDate('');
        }
        
        if (initialEndDate !== null && initialEndDate !== endDate) {
            setEndDate(initialEndDate);
        } else if (initialEndDate === null && endDate !== '') {
            setEndDate('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncDependencyKey]);

    // Criar uma chave estável para as dependências do filtro
    const filterDependencyKey = useMemo(() => {
        return JSON.stringify({
            viewMode,
            startDate: startDate || null,
            endDate: endDate || null,
            selectedMonth: selectedMonth || null
        });
    }, [viewMode, startDate, endDate, selectedMonth]);

    // Aplicar filtro quando ambas as datas estiverem preenchidas (modo mensal) ou quando mês for selecionado (modo diário)
    useEffect(() => {
        if (viewMode === 'day') {
            // No modo diário, usar o mês selecionado
            if (selectedMonth) {
                const [year, month] = selectedMonth.split('-').map(Number);
                const firstDay = new Date(year, month - 1, 1);
                const lastDay = new Date(year, month, 0);
                
                const filterData = {
                    startDate: firstDay.toISOString().split('T')[0],
                    endDate: lastDay.toISOString().split('T')[0],
                    compareMode: false,
                    compareStartDate: null,
                    compareEndDate: null,
                    groupBy: 'day'
                };
                
                // Só aplicar se o filtro realmente mudou
                const filterKey = JSON.stringify(filterData);
                if (lastFilterRef.current !== filterKey) {
                    lastFilterRef.current = filterKey;
                    onFilterChange(filterData);
                }
            }
        } else {
            // No modo mensal, só aplicar o filtro se ambas as datas estiverem preenchidas
            if (startDate && endDate) {
                const filterData = {
                    startDate: startDate,
                    endDate: endDate,
                    compareMode: false,
                    compareStartDate: null,
                    compareEndDate: null,
                    groupBy: 'month'
                };
                
                // Só aplicar se o filtro realmente mudou
                const filterKey = JSON.stringify(filterData);
                if (lastFilterRef.current !== filterKey) {
                    lastFilterRef.current = filterKey;
                    onFilterChange(filterData);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterDependencyKey]);

    const handleViewModeChange = (mode) => {
        isInternalUpdateRef.current = true;
        setViewMode(mode);
        setStartDate('');
        setEndDate('');
        setError('');
        
        // Se mudar para modo diário, aplicar filtro com mês atual
        if (mode === 'day' && selectedMonth) {
            const [year, month] = selectedMonth.split('-').map(Number);
            const firstDay = new Date(year, month - 1, 1);
            const lastDay = new Date(year, month, 0);
            
            const filterData = {
                startDate: firstDay.toISOString().split('T')[0],
                endDate: lastDay.toISOString().split('T')[0],
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'day'
            };
            
            lastFilterRef.current = JSON.stringify(filterData);
            onFilterChange(filterData);
        }
    };
    
    const handleMonthChange = (e) => {
        const month = e.target.value;
        isInternalUpdateRef.current = true;
        setSelectedMonth(month);
        
        // Aplicar filtro imediatamente quando o mês mudar no modo diário
        if (viewMode === 'day' && month) {
            const [year, monthNum] = month.split('-').map(Number);
            const firstDay = new Date(year, monthNum - 1, 1);
            const lastDay = new Date(year, monthNum, 0);
            
            const filterData = {
                startDate: firstDay.toISOString().split('T')[0],
                endDate: lastDay.toISOString().split('T')[0],
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'day'
            };
            
            lastFilterRef.current = JSON.stringify(filterData);
            onFilterChange(filterData);
        }
    };

    const handleStartDateChange = (e) => {
        const date = e.target.value;
        isInternalUpdateRef.current = true;
        setStartDate(date);
        setError('');

        // Validar se data inicial é maior que final
        if (date && endDate && date > endDate) {
            setError('Data inicial não pode ser maior que data final');
        }
    };

    const handleEndDateChange = (e) => {
        const date = e.target.value;
        isInternalUpdateRef.current = true;
        setEndDate(date);
        setError('');

        // Validar se data inicial é maior que final
        if (startDate && date && startDate > date) {
            setError('Data inicial não pode ser maior que data final');
        }
    };

    const clearFilter = () => {
        isInternalUpdateRef.current = true;
        setStartDate('');
        setEndDate('');
        setError('');
        
        // Se estiver no modo diário, resetar para mês atual
        if (viewMode === 'day') {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            setSelectedMonth(currentMonth);
            
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            const filterData = {
                startDate: firstDay.toISOString().split('T')[0],
                endDate: lastDay.toISOString().split('T')[0],
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'day'
            };
            onFilterChange(filterData);
        } else {
            // Aplicar filtro limpo para buscar todos os dados
            const filterData = {
                startDate: null,
                endDate: null,
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'month'
            };
            onFilterChange(filterData);
        }
    };

    // Verificar se há filtros ativos
    const hasActiveFilters = viewMode === 'day' ? selectedMonth : (startDate && endDate);

    return (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl shadow-md border border-slate-200 p-5 mb-6">
            <div className="flex flex-wrap items-center gap-4">
                {/* Seletor de Modo */}
                <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Modo:</label>
                    <div className="flex gap-2 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                        <button
                            type="button"
                            onClick={() => handleViewModeChange('month')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                viewMode === 'month'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            Mensal
                        </button>
                        <button
                            type="button"
                            onClick={() => handleViewModeChange('day')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                viewMode === 'day'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            Diário
                        </button>
                    </div>
                </div>

                {/* Período - Modo Mensal */}
                {viewMode === 'month' && (
                    <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 border border-slate-200 shadow-sm">
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <input
                            type="date"
                            value={startDate}
                            onChange={handleStartDateChange}
                            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-slate-500">até</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={handleEndDateChange}
                            min={startDate || ''}
                            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                )}
                
                {/* Seletor de Mês - Modo Diário */}
                {viewMode === 'day' && (
                    <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 border border-slate-200 shadow-sm">
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Mês:</label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={handleMonthChange}
                            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                )}

                {/* Mensagem de Erro */}
                {error && (
                    <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Botão Limpar */}
                {hasActiveFilters && (
                    <button
                        onClick={clearFilter}
                        className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-all shadow-sm hover:shadow"
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
