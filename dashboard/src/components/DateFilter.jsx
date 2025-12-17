import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getLast3Months } from '../utils/dateUtils';

// DateFilter component for filtering dashboard data by date range
const DateFilter = ({ onFilterChange, initialStartDate = null, initialEndDate = null, initialViewMode = 'month' }) => {
    // Calcular últimos 3 meses como padrão se não houver datas iniciais
    const defaultDates = useMemo(() => {
        if (initialStartDate && initialEndDate) {
            return { startDate: initialStartDate, endDate: initialEndDate };
        }
        return getLast3Months();
    }, [initialStartDate, initialEndDate]);
    
    const [viewMode, setViewMode] = useState(initialViewMode); // 'month' ou 'day'
    const [startDate, setStartDate] = useState(() => initialStartDate || defaultDates.startDate);
    const [endDate, setEndDate] = useState(() => initialEndDate || defaultDates.endDate);
    const [selectedMonth, setSelectedMonth] = useState(''); // Inicializar vazio - usuário deve selecionar
    const [error, setError] = useState('');
    const lastFilterRef = useRef(null);
    const isInternalUpdateRef = useRef(false);
    const hasInitialized = useRef(false); // Flag para garantir que só inicialize uma vez
    
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

    // Sincronizar datas quando vierem do componente pai
    useEffect(() => {
        const wasInternalUpdate = isInternalUpdateRef.current;
        if (wasInternalUpdate) {
            isInternalUpdateRef.current = false;
        }
        
        // Se estiver no modo diário e houver datas iniciais, sempre sincronizar o selectedMonth
        // Isso garante que o campo mostre o mês correto mesmo após o filtro ser aplicado
        // IMPORTANTE: Sincronizar mesmo após atualização interna para manter o valor visível
        if (viewMode === 'day' && initialStartDate && initialEndDate) {
            try {
                // Usar parse de string para evitar problemas de timezone
                // Formato esperado: 'YYYY-MM-DD'
                const startParts = initialStartDate.split('-').map(Number);
                const endParts = initialEndDate.split('-').map(Number);
                
                if (startParts.length === 3 && endParts.length === 3) {
                    const startYear = startParts[0];
                    const startMonth = startParts[1]; // 1-12
                    const endYear = endParts[0];
                    const endMonth = endParts[1]; // 1-12
                    
                    console.log('📅 DateFilter - Verificando datas (parse direto):', { 
                        initialStartDate, 
                        initialEndDate, 
                        startYear, 
                        startMonth, 
                        endYear, 
                        endMonth
                    });
                    
                    // Verificar se as datas são do mesmo mês
                    if (startYear === endYear && startMonth === endMonth) {
                        const monthStr = `${startYear}-${String(startMonth).padStart(2, '0')}`;
                        // Sempre atualizar o selectedMonth quando houver datas iniciais válidas
                        // Isso mantém a sincronização quando o filtro é aplicado pelo componente pai
                        // IMPORTANTE: Sempre sincronizar quando há datas, independente do valor atual
                        if (monthStr !== selectedMonth) {
                            console.log('📅 DateFilter - Sincronizando selectedMonth das datas iniciais:', monthStr, '(atual:', selectedMonth, ', wasInternal:', wasInternalUpdate, ')');
                            setSelectedMonth(monthStr);
                        } else {
                            console.log('📅 DateFilter - selectedMonth já está sincronizado:', monthStr);
                        }
                    } else {
                        console.log('📅 DateFilter - Datas não são do mesmo mês:', {
                            sameYear: startYear === endYear,
                            sameMonth: startMonth === endMonth
                        });
                    }
                }
            } catch (e) {
                console.error('Erro ao sincronizar selectedMonth:', e);
            }
        } else if (viewMode === 'day' && (!initialStartDate || !initialEndDate)) {
            // Se não houver datas iniciais no modo diário, limpar o selectedMonth
            // Mas só se não for uma atualização interna (para não limpar quando o usuário está selecionando)
            // E só limpar se realmente não houver datas (não limpar durante a transição)
            if (selectedMonth && !wasInternalUpdate && !initialStartDate && !initialEndDate) {
                console.log('📅 DateFilter - Limpando selectedMonth (sem datas iniciais)');
                setSelectedMonth('');
            }
        }
        
        // Sincronizar startDate e endDate apenas se não for atualização interna
        if (wasInternalUpdate) {
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
    }, [syncDependencyKey, viewMode]); // Não incluir selectedMonth para evitar loops

    // useEffect separado para sincronizar selectedMonth quando as datas iniciais mudarem
    // Isso garante que o campo mostre o mês correto quando os dados carregam
    // IMPORTANTE: Este useEffect é apenas para modo diário (viewMode === 'day')
    useEffect(() => {
        // Apenas processar no modo diário
        if (viewMode !== 'day') {
            return; // No modo mensal, não precisa fazer nada aqui
        }
        
        // Se estiver no modo diário e houver datas iniciais, sincronizar selectedMonth
        if (initialStartDate && initialEndDate) {
            try {
                // Usar parse de string para evitar problemas de timezone
                // Formato esperado: 'YYYY-MM-DD'
                const startParts = initialStartDate.split('-').map(Number);
                const endParts = initialEndDate.split('-').map(Number);
                
                if (startParts.length === 3 && endParts.length === 3) {
                    const startYear = startParts[0];
                    const startMonth = startParts[1]; // 1-12
                    const endYear = endParts[0];
                    const endMonth = endParts[1]; // 1-12
                    
                    // Verificar se as datas são do mesmo mês
                    if (startYear === endYear && startMonth === endMonth) {
                        const monthStr = `${startYear}-${String(startMonth).padStart(2, '0')}`;
                        // Sempre atualizar para garantir que o campo mostre o valor correto
                        if (monthStr !== selectedMonth) {
                            setSelectedMonth(monthStr);
                        }
                    }
                }
            } catch (e) {
                console.error('Erro ao sincronizar selectedMonth no useEffect separado:', e);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialStartDate, initialEndDate, viewMode]); // Executar sempre que as datas iniciais ou viewMode mudarem

    // Criar uma chave estável para as dependências do filtro
    const filterDependencyKey = useMemo(() => {
        return JSON.stringify({
            viewMode,
            startDate: startDate || null,
            endDate: endDate || null,
            selectedMonth: selectedMonth || null
        });
    }, [viewMode, startDate, endDate, selectedMonth]);

    // Inicializar com últimos 3 meses na primeira renderização se não houver datas iniciais
    useEffect(() => {
        if (!hasInitialized.current && !initialStartDate && !initialEndDate && viewMode === 'month') {
            hasInitialized.current = true;
            // Aplicar filtro inicial com últimos 3 meses
            const filterData = {
                startDate: defaultDates.startDate,
                endDate: defaultDates.endDate,
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'month'
            };
            const filterKey = JSON.stringify(filterData);
            lastFilterRef.current = filterKey;
            onFilterChange(filterData);
        }
    }, [initialStartDate, initialEndDate, viewMode, defaultDates, onFilterChange]);
    
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
        setError('');
        
        // Se mudar para modo mensal, voltar para últimos 3 meses
        if (mode === 'month') {
            setSelectedMonth('');
            const last3Months = getLast3Months();
            setStartDate(last3Months.startDate);
            setEndDate(last3Months.endDate);
            const filterData = {
                startDate: last3Months.startDate,
                endDate: last3Months.endDate,
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'month'
            };
            lastFilterRef.current = JSON.stringify(filterData);
            onFilterChange(filterData);
        } else if (mode === 'day') {
            setStartDate('');
            setEndDate('');
            // Se mudar para modo diário, limpar o filtro para não mostrar dados antigos
            // O usuário precisa selecionar um mês primeiro
            console.log('📅 DateFilter - Mudando para modo diário, limpando filtro');
            const filterData = {
                startDate: null,
                endDate: null,
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'day'
            };
            lastFilterRef.current = JSON.stringify(filterData);
            onFilterChange(filterData);
            // Não limpar selectedMonth aqui - deixar o usuário escolher
            console.log('📅 DateFilter - Filtro limpo, selectedMonth:', selectedMonth);
        }
    };
    
    const handleMonthChange = (e) => {
        const month = e.target.value;
        console.log('📅 DateFilter - handleMonthChange chamado');
        console.log('📅 DateFilter - Valor do input:', e.target.value);
        console.log('📅 DateFilter - selectedMonth atual:', selectedMonth);
        
        // Não marcar como atualização interna aqui - queremos que o useEffect sincronize depois
        setSelectedMonth(month);
        console.log('📅 DateFilter - selectedMonth atualizado para:', month);
        
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
            
            console.log('📊 DateFilter - Aplicando filtro diário:', filterData);
            lastFilterRef.current = JSON.stringify(filterData);
            onFilterChange(filterData);
            // Não marcar como atualização interna - deixar o useEffect sincronizar quando as datas chegarem
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
        
        // Se estiver no modo diário, limpar o mês selecionado
        if (viewMode === 'day') {
            setSelectedMonth('');
            // Limpar filtro quando limpar no modo diário
            const filterData = {
                startDate: null,
                endDate: null,
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'day'
            };
            lastFilterRef.current = JSON.stringify(filterData);
            onFilterChange(filterData);
        } else {
            // Voltar para últimos 3 meses quando limpar no modo mensal
            const last3Months = getLast3Months();
            setStartDate(last3Months.startDate);
            setEndDate(last3Months.endDate);
            setError('');
            const filterData = {
                startDate: last3Months.startDate,
                endDate: last3Months.endDate,
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'month'
            };
            lastFilterRef.current = JSON.stringify(filterData);
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
                            id="month-selector"
                            name="selectedMonth"
                            key={`month-input-${selectedMonth}`}
                            value={selectedMonth || ''}
                            onChange={handleMonthChange}
                            className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {/* Debug: mostrar o valor atual do selectedMonth */}
                        {process.env.NODE_ENV === 'development' && (
                            <span className="text-xs text-slate-400 ml-2">({selectedMonth || 'vazio'})</span>
                        )}
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
