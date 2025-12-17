import React, { useEffect, useState, useMemo } from 'react';
import { produtividadeService } from '../services/produtividadeService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Loading from './Loading';

const Card = ({ title, children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
);

const ProdutividadeChart = ({ startDate = null, endDate = null }) => {
    const [data, setData] = useState(null);
    const [resumo, setResumo] = useState(null);
    const [agentes, setAgentes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('month'); // 'month' ou 'day'
    const [selectedMonth, setSelectedMonth] = useState(''); // Inicializar vazio - usuário deve selecionar
    const [selectedAgente, setSelectedAgente] = useState(''); // Agente selecionado (vazio = todos)

    // Criar uma chave estável para as dependências
    const dependencyKey = useMemo(() => {
        return JSON.stringify({
            viewMode,
            selectedMonth: selectedMonth || '',
            selectedAgente: selectedAgente || '',
            startDate: startDate || null,
            endDate: endDate || null
        });
    }, [viewMode, selectedMonth, selectedAgente, startDate, endDate]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Preparar parâmetros
                const agenteId = selectedAgente ? parseInt(selectedAgente) : null;
                let paramsStartDate = startDate;
                let paramsEndDate = endDate;
                let groupBy = 'month';
                
                // Se modo "dia" estiver ativo, usar mês selecionado
                if (viewMode === 'day') {
                    // Só fazer requisição se um mês foi selecionado
                    if (!selectedMonth) {
                        setData([]);
                        setLoading(false);
                        setError(null);
                        return;
                    }
                    
                    // Calcular primeiro e último dia do mês selecionado
                    const [year, month] = selectedMonth.split('-').map(Number);
                    const firstDay = new Date(year, month - 1, 1);
                    const lastDay = new Date(year, month, 0);
                    
                    paramsStartDate = firstDay.toISOString().split('T')[0];
                    paramsEndDate = lastDay.toISOString().split('T')[0];
                    groupBy = 'day';
                } else {
                    groupBy = 'month';
                }
                
                const result = await produtividadeService.getProdutividadeData(
                    agenteId,
                    paramsStartDate,
                    paramsEndDate,
                    groupBy
                );
                
                setResumo(result.resumo);
                setAgentes(result.agentes || []);
                
                // Combinar dados de todos os blocos
                if (result.porBloco) {
                    const periodos = new Set();
                    
                    // Coletar todos os períodos únicos (meses ou dias)
                    Object.values(result.porBloco).forEach(blocoData => {
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
                        const bloco1 = result.porBloco.bloco1?.find(d => d && d.date === periodo) || { valor_recebido: 0, num_acordos: 0 };
                        const bloco2 = result.porBloco.bloco2?.find(d => d && d.date === periodo) || { valor_recebido: 0, num_acordos: 0 };
                        const bloco3 = result.porBloco.bloco3?.find(d => d && d.date === periodo) || { valor_recebido: 0, num_acordos: 0 };
                        const wo = result.porBloco.wo?.find(d => d && d.date === periodo) || { valor_recebido: 0, num_acordos: 0 };
                        
                        return {
                            date: periodo,
                            bloco1_valor: parseFloat(bloco1.valor_recebido || 0),
                            bloco2_valor: parseFloat(bloco2.valor_recebido || 0),
                            bloco3_valor: parseFloat(bloco3.valor_recebido || 0),
                            wo_valor: parseFloat(wo.valor_recebido || 0),
                            bloco1_acordos: parseInt(bloco1.num_acordos || 0),
                            bloco2_acordos: parseInt(bloco2.num_acordos || 0),
                            bloco3_acordos: parseInt(bloco3.num_acordos || 0),
                            wo_acordos: parseInt(wo.num_acordos || 0),
                            total_valor: parseFloat(bloco1.valor_recebido || 0) + 
                                         parseFloat(bloco2.valor_recebido || 0) + 
                                         parseFloat(bloco3.valor_recebido || 0) + 
                                         parseFloat(wo.valor_recebido || 0),
                            total_acordos: parseInt(bloco1.num_acordos || 0) + 
                                          parseInt(bloco2.num_acordos || 0) + 
                                          parseInt(bloco3.num_acordos || 0) + 
                                          parseInt(wo.num_acordos || 0)
                        };
                    });
                    
                    setData(combinedData.length > 0 ? combinedData : []);
                } else {
                    setData([]);
                }
            } catch (err) {
                console.error('Error fetching produtividade data:', err);
                setError(err.message);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dependencyKey]);

    if (loading) {
        return (
            <Card title="Produtividade do Agente">
                <Loading message="Carregando dados de produtividade..." />
            </Card>
        );
    }

    if (error) {
        return (
            <Card title="Produtividade do Agente">
                <div className="flex items-center justify-center h-64">
                    <div className="text-red-500">Erro ao carregar dados: {error}</div>
                </div>
            </Card>
        );
    }

    // Formatar valores para exibição
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatNumber = (value) => {
        return new Intl.NumberFormat('pt-BR').format(value);
    };

    return (
        <div className="space-y-6">
            {/* Cards de Métricas */}
            {resumo && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm font-medium mb-1">Total Valor Recebido</p>
                        <h3 className="text-2xl font-bold text-slate-800">
                            {formatCurrency(resumo.total_valor_recebido || 0)}
                        </h3>
                    </div>
                    
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm font-medium mb-1">Total de Acordos</p>
                        <h3 className="text-2xl font-bold text-slate-800">
                            {formatNumber(resumo.total_acordos || 0)}
                        </h3>
                    </div>
                    
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm font-medium mb-1">Média por Acordo</p>
                        <h3 className="text-2xl font-bold text-slate-800">
                            {formatCurrency(resumo.media_por_acordo || 0)}
                        </h3>
                    </div>
                </div>
            )}

            {/* Card do Gráfico */}
            <Card title="Produtividade por Bloco" className="h-[420px]">
                {/* Filtros */}
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    {/* Filtro de Agente */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-600 whitespace-nowrap">
                            Agente:
                        </label>
                        <select
                            value={selectedAgente}
                            onChange={(e) => setSelectedAgente(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                            <option value="">Todos os Agentes</option>
                            {agentes.map(agente => (
                                <option key={agente.id} value={agente.id}>
                                    {agente.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro de Visualização */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">Visualização:</span>
                        <button
                            onClick={() => {
                                setViewMode('month');
                                setSelectedMonth('');
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

                {/* Gráfico */}
                <div className="w-full" style={{ height: '384px', minHeight: '384px', position: 'relative' }}>
                    {viewMode === 'day' && !selectedMonth ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-slate-500 text-center">
                                <p className="mb-2">Selecione um mês para visualizar os dados diários</p>
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
                                    yAxisId="valor"
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
                                    formatter={(value, name) => {
                                        if (name.includes('valor')) {
                                            return formatCurrency(value);
                                        }
                                        return formatNumber(value);
                                    }}
                                />
                                <Legend />
                                <Line 
                                    yAxisId="valor"
                                    type="monotone" 
                                    dataKey="bloco1_valor" 
                                    name="Bloco 1 (Valor)" 
                                    stroke="#f59e0b" 
                                    strokeWidth={2} 
                                    dot={{ r: 4 }} 
                                    activeDot={{ r: 6 }}
                                />
                                <Line 
                                    yAxisId="valor"
                                    type="monotone" 
                                    dataKey="bloco2_valor" 
                                    name="Bloco 2 (Valor)" 
                                    stroke="#64748b" 
                                    strokeWidth={2} 
                                    dot={{ r: 4 }} 
                                    activeDot={{ r: 6 }}
                                />
                                <Line 
                                    yAxisId="valor"
                                    type="monotone" 
                                    dataKey="bloco3_valor" 
                                    name="Bloco 3 (Valor)" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2} 
                                    dot={{ r: 4 }} 
                                    activeDot={{ r: 6 }}
                                />
                                <Line 
                                    yAxisId="valor"
                                    type="monotone" 
                                    dataKey="wo_valor" 
                                    name="WO (Valor)" 
                                    stroke="#1e293b" 
                                    strokeWidth={2} 
                                    dot={{ r: 4 }} 
                                    activeDot={{ r: 6 }}
                                />
                                <Line 
                                    yAxisId="valor"
                                    type="monotone" 
                                    dataKey="total_valor" 
                                    name="Total (Valor)" 
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
        </div>
    );
};

export default ProdutividadeChart;


