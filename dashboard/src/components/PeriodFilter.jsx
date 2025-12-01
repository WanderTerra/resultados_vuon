import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

const PeriodFilter = ({ onPeriodChange }) => {
    const [selectedPeriod, setSelectedPeriod] = useState('all'); // 'all', 'lastWeek', 'lastMonth', 'last7Days', 'last30Days', 'custom'
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const isInitialMount = useRef(true); // Flag para controlar mount inicial (useRef não causa re-render)

    // Calcular períodos
    const getPeriodDates = (period) => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        switch (period) {
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

    // Notificar mudanças de período
    useEffect(() => {
        // No mount inicial, apenas marcar como não inicial mais e notificar 'all'
        if (isInitialMount.current) {
            isInitialMount.current = false;
            // No mount inicial, notificar 'all' (sem filtro) para carregar dados gerais
            if (onPeriodChange) {
                onPeriodChange(null);
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

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">Filtrar Período:</span>
                </div>
                
                <div className="flex gap-2 flex-wrap">
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

