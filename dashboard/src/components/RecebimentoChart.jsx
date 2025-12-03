import React, { useEffect, useState, useMemo } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Loading from './Loading';

const Card = ({ title, children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
);

const RecebimentoChart = ({ startDate = null, endDate = null }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('month'); // 'month' ou 'day'
    const [selectedMonth, setSelectedMonth] = useState(''); // Inicializar vazio - usuário deve selecionar

    // Criar uma chave estável para as dependências
    const dependencyKey = useMemo(() => {
        return JSON.stringify({
            viewMode,
            selectedMonth: selectedMonth || '',
            startDate: startDate || null,
            endDate: endDate || null
        });
    }, [viewMode, selectedMonth, startDate, endDate]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const token = localStorage.getItem('token');
                
                // Adicionar parâmetros de data se fornecidos
                const params = new URLSearchParams();
                
                // Se modo "dia" estiver ativo, usar mês selecionado
                if (viewMode === 'day') {
                    // Só fazer requisição se um mês foi selecionado
                    if (!selectedMonth) {
                        // Se não houver mês selecionado, não fazer requisição e mostrar mensagem
                        setData([]);
                        setLoading(false);
                        setError(null);
                        return;
                    }
                    
                    // Calcular primeiro e último dia do mês selecionado
                    const [year, month] = selectedMonth.split('-').map(Number);
                    const firstDay = new Date(year, month - 1, 1);
                    const lastDay = new Date(year, month, 0);
                    
                    params.append('startDate', firstDay.toISOString().split('T')[0]);
                    params.append('endDate', lastDay.toISOString().split('T')[0]);
                    params.append('groupBy', 'day');
                } else {
                    // Modo mensal - carregar dados normalmente
                    if (startDate) params.append('startDate', startDate);
                    if (endDate) params.append('endDate', endDate);
                    params.append('groupBy', 'month');
                }
                
                // Adicionar timestamp para evitar cache do navegador
                params.append('_t', Date.now().toString());
                
                const url = `${API_ENDPOINTS.dashboardData}${params.toString() ? '?' + params.toString() : ''}`;
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    cache: 'no-cache',
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch recebimento data');
                }

                const result = await response.json();
                
                // Escolher fonte de dados baseado no modo de visualização
                const recebimentoData = viewMode === 'day' 
                    ? result.financial?.recebimentoPorDia 
                    : result.financial?.recebimentoPorMes;
                
                if (recebimentoData) {
                    const periodos = new Set();
                    
                    // Coletar todos os períodos únicos (meses ou dias)
                    Object.values(recebimentoData).forEach(blocoData => {
                        if (Array.isArray(blocoData)) {
                            blocoData.forEach(item => {
                                if (item && item.date) {
                                    periodos.add(item.date);
                                }
                            });
                        }
                    });
                    
                    // Criar array combinado
                    const combinedData = Array.from(periodos).sort().map(periodo => {
                        const bloco1 = recebimentoData.bloco1?.find(d => d && d.date === periodo) || { valor_recebido: 0 };
                        const bloco2 = recebimentoData.bloco2?.find(d => d && d.date === periodo) || { valor_recebido: 0 };
                        const bloco3 = recebimentoData.bloco3?.find(d => d && d.date === periodo) || { valor_recebido: 0 };
                        const wo = recebimentoData.wo?.find(d => d && d.date === periodo) || { valor_recebido: 0 };
                        
                        return {
                            date: periodo,
                            bloco1: parseFloat(bloco1.valor_recebido || 0),
                            bloco2: parseFloat(bloco2.valor_recebido || 0),
                            bloco3: parseFloat(bloco3.valor_recebido || 0),
                            wo: parseFloat(wo.valor_recebido || 0),
                            total: parseFloat(bloco1.valor_recebido || 0) + 
                                   parseFloat(bloco2.valor_recebido || 0) + 
                                   parseFloat(bloco3.valor_recebido || 0) + 
                                   parseFloat(wo.valor_recebido || 0)
                        };
                    });
                    
                    setData(combinedData.length > 0 ? combinedData : []);
                } else {
                    setData([]);
                }
            } catch (err) {
                console.error('Error fetching recebimento data:', err);
                setError(err.message);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dependencyKey]); // Usar apenas dependencyKey para manter array consistente

    if (loading) {
        return (
            <Card title="Recebimento por Bloco">
                <Loading message="Carregando dados de recebimento..." />
            </Card>
        );
    }

    if (error) {
        return (
            <Card title="Recebimento por Bloco">
                <div className="flex items-center justify-center h-64">
                    <div className="text-red-500">Erro ao carregar dados: {error}</div>
                </div>
            </Card>
        );
    }

    // Não retornar cedo quando não há dados - manter os botões de visualização

    // Formatar valores para exibição
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <Card title="Recebimento por Bloco" className="h-[420px]">
            {/* Filtro de visualização - sempre visível */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">Visualização:</span>
                    <button
                        onClick={() => {
                            setViewMode('month');
                            setSelectedMonth(''); // Limpar mês selecionado ao voltar para modo mensal
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            viewMode === 'month'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Por Mês
                    </button>
                    <button
                        onClick={() => {
                            setViewMode('day');
                            // Se não houver mês selecionado, inicializar com o mês atual
                            if (!selectedMonth) {
                                const now = new Date();
                                const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                setSelectedMonth(currentMonth);
                            }
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            viewMode === 'day'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Por Dia
                    </button>
                </div>
                
                {/* Seletor de mês - apenas visível no modo diário */}
                {viewMode === 'day' && (
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-600 whitespace-nowrap">
                            Mês:
                        </label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                    </div>
                )}
            </div>
            <div className="w-full" style={{ height: '384px', minHeight: '384px', position: 'relative' }}>
                {viewMode === 'day' && !selectedMonth ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-slate-500 text-center">
                            <p className="mb-2">Selecione um mês para visualizar os recebimentos diários</p>
                        </div>
                    </div>
                ) : data && data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={384}>
                    <LineChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 10,
                            left: 10,
                            bottom: 40,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={true} 
                            tickLine={true} 
                            tick={{ fill: '#64748b', fontSize: viewMode === 'day' ? 10 : 12 }} 
                            stroke="#cbd5e1"
                            height={60}
                            angle={viewMode === 'day' ? -45 : -45}
                            textAnchor="end"
                            interval={viewMode === 'day' ? 'preserveStartEnd' : 0}
                        />
                        <YAxis 
                            axisLine={true} 
                            tickLine={true} 
                            tick={{ fill: '#64748b', fontSize: 12 }} 
                            stroke="#cbd5e1"
                            tickFormatter={(value) => {
                                if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
                                if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
                                return `R$ ${value}`;
                            }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value) => formatCurrency(value)}
                        />
                        <Legend />
                        <Line 
                            type="monotone" 
                            dataKey="bloco1" 
                            name="Bloco 1" 
                            stroke="#f59e0b" 
                            strokeWidth={2} 
                            dot={{ r: 4 }} 
                            activeDot={{ r: 6 }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="bloco2" 
                            name="Bloco 2" 
                            stroke="#64748b" 
                            strokeWidth={2} 
                            dot={{ r: 4 }} 
                            activeDot={{ r: 6 }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="bloco3" 
                            name="Bloco 3" 
                            stroke="#3b82f6" 
                            strokeWidth={2} 
                            dot={{ r: 4 }} 
                            activeDot={{ r: 6 }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="wo" 
                            name="WO" 
                            stroke="#1e293b" 
                            strokeWidth={2} 
                            dot={{ r: 4 }} 
                            activeDot={{ r: 6 }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="total" 
                            name="Total" 
                            stroke="#10b981" 
                            strokeWidth={3} 
                            strokeDasharray="5 5"
                            dot={{ r: 5 }} 
                            activeDot={{ r: 7 }}
                        />
                    </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-slate-500">Nenhum dado disponível</div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default RecebimentoChart;

