import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { aloService } from '../services/aloService';
import { getLast3Months } from '../utils/dateUtils';

const PeriodFilter = ({ onPeriodChange }) => {
    const [selectedPeriod, setSelectedPeriod] = useState('last3Months'); // Padrão: últimos 3 meses
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [allDatesRange, setAllDatesRange] = useState(null); // { min_date, max_date } quando 'all' está selecionado
    const isInitialMount = useRef(true); // Flag para controlar mount inicial (useRef não causa re-render)

    // Calcular períodos
    const getPeriodDates = (period) => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        switch (period) {
            case 'last3Months':
                // Últimos 3 meses (do primeiro dia do mês de 3 meses atrás até hoje)
                const last3Months = getLast3Months();
                return {
                    start: last3Months.startDate,
                    end: last3Months.endDate
                };
            
            case 'lastWeek':
                // Semana passada (segunda a domingo da semana anterior)
                const lastWeekEnd = new Date(today);
                lastWeekEnd.setDate(today.getDate() - today.getDay()); // Último domingo
                const lastWeekStart = new Date(lastWeekEnd);
                lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // Segunda da semana passada
                return {
                    start: lastWeekStart.toISOString().split('T')[0],
                    end: lastWeekEnd.toISOString().split('T')[0]
                };
            
            case 'lastMonth':
                // Mês passado completo
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                return {
                    start: lastMonth.toISOString().split('T')[0],
                    end: lastMonthEnd.toISOString().split('T')[0]
                };
            
            case 'last7Days':
                const last7Days = new Date(today);
                last7Days.setDate(today.getDate() - 6); // Inclui hoje
                return {
                    start: last7Days.toISOString().split('T')[0],
                    end: today.toISOString().split('T')[0]
                };
            
            case 'last30Days':
                const last30Days = new Date(today);
                last30Days.setDate(today.getDate() - 29); // Inclui hoje
                return {
                    start: last30Days.toISOString().split('T')[0],
                    end: today.toISOString().split('T')[0]
                };
            
            case 'thisWeek':
                // Esta semana (segunda até hoje)
                const thisWeekStart = new Date(today);
                thisWeekStart.setDate(today.getDate() - today.getDay() + 1); // Segunda desta semana
                if (thisWeekStart > today) {
                    thisWeekStart.setDate(today.getDate() - 6); // Se hoje é domingo, pega segunda passada
                }
                return {
                    start: thisWeekStart.toISOString().split('T')[0],
                    end: today.toISOString().split('T')[0]
                };
            
            case 'thisMonth':
                // Este mês (do dia 1 até hoje)
                const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                return {
                    start: thisMonthStart.toISOString().split('T')[0],
                    end: today.toISOString().split('T')[0]
                };
            
            case 'custom':
                if (customStartDate && customEndDate) {
                    return {
                        start: customStartDate,
                        end: customEndDate
                    };
                }
                return null;
            
            default:
                return null; // 'all' - sem filtro
        }
    };

    // Buscar intervalo de datas quando 'all' for selecionado
    useEffect(() => {
        const fetchDateRange = async () => {
            if (selectedPeriod === 'all') {
                try {
                    const response = await aloService.getDateRange();
                    if (response.success && response.data) {
                        setAllDatesRange({
                            min_date: response.data.min_date,
                            max_date: response.data.max_date
                        });
                    }
                } catch (error) {
                    console.error('Erro ao buscar intervalo de datas:', error);
                    setAllDatesRange(null);
                }
            } else {
                setAllDatesRange(null);
            }
        };

        fetchDateRange();
    }, [selectedPeriod]);

    // Notificar mudanças de período
    useEffect(() => {
        // No mount inicial, notificar o período padrão (últimos 3 meses)
        if (isInitialMount.current) {
            isInitialMount.current = false;
            // No mount inicial, notificar últimos 3 meses
            if (onPeriodChange && selectedPeriod === 'last3Months') {
                const dates = getLast3Months();
                onPeriodChange(dates);
            }
            return;
        }
        
        // Após o mount inicial, notificar todas as mudanças do usuário
        const dates = getPeriodDates(selectedPeriod);
        if (onPeriodChange) {
            // Se for 'all', notificar com null
            if (selectedPeriod === 'all') {
                onPeriodChange(null);
            } 
            // Se for 'custom' mas sem datas, não notificar ainda
            else if (selectedPeriod === 'custom' && (!customStartDate || !customEndDate)) {
                // Não notificar até que ambas as datas estejam preenchidas
                return;
            }
            // Para outros períodos ou custom com datas, notificar
            else if (dates) {
                onPeriodChange(dates);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPeriod, customStartDate, customEndDate]);

    const handlePeriodChange = (period) => {
        setSelectedPeriod(period);
    };

    // Formatar data para exibição (DD/MM/YYYY)
    const formatDate = (dateString) => {
        if (!dateString) return '';
        
        // Se for um objeto Date ou ISO string completo, extrair apenas a data
        let dateOnly = dateString;
        if (typeof dateString === 'string') {
            // Se contém 'T' ou 'Z', é um ISO string - extrair apenas a parte da data
            if (dateString.includes('T') || dateString.includes('Z')) {
                dateOnly = dateString.split('T')[0];
            }
        }
        
        // Garantir que temos apenas YYYY-MM-DD
        const [year, month, day] = dateOnly.split('-');
        if (year && month && day) {
            return `${day}/${month}/${year}`;
        }
        
        return dateString; // Fallback: retornar original se não conseguir formatar
    };

    // Obter as datas do período selecionado para exibição
    const getCurrentPeriodDates = () => {
        // Se for 'all' e tiver o intervalo de datas, retornar
        if (selectedPeriod === 'all' && allDatesRange && allDatesRange.min_date && allDatesRange.max_date) {
            // Garantir que as datas estão no formato YYYY-MM-DD
            let minDate = allDatesRange.min_date;
            let maxDate = allDatesRange.max_date;
            
            // Se for um objeto Date ou ISO string, extrair apenas a data
            if (typeof minDate === 'string' && (minDate.includes('T') || minDate.includes('Z'))) {
                minDate = minDate.split('T')[0];
            }
            if (typeof maxDate === 'string' && (maxDate.includes('T') || maxDate.includes('Z'))) {
                maxDate = maxDate.split('T')[0];
            }
            
            return {
                start: minDate,
                end: maxDate
            };
        }
        
        if (selectedPeriod === 'all') return null;
        
        const dates = getPeriodDates(selectedPeriod);
        // Para período custom, só mostrar se ambas as datas estiverem preenchidas
        if (selectedPeriod === 'custom' && (!dates || !dates.start || !dates.end)) {
            return null;
        }
        return dates;
    };

    const currentDates = getCurrentPeriodDates();

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">Filtrar Período:</span>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => handlePeriodChange('last3Months')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedPeriod === 'last3Months'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Últimos 3 Meses
                    </button>
                    
                    <button
                        onClick={() => handlePeriodChange('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedPeriod === 'all'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Todos
                    </button>
                    
                    <button
                        onClick={() => handlePeriodChange('thisWeek')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedPeriod === 'thisWeek'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Esta Semana
                    </button>
                    
                    <button
                        onClick={() => handlePeriodChange('lastWeek')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedPeriod === 'lastWeek'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Semana Passada
                    </button>
                    
                    <button
                        onClick={() => handlePeriodChange('thisMonth')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedPeriod === 'thisMonth'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Este Mês
                    </button>
                    
                    <button
                        onClick={() => handlePeriodChange('lastMonth')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedPeriod === 'lastMonth'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Mês Passado
                    </button>
                    
                    <button
                        onClick={() => handlePeriodChange('custom')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedPeriod === 'custom'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Personalizado
                    </button>
                </div>
                
                {/* Exibir período selecionado */}
                {currentDates && (
                    <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                        <Calendar size={14} className="text-blue-600" />
                        <span className="text-xs font-medium text-blue-700">Período:</span>
                        <span className="text-sm font-semibold text-blue-800">
                            {formatDate(currentDates.start)} até {formatDate(currentDates.end)}
                        </span>
                    </div>
                )}
            </div>
            
            {selectedPeriod === 'custom' && (
                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">De:</label>
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">Até:</label>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PeriodFilter;

