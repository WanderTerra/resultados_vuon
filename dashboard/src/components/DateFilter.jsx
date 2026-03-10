import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getLast3Months, getCurrentMonth, getEstaSemana, getSemanaPassada, getEsteMes, getMesPassado } from '../utils/dateUtils';

const PERIODS = [
    { key: 'ultimos-3-meses', label: 'Últimos 3 Meses', getRange: getLast3Months },
    { key: 'todos', label: 'Todos', getRange: () => ({ startDate: null, endDate: null }) },
    { key: 'esta-semana', label: 'Esta Semana', getRange: getEstaSemana },
    { key: 'semana-passada', label: 'Semana Passada', getRange: getSemanaPassada },
    { key: 'este-mes', label: 'Este Mês', getRange: getEsteMes },
    { key: 'mes-passado', label: 'Mês Passado', getRange: getMesPassado },
    { key: 'personalizado', label: 'Personalizado', getRange: null }
];

// DateFilter component for filtering dashboard data by date range
const DateFilter = ({ onFilterChange, initialStartDate = null, initialEndDate = null, initialViewMode = 'month', showPeriodQuickFilters = true }) => {
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
    const [activePeriod, setActivePeriod] = useState(() => (!initialStartDate && !initialEndDate) ? 'ultimos-3-meses' : 'personalizado');
    const [selectedMonth, setSelectedMonth] = useState(''); // Inicializar vazio - usuário deve selecionar
    const [error, setError] = useState('');
    const lastFilterRef = useRef(null);
    const isInternalUpdateRef = useRef(false);
    const hasInitialized = useRef(false); // Flag para garantir que só inicialize uma vez
    
    // Sincronizar viewMode com props apenas quando o pai enviar novo initialViewMode (não quando o usuário mudar o modo)
    useEffect(() => {
        setViewMode(initialViewMode);
    }, [initialViewMode]);
    
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

    // Sincronizar activePeriod quando as datas iniciais correspondem a um período pré-definido
    useEffect(() => {
        if (!initialStartDate && !initialEndDate) {
            setActivePeriod('ultimos-3-meses');
            return;
        }
        if (!initialStartDate || !initialEndDate) return;
        const last3 = getLast3Months();
        if (initialStartDate === last3.startDate && initialEndDate === last3.endDate) {
            setActivePeriod('ultimos-3-meses');
            return;
        }
        const estaSemana = getEstaSemana();
        if (initialStartDate === estaSemana.startDate && initialEndDate === estaSemana.endDate) {
            setActivePeriod('esta-semana');
            return;
        }
        const semanaPassada = getSemanaPassada();
        if (initialStartDate === semanaPassada.startDate && initialEndDate === semanaPassada.endDate) {
            setActivePeriod('semana-passada');
            return;
        }
        const esteMes = getEsteMes();
        if (initialStartDate === esteMes.startDate && initialEndDate === esteMes.endDate) {
            setActivePeriod('este-mes');
            return;
        }
        const mesPassado = getMesPassado();
        if (initialStartDate === mesPassado.startDate && initialEndDate === mesPassado.endDate) {
            setActivePeriod('mes-passado');
            return;
        }
        setActivePeriod('personalizado');
    }, [initialStartDate, initialEndDate]);

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

    // Aplicar filtro manualmente (só ao clicar em "Aplicar")
    const applyFilter = () => {
        setError('');
        if (viewMode === 'day') {
            if (!selectedMonth) {
                setError('Selecione um mês no modo diário.');
                return;
            }
            const [year, monthNum] = selectedMonth.split('-').map(Number);
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
        } else {
            if (!startDate || !endDate) {
                setError('Preencha as datas inicial e final no modo mensal.');
                return;
            }
            if (startDate > endDate) {
                setError('Data inicial não pode ser maior que data final');
                return;
            }
            const filterData = {
                startDate,
                endDate,
                compareMode: false,
                compareStartDate: null,
                compareEndDate: null,
                groupBy: 'month'
            };
            lastFilterRef.current = JSON.stringify(filterData);
            onFilterChange(filterData);
        }
    };

    const handleViewModeChange = (mode) => {
        isInternalUpdateRef.current = true;
        setViewMode(mode);
        setError('');
        if (mode === 'month') {
            setSelectedMonth('');
            const last3Months = getLast3Months();
            setStartDate(last3Months.startDate);
            setEndDate(last3Months.endDate);
        } else if (mode === 'day') {
            const mesAtual = getCurrentMonth();
            setSelectedMonth(mesAtual);
            setStartDate('');
            setEndDate('');
        }
    };
    
    const handleMonthChange = (e) => {
        setSelectedMonth(e.target.value);
        setError('');
    };

    const handleStartDateChange = (e) => {
        const date = e.target.value;
        isInternalUpdateRef.current = true;
        setStartDate(date);
        setActivePeriod('personalizado');
        setError('');
        if (date && endDate && date > endDate) setError('Data inicial não pode ser maior que data final');
    };

    const handleEndDateChange = (e) => {
        const date = e.target.value;
        isInternalUpdateRef.current = true;
        setEndDate(date);
        setActivePeriod('personalizado');
        setError('');
        if (startDate && date && startDate > date) setError('Data inicial não pode ser maior que data final');
    };

    const handlePeriodClick = (periodKey) => {
        setActivePeriod(periodKey);
        if (periodKey === 'personalizado') return;
        isInternalUpdateRef.current = true;
        const period = PERIODS.find((p) => p.key === periodKey);
        if (!period?.getRange) return;
        const { startDate: s, endDate: e } = period.getRange();

        if (periodKey === 'mes-passado' || periodKey === 'este-mes') {
            setViewMode('day');
            const monthStr = s ? s.slice(0, 7) : getCurrentMonth();
            setSelectedMonth(monthStr);
            setStartDate(s || '');
            setEndDate(e || '');
            return;
        }

        setViewMode('month');
        setStartDate(s || '');
        setEndDate(e || '');
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
            setActivePeriod('ultimos-3-meses');
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
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl shadow-md border border-slate-200 p-6 mb-6">
            {/* Título e atalhos de período — só no modo mensal */}
            {showPeriodQuickFilters && viewMode === 'month' && (
                <div className="mb-5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Atalhos de período
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {PERIODS.map((p) => (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => handlePeriodClick(p.key)}
                                className={`px-3 py-2 text-sm rounded-lg border font-medium transition-colors ${
                                    activePeriod === p.key
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Modo + Período + Ações em uma linha organizada */}
            <div className="flex flex-wrap items-end gap-6">
                {/* Modo */}
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Modo</span>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
                        <button
                            type="button"
                            onClick={() => handleViewModeChange('month')}
                            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                                viewMode === 'month'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Mensal
                        </button>
                        <button
                            type="button"
                            onClick={() => handleViewModeChange('day')}
                            className={`px-4 py-2.5 text-sm font-medium transition-colors border-l border-slate-200 ${
                                viewMode === 'day'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Diário
                        </button>
                    </div>
                </div>

                {/* Período - Modo Mensal */}
                {viewMode === 'month' && (
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Período</span>
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 shadow-sm px-3 py-2 w-fit h-10">
                            <input
                                type="date"
                                value={startDate}
                                onChange={handleStartDateChange}
                                className="w-[140px] px-2.5 py-2 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-slate-400 font-medium text-sm">até</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={handleEndDateChange}
                                min={startDate || ''}
                                className="w-[140px] px-2.5 py-2 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                )}

                {/* Período - Modo Diário */}
                {viewMode === 'day' && (
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mês</span>
                        <input
                            type="month"
                            id="month-selector"
                            name="selectedMonth"
                            key={`month-input-${selectedMonth}`}
                            value={selectedMonth || ''}
                            onChange={handleMonthChange}
                            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[160px]"
                        />
                    </div>
                )}

                {/* Botões de ação */}
                <div className="flex items-center gap-2 ml-auto">
                    <button
                        type="button"
                        onClick={applyFilter}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Aplicar
                    </button>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilter}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Limpar
                        </button>
                    )}
                </div>
            </div>

            {/* Mensagem de erro */}
            {error && (
                <div className="mt-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}
        </div>
    );
};

export default DateFilter;
