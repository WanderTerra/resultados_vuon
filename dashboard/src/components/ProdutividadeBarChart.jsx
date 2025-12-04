import React, { useEffect, useState, useMemo } from 'react';
import { produtividadeService } from '../services/produtividadeService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Loading from './Loading';

const Card = ({ title, children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden ${className}`}>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        {children}
    </div>
);

const ProdutividadeBarChart = ({ startDate = null, endDate = null }) => {
    const [data, setData] = useState(null);
    const [topAgentes, setTopAgentes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [limit, setLimit] = useState(5);

    // Calcular datas padrão (últimos 3 meses) se não fornecidas
    const defaultDates = useMemo(() => {
        if (startDate && endDate) {
            return { startDate, endDate };
        }
        const now = new Date();
        const end = now.toISOString().split('T')[0];
        const start = new Date(now);
        start.setMonth(start.getMonth() - 3);
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end
        };
    }, [startDate, endDate]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const result = await produtividadeService.getTopAgentes(
                    limit,
                    defaultDates.startDate,
                    defaultDates.endDate
                );
                
                setTopAgentes(result.topAgentes || []);
                
                // Formatar dados para o gráfico de barras
                if (result.dadosPorMes && result.dadosPorMes.length > 0) {
                    // Criar estrutura de dados para o gráfico
                    // Cada entrada representa um mês com valores por agente
                    const chartData = result.dadosPorMes.map(mesData => {
                        const entry = {
                            date: mesData.date
                        };
                        
                        // Adicionar valor de cada agente usando o nome como chave (sanitizado)
                        result.topAgentes.forEach((agente, index) => {
                            const chave = `agente_${agente.agente_id}`;
                            // Usar nome do agente como chave, mas sanitizado para evitar problemas
                            const nomeChave = `agente_${index + 1}`;
                            entry[nomeChave] = mesData[chave] || 0;
                        });
                        
                        return entry;
                    });
                    
                    setData(chartData);
                } else {
                    setData([]);
                }
            } catch (err) {
                console.error('Error fetching top agentes data:', err);
                setError(err.message);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [limit, defaultDates.startDate, defaultDates.endDate]);

    if (loading) {
        return (
            <Card title="Comparativo de Produtividade - Top Agentes">
                <Loading message="Carregando dados dos top agentes..." />
            </Card>
        );
    }

    if (error) {
        return (
            <Card title="Comparativo de Produtividade - Top Agentes">
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

    // Gerar cores para cada agente
    const colors = [
        '#3b82f6', // blue
        '#10b981', // green
        '#f59e0b', // amber
        '#ef4444', // red
        '#8b5cf6', // purple
        '#06b6d4', // cyan
        '#f97316', // orange
        '#ec4899', // pink
        '#6366f1', // indigo
        '#14b8a6'  // teal
    ];

    // Preparar dados e configuração do gráfico
    const bars = topAgentes.slice(0, limit).map((agente, index) => ({
        dataKey: `agente_${index + 1}`,
        name: agente.agente_nome,
        fill: colors[index % colors.length]
    }));

    return (
        <Card title="Comparativo de Produtividade - Top Agentes" className="h-[500px]">
            {/* Controles */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600 whitespace-nowrap">
                        Top:
                    </label>
                    <select
                        value={limit}
                        onChange={(e) => setLimit(parseInt(e.target.value))}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        <option value={3}>Top 3</option>
                        <option value={5}>Top 5</option>
                        <option value={10}>Top 10</option>
                        <option value={15}>Top 15</option>
                    </select>
                </div>
                
                <div className="text-sm text-slate-500">
                    Período: {new Date(defaultDates.startDate).toLocaleDateString('pt-BR')} até {new Date(defaultDates.endDate).toLocaleDateString('pt-BR')}
                </div>
            </div>

            {/* Gráfico */}
            <div className="w-full" style={{ height: '420px', minHeight: '420px', position: 'relative' }}>
                {data && data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={420}>
                        <BarChart
                            data={data}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 60,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={true} 
                                tickLine={true} 
                                tick={{ fill: '#64748b', fontSize: 12 }} 
                                stroke="#cbd5e1"
                                angle={-45}
                                textAnchor="end"
                                height={80}
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
                                formatter={(value, name) => {
                                    const match = name.match(/agente_(\d+)/);
                                    if (match) {
                                        const index = parseInt(match[1]) - 1;
                                        const agenteNome = topAgentes[index]?.agente_nome || name;
                                        return [formatCurrency(value), agenteNome];
                                    }
                                    return [formatCurrency(value), name];
                                }}
                            />
                            <Legend 
                                formatter={(value) => {
                                    const match = value.match(/agente_(\d+)/);
                                    if (match) {
                                        const index = parseInt(match[1]) - 1;
                                        return topAgentes[index]?.agente_nome || value;
                                    }
                                    return value;
                                }}
                            />
                            {bars.map((bar, index) => (
                                <Bar 
                                    key={bar.dataKey}
                                    dataKey={bar.dataKey} 
                                    name={bar.name}
                                    fill={bar.fill}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-slate-500">Nenhum dado disponível</div>
                    </div>
                )}
            </div>

            {/* Tabela resumo dos top agentes */}
            {topAgentes.length > 0 && (
                <div className="mt-6 overflow-x-auto">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Resumo dos Top Agentes</h4>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-2 px-3 text-slate-600 font-semibold">Rank</th>
                                <th className="text-left py-2 px-3 text-slate-600 font-semibold">Agente</th>
                                <th className="text-right py-2 px-3 text-slate-600 font-semibold">Valor Recebido</th>
                                <th className="text-right py-2 px-3 text-slate-600 font-semibold">Acordos</th>
                                <th className="text-right py-2 px-3 text-slate-600 font-semibold">Média/Acordo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topAgentes.map((agente, index) => (
                                <tr key={agente.agente_id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-2 px-3">
                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                            index === 1 ? 'bg-slate-100 text-slate-800' :
                                            index === 2 ? 'bg-orange-100 text-orange-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {index + 1}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3 font-medium text-slate-800">{agente.agente_nome}</td>
                                    <td className="py-2 px-3 text-right font-semibold text-slate-800">{formatCurrency(agente.total_valor_recebido)}</td>
                                    <td className="py-2 px-3 text-right text-slate-600">{agente.total_acordos.toLocaleString('pt-BR')}</td>
                                    <td className="py-2 px-3 text-right text-slate-600">{formatCurrency(agente.media_por_acordo)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
};

export default ProdutividadeBarChart;

