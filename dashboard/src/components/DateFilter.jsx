import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// DateFilter component for filtering dashboard data by date range
const DateFilter = ({ onFilterChange, initialStartDate = null, initialEndDate = null }) => {
    // Persistir viewMode no localStorage para manter a seleção após atualizações
    const getInitialViewMode = () => {
        const saved = localStorage.getItem('dateFilter_viewMode');
        return saved === 'day' ? 'day' : 'month';
    };
    
    const [viewMode, setViewMode] = useState(getInitialViewMode); // 'month' ou 'day'
    const [startDate, setStartDate] = useState(initialStartDate || '');
    const [endDate, setEndDate] = useState(initialEndDate || '');
    const [compareMode, setCompareMode] = useState(false);
    const [compareStartDate, setCompareStartDate] = useState('');
    const [compareEndDate, setCompareEndDate] = useState('');
    const [error, setError] = useState('');
    const debounceTimerRef = useRef(null);
    const lastFilterRef = useRef(null);

    // Função para validar se o período não ultrapassa 1 mês (modo diário)
    const validateDayMode = (start, end) => {
        if (!start || !end) return true;
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 31; // Máximo 31 dias
    };

    // Função para obter o primeiro e último dia do mês
    const getMonthRange = (yearMonth) => {
        if (!yearMonth || yearMonth.length < 7) return { start: '', end: '' };
        try {
            const [year, month] = yearMonth.split('-');
            if (!year || !month) return { start: '', end: '' };
            const start = `${year}-${month}-01`;
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const end = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
            return { start, end };
        } catch (e) {
            return { start: '', end: '' };
        }
    };

    // Função para calcular diferença em dias
    const getDaysDifference = (start, end) => {
        if (!start || !end) return 0;
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const handleViewModeChange = (mode) => {
        // Limpar qualquer debounce pendente
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        lastFilterRef.current = null; // Reset para forçar atualização
        
        // Salvar o modo no localStorage
        localStorage.setItem('dateFilter_viewMode', mode);
        
        if (mode === 'day') {
            // No modo diário, definir automaticamente o mês atual
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const start = firstDay.toISOString().split('T')[0];
            const end = lastDay.toISOString().split('T')[0];
            
            // Atualizar todos os estados de uma vez
            setViewMode('day');
            setError('');
            setStartDate(start);
            setEndDate(end);
            setCompareStartDate('');
            setCompareEndDate('');
            setCompareMode(false);
            
            // Aplicar filtro IMEDIATAMENTE (sem debounce) quando muda o modo
            const filterData = {
                startDate: start,
                endDate: end,
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'day'
            };
            lastFilterRef.current = JSON.stringify(filterData);
            onFilterChange(filterData);
        } else {
            // No modo mensal, limpar datas
            setViewMode('month');
            setError('');
            setStartDate('');
            setEndDate('');
            setCompareStartDate('');
            setCompareEndDate('');
            setCompareMode(false);
            
            // Aplicar filtro IMEDIATAMENTE (sem debounce) quando muda o modo
            const filterData = {
                startDate: null,
                endDate: null,
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'month'
            };
            lastFilterRef.current = JSON.stringify(filterData);
            onFilterChange(filterData);
        }
    };

    const handleStartDateChange = (e) => {
        const date = e.target.value;
        setError('');

        let newEndDate = endDate;

        // No modo diário, se não houver endDate e uma data foi selecionada, definir endDate como último dia do mês
        if (viewMode === 'day' && date && !endDate) {
            const { end } = getMonthRange(date.substring(0, 7));
            newEndDate = end;
            setEndDate(end);
        }

        setStartDate(date);

        // Validar apenas se ambas as datas estiverem preenchidas
        if (date && newEndDate) {
            if (viewMode === 'day' && !validateDayMode(date, newEndDate)) {
                setError('No modo diário, o período não pode ultrapassar 1 mês');
                // Ainda assim, aplicar o filtro para que o usuário veja o erro
                applyFilter(date, newEndDate, compareMode, compareStartDate, compareEndDate);
                return;
            }
            if (date > newEndDate) {
                setError('Data inicial não pode ser maior que data final');
                // Ainda assim, aplicar o filtro para que o usuário veja o erro
                applyFilter(date, newEndDate, compareMode, compareStartDate, compareEndDate);
                return;
            }
        }

        // Aplicar filtro sempre que uma data for alterada (mesmo que apenas uma esteja preenchida)
        applyFilter(date, newEndDate, compareMode, compareStartDate, compareEndDate);
    };

    const handleEndDateChange = (e) => {
        const date = e.target.value;
        setEndDate(date);
        setError('');

        // Validar apenas se ambas as datas estiverem preenchidas
        if (startDate && date) {
            if (viewMode === 'day' && !validateDayMode(startDate, date)) {
                setError('No modo diário, o período não pode ultrapassar 1 mês');
                // Ainda assim, aplicar o filtro para que o usuário veja o erro
                applyFilter(startDate, date, compareMode, compareStartDate, compareEndDate);
                return;
            }
            if (startDate > date) {
                setError('Data inicial não pode ser maior que data final');
                // Ainda assim, aplicar o filtro para que o usuário veja o erro
                applyFilter(startDate, date, compareMode, compareStartDate, compareEndDate);
                return;
            }
        }

        // Aplicar filtro sempre que uma data for alterada
        applyFilter(startDate, date, compareMode, compareStartDate, compareEndDate);
    };

    const handleCompareStartDateChange = (e) => {
        const date = e.target.value;
        setError('');

        let newCompareEndDate = compareEndDate;

        // No modo diário, se não houver compareEndDate e uma data foi selecionada, definir compareEndDate como último dia do mês
        if (viewMode === 'day' && date && !compareEndDate) {
            const { end } = getMonthRange(date.substring(0, 7));
            newCompareEndDate = end;
            setCompareEndDate(end);
        }

        setCompareStartDate(date);

        // Validar apenas se ambas as datas estiverem preenchidas
        if (date && newCompareEndDate) {
            if (viewMode === 'day' && !validateDayMode(date, newCompareEndDate)) {
                setError('No modo diário, o período de comparação não pode ultrapassar 1 mês');
                return;
            }
            if (date > newCompareEndDate) {
                setError('Data inicial de comparação não pode ser maior que data final');
                return;
            }
        }

        // Aplicar filtro com a data final atualizada (se necessário)
        applyFilter(startDate, endDate, compareMode, date, newCompareEndDate);
    };

    const handleCompareEndDateChange = (e) => {
        const date = e.target.value;
        setCompareEndDate(date);
        setError('');

        // Validar apenas se ambas as datas estiverem preenchidas
        if (compareStartDate && date) {
            if (viewMode === 'day' && !validateDayMode(compareStartDate, date)) {
                setError('No modo diário, o período de comparação não pode ultrapassar 1 mês');
                return;
            }
            if (compareStartDate > date) {
                setError('Data inicial de comparação não pode ser maior que data final');
                return;
            }
        }

        applyFilter(startDate, endDate, compareMode, compareStartDate, date);
    };

    const handleCompareModeToggle = (e) => {
        const enabled = e.target.checked;
        setCompareMode(enabled);
        setError('');
        if (!enabled) {
            setCompareStartDate('');
            setCompareEndDate('');
        }
        applyFilter(startDate, endDate, enabled, compareStartDate, compareEndDate);
    };

    // Memoizar a função applyFilter para evitar recriações
    // IMPORTANTE: viewMode deve estar nas dependências para que o groupBy seja atualizado corretamente
    const applyFilter = useCallback((start, end, compare, compStart, compEnd) => {
        // Sempre aplicar o filtro quando chamado (mesmo com valores vazios para limpar)
        const filterData = {
            startDate: start || null,
            endDate: end || null,
            compareMode: compare,
            compareStartDate: compStart || null,
            compareEndDate: compEnd || null,
            groupBy: viewMode === 'day' ? 'day' : 'month'
        };
        
        // Verificar se os dados realmente mudaram
        const filterKey = JSON.stringify(filterData);
        if (lastFilterRef.current === filterKey) {
            return; // Não mudou, não precisa atualizar
        }
        lastFilterRef.current = filterKey;
        
        // Limpar timer anterior se existir
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        
        // Aplicar imediatamente se ambas as datas estiverem preenchidas (ou ambas vazias)
        // Caso contrário, usar debounce para evitar múltiplas chamadas
        const hasBothDates = (start && end) || (!start && !end);
        
        if (hasBothDates) {
            // Aplicar imediatamente quando ambas as datas estão preenchidas ou ambas vazias
            onFilterChange(filterData);
        } else {
            // Debounce apenas quando uma data está preenchida (mas ainda aplicar)
            debounceTimerRef.current = setTimeout(() => {
                onFilterChange(filterData);
            }, 300);
        }
    }, [viewMode, onFilterChange]);

    const clearFilter = useCallback(() => {
        setStartDate('');
        setEndDate('');
        setCompareMode(false);
        setCompareStartDate('');
        setCompareEndDate('');
        setError('');
        lastFilterRef.current = null; // Reset last filter
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        onFilterChange({
            startDate: null,
            endDate: null,
            compareMode: false,
            compareStartDate: null,
            compareEndDate: null,
            groupBy: viewMode === 'day' ? 'day' : 'month'
        });
    }, [viewMode, onFilterChange]);
    
    // Cleanup do debounce timer quando o componente desmontar
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Aplicar filtro inicial quando o componente montar (apenas uma vez)
    const hasInitialized = useRef(false);
    useEffect(() => {
        if (hasInitialized.current) return; // Já inicializou, não executar novamente
        hasInitialized.current = true;
        
        // Usar o viewMode salvo ou padrão
        const initialViewMode = getInitialViewMode();
        
        if (initialViewMode === 'day') {
            // Se o modo inicial for diário, definir datas do mês atual
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const start = firstDay.toISOString().split('T')[0];
            const end = lastDay.toISOString().split('T')[0];
            
            setStartDate(start);
            setEndDate(end);
            
            const filterData = {
                startDate: start,
                endDate: end,
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'day'
            };
            lastFilterRef.current = JSON.stringify(filterData);
            onFilterChange(filterData);
        } else {
            const filterData = {
                startDate: null,
                endDate: null,
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'month'
            };
            
            // Aplicar filtro inicial apenas uma vez
            lastFilterRef.current = JSON.stringify(filterData);
            onFilterChange(filterData);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Array vazio - executar apenas uma vez no mount

    const hasActiveFilters = startDate || compareMode;
    const daysDiff = getDaysDifference(startDate, endDate);
    const compareDaysDiff = getDaysDifference(compareStartDate, compareEndDate);

    return (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl shadow-md border border-slate-200 p-5 mb-6">
            {/* Seletor de Modo */}
            <div className="flex items-center gap-4 mb-4">
                <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Modo de Visualização:</label>
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
                {viewMode === 'day' && (
                    <span className="text-xs text-slate-500 italic">
                        (Máximo 1 mês por período)
                    </span>
                )}
            </div>

            {/* Mensagem de Erro */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
                {/* Período Principal */}
                <div className="flex flex-col gap-2 bg-white rounded-lg px-4 py-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Período Principal:</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            key={`start-${viewMode}`}
                            type="date"
                            value={startDate}
                            onChange={handleStartDateChange}
                            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            disabled={false}
                        />
                        <span className="text-slate-500">até</span>
                        <input
                            key={`end-${viewMode}`}
                            type="date"
                            value={endDate}
                            onChange={handleEndDateChange}
                            min={startDate || ''}
                            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            disabled={false}
                        />
                        {viewMode === 'day' && daysDiff > 0 && (
                            <span className="text-xs text-slate-500">({daysDiff} dias)</span>
                        )}
                    </div>
                </div>

                {/* Checkbox de Comparação */}
                <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 border border-slate-200 shadow-sm">
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
                    <div className="flex flex-col gap-2 bg-white rounded-lg px-4 py-3 border border-slate-200 shadow-sm animate-in fade-in duration-200">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Período de Comparação:</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={compareStartDate}
                                onChange={handleCompareStartDateChange}
                                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                disabled={false}
                            />
                            <span className="text-slate-500">até</span>
                            <input
                                type="date"
                                value={compareEndDate}
                                onChange={handleCompareEndDateChange}
                                min={compareStartDate || ''}
                                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                disabled={false}
                            />
                            {viewMode === 'day' && compareDaysDiff > 0 && (
                                <span className="text-xs text-slate-500">({compareDaysDiff} dias)</span>
                            )}
                        </div>
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
